const db = require('../util/database');

module.exports = class Crew {

    // Obtener todos los crews activos (para llenar el select del frontend)
    static getAll() {
        return db.query('SELECT * FROM crews WHERE activo = 1');
    }

    // 🔥 LA JOYA DE LA CORONA: BUSCAR CREW DISPONIBLE
    // Esta función recibe fecha y hora, y devuelve qué equipos NO tienen cita
    static async getDisponibles(fechaHoraInicio, fechaHoraFin) {
        /*
          Lógica SQL:
          Selecciona todos los CREWS
          QUE NO ESTÉN en la lista de (Reservas activas en ese horario)
        */
        const [rows] = await db.query(`
            SELECT c.* FROM crews c
            WHERE c.activo = 1 
            AND c.id_crew NOT IN (
                SELECT r.id_crew 
                FROM reservas r 
                WHERE r.estado NOT IN ('Cancelada', 'Completada')
                AND (
                    (r.fecha_hora_inicio < ? AND r.fecha_hora_fin > ?) OR 
                    (r.fecha_hora_inicio >= ? AND r.fecha_hora_inicio < ?)
                )
                AND r.id_crew IS NOT NULL
            )
        `, [fechaHoraFin, fechaHoraInicio, fechaHoraInicio, fechaHoraFin]);
        
        return rows;
    }

    static async checkPacienteTieneCita(idPaciente) {
    const [rows] = await db.query(
        "SELECT id FROM reservas WHERE id_paciente = ? AND estado = 'Agendada'", 
        [idPaciente]
    );
    return rows.length > 0;
}
};