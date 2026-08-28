# Rate Limiter Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT REQUESTS                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS MIDDLEWARE LAYER                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ RateLimit       │  │ Identity        │  │ Fallback (Redis Down)       │  │
│  │ Middleware      │  │ Extractor       │  │ Handler                     │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────────┬──────────────┘  │
└───────────┼────────────────────┼──────────────────────────┼─────────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RATE LIMITER SERVICE                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Strategy Pattern                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │ Sliding      │  │ Fixed        │  │ Token        │                │   │
│  │  │ Window       │  │ Window       │  │ Bucket       │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │ Config Cache        │  │ Circuit Breaker     │  │ Metrics Collector   │  │
│  │ (Redis)             │  │ (Redis Fallback)    │  │                     │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
            │                    │                          │
            ▼                    ▼                          ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│   REDIS CLUSTER  │  │    POSTGRESQL    │  │         BULLMQ QUEUES        │
│                  │  │                  │  │                              │
│ • Rate Counters  │  │ • Rate Configs   │  │  ┌────────────────────────┐  │
│ • Config Cache   │  │ • Audit Logs     │  │  │ Config Sync Queue      │  │
│ • Distributed    │  │ • User Quotas    │  │  │ Audit Log Queue        │  │
│   Locks          │  │ • API Keys       │  │  │ Metrics Queue           │  │
│                  │  │                  │  │  │ Cleanup Queue            │  │
│                  │  │                  │  │  └────────────────────────┘  │
└──────────────────┘  └──────────────────┘  └──────────────────────────────┘
```

# Explanation of Components

## The Big Picture

Think of this system like a bouncer at a club. The bouncer needs to know who you are, check if you're allowed in, and keep track of how many times you've tried to enter. But instead of one bouncer, we have multiple bouncers (servers) who all need to share the same information instantly.

---

## Layer 1: The Front Door (Express Middleware)

When a request comes in, three things happen before anything else:

**Identity Extractor** figures out who's making the request. It looks at the request in this order:

- Is there an API key in the headers? Use that.
- Is there a JWT token? Extract the user ID from it.
- Neither? Fall back to their IP address.

Why does this matter? Because an authenticated user with a paid plan might get 1000 requests per minute, while an anonymous visitor only gets 100. The system needs to know who you are before it can enforce limits.

**Rate Limit Middleware** is the actual gatekeeper. It takes the identity, asks the rate limiter service "should I let this through?", and either passes the request along to your actual API code or immediately sends back a "429 Too Many Requests" response.

**Fallback Handler** is the safety net. If Redis (where we store the counters) crashes, this kicks in. Instead of blocking everyone or crashing, it switches to a conservative in-memory limit. We deliberately choose to be permissive here—letting through a few extra requests is better than taking down your entire API.

---

## Layer 2: The Brain (Rate Limiter Service)

This is where the actual decisions happen. It has four main parts:

**Strategy Pattern** is just a fancy way of saying "we have different algorithms and we pick the right one based on configuration." Imagine you're a manager and you have three employees who count things differently:

- **Sliding Window** is the precise accountant. It remembers the exact timestamp of every single request. If your limit is 100 requests per minute, it looks back exactly 60 seconds and counts how many requests happened in that window. Very accurate, uses more memory.

- **Fixed Window** is the lazy counter. It divides time into buckets—one minute each. At 10:00:00 it starts a new bucket, at 10:01:00 it starts another. The problem? If you send 100 requests at 10:00:59 and another 100 at 10:01:01, you've sent 200 requests in 2 seconds but the system thinks it's fine because they're in different buckets. Simpler and faster, but has this edge case.

- **Token Bucket** is the burst-friendly option. Think of it like a bucket that holds 10 tokens. Every second, one token gets added back (up to the max). When you make a request, you spend a token. This means you can burst—send 10 requests instantly—but then you have to wait for tokens to refill. Great for APIs where users might legitimately need to do a bunch of things at once occasionally.

**Config Cache** lives in Redis because we don't want to hit PostgreSQL on every single request just to figure out what the rules are. We load all the rate limit rules into Redis and refresh them every 60 seconds. When someone updates a rule through the admin API, we notify the system to refresh its cache.

**Circuit Breaker** watches for Redis failures. If Redis fails 5 times in 10 seconds, the circuit "opens"—meaning we stop even trying to talk to Redis for 30 seconds. After 30 seconds, we try one request to see if Redis recovered. If it worked, we "close" the circuit and go back to normal. If it failed, we wait another 30 seconds. This prevents us from wasting time waiting for a dead Redis on every request.

**Metrics Collector** just counts things for monitoring: how many requests we allowed, how many we denied, how long the check took. This feeds into Prometheus so you can build dashboards and alerts.

---

## Layer 3: The Storage

**Redis Cluster** holds three types of data:

First, the actual rate limit counters. Depending on the strategy, this might be a sorted set of timestamps (sliding window), a simple number (fixed window), or a hash with token count and last refill time (token bucket). All of this has TTLs set so old data automatically disappears.

Second, the config cache. All the rules loaded from PostgreSQL, stored as JSON in Redis for fast access.

Third, distributed locks (for future use if you need to do anything that requires "only one server should do this at a time").

Why a cluster? Because with a single Redis server, you have a single point of failure and limited memory. A cluster shards the data across multiple servers, so you can handle more keys and survive individual node failures.

**PostgreSQL** is the source of truth for two things:

Rate limit configurations—the rules that say "API keys get 1000 requests per minute" or "the login endpoint gets 5 requests per 5 minutes per IP." These rarely change, so they don't need to be in Redis primarily. We cache them there for performance, but PostgreSQL is where you'd go to see the real data or make changes.

Audit logs—every time someone gets rate limited (or every request, if you turn that on), we record it. This is useful for debugging ("why did this user get blocked?"), analytics ("which endpoints are hitting limits most?"), and security ("this IP is aggressively testing our limits, maybe it's an attack").

Why not put audit logs in Redis? Because Redis is for fast, ephemeral data. Audit logs are permanent records that you might query months later. PostgreSQL is designed for exactly this.

---

## Layer 4: The Background Workers (BullMQ Queues)

Not everything needs to happen synchronously during a request. BullMQ gives us background job processing, also stored in Redis.

**Config Sync Queue** keeps the Redis cache in sync with PostgreSQL. When you create, update, or delete a rate limit rule through the admin API, instead of updating the cache mid-request (which could cause issues if multiple servers are doing this at once), we throw a job on this queue. A single dedicated worker picks it up and refreshes the cache. This prevents race conditions and keeps the API servers focused on handling requests.

**Audit Log Queue** is where we dump log entries. Instead of writing to PostgreSQL on every rate-limited request (which would add latency and could overwhelm the database under load), we push a small JSON object to this queue and move on. A separate worker (or two, for throughput) picks up these entries, batches them together—up to 100 at a time or every 5 seconds, whichever comes first—and does a single bulk INSERT into PostgreSQL. This is way more efficient than individual inserts.

**Cleanup Queue** runs on a schedule (every hour) and deletes audit logs older than 30 days. Without this, your audit_logs table would grow forever and eventually cause performance problems. This could also be done with a PostgreSQL cron job, but having it in BullMQ keeps all our scheduled work in one place and makes it easier to monitor.

---

## How Scaling Works

The beauty of this architecture is that the API servers are completely stateless. They don't store any rate limit data locally—everything goes to Redis. This means you can run as many API server instances as you want, and they'll all see the same counters.

Here's what happens when you scale from 1 server to 10:

Requests come in, a load balancer sends them to any of your 10 API servers. Each server extracts the identity, checks Redis, and makes a decision. Because Redis is shared, request #5 to server A and request #5 to server B are both counted against the same limit. The user doesn't know or care which server handled their request.

The workers are slightly different. You only want one config sync worker—if two of them tried to refresh the cache at the same time, they'd just do redundant work. But you can run multiple audit log workers because BullMQ handles that correctly: each log entry goes to exactly one worker, and if a worker crashes, another one picks up its unfinished jobs.

PostgreSQL can also be scaled with read replicas. The API servers never write to PostgreSQL directly (that's what workers do), so you could have the workers write to the primary and set up replicas for any analytics queries you want to run against the audit logs.

---

## Why This Combination of Technologies

**Express** is just the HTTP framework. Nothing special about the choice—it's what most Node.js teams use.

**TypeScript** catches bugs at compile time instead of runtime. When you're building infrastructure that other teams depend on, type safety is worth the extra setup.

**Redis** is perfect for rate limiting because it's fast (in-memory), supports atomic operations (via Lua scripts so you can do "check count AND increment" as one operation), and can be clustered for high availability. You couldn't build this correctly with just in-memory counting across multiple servers.

**PostgreSQL** is where you put data that matters and needs to survive restarts, be queried in complex ways, and have strong consistency. Rate limit configs and audit logs fit this perfectly.

**BullMQ** gives you reliable job processing with retries, dead letter queues, and the ability to see what jobs are waiting, processing, or failed. Building this yourself would be a waste of time.

---

## The Trade-offs We Made

We chose to **fail open** when Redis is down. The alternative is failing closed—blocking all requests until Redis comes back. We chose open because a brief period of slightly-excessive traffic is less bad than a complete outage. You could flip this if your use case demands strict limits.

We chose **eventual consistency** for the config cache. When you update a rate limit rule, it might take up to 60 seconds for all API servers to see the change. The alternative is hitting PostgreSQL on every request, which would be slower and could overwhelm the database.

We chose **async audit logging**. If the audit queue backs up, you might lose some logs if Redis crashes before they're written to PostgreSQL. The alternative is synchronous writes, which would slow down every rate-limited request. For most use cases, eventually-consistent logs are fine.

We chose **Lua scripts** for Redis operations. This is the only way to do atomic "read-modify-write" operations in Redis. Without them, two servers could both read "count is 99", both think "I can allow this", and both increment to 100 and 101, exceeding your limit. Lua scripts prevent this.
