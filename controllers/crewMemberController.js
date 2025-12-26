// controllers/patientController.js
const CrewMembers = require('../models/crew.model');

// Función para obtener todos los pacientes
exports.getAllCrewMembers = async (req, res, next) => {
    try {
        const [allMembers] = await CrewMembers.getAll();
        res.status(200).json(allMembers);
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getAllCrewbyCode = async (req, res, next) => {
    try {
        const [allMembers] = await CrewMembers.getAllByCrewCode();
        res.status(200).json(allMembers);
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};
