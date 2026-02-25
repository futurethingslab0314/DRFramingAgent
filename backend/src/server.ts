// ═══════════════════════════════════════════════════════════════
// Express server — FramingConstellationBot backend
// ═══════════════════════════════════════════════════════════════

import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import zoteroRoutes from "./routes/zotero.js";
import keywordRoutes from "./routes/keywords.js";
import framingRoutes from "./routes/framing.js";
import graphRoutes from "./routes/graph.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Middleware ──────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── API Routes ─────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/zotero", zoteroRoutes);
app.use("/api/keywords", keywordRoutes);
app.use("/api/framing", framingRoutes);
app.use("/api/graph", graphRoutes);

// ─── Serve Frontend (production) ────────────────────────────

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// SPA fallback: any non-API route returns index.html
app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

// ─── Start ──────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`🚀 FramingConstellationBot backend running on port ${PORT}`);
});

export default app;
