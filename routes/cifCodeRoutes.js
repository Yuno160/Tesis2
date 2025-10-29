const express = require('express');
const router = express.Router();

// Importamos las funciones del controlador
const { getCifTree } = require('../controllers/cifCodeController');

/**
 * @route   GET /api/cif-codes/tree
 * @desc    Obtiene toda la jerarquía de códigos CIF
 * @access  Public (o Private, según tu auth)
 */
router.get('/tree', getCifTree);

// Aquí definirías las otras rutas para este modelo
// router.post('/', createCifCode);
// router.put('/:id', updateCifCode);

module.exports = router;