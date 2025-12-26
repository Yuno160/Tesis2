// controllers/reserva.controller.js
const Reserva = require('../models/reservaModel'); // Asegúrate que la ruta sea correcta
const Crew = require('../models/crew.model');
const { addHours } = require('date-fns'); 

/**
 * 1. GET /api/reservas
 * ESTE ES EL QUE TE FALTABA. Obtiene todas las reservas para el calendario.
 */
const getReservas = async (req, res, next) => {
  try {
    // 1. Obtenemos los datos crudos del Modelo (que ya incluyen el JOIN con Crews)
    const reservas = await Reserva.getAll();
    
    // 2. ¡IMPORTANTE! Los enviamos tal cual. NO hacemos .map() aquí.
    // Dejamos que el Frontend decida colores y títulos.
    res.json(reservas);

  } catch (error) {
    next(error);
  }
};

/**
 * 2. POST /api/reservas
 * Crea una nueva reserva
 */
// controllers/reservaController.js

/**
 * CREAR RESERVA (VERSIÓN FINAL BLINDADA Y DEPURADA)
 */
const crearReserva = async (req, res, next) => {
  try {
    const { id_paciente, fecha_hora_inicio, observaciones, id_crew_manual } = req.body;

    // 1. INICIALIZAR VARIABLES DE TIEMPO
    const fechaInicio = new Date(fecha_hora_inicio);
    const ahora = new Date();
    
    // Obtenemos la hora de forma segura
    let hora = 0;
    if (!isNaN(fechaInicio.getTime())) {
        hora = fechaInicio.getHours();
    }

    // 2. LOGS DE DEPURACIÓN (Para ver en la consola negra)
    console.log("------------------------------------------------");
    console.log("📥 INTENTO DE RESERVA RECIBIDO:");
    console.log("   - Paciente ID:", id_paciente);
    console.log("   - Fecha Inicio:", fechaInicio);
    console.log("   - Crew Manual:", id_crew_manual);
    console.log("🕒 HORA DETECTADA (0-23):", hora);

    // 3. VALIDACIONES BÁSICAS
    // A) Fecha Inválida
    if (isNaN(fechaInicio.getTime())) {
         console.log("❌ ERROR: La fecha no es válida.");
         return res.status(400).json({ message: 'Fecha inválida o formato incorrecto.' });
    }

    // B) No volver al Futuro (Pasado) - 2 min de gracia
    if (fechaInicio < new Date(ahora.getTime() - 2 * 60000)) { 
        console.log("❌ ERROR: Fecha en el pasado.");
        return res.status(400).json({ message: 'No se puede agendar en el pasado.' });
    }

    

    // C) Horario Laboral (08:00 a 16:00)
    // Nota: Si la cita es a las 16:00, termina 17:00 (fuera de hora). 
    // Última cita permitida: 15:00.
    const diaSemana = fechaInicio.getDay(); // 0 es Domingo, 6 es Sábado
    const tieneCita = await Reserva.checkPacienteTieneCita(id_paciente);
      if (tieneCita) {
          console.log("❌ ERROR: Paciente con cita duplicada.");
          return res.status(409).json({ message: 'El paciente ya tiene una cita programada pendiente.' });
      }
    
    if (diaSemana === 0 || diaSemana === 6) {
        console.log("❌ ERROR: Intento de agendar en fin de semana.");
        return res.status(400).json({ message: 'No hay atención fines de semana. Solo de Lunes a Viernes.' });
    }

    if (hora < 8 || hora >= 16) { 
        console.log("❌ ERROR: Fuera de horario laboral (8-16).");
        return res.status(400).json({ message: 'Horario de atención: 08:00 a 16:00.' });
    }
    if (hora === 12) { // <--- BLOQUEO DE ALMUERZO AQUÍ TAMBIÉN
        return res.status(400).json({ message: '🚫 De 12:00 a 13:00 es hora de almuerzo.' });
    }

    // 4. CALCULAR FECHA FIN (¡AQUÍ ESTABA EL ERROR ANTES!)
    // Asumimos que las citas duran 1 hora exacta
    const fechaFin = addHours(fechaInicio, 1);
    console.log("🏁 Fecha Fin Calculada:", fechaFin);

    // 5. ASIGNACIÓN DE CREW (EQUIPO MÉDICO)
    let idCrewFinal = id_crew_manual;

    if (!idCrewFinal) {
        // --- CASO A: ASIGNACIÓN AUTOMÁTICA ---
        console.log("🤖 Iniciando asignación automática...");
        
        // Buscamos equipos libres
        const crewsLibres = await Crew.getDisponibles(fechaInicio, fechaFin);
        
        if (crewsLibres.length === 0) {
            console.log("⚠️ AGENDA LLENA: No hay equipos libres.");
            return res.status(409).json({ message: 'Agenda Llena: No hay equipos médicos disponibles en ese horario.' });
        }
        
        // Asignamos el primero (Round Robin básico)
        idCrewFinal = crewsLibres[0].id_crew;
        console.log(`✅ Asignado al equipo: ${crewsLibres[0].nombre}`);
        
    } else {
        // --- CASO B: ASIGNACIÓN MANUAL ---
        console.log(`👤 Verificando disponibilidad del equipo manual ID: ${idCrewFinal}...`);
        
        const crewsLibres = await Crew.getDisponibles(fechaInicio, fechaFin);
        // Buscamos si el ID elegido está en la lista de los libres
        const estaLibre = crewsLibres.find(c => c.id_crew == idCrewFinal);
        
        if (!estaLibre) {
             console.log("⚠️ EL EQUIPO ELEGIDO ESTÁ OCUPADO.");
             return res.status(409).json({ message: 'Ese Equipo Médico ya está ocupado en ese horario.' });
        }
        console.log("✅ El equipo manual está disponible.");
    }

    // 6. GUARDAR EN BASE DE DATOS
    const nuevaReserva = await Reserva.create(
      id_paciente, 
      fechaInicio, 
      fechaFin, 
      observaciones,
      idCrewFinal
    );
    
    console.log("🎉 ¡Reserva creada con éxito! ID:", nuevaReserva.id);
    
    res.status(201).json({ 
        ...nuevaReserva, 
        message: 'Cita agendada correctamente' 
    });

  } catch (error) {
    console.error("🔥 Error CRÍTICO en crearReserva:", error);
    next(error);
  }
};

