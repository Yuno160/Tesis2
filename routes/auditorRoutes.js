// routes/auditorRoutes.js
const express = require('express');
const router = express.Router();
const auditorController = require('../controllers/auditorController');
const multer = require('multer');

// --- CONFIGURACIÓN DE CARGA (MULTER) ---
// Guardamos el archivo en la memoria RAM temporalmente para pasarlo rápido a la IA
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- LA RUTA ---
// Cuando alguien llame a esta ruta, primero 'upload' atrapa el archivo llamado 'documento'
// y luego el controller lo analiza.

router.post('/analizar-expediente', upload.array('archivos', 5), auditorController.analizarDocumento);

module.exports = router;