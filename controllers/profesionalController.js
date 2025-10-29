const Profesional = require('../models/profesional');

exports.getAllProfesionales = async (req, res, next) => {
    try {
        const [profesionales] = await Profesional.getAll();
        res.status(200).json(profesionales);
    } catch (err) {
        next(err);
    }
};


exports.createProfesional = async (req, res, next) => {
    const { nombre, cargo, correo, telefono } = req.body;

    try {
        const newProfesional = await Profesional.create(nombre, cargo, correo, telefono);
        res.status(201).json({
            message: 'Profesional creado con éxito',
            patient: newProfesional
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};


exports.updateProfesional = async (req, res, next) => {
    const { id } = req.params;
    const { nombre, cargo, correo, telefono } = req.body;

    if (!nombre || !cargo) {
        return res.status(400).json({ message: 'Nombre y cargo son requeridos' });
    }

    try {
        const actualizado = await Profesional.update(id, nombre, cargo, correo, telefono);
        if (actualizado.affectedRows === 0) {
            return res.status(404).json({ message: 'Profesional no encontrado' });
        }
        res.status(200).json({ message: 'Profesional actualizado exitosamente' });
    } catch (err) {
        next(err);
    }
};

exports.deleteProfesional = async (req, res, next) => {
    const { id } = req.params;

    try {
        const eliminado = await Profesional.delete(id);
        if (eliminado.affectedRows === 0) {
            return res.status(404).json({ message: 'Profesional no encontrado' });
        }
        res.status(200).json({ message: 'Profesional eliminado exitosamente' });
    } catch (err) {
        next(err);
    }
};
