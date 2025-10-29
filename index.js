const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./auth');
const app = express();
const pacienteRutas = require('./routes/patient');
const crewRutas = require('./routes/crews');
const errorController = require('./controllers/error');
const profesionalRoutes = require('./routes/profesional');
const appointmentRoutes = require('./routes/appointment');
const calificacionRoutes = require('./routes/calificacion');
const evaluationRoutes = require('./routes/evaluation');
const gradoDiscapacidadRoutes = require('./routes/gradoDiscapacidad');
const configuracionCIFRoutes = require('./routes/configuracionCIF');
const preguntaRoutes = require('./routes/pregunta');
const cifCodeRoutes = require('./routes/cifCodeRoutes');
const carnetRoutes = require('./routes/carnetRoutes'); // <-- 1. IMPORTA LA NUEVA RUTA
const pool = require('./util/database');

// Configurar CORS
app.use(cors({
  origin: 'http://localhost:4200', // Dirección del frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true // Permitir envío de cookies o encabezados como Authorization
}));
// Otras configuraciones...
app.use(bodyParser.json());
app.use('/api', authRoutes);

const puerto = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


// Rutas
app.use('/api/pacientes', pacienteRutas);
app.use('/crews', crewRutas);
app.use('/profesional', profesionalRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/evaluations', evaluationRoutes);
app.use('/grado-discapacidad', gradoDiscapacidadRoutes);
app.use('/configuracion-cif', configuracionCIFRoutes);
app.use('/preguntas', preguntaRoutes);
app.use('/api/cif-codes', cifCodeRoutes);
app.use('/api/calificaciones', calificacionRoutes);
app.use('/api/carnet', carnetRoutes);
//insertar evaluacion
app.post('/evaluacion', async (req, res) => {
    const { id_paciente, id_profesional, respuestas } = req.body;  // respuestas es un array de objetos con la estructura { codigo_cif, respuesta }
  
    try {
      for (const respuesta of respuestas) {
        const { codigo_cif, respuesta_valor } = respuesta;

        let gravedad = 'Leve';
        if (respuesta_valor.toLowerCase().includes('moderada')) {
          gravedad = 'Moderado';
      } else if (respuesta_valor.toLowerCase().includes('severa')) {
          gravedad = 'Severo';
      }

        // Buscar si ya existe una evaluación con el mismo paciente, profesional y código CIF
        const [existingEvaluation] = await pool.query('SELECT * FROM Evaluation WHERE id_paciente = ? AND id_profesional = ? AND codigo_cif = ?', [
          id_paciente,
          id_profesional,
          codigo_cif
        ]);

        if (existingEvaluation.length > 0) {
          // Si ya existe una evaluación, no insertamos otra
          return res.status(400).json({ error: `Ya existe una evaluación para este paciente y profesional con el código CIF ${codigo_cif}.` });
        }

        // Buscar el id_codigo_cif basado en el codigo_cif
        const [config] = await pool.query('SELECT id_configuracion FROM ConfiguracionCIF WHERE codigo_cif = ?', [codigo_cif]);

        if (config.length === 0) {
          return res.status(400).json({ error: `El código CIF ${codigo_cif} no está registrado en el sistema.` });
        }

        const id_codigo_cif = config[0].id_configuracion;
  
        // Insertar la evaluación utilizando id_codigo_cif
        await pool.query('INSERT IGNORE INTO Evaluation (id_paciente, id_profesional, codigo_cif, detalle, id_codigo_cif, gravedad) VALUES (?, ?, ?, ?, ?,?)', [
          id_paciente,
          id_profesional,
          codigo_cif,           // Aquí mantienes el código CIF para la referencia
          respuesta_valor,
          id_codigo_cif,
          gravedad,        // Se inserta el id_codigo_cif de la configuración
        ]);
      }
  
      res.status(200).json({ message: 'Evaluación registrada correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al registrar la evaluación' });
    }
});

// obtener evaluacion
app.get('/evaluaciones', async (req, res) => {
  const { id_paciente, id_profesional } = req.query; // Parámetros opcionales para filtrar.

  try {
      let query = 'SELECT * FROM Evaluation';
      const params = [];

      if (id_paciente || id_profesional) {
          query += ' WHERE';
          if (id_paciente) {
              query += ' id_paciente = ?';
              params.push(id_paciente);
          }
          if (id_profesional) {
              if (params.length) query += ' AND';
              query += ' id_profesional = ?';
              params.push(id_profesional);
          }
      }

      const [results] = await pool.query(query, params);
      res.status(200).json(results);
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener las evaluaciones' });
  }
});
// editar evaluacion

app.put('/evaluacion/:id', async (req, res) => {
  const { id } = req.params; // ID de la evaluación a actualizar.
  const { codigo_cif, detalle, gravedad } = req.body; // Campos a actualizar.

  try {
      const [result] = await pool.query(
          'UPDATE Evaluation SET codigo_cif = ?, detalle = ?, gravedad = ? WHERE id_evaluacion = ?',
          [codigo_cif, detalle, gravedad, id]
      );

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Evaluación no encontrada' });
      }

      res.status(200).json({ message: 'Evaluación actualizada correctamente' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar la evaluación' });
  }
});
// delete evaluacion
app.delete('/evaluacion/:id', async (req, res) => {
  const { id } = req.params; // ID de la evaluación a eliminar.

  try {
      const [result] = await pool.query('DELETE FROM Evaluation WHERE id_evaluacion = ?', [id]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Evaluación no encontrada' });
      }

      res.status(200).json({ message: 'Evaluación eliminada correctamente' });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar la evaluación' });
  }
});




  

app.use(errorController.get404);
app.use(errorController.get500);

app.listen(puerto, () => console.log(`Servidor corriendo en el puerto ${puerto}`));
