const Documento = require('../models/documento');

// Subir Archivo
exports.subirDocumento = async (req, res, next) => {
  try {
    // 1. Validar si Multer procesó el archivo
    if (!req.file) {
      return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
    }

    const { id_paciente, tipo_documento } = req.body;
    const archivo = req.file;

    // 2. Guardar referencia en BD
    // req.file.path contiene algo como "uploads\documentos\123456-archivo.pdf"
    await Documento.create(
      id_paciente, 
      archivo.originalname, 
      archivo.path, 
      tipo_documento
    );

    res.status(201).json({ 
      message: 'Documento subido exitosamente', 
      archivo: archivo.filename 
    });

  } catch (error) {
    console.error("Error al subir documento:", error);
    res.status(500).json({ message: 'Error interno al procesar el archivo' });
  }
};

// Listar Archivos de un Paciente
exports.listarDocumentos = async (req, res, next) => {
  try {
    const { idPaciente } = req.params;
    const docs = await Documento.getByPacienteId(idPaciente);
    res.status(200).json(docs);
  } catch (error) {
    console.error("Error al listar documentos:", error);
    res.status(500).json({ message: 'Error al obtener lista de documentos' });
  }
};