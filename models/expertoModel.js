// Importa tu pool de conexión (¡asegúrate que la ruta sea correcta!)
const db = require('../util/database');

class Experto {

  /**
   * Obtiene todas las preguntas para una categoría padre específica.
   * (ej. 'b1' -> trae 'P_CONCIENCIA', 'P_ORIENTACION', etc.)
   */
  static async getPreguntas(categoriaPadre) {
    // --- ¡CAMBIO AQUÍ! ---
    // Usamos 'LIKE' y concatenamos el '%' al parámetro
    const [rows] = await db.execute(
      'SELECT id, codigo_pregunta, texto_pregunta, tipo_respuesta FROM se_preguntas WHERE categoria_padre LIKE ?',
      [`${categoriaPadre}%`] // Esto convierte 'd' en 'd%' (todo lo que empiece con d)
    );
    // ---------------------
    return rows;
  }

  /**
   * Motor de Inferencia (Encadenamiento hacia adelante).
   * Recibe las respuestas del usuario y devuelve los códigos CIF sugeridos.
   */
  static async evaluar(respuestas) {
    // 1. Convertir las respuestas del usuario en un Mapa para búsqueda rápida
    // Entrada: [{ pregunta_id: 1, respuesta: 'ligero' }]
    // Mapa: { 1 => 'ligero' }
    const respuestasMap = new Map();
    respuestas.forEach(r => {
      respuestasMap.set(r.pregunta_id, r.respuesta);
    });

    // 2. Traer TODAS las reglas y sus condiciones de la BD
    const [todasLasCondiciones] = await db.execute(
      `SELECT 
         r.id AS regla_id,
         r.codigo_cif_final,
         c.pregunta_id,
         c.respuesta_esperada
       FROM se_reglas r
       JOIN se_condiciones c ON r.id = c.regla_id`
    );
    
    // 3. Agrupar condiciones por regla
    // Resultado: { 1: { codigo_cif: 'b110.1', condiciones: [...] }, ... }
    const reglasAgrupadas = {};
    todasLasCondiciones.forEach(cond => {
      if (!reglasAgrupadas[cond.regla_id]) {
        reglasAgrupadas[cond.regla_id] = {
          codigo_cif: cond.codigo_cif_final,
          condiciones: []
        };
      }
      reglasAgrupadas[cond.regla_id].condiciones.push(cond);
    });

    // 4. El Motor de Inferencia: Iterar sobre cada regla y validarla
    const codigosSugeridos = [];
    
    for (const reglaId in reglasAgrupadas) {
      const regla = reglasAgrupadas[reglaId];
      let todasLasCondicionesCumplidas = true; // Asumimos que la regla es válida

      // 5. Validar cada condición de la regla
      for (const cond of regla.condiciones) {
        // ¿El usuario respondió a esta pregunta? ¿Y la respuesta coincide?
        if (respuestasMap.get(cond.pregunta_id) !== cond.respuesta_esperada) {
          // Si una sola condición falla, la regla es falsa
          todasLasCondicionesCumplidas = false;
          break; // Dejar de revisar esta regla
        }
      }

      // 6. Si todas las condiciones pasaron, ¡esta regla es un éxito!
      if (todasLasCondicionesCumplidas) {
        codigosSugeridos.push({
            codigo: regla.codigo_cif,
            descripcion: regla.descripcion_regla || ''
        });
      }
    }
    
    return codigosSugeridos;
  }
}

module.exports = Experto;