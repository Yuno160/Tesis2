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

/**
 * Controlador para obtener los hijos de un código CIF padre.
 */
const getChildrenByParentCode = async (req, res) => {
  try {
    const { parent_code } = req.params;

    // Llama al nuevo método del modelo
    const children = await CifCode.getChildren(parent_code);

    // Si no se encuentran hijos, devuelve un array vacío (no es un error)
    res.status(200).json(children);

  } catch (error) {
    console.error('Error en getChildrenByParentCode:', error);
    res.status(500).json({ 
      message: 'Error interno al obtener los hijos del código CIF.',
      error: error.message
    });
  }
};

module.exports = {
  getCifTree,
  getChildrenByParentCode
  // createCifCode,
  // updateCifCode,
};