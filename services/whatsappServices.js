// services/whatsappService.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const db = require('../util/database'); // Asegúrate que esta ruta a tu BD sea correcta

// 1. Configuración del Cliente
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox'] 
    }
});

// Generar QR
client.on('qr', (qr) => {
    console.log('⚡ ESCANEA ESTE QR (Si ya lo hiciste, ignora esto):');
    qrcode.generate(qr, { small: true });
});

// Cuando está listo
client.on('ready', () => {
    console.log('✅ WhatsApp conectado. Iniciando sistema de recordatorios...');
    
    // Arrancamos el Cron Job aquí
    iniciarCronJob();
});

// Función para iniciar
const iniciarWhatsApp = () => {
    console.log('Iniciando servicio de WhatsApp...');
    client.initialize();
};

// --- LÓGICA DE RECORDATORIOS ---

const iniciarCronJob = () => {
    // ⏰ Se ejecuta todos los días a las 08:00 AM
    cron.schedule('* * * * *', async () => {
        console.log('--- 🤖 Buscando citas para MAÑANA... ---');
        
        try {
            // 1. OBTENER LA FECHA DE MAÑANA
            //const hoy = new Date();
            //const manana = new Date(hoy);
            //manana.setDate(manana.getDate() + 1); // <--- ¡AQUÍ ESTÁ EL TRUCO! Sumamos un día
            
            // Formateamos para SQL (YYYY-MM-DD)
            //const fechaBusqueda = manana.toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
            
           // console.log(`🔎 Buscando reservas para la fecha: ${fechaBusqueda}`);
            const fechaBusqueda = '2025-12-23';
            console.log(`🔎 Forzando Busqueda para la fecha: ${fechaBusqueda}`);

            // 2. Consultamos la BD usando esa fecha futura
            const [reservasManana] = await db.query(
               `SELECT r.fecha_hora_inicio, p.nombre, p.telefono 
                 FROM reservas r
                 JOIN paciente p ON r.id_paciente = p.id_paciente
                 WHERE DATE(r.fecha_hora_inicio) = ? 
                 AND r.estado NOT IN ('Completada', 'Cancelada')`,
                [fechaBusqueda] // <--- Usamos la fecha de mañana
            );

            if (reservasManana.length === 0) {
                console.log('📅 No hay citas programadas para mañana.');
                return;
            }

            console.log(`📬 Se encontraron ${reservasManana.length} citas para mañana. Enviando recordatorios...`);

            // 3. Enviamos los mensajes
            for (const cita of reservasManana) {
                if (cita.telefono) {
                    await enviarMensaje(cita); // <--- Llamamos a la función actualizada (ver abajo)
                    // Espera anti-spam
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

        } catch (error) {
            console.error('❌ Error en el proceso de recordatorios:', error);
        }
    });
};

// Función auxiliar para enviar un solo mensaje
async function enviarMensaje(cita) {
    try {
        let numero = cita.telefono.replace(/\D/g, '');

        if (!numero.startsWith('591')) {
            numero = '591' + numero;
        }

        const chatId = numero + "@c.us";
        const hora = new Date(cita.fecha_hora_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // --- CAMBIO EN EL TEXTO DEL MENSAJE ---
        const mensaje = `Hola *${cita.nombre}* 👋\n` +
                        `Le recordamos que tiene una cita médica programada para *MAÑANA a las ${hora}*.\n` + // <--- Dice MAÑANA
                        `Por favor, llegue 10 minutos antes.\n\n` +
                        `_Este es un mensaje automático del Sistema SEDCI`;

        await client.sendMessage(chatId, mensaje);
        console.log(`✅ Recordatorio enviado a ${cita.nombre} (${numero})`);

    } catch (error) {
        console.error(`❌ Error enviando a ${cita.nombre}:`, error);
    }
}

module.exports = { iniciarWhatsApp };