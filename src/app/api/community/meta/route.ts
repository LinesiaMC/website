import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_META, COMMUNITY_CATEGORIES, getCategoryStats, isAccountBanned } from "@/lib/community";
import { getCurrentAccount } from "@/lib/player-auth";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermissionForStaff } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const account = await getCurrentAccount(req);
  const staff = await getCurrentStaff(req);
  let ban = null;
  if (account) ban = await isAccountBanned(account.id);

  const viewer = account
    ? {
        accountId: account.id,
        displayName:
          account.linkedPlayerName || account.microsoftGamertag || account.displayName || "Joueur",
        linked: !!account.linkedPlayerUuid,
        playerUuid: account.linkedPlayerUuid,
        banned: !!ban,
        banReason: ban?.reason ?? null,
        banExpiresAt: ban?.expiresAt ?? null,
      }
    : null;

  const staffCaps = {
    moderate: staff ? await hasPermissionForStaff(staff, "community.moderate") : false,
    ban: staff ? await hasPermissionForStaff(staff, "community.ban") : false,
  };

  const stats = await getCategoryStats();
  const categories = COMMUNITY_CATEGORIES.map((c) => ({
    id: c,
    ...CATEGORY_META[c],
    stats: stats[c],
  }));

  return NextResponse.json({ categories, viewer, staff: staffCaps });
}
