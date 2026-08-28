// Shared status-code summary for the k6 load scripts. Imported metrics names
// match the Counters defined in ingest-steady.js / ingest-overlimit.js.
export function summaryHandler() {
  return function handleSummary(data) {
    const m = data.metrics;
    const get = (name) => m[name]?.values?.count ?? 0;

    const total = get("http_reqs");
    const ok = get("ok_requests");
    const limited = get("rate_limited_requests");
    const s5xx = get("server_error_requests");
    const conn = get("connection_error_requests");
    const other = get("other_requests");

    const pct = (n) =>
      total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0.0%";

    console.log("=== status code summary ===");
    console.log(`  200 ok:             ${ok} (${pct(ok)})`);
    console.log(`  429 rate-limited:   ${limited} (${pct(limited)})`);
    console.log(`  5xx server error:   ${s5xx} (${pct(s5xx)})`);
    console.log(`  0 connection error: ${conn} (${pct(conn)})`);
    console.log(`  4xx/other:          ${other} (${pct(other)})`);
    console.log(`  total requests:     ${total}`);

    if (s5xx > 0 || conn > 0) {
      console.log(
        "  NOTE: 5xx or connection errors present — a SERVER bottleneck, not throttling.",
      );
    }
    if (limited === 0 && total > 0) {
      console.log(
        "  NOTE: no 429s seen — limiter is off/inactive (degraded), load is under the window, or x-api-key identity missing.",
      );
    }
  };
}