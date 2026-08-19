const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const pool    = require('../db')
const jwt     = require('jsonwebtoken')
const { uploadToHostingerFTP } = require('../utils/ftpUploader')

const router = express.Router()

// Asegurar que la carpeta de subidas exista
const uploadDir = path.join(__dirname, '..', 'uploads', 'horarios')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `horario-${uniqueSuffix}${ext}`)
  }
})

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '')
  const mime = file.mimetype.toLowerCase()
  if (allowed.test(ext) && (mime.includes('image') || allowed.test(mime))) {
    cb(null, true)
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP)'))
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
})

// Helper para extraer usuario de token o headers/body
function getAuthUser(req) {
  const authHeader = req.headers['authorization']
  if (authHeader) {
    const token = authHeader.split(' ')[1]
    if (token) {
      try {
        return jwt.verify(token, process.env.JWT_SECRET)
      } catch (e) {}
    }
  }
  return null
}

// ─── 1. OBTENER MI HORARIO (Profesor) ─────────────────────────────────────────
// GET /api/horarios/mi-horario?usuario_id=X
router.get('/mi-horario', async (req, res) => {
  try {
    const authUser = getAuthUser(req)
    const usuarioId = req.query.usuario_id || (authUser ? authUser.id : null)

    if (!usuarioId) {
      return res.status(400).json({ error: 'Se requiere el ID del usuario' })
    }

    const [rows] = await pool.query(
      `SELECT id, profesor_id, imagen_url, estado, comentarios, subido_por, 
              autorizado_por, fecha_subida, fecha_autorizacion, activo 
       FROM horarios_profesores 
       WHERE profesor_id = ? AND activo = 1 
       ORDER BY fecha_subida DESC LIMIT 1`,
      [usuarioId]
    )

    if (rows.length === 0) {
      return res.json({ horario: null })
    }

    res.json({ horario: rows[0] })
  } catch (err) {
    console.error('Error al obtener mi horario:', err)
    res.status(500).json({ error: 'Error al obtener horario' })
  }
})

// ─── 2. SUBIR HORARIO (Profesor) ──────────────────────────────────────────────
// POST /api/horarios/upload (multipart/form-data con campo 'imagen' y opcional 'usuario_id')
router.post('/upload', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debes seleccionar un archivo de imagen válido' })
    }

    const authUser = getAuthUser(req)
    const profesorId = req.body.usuario_id || (authUser ? authUser.id : null)

    if (!profesorId) {
      return res.status(400).json({ error: 'ID de profesor no proporcionado' })
    }

    const localFilePath = path.join(uploadDir, req.file.filename)
    // Sube a Hostinger FTP y obtiene la URL pública https://devnationqro.com/Imagenes_horarios/...
    const imagenUrl = await uploadToHostingerFTP(localFilePath, req.file.filename)

    // Desactivar horarios anteriores del profesor
    await pool.query(
      'UPDATE horarios_profesores SET activo = 0 WHERE profesor_id = ?',
      [profesorId]
    )

    // Insertar nuevo horario pendiente
    const [result] = await pool.query(
      `INSERT INTO horarios_profesores 
       (profesor_id, imagen_url, estado, subido_por, activo, fecha_subida) 
       VALUES (?, ?, 'pendiente', 'profesor', 1, NOW())`,
      [profesorId, imagenUrl]
    )

    const [nuevo] = await pool.query(
      'SELECT * FROM horarios_profesores WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      message: 'Horario subido correctamente. En espera de autorización del administrador.',
      horario: nuevo[0]
    })
  } catch (err) {
    console.error('Error al subir horario:', err)
    res.status(500).json({ error: err.message || 'Error al subir horario' })
  }
})

