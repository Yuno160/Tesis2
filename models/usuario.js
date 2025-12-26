const db = require('../util/database');

class Usuario {

  /**
   * GET: Obtener todos los usuarios
   * (Incluye id_equipo para saber a qué equipo pertenecen)
   */
  static async getAll() {
    const [rows] = await db.query(
      `SELECT 
        u.id, 
        u.nombre_completo, 
        u.usuario, 
        u.rol, 
        u.cargo, 
        u.estado, 
        u.fecha_creacion,
        u.id_equipo, -- <--- NUEVO
        e.nombre -- Opcional: Traemos el nombre del equipo si quieres mostrarlo en la tabla
       FROM usuarios u
       LEFT JOIN crews e ON u.id_equipo = e.id_crew
       ORDER BY u.nombre_completo ASC`
    );
    return rows;
  }

  /**
   * GET: Obtener un usuario por ID
   */
  static async getById(id) {
    const [rows] = await db.query(
      "SELECT id, nombre_completo, usuario, rol, cargo, estado, id_equipo FROM usuarios WHERE id = ?", // <--- Agregado id_equipo
      [id]
    );
    return rows[0];
  }

  /**
   * POST: Crear usuario
   */
  static async create(data) {
    // Desestructuramos id_equipo
    const { nombre_completo, usuario, password, rol, cargo, id_equipo } = data;
    
    const [result] = await db.query(
      "INSERT INTO usuarios (nombre_completo, usuario, password, rol, cargo, id_equipo) VALUES (?, ?, ?, ?, ?, ?)",
      [
        nombre_completo, 
        usuario, 
        password, 
        rol, 
        cargo, 
        id_equipo || null // <--- Si no envían equipo (ej: Admin), se guarda NULL
      ]
    );
    return { id: result.insertId, ...data };
  }

  /**
   * PUT: Actualizar usuario (CON contraseña nueva)
   */
  static async updateWithPassword(id, data) {
    const { nombre_completo, usuario, password, rol, cargo, id_equipo } = data;
    
    const [result] = await db.query(
      "UPDATE usuarios SET nombre_completo=?, usuario=?, password=?, rol=?, cargo=?, id_equipo=? WHERE id=?",
      [
        nombre_completo, 
        usuario, 
        password, 
        rol, 
        cargo, 
        id_equipo || null, // <--- Actualizamos equipo
        id
      ]
    );
    return result.affectedRows;
  }

  /**
   * PUT: Actualizar usuario (SIN tocar la contraseña)
   */
  static async updateWithoutPassword(id, data) {
    const { nombre_completo, usuario, rol, cargo, id_equipo } = data;
    
    const [result] = await db.query(
      "UPDATE usuarios SET nombre_completo=?, usuario=?, rol=?, cargo=?, id_equipo=? WHERE id=?",
      [
        nombre_completo, 
        usuario, 
        rol, 
        cargo, 
        id_equipo || null, // <--- Actualizamos equipo
        id
      ]
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

  /**
   * NUEVO: Obtener lista de equipos para el Combo Box
   * Esto lo usará el Controlador para enviarlo al Frontend
   */
  static async getAllEquipos() {
    // Asegúrate que tu tabla se llame 'equipos_calificadores' y tenga 'nombre_equipo'
    const [rows] = await db.query("SELECT id_crew, nombre FROM crews ORDER BY nombre ASC");
    return rows;
  }
}

module.exports = Usuario;