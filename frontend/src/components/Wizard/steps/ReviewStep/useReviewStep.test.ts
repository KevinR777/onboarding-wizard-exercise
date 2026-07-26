import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReviewStep } from "./useReviewStep";
import { useToast } from "../../../Toast/useToast";
import { useGetSession } from "../../../../services/useGetSession";
import { useGetValidationAttempt } from "../../../../services/useGetValidationAttempt";
import { useGoLive } from "../../../../services/useGoLive";
import type { Session, ValidationAttempt } from "../../../../api/sessions";

vi.mock("react-router", () => ({ useParams: () => ({ sessionId: "test-session-id" }) }));
vi.mock("../../../Toast/useToast");
vi.mock("../../../../services/useGetSession");
vi.mock("../../../../services/useGetValidationAttempt");
vi.mock("../../../../services/useGoLive");

const fakeSession: Session = {
  id: "test-session-id",
  currentStep: "REVIEW",
  companyName: "Acme Co",
  providerAccountId: "acc_123",
  providerApiKey: "key_abc",
  isLive: false,
  createdAt: "",
  updatedAt: "",
};

const baseAttempt = {
  id: "attempt_1",
  sessionId: "test-session-id",
  createdAt: "",
  updatedAt: "",
};

const validAttempt: ValidationAttempt = {
  ...baseAttempt,
  status: "VALID",
  payload: { items: [{ id: "item_1", name: "Item One" }] },
};

const partialAttempt: ValidationAttempt = {
  ...baseAttempt,
  status: "PARTIAL",
  payload: {
    items: [{ id: "item_1", name: "Item One" }],
    warnings: ["Item Two could not be verified"],
  },
};

describe("useReviewStep", () => {
  const showToast = vi.fn();
  const goLive = vi.fn();

  beforeEach(() => {
    showToast.mockClear();
    goLive.mockReset();
    goLive.mockResolvedValue(fakeSession);
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useGetSession).mockReturnValue({ session: fakeSession, isLoading: false, isError: false });
    vi.mocked(useGoLive).mockReturnValue({ goLive, isPending: false, isError: false });
  });

  it("derives companyName, status, and items for a VALID attempt", () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: validAttempt, isLoading: false });
    const { result } = renderHook(() => useReviewStep());

    expect(result.current.companyName).toBe("Acme Co");
    expect(result.current.status).toBe("VALID");
    expect(result.current.items).toEqual([{ id: "item_1", name: "Item One" }]);
    expect(result.current.warnings).toBeNull();
  });

  it("derives items and warnings for a PARTIAL attempt", () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: partialAttempt, isLoading: false });
    const { result } = renderHook(() => useReviewStep());

    expect(result.current.status).toBe("PARTIAL");
    expect(result.current.items).toEqual([{ id: "item_1", name: "Item One" }]);
    expect(result.current.warnings).toEqual(["Item Two could not be verified"]);
  });

  it("returns nulls while the session and attempt haven't loaded yet", () => {
    vi.mocked(useGetSession).mockReturnValue({ session: undefined, isLoading: true, isError: false });
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: undefined, isLoading: true });
    const { result } = renderHook(() => useReviewStep());

    expect(result.current.companyName).toBeNull();
    expect(result.current.status).toBeNull();
    expect(result.current.items).toBeNull();
    expect(result.current.warnings).toBeNull();
  });

  it("handleGoLive calls goLive with the session id", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: validAttempt, isLoading: false });
    const { result } = renderHook(() => useReviewStep());

    await result.current.handleGoLive();

    expect(goLive).toHaveBeenCalledWith("test-session-id");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("handleGoLive shows a toast when goLive fails", async () => {
    vi.mocked(useGetValidationAttempt).mockReturnValue({ attempt: validAttempt, isLoading: false });
    goLive.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useReviewStep());

    await result.current.handleGoLive();

    expect(showToast).toHaveBeenCalledWith("Failed to go live. Please try again.");
  });
});
