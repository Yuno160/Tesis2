const express = require('express');
const crewController = require('../controllers/crewMemberController');
const router = express.Router();

// Ruta para listar todos los profesionales
router.get('/', crewController.getAllCrewMembers);

//Ruta para obtener los crews por crewCode
router.get('/crewcode', crewController.getAllCrewMembers);

module.exports = router;
