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
    console.log('Fetching latest exchange rates...');
    try {
      // Primary: Open er-api (Supports DZD and IDR)
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await resp.json();
      
      if (data.result === 'success') {
        return res.json({
          rates: {
            IDR: data.rates.IDR,
            DZD: data.rates.DZD,
            EUR: data.rates.EUR
          },
          provider: 'open-er-api'
        });
      }
      throw new Error('Fallback to Frankfurter');
    } catch (error) {
      try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR');
        if (response.ok) {
          const data = await response.json();
          return res.json({ ...data, provider: 'frankfurter' });
        }
        throw new Error('Frankfurter failed');
      } catch (fallbackError) {
        res.status(500).json({ error: 'Failed to fetch latest data' });
      }
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
