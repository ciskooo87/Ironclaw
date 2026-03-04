import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/projects";
import { canAccessProject } from "@/lib/permissions";
import { listDeliveryRuns } from "@/lib/delivery-runs";

function esc(v: unknown) {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const user = await getSessionUser();
  const project = await getProjectByCode(code);
  if (!user || !project) return new NextResponse("forbidden", { status: 403 });
  const allowed = await canAccessProject(user, project.id);
  if (!allowed) return new NextResponse("forbidden", { status: 403 });

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  const rows = await listDeliveryRuns(project.id, 1000, { channel, status, from, to });
  const head = ["created_at", "channel", "status", "target", "provider_message", "summary"];
  const body = rows.map((r) => [
    esc(r.created_at),
    esc(r.channel),
    esc(r.status),
    esc(r.target || ""),
    esc(r.provider_message || ""),
    esc((r.payload?.summaryText as string | undefined) || ""),
  ].join(","));

  const csv = [head.join(","), ...body].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=delivery_${code}.csv`,
    },
  });
}
