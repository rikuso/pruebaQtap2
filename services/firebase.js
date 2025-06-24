// services/firebase.js
require('dotenv').config();
const admin = require('firebase-admin');

const b64 = process.env.FIREBASE_CONFIG_BASE64;
if (!b64) {
  console.error('❌ Falta FIREBASE_CONFIG_BASE64');
  process.exit(1);
}

let serviceAccount;
try {
  const json = Buffer.from(b64, 'base64').toString('utf8');
  serviceAccount = JSON.parse(json);
} catch (err) {
  console.error('❌ Error parseando FIREBASE_CONFIG_BASE64:', err);
  process.exit(1);
}

console.log('✅ Firebase project_id:', serviceAccount.project_id);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

module.exports = {
  db: admin.firestore(),
  FieldValue: admin.firestore.FieldValue,
  admin
};
