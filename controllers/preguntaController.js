const Pregunta = require('../models/pregunta');

exports.obtenerPreguntas = async (req, res, next) => {
    try {
        const [preguntas] = await Pregunta.obtenerTodas();
        res.status(200).json(preguntas);
    } catch (error) {
        console.error('Error al obtener preguntas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};