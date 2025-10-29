// routes/preguntaRoutes.js
const express = require('express');
const router = express.Router();
const preguntaController = require('../controllers/preguntaController');

// Endpoint para obtener todas las preguntas
router.get('/pregunta', preguntaController.obtenerPreguntas);

module.exports = router;