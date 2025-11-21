// controllers/reserva.controller.js
const Reserva = require('../models/reservaModel');
const { addHours } = require('date-fns'); // Librería para sumar 1 hora

/**
 * GET /api/reservas
 * Obtiene todas las reservas y las formatea para FullCalendar.
 */
const getReservas = async (req, res, next) => {
  try {
    const reservasDB = await Reserva.getAll();
    
    // Convertimos los datos de MySQL al formato que FullCalendar entiende
    const eventosFullCalendar = reservasDB.map(reserva => ({
      id: reserva.id.toString(), // ID debe ser string para FullCalendar
      title: `Cita: ${reserva.nombre}`,
      start: reserva.fecha_hora_inicio, // MySQL DATETIME es compatible con ISO
      end: reserva.fecha_hora_fin,
    }));
    
    res.status(200).json(eventosFullCalendar);

  } catch (error) {
    console.error("Error en getReservas:", error);
    next(error);
  }
};

/**
 * POST /api/reservas
 * Crea una nueva reserva (llamado desde el modal).
 */
const crearReserva = async (req, res, next) => {
  try {
    // El frontend (modal) enviará esto:
    const { id_paciente, fecha_hora_inicio, observaciones } = req.body;

    if (!id_paciente || !fecha_hora_inicio) {
      return res.status(400).json({ message: 'Faltan datos (id_paciente o fecha_hora_inicio)' });
    }

    // Calculamos la hora fin (1 hora después) 
    const fechaInicio = new Date(fecha_hora_inicio);
    const fechaFin = addHours(fechaInicio, 1);

    const nuevaReserva = await Reserva.create(
      id_paciente, 
      fechaInicio, // Pasamos el objeto Date (MySQL lo entiende)
      fechaFin, 
      observaciones
    );
    
    res.status(201).json(nuevaReserva); // Devolvemos 201 (Creado)

  } catch (error) {
    console.error("Error en crearReserva:", error);
    next(error);
  }
};

/**
 * GET /api/reservas/:id
 * (Nueva) - Obtiene una sola reserva para el modal de edición
 */
const getReservaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.getById(id);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    // Devuelve la reserva CON los datos del paciente (nombre, carnet)
    res.status(200).json(reserva);
  } catch (error) {
    console.error("Error en getReservaById:", error);
    next(error);
  }
};

/**
 * PUT /api/reservas/:id
 * (Nueva) - Actualiza una reserva
 */
const updateReserva = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Por ahora, solo permitimos editar la fecha y las observaciones
    const { fecha_hora_inicio, observaciones } = req.body;

    if (!fecha_hora_inicio) {
      return res.status(400).json({ message: 'La fecha_hora_inicio es requerida' });
    }

    // Recalculamos la hora de fin
    const fechaInicio = new Date(fecha_hora_inicio);
    const fechaFin = addHours(fechaInicio, 1);

    const affectedRows = await Reserva.update(id, fechaInicio, fechaFin, observaciones);

    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada o sin cambios' });
    }
    
    res.status(200).json({ message: 'Reserva actualizada' });

  } catch (error) {
    console.error("Error en updateReserva:", error);
    next(error);
  }
};

/**
 * DELETE /api/reservas/:id
 * (Nueva) - Elimina una reserva
 */
const deleteReserva = async (req, res, next) => {
  try {
    const { id } = req.params;
    const affectedRows = await Reserva.delete(id);
    
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.status(200).json({ message: 'Reserva eliminada' });
  } catch (error) {
    console.error("Error en deleteReserva:", error);
    next(error);
  }
};
/**
 * GET /api/reservas/hoy
 */
const getReservasHoy = async (req, res, next) => {
  try {
    // Obtenemos la fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    console.log('Buscando reservas para la fecha (Bolivia):', hoy); // Para depurar
    
    const reservasHoy = await Reserva.getByDate(hoy);
    res.status(200).json(reservasHoy);
  } catch (error) {
    console.error("Error en getReservasHoy:", error);
    next(error);
  }
};

/**
 * GET /api/reservas/conteo-hoy
 */
const getConteoHoy = async (req, res, next) => {
  try {
    // Obtenemos la fecha de hoy en formato YYYY-MM-DD
    // (Esto usa la hora del servidor, asegúrate que tu servidor tenga la hora correcta)
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    
    const total = await Reserva.countByDate(hoy);
    
    // Devolvemos un objeto simple
    res.status(200).json({ total: total });
  } catch (error) {
    console.error("Error en getConteoHoy:", error);
    next(error);
  }
};

/**
 * PATCH /api/reservas/:id/estado
 */
const cambiarEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // Ej: { "estado": "Completada" }

    await Reserva.updateEstado(id, estado);
    res.json({ message: `Reserva actualizada a ${estado}` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReservas,
  crearReserva,
  getReservaById,
  updateReserva,
  deleteReserva,
  getReservasHoy,
  getConteoHoy,
  cambiarEstado
};