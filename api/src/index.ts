import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { appRouter } from "./routes/index.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req, res) => {
  res.status(200).send("ok");
});

// Ruta raíz para verificar que la API está funcionando
app.get("/", (_req, res) => {
  res.json({
    service: "Bedelia ISEF API",
    status: "running",
    version: "1.0.0",
    documentation: "/api/health"
  });
});

app.use("/api", appRouter);

const host = "0.0.0.0";
const server = app.listen(env.PORT, host, () => {
  const address = server.address();
  console.log(`API Bedelía ISEF escuchando en puerto ${env.PORT}`);
  console.log(`Bind address: ${typeof address === "string" ? address : `${address?.address}:${address?.port}`}`);
  console.log(`process.env.PORT: ${process.env.PORT ?? "undefined"}`);
});
