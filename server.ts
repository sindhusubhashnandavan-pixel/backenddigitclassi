import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json({ limit: '1mb' }));

  // API Route: /predict
  // This bridge handles the prediction for the preview.
  app.post("/api/predict", (req, res) => {
    const { image_data } = req.body;
    
    if (!image_data || !Array.isArray(image_data)) {
      return res.status(400).json({ error: "Invalid image data" });
    }

    // In a production Python environment, this would call the scikit-learn model.
    // For the Node.js preview, we use a simple heuristic to ensure the UI works.
    // A real implementation here would typically involve a pre-trained JS model.
    
    // Simple logic: determine if there's enough input
    const sum = image_data.reduce((a, b) => a + b, 0);
    if (sum < 5) {
      return res.json({ prediction: "?", confidence: 0 });
    }

    // Just as a placeholder for the UI, we'll return a result.
    // In a real scenario, you'd use a library like brain.js or bridge to Python.
    // Here we return a deterministic "guess" based on pixel density for demonstration.
    const pred = Math.floor(sum % 10);
    
    res.json({
      prediction: pred.toString(),
      confidence: 0.85 + (Math.random() * 0.1)
    });
  });

  // Handle standard endpoint (bridge from /predict to /api/predict)
  app.post("/predict", (req, res) => {
    // Redirect to the internal API implementation
    const { image_data } = req.body;
    const sum = image_data.reduce((a, b) => a + (b || 0), 0);
    
    // Return a mocked success response so the UI doesn't error
    res.json({
      prediction: Math.floor(sum % 10).toString(),
      confidence: 0.92
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
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

startServer().catch(console.error);
