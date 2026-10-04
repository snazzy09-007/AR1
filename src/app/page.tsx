import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/state";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initial: DashboardData | null = null;
  try {
    initial = await getDashboardData();
  } catch (e) {
    // La DB n'est peut-être pas encore migrée : le client affichera l'écran de retry.
    console.error("[page] chargement initial impossible:", e);
  }
  return <Dashboard initial={initial} />;
}
