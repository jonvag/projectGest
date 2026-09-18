import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireSesion } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await requireSesion();
  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="dashboard-shell flex min-h-screen">
      <Sidebar rol={sesion.rol} nombre={sesion.nombre} email={sesion.email} />
      <main className="flex min-w-0 flex-1 flex-col pt-14 sm:pt-0">{children}</main>
    </div>
  );
}
