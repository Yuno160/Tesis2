const express = require('express');
const evaluationController = require('../controllers/evaluationController');
const router = express.Router();

router.get('/', evaluationController.getAllEvaluations);
router.get('/:id', evaluationController.getEvaluationById);
router.post('/', evaluationController.createEvaluation);
router.put('/:id', evaluationController.updateEvaluation);
router.delete('/:id', evaluationController.deleteEvaluation);

module.exports = router;
