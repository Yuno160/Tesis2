const db = require('../util/database'); // Ajusta tu ruta de conexión

class Documento {
  
  // Guardar un nuevo documento
  static async create(idPaciente, nombreOriginal, rutaArchivo, tipoDocumento) {
    const sql = `
      INSERT INTO documentos (id_paciente, nombre_archivo, ruta_archivo, tipo_documento)
      VALUES (?, ?, ?, ?)
    `;
    return db.execute(sql, [idPaciente, nombreOriginal, rutaArchivo, tipoDocumento]);
  }

  // Listar documentos de un paciente
  static async getByPacienteId(idPaciente) {
    const sql = `SELECT * FROM documentos WHERE id_paciente = ? ORDER BY fecha_subida DESC`;
    const [rows] = await db.query(sql, [idPaciente]);
    return rows;
  }
  
  // (Opcional) Borrar documento
  static async delete(idDocumento) {
    return db.execute('DELETE FROM documentos WHERE id_documento = ?', [idDocumento]);
  }
}

module.exports = Documento;