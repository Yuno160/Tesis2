const express = require('express');
const pacienteController = require('../controllers/patientController');
const router = express.Router();

router.get('/', pacienteController.getAllPacientes);

// Ruta para crear un nuevo paciente
router.post('/', pacienteController.createPaciente);

router.put('/edit/:carnet_identidad', pacienteController.updatePatient);

router.get('/ci/:carnet', pacienteController.getPacienteByCarnet);

router.delete('/delete/:carnet_identidad', pacienteController.deletePatient);

// GET /api/pacientes/:id (Obtener uno por ID)
router.get('/id/:id', pacienteController.getPacienteById);



module.exports = router;
