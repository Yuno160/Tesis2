// Importa tu db de conexión (¡asegúrate que la ruta sea correcta!)
// const db = require('../util/database'); // <-- Usa tu ruta de conexión
const  db  = require('../util/database'); // <-- O si es la que te di yo

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
}

module.exports = Reporte;