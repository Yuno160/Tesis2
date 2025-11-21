const express = require('express');
const router = express.Router();
const expertoController = require('../controllers/expertoController');

/**
 * @route   GET /api/experto/preguntas/:categoria_padre
 * @desc    Obtiene las preguntas del asistente para una categoría
 */
router.get('/preguntas/:categoria_padre', expertoController.getPreguntasPorCategoria);

/**
 * @route   POST /api/experto/evaluar
 * @desc    Envía las respuestas y recibe los códigos sugeridos
 */
router.post('/evaluar', expertoController.evaluarRespuestas);

module.exports = router;