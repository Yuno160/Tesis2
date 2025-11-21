const express = require('express');
const router = express.Router();

// Importamos las funciones del controlador
const { getCifTree, getChildrenByParentCode } = require('../controllers/cifCodeController');

/**
 * @route   GET /api/cif-codes/tree
 * @desc    Obtiene toda la jerarquía de códigos CIF
 * @access  Public (o Private, según tu auth)
 */
router.get('/tree', getCifTree);

/**
 * @route   GET /api/cif-codes/children/:parent_code
 * @desc    Obtiene los hijos directos de un código padre
 */
router.get('/tree/children/:parent_code', getChildrenByParentCode);


module.exports = router;