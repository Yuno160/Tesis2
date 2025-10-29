const db = require('../util/database');
module.exports = class Regla {
    constructor(id_regla, id_pregunta, valor_respuesta, codigo_cif) {
        this.id_regla = id_regla,
        this.id_pregunta = id_pregunta,
        this.valor_respuesta = valor_respuesta
        this.codigo_cif = codigo_cif
    }

    
    static async findByPreguntaAndValor(id_pregunta, valor_respuesta) {
        const query = `
            SELECT * FROM reglas 
            WHERE id_pregunta = ? AND valor_respuesta = ?
        `;
        const [rows] = await db.execute(query, [id_pregunta, valor_respuesta]);
        return rows[0]; // Devuelve la primera regla que coincida
    }

    
    
};