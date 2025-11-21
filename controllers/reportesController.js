const Reporte = require('../models/reporteModel');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// --- Funciones Auxiliares ---
const formatearFecha = (fechaISO) => {
  if (!fechaISO) return 'N/A';
  return new Date(fechaISO).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};
const formatearFechaSimple = (fechaISO) => {
  if (!fechaISO) return 'N/A';
  return new Date(fechaISO).toLocaleDateString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

// (Debe estar aquí, antes de que las otras funciones la usen)
const generarPdfDesdeHtml = async (htmlContent, pdfOptions = {}) => {
  let browser; 
  try {
    browser = await puppeteer.launch({ 
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' },
      ...pdfOptions 
    });
    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    throw new Error(`Error de Puppeteer: ${error.message}`);
  }
};

// --- Controlador para Reporte por Paciente ---
const generarReportePaciente = async (req, res, next) => {
  try {
    const pacienteCarnet = req.params.id;
    
    // 1. Buscamos los datos del paciente (por carnet)
    const paciente = await Reporte.getPacienteById(pacienteCarnet);

    if (!paciente) {
      return res.status(404).json({ message: "Paciente no encontrado" });
    }
    
    // 2. Buscamos sus calificaciones (por carnet, usando el JOIN)
    const calificaciones = await Reporte.getCalificacionesByPaciente(pacienteCarnet);

    // 3. Creamos las filas de la tabla
    let filasHtml = '';
    if (calificaciones.length === 0) {
      filasHtml = '<tr><td colspan="3">No hay calificaciones registradas.</td></tr>';
    } else {
      filasHtml = calificaciones.map(cal => 
        `<tr>
          <td>${cal.id}</td>
          <td>${formatearFecha(cal.fecha_creacion)}</td>
          <td>${cal.observaciones || 'Sin observaciones'}</td>
        </tr>`
      ).join('');
    }

    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-paciente.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');
    
    const nombreCompleto = `${paciente.nombre || ''} `;

    // 4. Rellenamos el template
    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{pacienteNombre}}', nombreCompleto)
      .replace('{{pacienteCarnet}}', paciente.carnet_identidad) // <-- Usamos carnet_identidad
      .replace('{{pacienteTelefono}}', paciente.telefono || 'N/A')
      .replace('{{pacienteDireccion}}', paciente.direccion || 'N/A')
      .replace('{{filasCalificaciones}}', filasHtml);

    // 5. Generamos el PDF
    const pdfBuffer = await generarPdfDesdeHtml(templateHtml, { 
      margin: { top: '40px', right: '40px', bottom: '40px', left: '40px' } 
    });

    // 6. Enviamos el PDF
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=reporte-${pacienteCarnet}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReportePaciente:", error);
    next(error); 
  }
};

