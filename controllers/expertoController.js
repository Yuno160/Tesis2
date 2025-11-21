const Experto = require('../models/expertoModel');

/**
 * Controlador para GET /preguntas/:categoria_padre
 * Trae las preguntas del asistente.
 */
const getPreguntasPorCategoria = async (req, res, next) => {
  try {
    const { categoria_padre } = req.params;
    const preguntas = await Experto.getPreguntas(categoria_padre);
    
    if (!preguntas || preguntas.length === 0) {
      console.log(`No se encontraron preguntas para la categoría: ${categoria_padre}`);
    }
    
    res.status(200).json(preguntas);

  } catch (err) {
    console.error('ERROR EN getPreguntasPorCategoria:', err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

/**
 * Controlador para POST /evaluar
 * Recibe las respuestas y devuelve los códigos sugeridos.
 */
const evaluarRespuestas = async (req, res, next) => {
  try {
    // req.body será: [{ pregunta_id: 1, respuesta: 'ligero' }, ...]
    const respuestas = req.body; 

    if (!respuestas || !Array.isArray(respuestas) || respuestas.length === 0) {
      return res.status(400).json({ message: 'No se proporcionaron respuestas.' });
    }

    const codigosSugeridos = await Experto.evaluar(respuestas);

    res.status(200).json(codigosSugeridos);

  } catch (err) {
    console.error('ERROR EN evaluarRespuestas:', err);
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

module.exports = {
  getPreguntasPorCategoria,
  evaluarRespuestas
};