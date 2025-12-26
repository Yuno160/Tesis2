// check_models.js
require('dotenv').config(); // Cargamos tu llave del .env

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("📡 Conectando con Google API para pedir lista de modelos...");

// Usamos fetch nativo de Node.js (disponible en versiones recientes)
fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      console.error("❌ ERROR API:", data.error.message);
      return;
    }

    console.log("\n✅ LISTA DE MODELOS DISPONIBLES PARA TU LLAVE:");
    console.log("==============================================");
    
    // Filtramos solo los que sirven para generar texto/imágenes
    const modelosUtiles = data.models.filter(m => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    modelosUtiles.forEach(model => {
      console.log(`🔹 Nombre Técnico: ${model.name}`);
      console.log(`   Versión: ${model.version}`);
      console.log(`   Descripción: ${model.displayName}`);
      console.log("----------------------------------------------");
    });
    
    console.log("\n👉 COPIA EL 'NOMBRE TÉCNICO' EXACTO (ej: models/gemini-pro) Y ÚSALO EN TU CÓDIGO.");
  })
  .catch(error => {
    console.error("🔥 Error de conexión:", error);
  });