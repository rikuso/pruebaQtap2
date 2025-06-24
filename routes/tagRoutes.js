// routes/tagRoutes.js

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const rateLimiter = require('../middleware/rateLimiter');
const tagController = require('../controllers/tagController');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const router = express.Router();

// Validación de errores
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * POST /api/v1/tags
 * Body: { uid, url, deviceId, scanType }
 */
router.post(
  '/',
  apiKeyAuth,
  rateLimiter,
  body('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 28 }).withMessage('UID debe tener entre 4 y 28 caracteres hexadecimales'),
  body('url').isURL().withMessage('URL inválida'),
  body('deviceId').isString().notEmpty().withMessage('deviceId requerido'),
  body('scanType').isIn(['nfc', 'qr', 'rfid', 'ble']).withMessage('scanType inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.body;
    const appCache = req.app.get('cache') || cache;

    // Evitar procesar el mismo UID múltiples veces en corto tiempo
    if (appCache.has(uid)) {
      return res.status(200).json({ message: 'UID repetido (caché)', cached: true });
    }

    console.log(`📥 UID recibido: ${uid}`);

    const saved = await tagController.saveUID(req.body);
    appCache.set(uid, true, 2); // Evitar relectura inmediata (TTL 2s)

    return res.status(201).json({ message: 'UID procesado', data: saved });
  })
);

/**
 * GET /api/v1/tags/:uid
 */
router.get(
  '/:uid',
  apiKeyAuth,
  rateLimiter,
  param('uid')
    .isHexadecimal().withMessage('UID debe ser hexadecimal')
    .isLength({ min: 4, max: 28 }).withMessage('UID debe tener entre 4 y 28 caracteres hexadecimales'),
  validate,
  asyncHandler(async (req, res) => {
    const { uid } = req.params;
    const appCache = req.app.get('cache') || cache;

    if (appCache.has(`tag_${uid}`)) {
      const cached = appCache.get(`tag_${uid}`);
      return res.status(200).json({ message: 'Desde caché', data: cached });
    }

    const tag = await tagController.getUID(uid);
    if (!tag) {
      return res.status(404).json({ error: 'UID no encontrado' });
    }

    appCache.set(`tag_${uid}`, tag, 120); // TTL 2 minutos
    return res.status(200).json({ data: tag });
  })
);

/**
 * GET /api/v1/tags
 * Query: ?limit=50&startAfter=<ISO timestamp>
 */
router.get(
  '/',
  apiKeyAuth,
  rateLimiter,
  asyncHandler(async (req, res) => {
    const { limit = 100, startAfter } = req.query;
    const tags = await tagController.getAllUIDs({ limit, startAfter });
    return res.status(200).json({ data: tags });
  })
);

module.exports = router;
