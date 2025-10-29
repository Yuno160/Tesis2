const express = require('express');
const calificacionController = require('../controllers/calificacionController');
const router = express.Router();

// Endpoint para calificar paciente
router.post('/', calificacionController.crearCalificacion);
router.get('/paciente/:id_paciente', calificacionController.getCalificacionPorPaciente);

module.exports = router;