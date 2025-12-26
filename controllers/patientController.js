const Paciente = require('../models/patient');

// --- HELPER: Validaciones Reutilizables ---
const validarDatosPaciente = (data) => {
    const errores = [];

    // 1. Sanitización
    if (data.nombre) data.nombre = data.nombre.trim();
    if (data.carnet_identidad) data.carnet_identidad = String(data.carnet_identidad).trim();
    if (data.direccion) data.direccion = data.direccion.trim();

    // 2. Validaciones Obligatorias
    if (!data.nombre || data.nombre.length < 3) {
        errores.push("El nombre es obligatorio y debe tener al menos 3 caracteres.");
    }
    if (!data.carnet_identidad) {
        errores.push("El Carnet de Identidad es obligatorio.");
    }
    
    // --- NUEVO: Validar Zona ---
    if (!data.id_zona) {
        errores.push("Debes seleccionar una Zona/Provincia.");
    }

    // 3. Validación Lógica
    if (data.edad === undefined || data.edad === null || isNaN(data.edad) || data.edad < 0 || data.edad > 120) {
        errores.push("La edad debe ser un número válido entre 0 y 120.");
    }

    return { errores, data };
};

// 1. OBTENER TODOS
exports.getAllPacientes = async (req, res, next) => {
    try {
        const [allPacientes] = await Paciente.getAll();
        res.status(200).json(allPacientes);
    } catch (err) {
        console.error('ERROR EN getAllPacientes:', err);
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

// 2. CREAR PACIENTE (MODIFICADO CON ZONA)
exports.createPaciente = async (req, res, next) => {
    try {
        // A. Validar y Sanitizar entrada
        let { errores, data } = validarDatosPaciente(req.body);

        if (errores.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Error de validación', 
                errors: errores 
            });
        }

        // B. Verificar duplicados
        const existe = await Paciente.findByCarnet(data.carnet_identidad);
        if (existe) {
            return res.status(409).json({ 
                success: false, 
                message: `El paciente con Carnet ${data.carnet_identidad} ya está registrado.` 
            });
        }

        // C. Insertar (Pasamos id_zona en el orden correcto)
        const [result] = await Paciente.create(
            data.nombre,
            data.carnet_identidad,
            data.edad,
            data.telefono,
            data.direccion,
            data.id_zona, // <--- NUEVO CAMPO AÑADIDO
            data.genero,
            data.antecedentes_medicos,
            // Campos IA
            req.body.prediccion_ia_grado,
            req.body.prediccion_ia_confianza,
            req.body.prediccion_ia_justificacion
        );

        res.status(201).json({
            success: true,
            message: 'Paciente registrado exitosamente.',
            pacienteId: result.insertId
        });

    } catch (err) {
        console.error('Error al crear paciente:', err);
        if (!err.statusCode) err.statusCode = 500;
        next(err);
    }
};

// 3. ACTUALIZAR PACIENTE (MODIFICADO CON ZONA)
exports.updatePatient = async (req, res, next) => {
    const originalId = req.params.carnet_identidad; 

    try {
        // A. Validar y Sanitizar entrada
        let { errores, data } = validarDatosPaciente(req.body);
        
        if (errores.length > 0) {
            return res.status(400).json({ success: false, message: 'Datos inválidos', errors: errores });
        }

        // B. Verificar existencia
        const existingPatient = await Paciente.findByCarnet(originalId);
        if (!existingPatient) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado.' });
        }

        // C. Verificar conflicto de carnet
        if (data.carnet_identidad !== originalId) {
            const conflictingPatient = await Paciente.findByCarnet(data.carnet_identidad);
            if (conflictingPatient) {
                return res.status(400).json({ success: false, message: `El Carnet ${data.carnet_identidad} ya pertenece a otro paciente.` });
            }
        }

        // D. Actualizar (Pasamos id_zona al modelo)
        const updateResult = await Paciente.update(
            data.nombre, 
            data.carnet_identidad, 
            data.edad, 
            data.telefono, 
            data.direccion, 
            data.id_zona, // <--- NUEVO CAMPO AÑADIDO
            data.genero, 
            data.antecedentes_medicos,
            originalId
        );

        if (updateResult.affectedRows === 0) {
            return res.status(500).json({ success: false, message: 'No se realizaron cambios en la base de datos.' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Paciente actualizado correctamente.',
            data: data
        });

    } catch (err) {
        console.error('Error en updatePatient:', err);
        res.status(500).json({ success: false, message: 'Error interno.', error: err.message });
    }
};

// 4. ELIMINAR PACIENTE
exports.deletePatient = async (req, res) => {
    try {
        const result = await Paciente.delete(req.params.carnet_identidad);
        
        if (!result.success) {
            return res.status(result.dependencies ? 409 : 404).json(result);
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error inesperado', error: error.message });
    }
};

// 5. OBTENER POR CARNET
exports.getPacienteByCarnet = async (req, res) => {
    try {
        const carnet = req.params.carnet || req.params.carnet_identidad;
        const paciente = await Paciente.findByCarnet(carnet);
        
        if (!paciente) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }
        
        res.status(200).json({ success: true, data: paciente });

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener paciente', error: error.message });
    }
};

// 6. OBTENER POR ID
exports.getPacienteById = async (req, res) => {
    try {
        const paciente = await Paciente.getById(req.params.id);
        
        if (!paciente) {
            return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
        }
        
        res.json(paciente);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener paciente', error: error.message });
    }
};

// 7. OBTENER ZONAS (Para el Combo Box)
exports.getZonas = async (req, res) => {
    try {
        // Llamamos al Modelo (Abstracción)
        const listaZonas = await Paciente.getAllZonas();
        
        // Respondemos
        res.status(200).json(listaZonas);

    } catch (error) {
        console.error("Error en controller getZonas:", error);
        res.status(500).json({ 
            message: "Error al cargar la lista de zonas", 
            error: error.message 
        });
    }
};

// 8. ACTUALIZAR FOTO
exports.actualizarFotoPerfil = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se envió ninguna imagen.' });
        }

        const { idPaciente } = req.body;
        const rutaFoto = req.file.path; 

        await Paciente.updateFoto(idPaciente, rutaFoto);

        res.status(200).json({ 
            message: 'Foto actualizada correctamente', 
            foto_url: rutaFoto 
        });

    } catch (error) {
        console.error("Error en actualizarFotoPerfil:", error);
        res.status(500).json({ message: 'Error interno al actualizar la foto' });
    }
};

// --- MÉTODOS LEGACY (Compatibilidad) ---
exports.getPatient = exports.getPacienteByCarnet;
exports.buscarPorCarnet = exports.getPacienteByCarnet;