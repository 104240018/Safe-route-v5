import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { db, initDb } from "./db.js";
import { aStar } from "./routing/astar.js";
import { initializeGrid } from "./systems/road_network.js";
import { RiskVault } from "./systems/risk_vault.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Risk Zone APIs ---
  app.get("/api/risk-zones", (req, res) => {
    res.json(RiskVault.getAll());
  });

  app.post("/api/risk-zones", (req, res) => {
    res.json(RiskVault.create(req.body));
  });

  app.put("/api/risk-zones/:id", (req, res) => {
    res.json(RiskVault.update(req.params.id, req.body));
  });

  app.delete("/api/risk-zones/:id", (req, res) => {
    res.json(RiskVault.delete(req.params.id));
  });

  app.delete("/api/risk-zones", (req, res) => {
    res.json(RiskVault.deleteAll());
  });

  // --- Routing APIs ---
  app.post("/api/route", (req, res) => {
    const { startId, endId, environment } = req.body;
    const env = environment || { time: 'day', weather: 'clear' };

    const nodes = db.prepare("SELECT * FROM nodes").all() as any[];
    const edges = db.prepare("SELECT * FROM edges").all() as any[];
    const riskZones = RiskVault.getAll() as any[];

    // Calculate both Shortest and Safest Paths
    const shortest = aStar(startId, endId, 0, env, nodes, edges, riskZones);
    const safest = aStar(startId, endId, 50.0, env, nodes, edges, riskZones);

    res.json({ 
      shortestPath: shortest.path, 
      safestPath: safest.path,
      metrics: {
        shortest: shortest.metrics,
        safest: safest.metrics
      }
    });
  });

  // --- Infrastructure APIs ---
  app.get("/api/nodes", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM nodes").all());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/edges", (req, res) => {
    try {
      res.json(db.prepare("SELECT * FROM edges").all());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/init-grid", async (req, res) => {
    const { lat, lng, radius, endLat, endLng } = req.body;
    try {
      const result = await initializeGrid(lat, lng, radius, endLat, endLng);
      res.json(result);
    } catch (error) {
      console.error("Grid initialization error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Internal error" });
    }
  });

  app.delete("/api/nodes", (req, res) => {
    db.prepare("DELETE FROM edges").run();
    db.prepare("DELETE FROM nodes").run();
    res.json({ success: true });
  });

  // --- Static/Production Asset Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAFEROUTE Back-End Layer active on port ${PORT}`);
  });
}

startServer();
