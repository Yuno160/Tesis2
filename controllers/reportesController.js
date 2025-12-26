const Reporte = require('../models/reporteModel');
const Paciente = require('../models/patient');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');

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

// --- Controlador para Reporte de Zonas (Con Gráfico) ---
const generarReporteZonas = async (req, res, next) => {
  try {
    const datos = await Reporte.getDistribucionZonas();
    
    const labels = datos.map(d => `${d.zona} (${d.area})`); 
    const dataValues = datos.map(d => d.cantidad_pacientes);
    const backgroundColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    // --- A: JSON ---
    if (req.query.format === 'json') {
        return res.status(200).json({
            ok: true,
            chartData: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: backgroundColors }]
            }
        });
    }

    let filasHtml = datos.length === 0 
      ? '<tr><td colspan="3">No hay datos registrados.</td></tr>'
      : datos.map(d => `<tr><td>${d.zona}</td><td>${d.area}</td><td>${d.cantidad_pacientes}</td></tr>`).join('');

    // --- B: PDF TABLA ---
    if (req.query.modo === 'tabla') {
        const templatePath = path.join(__dirname, '..', 'templates', 'reporte-tabla-generica.html');
        let templateHtml = await fs.readFile(templatePath, 'utf-8');

        templateHtml = templateHtml
          .replace('{{tituloReporte}}', 'Detalle de Pacientes por Zona')
          .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
          .replace('{{headersTabla}}', '<th>Zona</th><th>Área</th><th>Cantidad</th>')
          .replace('{{filasTabla}}', filasHtml);

        const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=detalle-zonas.pdf',
          'Content-Length': pdfBuffer.length
        });
        return res.end(pdfBuffer);
    }

    // --- C: PDF GRÁFICO ---
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-zonas.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasZonas}}', filasHtml) // Asegúrate que tu HTML espere {{filasZonas}}
      .replace('{{chartLabels}}', JSON.stringify(labels))
      .replace('{{chartData}}', JSON.stringify(dataValues));

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-zonas-grafico.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteZonas:", error);
    next(error);
  }
};

const generarReporteAreas = async (req, res, next) => {
  try {
    // 1. Llamamos al método nuevo del Modelo (que hace el JOIN con Zona)
    const datos = await Reporte.getDistribucionAreas();
    
    // 2. Preparamos los arrays para el gráfico
    const labels = datos.map(d => d.area); 
    const dataValues = datos.map(d => d.cantidad);

    // 3. Colores Semánticos (Opcional, pero se ve mejor)
    // Asignamos colores fijos: URBANA = Azul, RURAL = Naranja, OTROS = Gris
    const backgroundColors = labels.map(area => {
        const a = area ? area.toUpperCase() : '';
        if (a === 'URBANA') return '#36A2EB'; // Azul
        if (a === 'RURAL') return '#FF6384';  // Rojo/Naranja
        return '#C9CBCF'; // Gris para "Sin Clasificar"
    });

    // --- A: JSON (Para el Dashboard del Frontend) ---
    if (req.query.format === 'json') {
        return res.status(200).json({
            ok: true,
            chartData: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: backgroundColors }]
            }
        });
    }

    // Preparar filas HTML (común para ambos PDFs)
    let filasHtml = datos.length === 0 
      ? '<tr><td colspan="2">No hay datos registrados.</td></tr>'
      : datos.map(d => `<tr><td>${d.area}</td><td>${d.cantidad}</td></tr>`).join('');

    // --- B: PDF MODO TABLA (Solo texto) ---
    if (req.query.modo === 'tabla') {
        const templatePath = path.join(__dirname, '..', 'templates', 'reporte-tabla-generica.html');
        let templateHtml = await fs.readFile(templatePath, 'utf-8');

        templateHtml = templateHtml
          .replace('{{tituloReporte}}', 'Detalle de Distribución Geográfica')
          .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
          .replace('{{headersTabla}}', '<th>Área (Urbana/Rural)</th><th>Cantidad de Pacientes</th>')
          .replace('{{filasTabla}}', filasHtml);

        const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=detalle-areas.pdf',
          'Content-Length': pdfBuffer.length
        });
        return res.end(pdfBuffer);
    }

    // --- C: PDF CON GRÁFICO (Default) ---
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-areas.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasAreas}}', filasHtml)
      .replace('{{chartLabels}}', JSON.stringify(labels))
      .replace('{{chartData}}', JSON.stringify(dataValues))
      .replace('{{chartColors}}', JSON.stringify(backgroundColors)); // <--- ¡AGREGADO IMPORTANTE!

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-areas-grafico.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteAreas:", error);
    next(error);
  }
};


