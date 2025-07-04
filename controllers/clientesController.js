// controllers/clientesController.js

const { db, admin } = require('../services/firebase');
const COLLECTION = 'clientes';

/**
 * Crea o actualiza un cliente en Firestore.
 */
exports.registrarCliente = async ({ uid, nombre, telefono, email = null }) => {
  try {
    if (!uid || !nombre || !telefono) {
      const err = new Error('Faltan datos obligatorios: uid, nombre o telefono');
      err.status = 400;
      throw err;
    }

    const now = admin.firestore.Timestamp.now();
    const docRef = db.collection(COLLECTION).doc(uid);

    const dataToSave = {
      uid,
      nombre,
      telefono,
      email,
      activo: true,
      actualizado: now,
      creado: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(dataToSave, { merge: true });

    return {
      uid,
      nombre,
      telefono,
      email,
      activo: true,
      actualizado: now.toDate().toISOString(),
      creado: now.toDate().toISOString()
    };
  } catch (err) {
    console.error('💥 Error en registrarCliente:', err);
    throw err;
  }
};

/**
 * Obtiene un cliente por UID.
 */
exports.getCliente = async (uid) => {
  try {
    if (!uid) {
      const err = new Error('UID es requerido');
      err.status = 400;
      throw err;
    }

    const doc = await db.collection(COLLECTION).doc(uid).get();
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      ...data,
      actualizado: data.actualizado.toDate().toISOString(),
      creado:      data.creado.toDate().toISOString()
    };
  } catch (err) {
    console.error('💥 Error en getCliente:', err);
    throw err;
  }
};

/**
 * Lista todos los clientes con paginación.
 */
exports.getAllClientes = async ({ limit = 100, startAfter = null } = {}) => {
  try {
    limit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);

    let query = db.collection(COLLECTION)
      .orderBy('actualizado', 'desc')
      .limit(limit);

    if (startAfter) {
      const cursor = new Date(startAfter);
      if (isNaN(cursor)) {
        const err = new Error('startAfter debe ser fecha ISO válida');
        err.status = 400;
        throw err;
      }
      query = query.startAfter(admin.firestore.Timestamp.fromDate(cursor));
    }

    const snapshot = await query.get();
    const clients = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        ...d,
        actualizado: d.actualizado.toDate().toISOString(),
        creado:      d.creado.toDate().toISOString()
      };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc
      ? lastDoc.data().actualizado.toDate().toISOString()
      : null;

    return { data: clients, nextCursor };
  } catch (err) {
    console.error('💥 Error en getAllClientes:', err);
    throw err;
  }
};
