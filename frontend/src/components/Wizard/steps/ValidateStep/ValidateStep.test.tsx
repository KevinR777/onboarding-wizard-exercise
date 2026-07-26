import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { ValidateStep } from "./ValidateStep";
import { getValidationAttempt, triggerValidation, advanceToReview } from "../../../../api/sessions";
import type { ValidationAttempt, Session } from "../../../../api/sessions";

vi.mock("../../../../api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../api/sessions")>();
  return { ...actual, getValidationAttempt: vi.fn(), triggerValidation: vi.fn(), advanceToReview: vi.fn() };
});

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

const alertTitleForStatus: Record<ValidationAttempt["status"], string> = {
  PENDING: "Validating...",
  VALID: "Validation successful",
  PARTIAL: "Validation completed with warnings",
  INVALID: "Validation failed",
  UNAVAILABLE: "Provider unavailable",
};

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

describe("ValidateStep", () => {
  beforeEach(() => {
    vi.mocked(getValidationAttempt).mockReset();
    vi.mocked(triggerValidation).mockReset();
    vi.mocked(triggerValidation).mockResolvedValue(attemptWithStatus("PENDING"));
    vi.mocked(advanceToReview).mockReset();
    vi.mocked(advanceToReview).mockResolvedValue(fakeSession);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-triggers validation when no attempt exists yet", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: null });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await waitFor(() => expect(triggerValidation).toHaveBeenCalledWith("test-session-id"));
  });

  it("does not auto-trigger when an attempt is already PENDING, and shows the loading banner", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("PENDING") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await waitFor(() => expect(getValidationAttempt).toHaveBeenCalled());
    const alert = screen.getByTestId("validate-status-alert");
    expect(alert).toHaveTextContent("Validating...");
    expect(alert).toHaveClass("MuiAlert-colorInfo");
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(triggerValidation).not.toHaveBeenCalled();
  });

  it("does not auto-trigger when an attempt is already resolved", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("VALID") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation successful");
    expect(triggerValidation).not.toHaveBeenCalled();
  });

  it("shows a green success Alert with the items found for VALID", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("VALID") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation successful");
    const alert = screen.getByTestId("validate-status-alert");
    expect(alert).toHaveClass("MuiAlert-colorSuccess");
    expect(alert).toHaveTextContent("Item One");
  });

  it("shows a yellow warning Alert with the items and warnings for PARTIAL", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("PARTIAL") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation completed with warnings");
    const alert = screen.getByTestId("validate-status-alert");
    expect(alert).toHaveClass("MuiAlert-colorWarning");
    expect(alert).toHaveTextContent("Item One");
    expect(alert).toHaveTextContent("Item Two could not be verified");
  });

  it("shows a red error Alert with the reason for INVALID", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("INVALID") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation failed");
    const alert = screen.getByTestId("validate-status-alert");
    expect(alert).toHaveClass("MuiAlert-colorError");
    expect(alert).toHaveTextContent("The provided API key was rejected.");
  });

  it("shows a neutral Alert indicating it's safe to retry for UNAVAILABLE", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("UNAVAILABLE") });
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Provider unavailable");
    const alert = screen.getByTestId("validate-status-alert");
    expect(alert).toHaveClass("MuiAlert-colorInfo");
    expect(alert).toHaveTextContent("safe to retry");
  });

  it.each(["PENDING", "INVALID", "UNAVAILABLE"] as const)(
    "blocks Next with a toast when status is %s",
    async (status) => {
      vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus(status) });
      const onNext = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<ValidateStep onNext={onNext} />);

      await screen.findByText(alertTitleForStatus[status]);
      await user.click(screen.getByTestId("validate-next-button"));

      expect(await screen.findByTestId("toast-alert")).toHaveTextContent(
        "Please complete validation before continuing.",
      );
      expect(advanceToReview).not.toHaveBeenCalled();
      expect(onNext).not.toHaveBeenCalled();
    },
  );

  it.each(["VALID", "PARTIAL"] as const)("advances on Next when status is %s", async (status) => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus(status) });
    const onNext = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ValidateStep onNext={onNext} />);

    await screen.findByText(alertTitleForStatus[status]);
    await user.click(screen.getByTestId("validate-next-button"));

    expect(advanceToReview).toHaveBeenCalledWith("test-session-id");
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("shows a toast and does not advance when advanceToReview fails on Next", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("VALID") });
    vi.mocked(advanceToReview).mockRejectedValue(new Error("network error"));
    const onNext = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<ValidateStep onNext={onNext} />);

    await screen.findByText("Validation successful");
    await user.click(screen.getByTestId("validate-next-button"));

    expect(await screen.findByTestId("toast-alert")).toHaveTextContent(
      "Failed to advance to Review. Please try again.",
    );
    expect(onNext).not.toHaveBeenCalled();
  });

  it("clicking Retry calls POST /sessions/:id/validate regardless of current status", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("INVALID") });
    const user = userEvent.setup();
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation failed");
    await user.click(screen.getByTestId("validate-retry-button"));

    expect(triggerValidation).toHaveBeenCalledWith("test-session-id");
  });

  it("does not block a second click on Retry while the first request is still in flight", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: attemptWithStatus("INVALID") });
    vi.mocked(triggerValidation).mockReturnValue(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validation failed");
    await user.click(screen.getByTestId("validate-retry-button"));
    await user.click(screen.getByTestId("validate-retry-button"));

    expect(triggerValidation).toHaveBeenCalledTimes(2);
  });

  it("polls every second while PENDING and stops once resolved", async () => {
    vi.mocked(getValidationAttempt)
      .mockResolvedValueOnce({ attempt: attemptWithStatus("PENDING") })
      .mockResolvedValue({ attempt: attemptWithStatus("VALID") });

    renderWithProviders(<ValidateStep onNext={vi.fn()} />);

    await screen.findByText("Validating...");
    expect(getValidationAttempt).toHaveBeenCalledTimes(1);

    await screen.findByText("Validation successful", {}, { timeout: 3000 });
    expect(vi.mocked(getValidationAttempt).mock.calls.length).toBeGreaterThanOrEqual(2);

    const callsAfterResolved = vi.mocked(getValidationAttempt).mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(getValidationAttempt).toHaveBeenCalledTimes(callsAfterResolved); // polling stopped once resolved
  });
});