// ...
const generarReporteProductividad = async (req, res, next) => {
  try {
    const datos = await Reporte.getProductividadAnual();
    
    const labels = datos.map(d => {
        const [year, month] = d.mes_anio.split('-');
        const dateObj = new Date(year, month - 1, 1);
        return dateObj.toLocaleString('es-BO', { month: 'short', year: 'numeric' });
    });
    const dataValues = datos.map(d => d.cantidad);

    // --- A: JSON ---
    if (req.query.format === 'json') {
        return res.status(200).json({
            ok: true,
            chartData: {
                labels: labels,
                datasets: [{
                    label: 'Evaluaciones',
                    data: dataValues,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            }
        });
    }

    let filasHtml = datos.length === 0 
      ? '<tr><td colspan="2">No hay datos registrados.</td></tr>'
      : datos.map((d, i) => `<tr><td>${labels[i]}</td><td>${d.cantidad}</td></tr>`).join('');

    // --- B: PDF TABLA ---
    if (req.query.modo === 'tabla') {
        const templatePath = path.join(__dirname, '..', 'templates', 'reporte-tabla-generica.html');
        let templateHtml = await fs.readFile(templatePath, 'utf-8');

        templateHtml = templateHtml
          .replace('{{tituloReporte}}', 'Detalle de Productividad Mensual')
          .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
          .replace('{{headersTabla}}', '<th>Mes</th><th>Evaluaciones Realizadas</th>')
          .replace('{{filasTabla}}', filasHtml);

        const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=detalle-productividad.pdf',
          'Content-Length': pdfBuffer.length
        });
        return res.end(pdfBuffer);
    }

    // --- C: PDF GRÁFICO ---
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-productividad.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasProductividad}}', filasHtml)
      .replace('{{chartLabels}}', JSON.stringify(labels))
      .replace('{{chartData}}', JSON.stringify(dataValues));

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-productividad-grafico.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteProductividad:", error);
    next(error);
  }
};
// module.exports = { ..., generarReporteProductividad };

// ...
const generarReporteNiveles = async (req, res, next) => {
  try {
    // 1. Obtener Datos
    const datos = await Reporte.getNivelesDiscapacidad(); 
    
    // 2. Procesar Datos para Gráficos
    const labels = datos.map(d => d.nivel); 
    const dataValues = datos.map(d => d.cantidad);

    const backgroundColors = labels.map(nivel => {
        if(!nivel) return '#999';
        const n = nivel.toUpperCase().trim();
        if(n === 'NINGUNO') return '#4caf50';   // Verde
        if(n === 'LIGERO') return '#8bc34a';    // Verde Lima
        if(n === 'MODERADO') return '#ffeb3b';  // Amarillo
        if(n === 'GRAVE') return '#ff9800';     // Naranja
        if(n === 'COMPLETO') return '#f44336';  // Rojo
        return '#9e9e9e';
    });

    // --- OPCIÓN A: JSON (Para el Dashboard) ---
    if (req.query.format === 'json') {
        return res.status(200).json({
            ok: true,
            chartData: {
                labels: labels,
                datasets: [{ data: dataValues, backgroundColor: backgroundColors }]
            }
        });
    }

    // Preparar filas (común para ambos PDFs)
    let filasHtml = datos.length === 0 
      ? '<tr><td colspan="2">No hay datos registrados.</td></tr>'
      : datos.map(d => `<tr><td>${d.nivel}</td><td>${d.cantidad}</td></tr>`).join('');

    // --- OPCIÓN B: PDF MODO TABLA (Solo Detalle) ---
    if (req.query.modo === 'tabla') {
        const templatePath = path.join(__dirname, '..', 'templates', 'reporte-tabla-generica.html');
        let templateHtml = await fs.readFile(templatePath, 'utf-8');

        templateHtml = templateHtml
          .replace('{{tituloReporte}}', 'Detalle de Niveles de Discapacidad')
          .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
          .replace('{{headersTabla}}', '<th>Nivel de Gravedad</th><th>Cantidad de Pacientes</th>')
          .replace('{{filasTabla}}', filasHtml);

        const pdfBuffer = await generarPdfDesdeHtml(templateHtml);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=detalle-niveles.pdf',
          'Content-Length': pdfBuffer.length
        });
        return res.end(pdfBuffer);
    }

    // --- OPCIÓN C: PDF CON GRÁFICO (Default) ---
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-niveles.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasNiveles}}', filasHtml)
      .replace('{{chartLabels}}', JSON.stringify(labels))
      .replace('{{chartData}}', JSON.stringify(dataValues))
      .replace('{{chartColors}}', JSON.stringify(backgroundColors));

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-niveles-grafico.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteNiveles:", error);
    next(error);
  }
};

