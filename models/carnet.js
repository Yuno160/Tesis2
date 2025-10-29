const db = require('../util/database');

module.exports = class Carnet {
    constructor(id_carnet, id_paciente, numero_carnet, fecha_emision, fecha_vencimiento) {
        this.id_carnet = id_carnet;
        this.id_paciente = id_paciente;
        this.numero_carnet = numero_carnet;
        this.fecha_emision = fecha_emision;
        this.fecha_vencimiento = fecha_vencimiento;
    }

    static getAll() {
        return db.execute(
            `SELECT Carnet.*, Paciente.nombre AS paciente_nombre 
             FROM Carnet 
             JOIN Paciente ON Carnet.id_paciente = Paciente.id_paciente`
        );
    }

    static getById(id) {
        return db.execute(
            `SELECT Carnet.*, Paciente.nombre AS paciente_nombre 
             FROM Carnet 
             JOIN Paciente ON Carnet.id_paciente = Paciente.id_paciente
             WHERE Carnet.id_carnet = ?`,
            [id]
        );
    }

    static save(id_paciente, numero_carnet, fecha_vencimiento) {
        return db.execute(
            'INSERT INTO Carnet (id_paciente, numero_carnet, fecha_vencimiento) VALUES (?, ?, ?)',
            [id_paciente, numero_carnet, fecha_vencimiento]
        );
    }

    static update(id, numero_carnet, fecha_vencimiento) {
        return db.execute(
            'UPDATE Carnet SET numero_carnet = ?, fecha_vencimiento = ? WHERE id_carnet = ?',
            [numero_carnet, fecha_vencimiento, id]
        );
    }

    static delete(id) {
        return db.execute('DELETE FROM Carnet WHERE id_carnet = ?', [id]);
    }
};
