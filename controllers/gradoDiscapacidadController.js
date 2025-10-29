const GradoDiscapacidad = require('../models/gradoDiscapacidad');

exports.getAllGrados = async (req, res, next) => {
    try {
        const [grados] = await GradoDiscapacidad.getAll();
        res.status(200).json(grados);
    } catch (err) {
        next(err);
    }
};

exports.getGradoById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const [grado] = await GradoDiscapacidad.getById(id);
        if (!grado.length) {
            return res.status(404).json({ message: 'Grado de discapacidad no encontrado' });
        }
        res.status(200).json(grado[0]);
    } catch (err) {
        next(err);
    }
};

exports.createGrado = async (req, res, next) => {
    const { id_paciente, grado, beneficios } = req.body;
    if (!id_paciente || !grado) {
        return res.status(400).json({ message: 'ID de paciente y grado son obligatorios' });
    }

    try {
        await GradoDiscapacidad.save(id_paciente, grado, beneficios || null);
        res.status(201).json({ message: 'Grado de discapacidad creado exitosamente' });
    } catch (err) {
        next(err);
    }
};

exports.updateGrado = async (req, res, next) => {
    const { id } = req.params;
    const { grado, beneficios } = req.body;

    if (!grado) {
        return res.status(400).json({ message: 'El grado es obligatorio' });
    }

    try {
        const result = await GradoDiscapacidad.update(id, grado, beneficios || null);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Grado de discapacidad no encontrado' });
        }
        res.status(200).json({ message: 'Grado de discapacidad actualizado exitosamente' });
    } catch (err) {
        next(err);
    }
};

exports.deleteGrado = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await GradoDiscapacidad.delete(id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Grado de discapacidad no encontrado' });
        }
        res.status(200).json({ message: 'Grado de discapacidad eliminado exitosamente' });
    } catch (err) {
        next(err);
    }
};