const generarReporteVencimientos = async (req, res, next) => {
  try {
    const datos = await Reporte.getVencimientosAnuales(); 
    
    // Generamos las filas
    let filasHtml = '';
    if (datos.length === 0) {
      filasHtml = '<tr><td colspan="5" style="text-align:center;">No hay vencimientos programados para el resto del año.</td></tr>';
    } else {
      filasHtml = datos.map(d => `
        <tr>
          <td>${formatearFechaSimple(d.fecha_vencimiento)}</td>
          <td>${d.carnet_identidad}</td>
          <td>${d.nombre}</td>
          <td>${d.telefono || 'S/N'}</td>
          <td><strong>${d.resultado_global || 'N/A'}</strong></td>
        </tr>
      `).join('');
    }

    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-vencimientos.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');
    
    // Obtenemos el año actual para el título
    const anioActual = new Date().getFullYear();

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{anioActual}}', anioActual)
      .replace('{{filasVencimientos}}', filasHtml)
      .replace('{{totalVencimientos}}', datos.length);

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-vencimientos.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteVencimientos:", error);
    next(error);
  }
};
// ... (imports)

const generarReporteProductividadPastel = async (req, res, next) => {
  try {
    const datos = await Reporte.getProductividadAnual(); 
    
    // 1. Formateamos las etiquetas para que se vean bonitas (ej: "Oct 2025")
    const labels = datos.map(d => {
        // d.mes_anio viene como "2025-10"
        const [year, month] = d.mes_anio.split('-');
        // Creamos fecha (Ojo: mes en JS es 0-11)
        const dateObj = new Date(year, month - 1, 1);
        // Formateamos a texto
        return dateObj.toLocaleString('es-BO', { month: 'short', year: 'numeric' });
    });
    
    const dataValues = datos.map(d => d.cantidad);

    // 2. Filas para la tabla de abajo
    let filasHtml = '';
    if (datos.length === 0) {
      filasHtml = '<tr><td colspan="2" style="text-align:center;">No hay evaluaciones registradas en el último año.</td></tr>';
    } else {
      filasHtml = datos.map((d, index) => `
        <tr>
          <td>${labels[index]}</td> <td>${d.cantidad}</td>
        </tr>
      `).join('');
    }

    // 3. Leemos y rellenamos el template
    const templatePath = path.join(__dirname, '..', 'templates', 'reporte-productividadpastel.html');
    let templateHtml = await fs.readFile(templatePath, 'utf-8');

    templateHtml = templateHtml
      .replace('{{fechaEmision}}', formatearFechaSimple(new Date().toISOString()))
      .replace('{{filasProductividad}}', filasHtml)
      .replace('{{chartLabels}}', JSON.stringify(labels))
      .replace('{{chartData}}', JSON.stringify(dataValues));

    const pdfBuffer = await generarPdfDesdeHtml(templateHtml);

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte-productividadpastel.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);

  } catch (error) {
    console.error("Error en generarReporteProductividad:", error);
    next(error);
  }
};

