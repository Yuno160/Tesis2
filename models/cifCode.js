// Asumiendo que tienes tu db de conexión en 'db.js' o similar 
const db = require('../util/database');// <-- Ajusta esta ruta
// --- Esta es la función mágica ---
// La ponemos aquí, en el modelo, porque es lógica de datos.
// La hacemos privada (con _ o simplemente no exportándola)
function _buildTree(nodes) {
  const map = {};    // Mapa para acceso rápido a nodos por 'codigo'
  const tree = [];   // El árbol final

  // 1. Primera pasada: Mapear todos los nodos
  nodes.forEach(node => {
    map[node.codigo] = { ...node, children: [] };
  });

  // 2. Segunda pasada: Relacionar hijos con padres
  Object.values(map).forEach(node => {
    if (node.parent_code && map[node.parent_code]) {
      // Si tiene un padre y el padre existe en el mapa...
      // Añadir este nodo a los 'children' de su padre
      map[node.parent_code].children.push(node);
    } else {
      // Si no tiene padre (es raíz) o el padre no se encontró
      // (aunque no debería pasar si la data está limpia), 
      // lo añadimos al nivel superior del árbol.
      tree.push(node);
    }
  });

  return tree;
}

// --- Tu clase Modelo ---
class CifCode {
  
  /**
   * Obtiene todos los códigos CIF y los devuelve
   * como una estructura de árbol (JSON anidado).
   */
  static async getTree() {
    // 1. Obtener la lista plana de la base de datos
    const [rows] = await db.execute(
      'SELECT * FROM cif_codes ORDER BY codigo'
    );
    
    // 2. Construir el árbol en memoria
    const tree = _buildTree(rows);
    
    // 3. Devolver el árbol
    return tree;
  }

  static async getChildren(parentCode) {
    const [rows] = await db.execute(
      'SELECT id, codigo, descripcion FROM cif_codes WHERE parent_code = ? ORDER BY codigo',
      [parentCode]
    );
    // Devolvemos solo los campos necesarios para las opciones
    return rows; 
  }
  

}

module.exports = CifCode;