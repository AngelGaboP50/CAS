const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// Intentar conectar al inicio para verificar credenciales y crear tabla si no existe
pool.getConnection()
  .then(async (connection) => {
    console.log('✅ Conectado a MySQL correctamente')
    
    // Crear tabla solicitudes automáticamente si no existe
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS solicitudes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          salon_id INT NOT NULL,
          profesor_id INT NOT NULL,
          admin_id INT,
          estado ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') DEFAULT 'PENDIENTE',
          motivo VARCHAR(255),
          respuesta TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (salon_id) REFERENCES salones(id),
          FOREIGN KEY (profesor_id) REFERENCES usuarios(id),
          FOREIGN KEY (admin_id) REFERENCES usuarios(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('✅ Tabla solicitudes verificada/creada');
    } catch (e) {
      console.error('❌ Error al crear tabla solicitudes:', e);
    }
    
    connection.release()
  })
  .catch((err) => {
    console.error('❌ Error al conectar a MySQL:', err.message)
  })

module.exports = pool
