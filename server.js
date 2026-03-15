require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───
app.use(morgan('combined'));
app.use(compression());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.static("./"))

// // ─── Static Files ───
// app.use(express.static(path.join(__dirname, 'public'), {
//   maxAge: '7d',
//   etag: true,
// }));

// ─── Routes ───
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// ─── Start Server ───
app.listen(PORT, () => {
  console.log(`\n  🏠 Ashiyanaa Constructions Server`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  → Running on http://localhost:${PORT}`);
  console.log(`  → Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
