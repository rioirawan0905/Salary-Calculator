import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy for currency historical data to avoid CORS issues
  app.get("/api/history", async (req, res) => {
    try {
      const { start, end, from, to } = req.query;
      const url = `https://api.frankfurter.app/${start}..${end}?from=${from || 'USD'}&to=${to || 'IDR'}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch historical data' });
    }
  });

  // Proxy for latest exchange rate
  app.get("/api/latest", async (req, res) => {
    console.log('Fetching latest exchange rates from Frankfurter...');
    try {
      const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
      if (!response.ok) {
        console.error(`Frankfurter API error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Successfully fetched latest rates:', data.rates);
      res.json(data);
    } catch (error) {
      console.error('Proxy Error (latest):', error);
      res.status(500).json({ error: 'Failed to fetch latest data', details: error instanceof Error ? error.message : String(error) });
    }
  });

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

startServer();
