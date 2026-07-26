import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSession, submitDetails } from "./sessions.js";
import { triggerValidation, getLatestValidationAttempt } from "./validationAttempts.js";
import { resetDb } from "../test/resetDb.js";
import { prisma } from "../prisma.js";

const createSessionWithApiKey = async (apiKey: string): Promise<string> => {
  const session = await createSession();
  await submitDetails(session.id, {
    companyName: "Acme Co",
    providerAccountId: "acc_123",
    providerApiKey: apiKey,
  });
  return session.id;
};

describe("triggerValidation", () => {
  beforeEach(resetDb);
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a new PENDING attempt when none exists yet", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const result = await triggerValidation(sessionId);

    expect(result?.created).toBe(true);
    expect(result?.attempt.status).toBe("PENDING");
    expect(result?.attempt.payload).toBeNull();
  });

  it("returns null for a session id that doesn't exist", async () => {
    const result = await triggerValidation("does-not-exist");
    expect(result).toBeNull();
  });

  it("is idempotent — calling it again while PENDING returns the same attempt, does not create a second row", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const first = await triggerValidation(sessionId);
    const second = await triggerValidation(sessionId);

    expect(second?.created).toBe(false);
    expect(second?.attempt.id).toBe(first?.attempt.id);

    const count = await prisma.validationAttempt.count({ where: { sessionId } });
    expect(count).toBe(1);
  });

  it("creates a new attempt on retry after a terminal outcome", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const first = await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000); // resolve the first attempt to VALID

    const second = await triggerValidation(sessionId);

    expect(second?.created).toBe(true);
    expect(second?.attempt.id).not.toBe(first?.attempt.id);

    const count = await prisma.validationAttempt.count({ where: { sessionId } });
    expect(count).toBe(2);
  });

  it("key_valid resolves to VALID after the timer fires", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const resolved = await getLatestValidationAttempt(sessionId);
    expect(resolved?.status).toBe("VALID");
    expect(resolved?.payload).not.toBeNull();
  });

  it("key_partial resolves to PARTIAL after the timer fires", async () => {
    const sessionId = await createSessionWithApiKey("key_partial");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const resolved = await getLatestValidationAttempt(sessionId);
    expect(resolved?.status).toBe("PARTIAL");
    expect(resolved?.payload).not.toBeNull();
  });

  it("key_invalid resolves to INVALID after the timer fires", async () => {
    const sessionId = await createSessionWithApiKey("key_invalid");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const resolved = await getLatestValidationAttempt(sessionId);
    expect(resolved?.status).toBe("INVALID");
    expect(resolved?.payload).not.toBeNull();
  });

  it("key_unavailable resolves to UNAVAILABLE after the timer fires", async () => {
    const sessionId = await createSessionWithApiKey("key_unavailable");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const resolved = await getLatestValidationAttempt(sessionId);
    expect(resolved?.status).toBe("UNAVAILABLE");
    expect(resolved?.payload).not.toBeNull();
  });

  it("an unrecognized key defaults to VALID after the timer fires", async () => {
    const sessionId = await createSessionWithApiKey("some_other_key");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);

    const resolved = await getLatestValidationAttempt(sessionId);
    expect(resolved?.status).toBe("VALID");
  });
});

describe("getLatestValidationAttempt", () => {
  beforeEach(resetDb);

  it("returns null when no attempt exists yet", async () => {
    const sessionId = await createSessionWithApiKey("key_valid");
    const result = await getLatestValidationAttempt(sessionId);
    expect(result).toBeNull();
  });

  it("returns the most recently created attempt", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const sessionId = await createSessionWithApiKey("key_valid");
    await triggerValidation(sessionId);
    await vi.advanceTimersByTimeAsync(5000);
    const retried = await triggerValidation(sessionId); // retry after terminal
    vi.useRealTimers();

    const latest = await getLatestValidationAttempt(sessionId);
    expect(latest?.id).toBe(retried?.attempt.id);
  });
});
