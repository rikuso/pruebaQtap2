require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
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

// — CORS usando array de orígenes
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: allowedOrigins,           // acepta cualquiera de esta lista
  credentials: true,                // para las cookies/credenciales
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','x-api-key','Authorization'],
}));

// — Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// — 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// — Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message });
});

// — Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}`);
});
