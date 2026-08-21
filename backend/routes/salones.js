const express = require('express')
const pool    = require('../db')

const router = express.Router()

// GET /api/salones — listar todos los salones
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre AS label, estado, activo, capacidad, piso FROM salones ORDER BY nombre ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error('Error al obtener salones:', err)
    res.status(500).json({ error: 'Error al obtener salones' })
  }
})

// POST /api/salones — crear un nuevo salón
router.post('/', async (req, res) => {
  const { nombre, estado, capacidad, piso } = req.body
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre del salón es requerido' })
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO salones (nombre, estado, activo, capacidad, piso) VALUES (?, ?, 1, ?, ?)',
      [nombre, estado || 'NO_DISPONIBLE', capacidad || 30, piso || 1]
    )
    res.status(201).json({ id: result.insertId, message: 'Salón creado exitosamente' })
  } catch (err) {
    console.error('Error al crear salón:', err)
    res.status(500).json({ error: 'Error al crear salón' })
  }
})

// PUT /api/salones/:id — actualizar un salón
router.put('/:id', async (req, res) => {
  const { nombre, estado, activo, capacidad, piso } = req.body
  try {
    // Si activo no viene, lo mantenemos como 1
    const nuevoActivo = activo !== undefined ? activo : 1
    await pool.query(
      'UPDATE salones SET nombre=?, estado=?, activo=?, capacidad=?, piso=? WHERE id=?',
      [nombre, estado, nuevoActivo, capacidad || 30, piso || 1, req.params.id]
    )
    res.json({ message: 'Salón actualizado correctamente' })
  } catch (err) {
    console.error('Error al actualizar salón:', err)
    res.status(500).json({ error: 'Error al actualizar salón' })
  }
})

// DELETE /api/salones/:id — desactivar un salón (borrado lógico)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE salones SET activo = 0 WHERE id = ?', [req.params.id])
    res.json({ message: 'Salón desactivado correctamente' })
  } catch (err) {
    console.error('Error al desactivar salón:', err)
    res.status(500).json({ error: 'Error al desactivar salón' })
  }
})

// Liberar el salón
router.post('/:id/liberar', async (req, res) => {
  try {
    await pool.query("UPDATE salones SET status = 'LIBRE' WHERE id = ?", [req.params.id])
    res.json({ message: 'Salón liberado exitosamente' })
  } catch (err) {
    console.error('Error al liberar el salón:', err)
    res.status(500).json({ error: 'Error al liberar el salón' })
  }
})

module.exports = router
