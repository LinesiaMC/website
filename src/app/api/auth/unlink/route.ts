import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff, updateStaff } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { provider?: "discord" | "microsoft" };
  if (body.provider !== "discord" && body.provider !== "microsoft") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }
  const hasDiscord = !!staff.discordId;
  const hasMicrosoft = !!staff.microsoftId;
  if (body.provider === "discord" && !hasMicrosoft) {
    return NextResponse.json({ error: "Cannot unlink last provider" }, { status: 400 });
  }
  if (body.provider === "microsoft" && !hasDiscord) {
    return NextResponse.json({ error: "Cannot unlink last provider" }, { status: 400 });
  }
  if (body.provider === "discord") {
    await updateStaff(staff.id, { discordId: null, discordUsername: null, discordAvatar: null });
  } else {
    await updateStaff(staff.id, { microsoftId: null, microsoftGamertag: null, microsoftDisplayName: null });
  }
  return NextResponse.json({ ok: true });
}
