// packages/database/prisma/seed-rate-limiter.ts
import { prisma } from "../src";

async function seed() {
  await prisma.rateLimitConfig.upsert({
    where: { id: "global-ip-limit" },
    update: {},
    create: {
      id: "global-ip-limit",
      name: "Global IP Limit",
      strategy: "SLIDING_WINDOW",
      identifierType: "IP",
      limit: 100,
      windowMs: 60000,
      priority: 0,
    },
  });

  await prisma.rateLimitConfig.upsert({
    where: { id: "api-key-limit" },
    update: {},
    create: {
      id: "api-key-limit",
      name: "API Key Limit",
      strategy: "SLIDING_WINDOW",
      identifierType: "API_KEY",
      limit: 1000,
      windowMs: 60000,
      priority: 10,
    },
  });

  // NOTE: pattern must match the real request path (req.path), incl. the
  // /api/v1 prefix — see identity-extractor + ConfigCacheService.findMatching
  await prisma.rateLimitConfig.upsert({
    where: { id: "login-rate-limit" },
    update: {},
    create: {
      id: "login-rate-limit",
      name: "Login Rate Limit",
      strategy: "FIXED_WINDOW",
      identifierType: "IP",
      limit: 5,
      windowMs: 300000,
      routePattern: "/api/v1/auth/signin",
      priority: 100,
    },
  });

  console.log("Rate limiter configs seeded");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
