import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSession, submitDetails, getSession, advanceToReview, goLive } from "./sessions.js";
import { triggerValidation } from "./validationAttempts.js";
import { resetDb } from "../test/resetDb.js";

const createSessionWithApiKey = async (apiKey: string): Promise<string> => {
  const session = await createSession();
  await submitDetails(session.id, {
    companyName: "Acme Co",
    providerAccountId: "acc_123",
    providerApiKey: apiKey,
  });
  return session.id;
};

const createSessionAtReview = async (apiKey: string): Promise<string> => {
  const sessionId = await createSessionWithApiKey(apiKey);
  await triggerValidation(sessionId);
  await vi.advanceTimersByTimeAsync(5000);
  await advanceToReview(sessionId);
  return sessionId;
};

describe("createSession", () => {
  beforeEach(resetDb);

  it("creates a session with the correct defaults", async () => {
    const session = await createSession();
    expect(session.currentStep).toBe("DETAILS");
    expect(session.isLive).toBe(false);
    expect(session.companyName).toBeNull();
    expect(session.providerAccountId).toBeNull();
    expect(session.providerApiKey).toBeNull();
    expect(session.id).toEqual(expect.any(String));
  });

  it("creates independent sessions on repeated calls", async () => {
    const first = await createSession();
    const second = await createSession();
    expect(first.id).not.toBe(second.id);
  });
});

describe("submitDetails", () => {
  beforeEach(resetDb);

  it("saves the three fields and advances currentStep to VALIDATE", async () => {
    const session = await createSession();
    const updated = await submitDetails(session.id, {
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });

    expect(updated?.companyName).toBe("Acme Co");
    expect(updated?.providerAccountId).toBe("acc_123");
    expect(updated?.providerApiKey).toBe("key_abc");
    expect(updated?.currentStep).toBe("VALIDATE");
  });

  it("returns null for a session id that doesn't exist", async () => {
    const result = await submitDetails("does-not-exist", {
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });
    expect(result).toBeNull();
  });

  it("calling it twice is safe — the second call is a no-op that returns the already-advanced session", async () => {
    const session = await createSession();
    const first = await submitDetails(session.id, {
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });
    const second = await submitDetails(session.id, {
      companyName: "Someone Else",
      providerAccountId: "different",
      providerApiKey: "different",
    });

    expect(second?.currentStep).toBe("VALIDATE");
    expect(second?.companyName).toBe("Acme Co"); // unchanged by the second call
    expect(second).toEqual(first);
  });
});

describe("getSession", () => {
  beforeEach(resetDb);

  it("returns the session matching all its fields", async () => {
    const created = await createSession();
    const fetched = await getSession(created.id);
    expect(fetched).toEqual(created);
  });

  it("returns null for a session id that doesn't exist", async () => {
    const result = await getSession("does-not-exist");
    expect(result).toBeNull();
  });
});

describe("advanceToReview", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns not_found for a session id that doesn't exist", async () => {
    const result = await advanceToReview("does-not-exist");
    expect(result).toEqual({ type: "not_found" });
  });

  it("returns invalid when no validation attempt exists yet", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const result = await advanceToReview(sessionId);
    expect(result).toEqual({ type: "invalid" });
  });

  it.each(["key_invalid", "key_unavailable"])(
    "returns invalid when the latest attempt resolved via %s",
    async (apiKey) => {
      const sessionId = await createSessionWithApiKey(apiKey);
      await triggerValidation(sessionId);
      await vi.advanceTimersByTimeAsync(5000);

      const result = await advanceToReview(sessionId);
      expect(result).toEqual({ type: "invalid" });
    },
  );

  it("returns invalid while the latest attempt is still PENDING", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    await triggerValidation(sessionId);

    const result = await advanceToReview(sessionId);
    expect(result).toEqual({ type: "invalid" });
  });

  it("advances currentStep to REVIEW when the latest attempt is VALID", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const result = await advanceToReview(sessionId);
    expect(result.type).toBe("ok");
    expect(result.type === "ok" && result.session.currentStep).toBe("REVIEW");
  });

  it("advances currentStep to REVIEW when the latest attempt is PARTIAL", async () => {
    const sessionId = await createSessionWithApiKey("key_partial");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const result = await advanceToReview(sessionId);
    expect(result.type).toBe("ok");
    expect(result.type === "ok" && result.session.currentStep).toBe("REVIEW");
  });

  it("is idempotent — calling it twice after a VALID attempt returns the same REVIEW state both times", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const first = await advanceToReview(sessionId);
    const second = await advanceToReview(sessionId);

    expect(first).toEqual(second);
  });
});

describe("goLive", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns not_found for a session id that doesn't exist", async () => {
    const result = await goLive("does-not-exist");
    expect(result).toEqual({ type: "not_found" });
  });

  it("returns invalid when currentStep isn't REVIEW", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const result = await goLive(sessionId);
    expect(result).toEqual({ type: "invalid" });
  });

  it("sets isLive to true when currentStep is REVIEW", async () => {
    const sessionId = await createSessionAtReview("key_valid");
    const result = await goLive(sessionId);

    expect(result.type).toBe("ok");
    expect(result.type === "ok" && result.session.isLive).toBe(true);
    expect(result.type === "ok" && result.session.currentStep).toBe("REVIEW");
  });

  it("is idempotent — calling it twice returns the same live session both times", async () => {
    const sessionId = await createSessionAtReview("key_valid");
    const first = await goLive(sessionId);
    const second = await goLive(sessionId);

    expect(first).toEqual(second);
  });
});
