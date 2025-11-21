const db = require('../util/database');
class Usuario {

  /**
   * GET: Obtener todos los usuarios (menos la contraseña)
   */
  static async getAll() {
    const [rows] = await db.query(
      "SELECT id, nombre_completo, usuario, rol, cargo, estado, fecha_creacion FROM usuarios ORDER BY nombre_completo ASC"
    );
    return rows;
  }

  /**
   * GET: Obtener un usuario por ID
   */
  static async getById(id) {
    const [rows] = await db.query(
      "SELECT id, nombre_completo, usuario, rol, cargo, estado FROM usuarios WHERE id = ?",
      [id]
    );
    return rows[0];
  }

  /**
   * POST: Crear usuario
   */
  static async create(data) {
    const { nombre_completo, usuario, password, rol, cargo } = data;
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre_completo, usuario, password, rol, cargo) VALUES (?, ?, ?, ?, ?)",
      [nombre_completo, usuario, password, rol, cargo]
    );
    return { id: result.insertId, ...data };
  }

  /**
   * PUT: Actualizar usuario (CON contraseña nueva)
   */
  static async updateWithPassword(id, data) {
    const { nombre_completo, usuario, password, rol, cargo } = data;
    const [result] = await db.query(
      "UPDATE usuarios SET nombre_completo=?, usuario=?, password=?, rol=?, cargo=? WHERE id=?",
      [nombre_completo, usuario, password, rol, cargo, id]
    );
    return result.affectedRows;
  }

  /**
   * PUT: Actualizar usuario (SIN tocar la contraseña)
   */
  static async updateWithoutPassword(id, data) {
    const { nombre_completo, usuario, rol, cargo } = data;
    const [result] = await db.query(
      "UPDATE usuarios SET nombre_completo=?, usuario=?, rol=?, cargo=? WHERE id=?",
      [nombre_completo, usuario, rol, cargo, id]
    );
    return result.affectedRows;
  }

  /**
   * DELETE: Eliminar usuario
   */
  static async delete(id) {
    const [result] = await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
    return result.affectedRows;
  }
}

module.exports = Usuario;