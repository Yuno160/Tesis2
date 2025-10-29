const db = require('../util/database');
module.exports = class Pregunta {
    constructor(id_pregunta, texto_pregunta, categoria_cif, tipo_respuesta) {
        this.id_pregunta = id_pregunta,
        this.texto_pregunta = texto_pregunta,
        this.categoria_cif = categoria_cif,
        this.tipo_respuesta = tipo_respuesta

    }

    
    static obtenerTodas() {
        const query = 'SELECT * FROM preguntas';
        return db.execute(query);
    }

    
    
};