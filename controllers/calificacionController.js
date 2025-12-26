const Calificacion = require('../models/calificacion');

// ==========================================
// 🧠 CEREBRO DEL SISTEMA (Lógica de Inferencia)
// ==========================================
function calcularGradoGlobal(codigos) {
    if (!codigos || codigos.length === 0) return 'NINGUNA';

    // Mapa de valores
    const niveles = {
        'NINGUNA': 0, 'LIGERA': 1, 'MODERADA': 2, 'GRAVE': 3, 'COMPLETA': 4
    };

    let maxNivel = 0;
    let etiquetaGlobal = 'NINGUNA';

    codigos.forEach(c => {
        let nivelActual = 0;
        let etiquetaActual = 'NINGUNA';

        // CASO A: Viene explícito en el objeto (ej: { gravedad: 'GRAVE' })
        if (c.gravedad) {
            const g = c.gravedad.toUpperCase();
            nivelActual = niveles[g] || 0;
            etiquetaActual = g;
        } 
        // CASO B: Viene implícito en el código (ej: "b280.3")
        else {
            const codigoStr = (c.codigo || c).toString(); // Aseguramos que sea texto
            
            // Buscamos el último número después del punto
            if (codigoStr.includes('.')) {
                const partes = codigoStr.split('.');
                const calificador = parseInt(partes[partes.length - 1]); // El número final

                // Asignamos gravedad según el calificador CIF estándar
                if (calificador === 0) { nivelActual = 0; etiquetaActual = 'NINGUNA'; }
                else if (calificador === 1) { nivelActual = 1; etiquetaActual = 'LIGERA'; }
                else if (calificador === 2) { nivelActual = 2; etiquetaActual = 'MODERADA'; }
                else if (calificador === 3) { nivelActual = 3; etiquetaActual = 'GRAVE'; }
                else if (calificador === 4) { nivelActual = 4; etiquetaActual = 'COMPLETA'; }
            }
        }

        // REGLA DEL MÁXIMO
        if (nivelActual > maxNivel) {
            maxNivel = nivelActual;
            etiquetaGlobal = etiquetaActual;
        }
    });

    return etiquetaGlobal;
}

/**
 * Controlador para crear una nueva calificación.
 */
const crearCalificacion = async (req, res) => {
  try {
    const { id_paciente, observaciones, codigos } = req.body;

    // Validación básica
    if (!id_paciente || !codigos || codigos.length === 0) {
      return res.status(400).json({ 
        message: 'Faltan datos esenciales (id_paciente o codigos).' 
      });
    }

    // --- AQUÍ OCURRE LA MAGIA ---
    // Calculamos el resultado automáticamente antes de guardar
    const resultado_global = calcularGradoGlobal(codigos);
    
    console.log(`🧠 Sistema Experto: Calculado grado [${resultado_global}] para paciente ${id_paciente}`);

    // Llama al modelo para guardar (incluyendo el resultado calculado)
    const nuevaCalificacion = await Calificacion.create({
      id_paciente,
      observaciones,
      codigos,
      resultado_global // <--- ¡Asegúrate que tu MODELO reciba esto!
    });

    res.status(201).json({
      message: 'Calificación guardada con éxito',
      grado_calculado: resultado_global, // Lo devolvemos para que el Front lo muestre
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
    const calificacion = await Calificacion.getPorPaciente(id_paciente);

    if (!calificacion) {
      return res.status(404).json({
        message: 'No se encontró una calificación para este paciente.'
      });
    }

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