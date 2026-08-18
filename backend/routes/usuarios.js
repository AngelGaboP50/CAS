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

// Solo admin (rol 2)
function soloAdmin(req, res, next) {
  if (req.user.rol !== 2) return res.status(403).json({ error: 'Acceso denegado' })
  next()
}

// GET /api/usuarios — lista todos los usuarios (solo admin)
router.get('/', auth, soloAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
})

// PUT /api/usuarios/:id — editar usuario (solo admin)
router.put('/:id', auth, soloAdmin, async (req, res) => {
  const { nombre, correo, rol, activo } = req.body
  try {
    // Si activo no viene en el body, asumimos 1 (activo)
    const nuevoActivo = activo !== undefined ? activo : 1;
    await pool.query(
      'UPDATE usuarios SET nombre=?, correo=?, rol=?, activo=? WHERE id=?',
      [nombre, correo, rol, nuevoActivo, req.params.id]
    )
    res.json({ message: 'Usuario actualizado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar usuario' })
  }
})

// DELETE /api/usuarios/:id — desactivar usuario (solo admin)
router.delete('/:id', auth, soloAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE usuarios SET activo = 0 WHERE id=?', [req.params.id])
    res.json({ message: 'Usuario desactivado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al desactivar usuario' })
  }
})

module.exports = router
