const db = require('../util/database');

module.exports = class Profesional {
    constructor(id_paciente,nombre, cargo, correo, telefono) {
        this.id_paciente=id_paciente;
        this.nombre = nombre;
        this.cargo = cargo;
        this.correo = correo;
        this.telefono = telefono;
    }

    static getAll() {
        return db.execute('SELECT * FROM Profesional');
    }

    static create(nombre, cargo, correo, telefono) {
        return db.execute('INSERT INTO Profesional (nombre, cargo, correo, telefono) VALUES (?, ?, ?, ?)', 
            [nombre, cargo, correo, telefono]);
    }

    static update(id, nombre, cargo, correo, telefono) {
        return db.execute(
            'UPDATE Profesional SET nombre = ?, cargo = ?, correo = ?, telefono = ? WHERE id_profesional = ?',
            [nombre, cargo, correo, telefono, id]
        );
    }

    static delete(id) {
        return db.execute('DELETE FROM Profesional WHERE id_profesional = ?', [id]);
    }
};
