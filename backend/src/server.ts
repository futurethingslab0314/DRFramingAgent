// ═══════════════════════════════════════════════════════════════
// Express server — FramingConstellationBot backend
// ═══════════════════════════════════════════════════════════════

import "dotenv/config";
import express from "express";
import cors from "cors";

import zoteroRoutes from "./routes/zotero.js";
import keywordRoutes from "./routes/keywords.js";
import framingRoutes from "./routes/framing.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// ─── Middleware ──────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── Routes ─────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/zotero", zoteroRoutes);
app.use("/api/keywords", keywordRoutes);
app.use("/api/framing", framingRoutes);

// ─── Start ──────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`🚀 FramingConstellationBot backend running on port ${PORT}`);
});

export default app;
