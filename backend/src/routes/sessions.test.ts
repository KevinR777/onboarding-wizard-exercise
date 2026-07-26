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

const createSessionAtReview = async (apiKey: string): Promise<string> => {
  const id = await createSessionWithApiKey(apiKey);
  await request(app).post(`/sessions/${id}/validate`);
  await vi.advanceTimersByTimeAsync(5000);
  await request(app).post(`/sessions/${id}/advance-to-review`);
  return id;
};

describe("POST /sessions", () => {
  beforeEach(resetDb);

  it("returns 201 with a freshly created session", async () => {
    const res = await request(app).post("/sessions");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      currentStep: "DETAILS",
      isLive: false,
      companyName: null,
      providerAccountId: null,
      providerApiKey: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
  });
});

describe("POST /sessions/:id/details", () => {
  beforeEach(resetDb);

  it("returns 200 with the updated session on the happy path", async () => {
    const createRes = await request(app).post("/sessions");
    const id = createRes.body.id;

    const res = await request(app).post(`/sessions/${id}/details`).send({
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id,
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
      currentStep: "VALIDATE",
    });
  });

  it("returns 400 when a field is missing", async () => {
    const createRes = await request(app).post("/sessions");
    const id = createRes.body.id;

    const res = await request(app).post(`/sessions/${id}/details`).send({
      companyName: "Acme Co",
      providerAccountId: "",
      providerApiKey: "key_abc",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 404 for a session id that doesn't exist", async () => {
    const res = await request(app).post("/sessions/does-not-exist/details").send({
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });

    expect(res.status).toBe(404);
  });

  it("is safe to call twice — the second call returns 200 with the unchanged, already-advanced session", async () => {
    const createRes = await request(app).post("/sessions");
    const id = createRes.body.id;

    const first = await request(app).post(`/sessions/${id}/details`).send({
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });
    const second = await request(app).post(`/sessions/${id}/details`).send({
      companyName: "Someone Else",
      providerAccountId: "different",
      providerApiKey: "different",
    });

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});

describe("GET /sessions/:id", () => {
  beforeEach(resetDb);

  it("returns 200 with the full session", async () => {
    const createRes = await request(app).post("/sessions");
    const id = createRes.body.id;

    const res = await request(app).get(`/sessions/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(createRes.body);
  });

  it("returns 404 for a session id that doesn't exist", async () => {
    const res = await request(app).get("/sessions/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("POST /sessions/:id/advance-to-review", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 404 for a session id that doesn't exist", async () => {
    const res = await request(app).post("/sessions/does-not-exist/advance-to-review");
    expect(res.status).toBe(404);
  });

  it("returns 400 when no validation attempt exists yet", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const res = await request(app).post(`/sessions/${id}/advance-to-review`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 while the latest attempt is still PENDING", async () => {
    const id = await createSessionWithApiKey("key_valid");
    await request(app).post(`/sessions/${id}/validate`);

    const res = await request(app).post(`/sessions/${id}/advance-to-review`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when the latest attempt resolved to INVALID", async () => {
    const id = await createSessionWithApiKey("key_invalid");
    await request(app).post(`/sessions/${id}/validate`);
    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).post(`/sessions/${id}/advance-to-review`);
    expect(res.status).toBe(400);
  });

  it("returns 200 with currentStep REVIEW when the latest attempt is VALID", async () => {
    const id = await createSessionWithApiKey("key_valid");
    await request(app).post(`/sessions/${id}/validate`);
    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).post(`/sessions/${id}/advance-to-review`);
    expect(res.status).toBe(200);
    expect(res.body.currentStep).toBe("REVIEW");
  });

  it("returns 200 with currentStep REVIEW when the latest attempt is PARTIAL", async () => {
    const id = await createSessionWithApiKey("key_partial");
    await request(app).post(`/sessions/${id}/validate`);
    await vi.advanceTimersByTimeAsync(5000);

    const res = await request(app).post(`/sessions/${id}/advance-to-review`);
    expect(res.status).toBe(200);
    expect(res.body.currentStep).toBe("REVIEW");
  });

  it("is idempotent — calling it twice after a VALID attempt returns 200 both times with the same body", async () => {
    const id = await createSessionWithApiKey("key_valid");
    await request(app).post(`/sessions/${id}/validate`);
    await vi.advanceTimersByTimeAsync(5000);

    const first = await request(app).post(`/sessions/${id}/advance-to-review`);
    const second = await request(app).post(`/sessions/${id}/advance-to-review`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});

describe("POST /sessions/:id/go-live", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 404 for a session id that doesn't exist", async () => {
    const res = await request(app).post("/sessions/does-not-exist/go-live");
    expect(res.status).toBe(404);
  });

  it("returns 400 when currentStep isn't REVIEW", async () => {
    const id = await createSessionWithApiKey("key_valid");
    const res = await request(app).post(`/sessions/${id}/go-live`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 200 with isLive true when currentStep is REVIEW", async () => {
    const id = await createSessionAtReview("key_valid");
    const res = await request(app).post(`/sessions/${id}/go-live`);

    expect(res.status).toBe(200);
    expect(res.body.isLive).toBe(true);
  });

  it("is idempotent — calling it twice after going live returns 200 both times with the same body", async () => {
    const id = await createSessionAtReview("key_valid");
    const first = await request(app).post(`/sessions/${id}/go-live`);
    const second = await request(app).post(`/sessions/${id}/go-live`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});
