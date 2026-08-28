// Shared load-test config. Compatible with BOTH k6 (uses __ENV) and Node
// (uses process.env), so it can be imported by k6/ scripts and autocannon/.
const env = typeof __ENV !== "undefined" ? __ENV : process.env;

const baseUrl = (env.LOAD_TARGET || "http://localhost:5000").replace(/\/+$/, "");
const apiKey = env.API_KEY || "";
const eventType = env.LOAD_EVENT_TYPE || "load.test.event";

export const config = {
  baseUrl,
  apiKey,
  eventType,
  ingestUrl: `${baseUrl}/api/v1/event/accept-event`,
  headers: {
    "Content-Type": "application/json",
    // validateTenant auth
    Authorization: apiKey ? `Bearer ${apiKey}` : "",
    // rate limiter identity — key by API_KEY (1000/min) instead of IP (100/min)
    "x-api-key": apiKey,
  },
  payload: (vu = 0) => ({
    eventType,
    payload: {
      source: "load-test",
      vu,
      ts: Date.now(),
    },
  }),
};

export function envString(name, fallback) {
  const raw = env[name];
  return raw !== undefined && raw !== "" ? String(raw) : fallback;
}

export function envNumber(name, fallback) {
  const raw = env[name];
  const parsed = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function warnIfMissingKey() {
  if (!apiKey) {
    console.warn(
      "WARNING: API_KEY env is not set — requests will fail with 401. " +
        "Use a real API key belonging to an org with at least one ACTIVE destination.",
    );
  }
}

// Set EXPECT_RATE_LIMIT=false when the server runs WITHOUT a limiter
// (RATE_LIMIT_ENABLED=false or Redis down). Controls checks that would
// otherwise fail trivially: X-RateLimit-* header assertions and the
// "429s must occur" threshold.
export function expectRateLimit() {
  const raw = env.EXPECT_RATE_LIMIT;
  return !(raw === "false" || raw === "0");
}