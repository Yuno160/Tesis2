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
//pasteles
router.get('/zonas', reportesController.generarReporteZonas);
router.get('/areas', reportesController.generarReporteAreas);
router.get('/productividad', reportesController.generarReporteProductividad);
router.get('/niveles', reportesController.generarReporteNiveles);
router.get('/vencimientos', reportesController.generarReporteVencimientos);
router.get('/productividad', reportesController.generarReporteProductividadPastel);
router.get('/reporte-cif/:id', reportesController.generarReporteCIF);

module.exports = router;