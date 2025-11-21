const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs'); // Asegúrate de tenerlo instalado: npm install bcryptjs

const getAllUsuarios = async (req, res, next) => {
  try {
    const usuarios = await Usuario.getAll();
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
};

const getUsuarioById = async (req, res, next) => {
  try {
    const usuario = await Usuario.getById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    next(error);
  }
};

const createUsuario = async (req, res, next) => {
  try {
    const { nombre_completo, usuario, password, rol, cargo } = req.body;

    // Validaciones básicas
    if (!nombre_completo || !usuario || !password || !rol) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const nuevoUsuario = await Usuario.create({
      nombre_completo,
      usuario,
      password: hashPassword, // Guardamos el hash, no el texto plano
      rol,
      cargo
    });

    // No devolvemos el password en la respuesta
    delete nuevoUsuario.password; 
    res.status(201).json(nuevoUsuario);

  } catch (error) {
    // Error de duplicado (usuario ya existe)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }
    next(error);
  }
};

const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nombre_completo, usuario, password, rol, cargo } = req.body;

    let affectedRows = 0;

    // Si viene password, la encriptamos y actualizamos todo
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      
      affectedRows = await Usuario.updateWithPassword(id, {
        nombre_completo, usuario, password: hashPassword, rol, cargo
      });
    } else {
      // Si no viene password, actualizamos solo los datos
      affectedRows = await Usuario.updateWithoutPassword(id, {
        nombre_completo, usuario, rol, cargo
      });
    }

    if (affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    
    res.json({ message: 'Usuario actualizado correctamente' });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }
    next(error);
  }
};

const deleteUsuario = async (req, res, next) => {
  try {
    const affectedRows = await Usuario.delete(req.params.id);
    if (affectedRows === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario
};