import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    service: "bedelia-isef-api",
    status: "ok",
    at: new Date().toISOString()
  });
});
