const db = require('../util/database');

module.exports = class Appointment {
    constructor(id_cita, id_paciente, id_profesional, fecha_hora, estado) {
        this.id_cita = id_cita;
        this.id_paciente = id_paciente;
        this.id_profesional = id_profesional;
        this.fecha_hora = fecha_hora;
        this.estado = estado;
    }

    static getAll() {
        return db.execute(`
    SELECT 
      a.id_cita, 
      a.fecha_hora, 
      a.estado, 
      p.nombre, 
      p.carnet_identidad, 
      p.telefono, 
      p.direccion
    FROM appointments a
    JOIN paciente p ON a.id_paciente = p.id_paciente;
  `);
    }

    static getById(id) {
        return db.execute('SELECT * FROM Appointments WHERE id_cita = ?', [id]);
    }

    static save(id_paciente, id_crew, fecha_hora, estado = 'Agendada') {
        return db.execute(
            'INSERT INTO Appointments (id_paciente, id_profesional, fecha_hora, estado) VALUES (?, ?, ?, ?)',
            [id_paciente, id_crew, fecha_hora, estado]
        );
    }

    static update(id_cita, id_paciente, id_profesional, fecha_hora, estado) {
        return db.execute(
            'UPDATE Appointments SET id_paciente = ?, id_profesional = ?, fecha_hora = ?, estado = ? WHERE id_cita = ?',
            [id_paciente, id_profesional, fecha_hora, estado, id_cita]
        );
    }

    static delete(id_cita) {
        return db.execute('DELETE FROM Appointments WHERE id_cita = ?', [id_cita]);
    }
};
