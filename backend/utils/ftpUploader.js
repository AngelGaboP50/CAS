const ftp = require('basic-ftp')
const path = require('path')
require('dotenv').config()

/**
 * Sube un archivo local al servidor FTP de Hostinger
 * @param {string} localFilePath - Ruta local del archivo (en uploads/horarios)
 * @param {string} filename - Nombre con el que se guardará remotamente
 * @returns {Promise<string>} URL pública de la imagen en Hostinger
 */
async function uploadToHostingerFTP(localFilePath, filename) {
  const host = process.env.FTP_HOST
  const user = process.env.FTP_USER
  const password = process.env.FTP_PASSWORD
  const remoteDir = process.env.FTP_REMOTE_DIR || '/domains/devnationqro.com/public_html/Imagenes_horarios'
  const publicBaseUrl = process.env.PUBLIC_HORARIOS_URL || 'https://devnationqro.com/Imagenes_horarios'

  // Si no se han configurado credenciales FTP, usar almacenamiento local
  if (!host || !user || !password) {
    console.log('⚠️ FTP sin contraseña configurada en .env, usando almacenamiento local temporal.')
    return `/uploads/horarios/${filename}`
  }

  const client = new ftp.Client()
  client.ftp.verbose = false

  try {
    await client.access({
      host,
      port: Number(process.env.FTP_PORT) || 21,
      user,
      password,
      secure: process.env.FTP_SECURE === 'true'
    })

    // Asegurar que el directorio remoto exista
    await client.ensureDir(remoteDir)

    // Subir archivo
    await client.uploadFrom(localFilePath, filename)
    console.log(`✅ Archivo ${filename} subido exitosamente a Hostinger (${remoteDir})`)

    return `${publicBaseUrl.replace(/\/$/, '')}/${filename}`
  } catch (err) {
    console.error('❌ Error al transferir por FTP a Hostinger:', err.message)
    // En caso de fallo, fallback al path local
    return `/uploads/horarios/${filename}`
  } finally {
    client.close()
  }
}

module.exports = { uploadToHostingerFTP }
