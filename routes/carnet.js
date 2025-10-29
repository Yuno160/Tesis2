const express = require('express');
const carnetController = require('../controllers/carnetController');
const router = express.Router();

router.get('/', carnetController.getAllCarnets);
router.get('/:id', carnetController.getCarnetById);
router.post('/', carnetController.createCarnet);
router.put('/:id', carnetController.updateCarnet);
router.delete('/:id', carnetController.deleteCarnet);

module.exports = router;
