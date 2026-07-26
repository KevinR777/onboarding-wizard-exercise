import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useWizard } from "./useWizard";
import { useGetSession } from "../../services/useGetSession";
import type { Session } from "../../api/sessions";

const navigate = vi.fn();
vi.mock("react-router", () => ({
  useParams: () => ({ sessionId: "test-session-id" }),
  useNavigate: () => navigate,
}));
vi.mock("../../services/useGetSession");

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

describe("useWizard", () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it("reports isLoading while the session is still loading", () => {
    vi.mocked(useGetSession).mockReturnValue({ session: undefined, isLoading: true, isError: false });
    const { result } = renderHook(() => useWizard());
    expect(result.current.isLoading).toBe(true);
  });

  it("resumes at the session's persisted currentStep once loaded", async () => {
    vi.mocked(useGetSession).mockReturnValue({
      session: { ...fakeSession, currentStep: "VALIDATE" },
      isLoading: false,
      isError: false,
    });
    const { result } = renderHook(() => useWizard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentStep).toBe("VALIDATE");
    expect(result.current.activeStepIndex).toBe(1);
  });

  it("reports isLive when the session is live, regardless of currentStep", async () => {
    vi.mocked(useGetSession).mockReturnValue({
      session: { ...fakeSession, currentStep: "REVIEW", isLive: true },
      isLoading: false,
      isError: false,
    });
    const { result } = renderHook(() => useWizard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(true);
  });

  it("redirects to the landing page when the session is not found", async () => {
    vi.mocked(useGetSession).mockReturnValue({ session: null, isLoading: false, isError: false });
    renderHook(() => useWizard());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("advances Details -> Validate -> Review on goNext, from wherever it resumed", async () => {
    vi.mocked(useGetSession).mockReturnValue({ session: fakeSession, isLoading: false, isError: false });
    const { result } = renderHook(() => useWizard());
    await waitFor(() => expect(result.current.currentStep).toBe("DETAILS"));

    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe("VALIDATE");
    expect(result.current.activeStepIndex).toBe(1);

    act(() => result.current.goNext());
    expect(result.current.currentStep).toBe("REVIEW");
    expect(result.current.activeStepIndex).toBe(2);

    act(() => result.current.goNext()); // no-op — already at REVIEW
    expect(result.current.currentStep).toBe("REVIEW");
  });

  it("goHome navigates to the landing page", async () => {
    vi.mocked(useGetSession).mockReturnValue({ session: fakeSession, isLoading: false, isError: false });
    const { result } = renderHook(() => useWizard());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.goHome());

    expect(navigate).toHaveBeenCalledWith("/");
  });
});
