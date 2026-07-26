import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { Wizard } from "./Wizard";
import {
  getSession,
  submitDetails,
  getValidationAttempt,
  triggerValidation,
  advanceToReview,
  goLive,
} from "../../api/sessions";
import type { Session } from "../../api/sessions";

vi.mock("../../api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/sessions")>();
  return {
    ...actual,
    submitDetails: vi.fn(),
    getSession: vi.fn(),
    getValidationAttempt: vi.fn(),
    triggerValidation: vi.fn(),
    advanceToReview: vi.fn(),
    goLive: vi.fn(),
  };
});

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

describe("Wizard", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset();
    vi.mocked(submitDetails).mockReset();
    vi.mocked(getValidationAttempt).mockReset();
    vi.mocked(triggerValidation).mockReset();
    vi.mocked(advanceToReview).mockReset();
    vi.mocked(goLive).mockReset();
    vi.mocked(getSession).mockResolvedValue(fakeSession);
    vi.mocked(getValidationAttempt).mockResolvedValue({ attempt: null });
    vi.mocked(triggerValidation).mockReturnValue(new Promise(() => {})); // never resolves — keep Validate on PENDING
  });

  it("shows a loading state before the session has loaded", () => {
    vi.mocked(getSession).mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(<Wizard />);
    expect(screen.getByTestId("wizard-loading")).toBeInTheDocument();
  });

  it("renders the Details step first, with Validate/Review not yet mounted", async () => {
    renderWithProviders(<Wizard />);
    expect(await screen.findByTestId("details-company-name-input")).toBeInTheDocument();
    expect(screen.queryByTestId("validate-step")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("wizard-step-details")).getByText("Details")).toHaveClass(
      "Mui-active",
    );
  });

  it("resumes at Validate when the session's persisted currentStep is VALIDATE", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...fakeSession, currentStep: "VALIDATE" });
    renderWithProviders(<Wizard />);

    expect(await screen.findByTestId("validate-step")).toBeInTheDocument();
    expect(within(screen.getByTestId("wizard-step-validate")).getByText("Validate")).toHaveClass(
      "Mui-active",
    );
  });

  it("shows the live screen instead of wizard steps when the session is live", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...fakeSession, isLive: true });
    renderWithProviders(<Wizard />);

    expect(await screen.findByTestId("live-screen")).toBeInTheDocument();
    expect(screen.queryByTestId("wizard-stepper")).not.toBeInTheDocument();
  });

  it("advances to Validate, both in content and in the Stepper, after completing Details", async () => {
    vi.mocked(submitDetails).mockResolvedValue({ ...fakeSession, currentStep: "VALIDATE" });
    const user = userEvent.setup();
    renderWithProviders(<Wizard />);

    await screen.findByTestId("details-company-name-input");
    await user.type(screen.getByLabelText("Company Name"), "Acme Co");
    await user.type(screen.getByLabelText("Account Id"), "acc_123");
    await user.type(screen.getByLabelText("Api Key"), "key_abc");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByTestId("validate-step")).toBeInTheDocument();
    expect(screen.queryByTestId("details-company-name-input")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("wizard-step-validate")).getByText("Validate")).toHaveClass(
      "Mui-active",
    );
  });

  it("shows the Live Screen after going live from the Review step", async () => {
    vi.mocked(getSession)
      .mockResolvedValueOnce({ ...fakeSession, currentStep: "REVIEW" })
      .mockResolvedValue({ ...fakeSession, currentStep: "REVIEW", isLive: true });
    vi.mocked(goLive).mockResolvedValue({ ...fakeSession, currentStep: "REVIEW", isLive: true });
    const user = userEvent.setup();
    renderWithProviders(<Wizard />);

    await screen.findByTestId("review-step");
    await user.click(screen.getByTestId("review-go-live-button"));

    expect(await screen.findByTestId("live-screen")).toBeInTheDocument();
  });

  it("shows a Home button that navigates away from the wizard when clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Wizard />);

    await screen.findByTestId("details-company-name-input");
    await user.click(screen.getByTestId("wizard-home-button"));

    expect(screen.queryByTestId("wizard-card")).not.toBeInTheDocument();
  });
});