/**
 * 3. GET /api/reservas/:id
 * (NUEVO) Carga datos para el modal de edición
 */
const getReservaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.getById(id);
    
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    
    res.status(200).json(reserva);
  } catch (error) {
    console.error("Error en getReservaById:", error);
    next(error);
  }
};

/**
 * 4. PUT /api/reservas/:id
 * (NUEVO) Actualiza fecha y observaciones
 */
const updateReserva = async (req, res, next) => {
  try {
    
    const { id } = req.params;
    const { fecha_hora_inicio, observaciones } = req.body;
    const fechaInicio = new Date(fecha_hora_inicio);
    const hora = fechaInicio.getHours();
    const fechaFin = addHours(fechaInicio, 1); // Asumimos 1 hora de duración
    const ahora = new Date();
    const diaSemana = fechaInicio.getDay(); // 0 es Domingo, 6 es Sábado
    const reservaActual = await Reserva.getById(id);
    const idCrewAsignado = reservaActual.id_crew; // El equipo que ya tiene la cita

    console.log(`[EDITAR RESERVA] ID: ${id}`, req.body);

    if (!fecha_hora_inicio) {
      return res.status(400).json({ message: 'La fecha y hora son obligatorias' });
    }

    

    // --- 1. VALIDACIÓN: NO VOLVER AL FUTURO ---
    if (fechaInicio < new Date(ahora.getTime() - 2 * 60000)) {
        return res.status(400).json({ message: 'No se puede mover una cita al pasado.' });
    }
    
    

    if (diaSemana === 0 || diaSemana === 6) {
        console.log("❌ ERROR: Intento de agendar en fin de semana.");
        return res.status(400).json({ message: 'No hay atención fines de semana. Solo de Lunes a Viernes.' });
    }

    if (hora === 12) {
        console.log("❌ ERROR: Hora de almuerzo.");
        return res.status(400).json({ message: '🚫 De 12:00 a 13:00 es hora de almuerzo. Nadie atiende.' });
    }

    // --- 2. VALIDACIÓN: HORARIO GOBIERNO (08:00 - 16:00) ---
    
    if (hora < 8 || hora >= 16) { 
        return res.status(400).json({ message: 'Horario de atención: 08:00 a 16:00.' });
    }

    // --- 3. VALIDACIÓN: CHOQUE DE HORARIOS (CRUCIAL) ---
    
    // A) Primero necesitamos saber a qué CREW pertenece esta reserva actualmente
    
    
    if (!reservaActual) {
        return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    

    // B) Verificamos si ese equipo está libre en la NUEVA hora
    // Usamos el modelo Crew para consultar disponibilidad
    const crewsLibres = await Crew.getDisponibles(fechaInicio, fechaFin);
    
    
    
    // MEJORA RÁPIDA PARA TESIS:
    // Hacemos una consulta manual rápida para ver si ESTE crew tiene OTRA cita en ese horario
    const [choques] = await Reserva.checkChoqueUpdate(id, idCrewAsignado, fechaInicio, fechaFin);
    
    if (choques.length > 0) {
        return res.status(409).json({ message: '⚠️ El Equipo Médico ya tiene OTRA cita en ese nuevo horario.' });
    }

    // --- 4. ACTUALIZAR ---
    const affectedRows = await Reserva.update(id, fechaInicio, fechaFin, observaciones);

    if (affectedRows === 0) {
      return res.status(404).json({ message: 'No se pudo actualizar.' });
    }
    
    res.status(200).json({ 
        message: 'Reserva reprogramada correctamente', 
        nueva_fecha: fechaInicio 
    });

  } catch (error) {
    console.error("Error en updateReserva:", error);
    next(error);
  }
};

/**
 * 5. DELETE /api/reservas/:id
 * (NUEVO) Elimina reserva
 */
const deleteReserva = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Usamos el nuevo método 'cancelar' del modelo
    const affectedRows = await Reserva.cancelar(id); 
    
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.status(200).json({ message: 'Cita cancelada correctamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. GET /api/reservas/hoy
 * Reservas del día (Dashboard)
 */
const getReservasHoy = async (req, res, next) => {
  try {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    const reservasHoy = await Reserva.getByDate(hoy);
    res.status(200).json(reservasHoy);
  } catch (error) {
    console.error("Error en getReservasHoy:", error);
    next(error);
  }
};

/**
 * 7. GET /api/reservas/conteo-hoy
 */
const getConteoHoy = async (req, res, next) => {
  try {
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
    const total = await Reserva.countByDate(hoy);
    res.status(200).json({ total: total });
  } catch (error) {
    console.error("Error en getConteoHoy:", error);
    next(error);
  }
};

/**
 * 8. PATCH /api/reservas/:id/estado
 */
const cambiarEstado = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; 
    await Reserva.updateEstado(id, estado);
    res.json({ message: `Reserva actualizada a ${estado}` });
  } catch (error) {
    next(error);
  }
};

// EXPORTAMOS TODO
module.exports = {
  getReservas,      // <--- ¡AQUÍ ESTÁ EL IMPORTANTE PARA EL CALENDARIO!
  crearReserva,
  getReservaById,
  updateReserva,
  deleteReserva,
  getReservasHoy,
  getConteoHoy,
  cambiarEstado
};