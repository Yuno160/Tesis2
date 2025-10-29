const express = require('express');
const gradoDiscapacidadController = require('../controllers/gradoDiscapacidadController');
const router = express.Router();

router.get('/', gradoDiscapacidadController.getAllGrados);
router.get('/:id', gradoDiscapacidadController.getGradoById);
router.post('/', gradoDiscapacidadController.createGrado);
router.put('/:id', gradoDiscapacidadController.updateGrado);
router.delete('/:id', gradoDiscapacidadController.deleteGrado);

module.exports = router;
