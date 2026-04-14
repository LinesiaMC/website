import { NextRequest, NextResponse } from "next/server";
import { getOne, getDb } from "@/lib/analytics-db";
import { softDeletePost } from "@/lib/community";
import { getCurrentAccount } from "@/lib/player-auth";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermissionForStaff } from "@/lib/permissions";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const row = await getOne(db,
    "SELECT author_account_id, deleted FROM community_posts WHERE id = ?", [id]);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (Number(row.deleted) === 1) return NextResponse.json({ ok: true });

  const account = await getCurrentAccount(req);
  const isAuthor = account?.id === row.author_account_id;
  let allowed = isAuthor;
  let actor = account?.id ?? "unknown";
  if (!allowed) {
    const staff = await getCurrentStaff(req);
    if (staff && await hasPermissionForStaff(staff, "community.moderate")) {
      allowed = true;
      actor = `staff:${staff.id}`;
    }
  }
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await softDeletePost(id, actor);
  return NextResponse.json({ ok: true });
}
