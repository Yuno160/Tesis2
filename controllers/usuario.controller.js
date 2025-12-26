const Usuario = require('../models/usuario');
const bcrypt = require('bcryptjs'); 

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

// --- 1. CREAR USUARIO (Con id_equipo) ---
const createUsuario = async (req, res, next) => {
  try {
    // Desestructuramos el nuevo campo id_equipo
    console.log("📦 Datos recibidos del Frontend Usuario:", req.body);
    const { nombre_completo, usuario, password, rol, cargo, id_equipo } = req.body;

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
      password: hashPassword, 
      rol,
      cargo,
      id_equipo // <--- Pasamos el equipo al modelo (puede ser null)
    });

    delete nuevoUsuario.password; 
    res.status(201).json(nuevoUsuario);

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'El nombre de usuario ya existe' });
    }
    next(error);
  }
};

// --- 2. EDITAR USUARIO (Con id_equipo) ---
const updateUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Recibimos id_equipo también al editar
    const { nombre_completo, usuario, password, rol, cargo, id_equipo } = req.body;

    let affectedRows = 0;

    // Si viene password, la encriptamos y actualizamos todo
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      
      affectedRows = await Usuario.updateWithPassword(id, {
        nombre_completo, 
        usuario, 
        password: hashPassword, 
        rol, 
        cargo,
        id_equipo // <--- Actualizamos equipo
      });
    } else {
      // Si no viene password, actualizamos solo los datos
      affectedRows = await Usuario.updateWithoutPassword(id, {
        nombre_completo, 
        usuario, 
        rol, 
        cargo,
        id_equipo // <--- Actualizamos equipo
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

// --- 3. NUEVO MÉTODO: LISTAR EQUIPOS PARA COMBO BOX ---
const getEquipos = async (req, res, next) => {
  try {
    // Llamamos al método estático que creamos en el Modelo
    const equipos = await Usuario.getAllEquipos();
    res.json(equipos);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getEquipos // <--- No olvides exportarlo
};