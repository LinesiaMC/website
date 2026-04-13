import { NextRequest, NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const staff = await getCurrentStaff(req);
  if (!staff) return NextResponse.json({ staff: null });
  return NextResponse.json({
    staff: {
      id: staff.id,
      discordId: staff.discordId,
      discordUsername: staff.discordUsername,
      discordAvatar: staff.discordAvatar,
      microsoftId: staff.microsoftId,
      microsoftGamertag: staff.microsoftGamertag,
      microsoftDisplayName: staff.microsoftDisplayName,
      displayName: staff.displayName,
      role: staff.role,
      createdAt: staff.createdAt,
      lastLogin: staff.lastLogin,
    },
  });
}
