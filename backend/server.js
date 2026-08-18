require('dotenv').config()
const express = require('express')
const cors    = require('cors')

const authRoutes     = require('./routes/auth')
const usuariosRoutes = require('./routes/usuarios')
const salonesRoutes  = require('./routes/salones')

const app  = express()
const PORT = process.env.PORT || 3001

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Permitir cualquier localhost en desarrollo
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/salones',  salonesRoutes)

// Ruta de salud (para verificar que el backend está corriendo)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CAS Backend corriendo ✅' })
})

// ─── INICIAR SERVIDOR ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend CAS corriendo en http://localhost:${PORT}`)
})
