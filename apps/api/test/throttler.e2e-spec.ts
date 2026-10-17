import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApiKey } from "./helpers";
import { getApp, getTestDb } from "./setup";

describe("api key throttling (e2e)", () => {
  it("includes Retry-After on throttled responses only", async () => {
    const apiKey = await createApiKey(getTestDb());

    for (let i = 0; i < 100; i++) {
      const response = await request(getApp().getHttpServer()).get("/contracts").set("x-api-key", apiKey);
      expect(response.status).toBe(200);
      expect(response.headers["retry-after"]).toBeUndefined();
    }

    const throttled = await request(getApp().getHttpServer()).get("/contracts").set("x-api-key", apiKey);
    expect(throttled.status).toBe(429);
    expect(Number(throttled.headers["retry-after"])).toBeGreaterThan(0);
  });
});
