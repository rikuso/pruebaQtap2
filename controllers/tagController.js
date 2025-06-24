// controllers/tagController.js

const { db, admin } = require('../services/firebase');
const COLLECTION = 'uids';

/**
 * Convierte un valor Timestamp o Date válido a string ISO.
 */
function toISOString(value) {
  try {
    if (value && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

/**
 * Guarda o actualiza un UID en Firestore dentro de una transacción.
 * - Crea documento si no existe.
 * - Si existe, incrementa token y agrega nuevo historial.
 */
async function saveUID(data) {
  const { uid, url, deviceId, scanType, location = null } = data;

  if (!uid || !url || !deviceId || !scanType) {
    const err = new Error('Faltan datos obligatorios: uid, url, deviceId o scanType');
    err.status = 400;
    throw err;
  }

  const now = admin.firestore.Timestamp.now();
  const docRef = db.collection(COLLECTION).doc(uid);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    const entry = {
      timestamp: now,
      deviceId,
      scanType,
      location,
    };

    if (!snapshot.exists) {
      tx.set(docRef, {
        uid,
        urlAccedida: url,
        token: 1,
        firstSeen: now,
        lastSeen: now,
        historial: [entry],
        lastDevice: deviceId,
        lastScanType: scanType,
        lastLocation: location,
      });
    } else {
      tx.update(docRef, {
        token: admin.firestore.FieldValue.increment(1),
        urlAccedida: url,
        lastSeen: now,
        historial: admin.firestore.FieldValue.arrayUnion(entry),
        lastDevice: deviceId,
        lastScanType: scanType,
        lastLocation: location,
      });
    }
  });

  return { uid };
}

/**
 * Recupera un listado de UIDs paginados.
 */
async function getAllUIDs({ limit = 100, startAfter = null } = {}) {
  let query = db
    .collection(COLLECTION)
    .orderBy('lastSeen', 'desc')
    .limit(limit);

  if (startAfter) {
    try {
      const cursor = admin.firestore.Timestamp.fromDate(new Date(startAfter));
      query = query.startAfter(cursor);
    } catch (e) {
      throw new Error('Formato de startAfter inválido');
    }
  }

  const snapshot = await query.get();
  const docs = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      uid: doc.id,
      urlAccedida: data.urlAccedida,
      token: data.token,
      firstSeen: toISOString(data.firstSeen),
      lastSeen: toISOString(data.lastSeen),
      historial: (data.historial || []).map(item => ({
        ...item,
        timestamp: toISOString(item.timestamp),
      })),
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc ? toISOString(lastDoc.data().lastSeen) : null;

  return { data: docs, nextCursor };
}

/**
 * Obtiene un documento específico por UID.
 */
async function getUID(uid) {
  if (!uid) {
    const err = new Error('UID es requerido');
    err.status = 400;
    throw err;
  }

  const docRef = db.collection(COLLECTION).doc(uid);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    const err = new Error('UID no encontrado');
    err.status = 404;
    throw err;
  }

  const data = snapshot.data();

  return {
    uid: snapshot.id,
    urlAccedida: data.urlAccedida,
    token: data.token,
    firstSeen: toISOString(data.firstSeen),
    lastSeen: toISOString(data.lastSeen),
    historial: (data.historial || []).map(item => ({
      ...item,
      timestamp: toISOString(item.timestamp),
    })),
    lastDevice: data.lastDevice,
    lastScanType: data.lastScanType,
    lastLocation: data.lastLocation,
  };
}

module.exports = {
  saveUID,
  getUID,
  getAllUIDs,
};
