import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isDiscordConfigured } from "@/lib/env";

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "brand-symbol brand-symbol-small" : "brand-symbol"} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none" role="img">
        <path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" stroke="currentColor" strokeWidth="2.5" />
        <path d="M16 32V16h11c5 0 8 3 8 8s-3 8-8 8H16Zm8-12v8h3a4 4 0 0 0 0-8h-3Z" fill="currentColor" />
      </svg>
    </span>
  );
}

async function AuthActions({ compact = false }: { compact?: boolean }) {
  const user = await getCurrentUser();
  if (user) {
    return (
      <Link href="/dashboard" className={compact ? "nav-cta" : "hero-button hero-button-primary"}>
        <span>Ir a mi panel</span><span aria-hidden="true">↗</span>
      </Link>
    );
  }
  if (!isDiscordConfigured()) {
    return <span className={compact ? "nav-disabled" : "login-unavailable"}>Inicio de sesión pendiente</span>;
  }
  return (
    <a href="/api/auth/discord" className={compact ? "nav-cta" : "hero-button hero-button-primary"}>
      <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21" aria-hidden="true">
        <path d="M19.7 5.2a18.3 18.3 0 0 0-4.5-1.4l-.6 1.2a17 17 0 0 0-5.2 0l-.6-1.2a18.3 18.3 0 0 0-4.5 1.4C1.5 9.3.8 13.4 1.2 17.5a18.1 18.1 0 0 0 5.5 2.8l1.1-1.8c-.6-.2-1.2-.5-1.8-.8l.4-.3c3.5 1.7 7.7 1.7 11.2 0l.4.3c-.6.3-1.2.6-1.8.8l1.1 1.8a18.1 18.1 0 0 0 5.5-2.8c.5-4.7-.8-8.7-3.1-12.3ZM8.4 15.1c-1 0-1.9-.9-1.9-2s.8-2 1.9-2c1 0 1.9.9 1.9 2s-.9 2-1.9 2Zm7.2 0c-1 0-1.9-.9-1.9-2s.9-2 1.9-2 1.9.9 1.9 2-.9 2-1.9 2Z"/>
      </svg>
      <span>Iniciar sesión con Discord</span>
    </a>
  );
}

const modules = [
  { icon: "🛡", label: "01 / PROTECCIÓN", title: "Moderación", desc: "Organiza las reglas, el antispam y las acciones de moderación desde un solo lugar." },
  { icon: "👋", label: "02 / COMUNIDAD", title: "Bienvenidas", desc: "Prepara mensajes personalizados para recibir a cada miembro nuevo." },
  { icon: "🎫", label: "03 / SOPORTE", title: "Tickets", desc: "Diseña el sistema de atención y soporte de tu comunidad." },
  { icon: "📋", label: "04 / CONTROL", title: "Registros", desc: "Configura dónde se enviarán los registros de actividad del servidor." },
  { icon: "⚙", label: "05 / AJUSTES", title: "Configuración", desc: "Modifica tus preferencias sin editar archivos ni reiniciar tu panel." },
  { icon: "🔒", label: "06 / ACCESO", title: "Permisos", desc: "Solo los miembros con permisos de administración podrán modificar la configuración." },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="site-header">
        <div className="site-container nav-inner">
          <Link className="brand-lockup" href="/" aria-label="PESADILLA BOT inicio">
            <Mark small />
            <span><strong>PESADILLA</strong><em>BOT</em></span>
          </Link>
          <nav className="nav-links" aria-label="Navegación principal">
            <a href="#inicio">Inicio</a>
            <a href="#funciones">Funciones</a>
            <a href="#como-funciona">Cómo funciona</a>
            <Link href="/dashboard">Dashboard</Link>
          </nav>
          <Suspense fallback={<span className="nav-disabled">Cargando...</span>}>
            <AuthActions compact />
          </Suspense>
        </div>
      </header>

      <main>
        <section className="hero-section" id="inicio">
          <div className="hero-orb hero-orb-one" aria-hidden="true"/>
          <div className="hero-orb hero-orb-two" aria-hidden="true"/>
          <div className="site-container hero-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> EL CENTRO DE CONTROL DE TU COMUNIDAD</div>
            <div className="hero-emblem"><Mark /><span className="emblem-ring" /></div>
            <p className="hero-kicker">EL PODER ESTÁ EN TUS MANOS</p>
            <h1 className="hero-title">PESADILLA<span>BOT</span></h1>
            <p className="hero-subtitle">Tu servidor. Tus reglas. Una nueva forma de administrar, proteger y hacer crecer tu comunidad de Discord.</p>
            <div className="hero-actions">
              <Suspense fallback={<span className="hero-button hero-button-primary">Preparando acceso...</span>}>
                <AuthActions />
              </Suspense>
              <a className="hero-button hero-button-secondary" href="#funciones">Explorar funciones <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-footnote"><span className="footnote-line"/> PANEL DE CONTROL DE PESADILLA PVP <span className="footnote-line"/></div>
          </div>
        </section>

        <section className="feature-section" id="funciones">
          <div className="site-container">
            <div className="section-heading">
              <div><p className="section-tag">DISEÑADO PARA ADMINISTRADORES</p><h2>Todo bajo tu <span>control.</span></h2></div>
              <p>Un panel pensado para que configurar tu bot sea tan fácil como pulsar un botón. Los módulos se conectarán al bot progresivamente.</p>
            </div>
            <div className="feature-grid">
              {modules.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <span className="feature-icon" aria-hidden="true">{feature.icon}</span>
                  <span className="feature-label">{feature.label}</span>
                  <h3>{feature.title}</h3><p>{feature.desc}</p>
                  <span className="feature-corner" aria-hidden="true">↗</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="steps-section" id="como-funciona">
          <div className="site-container">
            <p className="section-tag">SIMPLE. RÁPIDO. SEGURO.</p>
            <h2>Tu panel en <span>tres pasos.</span></h2>
            <div className="steps-grid">
              <div><span>01</span><h3>Conecta Discord</h3><p>Inicia sesión con tu cuenta oficial de Discord, sin compartir tu contraseña.</p></div>
              <div><span>02</span><h3>Elige tu servidor</h3><p>Selecciona un servidor en el que tengas permisos para administrar.</p></div>
              <div><span>03</span><h3>Guarda tus ajustes</h3><p>Personaliza tus módulos desde el panel. El bot aplicará los ajustes al integrar su sincronización.</p></div>
            </div>
            <Link href="/dashboard" className="hero-button hero-button-secondary">Abrir dashboard <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="site-container footer-inner"><span className="footer-brand">PESADILLA <strong>BOT</strong></span><p>Hecho para la comunidad PESADILLA PVP.</p><span>© PESADILLA PVP</span></div>
      </footer>
    </div>
  );
}
