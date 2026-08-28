// Autocannon readout for a single SPAWN INSTANCE ONLY (import-guarded).
//
// Run:  pnpm --filter backend load:autocannon
// Env:  LOAD_TARGET (default http://localhost:5000), API_KEY,
//       LOAD_DURATION (seconds, default 30), LOAD_RPS, LOAD_CONNECTIONS
//
// Fixes the earlier broken run:
//   - reads the real `statusCodeStats` field (there is no statusCodeDistribution)
//   - prints a per-status-code breakdown + 2xx/4xx/5xx/errors/timeouts summary
//   - hard-fails fast if API_KEY is missing (else every request 401s)
import autocannon from "autocannon";
import { config, envNumber, expectRateLimit } from "../config.js";

if (!process.argv[1] || !process.argv[1].endsWith("ingest.mjs")) {
  console.log(
    "ingest.mjs: imported as a module (skipping self-run). " +
    "Run it directly with `pnpm --filter backend load:autocannon`.",
  );
} else {
  if (!config.apiKey) {
    console.error(
      "FATAL: API_KEY env is not set — every request would 401. Aborting.",
    );
    process.exit(1);
  }

  const durationSeconds = envNumber("LOAD_DURATION", 30);

  console.log(`Target:      ${config.baseUrl}`);
  console.log(`Duration:    ${durationSeconds}s`);
  const rps = envNumber("LOAD_RPS", 0);
  if (rps > 0) console.log(`Rate:        ${rps} req/s (fixed)`);
  console.log(`Connections: ${envNumber("LOAD_CONNECTIONS", 50)}`);

  const instance = autocannon(
    {
      url: config.ingestUrl,
      connections: envNumber("LOAD_CONNECTIONS", 50),
      // autocannon's duration option is in SECONDS (run.js multiplies by 1000 internally)
      duration: durationSeconds,
      ...(rps > 0 ? { rate: rps } : {}),
      method: "POST",
      headers: config.headers,
      body: JSON.stringify(config.payload(1)),
    },
    (err, result) => {
      if (err) {
        console.error(err);
        return;
      }
      void err;
      autocannon.printResult(result, { outputStream: process.stdout });

      const stats =
        result.statusCodeStats && typeof result.statusCodeStats === "object"
          ? result.statusCodeStats
          : {};
      const total = result.requests?.total ?? 0;
      console.log("\n— status code breakdown —");
      for (const code of Object.keys(stats).sort(
        (a, b) => Number(a) - Number(b),
      )) {
        const count = stats[code]?.count ?? 0;
        const pct = total > 0 ? `${((count / total) * 100).toFixed(1)}` : "0.0";
        console.log(`  ${code}: ${count} (${pct}%)`);
      }

      const rl429 = stats["429"]?.count ?? 0;
      console.log("\n— summary —");
      console.log(
        `  2xx: ${result["2xx"] ?? 0}  |  4xx: ${result["4xx"] ?? 0}  |  ` +
        `5xx: ${result["5xx"] ?? 0}  |  429 rate-limited: ${rl429} ` +
        `(${total > 0 ? ((rl429 / total) * 100).toFixed(1) : 0}%)`,
      );
      console.log(
        `  non-2xx: ${result.non2xx ?? 0}  |  errors: ${result.errors ?? 0}  |  ` +
        `timeouts: ${result.timeouts ?? 0}  |  connection resets: ${result.resets ?? 0}`,
      );

      if ((result["5xx"] ?? 0) > 0 || (result.errors ?? 0) > 0) {
        console.log(
          "  NOTE: 5xx or errors present — a SERVER bottleneck, not throttling.",
        );
      }
      if (expectRateLimit() && rl429 === 0 && total > 0) {
        console.log(
          "  NOTE: no 429s with limiter expected — limiter may be off/inactive.",
        );
      }
    },
  );

  process.once("SIGINT", () => instance.stop());
  instance.on("error", (err) => {
    console.error("autocannon error:", err.message);
  });
}