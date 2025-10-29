const db = require('../util/database');

module.exports = class GradoDiscapacidad {
    constructor(id_grado_discapacidad, id_paciente, grado, beneficios) {
        this.id_grado_discapacidad = id_grado_discapacidad;
        this.id_paciente = id_paciente;
        this.grado = grado;
        this.beneficios = beneficios;
    }

    static getAll() {
        return db.execute('SELECT * FROM GradoDiscapacidad');
    }

    static getById(id) {
        return db.execute('SELECT * FROM GradoDiscapacidad WHERE id_grado_discapacidad = ?', [id]);
    }

    static save(id_paciente, grado, beneficios) {
        return db.execute(
            'INSERT INTO GradoDiscapacidad (id_paciente, grado, beneficios) VALUES (?, ?, ?)',
            [id_paciente, grado, beneficios]
        );
    }

    static update(id, grado, beneficios) {
        return db.execute(
            'UPDATE GradoDiscapacidad SET grado = ?, beneficios = ? WHERE id_grado_discapacidad = ?',
            [grado, beneficios, id]
        );
    }

    static delete(id) {
        return db.execute('DELETE FROM GradoDiscapacidad WHERE id_grado_discapacidad = ?', [id]);
    }
};
