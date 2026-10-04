import { getDashboardData } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return Response.json({ ok: true, data });
  } catch (e) {
    console.error("[api/state]", e);
    return Response.json({ ok: false, error: "Impossible de charger l'état" }, { status: 500 });
  }
}
