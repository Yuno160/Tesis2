const puppeteer = require('puppeteer');
const fs = require('fs').promises; // Para leer el template
const path = require('path');

// Importamos los Modelos para buscar los datos
const Paciente = require('../models/patient'); // (O pacienteModel.js)
const Calificacion = require('../models/calificacion');

/**
 * Controlador para generar el PDF del carnet
 */
const generarCarnetPdf = async (req, res) => {
  try {
    const { id_paciente } = req.params;

    // --- 1. OBTENER LOS DATOS (¡2 consultas!) ---
    
    // a) Buscar datos del paciente
    const paciente = await Paciente.getById(id_paciente);
    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // b) Buscar su calificación
    const calificacion = await Calificacion.getPorPaciente(id_paciente);
    if (!calificacion) {
      return res.status(404).json({ message: 'Calificación no encontrada para este paciente' });
    }

    // --- 2. PREPARAR EL HTML ---
    
    // a) Formatear la lista de códigos
    let codigosHtml = '';
    if (calificacion.codigos && calificacion.codigos.length > 0) {
      codigosHtml = calificacion.codigos.map(c => 
        `<li><strong>${c.codigo}:</strong> ${c.descripcion}</li>`
      ).join('');
    } else {
      codigosHtml = '<li>No hay códigos registrados.</li>';
    }
    
    // b) Calcular fecha de vencimiento (4 años)
    const fechaCreacion = new Date(calificacion.fecha_creacion);
    const fechaVencimiento = new Date(fechaCreacion.setFullYear(fechaCreacion.getFullYear() + 4));
    const vencimientoStr = fechaVencimiento.toLocaleDateString('es-ES'); // Formato dd/mm/aaaa

    // --- 3. LEER Y REEMPLAZAR EL TEMPLATE ---
    const templatePath = path.join(__dirname, '..', 'templates', 'carnet-template.html');
    let html = await fs.readFile(templatePath, 'utf-8');

    html = html.replace('{{nombre_paciente}}', paciente.nombre + ' ' + (paciente.apellido || ''));
    html = html.replace('{{ci_paciente}}', paciente.carnet_identidad);
    html = html.replace('{{edad_paciente}}', paciente.edad + ' años');
    html = html.replace('{{lista_codigos_html}}', codigosHtml);
    html = html.replace('{{fecha_vencimiento}}', vencimientoStr);

    // --- 4. GENERAR EL PDF CON PUPPETEER ---
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Opcional, para servidores
    });
    const page = await browser.newPage();
    
    // Le decimos que use el HTML que acabamos de rellenar
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generamos el PDF
    const pdfBuffer = await page.pdf({
        // En lugar de 'format', usamos el tamaño exacto del template
        width: '325px',
        height: '515px',
        printBackground: true
    });

    await browser.close();

    // --- 5. ENVIAR EL PDF AL NAVEGADOR ---
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=carnet-${paciente.ci}.pdf`,
      
      // --- ¡ESTA ES LA LÍNEA CLAVE! ---
      // Le dice al navegador el tamaño exacto del archivo
      'Content-Length': pdfBuffer.length 
    });
    
    // Usamos res.end() para enviar el buffer binario
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Error al generar el PDF:', error);
    res.status(500).json({ 
      message: 'Error interno al generar el PDF.',
      error: error.message
    });
  }
};

module.exports = {
  generarCarnetPdf
};