const express = require('express');
const pacienteController = require('../controllers/patientController');
const upload = require('../middleware/upload'); // Importa tu middleware de Multer
const router = express.Router();


router.get('/', pacienteController.getAllPacientes);

// Ruta para crear un nuevo paciente
router.post('/crear', pacienteController.createPaciente);

router.put('/edit/:carnet_identidad', pacienteController.updatePatient);

router.get('/ci/:carnet', pacienteController.getPacienteByCarnet);

router.delete('/delete/:carnet_identidad', pacienteController.deletePatient);

// GET /api/pacientes/:id (Obtener uno por ID)
router.get('/id/:id', pacienteController.getPacienteById);

router.get('/buscar/:carnet_identidad', pacienteController.buscarPorCarnet);

router.post('/foto', upload.single('archivo'), pacienteController.actualizarFotoPerfil);

router.get('/zonas', pacienteController.getZonas);

module.exports = router;
