const express = require('express');
const profesionalController = require('../controllers/profesionalController');
const router = express.Router();

// Ruta para listar todos los profesionales
router.get('/', profesionalController.getAllProfesionales);

// Ruta para agregar un nuevo profesional
router.post('/', profesionalController.createProfesional);

// Ruta para actualizar un profesional por id
router.put('/:id', profesionalController.updateProfesional);

// Ruta para eliminar un profesional por id
router.delete('/:id', profesionalController.deleteProfesional);

module.exports = router;
