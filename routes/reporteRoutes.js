const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

// (Cuando tengamos roles, aquí irá el middleware de autenticación)
// const { authRequired } = require('../middlewares/validateToken.js');

router.get('/paciente/:id', reportesController.generarReportePaciente);
router.get('/total', reportesController.generarReporteTotal);
router.get('/calificaciones/diario', reportesController.generarReporteDiario);
router.get('/calificaciones/mensual/:mes', reportesController.generarReporteMensual);
router.get('/calificaciones/rango/:inicio/:fin', reportesController.generarReporteRango);

module.exports = router;