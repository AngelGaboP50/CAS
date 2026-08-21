const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Objeto global en memoria para guardar el estado de cada puerta
if (!global.hardwareState) {
  global.hardwareState = {};
}

// Helper para verificar JWT
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ESP32 pide un token nuevo cada 5 minutos
router.get('/token', (req, res) => {
  const { salon_id } = req.query;
  if (!salon_id) return res.status(400).json({ error: 'Falta salon_id' });

  const newToken = crypto.randomBytes(4).toString('hex'); // Token corto de 8 caracteres
  
  if (!global.hardwareState[salon_id]) {
    global.hardwareState[salon_id] = { status: 'LOCKED', token: newToken, lastScannedBy: null };
  } else {
    global.hardwareState[salon_id].token = newToken;
  }

  res.json({ token: newToken });
});

// ESP32 consulta el estado cada 2 segundos
router.get('/status', async (req, res) => {
  const { salon_id } = req.query;
  if (!salon_id) return res.status(400).json({ error: 'Falta salon_id' });

  try {
    // 1. Verificar si hay un comando de apertura forzada temporal en memoria (OPEN)
    const state = global.hardwareState[salon_id];
    if (state && state.status === 'OPEN') {
      // Si estaba abierto temporalmente por un scan, lo regresamos a LOCKED en memoria
      // y respondemos OPEN para que el ESP32 sepa que acaba de haber un scan exitoso
      state.status = 'LOCKED';
      return res.json({ status: 'OPEN' });
    }

    // 2. Si no hay un comando de apertura, consultar el estado real en la base de datos
    const [rows] = await pool.query('SELECT estado FROM salones WHERE id = ?', [salon_id]);
    
    if (rows.length === 0) {
      return res.json({ status: 'NO_DISPONIBLE' });
    }
    
    // Responder con el estado real de la BD (ej. 'LIBRE', 'EN_CLASE', 'NO_DISPONIBLE')
    res.json({ status: rows[0].estado });
  } catch (err) {
    console.error('Error obteniendo status del hardware:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Frontend envía el token escaneado
router.post('/scan', auth, async (req, res) => {
  const { salon_id, token } = req.body;
  if (!salon_id || !token) return res.status(400).json({ error: 'Faltan datos' });

  const state = global.hardwareState[salon_id];
  
  if (!state || state.token !== token) {
    return res.status(400).json({ error: 'Código QR inválido o expirado. Vuelve a escanear.' });
  }

  // --- LÓGICA DE VERIFICACIÓN DE HORARIO ---
  // Por requerimiento actual, los profesores siempre deberán mandar solicitud al admin
  const tieneHorarioAhorita = false; 

  if (tieneHorarioAhorita) {
    // Abrir la puerta
    state.status = 'OPEN';
    state.lastScannedBy = req.user.id;

    try {
      // Registrar en el historial
      await pool.query(
        `INSERT INTO historial_accesos (salon_id, profesor_id, tipo, metodo, autorizado, qr_data) 
         VALUES (?, ?, 'ENTRADA', 'QR_DINAMICO', 1, ?)`,
        [salon_id, req.user.id, token]
      );
      
      // Intentar actualizar el salón a ocupado (ignorar si la columna no existe)
      try {
        await pool.query(`UPDATE salones SET estado = 'Ocupado' WHERE id = ?`, [salon_id]);
      } catch (e) {
        console.log('La tabla salones no tiene columna estado, se ignora.');
      }
      
      res.json({ status: 'GRANTED', message: 'Acceso concedido. Puerta abriéndose.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar el acceso' });
    }
  } else {
    // No es su hora, requiere solicitud
    res.json({ status: 'REQUIRES_REQUEST', message: 'No tienes clase asignada a esta hora.' });
  }
});

// Ruta que llama el Frontend (Admin) cuando aprueba una solicitud
router.post('/force_open', auth, async (req, res) => {
  const { salon_id } = req.body;
  if (!salon_id) return res.status(400).json({ error: 'Falta salon_id' });

  const state = global.hardwareState[salon_id];
  
  if (!state) {
    // Si no estaba inicializado, lo inicializamos
    global.hardwareState[salon_id] = { status: 'OPEN', token: crypto.randomBytes(4).toString('hex'), lastScannedBy: req.user.id };
  } else {
    state.status = 'OPEN';
    state.lastScannedBy = req.user.id;
  }

  try {
    // Intentar actualizar el salón a ocupado
    await pool.query(`UPDATE salones SET estado = 'Ocupado' WHERE id = ?`, [salon_id]);
  } catch (e) {
    console.log('Error actualizando salón a ocupado:', e.message);
  }

  res.json({ status: 'SUCCESS', message: 'Puerta abriéndose.' });
});

module.exports = router;
