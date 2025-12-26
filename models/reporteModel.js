
const  db  = require('../util/database'); 

class Reporte {

  // --- Modelo para Reporte por Paciente ---
  static async getPacienteById(pacienteId) {
    const [rows] = await db.query(
      "SELECT * FROM paciente WHERE carnet_identidad = ?", 
      [pacienteId]
    );
    return rows[0]; // Devuelve solo el primer resultado (o undefined)
  }

  static async getCalificacionesByPaciente(pacienteId) {
    // Asumo que la Primary Key de 'paciente' es 'id' 
    // y la Foreign Key en 'calificaciones' es 'id_paciente'
    const [rows] = await db.query(
      `SELECT cal.* FROM calificaciones AS cal
       JOIN paciente AS pac ON cal.id_paciente = pac.id_paciente
       WHERE pac.carnet_identidad = ? 
       ORDER BY cal.fecha_creacion DESC`,
      [pacienteId]
    );
    return rows;
  }

  // --- Modelo para Reporte Total ---
  static async getTotalPacientes() {
    const [rows] = await db.query(
      "SELECT carnet_identidad, nombre,edad, telefono, direccion FROM paciente ORDER BY nombre ASC"
    );
    return rows;
  }

  // --- Modelo para Reporte Diario ---
  static async getCalificacionesDiarias() {
    const [rows] = await db.query(
      `SELECT cal.id, cal.fecha_creacion, cal.observaciones, cal.id_paciente, pac.nombre 
       FROM calificaciones AS cal
       JOIN paciente AS pac ON cal.id_paciente = pac.carnet_identidad
       WHERE DATE(cal.fecha_creacion) = CURDATE()
       ORDER BY cal.fecha_creacion ASC`
    );
    return rows;
  }

  // --- Modelo para Reporte Mensual ---
 static async getCalificacionesMensual(fechaInicio, fechaFin) {
    const [rows] = await db.query(
      `SELECT cal.id, cal.fecha_creacion, cal.observaciones, cal.id_paciente, 
         pac.nombre
       FROM calificaciones AS cal
       JOIN paciente AS pac ON cal.id_paciente = pac.id_paciente
       WHERE cal.fecha_creacion >= ? AND cal.fecha_creacion < ?
       ORDER BY cal.fecha_creacion ASC`,
      [fechaInicio, fechaFin] // Ej: ['2025-10-01', '2025-11-01']
    );
    return rows;
  }

  // --- Modelo para Reporte por Rango ---
  static async getCalificacionesRango(fechaInicio, fechaFinSiguiente) {
    const [rows] = await db.query(
      `SELECT cal.id, cal.fecha_creacion, cal.observaciones, cal.id_paciente, 
         pac.nombre
       FROM calificaciones AS cal
       JOIN paciente AS pac ON cal.id_paciente = pac.id_paciente
       WHERE cal.fecha_creacion >= ? AND cal.fecha_creacion < ?
       ORDER BY cal.fecha_creacion ASC`,
      [fechaInicio, fechaFinSiguiente] // ej: ['2025-10-01', '2025-11-10']
    );
    return rows;
  }

  static async getDistribucionZonas() {
    // Esta consulta agrupa por Nombre de Zona y por Área (Urbana/Rural)
    // Devuelve: Zona, Area, Cantidad
    const sql = `
      SELECT 
        IFNULL(z.nombre_zona, 'Sin Zona Asignada') as zona, 
        IFNULL(p.area, 'Sin Área') as area, 
        COUNT(p.id_paciente) as cantidad_pacientes
      FROM paciente p
      LEFT JOIN zona z ON p.id_zona = z.id_zona
      GROUP BY z.nombre_zona, p.area
      ORDER BY cantidad_pacientes DESC;
    `;
    
    const [rows] = await db.query(sql);
    return rows;
  }

static async getDistribucionAreas() {
    const sql = `
      SELECT 
        IFNULL(z.tipo_area, 'Sin Clasificar') as area, 
        
        COUNT(p.id_paciente) as cantidad
      
      FROM paciente p
      LEFT JOIN zona z ON p.id_zona = z.id_zona
      
      GROUP BY z.tipo_area
      ORDER BY cantidad DESC;
    `;
    
    try {
        const [rows] = await db.query(sql);
        return rows;
    } catch (error) {
        console.error("Error en getDistribucionAreas:", error);
        throw error;
    }
}

  static async getProductividadAnual() {
    const sql = `
      SELECT 
        DATE_FORMAT(fecha_creacion, '%Y-%m') as mes_anio, -- Devuelve "2025-10"
        COUNT(id) as cantidad
      FROM calificaciones
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH) -- Solo últimos 12 meses
      GROUP BY mes_anio
      ORDER BY mes_anio ASC;
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getNivelesDiscapacidad() {
    const sql = `SELECT 
    CASE 
        WHEN UPPER(resultado_global) LIKE 'NINGUN%' THEN 'NINGUNO'
        WHEN UPPER(resultado_global) LIKE 'LIGER%' THEN 'LIGERO'
        WHEN UPPER(resultado_global) LIKE 'MODERAD%' THEN 'MODERADO'
        WHEN UPPER(resultado_global) LIKE 'GRAVE%' THEN 'GRAVE'
        WHEN UPPER(resultado_global) LIKE 'COMPLET%' THEN 'COMPLETO'
        ELSE UPPER(resultado_global)
    END as nivel, 
    COUNT(id) as cantidad
FROM calificaciones
WHERE resultado_global IS NOT NULL 
  AND resultado_global != ''
GROUP BY nivel
ORDER BY FIELD(nivel, 'NINGUNO', 'LIGERO', 'MODERADO', 'GRAVE', 'COMPLETO');`;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getVencimientosAnuales() {
    const sql = `
      SELECT 
        p.nombre,
        p.carnet_identidad,
        p.telefono,
        c.fecha_vencimiento,
        c.resultado_global  -- Usamos la columna nueva para mostrar su grado actual
      FROM calificaciones c
      JOIN paciente p ON c.id_paciente = p.id_paciente
      WHERE YEAR(c.fecha_vencimiento) = YEAR(CURDATE()) -- Solo las que vencen este año
        AND c.fecha_vencimiento >= CURDATE() -- Opcional: Que venzan de hoy en adelante (no las ya vencidas)
      ORDER BY c.fecha_vencimiento ASC;
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

  static async getProductividadAnual() {
    const sql = `
      SELECT 
        DATE_FORMAT(fecha_creacion, '%Y-%m') as mes_anio, 
        COUNT(id) as cantidad
      FROM calificaciones
      WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 12 MONTH) -- Solo último año
      GROUP BY mes_anio
      ORDER BY mes_anio ASC;
    `;
    const [rows] = await db.query(sql);
    return rows;
  }

}





module.exports = Reporte;

