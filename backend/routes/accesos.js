const express  = require('express')
const pool     = require('../db')
const jwt      = require('jsonwebtoken')

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

// GET /api/accesos — listar historial
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      SELECT a.*, 
             s.nombre AS salon_nombre,
             u.nombre AS profesor_nombre, u.correo AS profesor_correo
      FROM historial_accesos a
      LEFT JOIN salones s ON a.salon_id = s.id
      LEFT JOIN usuarios u ON a.profesor_id = u.id
    `;
    const params = [];

    // Si no es admin, solo ve sus propios accesos
    if (req.user.rol !== 2) {
      query += ` WHERE a.profesor_id = ?`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY a.created_at DESC`;

    const [rows] = await pool.query(query, params);
    
    // Formatear la respuesta para el frontend
    const result = rows.map(row => ({
      ...row,
      salon: row.salon_nombre ? { nombre: row.salon_nombre } : null,
      profesor: row.profesor_nombre ? { nombre: row.profesor_nombre, correo: row.profesor_correo } : null
    }));

    res.json(result);
  } catch (err) {
    console.error('Error al obtener historial de accesos:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// POST /api/accesos — registrar un nuevo acceso
router.post('/', auth, async (req, res) => {
  const { salon_id, profesor_id, tipo, metodo, autorizado, qr_data, motivo_denegacion } = req.body;
  
  if (!salon_id || !tipo || !metodo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const isAutorizado = autorizado ? 1 : 0;
    const profId = profesor_id || req.user.id;

    const [result] = await pool.query(
      `INSERT INTO historial_accesos 
      (salon_id, profesor_id, tipo, metodo, autorizado, qr_data, motivo_denegacion) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [salon_id, profId, tipo, metodo, isAutorizado, qr_data || null, motivo_denegacion || null]
    );

    res.status(201).json({ id: result.insertId, message: 'Acceso registrado' });
  } catch (err) {
    console.error('Error al registrar acceso:', err);
    res.status(500).json({ error: 'Error al registrar acceso' });
  }
});

module.exports = router;
