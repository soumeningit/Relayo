// Aggressive ingest load ABOVE the seeded api-key rate limit (1000 req/min).
// With the limiter ON, expects a healthy share of 429s — the
// `rate_limited_rate>0` threshold is what makes this script "pass".
// With the limiter OFF the rate threshold is skipped (EXPECT_RATE_LIMIT=false)
// and the run instead measures the unthrottled server ceiling.
//
// Run:  pnpm --filter backend load:k6:overlimit
// Env:  LOAD_TARGET, API_KEY, LOAD_RATE (per min, default 2400), LOAD_DURATION,
//       EXPECT_RATE_LIMIT (default true; set false when running without a limiter)
import http from "k6/http";
import { check } from "k6";
import { Counter, Rate } from "k6/metrics";
import {
  config,
  envNumber,
  envString,
  expectRateLimit,
  warnIfMissingKey,
} from "../config.js";
import { summaryHandler } from "./summary.js";

warnIfMissingKey();

const rateLimitedRate = new Rate("rate_limited_rate");
const serverErrorRate = new Rate("server_error_rate");
const okRequests = new Counter("ok_requests");
const rateLimitedRequests = new Counter("rate_limited_requests");
const serverErrorRequests = new Counter("server_error_requests");
const connectionErrorRequests = new Counter("connection_error_requests");
const otherRequests = new Counter("other_requests");

const thresholds = {
  // A healthy run may legitimately serve some 200s that leaked through before
  // the window filled, so ok rate is NOT asserted tightly here.
  server_error_rate: ["rate<0.001"],
  http_req_duration: ["p(95)<1000"],
};
if (expectRateLimit()) {
  thresholds.rate_limited_rate = ["rate>0"];
}

export const options = {
  scenarios: {
    overlimit: {
      executor: "constant-arrival-rate",
      // 2400 req/min = 2.4x the seeded 1000/min api-key limit.
      rate: envNumber("LOAD_RATE", 2400),
      timeUnit: "1m",
      duration: envString("LOAD_DURATION", "60s"),
      preAllocatedVUs: 50,
      maxVUs: 300,
    },
  },
  thresholds,
};

export const handleSummary = summaryHandler();

export default function () {
  const res = http.post(
    config.ingestUrl,
    JSON.stringify(config.payload(__VU)),
    {
      headers: config.headers,
      tags: { test: "ingest-overlimit" },
    },
  );

  // Sample every request so the rate metric is a true failure share
  // (failures / all requests), not failures / failures.
  serverErrorRate.add(res.status >= 500 ? 1 : 0);

  if (res.status === 200) {
    okRequests.add(1);
  } else if (res.status === 429) {
    rateLimitedRate.add(1);
    rateLimitedRequests.add(1);
    if (expectRateLimit()) {
      check(res, {
        "429 carries Retry-After": (r) => hasHeader(r, "Retry-After"),
        "429 carries X-RateLimit-Remaining": (r) =>
          hasHeader(r, "X-RateLimit-Remaining"),
      });
    }
  } else if (res.status >= 500) {
    serverErrorRequests.add(1);
    logServerError(res);
  } else if (res.status === 0) {
    connectionErrorRequests.add(1);
  } else {
    otherRequests.add(1);
  }
}

const loggedServerErrors = new Set();

// k6 lowercases response header names, so look up case-insensitively.
function hasHeader(res, name) {
  const lower = name.toLowerCase();
  return Object.keys(res.headers).some((k) => k.toLowerCase() === lower);
}

function logServerError(res) {
  const key = `${__VU}:${res.status}`;
  if (loggedServerErrors.has(key)) return;
  loggedServerErrors.add(key);
  console.log(
    `SERVER ERROR status=${res.status} VU=${__VU} body=${String(
      res.body,
    ).slice(0, 300)}`,
  );
}