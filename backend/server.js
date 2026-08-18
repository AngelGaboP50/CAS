require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')

const authRoutes     = require('./routes/auth')
const usuariosRoutes = require('./routes/usuarios')
const salonesRoutes  = require('./routes/salones')
const horariosRoutes = require('./routes/horarios')

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

// Servir archivos estáticos subidos (imágenes de horarios, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// ─── RUTAS ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/salones',  salonesRoutes)
app.use('/api/horarios', horariosRoutes)

// Ruta de salud (para verificar que el backend está corriendo)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CAS Backend corriendo ✅' })
})

// ─── INICIAR SERVIDOR ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend CAS corriendo en http://localhost:${PORT}`)
})
