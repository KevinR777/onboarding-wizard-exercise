import { prisma } from "../prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { ValidationAttempt } from "../generated/prisma/client.js";
import { runMockProvider } from "./mockProvider.js";

export const getLatestValidationAttempt = (sessionId: string): Promise<ValidationAttempt | null> =>
  prisma.validationAttempt.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });

const scheduleMockProviderResolution = (attemptId: string, apiKey: string | null) => {
  setTimeout(() => {
    const outcome = runMockProvider(apiKey);
    prisma.validationAttempt
      .update({ where: { id: attemptId }, data: { status: outcome.status, payload: outcome.payload } })
      .catch((error) => {
        console.error(`Failed to resolve validation attempt ${attemptId}:`, error);
      });
  }, 5000);
};

export type TriggerValidationResult = {
  attempt: ValidationAttempt;
  created: boolean;
};

export const triggerValidation = async (sessionId: string): Promise<TriggerValidationResult | null> => {
  const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;

  const latest = await getLatestValidationAttempt(sessionId);
  if (latest && latest.status === "PENDING") {
    return { attempt: latest, created: false };
  }

  try {
    const attempt = await prisma.validationAttempt.create({ data: { sessionId, status: "PENDING" } });
    scheduleMockProviderResolution(attempt.id, session.providerApiKey);
    return { attempt, created: true };
  } catch (error) {
    // Two concurrent requests can both see "no pending attempt" and both reach
    // this create — the partial unique index (`ValidationAttempt_sessionId_pending_key`,
    // WHERE status = 'PENDING', from the original schema-design plan) lets only
    // one INSERT actually succeed; the loser lands here instead of getting a 500.
    // Same idempotent outcome as the pre-check above, just reached via a DB-level
    // conflict instead of a race-prone read-then-write.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await getLatestValidationAttempt(sessionId);
      if (existing) return { attempt: existing, created: false };
    }
    throw error;
  }
};
