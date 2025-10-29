const Evaluacion = require('../models/evaluation');

exports.getAllEvaluations = async (req, res, next) => {
    const { paciente, profesional } = req.query;

    try {
        const [evaluations] = await Evaluacion.getAll({ paciente, profesional });
        res.status(200).json(evaluations);
    } catch (err) {
        next(err);
    }
};

exports.getEvaluationById = async (req, res, next) => {
    const { id } = req.params;

    try {
        const [evaluation] = await Evaluacion.findById(id);
        if (evaluation.length === 0) {
            return res.status(404).json({ message: 'Evaluación no encontrada' });
        }
        res.status(200).json(evaluation[0]);
    } catch (err) {
        next(err);
    }
};

exports.createEvaluation = async (req, res, next) => {
    const { id_paciente, id_profesional, codigo_cif, detalle } = req.body;

    if (!id_paciente || !id_profesional || !codigo_cif) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    try {
        await Evaluacion.save(id_paciente, id_profesional, codigo_cif, detalle);
        res.status(201).json({ message: 'Evaluación creada exitosamente' });
    } catch (err) {
        next(err);
    }
};

exports.updateEvaluation = async (req, res, next) => {
    const { id } = req.params;
    const { codigo_cif, detalle } = req.body;

    if (!codigo_cif) {
        return res.status(400).json({ message: 'El código CIF es obligatorio' });
    }

    try {
        const [result] = await Evaluacion.update(id, codigo_cif, detalle);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Evaluación no encontrada' });
        }
        res.status(200).json({ message: 'Evaluación actualizada exitosamente' });
    } catch (err) {
        next(err);
    }
};

exports.deleteEvaluation = async (req, res, next) => {
    const { id } = req.params;

    try {
        const [result] = await Evaluacion.delete(id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Evaluación no encontrada' });
        }
        res.status(200).json({ message: 'Evaluación eliminada exitosamente' });
    } catch (err) {
        next(err);
    }
};
