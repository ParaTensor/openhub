import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized in server.ts");
  } catch (error) {
    console.error("Failed to initialize Firebase in server.ts:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gateway registration
  app.post("/api/gateway/register", async (req, res) => {
    const { instance_id, status } = req.body;
    console.log("Gateway registration request:", req.body);
    
    if (db && instance_id) {
      try {
        await setDoc(doc(db, "gateways", instance_id), {
          instance_id,
          status: status || "online",
          last_seen: serverTimestamp()
        }, { merge: true });
        return res.json({ status: "registered" });
      } catch (error) {
        console.error("Failed to register gateway in Firestore:", error);
      }
    }
    
    res.json({ status: "registered (local only)" });
  });

  // Gateway list
  app.get("/api/gateway/list", async (req, res) => {
    if (db) {
      try {
        const q = query(collection(db, "gateways"), orderBy("last_seen", "desc"), limit(100));
        const snapshot = await getDocs(q);
        const gateways = snapshot.docs.map(doc => doc.data());
        return res.json(gateways);
      } catch (error) {
        console.error("Failed to fetch gateways from Firestore:", error);
      }
    }
    
    res.json([
      { instance_id: "gw-1", status: "online" },
      { instance_id: "gw-2", status: "offline" }
    ]);
  });

  // Gateway config sync
  app.get("/api/gateway/config", async (req, res) => {
    // In a real app, we'd fetch this from Firestore
    // For now, return a default config
    res.json({
      providers: [
        { name: "openai", base_url: "https://api.openai.com/v1" },
        { name: "anthropic", base_url: "https://api.anthropic.com/v1" }
      ],
      keys: [
        { provider: "openai", key: "sk-..." }
      ]
    });
  });

  // Gateway usage report
  app.post("/api/gateway/usage", async (req, res) => {
    console.log("Usage reported:", req.body);
    
    if (db) {
      try {
        const { model, tokens, latency, status, user_id } = req.body;
        await addDoc(collection(db, "activity"), {
          model: model || "unknown",
          tokens: tokens || 0,
          latency: latency || 0,
          status: status || 200,
          user_id: user_id || "system",
          timestamp: Date.now() // Use number for easier chart sorting if needed, or serverTimestamp
        });
      } catch (error) {
        console.error("Failed to log activity in Firestore:", error);
      }
    }
    
    res.json({ status: "received" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.join(__dirname, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
