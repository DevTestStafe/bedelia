import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { appRouter } from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

app.use("/api", appRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, "../public");
const webIndexPath = path.join(webDistPath, "index.html");

if (fs.existsSync(webIndexPath)) {
  app.use(express.static(webDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path === "/healthz") {
      return next();
    }

    return res.sendFile(webIndexPath);
  });
} else {
  app.get("/", (_req, res) => {
    res.json({
      service: "Bedelia ISEF API",
      status: "running",
      version: "1.0.0",
      documentation: "/api/health"
    });
  });
}

const host = "0.0.0.0";
const server = app.listen(env.PORT, host, () => {
  const address = server.address();
  console.log(`API Bedelía ISEF escuchando en puerto ${env.PORT}`);
  console.log(`Bind address: ${typeof address === "string" ? address : `${address?.address}:${address?.port}`}`);
  console.log(`process.env.PORT: ${process.env.PORT ?? "undefined"}`);
});
