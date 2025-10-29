const db = require('../util/database');

module.exports = class Paciente {
    constructor(id_paciente, nombre, carnet_identidad, edad, telefono, direccion, fecha_registro) {
        this.id_paciente = id_paciente;
        this.nombre = nombre;
        this.carnet_identidad = carnet_identidad;
        this.edad = edad;
        this.telefono = telefono;
        this.direccion = direccion;
        this.edad = edad;
        this.fecha_registro = fecha_registro
    }

    
static getAll() {
    // Por favor, BORRA la función getAll que tienes
    // y pégala exactamente así:
        return db.execute(
`SELECT 
    p.*, 
    EXISTS(
        SELECT 1 FROM calificaciones c  
        WHERE c.id_paciente = p.id_paciente
    ) AS ya_calificado
FROM paciente p
ORDER BY p.id_paciente DESC`
    );
  }

    // Método para crear un nuevo paciente
    static create(nombre, carnet_identidad, edad, telefono, direccion, genero, antecedentes_medicos) {
        return db.execute(
            'INSERT INTO Paciente (nombre, carnet_identidad, edad, telefono, direccion, genero, antecedentes_medicos) VALUES (?, ?, ?, ?, ?,?,?)',
            [nombre, carnet_identidad, edad, telefono, direccion, genero, antecedentes_medicos]
        ); 
    }

    static update(nombre, carnet_identidad, edad, telefono, direccion, genero, idOriginal) {
        // Verifica si algún campo está vacío o no definido
        console.log('Nombre:', nombre);
        console.log('Carnet Nuevo:', carnet_identidad);
        console.log('Edad:', edad);
        console.log('Teléfono:', telefono);
        console.log('Dirección:', direccion);
        console.log('Género:', genero);
        console.log('Carnet Original:', idOriginal);
    
        if (!nombre || !carnet_identidad || !edad || !telefono || !direccion || !genero) {
            throw new Error('Todos los campos deben ser proporcionados.');
        }
    
        return db.execute(
            `UPDATE Paciente
             SET nombre = ?, carnet_identidad = ?, edad = ?, telefono = ?, direccion = ?, genero = ?
             WHERE carnet_identidad = ?`,
            [nombre, carnet_identidad, edad, telefono, direccion, genero, idOriginal]
        );
    }
    

    // En tu modelo Paciente
static async findByCarnet(carnet) {
  const [rows] = await db.execute('SELECT * FROM Paciente WHERE carnet_identidad = ?', [carnet]);
  return rows[0] || null; // Devuelve el primer registro o null
    }

static async delete(carnet_identidad) {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Verificar existencia del paciente
        const [patientRows] = await connection.execute(
            `SELECT id_paciente FROM paciente WHERE carnet_identidad = ?`,
            [carnet_identidad]
        );

        if (patientRows.length === 0) {
            await connection.rollback();
            return {
                success: false,
                message: 'Paciente no encontrado',
                action: 'Verificar el carnet proporcionado'
            };
        }

        const id_paciente = patientRows[0].id_paciente;

        // 2. Verificar dependencias
        const [evaluations] = await connection.execute(
            `SELECT COUNT(*) AS count FROM evaluacion WHERE id_paciente = ?`,
            [id_paciente]
        );

        const [appointments] = await connection.execute(
            `SELECT COUNT(*) AS count FROM appointments WHERE id_paciente = ?`,
            [id_paciente]
        );

        // 3. Si hay dependencias, retornar error controlado
        if (evaluations[0].count > 0 || appointments[0].count > 0) {
            await connection.rollback();
            return {
                success: false,
                message: 'No se puede eliminar el paciente',
                reason: 'Tiene registros asociados',
                dependencies: {
                    evaluaciones: evaluations[0].count,
                    citas: appointments[0].count
                },
                actions: [
                    'Eliminar primero las evaluaciones/citas manualmente',
                    'Considerar archivar el paciente'
                ]
            };
        }

        // 4. Si no hay dependencias, proceder con eliminación
        const [result] = await connection.execute(
            `DELETE FROM paciente WHERE carnet_identidad = ?`,
            [carnet_identidad]
        );

        await connection.commit();

        return {
            success: true,
            message: 'Paciente eliminado correctamente',
            affectedRows: result.affectedRows
        };

    } catch (error) {
        await connection.rollback();
        console.error('Error en delete:', error);
        
        return {
            success: false,
            message: 'Error en el servidor',
            errorDetails: {
                code: error.code,
                message: error.message
            },
            action: 'Contactar al administrador del sistema'
        };
    } finally {
        connection.release();
    }
}

static async getById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM Paciente WHERE id_paciente = ?',
      [id]
    );
    
    // Devuelve el primer resultado, o null si no se encontró
    return rows[0] || null;
  }


};