// Sustained ingest load BELOW the seeded api-key rate limit (1000 req/min).
// Expect ~0 429s. If you see 429s here, the limit is too low for the rate, or
// the x-api-key header is missing (falling back to the 100 req/min IP limit).
//
// Run:  pnpm --filter backend load:k6:steady
// Env:  LOAD_TARGET, API_KEY, LOAD_RATE (per min, default 900), LOAD_DURATION,
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

const okRate = new Rate("ok_2xx_rate");
const serverErrorRate = new Rate("server_error_rate");
const okRequests = new Counter("ok_requests");
const rateLimitedRequests = new Counter("rate_limited_requests");
const serverErrorRequests = new Counter("server_error_requests");
const connectionErrorRequests = new Counter("connection_error_requests");
const otherRequests = new Counter("other_requests");

export const options = {
  scenarios: {
    steady: {
      executor: "constant-arrival-rate",
      // 900 req/min stays under the seeded api-key limit of 1000/min.
      rate: envNumber("LOAD_RATE", 900),
      timeUnit: "1m",
      duration: envString("LOAD_DURATION", "60s"),
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    ok_2xx_rate: ["rate>=0.99"],
    server_error_rate: ["rate<0.001"],
    http_req_duration: ["p(95)<300"],
  },
};

export const handleSummary = summaryHandler();

export default function () {
  const res = http.post(
    config.ingestUrl,
    JSON.stringify(config.payload(__VU)),
    {
      headers: config.headers,
      tags: { test: "ingest-steady" },
    },
  );

  // Sample every request so the rate metric is a true failure share
  // (failures / all requests), not failures / failures.
  serverErrorRate.add(res.status >= 500 ? 1 : 0);

  if (res.status === 200) {
    okRate.add(1);
    okRequests.add(1);
    if (expectRateLimit()) {
      check(res, {
        "200 has X-RateLimit-Limit header": (r) =>
          hasHeader(r, "X-RateLimit-Limit"),
        "200 has X-RateLimit-Remaining header": (r) =>
          hasHeader(r, "X-RateLimit-Remaining"),
      });
    }
  } else if (res.status === 429) {
    rateLimitedRequests.add(1);
    if (expectRateLimit()) {
      check(res, {
        "429 carries Retry-After": (r) => hasHeader(r, "Retry-After"),
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