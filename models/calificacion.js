const db = require('../util/database'); 

class Calificacion {

  static async create({ id_paciente, observaciones, codigos }) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // ... (Lógica de fecha de vencimiento e INSERT en 'calificaciones' igual que antes) ...
      const fechaCreacion = new Date();
      const fechaVencimiento = new Date(fechaCreacion);
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 4);
      const fechaVencimientoSql = fechaVencimiento.toISOString().split('T')[0];

      const [resultCalificacion] = await connection.execute(
        'INSERT INTO calificaciones (id_paciente, observaciones, fecha_vencimiento) VALUES (?, ?, ?)',
        [id_paciente, observaciones, fechaVencimientoSql]
      );
      const newCalificacionId = resultCalificacion.insertId;

      // --- AQUÍ EMPIEZA EL DIAGNÓSTICO ---
      
      // 1. Extraer códigos base
      const baseCodigos = codigos.map(codeWithQualifier => {
         const lastDotIndex = codeWithQualifier.lastIndexOf('.');
         return lastDotIndex !== -1 ? codeWithQualifier.substring(0, lastDotIndex) : codeWithQualifier;
      });

      // DIAGNÓSTICO 1: ¿Qué códigos base estamos buscando?
      console.log("--- DEBUG CALIFICACIÓN ---");
      console.log("1. Códigos enviados por Frontend:", codigos);
      console.log("2. Códigos BASE a buscar en DB:", baseCodigos);

      // 2. Buscar en la BD
      if (baseCodigos.length > 0) { // Solo buscamos si hay códigos
          const placeholders = baseCodigos.map(() => '?').join(',');
          const [rows] = await connection.execute(
            `SELECT id, codigo FROM cif_codes WHERE codigo IN (${placeholders})`,
            baseCodigos
          );

          // DIAGNÓSTICO 2: ¿Qué encontró la BD?
          const foundCodes = rows.map(r => r.codigo);
          console.log("3. Códigos encontrados en cif_codes:", foundCodes);

          // 3. Verificar
          if (rows.length !== baseCodigos.length) {
             // Encontramos cuáles faltan
             const missingCodes = baseCodigos.filter(c => !foundCodes.includes(c));
             console.error("!!! ERROR: FALTAN ESTOS CÓDIGOS EN LA BD:", missingCodes);
             
             throw new Error(`Uno o más códigos CIF base enviados no existen en la BD. Faltan: ${missingCodes.join(', ')}`);
          }

          // 4. Insertar relaciones (Si todo está bien)
          const cifCodeIds = rows.map(row => row.id);
          const junctionData = cifCodeIds.map(cifId => [newCalificacionId, cifId]);

          await connection.query(
            'INSERT INTO calificacion_cif_codes (calificacion_id, cif_code_id) VALUES ?',
            [junctionData]
          );
      }

      await connection.commit();
      return { id: newCalificacionId, id_paciente, observaciones, fecha_vencimiento: fechaVencimientoSql, codigos_guardados: codigos };

    } catch (error) {
      await connection.rollback();
      console.error('Error en Calificacion.create:', error.message); // Muestra el mensaje detallado
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
  
  // ... (resto del archivo getPorPaciente) ...
  static async getPorPaciente(id_paciente) {
      // ... (el código que ya tenías aquí) ...
      // (Si quieres te lo pego completo, pero es igual al anterior)
      const [calificacionRows] = await db.execute(
       `SELECT id, observaciones, fecha_creacion, fecha_vencimiento
        FROM calificaciones WHERE id_paciente = ? ORDER BY fecha_creacion DESC LIMIT 1`,
       [id_paciente]
      );
      if (calificacionRows.length === 0) return null;

      const calificacionBase = calificacionRows[0];
      const [codigosRows] = await db.execute(
       `SELECT cif.codigo, cif.descripcion FROM cif_codes AS cif
        JOIN calificacion_cif_codes AS jc ON cif.id = jc.cif_code_id
        WHERE jc.calificacion_id = ? ORDER BY cif.codigo`,
       [calificacionBase.id]
      );

      return { ...calificacionBase, codigos: codigosRows };
  }
}

module.exports = Calificacion;