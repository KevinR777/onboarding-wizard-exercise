import type { Request, Response } from "express";
import { createSession, submitDetails, getSession, advanceToReview, goLive } from "../services/sessions.js";

export const createSessionHandler = async (_req: Request, res: Response) => {
  const session = await createSession();
  res.status(201).json(session);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

export const submitDetailsHandler = async (req: Request, res: Response) => {
  // Express types req.params values as `string | string[]` in general (some
  // route patterns can capture repeated segments), but for this route's
  // single `:id` segment it's always a plain string at runtime.
  const { id } = req.params as { id: string };
  const { companyName, providerAccountId, providerApiKey } = req.body as Record<string, unknown>;

  if (
    !isNonEmptyString(companyName) ||
    !isNonEmptyString(providerAccountId) ||
    !isNonEmptyString(providerApiKey)
  ) {
    res.status(400).json({ error: "companyName, providerAccountId, and providerApiKey are all required" });
    return;
  }

  const session = await submitDetails(id, { companyName, providerAccountId, providerApiKey });

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.status(200).json(session);
};

export const getSessionHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const session = await getSession(id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.status(200).json(session);
};

export const advanceToReviewHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await advanceToReview(id);

  if (result.type === "not_found") {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (result.type === "invalid") {
    res.status(400).json({ error: "Validation must be VALID or PARTIAL before advancing to Review" });
    return;
  }

  res.status(200).json(result.session);
};

export const goLiveHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await goLive(id);

  if (result.type === "not_found") {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (result.type === "invalid") {
    res.status(400).json({ error: "Session must be on the Review step before going live" });
    return;
  }

  res.status(200).json(result.session);
};
