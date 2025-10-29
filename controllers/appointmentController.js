const Appointment = require('../models/appointment');

exports.getAllAppointments = async (req, res, next) => {
    try {
        const [appointments] = await Appointment.getAll();
        res.status(200).json(appointments);
    } catch (err) {
        next(err);
    }
};

exports.getAppointmentById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const [appointment] = await Appointment.getById(id);
        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        res.status(200).json(appointment[0]);
    } catch (err) {
        next(err);
    }
};

exports.createAppointment = async (req, res, next) => {
    console.log('Datos recibidos:', req.body);
    const { id_paciente, id_crew, fecha_hora, estado } = req.body;

    if (!id_paciente || !id_crew || !fecha_hora) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    try {
        await Appointment.save(id_paciente, id_crew, fecha_hora, estado);
        res.status(201).json({ message: 'Cita creada con éxito' });
    } catch (err) {
        next(err);
    }
};

exports.updateAppointment = async (req, res, next) => {
    const { id } = req.params;
    const { id_paciente, id_profesional, fecha_hora, estado } = req.body;

    if (!id_paciente || !id_profesional || !fecha_hora || !estado) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    try {
        const result = await Appointment.update(id, id_paciente, id_profesional, fecha_hora, estado);
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        res.status(200).json({ message: 'Cita actualizada con éxito' });
    } catch (err) {
        next(err);
    }
};

exports.deleteAppointment = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await Appointment.delete(id);
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        res.status(200).json({ message: 'Cita eliminada con éxito' });
    } catch (err) {
        next(err);
    }
};


