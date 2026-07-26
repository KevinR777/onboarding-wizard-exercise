import { prisma } from "../prisma.js";
import type { OnboardingSession } from "../generated/prisma/client.js";
import { getLatestValidationAttempt } from "./validationAttempts.js";

export const createSession = (): Promise<OnboardingSession> =>
  prisma.onboardingSession.create({ data: {} });

export type SubmitDetailsInput = {
  companyName: string;
  providerAccountId: string;
  providerApiKey: string;
};

export const submitDetails = async (
  id: string,
  input: SubmitDetailsInput,
): Promise<OnboardingSession | null> => {
  const session = await prisma.onboardingSession.findUnique({ where: { id } });
  if (!session) return null;

  await prisma.onboardingSession.updateMany({
    where: { id, currentStep: "DETAILS" },
    data: { ...input, currentStep: "VALIDATE" },
  });

  return prisma.onboardingSession.findUniqueOrThrow({ where: { id } });
};

export const getSession = (id: string): Promise<OnboardingSession | null> =>
  prisma.onboardingSession.findUnique({ where: { id } });

export type AdvanceToReviewResult =
  | { type: "not_found" }
  | { type: "invalid" }
  | { type: "ok"; session: OnboardingSession };

export const advanceToReview = async (id: string): Promise<AdvanceToReviewResult> => {
  const session = await prisma.onboardingSession.findUnique({ where: { id } });
  if (!session) return { type: "not_found" };

  const latest = await getLatestValidationAttempt(id);
  if (!latest || (latest.status !== "VALID" && latest.status !== "PARTIAL")) {
    return { type: "invalid" };
  }

  await prisma.onboardingSession.updateMany({
    where: { id, currentStep: "VALIDATE" },
    data: { currentStep: "REVIEW" },
  });

  return { type: "ok", session: await prisma.onboardingSession.findUniqueOrThrow({ where: { id } }) };
};

export type GoLiveResult =
  | { type: "not_found" }
  | { type: "invalid" }
  | { type: "ok"; session: OnboardingSession };

export const goLive = async (id: string): Promise<GoLiveResult> => {
  const session = await prisma.onboardingSession.findUnique({ where: { id } });
  if (!session) return { type: "not_found" };

  if (session.currentStep !== "REVIEW") {
    return { type: "invalid" };
  }

  await prisma.onboardingSession.updateMany({
    where: { id, isLive: false },
    data: { isLive: true },
  });

  return { type: "ok", session: await prisma.onboardingSession.findUniqueOrThrow({ where: { id } }) };
};
