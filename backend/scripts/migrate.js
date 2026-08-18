const pool = require('../db')

async function up() {
  try {
    console.log('Aplicando migraciones a la tabla usuarios...')

    // Agregar columna is_verified si no existe
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN is_verified TINYINT(1) DEFAULT 0')
      console.log('✅ Columna is_verified agregada')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ Columna is_verified ya existe')
      else throw e
    }

    // Agregar columna verification_code si no existe
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN verification_code VARCHAR(10)')
      console.log('✅ Columna verification_code agregada')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ Columna verification_code ya existe')
      else throw e
    }

    // Agregar columna reset_token si no existe
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN reset_token VARCHAR(255)')
      console.log('✅ Columna reset_token agregada')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ Columna reset_token ya existe')
      else throw e
    }

    // Agregar columna reset_token_expires si no existe
    try {
      await pool.query('ALTER TABLE usuarios ADD COLUMN reset_token_expires DATETIME')
      console.log('✅ Columna reset_token_expires agregada')
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('⚠️ Columna reset_token_expires ya existe')
      else throw e
    }

    console.log('✨ Migraciones completadas exitosamente')
  } catch (err) {
    console.error('❌ Error ejecutando migraciones:', err)
  } finally {
    process.exit(0)
  }
}

up()
