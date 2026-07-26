import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useValidateStep } from "./useValidateStep";
import { useToast } from "../../../Toast/useToast";
import { useGetValidationAttempt } from "../../../../services/useGetValidationAttempt";
import { useTriggerValidation } from "../../../../services/useTriggerValidation";
import { useAdvanceToReview } from "../../../../services/useAdvanceToReview";
import type { ValidationAttempt } from "../../../../api/sessions";

vi.mock("react-router", () => ({ useParams: () => ({ sessionId: "test-session-id" }) }));
vi.mock("../../../Toast/useToast");
vi.mock("../../../../services/useGetValidationAttempt");
vi.mock("../../../../services/useTriggerValidation");
vi.mock("../../../../services/useAdvanceToReview");

const baseAttempt = {
  id: "attempt_1",
  sessionId: "test-session-id",
  createdAt: "",
  updatedAt: "",
};

const attemptWithStatus = (status: ValidationAttempt["status"]): ValidationAttempt => {
  switch (status) {
    case "PENDING":
      return { ...baseAttempt, status, payload: null };
    case "VALID":
      return { ...baseAttempt, status, payload: { items: [{ id: "item_1", name: "Item One" }] } };
    case "PARTIAL":
      return {
        ...baseAttempt,
        status,
        payload: { items: [{ id: "item_1", name: "Item One" }], warnings: ["Item Two could not be verified"] },
      };
    case "INVALID":
      return { ...baseAttempt, status, payload: { reason: "The provided API key was rejected." } };
    case "UNAVAILABLE":
      return { ...baseAttempt, status, payload: { reason: "The provider is temporarily unavailable.", httpStatus: 503 } };
  }
};

describe("useValidateStep", () => {
  const showToast = vi.fn();
  const triggerValidation = vi.fn();
  const advanceToReview = vi.fn();

  beforeEach(() => {
    showToast.mockClear();
    triggerValidation.mockReset();
    triggerValidation.mockResolvedValue(attemptWithStatus("PENDING"));
    advanceToReview.mockReset();
    advanceToReview.mockResolvedValue({});
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useTriggerValidation).mockReturnValue({ triggerValidation, isPending: false, isError: false });
    vi.mocked(useAdvanceToReview).mockReturnValue({ advanceToReview, isPending: false, isError: false });
  });

  it("auto-triggers validation when no attempt exists yet", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: null, isLoading: false });
    renderHook(() => useValidateStep({ onNext: vi.fn() }));

    await waitFor(() => expect(triggerValidation).toHaveBeenCalledWith("test-session-id"));
  });

  it("does not auto-trigger while the attempt is still loading", () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: undefined, isLoading: true });
    renderHook(() => useValidateStep({ onNext: vi.fn() }));

    expect(triggerValidation).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "VALID", "PARTIAL", "INVALID", "UNAVAILABLE"] as const)(
    "does not auto-trigger when an attempt already exists with status %s",
    async (status) => {
      vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus(status), isLoading: false });
      const { result } = renderHook(() => useValidateStep({ onNext: vi.fn() }));

      await waitFor(() => expect(result.current.status).toBe(status));
      expect(triggerValidation).not.toHaveBeenCalled();
    },
  );

  it("handleNext calls advanceToReview and advances when status is VALID", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus("VALID"), isLoading: false });
    const onNext = vi.fn();
    const { result } = renderHook(() => useValidateStep({ onNext }));

    await result.current.handleNext();

    expect(advanceToReview).toHaveBeenCalledWith("test-session-id");
    expect(onNext).toHaveBeenCalledOnce();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("handleNext calls advanceToReview and advances when status is PARTIAL", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus("PARTIAL"), isLoading: false });
    const onNext = vi.fn();
    const { result } = renderHook(() => useValidateStep({ onNext }));

    await result.current.handleNext();

    expect(advanceToReview).toHaveBeenCalledWith("test-session-id");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("handleNext shows a toast and does not advance when advanceToReview fails", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus("VALID"), isLoading: false });
    advanceToReview.mockRejectedValue(new Error("network error"));
    const onNext = vi.fn();
    const { result } = renderHook(() => useValidateStep({ onNext }));

    await result.current.handleNext();

    expect(showToast).toHaveBeenCalledWith("Failed to advance to Review. Please try again.");
    expect(onNext).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "INVALID", "UNAVAILABLE"] as const)(
    "handleNext shows a toast, does not call advanceToReview, and does not advance when status is %s",
    async (status) => {
      vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus(status), isLoading: false });
      const onNext = vi.fn();
      const { result } = renderHook(() => useValidateStep({ onNext }));

      await result.current.handleNext();

      expect(showToast).toHaveBeenCalledWith("Please complete validation before continuing.");
      expect(advanceToReview).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
    },
  );

  it("handleRetry calls triggerValidation", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus("INVALID"), isLoading: false });
    const { result } = renderHook(() => useValidateStep({ onNext: vi.fn() }));
    triggerValidation.mockClear();

    await result.current.handleRetry();

    expect(triggerValidation).toHaveBeenCalledWith("test-session-id");
  });

  it("handleRetry shows a toast when triggerValidation fails", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: attemptWithStatus("INVALID"), isLoading: false });
    triggerValidation.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useValidateStep({ onNext: vi.fn() }));

    await result.current.handleRetry();

    expect(showToast).toHaveBeenCalledWith("Failed to start validation. Please try again.");
  });
});
