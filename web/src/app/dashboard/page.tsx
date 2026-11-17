import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { discordAvatarUrl } from "@/lib/discord";
import DashboardClient from "./dashboard-client";
import "./dashboard.css";

async function AuthorizedDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const avatar = discordAvatarUrl({
    id: user.id, username: user.username, global_name: user.globalName, avatar: user.avatar,
  });
  return <DashboardClient user={{ id: user.id, username: user.username, name: user.globalName ?? user.username, avatar }} />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="dashboard-loading">Cargando tu panel de PESADILLA BOT...</main>}>
      <AuthorizedDashboard />
    </Suspense>
  );
}
