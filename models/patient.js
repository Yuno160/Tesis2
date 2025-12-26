const db = require('../util/database');

module.exports = class Paciente {
    constructor(
        id_paciente, 
        nombre, 
        carnet_identidad, 
        edad, 
        telefono, 
        direccion, 
        id_zona,                  // <--- 1. NUEVO CAMPO ZONA
        fecha_registro,
        genero,                 
        antecedentes_medicos,     
        prediccion_ia_grado,      
        prediccion_ia_confianza,  
        prediccion_ia_justificacion 
    ) {
        this.id_paciente = id_paciente;
        this.nombre = nombre;
        this.carnet_identidad = carnet_identidad;
        this.edad = edad;
        this.telefono = telefono;
        this.direccion = direccion;
        this.id_zona = id_zona;   // <--- ASIGNACIÓN
        this.fecha_registro = fecha_registro;
        
        this.genero = genero;
        this.antecedentes_medicos = antecedentes_medicos;
        this.prediccion_ia_grado = prediccion_ia_grado;
        this.prediccion_ia_confianza = prediccion_ia_confianza;
        this.prediccion_ia_justificacion = prediccion_ia_justificacion;
    }

    // --- OBTENER TODOS (Con JOIN a Zona) ---
    static getAll() {
        return db.execute(
            `SELECT 
                p.*, 
                z.nombre_zona, 
                EXISTS(
                    SELECT 1 FROM calificaciones c  
                    WHERE c.id_paciente = p.id_paciente
                ) AS ya_calificado
            FROM paciente p
            LEFT JOIN zona z ON p.id_zona = z.id_zona
            ORDER BY p.id_paciente DESC`
        );
    }

    // --- CREAR PACIENTE (INSERT con Zona) ---
    static create(nombre, carnet_identidad, edad, telefono, direccion, id_zona, genero, antecedentes_medicos, ia_grado, ia_confianza, ia_justificacion) {
        return db.execute(
            `INSERT INTO paciente (
                nombre, 
                carnet_identidad, 
                edad, 
                telefono, 
                direccion, 
                id_zona,  -- <--- COLUMNA NUEVA
                genero, 
                antecedentes_medicos, 
                fecha_registro,
                prediccion_ia_grado,
                prediccion_ia_confianza,
                prediccion_ia_justificacion
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`, 
            [
                nombre, 
                carnet_identidad, 
                edad, 
                telefono, 
                direccion, 
                id_zona,  // <--- VALOR NUEVO
                genero, 
                antecedentes_medicos,
                ia_grado || null,        
                ia_confianza || null,    
                ia_justificacion || null 
            ]
        ); 
    }

    // --- ACTUALIZAR PACIENTE (UPDATE con Zona) ---
    static update(nombre, carnet_identidad, edad, telefono, direccion, id_zona, genero, antecedentes_medicos, idOriginal) {
        if (!nombre || !carnet_identidad || !edad || !telefono || !direccion || !id_zona || !genero) {
            throw new Error('Todos los campos principales deben ser proporcionados.');
        }
    
        return db.execute(
            `UPDATE paciente
             SET nombre = ?, 
                 carnet_identidad = ?, 
                 edad = ?, 
                 telefono = ?, 
                 direccion = ?, 
                 id_zona = ?,  -- <--- ACTUALIZAMOS ZONA
                 genero = ?,
                 antecedentes_medicos = ?
             WHERE carnet_identidad = ?`,
            [nombre, carnet_identidad, edad, telefono, direccion, id_zona, genero, antecedentes_medicos, idOriginal]
        );
    }
    
    // --- BUSCAR POR CARNET ---
    static async findByCarnet(carnet) {
        const [rows] = await db.execute('SELECT * FROM paciente WHERE carnet_identidad = ?', [carnet]);
        return rows[0] || null;
    }

    // --- BUSCAR POR ID ---
    static async getById(id) {
        const [rows] = await db.execute(
            'SELECT * FROM paciente WHERE id_paciente = ?',
            [id]
        );
        return rows[0] || null;
    }

    // --- ACTUALIZAR FOTO ---
    static async updateFoto(idPaciente, rutaFoto) {
        return db.execute(
            'UPDATE paciente SET foto_url = ? WHERE id_paciente = ?',
            [rutaFoto, idPaciente]
        );
    }

    // --- ELIMINAR PACIENTE (Transacción Segura) ---
    static async delete(carnet_identidad) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // 1. Verificar existencia
            const [patientRows] = await connection.execute(
                `SELECT id_paciente FROM paciente WHERE carnet_identidad = ?`,
                [carnet_identidad]
            );

            if (patientRows.length === 0) {
                await connection.rollback();
                return { success: false, message: 'Paciente no encontrado', action: 'Verificar el carnet proporcionado' };
            }

            const id_paciente = patientRows[0].id_paciente;

            // 2. Verificar dependencias
            const [evaluations] = await connection.execute(
                `SELECT COUNT(*) AS count FROM calificaciones WHERE id_paciente = ?`, 
                [id_paciente]
            );

            if (evaluations[0].count > 0) {
                await connection.rollback();
                return {
                    success: false,
                    message: 'No se puede eliminar el paciente',
                    reason: 'Tiene calificaciones registradas',
                    dependencies: { evaluaciones: evaluations[0].count },
                    actions: ['Eliminar primero las calificaciones manualmente']
                };
            }

            // 3. Eliminar
            const [result] = await connection.execute(
                `DELETE FROM paciente WHERE carnet_identidad = ?`,
                [carnet_identidad]
            );

            await connection.commit();

            return { success: true, message: 'Paciente eliminado correctamente', affectedRows: result.affectedRows };

        } catch (error) {
            await connection.rollback();
            console.error('Error en delete:', error);
            return { success: false, message: 'Error en el servidor', errorDetails: { code: error.code, message: error.message }, action: 'Contactar al administrador' };
        } finally {
            connection.release();
        }
    }

    // --- REPORTE PDF COMPLETO (Relacional) ---
    static async getPacienteConCalificaciones(idPaciente) {
        try {
            // A. Datos Paciente + Zona
            const [pacienteRows] = await db.execute(
                `SELECT p.*, z.nombre_zona 
                 FROM paciente p 
                 LEFT JOIN zona z ON p.id_zona = z.id_zona 
                 WHERE p.carnet_identidad = ?`, 
                [idPaciente]
            );

            if (pacienteRows.length === 0) return null;
            const paciente = pacienteRows[0];
            
            // Aseguramos ID válido para siguientes consultas
            const idReal = paciente.id_paciente || paciente.id;

            // B. Cabecera Calificación Médica
            const [headerRows] = await db.execute(
                `SELECT id, observaciones, resultado_global, fecha_creacion 
                 FROM calificaciones 
                 WHERE id_paciente = ? 
                 ORDER BY fecha_creacion DESC LIMIT 1`,
                [idReal]
            );
    
            if (headerRows.length === 0) {
                paciente.datos_doctor = null;
                paciente.codigos_cif = [];
                return paciente;
            }
    
            const cabecera = headerRows[0];
            paciente.datos_doctor = cabecera; 
    
            // C. Detalles Códigos CIF (Join triple + Coalesce)
            const [detallesRows] = await db.execute(
                `SELECT 
                    cif.codigo AS codigo, 
                    COALESCE(jc.descripcion_especifica, cif.descripcion) AS descripcion_oficial, 
                    jc.gravedad_especifica, 
                    cal.resultado_global 
                 FROM cif_codes AS cif 
                 JOIN calificacion_cif_codes AS jc ON cif.id = jc.cif_code_id 
                 JOIN calificaciones AS cal ON jc.calificacion_id = cal.id 
                 WHERE jc.calificacion_id = ? 
                 ORDER BY cif.codigo`,
                [cabecera.id]
            );
    
            paciente.codigos_cif = detallesRows;
            return paciente;

        } catch (err) {
            console.error("Error en getPacienteConCalificaciones:", err);
            throw err;
        }
    }

    // --- LISTAR ZONAS (Para el Combo Box) ---
    static async getAllZonas() {
        try {
            const sql = 'SELECT * FROM zona ORDER BY nombre_zona ASC';
            const [rows] = await db.execute(sql);
            return rows;
        } catch (error) {
            console.error("Error en modelo getAllZonas:", error);
            throw error;
        }
    }
};