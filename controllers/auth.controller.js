
const db = require('../util/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 

// Define una clave secreta para firmar los tokens
// (En producción, esto debería ir en un archivo .env)
const JWT_SECRET = 'mi_clave_secreta_super_segura_tesis_2025';

const login = async (req, res) => {
  try {
    const { usuario, password } = req.body;

    // 1. Buscar el usuario en la BD
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE usuario = ? AND estado = 1', 
      [usuario]
    );

    // Si no existe o está inactivo
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
    }

    const user = rows[0];

    // 2. Verificar Contraseña
    // --- MODO PRUEBA (Texto Plano) ---
    // Usamos esto porque en la BD insertaste '123456' directamente
    if (password !== user.password) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }
    
    /* --- MODO SEGURO (Encriptado con Bcrypt) ---
       (Activa esto cuando creemos usuarios desde el sistema)
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }
    */

    // 3. Generar el Token (JWT)
    // Guardamos el ID y el ROL dentro del token
    const token = jwt.sign(
      { 
        id: user.id, 
        rol: user.rol, 
        nombre: user.nombre_completo 
      },
      JWT_SECRET,
      { expiresIn: '8h' } // El token expira en 8 horas (jornada laboral)
    );

    // 4. Responder al Frontend
    res.json({
      message: 'Login exitoso',
      token: token,
      usuario: {
        id: user.id,
        nombre: user.nombre_completo,
        rol: user.rol,
        cargo: user.cargo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  login,
  JWT_SECRET // Exportamos el secreto para usarlo en el middleware después
};