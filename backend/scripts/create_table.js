require('dotenv').config({ path: '../.env' })
const pool = require('../db')

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS historial_accesos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      salon_id VARCHAR(50) NOT NULL,
      profesor_id INT NULL,
      tipo ENUM('ENTRADA', 'SALIDA', 'DENEGADO', 'EXCEPCION') NOT NULL,
      metodo ENUM('QR', 'MANUAL', 'SISTEMA') NOT NULL,
      qr_data VARCHAR(255) NULL,
      autorizado BOOLEAN NOT NULL DEFAULT 1,
      motivo_denegacion VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log('Creando tabla historial_accesos...');
    await pool.query(query);
    console.log('✅ Tabla historial_accesos creada exitosamente (o ya existía).');
  } catch (err) {
    console.error('❌ Error al crear la tabla:', err.message);
  } finally {
    process.exit();
  }
}

createTable();
