const ConfiguracionCIF = require('../models/configuracionCIF');

exports.getAllConfiguraciones = async (req, res, next) => {
    try {
        const [configuraciones] = await ConfiguracionCIF.getAll();
        res.status(200).json(configuraciones);
    } catch (err) {
        next(err);
    }
};

exports.createConfiguracion = async (req, res, next) => {
    const { codigo_cif, baremo, descripcion } = req.body;

    if (!codigo_cif || !baremo) {
        return res.status(400).json({ message: 'El código CIF y el baremo son obligatorios.' });
    }

    try {
        await ConfiguracionCIF.save(codigo_cif, baremo, descripcion);
        res.status(201).json({ message: 'Configuración CIF creada con éxito.' });
    } catch (err) {
        next(err);
    }
};

exports.updateConfiguracion = async (req, res, next) => {
    const { id } = req.params;
    const { codigo_cif, baremo, descripcion } = req.body;

    if (!codigo_cif || !baremo) {
        return res.status(400).json({ message: 'El código CIF y el baremo son obligatorios.' });
    }

    try {
        const [result] = await ConfiguracionCIF.update(id, codigo_cif, baremo, descripcion);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Configuración CIF no encontrada.' });
        }
        res.status(200).json({ message: 'Configuración CIF actualizada con éxito.' });
    } catch (err) {
        next(err);
    }
};

exports.deleteConfiguracion = async (req, res, next) => {
    const { id } = req.params;

    try {
        const [result] = await ConfiguracionCIF.delete(id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Configuración CIF no encontrada.' });
        }
        res.status(200).json({ message: 'Configuración CIF eliminada con éxito.' });
    } catch (err) {
        next(err);
    }
};
