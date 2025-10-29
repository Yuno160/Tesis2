const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Usaremos JWT para autenticar
const router = express.Router();
const pool = require('./util/database'); // Conexión a la base de datos

// Clave secreta para JWT

const JWT_SECRET = 'contrasena123'; // Cambia esto por una clave más segura en producción
const contrasena = 'admin123'; // Contraseña que se intenta verificar
const hashObtenido = '$2b$10$C4mjfqzgBxMZFiRzPHF6zOEqzKqbpUvWJD3cIEZp5dFZ6To2WrUyq'; // Sustituye esto por el hash obtenido


bcrypt.hash(contrasena, 10, (err, hash) => {
    if (err) {
        console.log('Error al generar el hash:', err);
    } else {
        console.log('Hash generado:', hash);
        // Asegúrate de almacenar este hash en la base de datos
    }
});

bcrypt.compare(contrasena, hashObtenido, (err, result) => {
    if (err) {
        console.error('Error al comparar las contraseñas', err);
    } else {
        console.log('¿Las contraseñas coinciden?', result); // Debería devolver 'true' si las contraseñas coinciden
    }
});

// Endpoint de login
router.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    try {
        // Verificar si el usuario existe
        const [rows] = await pool.query('SELECT * FROM Usuario WHERE nombre_usuario = ?', [nombre_usuario]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const usuario = rows[0];

        // Limpiar la contraseña para eliminar espacios extraños
        const contrasenaLimpiada = contrasena.trim();

        // Verificar la contraseña
        const esValida = await bcrypt.compare(contrasenaLimpiada, usuario.contrasena);

        // Si la contraseña no es válida, muestra los logs y el error
        if (!esValida) {
            console.log('usuario:', nombre_usuario);
            console.log('contraseña proporcionada:', contrasenaLimpiada);
            console.log('contraseña hasheada en base de datos:', usuario.contrasena);
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Generar el token JWT
        const token = jwt.sign(
            { id_usuario: usuario.id_usuario, tipo_usuario: usuario.tipo_usuario },
            JWT_SECRET,
            { expiresIn: '8h' } // El token expira en 8 horas
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            tipo_usuario: usuario.tipo_usuario,
            nombre_usuario: usuario.nombre_usuario,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

module.exports = router;
