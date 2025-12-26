const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const upload = require('../middleware/upload'); // Importamos Multer

// POST /api/documentos/subir
// 'archivo' es el nombre del campo que debe enviar el Frontend (FormData)
router.post('/subir', upload.single('archivo'), documentoController.subirDocumento);

// GET /api/documentos/paciente/:idPaciente
router.get('/paciente/:idPaciente', documentoController.listarDocumentos);

module.exports = router;