const CifCode = require('../models/cifCode');

/**
 * Controlador para obtener la jerarquía completa 
 * de códigos CIF como un árbol.
 */
const getCifTree = async (req, res) => {
  try {
    // 1. Pedirle el árbol al Modelo
    const tree = await CifCode.getTree();
    
    // 2. Enviar la respuesta
    res.json(tree);

  } catch (error) {
    // 3. Manejo de errores
    console.error('Error al obtener el árbol CIF:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al procesar la solicitud.' 
    });
  }
};

// Aquí añadirías los otros controladores
// const createCifCode = async (req, res) => { ... }
// const updateCifCode = async (req, res) => { ... }

// Exportamos las funciones que usarán las rutas
module.exports = {
  getCifTree,
  // createCifCode,
  // updateCifCode,
};