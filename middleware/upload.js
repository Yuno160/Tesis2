const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Aquí indicamos dónde se guardarán
    cb(null, 'uploads/documentos/');
  },
  filename: function (req, file, cb) {
    // Generamos un nombre único para no sobreescribir archivos
    // Ej: 1698777-radiografia.pdf
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Filtro de archivos (Opcional: Solo PDFs e Imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || 
      file.mimetype === 'image/jpeg' || 
      file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado. Solo PDF, JPG y PNG.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 50 // Límite de 5MB por archivo (ajústalo si necesitas más)
  },
  fileFilter: fileFilter
});

module.exports = upload;