// ─── 3. SUBIR/ASIGNAR DIRECTO POR ADMIN ─────────────────────────────────────────
// POST /api/horarios/admin-asignar (multipart/form-data con 'imagen', 'profesor_id', opcional 'admin_id')
router.post('/admin-asignar', upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debes seleccionar un archivo de imagen válido' })
    }

    const authUser = getAuthUser(req)
    const profesorId = req.body.profesor_id
    const adminId = req.body.admin_id || (authUser ? authUser.id : null)

    if (!profesorId) {
      return res.status(400).json({ error: 'Debes seleccionar un profesor' })
    }

    const localFilePath = path.join(uploadDir, req.file.filename)
    // Sube a Hostinger FTP y obtiene la URL pública
    const imagenUrl = await uploadToHostingerFTP(localFilePath, req.file.filename)

    // Desactivar horarios anteriores del profesor
    await pool.query(
      'UPDATE horarios_profesores SET activo = 0 WHERE profesor_id = ?',
      [profesorId]
    )

    // Insertar nuevo horario directamente autorizado por admin
    const [result] = await pool.query(
      `INSERT INTO horarios_profesores 
       (profesor_id, imagen_url, estado, subido_por, autorizado_por, activo, fecha_subida, fecha_autorizacion) 
       VALUES (?, ?, 'autorizado', 'admin', ?, 1, NOW(), NOW())`,
      [profesorId, imagenUrl, adminId]
    )

    const [nuevo] = await pool.query(
      'SELECT * FROM horarios_profesores WHERE id = ?',
      [result.insertId]
    )

    res.status(201).json({
      message: 'Horario asignado y autorizado exitosamente al profesor.',
      horario: nuevo[0]
    })
  } catch (err) {
    console.error('Error al asignar horario por admin:', err)
    res.status(500).json({ error: err.message || 'Error al asignar horario' })
  }
})

// ─── 4. LISTAR TODOS LOS HORARIOS (Para Admin) ─────────────────────────────────
// GET /api/horarios?estado=pendiente|autorizado|rechazado|todos
router.get('/', async (req, res) => {
  try {
    const { estado } = req.query
    let query = `
      SELECT h.id, h.profesor_id, h.imagen_url, h.estado, h.comentarios, 
             h.subido_por, h.autorizado_por, h.fecha_subida, h.fecha_autorizacion,
             u.nombre AS profesor_nombre, u.correo AS profesor_correo
      FROM horarios_profesores h
      INNER JOIN usuarios u ON h.profesor_id = u.id
      WHERE h.activo = 1
    `
    const params = []

    if (estado && estado !== 'todos') {
      query += ' AND h.estado = ?'
      params.push(estado)
    }

    query += ' ORDER BY h.fecha_subida DESC'

    const [rows] = await pool.query(query, params)
    res.json(rows)
  } catch (err) {
    console.error('Error al listar horarios:', err)
    res.status(500).json({ error: 'Error al listar horarios' })
  }
})

// ─── 5. CAMBIAR ESTADO (Autorizar / Rechazar por Admin) ─────────────────────────
// PATCH /api/horarios/:id/estado
router.patch('/:id/estado', async (req, res) => {
  try {
    const { estado, comentarios, admin_id } = req.body
    const horarioId = req.params.id

    if (!['autorizado', 'rechazado', 'pendiente'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' })
    }

    const authUser = getAuthUser(req)
    const adminId = admin_id || (authUser ? authUser.id : null)
    const fechaAut = estado === 'autorizado' ? new Date() : null

    await pool.query(
      `UPDATE horarios_profesores 
       SET estado = ?, comentarios = ?, autorizado_por = ?, fecha_autorizacion = ?
       WHERE id = ?`,
      [estado, comentarios || null, adminId, fechaAut, horarioId]
    )

    res.json({ message: `Horario ${estado} exitosamente` })
  } catch (err) {
    console.error('Error al cambiar estado de horario:', err)
    res.status(500).json({ error: 'Error al actualizar estado del horario' })
  }
})

// ─── 6. ELIMINAR / DESACTIVAR HORARIO ──────────────────────────────────────────
// DELETE /api/horarios/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE horarios_profesores SET activo = 0 WHERE id = ?', [req.params.id])
    res.json({ message: 'Horario eliminado correctamente' })
  } catch (err) {
    console.error('Error al eliminar horario:', err)
    res.status(500).json({ error: 'Error al eliminar horario' })
  }
})

module.exports = router
