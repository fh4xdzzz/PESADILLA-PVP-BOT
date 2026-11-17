"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GuildSettings } from "@/lib/guild-settings";

interface Server { id: string; name: string; icon: string | null; owner: boolean; permissions: string; }
interface Viewer { id: string; username: string; name: string; avatar: string | null; }
type Section = "overview" | "general" | "welcome" | "moderation" | "tickets" | "logs";

const menu: { id: Section; label: string; glyph: string }[] = [
  { id: "overview", label: "Vista general", glyph: "◫" },
  { id: "general", label: "Ajustes generales", glyph: "⚙" },
  { id: "welcome", label: "Bienvenidas", glyph: "✦" },
  { id: "moderation", label: "Moderación", glyph: "◆" },
  { id: "tickets", label: "Tickets", glyph: "▣" },
  { id: "logs", label: "Registros", glyph: "≡" },
];

const sections: Record<Section, { title: string; subtitle: string }> = {
  overview: { title: "Vista general", subtitle: "Un resumen de los ajustes de tu servidor." },
  general: { title: "Ajustes generales", subtitle: "Personaliza el idioma y las preferencias de tu comunidad." },
  welcome: { title: "Bienvenidas", subtitle: "Prepara el mensaje que recibirán los nuevos miembros." },
  moderation: { title: "Moderación automática", subtitle: "Configura las protecciones de tu servidor." },
  tickets: { title: "Sistema de tickets", subtitle: "Organiza las solicitudes de soporte de tu comunidad." },
  logs: { title: "Registros", subtitle: "Define dónde quieres recibir los eventos importantes." },
};

function SwitchRow({ label, details, checked, onChange, disabled }: {
  label: string; details: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="db-option-row">
      <div><strong>{label}</strong><p>{details}</p></div>
      <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled}
        className={checked ? "db-switch on" : "db-switch"} onClick={() => onChange(!checked)}>
        <span/>
      </button>
    </div>
  );
}

function FormField({ label, help, value, onChange, placeholder, disabled }: {
  label: string; help?: string; value: string; placeholder?: string;
  onChange: (value: string) => void; disabled?: boolean;
}) {
  return (
    <label className="db-field">
      <span>{label}</span>
      {help && <small>{help}</small>}
      <input value={value} onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? "ID del canal"} maxLength={22} inputMode="numeric" disabled={disabled} />
    </label>
  );
}

