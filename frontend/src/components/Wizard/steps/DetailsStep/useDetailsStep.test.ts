import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { useDetailsStep } from "./useDetailsStep";
import { useToast } from "../../../Toast/useToast";
import { useSubmitDetails } from "../../../../services/useSubmitDetails";
import { useGetSession } from "../../../../services/useGetSession";
import type { Session } from "../../../../api/sessions";

vi.mock("react-router", () => ({ useParams: () => ({ sessionId: "test-session-id" }) }));
vi.mock("../../../Toast/useToast");
vi.mock("../../../../services/useSubmitDetails");
vi.mock("../../../../services/useGetSession");

const changeEvent = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;

const fillAllFields = (result: { current: ReturnType<typeof useDetailsStep> }) => {
  act(() => {
    result.current.handleCompanyNameChange(changeEvent("Acme"));
    result.current.handleProviderAccountIdChange(changeEvent("acc_123"));
    result.current.handleProviderApiKeyChange(changeEvent("key_abc"));
  });
};

const fakeSession: Session = {
  id: "test-session-id",
  currentStep: "DETAILS",
  companyName: null,
  providerAccountId: null,
  providerApiKey: null,
  isLive: false,
  createdAt: "",
  updatedAt: "",
};

describe("useDetailsStep", () => {
  const showToast = vi.fn();
  const submitDetails = vi.fn();

  beforeEach(() => {
    showToast.mockClear();
    submitDetails.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useSubmitDetails).mockReturnValue({ submitDetails, isPending: false, isError: false });
    vi.mocked(useGetSession).mockReturnValue({ session: undefined, isLoading: true, isError: false });
  });

  it("isValid is only true once all three fields are filled (and rejects whitespace-only)", () => {
    const { result } = renderHook(() => useDetailsStep({ onNext: vi.fn() }));
    expect(result.current.isValid).toBe(false);

    act(() => result.current.handleCompanyNameChange(changeEvent("Acme")));
    act(() => result.current.handleProviderAccountIdChange(changeEvent("   ")));
    act(() => result.current.handleProviderApiKeyChange(changeEvent("key_abc")));
    expect(result.current.isValid).toBe(false); // whitespace-only doesn't count

    act(() => result.current.handleProviderAccountIdChange(changeEvent("acc_123")));
    expect(result.current.isValid).toBe(true);
  });

  it("seeds field values from the loaded session when it has prior Details data", async () => {
    vi.mocked(useGetSession).mockReturnValue({
      session: {
        ...fakeSession,
        companyName: "Acme Co",
        providerAccountId: "acc_123",
        providerApiKey: "key_abc",
      },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useDetailsStep({ onNext: vi.fn() }));

    await waitFor(() => expect(result.current.companyName).toBe("Acme Co"));
    expect(result.current.providerAccountId).toBe("acc_123");
    expect(result.current.providerApiKey).toBe("key_abc");
  });

  it("handleNext shows a toast and does not call submitDetails when fields are empty", async () => {
    const onNext = vi.fn();
    const { result } = renderHook(() => useDetailsStep({ onNext }));

    await act(() => result.current.handleNext());

    expect(showToast).toHaveBeenCalledWith("Please fill in all fields before continuing.");
    expect(submitDetails).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls submitDetails and advances on success", async () => {
    submitDetails.mockResolvedValue({
      id: "test-session-id",
      currentStep: "VALIDATE",
      companyName: "Acme",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
      isLive: false,
      createdAt: "",
      updatedAt: "",
    });
    const onNext = vi.fn();
    const { result } = renderHook(() => useDetailsStep({ onNext }));

    fillAllFields(result);
    await act(() => result.current.handleNext());

    expect(submitDetails).toHaveBeenCalledWith({
      sessionId: "test-session-id",
      companyName: "Acme",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });
    expect(onNext).toHaveBeenCalledOnce();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows a toast and does not advance when submitDetails rejects", async () => {
    submitDetails.mockRejectedValue(new Error("network error"));
    const onNext = vi.fn();
    const { result } = renderHook(() => useDetailsStep({ onNext }));

    fillAllFields(result);
    await act(() => result.current.handleNext());

    expect(showToast).toHaveBeenCalledWith("Failed to save details. Please try again.");
    expect(onNext).not.toHaveBeenCalled();
  });
});
