import express from 'express';
import cors from 'cors';
import storesRouter from './routes/stores.js';
import mapboxRouter from './routes/mapbox.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());

app.use('/api/stores', storesRouter);
app.use('/api/mapbox', mapboxRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
