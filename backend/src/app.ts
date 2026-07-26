import express from "express";
import cors from "cors";
import type { NextFunction, Request, Response } from "express";
import { sessionsRouter } from "./routes/sessions.js";

export const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/sessions", sessionsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Centralized error handler — must be registered last, and must keep all
// four params (err, req, res, next) even though `next` is unused, since
// that's how Express distinguishes error-handling middleware from regular
// middleware. Catches whatever gets thrown/rejected in any route handler
// (Express 5 auto-forwards rejected async handlers here), so controllers
// stay free of try/catch.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
