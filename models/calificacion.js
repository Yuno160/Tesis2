const db = require('../util/database');

class Calificacion {
  
  /**
   * Crea un registro de calificación y sus relaciones con cif_codes
   * usando una transacción de base de datos.
   */
  static async create({ id_paciente, observaciones, codigos }) {
    
    const connection = await db.getConnection();

    try {
      // 1. Iniciar la transacción
      await connection.beginTransaction();

      // ----- TAREA A: Insertar en la tabla 'calificaciones' -----
      const [resultCalificacion] = await connection.execute(
        'INSERT INTO calificaciones (id_paciente, observaciones) VALUES (?, ?)',
        [id_paciente, observaciones]
      );
      
      const newCalificacionId = resultCalificacion.insertId;

      
      // ----- TAREA B: Buscar los IDs (INT) de los códigos -----
      // (El FE envía ["d4501", "b1670"], pero necesitamos los IDs [5, 12])
      
      const placeholders = codigos.map(() => '?').join(','); // Crea '?,?'
      
      const [rows] = await connection.execute(
        `SELECT id FROM cif_codes WHERE codigo IN (${placeholders})`,
        codigos // Pasa el array ["d4501", "b1670"]
      );

      if (rows.length !== codigos.length) {
        throw new Error('Uno o más códigos CIF enviados no existen en la BD.');
      }

      // Preparamos los datos para la tabla puente
      // ej: [[calificacion_id, cif_id], [calificacion_id, cif_id]]
      const cifCodeIds = rows.map(row => row.id);
      const junctionData = cifCodeIds.map(cifId => [newCalificacionId, cifId]);


      // ----- TAREA C: Insertar en la tabla 'calificacion_cif_codes' -----
      await connection.query(
        'INSERT INTO calificacion_cif_codes (calificacion_id, cif_code_id) VALUES ?',
        [junctionData] // Usamos bulk-insert
      );

      // 3. Si todo salió bien, confirmar los cambios
      await connection.commit();
      
      return {
        id: newCalificacionId,
        id_paciente,
        observaciones,
        codigos_guardados: codigos 
      };

    } catch (error) {
      // 4. Si algo falló, deshacer TODOS los cambios
      await connection.rollback();
      console.error('Error en transacción de Calificacion.create:', error);
      throw error; // Lanza el error al controlador

    } finally {
      // 5. Devolver la conexión al db
      connection.release();
    }
  }

  // --- AÑADE ESTO NUEVO MÉTODO ESTÁTICO ---
  /**
   * Busca la calificación MÁS RECIENTE de un paciente y
   * obtiene todos sus códigos CIF asociados.
   */
  static async getPorPaciente(id_paciente) {
    
    // ----- 1. Buscar la última calificación -----
    // (Buscamos la más reciente por 'fecha_creacion')
    const [calificacionRows] = await db.execute(
      `SELECT id, observaciones, fecha_creacion 
       FROM calificaciones 
       WHERE id_paciente = ? 
       ORDER BY fecha_creacion DESC 
       LIMIT 1`,
      [id_paciente]
    );

    // Si no hay filas, el paciente no tiene calificación
    if (calificacionRows.length === 0) {
      return null; // El controlador devolverá un 404
    }

    const calificacionBase = calificacionRows[0];
    const calificacionId = calificacionBase.id;

    // ----- 2. Buscar los códigos CIF asociados a esa calificación -----
    const [codigosRows] = await db.execute(
      `SELECT cif.codigo, cif.descripcion
       FROM cif_codes AS cif
       JOIN calificacion_cif_codes AS jc ON cif.id = jc.cif_code_id
       WHERE jc.calificacion_id = ?`,
      [calificacionId]
    );

    // 3. Devolver el objeto completo
    return {
      ...calificacionBase, // (id, observaciones, fecha_creacion)
      codigos: codigosRows // (un array de {codigo, descripcion})
    };
  }
  // --- FIN DEL NUEVO MÉTODO ---
}

module.exports = Calificacion;