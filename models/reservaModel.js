// models/reserva.model.js
const db = require('../util/database');

class Reserva {

  /**
   * 1. GET ALL: Trae todas las reservas activas para llenar el calendario.
   * Hacemos JOIN con 'paciente' para obtener el nombre.
   */
 static async getAll() {
    const [rows] = await db.query(
      `SELECT r.*, p.nombre, p.telefono, c.nombre as nombre_crew, c.color as color_crew
       FROM reservas r
       JOIN paciente p ON r.id_paciente = p.id_paciente
       LEFT JOIN crews c ON r.id_crew = c.id_crew  -- Join con la nueva tabla
       WHERE r.estado != 'Cancelada' -- Ojo: No mostramos las canceladas en el calendario normal
       ORDER BY r.fecha_hora_inicio ASC`
    );
    return rows;
}

  /**
   * 2. CREATE: Crea una nueva reserva.
   */
static async create(idPaciente, fechaHoraInicio, fechaHoraFin, observaciones, idCrew) {
  console.log("💾 GUARDANDO EN BD -> Crew ID Recibido:", idCrew);  
  const [result] = await db.query(
      `INSERT INTO reservas 
         (id_paciente, fecha_hora_inicio, fecha_hora_fin, observaciones, estado, id_crew) 
       VALUES (?, ?, ?, ?, 'Agendada', ?)`,
      [idPaciente, fechaHoraInicio, fechaHoraFin, observaciones, idCrew]
    );
    return { id: result.insertId };
}

  /**
   * 3. GET BY ID: Obtiene una reserva específica y los datos del paciente.
   * (Usado para cargar el modal de edición)
   */
  static async getById(idReserva) {
    const [rows] = await db.query(
      `SELECT 
         r.id, 
         r.fecha_hora_inicio, 
         r.fecha_hora_fin, 
         r.observaciones, 
         r.estado,
         r.id_paciente,
         p.carnet_identidad, 
         p.nombre,
         p.telefono /* <--- ¡NUEVO! */
       FROM reservas AS r
       JOIN paciente AS p ON r.id_paciente = p.id_paciente
       WHERE r.id = ?`,
      [idReserva]
    );
    return rows[0]; 
  }

  /**
   * 4. UPDATE: Actualiza fecha, hora y observaciones.
   * (Usado al darle "Actualizar Reserva" en el modal)
   */
  static async update(idReserva, fechaHoraInicio, fechaHoraFin, observaciones) {
    const [result] = await db.query(
      `UPDATE reservas SET 
         fecha_hora_inicio = ?, 
         fecha_hora_fin = ?, 
         observaciones = ?
       WHERE id = ?`,
      [fechaHoraInicio, fechaHoraFin, observaciones, idReserva]
    );
    return result.affectedRows; // Devuelve 1 si fue exitoso
  }

  /**
   * 5. DELETE: Elimina una reserva.
   */
  static async delete(idReserva) {
    const [result] = await db.query(
      "DELETE FROM reservas WHERE id = ?",
      [idReserva]
    );
    return result.affectedRows; 
  }

  /**
   * 6. GET BY DATE: Obtiene reservas de un día específico (Dashboard).
   */
  static async getByDate(fecha) {
    const [rows] = await db.query(
      `SELECT 
         r.id, r.fecha_hora_inicio, r.fecha_hora_fin, r.estado, r.observaciones,
         p.id_paciente AS id_paciente, 
         p.nombre, 
         p.carnet_identidad,
         p.edad,
         p.telefono
       FROM reservas AS r
       JOIN paciente AS p ON r.id_paciente = p.id_paciente
       WHERE DATE(r.fecha_hora_inicio) = ? 
       AND r.estado = 'Agendada'
       ORDER BY r.fecha_hora_inicio ASC`,
      [fecha]
    );
    return rows;
  }

  /**
   * 7. COUNT BY DATE: Cuenta cuántas reservas hay en una fecha.
   */
  static async countByDate(fecha) {
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM reservas WHERE DATE(fecha_hora_inicio) = ?",
      [fecha]
    );
    return rows[0].total;
  }

  /**
   * 8. UPDATE ESTADO: Cambia el estado (ej: 'Completada', 'Cancelada').
   */
  static async updateEstado(idReserva, nuevoEstado) {
    const [result] = await db.query(
      "UPDATE reservas SET estado = ? WHERE id = ?",
      [nuevoEstado, idReserva]
    );
    return result.affectedRows;
  }

  static async cancelar(idReserva) {
    const [result] = await db.query(
      "UPDATE reservas SET estado = 'Cancelada' WHERE id = ?",
      [idReserva]
    );
    return result.affectedRows;
}

static async checkChoqueUpdate(idReserva, idCrew, fechaInicio, fechaFin) {
    // Si no tiene crew asignado (raro, pero posible), no choca con nadie
    if (!idCrew) return [[]]; 

    return db.query(`
        SELECT * FROM reservas 
        WHERE id_crew = ? 
        AND id != ?  -- ¡IMPORTANTE! No chocar consigo misma
        AND estado NOT IN ('Cancelada', 'Completada')
        AND (
            (fecha_hora_inicio < ? AND fecha_hora_fin > ?) OR 
            (fecha_hora_inicio >= ? AND fecha_hora_inicio < ?)
        )
    `, [idCrew, idReserva, fechaFin, fechaInicio, fechaInicio, fechaFin]);
  }


  static async checkPacienteTieneCita(idPaciente) {
    const [rows] = await db.query(
        "SELECT id FROM reservas WHERE id_paciente = ? AND estado = 'Agendada'", 
        [idPaciente]
    );
    return rows.length > 0;
}
  
}



module.exports = Reserva;