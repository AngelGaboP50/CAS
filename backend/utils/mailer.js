const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Verificar la configuración al iniciar (no crashear si falla, solo mostrar aviso)
transporter.verify().then(() => {
  console.log('✅ Listo para enviar correos (Nodemailer configurado)')
}).catch(err => {
  console.warn('⚠️ Advertencia: No se pudo conectar a SMTP. Verifica tus credenciales de correo en .env')
})

const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"CAS Soporte" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    })
    console.log(`Correo enviado a ${to}: ${info.messageId}`)
    return true
  } catch (error) {
    console.error('Error enviando correo:', error)
    return false
  }
}

module.exports = { sendEmail }
