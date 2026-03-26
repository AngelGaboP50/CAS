import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LoginPage.css' // Importamos los mismos estilos del login

function RegisterPage() {
  const [name, setName] = useState('')
  const [uid, setUid] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: conectar al backend para registro
    console.log('Intento de registro:', { name, uid, password, confirmPassword })
  }

  const handleGoogleRegister = () => {
    // TODO: implementar registro con Google OAuth
    console.log('Registro con Google iniciado')
  }

  return (
    <div className="login-root">
      {/* Background glows */}
      <div className="bg-glow bg-glow-primary" />
      <div className="bg-glow bg-glow-secondary" />

      {/* Header */}
      <header className="login-header">
        <div className="header-brand">
          <div className="brand-bar" />
          <div>
            <h1 className="brand-title">CAS</h1>
            <p className="brand-subtitle">Control de Acceso a Salones</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="login-main">
        {/* Data stream decorations */}
        <div className="data-stream data-stream-right">
          <div className="ds-line ds-line-short" />
          <div className="ds-line ds-line-medium ds-align-right" />
          <div className="ds-line ds-line-long" />
          <span className="ds-code">0x8842-ACCESS-GRANTED</span>
        </div>
        <div className="data-stream data-stream-left">
          <div className="ds-line ds-line-long" />
          <div className="ds-line ds-line-medium" />
          <div className="ds-line ds-line-short" />
          <span className="ds-code ds-code-left">PROTOCOL-LEVEL-4</span>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-card-inner">
            {/* Card Header */}
            <div className="card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '32px' }}>person_add</span>
              <h2 className="card-title" style={{ fontSize: '26px', margin: 0 }}>Registrarse</h2>
            </div>

            {/* Form */}
            <form className="login-form" onSubmit={handleSubmit}>
              {/* Nombre */}
              <div className="field-group">
                <label className="field-label" htmlFor="name">
                  Nombre Completo
                  <span className="field-required">Requerido</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="name"
                    type="text"
                    className="field-input"
                    placeholder="Ingresa tu nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined input-icon">badge</span>
                </div>
              </div>

              {/* University ID */}
              <div className="field-group">
                <label className="field-label" htmlFor="uid">
                  ID Universitario
                  <span className="field-required">Requerido</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="uid"
                    type="text"
                    className="field-input"
                    placeholder="Ingresa tu número de ID"
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    required
                  />
                  <span className="material-symbols-outlined input-icon">person</span>
                </div>
              </div>

              {/* Contraseña */}
              <div className="field-group">
                <label className="field-label" htmlFor="key">
                  Contraseña de Acceso
                  <span className="field-required">Requerido</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="key"
                    type={showPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Mostrar u ocultar contraseña"
                  >
                    <span className="material-symbols-outlined input-icon">
                      {showPassword ? 'visibility_off' : 'key'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div className="field-group">
                <label className="field-label" htmlFor="confirm-key">
                  Confirmar Contraseña
                  <span className="field-required">Requerido</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="confirm-key"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="field-input"
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Mostrar u ocultar confirmación de contraseña"
                  >
                    <span className="material-symbols-outlined input-icon">
                      {showConfirmPassword ? 'visibility_off' : 'key'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Botón principal */}
              <button type="submit" className="btn-submit" id="btn-registrarse">
                Crear Cuenta
                <span className="material-symbols-outlined icon-sm">person_add</span>
              </button>

              {/* Divider */}
              <div className="divider">
                <div className="divider-line" />
                <span className="divider-text">O</span>
                <div className="divider-line" />
              </div>

              {/* Google Register */}
              <button
                type="button"
                className="btn-google"
                id="btn-google-register"
                onClick={handleGoogleRegister}
              >
                <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                Registrarse con Google
              </button>
            </form>

            {/* Links de ayuda */}
            <div className="help-links" style={{ justifyContent: 'center' }}>
              <Link to="/login" className="help-link">¿Ya tienes una cuenta? Inicia sesión aquí</Link>
            </div>
          </div>
          {/* Bottom accent */}
          <div className="card-bottom-accent" />
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-links"></div>
        <p className="footer-copy">© 2026 IDGS15 EQUIPO 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}

export default RegisterPage
