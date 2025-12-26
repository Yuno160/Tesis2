const puppeteer = require('puppeteer');
const fs = require('fs').promises; // Para lectura asíncrona
const fsSync = require('fs');      // Para verificar existencia de archivos (síncrono)
const path = require('path');

// Importamos los Modelos
const Paciente = require('../models/patient'); 
const Calificacion = require('../models/calificacion');

/**
 * Controlador para generar el PDF del carnet con FOTO
 */
const generarCarnetPdf = async (req, res) => {
  try {
    const { id_paciente } = req.params;

    // --- 1. OBTENER LOS DATOS ---
    
    // a) Buscar datos del paciente
    const paciente = await Paciente.getById(id_paciente);
    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // b) Buscar su calificación
    const calificacion = await Calificacion.getPorPaciente(id_paciente);
    // Nota: Si no hay calificación, el sistema podría fallar o generar carnet vacío. 
    // Validamos que exista:
    if (!calificacion) {
      return res.status(404).json({ message: 'Calificación no encontrada para este paciente' });
    }

    // --- 2. PROCESAR LA FOTO (Convertir a Base64) ---
    let fotoBase64 = '';
    
    // Ruta por defecto (silueta gris) si el paciente no tiene foto o el archivo se borró
    // Asegúrate de tener una imagen 'default-avatar.png' en esta ruta, o el código usará un pixel vacío.
    const defaultPhotoPath = path.join(__dirname, '..', 'assets', 'img', 'default-avatar.png'); 

    // Determinamos qué ruta usar
    let rutaFotoFinal = '';

    if (paciente.foto_url) {
        // Construimos la ruta absoluta del archivo subido
        const rutaSubida = path.join(__dirname, '..', paciente.foto_url);
        
        // Verificamos si el archivo realmente existe en el disco
        if (fsSync.existsSync(rutaSubida)) {
            rutaFotoFinal = rutaSubida;
        } else {
            // Si la BD dice que tiene foto pero el archivo no está, usamos default
            rutaFotoFinal = defaultPhotoPath;
        }
    } else {
        // No tiene foto en BD
        rutaFotoFinal = defaultPhotoPath;
    }

    // Leemos el archivo y lo convertimos a string Base64
    try {
        if (fsSync.existsSync(rutaFotoFinal)) {
            const bitmap = await fs.readFile(rutaFotoFinal);
            const ext = path.extname(rutaFotoFinal).replace('.', '').toLowerCase(); // png, jpg, jpeg
            const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
            fotoBase64 = `data:${mime};base64,${bitmap.toString('base64')}`;
        } else {
            // Si ni siquiera existe el default, mandamos vacío (se verá cuadro roto o nada)
            fotoBase64 = ''; 
        }
    } catch (err) {
        console.warn("Error al procesar la imagen del carnet:", err.message);
        fotoBase64 = ''; // Fallback de seguridad
    }


    // --- 3. PREPARAR EL HTML ---
    
    // a) Formatear la lista de códigos
    let codigosHtml = '';
    if (calificacion.codigos && calificacion.codigos.length > 0) {
      codigosHtml = calificacion.codigos.map(c => 
        `<li><strong>${c.codigo}:</strong> ${c.descripcion}</li>`
      ).join('');
    } else {
      codigosHtml = '<li>No hay códigos registrados.</li>';
    }
    
    // b) Calcular fecha de vencimiento (usamos la que viene de la BD si existe, o calculamos)
    let vencimientoStr = 'N/A';
    if (calificacion.fecha_vencimiento) {
        // Si ya tienes fecha vencimiento en la BD, úsala
        vencimientoStr = new Date(calificacion.fecha_vencimiento).toLocaleDateString('es-ES');
    } else {
        // Si no, calcúlala (4 años)
        const fechaCreacion = new Date(calificacion.fecha_creacion);
        const fechaVencimiento = new Date(fechaCreacion.setFullYear(fechaCreacion.getFullYear() + 4));
        vencimientoStr = fechaVencimiento.toLocaleDateString('es-ES'); 
    }

    // --- 4. LEER Y REEMPLAZAR EL TEMPLATE ---
    const templatePath = path.join(__dirname, '..', 'templates', 'carnet-template.html');
    let html = await fs.readFile(templatePath, 'utf-8');

    // Reemplazos de texto
    html = html.replace('{{nombre_paciente}}', paciente.nombre + ' ' + (paciente.apellido || ''));
    html = html.replace('{{ci_paciente}}', paciente.carnet_identidad);
    html = html.replace('{{edad_paciente}}', paciente.edad);
    html = html.replace('{{lista_codigos_html}}', codigosHtml);
    html = html.replace('{{fecha_vencimiento}}', vencimientoStr);
    
    // Reemplazo del Grado de Discapacidad (que agregamos en el HTML anterior)
    // Asumimos que la columna en BD se llama 'resultado_global' o similar
    html = html.replace('{{grado_discapacidad}}', (calificacion.resultado_global || 'NO ESPECIFICADO').toUpperCase());

    // Reemplazo de la FOTO
    html = html.replace('{{foto_paciente}}', fotoBase64);


    // --- 5. GENERAR EL PDF CON PUPPETEER ---
    const browser = await puppeteer.launch({ 
      headless: 'new', // Modo nuevo recomendado
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
        width: '325px',  // Coincide con el CSS del body
        height: '515px', // Coincide con el CSS del body
        printBackground: true,
        pageRanges: '1'  // Asegura que sea solo 1 página
    });

    await browser.close();

    // --- 6. ENVIAR EL PDF ---
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=carnet-${paciente.carnet_identidad}.pdf`,
      'Content-Length': pdfBuffer.length 
    });
    
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Error al generar el PDF del carnet:', error);
    res.status(500).json({ 
      message: 'Error interno al generar el PDF.',
      error: error.message
    });
  }
};

module.exports = {
  generarCarnetPdf
};