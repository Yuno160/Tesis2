// controllers/patientController.js
const Paciente = require('../models/patient');

// Función para obtener todos los pacientes
exports.getAllPacientes = async (req, res, next) => {
     try {
         // Llama al modelo (que solo tiene el SQL)
         const [allPacientes] = await Paciente.getAll();
         res.status(200).json(allPacientes);
     } catch (err) { // <-- El error del SQL se atrapa aquí
         
         // --- ¡AÑADE ESTA LÍNEA AQUÍ! ---
         console.error('ERROR EN getAllPacientes (controlador):', err);
         // --------------------------------

         if (!err.statusCode) {
             err.statusCode = 500;
         }
         next(err); 
     }
};

// Función para crear un nuevo paciente
exports.createPaciente = async (req, res, next) => {
    console.log('Datos recibidos:', req.body);

    const {
        nombre,
        carnet_identidad,
        edad,
        telefono = null, // Valor predeterminado
        direccion = null, // Valor predeterminado
        genero = null, // Valor predeterminado
        antecedentes_medicos = null // Valor predeterminado
    } = req.body;

    try {
        const newPaciente = await Paciente.create(nombre, carnet_identidad, edad, telefono, direccion, genero, antecedentes_medicos);
        res.status(201).json({
            message: 'Paciente creado con éxito',
            patient: newPaciente
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};



exports.updatePatient = async (req, res, next) => {
    const originalId = req.params.carnet_identidad;
    const { nombre, carnet_identidad, edad, telefono, direccion, genero } = req.body;

    try {
        // 1. Verificar si el paciente existe (forma más robusta)
        const existingPatient = await Paciente.findByCarnet(originalId);
        if (!existingPatient || existingPatient.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Paciente no encontrado.' 
            });
        }

        // 2. Verificar conflicto con nuevo carnet
        if (carnet_identidad !== originalId) {
            const conflictingPatient = await Paciente.findByCarnet(carnet_identidad);
            if (conflictingPatient && conflictingPatient.length > 0) {
                return res.status(400).json({ 
                    success: false,
                    message: 'El número de carnet ya está en uso.' 
                });
            }
        }

        // 3. Actualizar paciente
        const updateResult = await Paciente.update(
            nombre, carnet_identidad, edad, telefono, direccion, genero, originalId
        );

        if (!updateResult || updateResult.affectedRows === 0) {
            return res.status(500).json({ 
                success: false,
                message: 'No se pudo actualizar el paciente.' 
            });
        }

        res.status(200).json({ 
            success: true,
            message: 'Paciente actualizado correctamente.',
            data: { nombre, carnet_identidad, edad, telefono, direccion, genero }
        });

    } catch (err) {
        console.error('Error en updatePatient:', err);
        res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor.',
            error: err.message 
        });
    }
};


exports.deletePatient = async (req, res) => {
    try {
        const result = await Paciente.delete(req.params.carnet_identidad);
        
        if (!result.success) {
            return res.status(result.dependencies ? 409 : 404).json(result);
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error inesperado',
            error: error.message
        });
    }
};

// En tu controlador backend (getPatient)
exports.getPatient = async (req, res) => {
  try {
    const carnet = req.params.carnet_identidad;
    const patient = await Paciente.findByCarnet(carnet); // Asegúrate que esto devuelva un objeto
    
    if (!patient) {
      return res.status(404).json({ 
        success: false,
        message: 'Paciente no encontrado' 
      });
    }

    res.status(200).json({
      success: true,
      data: patient // Devuelve el objeto paciente directamente
    });

  } catch (err) {
    console.error('Error en getPatient:', err);
    res.status(500).json({ 
      success: false,
      message: 'Error del servidor' 
    });
  }
};

exports.getPacienteByCarnet = async (req, res) => {
  try {
    // Usamos la función que YA TENÍAS en tu modelo
    const paciente = await Paciente.findByCarnet(req.params.carnet);
    
    if (!paciente) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado con ese carnet' });
    }
    
    // Devuelve el paciente envuelto, igual que tu otra función 'getPatient'
    res.status(200).json({
      success: true,
      data: paciente
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al obtener paciente por carnet', error: error.message });
  }
};

// GET /api/pacientes/:id
exports.getPacienteById = async (req, res) => {
  try {
    const paciente = await Paciente.getById(req.params.id);
    
    // ¡Esta es la validación clave que te daba el error 404!
    if (!paciente) {
      return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    }
    
    res.json(paciente);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener paciente', error: error.message });
  }
};

exports.buscarPorCarnet = async (req, res) => {
  // --- LOG 3 ---
  console.log('--- BE: 3. Controlador (Controller) ---');
  console.log('Parámetros recibidos (req.params):', req.params);
  // ---
  try {
    // --- ¡CAMBIO AQUÍ! ---
    // Lee 'carnet_identidad' de req.params, no 'carnet'
    const { carnet_identidad } = req.params; 
    // --- FIN DEL CAMBIO ---
    // --- LOG 4 ---
    console.log('Valor de "carnet_identidad" extraído:', carnet_identidad);
    // ---

    if (!carnet_identidad) {
       return res.status(400).json({ message: 'No se proporcionó carnet' });
    }

    // Pasa la variable correcta al modelo
    const paciente = await Paciente.findByCarnet(carnet_identidad); 

    if (!paciente) {
      onsole.log('BE: Paciente NO encontrado en la DB.');
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    console.log('BE: Paciente SÍ encontrado. Enviando datos.');
    res.status(200).json(paciente); // Devuelve el paciente (no { data: paciente })

  } catch (error) {
    console.error("Error en buscarPorCarnet:", error);
    next(error);
  }
};