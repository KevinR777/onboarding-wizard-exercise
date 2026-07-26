import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { ReviewStep } from "./ReviewStep";
import { getSession, getValidationAttempt, goLive } from "../../../../api/sessions";
import type { Session, ValidationAttempt } from "../../../../api/sessions";

vi.mock("../../../../api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../api/sessions")>();
  return { ...actual, getSession: vi.fn(), getValidationAttempt: vi.fn(), goLive: vi.fn() };
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

describe("ReviewStep", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset();
    vi.mocked(getValidationAttempt).mockReset();
    vi.mocked(goLive).mockReset();
    vi.mocked(getSession).mockResolvedValue(fakeSession);
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: validAttempt });
    vi.mocked(goLive).mockResolvedValue({ ...fakeSession, isLive: true });
  });

  it("shows the company name, status, and items for a VALID session", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: validAttempt });
    renderWithProviders(<ReviewStep />);

    expect(await screen.findByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByTestId("review-status")).toHaveTextContent("VALID");
    expect(screen.getByTestId("review-items")).toHaveTextContent("Item One");
    expect(screen.queryByTestId("review-warnings")).not.toBeInTheDocument();
  });

  it("shows items and warnings for a PARTIAL session", async () => {
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: partialAttempt });
    renderWithProviders(<ReviewStep />);

    expect(await screen.findByText("Acme Co")).toBeInTheDocument();
    expect(screen.getByTestId("review-status")).toHaveTextContent("PARTIAL");
    expect(screen.getByTestId("review-items")).toHaveTextContent("Item One");
    expect(screen.getByTestId("review-warnings")).toHaveTextContent("Item Two could not be verified");
  });

  it("clicking Go Live calls the go-live endpoint", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReviewStep />);

    await screen.findByText("Acme Co");
    await user.click(screen.getByTestId("review-go-live-button"));

    expect(goLive).toHaveBeenCalledWith("test-session-id");
  });

  it("shows a toast when going live fails", async () => {
    vi.mocked(goLive).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    renderWithProviders(<ReviewStep />);

    await screen.findByText("Acme Co");
    await user.click(screen.getByTestId("review-go-live-button"));

    expect(await screen.findByTestId("toast-alert")).toHaveTextContent(
      "Failed to go live. Please try again.",
    );
  });

  it("does not block a second click on Go Live while the first request is still in flight", async () => {
    vi.mocked(goLive).mockReturnValue(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    renderWithProviders(<ReviewStep />);

    await screen.findByText("Acme Co");
    await user.click(screen.getByTestId("review-go-live-button"));
    await user.click(screen.getByTestId("review-go-live-button"));

    expect(goLive).toHaveBeenCalledTimes(2);
  });
});
