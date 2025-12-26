const db = require('../util/database');

class Experto {

  /**
   * Obtiene preguntas filtrando por categoría (con LIKE).
   */
  static async getPreguntas(categoriaPadre) {
    const [rows] = await db.execute(
      'SELECT id, codigo_pregunta, texto_pregunta, tipo_respuesta FROM se_preguntas WHERE categoria_padre LIKE ?',
      [`${categoriaPadre}%`] 
    );
    return rows;
  }

  /**
   * Helper privado para traducir el sufijo (.3, .4) a texto
   */
  static _determinarGravedad(codigoCif) {
    if (!codigoCif || !codigoCif.includes('.')) return 'NINGUNA';
    
    const partes = codigoCif.split('.');
    const calificador = parseInt(partes[partes.length - 1]);

    switch (calificador) {
        case 0: return 'NINGUNA';
        case 1: return 'LIGERA';
        case 2: return 'MODERADA';
        case 3: return 'GRAVE';
        case 4: return 'COMPLETA';
        default: return 'NO ESPECIFICADO';
    }
  }

  /**
   * Motor de Inferencia MEJORADO
   */
  static async evaluar(respuestas) {
    // 1. Mapa de respuestas
    const respuestasMap = new Map();
    respuestas.forEach(r => {
      respuestasMap.set(r.pregunta_id, r.respuesta);
    });

    // 2. Traer reglas y condiciones
    // --- CORRECCIÓN AQUÍ: Usamos el nombre real 'descripcion_regla' ---
    const [todasLasCondiciones] = await db.execute(
      `SELECT 
          r.id AS regla_id,
          r.codigo_cif_final,
          r.descripcion_regla,  
          c.pregunta_id,
          c.respuesta_esperada
       FROM se_reglas r
       JOIN se_condiciones c ON r.id = c.regla_id`
    );
    
    // 3. Agrupar
    const reglasAgrupadas = {};
    todasLasCondiciones.forEach(cond => {
      if (!reglasAgrupadas[cond.regla_id]) {
        reglasAgrupadas[cond.regla_id] = {
          codigo_cif: cond.codigo_cif_final,
          // Guardamos la descripción correcta que viene de la BD
          descripcion: cond.descripcion_regla, 
          condiciones: []
        };
      }
      reglasAgrupadas[cond.regla_id].condiciones.push(cond);
    });

    const codigosSugeridos = [];
    
    // 4. Inferencia: Lógica de "Mejor Coincidencia" (Flexible)
    for (const reglaId in reglasAgrupadas) {
      const regla = reglasAgrupadas[reglaId];
      
      let condicionesCumplidas = 0;
      let condicionesFallidas = 0;
      let condicionesTotales = regla.condiciones.length;

      for (const cond of regla.condiciones) {
        const respuestaUsuario = respuestasMap.get(cond.pregunta_id);

        // Si el usuario no respondió esta pregunta, la ignoramos (no suma ni resta)
        if (respuestaUsuario === undefined) {
          continue; 
        }

        // Comparamos respuestas (ignorando mayúsculas/minúsculas)
        if (String(respuestaUsuario).toLowerCase() === String(cond.respuesta_esperada).toLowerCase()) {
            condicionesCumplidas++;
        } else {
            condicionesFallidas++; 
        }
      }

      // CRITERIO: Si no falló en ninguna respuesta dada y acertó al menos una...
      if (condicionesFallidas === 0 && condicionesCumplidas > 0) {
        
        // Detectamos la gravedad automáticamente
        const gravedadDetectada = this._determinarGravedad(regla.codigo_cif);

        codigosSugeridos.push({
            codigo: regla.codigo_cif,
            descripcion: regla.descripcion, // Ahora sí tendrá texto real
            gravedad: gravedadDetectada, 
            coincidencia: (condicionesCumplidas / condicionesTotales) * 100
        });
      }
    }
    
    // Fallback si no encuentra nada
    if (codigosSugeridos.length === 0) {
        console.warn("⚠️ Sistema Experto: No se encontraron reglas coincidentes.");
        return [{
            codigo: "N/A",
            descripcion: "No se encontró un diagnóstico específico con los datos proporcionados.",
            gravedad: "NINGUNA",
            es_error: true 
        }];
    }

    // Ordenar por mejor coincidencia
    codigosSugeridos.sort((a, b) => b.coincidencia - a.coincidencia);

    return codigosSugeridos;
  }
}

module.exports = Experto;