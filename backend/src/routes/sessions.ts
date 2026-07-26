import { Router } from "express";
import {
  createSessionHandler,
  submitDetailsHandler,
  getSessionHandler,
  advanceToReviewHandler,
  goLiveHandler,
} from "../controllers/sessions.js";
import {
  triggerValidationHandler,
  getLatestValidationAttemptHandler,
} from "../controllers/validationAttempts.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", createSessionHandler);
sessionsRouter.post("/:id/details", submitDetailsHandler);
sessionsRouter.get("/:id", getSessionHandler);
sessionsRouter.post("/:id/validate", triggerValidationHandler);
sessionsRouter.get("/:id/validation", getLatestValidationAttemptHandler);
sessionsRouter.post("/:id/advance-to-review", advanceToReviewHandler);
sessionsRouter.post("/:id/go-live", goLiveHandler);
