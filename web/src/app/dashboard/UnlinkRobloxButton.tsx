"use client";

export default function UnlinkRobloxButton() {
  return (
    <form
      method="post"
      action="/api/auth/roblox/unlink"
      onSubmit={(e) => {
        if (!window.confirm("¿Desvincular tu cuenta de Roblox? Podrás volver a vincularla cuando quieras.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-xl border border-red-500/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
      >
        UNLINK ROBLOX
      </button>
    </form>
  );
}
