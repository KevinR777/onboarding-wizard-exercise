import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../../test/renderWithProviders";
import { DetailsStep } from "./DetailsStep";
import { getSession, submitDetails } from "../../../../api/sessions";
import type { Session } from "../../../../api/sessions";

vi.mock("../../../../api/sessions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../api/sessions")>();
  return { ...actual, submitDetails: vi.fn(), getSession: vi.fn() };
});

const blankSession: Session = {
  id: "test-session-id",
  currentStep: "DETAILS",
  companyName: null,
  providerAccountId: null,
  providerApiKey: null,
  isLive: false,
  createdAt: "",
  updatedAt: "",
};

const fakeSession: Session = {
  ...blankSession,
  currentStep: "VALIDATE",
  companyName: "Acme Co",
  providerAccountId: "acc_123",
  providerApiKey: "key_abc",
};

const fillAllFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Company Name"), "Acme Co");
  await user.type(screen.getByLabelText("Account Id"), "acc_123");
  await user.type(screen.getByLabelText("Api Key"), "key_abc");
};

describe("DetailsStep", () => {
  beforeEach(() => {
    vi.mocked(submitDetails).mockReset();
    vi.mocked(getSession).mockReset();
    vi.mocked(getSession).mockResolvedValue(blankSession);
  });

  it("shows the three labeled fields and the Next button", () => {
    renderWithProviders(<DetailsStep onNext={vi.fn()} />);
    expect(screen.getByLabelText("Company Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Account Id")).toBeInTheDocument();
    expect(screen.getByLabelText("Api Key")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("keeps Next enabled with empty fields — disable logic exists but isn't wired up yet", () => {
    renderWithProviders(<DetailsStep onNext={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("shows an error toast and does not advance when Next is clicked with empty fields", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithProviders(<DetailsStep onNext={onNext} />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByTestId("toast-alert")).toHaveTextContent(
      "Please fill in all fields before continuing.",
    );
    expect(submitDetails).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls onNext when all fields are filled in and Next is clicked", async () => {
    vi.mocked(submitDetails).mockResolvedValue(fakeSession);
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithProviders(<DetailsStep onNext={onNext} />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(onNext).toHaveBeenCalledOnce());
    expect(submitDetails).toHaveBeenCalledWith("test-session-id", {
      companyName: "Acme Co",
      providerAccountId: "acc_123",
      providerApiKey: "key_abc",
    });
  });

  it("shows an error toast, does not advance, and keeps the entered values when the request fails", async () => {
    vi.mocked(submitDetails).mockRejectedValue(new Error("network error"));
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithProviders(<DetailsStep onNext={onNext} />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByTestId("toast-alert")).toHaveTextContent(
      "Failed to save details. Please try again.",
    );
    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Company Name")).toHaveValue("Acme Co");
    expect(screen.getByLabelText("Account Id")).toHaveValue("acc_123");
    expect(screen.getByLabelText("Api Key")).toHaveValue("key_abc");
  });

  it("does not block a second click while the first request is still in flight", async () => {
    vi.mocked(submitDetails).mockReturnValue(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    renderWithProviders(<DetailsStep onNext={vi.fn()} />);

    await fillAllFields(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(submitDetails).toHaveBeenCalledTimes(2);
  });

  it("pre-fills fields from the loaded session when it already has Details data", async () => {
    vi.mocked(getSession).mockResolvedValue(fakeSession);
    renderWithProviders(<DetailsStep onNext={vi.fn()} />);

    await waitFor(() => expect(screen.getByLabelText("Company Name")).toHaveValue("Acme Co"));
    expect(screen.getByLabelText("Account Id")).toHaveValue("acc_123");
    expect(screen.getByLabelText("Api Key")).toHaveValue("key_abc");
  });
});
