require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')

const authRoutes     = require('./routes/auth')
const usuariosRoutes = require('./routes/usuarios')
const salonesRoutes  = require('./routes/salones')
const horariosRoutes = require('./routes/horarios')
const accesosRoutes  = require('./routes/accesos')
const hardwareRoutes = require('./routes/hardware')
const app  = express()
const PORT = process.env.PORT || 3001

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Permitir cualquier origen para producción y desarrollo local
    callback(null, true)
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
app.use('/api/accesos',  accesosRoutes)
app.use('/api/hardware', hardwareRoutes)

// Ruta de salud (para verificar que el backend está corriendo)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CAS Backend corriendo ✅' })
})

// ─── INICIAR SERVIDOR ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend CAS corriendo en http://localhost:${PORT}`)
})
