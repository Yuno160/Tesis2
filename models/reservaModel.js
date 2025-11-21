// models/reserva.model.js
const db  = require('../util/database'); // O '../util/database'

class Reserva {

  /**
   * GET: Trae todas las reservas para llenar el calendario.
   * Hacemos JOIN con 'paciente' para obtener el nombre.
   */
  static async getAll() {
    const [rows] = await db.query(
      `SELECT 
         r.id, 
         r.fecha_hora_inicio, 
         r.fecha_hora_fin, 
         r.estado, 
         p.nombre,
         p.carnet_identidad
       FROM reservas AS r
       JOIN paciente AS p ON r.id_paciente = p.id_paciente
       WHERE r.estado != 'Completada'
       ORDER BY r.fecha_hora_inicio ASC`
    );
    return rows;
  }

  /**
   * POST: Crea una nueva reserva.
   * Recibe el ID numérico del paciente (PK).
   */
  static async create(idPaciente, fechaHoraInicio, fechaHoraFin, observaciones) {
    const [result] = await db.query(
      `INSERT INTO reservas 
         (id_paciente, fecha_hora_inicio, fecha_hora_fin, observaciones, estado) 
       VALUES (?, ?, ?, ?, 'Agendada')`,
      [idPaciente, fechaHoraInicio, fechaHoraFin, observaciones]
    );
    // Devolvemos el ID de la nueva reserva creada
    return { id: result.insertId, id_paciente: idPaciente, fecha_hora_inicio: fechaHoraInicio };
  }

  /**
   * GET (By ID) - (Nueva)
   * Obtiene una reserva específica y los datos del paciente asociado.
   */
  static async getById(idReserva) {
    const [rows] = await db.query(
      `SELECT 
         r.id, 
         r.fecha_hora_inicio, 
         r.observaciones, 
         r.id_paciente,
         p.carnet_identidad, 
         p.nombre
       FROM reservas AS r
       JOIN paciente AS p ON r.id_paciente = p.id_paciente
       WHERE r.id = ?`,
      [idReserva]
    );
    return rows[0]; // Devuelve la reserva o undefined
  }

  /**
   * PUT (Update) - (Nueva)
   * Actualiza las observaciones o la fecha de una reserva.
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
   * DELETE (Delete) - (Nueva)
   * Elimina una reserva de la base de datos.
   */
  static async delete(idReserva) {
    const [result] = await db.query(
      "DELETE FROM reservas WHERE id = ?",
      [idReserva]
    );
    return result.affectedRows; // Devuelve 1 si fue exitoso
  }

// src/models/reserva.model.js

  static async getByDate(fecha) {
    const [rows] = await db.query(
      `SELECT 
         r.id, r.fecha_hora_inicio, r.fecha_hora_fin, r.estado, r.observaciones,
         p.id_paciente AS id_paciente, 
         p.nombre, 
         p.carnet_identidad,
         p.edad 
       FROM reservas AS r
       JOIN paciente AS p ON r.id_paciente = p.id_paciente
       WHERE DATE(r.fecha_hora_inicio) = ? 
       AND r.estado != 'Completada'
       ORDER BY r.fecha_hora_inicio ASC`,
      [fecha]
    );
    return rows;
  }

  /**
   * CUENTA las reservas de una fecha específica (ej. HOY)
   */
  static async countByDate(fecha) { // fecha formato 'YYYY-MM-DD'
    const [rows] = await db.query(
      "SELECT COUNT(*) as total FROM reservas WHERE DATE(fecha_hora_inicio) = ?",
      [fecha]
    );
    return rows[0].total;
  }

  static async updateEstado(idReserva, nuevoEstado) {
    const [result] = await db.query(
      "UPDATE reservas SET estado = ? WHERE id = ?",
      [nuevoEstado, idReserva]
    );
    return result.affectedRows;
  }
  
}

module.exports = Reserva;