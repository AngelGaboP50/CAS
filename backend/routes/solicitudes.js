const express = require('express')
const pool = require('../db')
const jwt = require('jsonwebtoken')

const router = express.Router()

// Middleware: verificar JWT
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Obtener solicitudes
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT s.*, 
             sal.nombre as salon_nombre,
             u.nombre as profesor_nombre,
             u.correo as profesor_correo
      FROM solicitudes s
      JOIN salones sal ON s.salon_id = sal.id
      JOIN usuarios u ON s.profesor_id = u.id
    `;
    const params = [];

    // Si es profesor, solo ve sus propias solicitudes
    if (req.user.rol !== 2) {
      query += ' WHERE s.profesor_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY s.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// Obtener estado de una solicitud específica (Polling)
router.get('/:id/estado', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT estado, respuesta FROM solicitudes WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error en DB' });
  }
});

// Crear solicitud (Profesor)
router.post('/', auth, async (req, res) => {
  const { salon_id, motivo } = req.body;
  if (!req.user?.id) return res.status(401).json({ error: 'Token inválido o sin usuario' });

  // Validar y convertir salon_id a entero seguro
  const salonIdInt = parseInt(salon_id, 10);
  if (!salon_id || isNaN(salonIdInt) || salonIdInt <= 0) {
    return res.status(400).json({ error: `salon_id inválido: "${salon_id}". Debe ser un número entero positivo.` });
  }

  try {
    // Verificar que el salón exista antes de insertar
    const [salones] = await pool.query('SELECT id FROM salones WHERE id = ?', [salonIdInt]);
    if (salones.length === 0) {
      return res.status(400).json({ error: `El salón con id=${salonIdInt} no existe en la base de datos.` });
    }

    const [result] = await pool.query(
      "INSERT INTO solicitudes (salon_id, profesor_id, motivo, estado) VALUES (?, ?, ?, 'PENDIENTE')",
      [salonIdInt, req.user.id, motivo || 'Fuera de horario']
    );
    res.status(201).json({ id: result.insertId, message: 'Solicitud creada' });
  } catch (err) {
    console.error('Error al crear solicitud:', err);
    res.status(500).json({ error: err.message || 'Error al crear solicitud' });
  }
});

// Obtener estado de una solicitud (para polling)
router.get('/:id/estado', auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT estado, respuesta FROM solicitudes WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error al obtener estado:', err);
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

// Actualizar solicitud (Administrador)
router.put('/:id', auth, async (req, res) => {
  if (req.user.rol !== 2) return res.status(403).json({ error: 'Solo administradores' });
  
  const { estado, respuesta } = req.body; // 'APROBADA' o 'RECHAZADA'
  
  try {
    // 1. Actualizar solicitud
    await pool.query(
      "UPDATE solicitudes SET estado = ?, respuesta = ?, admin_id = ? WHERE id = ?",
      [estado, respuesta || '', req.user.id, req.params.id]
    );

    // 2. Si es aprobada, actualizar el salón a OCUPADO (y el ESP32 lo abrirá en su polling de /status)
    if (estado === 'APROBADA') {
      const [solRows] = await pool.query("SELECT salon_id FROM solicitudes WHERE id = ?", [req.params.id]);
      if (solRows.length > 0) {
        // Marcamos temporalmente en OPEN para que el ESP32 lo pesque (el polling lo regresa a ocupado o podemos añadir force_open logic)
        // Wait, currently backend hardware.js /status sends "OPEN" if status is "OPEN" or "OCUPADO" ? 
        // In hardware.js, GET /status sets status to 'OCUPADO' after it sends 'OPEN'.
        // So we just need to set it to 'OPEN' here!
        await pool.query("UPDATE salones SET status = 'OPEN' WHERE id = ?", [solRows[0].salon_id]);
      }
    }

    res.json({ message: 'Solicitud actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar solicitud' });
  }
});

module.exports = router;
