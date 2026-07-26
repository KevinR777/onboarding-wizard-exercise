import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../app.js";
import { resetDb } from "../test/resetDb.js";

const createSessionWithApiKey = async (apiKey: string): Promise<string> => {
  const createRes = await request(app).post("/sessions");
  const id = createRes.body.id;
  await request(app).post(`/sessions/${id}/details`).send({
    companyName: "Acme Co",
    providerAccountId: "acc_123",
    providerApiKey: apiKey,
  });
  return id;
};

describe("POST /sessions/:id/validate", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 201 with a new PENDING attempt", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const res = await request(app).post(`/sessions/${id}/validate`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.sessionId).toBe(id);
  });

  it("returns 404 for a session id that doesn't exist", async () => {
    const res = await request(app).post("/sessions/does-not-exist/validate");
    expect(res.status).toBe(404);
  });

  it("is idempotent — calling it twice while PENDING returns 200 with the same attempt the second time", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const first = await request(app).post(`/sessions/${id}/validate`);
    const second = await request(app).post(`/sessions/${id}/validate`);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
  });

  it("creates a new attempt on retry after a terminal outcome", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const first = await request(app).post(`/sessions/${id}/validate`);
    await vi.advanceTimersByTimeAsync(5000);

    const second = await request(app).post(`/sessions/${id}/validate`);

    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it("resolves to VALID after the timer fires and is reflected by the poll endpoint", async () => {
    const id = await createSessionWithApiKey("key_valid");
    await request(app).post(`/sessions/${id}/validate`);

    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.body.attempt.status).toBe("VALID");
    expect(res.body.attempt.payload.items).toBeInstanceOf(Array);
  });

  it("resolves to PARTIAL with items and warnings for key_partial", async () => {
    const id = await createSessionWithApiKey("key_partial");
    await request(app).post(`/sessions/${id}/validate`);

    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.body.attempt.status).toBe("PARTIAL");
    expect(res.body.attempt.payload.items).toBeInstanceOf(Array);
    expect(res.body.attempt.payload.warnings).toBeInstanceOf(Array);
  });

  it("resolves to INVALID with a reason for key_invalid", async () => {
    const id = await createSessionWithApiKey("key_invalid");
    await request(app).post(`/sessions/${id}/validate`);

    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.body.attempt.status).toBe("INVALID");
    expect(res.body.attempt.payload.reason).toEqual(expect.any(String));
  });

  it("resolves to UNAVAILABLE for key_unavailable", async () => {
    const id = await createSessionWithApiKey("key_unavailable");
    await request(app).post(`/sessions/${id}/validate`);

    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.body.attempt.status).toBe("UNAVAILABLE");
    expect(res.body.attempt.payload.httpStatus).toBe(503);
  });
});

describe("GET /sessions/:id/validation", () => {
  beforeEach(resetDb);

  it("returns 200 with attempt: null when no attempt exists yet — not an error, this is a normal state", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.status).toBe(200);
    expect(res.body.attempt).toBeNull();
  });

  it("returns the latest attempt", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const id = await createSessionWithApiKey("key_valid");
    const triggerRes = await request(app).post(`/sessions/${id}/validate`);
    vi.useRealTimers();

    const res = await request(app).get(`/sessions/${id}/validation`);
    expect(res.status).toBe(200);
    expect(res.body.attempt.id).toBe(triggerRes.body.id);
  });
});