// --- Controlador para Reporte Total ---
const generarReporteTotal = async (req, res, next) => {
  try {
    const pacientes = await Reporte.getTotalPacientes();

    let filasHtml = '';
    if (pacientes.length === 0) {
      filasHtml = '<tr><td colspan="5">No hay pacientes registrados.</td></tr>';
    } else {
      filasHtml = pacientes.map((paciente, index) => {
        const nombre = `${paciente.nombre || ''}`;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${paciente.carnet_identidad}</td>
            <td>${nombre}</td>
            <td>${paciente.telefono || 'N/A'}</td>
            <td>${paciente.direccion || 'N/A'}</td>
          </tr>
        `;
      }).join('');
    }
    
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-total-pacientes.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');
    
    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasPacientes}}', filasHtml)
      .replace('{{totalPacientes}}', pacientes.length.toString());

      // --- AÑADE ESTAS LÍNEAS DE DEPURACIÓN ---
    console.log("--- HTML Generado para Puppeteer ---");
    console.log(templateHtml);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' }
    });
    await browser.close();

    // Usamos el método que SÍ funciona
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-total-pacientes.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteTotal:", error);
    next(error);
  }
};

// --- Controlador para Reporte Diario ---
const generarReporteDiario = async (req, res, next) => {
  try {
    const calificaciones = await Reporte.getCalificacionesDiarias();
    
    let filasHtml = '';
    if (calificaciones.length === 0) {
      filasHtml = '<tr><td colspan="5">No se realizaron calificaciones el día de hoy.</td></tr>';
    } else {
      filasHtml = calificaciones.map(cal => `
        <tr>
          <td>${cal.id}</td>
          <td>${formatearFecha(cal.fecha_creacion)}</td>
          <td>${cal.id_paciente}</td>
          <td>${cal.nombre || ''}</td>
          <td>${cal.observaciones || 'Sin observaciones'}</td>
        </tr>
      `).join('');
    }

    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-calificaciones.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');
    
    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFecha(new Date().toISOString()))
      .replace('{{tituloReporte}}', 'Reporte de Calificaciones - Hoy')
      .replace('{{filasCalificaciones}}', filasHtml)
      .replace('{{totalCalificaciones}}', calificaciones.length.toString());

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(templateHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '30px', right: '30px', bottom: '30px', left: '30px' }
    });
    await browser.close();

    // Usamos el método que SÍ funciona
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-calificaciones-diario.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Error en generarReporteDiario:", error);
    next(error);
  }
};

// --- Controlador para Reporte Mensual ---
const generarReporteMensual = async (req, res, next) => {try {
    const mes = req.params.mes; // Ej: "2025-10"
    if (!mes || !mes.includes('-')) {
      return res.status(400).json({ message: "Formato de mes inválido. Use YYYY-MM." });
    }
    
    // --- ¡NUEVA LÓGICA DE FECHAS! ---
    const [year, month] = mes.split('-').map(Number); // [2025, 10]

    // 1. Fecha de inicio (ej. '2025-10-01')
    const fechaInicio = `${mes}-01`;
    
    // 2. Fecha de fin (calcula el primer día del SIGUIENTE mes)
    // new Date(2025, 10, 1) -> OJO: Meses en JS son 0-11, así que 10 es NOVIEMBRE
    const fechaFin = new Date(year, month, 1).toISOString().split('T')[0]; // Ej: "2025-11-01"
    
    // Pasamos las dos fechas calculadas al modelo
    const calificaciones = await Reporte.getCalificacionesMensual(fechaInicio, fechaFin);

    // --- (El resto de la lógica de la plantilla es la misma) ---

    let filasHtml = '';
    if (calificaciones.length === 0) {
      filasHtml = `<tr><td colspan="5">No se encontraron calificaciones para el mes ${mes}.</td></tr>`;
    } else {
      filasHtml = calificaciones.map(cal => `
        <tr>
          <td>${cal.id}</td>
          <td>${formatearFecha(cal.fecha_creacion)}</td>
          <td>${cal.id_paciente}</td>
          <td>${cal.nombre || ''}</td>
          <td>${cal.observaciones || 'Sin observaciones'}</td>
        </tr>
      `).join('');
    }

    const fechaTituloObj = new Date(year, month - 1, 1); // (month-1) para el título
    const tituloReporte = `Reporte de Calificaciones - ${fechaTituloObj.toLocaleString('es-BO', { month: 'long', year: 'numeric' })}`;

    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-calificaciones.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{tituloReporte}}', tituloReporte)
      .replace('{{filasCalificaciones}}', filasHtml)
      .replace('{{totalCalificaciones}}', calificaciones.length.toString());
      
    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);

    // ... (El resto, res.writeHead y res.end, se queda igual) ...
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=reporte-calificaciones-${mes}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteMensual:", error);
    next(error);
  }
};

// --- Controlador para Reporte por Rango ---
const generarReporteRango = async (req, res, next) => {try {
    const { inicio, fin } = req.params; // ej: '2025-10-01', '2025-11-09'
    if (!inicio || !fin) {
      return res.status(400).json({ message: "Debe proveer una fecha de inicio y fin." });
    }

    // --- ¡NUEVA LÓGICA DE FECHAS! ---
    // 1. Convertimos la fecha fin a un objeto Date
    const fechaFinJS = new Date(fin); 
    
    // 2. Le sumamos 1 día para obtener el límite superior (ej. '2025-11-10')
    fechaFinJS.setDate(fechaFinJS.getDate() + 1);
    
    // 3. Lo convertimos de nuevo a string 'YYYY-MM-DD'
    const fechaFinSiguiente = fechaFinJS.toISOString().split('T')[0];

    // 4. Pasamos el inicio ('2025-10-01') y el fin+1 ('2025-11-10') al modelo
    const calificaciones = await Reporte.getCalificacionesRango(inicio, fechaFinSiguiente);
    
    // --- (El resto de la lógica de la plantilla es la misma) ---

    let filasHtml = '';
    if (calificaciones.length === 0) {
      filasHtml = `<tr><td colspan="5">No se encontraron calificaciones entre ${formatearFechaSimple(inicio)} y ${formatearFechaSimple(fin)}.</td></tr>`;
    } else {
      filasHtml = calificaciones.map(cal => `
        <tr>
          <td>${cal.id}</td>
          <td>${formatearFecha(cal.fecha_creacion)}</td>
          <td>${cal.id_paciente}</td>
          <td>${cal.nombre || ''} </td>
          <td>${cal.observaciones || 'Sin observaciones'}</td>
        </tr>
      `).join('');
    }
    
    const tituloReporte = `Reporte de Calificaciones (Desde ${formatearFechaSimple(inicio)} hasta ${formatearFechaSimple(fin)})`;

    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-calificaciones.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{tituloReporte}}', tituloReporte)
      .replace('{{filasCalificaciones}}', filasHtml)
      .replace('{{totalCalificaciones}}', calificaciones.length.toString());

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);

    // ... (El envío con res.writeHead() se queda igual) ...
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=reporte-rango-${inicio}-al-${fin}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteRango:", error);
    next(error);
  }
};

// --- Exportamos ---
module.exports = {
  generarReportePaciente,
  generarReporteTotal,
  generarReporteDiario,
  generarReporteMensual,
  generarReporteRango
};