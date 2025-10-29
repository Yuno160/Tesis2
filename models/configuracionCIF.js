const db = require('../util/database');

module.exports = class ConfiguracionCIF {
    constructor(id_configuracion, codigo_cif, baremo, descripcion) {
        this.id_configuracion = id_configuracion;
        this.codigo_cif = codigo_cif;
        this.baremo = baremo;
        this.descripcion = descripcion;
    }

    static getAll() {
        return db.execute('SELECT * FROM ConfiguracionCIF');
    }

    static save(codigo_cif, baremo, descripcion) {
        return db.execute(
            'INSERT INTO ConfiguracionCIF (codigo_cif, baremo, descripcion) VALUES (?, ?, ?)',
            [codigo_cif, baremo, descripcion]
        );
    }

    static update(id, codigo_cif, baremo, descripcion) {
        return db.execute(
            'UPDATE ConfiguracionCIF SET codigo_cif = ?, baremo = ?, descripcion = ? WHERE id_configuracion = ?',
            [codigo_cif, baremo, descripcion, id]
        );
    }

    static delete(id) {
        return db.execute('DELETE FROM ConfiguracionCIF WHERE id_configuracion = ?', [id]);
    }
};
