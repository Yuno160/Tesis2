// routes/reserva.routes.js
const express = require('express');
const router = express.Router();
const reservaController = require('../controllers/reservaController');
// const { authRequired } = require('../middlewares/validateToken.js'); // (Lo añadiremos después)

// GET /api/reservas -> Trae todas las reservas para el calendario
router.get('/', reservaController.getReservas);

// POST /api/reservas -> Crea una nueva reserva
router.post('/', reservaController.crearReserva);
router.get('/conteo-hoy', reservaController.getConteoHoy);

// Añade esto ANTES de la ruta /:id (para que no confunda 'hoy' con un ID)
router.get('/hoy', reservaController.getReservasHoy);

// GET /api/reservas/:id (Para obtener los datos de UNA reserva y llenar el modal)
router.get('/:id', reservaController.getReservaById);

// PUT /api/reservas/:id (Para actualizar la reserva)
router.put('/:id', reservaController.updateReserva);

// DELETE /api/reservas/:id (Para eliminar la reserva)
router.delete('/:id', reservaController.deleteReserva);

// --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
// 1. Usamos .put (para coincidir con el frontend)
// 2. Usamos /:id/estado (para capturar el ID que envía el frontend)
router.put('/:id/estado', reservaController.cambiarEstado);

module.exports = router;