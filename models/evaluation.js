const db = require('../util/database');

module.exports = class Evaluacion {
    constructor(id_evaluacion, id_paciente, id_profesional, codigo_cif, detalle) {
        this.id_evaluacion = id_evaluacion;
        this.id_paciente = id_paciente;
        this.id_profesional = id_profesional;
        this.codigo_cif = codigo_cif;
        this.detalle = detalle;
    }

    static getAll(filters = {}) {
        let query = 'SELECT * FROM Evaluacion';
        const params = [];

        if (filters.paciente) {
            query += ' WHERE id_paciente = ?';
            params.push(filters.paciente);
        } else if (filters.profesional) {
            query += ' WHERE id_profesional = ?';
            params.push(filters.profesional);
        }

        return db.execute(query, params);
    }

    static findById(id) {
        return db.execute('SELECT * FROM Evaluacion WHERE id_evaluacion = ?', [id]);
    }

    static save(id_paciente, id_profesional, codigo_cif, detalle) {
        return db.execute(
            'INSERT INTO Evaluacion (id_paciente, id_profesional, codigo_cif, detalle) VALUES (?, ?, ?, ?)',
            [id_paciente, id_profesional, codigo_cif, detalle]
        );
    }

    static update(id, codigo_cif, detalle) {
        return db.execute(
            'UPDATE Evaluacion SET codigo_cif = ?, detalle = ? WHERE id_evaluacion = ?',
            [codigo_cif, detalle, id]
        );
    }

    static delete(id) {
        return db.execute('DELETE FROM Evaluacion WHERE id_evaluacion = ?', [id]);
    }
};
