const express = require('express');
const router = express.Router();
const { generarCarnetPdf } = require('../controllers/carnetController');

/**
 * @route   GET /api/carnet/pdf/:id_paciente
 * @desc    Genera y devuelve un PDF del carnet del paciente
 */
router.get('/pdf/:id_paciente', generarCarnetPdf);

module.exports = router;