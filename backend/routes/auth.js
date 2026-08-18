const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const crypto   = require('crypto')
const pool     = require('../db')
const { sendEmail } = require('../utils/mailer')

const router = express.Router()

// Función auxiliar para generar un código OTP de 6 dígitos
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

// ─── REGISTRO ────────────────────────────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nombre, correo, password } = req.body

  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const [existe] = await pool.query('SELECT id FROM usuarios WHERE correo = ?', [correo])
    if (existe.length > 0) {
      return res.status(409).json({ error: 'Este correo ya está registrado' })
    }

    const password_hash = await bcrypt.hash(password, 10)
    const verificationCode = generateOTP()

    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash, rol, is_verified, verification_code) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, correo, password_hash, 1, 0, verificationCode]
    )

    // Enviar correo con OTP
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2b5c8f; text-align: center;">Verifica tu correo electrónico</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Gracias por registrarte en CAS (Control de Acceso a Salones). Para completar tu registro y activar tu cuenta, ingresa el siguiente código de verificación:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
          ${verificationCode}
        </div>
        <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} CAS Equipo 6</p>
      </div>
    `
    await sendEmail(correo, 'Verificación de cuenta CAS', html)

    return res.status(201).json({
      message: 'Cuenta creada. Revisa tu correo para obtener el código de verificación.',
      userId: result.insertId
    })
  } catch (err) {
    console.error('Error en /register:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── VERIFICAR EMAIL ────────────────────────────────────────────────────────
// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { correo, code } = req.body

  if (!correo || !code) {
    return res.status(400).json({ error: 'Correo y código son requeridos' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, verification_code FROM usuarios WHERE correo = ?',
      [correo]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const usuario = rows[0]

    if (usuario.verification_code !== code) {
      return res.status(400).json({ error: 'Código de verificación incorrecto' })
    }

    // Actualizar usuario como verificado
    await pool.query(
      'UPDATE usuarios SET is_verified = 1, verification_code = NULL WHERE id = ?',
      [usuario.id]
    )

    return res.status(200).json({ message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' })
  } catch (err) {
    console.error('Error en /verify-email:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { correo, password } = req.body

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, correo, password_hash, rol, activo, is_verified FROM usuarios WHERE correo = ?',
      [correo]
    )

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    const usuario = rows[0]

    // Si tiene la columna is_verified (puede que algunos usuarios viejos tengan NULL, lo cual se considera verificado si no es estrictamente 0)
    if (usuario.is_verified === 0) {
      return res.status(403).json({ error: 'Tu cuenta no está verificada. Revisa tu correo electrónico.' })
    }

    if (usuario.activo === 0) {
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Comunícate con un administrador.' })
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' })
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol:    usuario.rol
      }
    })
  } catch (err) {
    console.error('Error en /login:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── RECUPERAR CONTRASEÑA (SOLICITAR) ────────────────────────────────────────
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { correo } = req.body

  if (!correo) {
    return res.status(400).json({ error: 'El correo es requerido' })
  }

  try {
    const [rows] = await pool.query('SELECT id, nombre FROM usuarios WHERE correo = ?', [correo])
    
    // Siempre respondemos OK por seguridad para no revelar correos registrados
    if (rows.length === 0) {
      return res.status(200).json({ message: 'Si el correo existe, se enviarán las instrucciones.' })
    }

    const usuario = rows[0]
    const resetToken = crypto.randomBytes(32).toString('hex')

    // El token expirará en 1 hora
    await pool.query(
      'UPDATE usuarios SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [resetToken, usuario.id]
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #2b5c8f; text-align: center;">Recuperación de Contraseña</h2>
        <p>Hola <strong>${usuario.nombre}</strong>,</p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en CAS.</p>
        <p>Para crear una nueva contraseña, haz clic en el siguiente enlace. Este enlace caducará en 1 hora.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #4a90e2; color: white; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold;">Restablecer mi contraseña</a>
        </div>
        <p>Si no solicitaste esto, puedes ignorar este correo de forma segura. Tu contraseña no cambiará hasta que accedas al enlace y crees una nueva.</p>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 30px;">© ${new Date().getFullYear()} CAS Equipo 6</p>
      </div>
    `

    await sendEmail(correo, 'Recuperación de Contraseña - CAS', html)

    return res.status(200).json({ message: 'Si el correo existe, se enviarán las instrucciones.' })
  } catch (err) {
    console.error('Error en /forgot-password:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── RECUPERAR CONTRASEÑA (CONFIRMAR) ────────────────────────────────────────
// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    )

    if (rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha caducado' })
    }

    const usuario = rows[0]
    const password_hash = await bcrypt.hash(newPassword, 10)

    await pool.query(
      'UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [password_hash, usuario.id]
    )

    return res.status(200).json({ message: 'Contraseña actualizada exitosamente' })
  } catch (err) {
    console.error('Error en /reset-password:', err)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ─── VERIFICAR TOKEN ──────────────────────────────────────────────────────────
// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return res.status(200).json({ usuario: decoded })
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
})

module.exports = router
