const { iniciarWhatsApp } = require('./services/whatsappServices'); 
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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
const carnetRoutes = require('./routes/carnetRoutes');
const expertoRoutes = require('./routes/expertoRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const crewsRoutes = require('./routes/crews');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes'); // <-- Importar
const documentoRoutes = require('./routes/documentoRoutes');
const auditorRoutes = require('./routes/auditorRoutes');
const path = require('path');

// --- CONFIGURACIÓN DE CORS (AQUÍ AL INICIO) ---
// Esta es la única configuración de CORS que necesitas.
app.use(cors({
  // Aceptamos tanto la Web (4200) como el Móvil (8100)
  origin: ['http://localhost:4200', 'http://localhost:8100'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true 
}));

// --- MIDDLEWARES ---
app.use(bodyParser.json());
// (Nota: Tenías /api/authRoutes duplicado, quité uno)
app.use('/api', authRoutes);

const puerto = process.env.PORT || 3000;


// --- RUTAS ---
app.use('/api/auditoria', auditorRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/users', usuarioRoutes);
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
app.use('/api/experto', expertoRoutes);
app.use('/api/reportes', reporteRoutes); // <--- Nuestra nueva ruta
app.use('/api/reservas', reservaRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/crews', crewsRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/auth', authRoutes);

// --- MANEJO DE ERRORES ---
app.use(errorController.get404);
app.use(errorController.get500);
iniciarWhatsApp();

app.listen(puerto, () => console.log(`Servidor corriendo en el puerto ${puerto}`));