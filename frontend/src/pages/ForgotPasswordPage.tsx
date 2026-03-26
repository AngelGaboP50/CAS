import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LoginPage.css' // Reutilizamos los estilos del login

function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: conectar al backend para enviar la solicitud de recuperación
    console.log('Solicitud de recuperación para:', identifier)
    setIsSubmitted(true)
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
          <span className="ds-code">0x8842-RECOVERY</span>
        </div>
        <div className="data-stream data-stream-left">
          <div className="ds-line ds-line-long" />
          <div className="ds-line ds-line-medium" />
          <div className="ds-line ds-line-short" />
          <span className="ds-code ds-code-left">PROTOCOL-LEVEL-2</span>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-card-inner">
            {/* Card Header */}
            <div className="card-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', paddingBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-secondary)', fontSize: '32px' }}>lock_reset</span>
              <h2 className="card-title" style={{ fontSize: '26px', margin: 0 }}>Recuperar contraseña</h2>
            </div>
            
            <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Ingresa tu ID Universitario o correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>

            {/* Form */}
            {!isSubmitted ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="field-group">
                  <label className="field-label" htmlFor="identifier">
                    ID Universitario / Correo
                    <span className="field-required">Requerido</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      id="identifier"
                      type="text"
                      className="field-input"
                      placeholder="Ingresa tu ID o correo"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                    <span className="material-symbols-outlined input-icon">mail</span>
                  </div>
                </div>

                {/* Botón principal */}
                <button type="submit" className="btn-submit" id="btn-recover">
                  Enviar instrucciones
                  <span className="material-symbols-outlined icon-sm">send</span>
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-primary)', marginBottom: '16px' }}>check_circle</span>
                <h3 style={{ color: 'var(--color-text)', fontSize: '18px', margin: '0 0 8px 0' }}>Solicitud enviada</h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '14px', margin: '0' }}>Si existe una cuenta asociada a esos datos, recibirás un correo con las instrucciones.</p>
              </div>
            )}

            {/* Links de ayuda */}
            <div className="help-links" style={{ justifyContent: 'center', marginTop: isSubmitted ? '32px' : '0' }}>
              <Link to="/login" className="help-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
          {/* Bottom accent */}
          <div className="card-bottom-accent" />
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-links"></div>
        <p className="footer-copy">© 2026 IDGS15 Equipo 6. TODOS LOS DERECHOS RESERVADOS.</p>
      </footer>
    </div>
  )
}

export default ForgotPasswordPage
