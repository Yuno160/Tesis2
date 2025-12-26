const db = require('../util/database'); 

class Calificacion {

  static async create({ id_paciente, observaciones, codigos, resultado_global }) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. INSERT CABECERA
      const fechaCreacion = new Date();
      const fechaVencimiento = new Date(fechaCreacion);
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 4); 
      const fechaVencimientoSql = fechaVencimiento.toISOString().split('T')[0];

      const [resultCalificacion] = await connection.execute(
        `INSERT INTO calificaciones 
        (id_paciente, observaciones, resultado_global, fecha_vencimiento, fecha_creacion) 
        VALUES (?, ?, ?, ?, NOW())`,
        [id_paciente, observaciones, resultado_global, fechaVencimientoSql]
      );
      
      const newCalificacionId = resultCalificacion.insertId;

      // 2. PROCESAMIENTO DE CÓDIGOS
      
      const codigosProcesados = codigos.map(item => {
         const fullCode = (item.codigo || item).toString(); 
         const lastDotIndex = fullCode.lastIndexOf('.');
         const baseCode = lastDotIndex !== -1 ? fullCode.substring(0, lastDotIndex) : fullCode;
         return { baseCode, fullCode, descripcionFrontend: item.descripcion };
      });

      // --- CAMBIO CLAVE: BUSCAR DESCRIPCIONES EN SE_REGLAS ---
      // Obtenemos todos los códigos completos (ej: b235.3)
      const listaCodigosCompletos = codigosProcesados.map(c => c.fullCode);
      
      let descripcionesExpertas = [];
      if (listaCodigosCompletos.length > 0) {
          // Buscamos en la tabla del experto si existen descripciones bonitas
          const placeholders = listaCodigosCompletos.map(() => '?').join(',');
          const [rows] = await connection.execute(
              `SELECT codigo_cif_final, descripcion_regla FROM se_reglas WHERE codigo_cif_final IN (${placeholders})`,
              listaCodigosCompletos
          );
          descripcionesExpertas = rows;
      }
      // -------------------------------------------------------

      const baseCodigosUnicos = [...new Set(codigosProcesados.map(c => c.baseCode))];

      if (baseCodigosUnicos.length > 0) { 
          // Buscamos IDs de los códigos base (ej: b235)
          const placeholdersBase = baseCodigosUnicos.map(() => '?').join(',');
          const [rowsBase] = await connection.execute(
            `SELECT id, codigo, descripcion FROM cif_codes WHERE codigo IN (${placeholdersBase})`,
            baseCodigosUnicos
          );

          const junctionData = [];

          codigosProcesados.forEach(item => {
              const codeRow = rowsBase.find(r => r.codigo === item.baseCode);
              
              if (codeRow) {
                  // --- LÓGICA DE PRIORIDAD DE DESCRIPCIÓN ---
                  let descFinal = null;

                  // 1. Prioridad: Buscar en SE_REGLAS (Experto)
                  const reglaEncontrada = descripcionesExpertas.find(r => r.codigo_cif_final === item.fullCode);
                  if (reglaEncontrada) {
                      descFinal = `${reglaEncontrada.descripcion_regla}`;
                  } 
                  // 2. Prioridad: Lo que mandó el Frontend
                  else if (item.descripcionFrontend) {
                      descFinal = item.descripcionFrontend;
                  }
                  // 3. Fallback: Usar la genérica (pero el SQL create lo dejará null y el GET usará la genérica)
                  
                  // Guardamos
                  junctionData.push([newCalificacionId, codeRow.id, descFinal]);
              }
          });

          if (junctionData.length > 0) {
            await connection.query(
              'INSERT INTO calificacion_cif_codes (calificacion_id, cif_code_id, descripcion_especifica) VALUES ?',
              [junctionData]
            );
          }
      }

      await connection.commit();
      
      return { 
        id: newCalificacionId, 
        id_paciente, 
        resultado_global, 
        fecha_vencimiento: fechaVencimientoSql 
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error en Calificacion.create:', error.message);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
  
  static async getPorPaciente(id_paciente) {
      const [calificacionRows] = await db.execute(
       `SELECT id, observaciones, resultado_global, fecha_creacion, fecha_vencimiento
        FROM calificaciones WHERE id_paciente = ? ORDER BY fecha_creacion DESC LIMIT 1`,
       [id_paciente]
      );
      
      if (calificacionRows.length === 0) return null;

      const calificacionBase = calificacionRows[0];
      
      // --- CAMBIO EN EL SELECT PARA LEER LA DESCRIPCIÓN ESPECÍFICA ---
      // Usamos COALESCE: Si existe descripcion_especifica, usa esa. Si no, usa la genérica.
      const [codigosRows] = await db.execute(
       `SELECT 
          cif.codigo AS codigo, 
          COALESCE(jc.descripcion_especifica, cif.descripcion) AS descripcion 
        FROM cif_codes AS cif
        JOIN calificacion_cif_codes AS jc ON cif.id = jc.cif_code_id
        WHERE jc.calificacion_id = ? 
        ORDER BY cif.codigo`,
       [calificacionBase.id]
      );

      return { ...calificacionBase, codigos: codigosRows };
  }
}

module.exports = Calificacion;