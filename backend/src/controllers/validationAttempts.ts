import type { Request, Response } from "express";
import { triggerValidation, getLatestValidationAttempt } from "../services/validationAttempts.js";

export const triggerValidationHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await triggerValidation(id);

  if (!result) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.status(result.created ? 201 : 200).json(result.attempt);
};

export const getLatestValidationAttemptHandler = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const attempt = await getLatestValidationAttempt(id);

  res.status(200).json({ attempt });
};
