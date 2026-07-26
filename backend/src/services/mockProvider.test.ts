import { describe, it, expect } from "vitest";
import { runMockProvider } from "./mockProvider.js";

describe("runMockProvider", () => {
  it("key_valid -> VALID with items", () => {
    const outcome = runMockProvider("key_valid");
    expect(outcome.status).toBe("VALID");
    expect(outcome.payload).toMatchObject({ items: expect.any(Array) });
  });

  it("key_partial -> PARTIAL with items and warnings", () => {
    const outcome = runMockProvider("key_partial");
    expect(outcome.status).toBe("PARTIAL");
    expect(outcome.payload).toMatchObject({
      items: expect.any(Array),
      warnings: expect.any(Array),
    });
  });

  it("key_invalid -> INVALID with a reason", () => {
    const outcome = runMockProvider("key_invalid");
    expect(outcome.status).toBe("INVALID");
    expect(outcome.payload).toMatchObject({ reason: expect.any(String) });
  });

  it("key_unavailable -> UNAVAILABLE with a reason and 503", () => {
    const outcome = runMockProvider("key_unavailable");
    expect(outcome.status).toBe("UNAVAILABLE");
    expect(outcome.payload).toMatchObject({ reason: expect.any(String), httpStatus: 503 });
  });

  it("any other key defaults to VALID", () => {
    const outcome = runMockProvider("some_other_key");
    expect(outcome.status).toBe("VALID");
  });

  it("null apiKey also defaults to VALID", () => {
    const outcome = runMockProvider(null);
    expect(outcome.status).toBe("VALID");
  });
});
