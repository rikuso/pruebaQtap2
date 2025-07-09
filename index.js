require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const NodeCache    = require('node-cache');

const tagRoutes           = require('./routes/tagRoutes');
const eventRoutes         = require('./routes/eventRoutes');
const statsRoutes         = require('./routes/statsRoutes');
const userRoutes          = require('./routes/userRoutes');
const clientesRoutes      = require('./routes/clientesRoutes');
const advancedStatsRoutes = require('./routes/advancedStatsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// — Cache en memoria
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
app.set('cache', cache);

// — Seguridad
app.use(helmet({ contentSecurityPolicy: false }));

// — Rate limit
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// — CORS manual dinámico para todas las rutas y métodos
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Refleja el origen solicitado o usa '*' si no viene
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,x-api-key,Authorization');
  if (req.method === 'OPTIONS') {
    // Preflight
    return res.sendStatus(204);
  }
  next();
});

// — Middlewares de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// — Logging en dev
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// — Rutas
app.use('/api/v1/tags',           tagRoutes);
app.use('/api/v1/events',         eventRoutes);
app.use('/api/v1/stats',          statsRoutes);
app.use('/api/v1/users',          userRoutes);
app.use('/api/v1/clientes',       clientesRoutes);
app.use('/api/v1/advanced-stats', advancedStatsRoutes);

// — 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// — Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500
  });
  res.status(err.status || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});


// — Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}`);
});