const generarReporteCIF = async (req, res) => {
    try {
        const { id } = req.params;

        // Llamamos al modelo relacional
        const paciente = await Paciente.getPacienteConCalificaciones(id);

        if (!paciente) {
            return res.status(404).send('Paciente no encontrado');
        }

        // --- INICIO PDF ---
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filename = `Informe_CIF_${paciente.carnet_identidad}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        doc.pipe(res);

        // 1. ENCABEZADO
        doc.fontSize(16).font('Helvetica-Bold').text('INFORME TÉCNICO DE DISCAPACIDAD (CIF)', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Sistema de Gestión SHOG.AI', { align: 'center' });
        doc.moveDown(2);

        // 2. DATOS PACIENTE
        doc.rect(50, 100, 500, 60).fillAndStroke('#f0f0f0', '#999999');
        doc.fillColor('black').fontSize(10);
        
        doc.font('Helvetica-Bold').text('PACIENTE:', 60, 110);
        doc.font('Helvetica').text(paciente.nombre.toUpperCase(), 130, 110);
        
        doc.font('Helvetica-Bold').text('C.I.:', 350, 110);
        doc.font('Helvetica').text(paciente.carnet_identidad, 380, 110);
        
        doc.font('Helvetica-Bold').text('EDAD:', 60, 130);
        doc.font('Helvetica').text(`${paciente.edad} años`, 130, 130);

        doc.moveDown(4);

        // 3. SECCIÓN IA (Resumida)
        doc.font('Helvetica-Bold').fontSize(12).text('1. ANÁLISIS PRELIMINAR (IA)', 50, 180);
        doc.moveTo(50, 195).lineTo(550, 195).stroke();
        
        const gradoIA = paciente.prediccion_ia_grado || 'NO PROCESADO';
        doc.fontSize(10).text(`Sugerencia IA: ${gradoIA}`, 50, 205);

        // 4. SECCIÓN DOCTOR
        const yDoctor = 240;
        doc.font('Helvetica-Bold').fontSize(12).text('2. EVALUACIÓN MÉDICA OFICIAL', 50, yDoctor);
        doc.moveTo(50, yDoctor + 15).lineTo(550, yDoctor + 15).stroke();

        if (paciente.datos_doctor) {
            // A) OBSERVACIONES Y RESULTADO GLOBAL
            doc.fontSize(10).fillColor('black');
            
            // Resultado Global
            doc.font('Helvetica-Bold').text('DICTAMEN FINAL:', 50, yDoctor + 30);
            const resultado = paciente.datos_doctor.resultado_global || 'PENDIENTE';
            
            // Color según gravedad
            if (resultado.includes('GRAVE') || resultado.includes('COMPLETO')) doc.fillColor('red');
            else if (resultado.includes('MODERADO')) doc.fillColor('orange');
            else doc.fillColor('green');
            
            doc.fontSize(12).text(resultado.toUpperCase(), 150, yDoctor + 28);
            
            // Observaciones
            doc.fillColor('black').fontSize(10).font('Helvetica-Bold').text('Observaciones Clínicas:', 50, yDoctor + 50);
            doc.font('Helvetica').text(paciente.datos_doctor.observaciones || 'Sin observaciones.', 50, yDoctor + 65, {
                width: 500, align: 'justify'
            });

            // B) TABLA DE CÓDIGOS CIF
            doc.moveDown(2);
            doc.font('Helvetica-Bold').text('Detalle de Deficiencias y Funciones (CIF):');
            doc.moveDown(0.5);

            // Cabecera Tabla
            const tableTop = doc.y;
            const codigoX = 50;
            const descX = 110;
            const gravX = 450;

            doc.fontSize(9).text('CÓDIGO', codigoX, tableTop);
            doc.text('DESCRIPCIÓN (OFICIAL / ESPECÍFICA)', descX, tableTop);
            doc.text('GRAVEDAD', gravX, tableTop);
            
            doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();
            
            let currentY = tableTop + 20;
            doc.font('Helvetica');

            // --- BUCLE DE CÓDIGOS CORREGIDO ---
            if (paciente.codigos_cif && paciente.codigos_cif.length > 0) {
                paciente.codigos_cif.forEach(item => {
                    // Verificar salto de página
                    if (currentY > 700) {
                        doc.addPage();
                        currentY = 50;
                    }

                    // 1. Código
                    doc.text(item.codigo, codigoX, currentY);

                    // 2. Descripción
                    // Usamos 'descripcion_oficial' porque así lo llamaste en tu query con COALESCE
                    // Si falla, intentamos 'descripcion_especifica' como respaldo
                    const desc = item.descripcion_oficial || item.descripcion_especifica || 'Sin descripción';
                    doc.text(desc, descX, currentY, { width: 320 });

                    // 3. Gravedad (LOGICA FIX) 🛠️
                    let textoGravedad = '';
                    
                    // Si existe gravedad específica (0,1,2,3,4) y no es null
                    if (item.gravedad_especifica !== null && item.gravedad_especifica !== undefined) {
                        textoGravedad = `Nivel ${item.gravedad_especifica}`;
                    } else {
                        // Si es NULL, usamos el Global que trajimos del JOIN
                        textoGravedad = item.resultado_global || 'General';
                    }

                    doc.text(textoGravedad, gravX, currentY);

                    currentY += 25; // Siguiente fila
                });
            } else {
                doc.text('No se registraron códigos específicos.', codigoX, currentY);
            }

        } else {
            // Sin evaluación médica
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('grey')
               .text('El paciente está registrado pero aún no ha sido evaluado oficialmente por el médico.', 50, yDoctor + 40);
        }

        // 5. FIRMAS
        const firmaY = 680;
        doc.fillColor('black');
        doc.moveTo(200, firmaY).lineTo(400, firmaY).stroke();
        doc.fontSize(10).text('Firma y Sello del Médico Evaluador', 200, firmaY + 10, { width: 200, align: 'center' });

        doc.end();

    } catch (error) {
        console.error("Error PDF:", error);
        res.status(500).send("Error generando reporte");
    }
};

module.exports = { generarReporteCIF }; // Asegúrate de exportarlo


// --- Exportamos ---
module.exports = {
  generarReportePaciente,
  generarReporteTotal,
  generarReporteDiario,
  generarReporteMensual,
  generarReporteRango,
  generarReporteZonas,
  generarReporteAreas,
  generarReporteProductividad,
  generarReporteNiveles,
  generarReporteVencimientos,
  generarReporteProductividadPastel,
  generarReporteCIF
};