function ServerBadge({ server }: { server: Server }) {
  return (
    <span className="db-server-badge">
      {server.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={"https://cdn.discordapp.com/icons/" + server.id + "/" + server.icon + ".png?size=64"} alt="" />
      ) : <span>{server.name.slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export default function DashboardClient({ user }: { user: Viewer }) {
  const [servers, setServers] = useState<Server[]>([]);
  const [serverId, setServerId] = useState("");
  const [botOnline, setBotOnline] = useState<boolean | null>(null);
  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [serverError, setServerError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settings, setSettings] = useState<GuildSettings | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [active, setActive] = useState<Section>("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/servers", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar los servidores.");
        if (!cancelled) {
          const items: Server[] = data.servers;
          setServers(items);
          setServerId(items[0]?.id ?? "");
          setServerError("");
        }
      } catch (error) {
        if (!cancelled) setServerError(error instanceof Error ? error.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoadingServers(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!serverId) { setSettings(null); return; }
    const abort = new AbortController();
    setLoadingSettings(true);
    setSettings(null);
    setSettingsError("");
    setMessage("");
    setDirty(false);
    (async () => {
      try {
        const res = await fetch("/api/servers/" + encodeURIComponent(serverId) + "/settings", {
          cache: "no-store", signal: abort.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "No se pudo recuperar la configuración.");
        if (!abort.signal.aborted) {
          setSettings(data.settings as GuildSettings);
          setSavedAt(data.updatedAt as string | null);
        }
      } catch (error) {
        if (!abort.signal.aborted) setSettingsError(error instanceof Error ? error.message : "No se pudo recuperar la configuración.");
      } finally {
        if (!abort.signal.aborted) setLoadingSettings(false);
      }
    })();
    return () => abort.abort();
  }, [serverId]);

  useEffect(() => {
    if (!serverId) { setBotOnline(null); return; }
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/servers/" + encodeURIComponent(serverId) + "/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Bot status not available");
        const data = await response.json();
        if (active) setBotOnline(data.online === true);
      } catch {
        if (active) setBotOnline(null);
      }
    };
    setBotOnline(null);
    void load();
    const timer = setInterval(() => { void load(); }, 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [serverId]);

  const server = useMemo(() => servers.find((item) => item.id === serverId), [serverId, servers]);
  const moduleCount = settings ? [settings.welcomeEnabled, settings.autoModEnabled, settings.ticketsEnabled, settings.logsEnabled].filter(Boolean).length : 0;

  const patch = useCallback(function <K extends keyof GuildSettings>(key: K, value: GuildSettings[K]) {
    setSettings((previous) => previous ? { ...previous, [key]: value } : null);
    setDirty(true);
    setMessage("");
  }, []);

  async function save() {
    if (!settings || !serverId || saving) return;
    setSaving(true);
    setMessage("");
    setSettingsError("");
    try {
      const res = await fetch("/api/servers/" + encodeURIComponent(serverId) + "/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al guardar.");
      setSavedAt(data.updatedAt as string);
      setDirty(false);
      setMessage("Configuración guardada correctamente en Supabase.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="db-shell">
      <aside className="db-sidebar">
        <Link href="/" className="db-brand"><span className="db-brand-icon">P</span><span><strong>PESADILLA</strong><small>BOT CONTROL</small></span></Link>
        <div className="db-server-picker">
          <p>SERVIDOR ACTIVO</p>
          {server ? <div className="db-picked-server"><ServerBadge server={server} /><div><strong>{server.name}</strong><small>Administración</small></div></div> : <div className="db-no-server">Selecciona un servidor</div>}
          {servers.length > 0 && (
            <select aria-label="Seleccionar servidor" value={serverId}
              onChange={(event) => { setServerId(event.target.value); setActive("overview"); }}>
              {servers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
        </div>
        <p className="db-side-label">CONFIGURACIÓN</p>
        <nav className="db-menu" aria-label="Secciones del panel">
          {menu.map((item) => (
            <button type="button" key={item.id} className={active === item.id ? "db-menu-link selected" : "db-menu-link"}
              onClick={() => setActive(item.id)}>
              <span className="db-menu-glyph" aria-hidden="true">{item.glyph}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="db-side-bottom">
          <span className="db-version">PANEL V2 · BASE EN DESARROLLO</span>
          <Link href="/">← Volver a la web</Link>
          <a href="/api/auth/logout">Cerrar sesión</a>
        </div>
      </aside>

      <div className="db-main">
        <header className="db-topbar">
          <div><span className="db-breadcrumb">PESADILLA BOT</span><span className="db-breadcrumb-slash">/</span><span>{sections[active].title}</span></div>
          <div className="db-profile">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar} alt="" />
            ) : <span>{user.name.slice(0, 1).toUpperCase()}</span>}
            <strong>{user.name}</strong>
          </div>
        </header>

        <main className="db-content">
          <div className="db-titlebar">
            <div><p className="db-overline">CENTRO DE CONTROL</p><h1>{sections[active].title}<span>.</span></h1><p>{sections[active].subtitle}</p></div>
            {server && <div className="db-current-guild"><ServerBadge server={server} /><span>{server.name}</span></div>}
          </div>

          <div className="db-integration-note">
            <span className="db-note-dot"/>
            <p><strong>Sincronización preparada.</strong> Tras configurar Supabase, Vercel y desplegar el nuevo proceso en Sparked Host, el bot aplicará los cambios automáticamente. Si aparece desconectado, comprueba su instalación.</p>
          </div>

          {loadingServers && <div className="db-empty">Buscando los servidores que puedes administrar...</div>}
          {!loadingServers && serverError && (
            <div className="db-empty db-error"><h2>No se pudo acceder a tus servidores</h2><p>{serverError}</p>
              <a className="db-button db-primary" href="/api/auth/discord">Reconectar Discord</a></div>
          )}
          {!loadingServers && !serverError && servers.length === 0 && (
            <div className="db-empty"><h2>¡Aún no hay servidores para mostrar!</h2><p>Necesitas ser propietario o tener el permiso «Gestionar servidor» en Discord. Acepta también el acceso a tus servidores al iniciar sesión.</p>
              <a className="db-button db-primary" href="/api/auth/discord">Autorizar Discord</a></div>
          )}
          {server && loadingSettings && <div className="db-empty">Cargando los ajustes de {server.name}...</div>}
          {server && !loadingSettings && settingsError && !settings && <div className="db-empty db-error"><h2>No se pudo cargar la configuración</h2><p>{settingsError}</p></div>}
          {server && !loadingSettings && settings && (
            <>
              {active === "overview" && (
                <>
                  <div className="db-stats-grid">
                    <article className="db-stat"><span>01 / SERVIDOR</span><strong>{server.name}</strong><p>{server.owner ? "Eres propietario" : "Tienes permiso para administrar"}</p></article>
                    <article className="db-stat"><span>02 / PREFERENCIAS</span><strong>{moduleCount} / 4</strong><p>Módulos marcados para activar</p></article>
                    <article className="db-stat"><span>03 / SINCRONIZACIÓN</span><strong className={botOnline ? "db-online-text" : "db-warn-text"}>{botOnline === true ? "Conectado" : botOnline === false ? "Sin conexión" : "Sin datos"}</strong><p>{botOnline === true ? "El bot está enviando su estado a la web" : "Comprueba el despliegue y las credenciales del bot"}</p></article>
                  </div>
                  <div className="db-panel"><div className="db-panel-heading"><div><p className="db-panel-tag">TU CONFIGURACIÓN</p><h2>Empieza por aquí</h2><span>Accede a los módulos desde el menú lateral.</span></div></div>
                    <div className="db-quick-grid">
                      {menu.filter((item) => item.id !== "overview").map((item) => <button type="button" key={item.id} onClick={() => setActive(item.id)}><span>{item.glyph}</span><strong>{item.label}</strong><span>↗</span></button>)}
                    </div>
                  </div>
                </>
              )}

              {active === "general" && (
                <div className="db-panel">
                  <div className="db-panel-heading"><div><p className="db-panel-tag">PREFERENCIAS</p><h2>Idioma del bot</h2><span>El idioma que utilizará el bot cuando se conecte la sincronización.</span></div></div>
                  <label className="db-field"><span>Idioma preferido</span>
                    <select value={settings.language} onChange={(event) => patch("language", event.target.value as "es" | "en")}>
                      <option value="es">Español</option><option value="en">English</option>
                    </select>
                  </label>
                  <p className="db-help">ID del servidor: <code>{server.id}</code></p>
                </div>
              )}

              {active === "welcome" && (
                <div className="db-panel">
                  <div className="db-panel-heading"><div><p className="db-panel-tag">COMUNIDAD</p><h2>Bienvenidas</h2><span>Haz que cada miembro se sienta parte de tu comunidad.</span></div></div>
                  <SwitchRow label="Activar bienvenidas" details="Prepara una bienvenida automática para las nuevas incorporaciones."
                    checked={settings.welcomeEnabled} onChange={(value) => patch("welcomeEnabled", value)}/>
                  <FormField label="ID del canal de bienvenida" help="Activa Modo desarrollador en Discord y copia el ID del canal."
                    value={settings.welcomeChannelId} onChange={(value) => patch("welcomeChannelId", value)} />
                  <label className="db-field"><span>Mensaje de bienvenida</span><small>Puedes utilizar las variables {String("{usuario}")} y {String("{servidor}")}.</small>
                    <textarea maxLength={600} rows={4} value={settings.welcomeMessage}
                      onChange={(event) => patch("welcomeMessage", event.target.value)}/>
                  </label>
                </div>
              )}

              {active === "moderation" && (
                <div className="db-panel">
                  <div className="db-panel-heading"><div><p className="db-panel-tag">SEGURIDAD</p><h2>Protección del servidor</h2><span>Configura los límites de moderación de tu comunidad.</span></div></div>
                  <SwitchRow label="Activar automoderación" details="Activa la configuración general de moderación automática."
                    checked={settings.autoModEnabled} onChange={(value) => patch("autoModEnabled", value)}/>
                  <SwitchRow label="Protección antispam" details="Permite al bot detectar mensajes repetidos o enviados demasiado rápido."
                    checked={settings.antiSpamEnabled} onChange={(value) => patch("antiSpamEnabled", value)}/>
                  <SwitchRow label="Bloquear enlaces" details="Prepara el bloqueo de mensajes que incluyan enlaces no deseados."
                    checked={settings.antiLinksEnabled} onChange={(value) => patch("antiLinksEnabled", value)}/>
                </div>
              )}

              {active === "tickets" && (
                <div className="db-panel">
                  <div className="db-panel-heading"><div><p className="db-panel-tag">SOPORTE</p><h2>Sistema de tickets</h2><span>Define el canal en el que aparecerán las solicitudes de ayuda.</span></div></div>
                  <SwitchRow label="Activar sistema de tickets" details="Habilita la preferencia para crear solicitudes de soporte."
                    checked={settings.ticketsEnabled} onChange={(value) => patch("ticketsEnabled", value)}/>
                  <FormField label="ID del canal para tickets" help="Copia el ID del canal desde Discord."
                    value={settings.ticketsChannelId} onChange={(value) => patch("ticketsChannelId", value)}/>
                  <FormField label="ID del rol de soporte (opcional)" help="Los miembros de este rol podrán ver y responder tickets. Los administradores también pueden acceder."
                    placeholder="ID del rol" value={settings.ticketStaffRoleId} onChange={(value) => patch("ticketStaffRoleId", value)}/>
                  <p className="db-help">Después de guardar, un administrador puede escribir <code>/ticket-panel</code> en Discord para publicar el botón de soporte.</p>
                </div>
              )}

              {active === "logs" && (
                <div className="db-panel">
                  <div className="db-panel-heading"><div><p className="db-panel-tag">ACTIVIDAD</p><h2>Registros</h2><span>Elige dónde quieres conservar la actividad importante.</span></div></div>
                  <SwitchRow label="Activar registros" details="Prepara los eventos de moderación y administración del servidor."
                    checked={settings.logsEnabled} onChange={(value) => patch("logsEnabled", value)}/>
                  <FormField label="ID del canal de registros" help="El bot deberá tener permiso para publicar mensajes en el canal."
                    value={settings.logsChannelId} onChange={(value) => patch("logsChannelId", value)}/>
                </div>
              )}

              <div className="db-savebar">
                <div>
                  {dirty ? <span className="db-dirty">● Cambios sin guardar</span> : <span>Sin cambios pendientes</span>}
                  {savedAt && <small>Último guardado: {new Date(savedAt).toLocaleString("es-DO")}</small>}
                </div>
                <button className="db-button db-primary" type="button" onClick={save} disabled={!dirty || saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
              {message && <p role="status" className="db-success">{message}</p>}
              {settingsError && <p role="alert" className="db-inline-error">{settingsError}</p>}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
