import { NextRequest, NextResponse } from "next/server";
import { getThread, listPosts, softDeleteThread } from "@/lib/community";
import { getCurrentAccount } from "@/lib/player-auth";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermissionForStaff } from "@/lib/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getCurrentAccount(req);
  const thread = await getThread(id, account?.id ?? null);
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const posts = await listPosts(id, account?.id ?? null);
  return NextResponse.json({ thread, posts });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getCurrentAccount(req);
  const thread = await getThread(id);
  if (!thread) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (thread.deleted) return NextResponse.json({ ok: true });

  const isAuthor = account?.id === thread.authorAccountId;
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

  await softDeleteThread(id, actor);
  return NextResponse.json({ ok: true });
}
