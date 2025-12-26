require('dotenv').config();
// controllers/auditorController.js

const { GoogleGenerativeAI } = require("@google/generative-ai");
// Inicializamos la API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.analizarDocumento = async (req, res, next) => {
  try {
    console.log("🔑 API KEY leída:", process.env.GEMINI_API_KEY ? "SÍ (OK)" : "NO (Undefined)");
    console.log("🤖 Auditoría de Expediente Iniciada...");

    // 1. VERIFICACIÓN DE ARCHIVOS (Plural)
    // Ahora buscamos 'req.files' (array), no 'req.file' (objeto único)
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Error: No has subido ningún documento al expediente." });
    }

    console.log(`📂 Se recibieron ${req.files.length} documentos para análisis.`);

    // 2. PROCESAMIENTO MULTI-ARCHIVO
    // Convertimos CADA archivo del array a un objeto que Gemini entienda (Base64)
    const fileParts = req.files.map(file => {
      return {
        inlineData: {
          data: file.buffer.toString("base64"),
          mimeType: file.mimetype, // Pasa 'application/pdf' o 'image/jpeg' automáticamente
        },
      };
    });

    // 3. ELEGIR MODELO
    // Gemini 1.5 Flash o 2.0 Flash son ideales para multimodal (texto + imágenes + pdf)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // O "gemini-2.0-flash" si tienes acceso

    // 4. EL PROMPT DEL AUDITOR MAESTRO
    // Le enseñamos a cruzar datos entre documentos.
    const prompt = `
      Actúa como un Auditor Médico experto en la Clasificación Internacional del Funcionamiento (CIF).
      
      A continuación te presento un EXPEDIENTE MÉDICO compuesto por ${req.files.length} documento(s) (pueden ser informes, radiografías, laboratorios o certificados).

      TU TAREA:
      1. Analiza TODOS los documentos adjuntos en conjunto.
      2. Cruza la información: Si la radiografía muestra una fractura y el informe menciona "limitación funcional severa", úsalo para reforzar tu conclusión.
      3. Determina el GRADO DE DISCAPACIDAD global sugerido para este paciente.

      Las opciones de grado CIF son: 
      - LIGERO (5-24%)
      - MODERADO (25-49%)
      - GRAVE (50-95%)
      - COMPLETO (96-100%)

      REGLAS DE DECISIÓN:
      - Si encuentras un porcentaje explícito en un informe oficial, úsalo como base.
      - Si hay contradicciones entre documentos, prioriza el Informe Médico Especializado o el más reciente.
      - Si ves evidencia visual (radiografías) de daño severo, ajusta el grado hacia arriba.

      FORMATO DE RESPUESTA (JSON PURO):
      Responde ÚNICAMENTE con este JSON (sin markdown):
      {
        "grado_sugerido": "GRAVE", 
        "porcentaje_detectado": "65%",
        "confianza": "ALTA",
        "justificacion": "El análisis cruzado de la radiografía (daño estructural visible) y el informe médico (que reporta hemiparesia) sugiere una deficiencia grave consistente con el rango 50-95%."
      }
    `;

    // 5. ENVIAR A GEMINI (Prompt + Array de Archivos)
    // Usamos el operador spread (...) para pasar los archivos como argumentos individuales junto al prompt
    console.log("📤 Enviando expediente a Google Gemini...");
    
    const result = await model.generateContent([prompt, ...fileParts]);
    const response = await result.response;
    const text = response.text();

    console.log("📥 Respuesta recibida de Gemini:", text);

    // 6. LIMPIEZA Y RESPUESTA
    const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let analisis;
    try {
        analisis = JSON.parse(jsonString);
    } catch (e) {
        // Fallback por si la IA devuelve texto plano por error
        console.error("Error parseando JSON de IA:", e);
        analisis = { 
            grado_sugerido: "ERROR DE LECTURA", 
            justificacion: "La IA respondió pero no en formato JSON válido. Texto crudo: " + text 
        };
    }

    res.status(200).json({
      message: "Análisis de expediente completado",
      analisis: analisis
    });

  } catch (error) {
    console.error("🔥 Error en Auditoría IA:", error);
    res.status(500).json({ 
      message: "Ocurrió un error al analizar el expediente.", 
      error: error.message 
    });
  }
};