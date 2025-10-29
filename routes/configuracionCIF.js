const express = require('express');
const configuracionCIFController = require('../controllers/configuracionCIFController');
const router = express.Router();

// Obtener todas las configuraciones CIF
router.get('/', configuracionCIFController.getAllConfiguraciones);

// Crear una configuración CIF
router.post('/', configuracionCIFController.createConfiguracion);

// Actualizar una configuración CIF
router.put('/:id', configuracionCIFController.updateConfiguracion);

// Eliminar una configuración CIF
router.delete('/:id', configuracionCIFController.deleteConfiguracion);

module.exports = router;
