const Calificacion = require('../models/calificacion');

/**
 * Controlador para crear una nueva calificación.
 */
const crearCalificacion = async (req, res) => {
  try {
    const { id_paciente, observaciones, codigos } = req.body;

    // Validación básica de los datos que envía el FE
    if (!id_paciente || !codigos || codigos.length === 0) {
      return res.status(400).json({ 
        message: 'Faltan datos esenciales (id_paciente o codigos).' 
      });
    }

    // Llama al modelo para que haga la transacción
    const nuevaCalificacion = await Calificacion.create({
      id_paciente,
      observaciones,
      codigos
    });

    res.status(201).json({
      message: 'Calificación guardada con éxito',
      data: nuevaCalificacion
    });

  } catch (error) {
    console.error('Error en crearCalificacion:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al guardar la calificación.',
      error: error.message
    });
  }
};

/**
 * Controlador para obtener la última calificación de un paciente.
 */
const getCalificacionPorPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;

    // 1. Llama al modelo para buscar los datos
    const calificacion = await Calificacion.getPorPaciente(id_paciente);

    // 2. Si no se encuentra, es un 404 (No Encontrado)
    //    Esto es normal si el paciente es nuevo y no tiene calificación.
    if (!calificacion) {
      return res.status(404).json({
        message: 'No se encontró una calificación para este paciente.'
      });
    }

    // 3. Si se encuentra, la devolvemos
    res.status(200).json(calificacion);

  } catch (error) {
    console.error('Error en getCalificacionPorPaciente:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al obtener la calificación.',
      error: error.message
    });
  }
};

module.exports = {
  crearCalificacion,
  getCalificacionPorPaciente
};