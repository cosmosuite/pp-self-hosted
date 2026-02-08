import "dotenv/config";
import express from "express";
import cors from "cors";
import { detectRouter } from "./routes/detect";
import { healthRouter } from "./routes/health";
import { labelsRouter } from "./routes/labels";
import { creditsRouter } from "./routes/credits";
import { historyRouter } from "./routes/history";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      // Also allow if wildcard
      if (allowedOrigins.includes("*")) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// JSON body parsing (for base64 endpoint)
app.use(express.json({ limit: "50mb" }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/v1", detectRouter);
app.use("/api/v1", healthRouter);
app.use("/api/v1", labelsRouter);
app.use("/api/v1", creditsRouter);
app.use("/api/v1", historyRouter);

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SafeVision Middleware running on port ${PORT}`);
});

export default app;
