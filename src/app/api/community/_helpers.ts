import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, type PlayerAccount } from "@/lib/player-auth";
import { getCurrentStaff } from "@/lib/auth";
import { hasPermissionForStaff } from "@/lib/permissions";
import { getOne, getDb } from "@/lib/analytics-db";
import { isAccountBanned, type CommunityAuthor } from "@/lib/community";
import type { Permission } from "@/lib/roles";

/** A linked player account: only these can post. */
export async function requireLinkedAccount(req: NextRequest): Promise<PlayerAccount | NextResponse> {
  const account = await getCurrentAccount(req);
  if (!account) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!account.linkedPlayerUuid) {
    return NextResponse.json({ error: "not_linked" }, { status: 403 });
  }
  const ban = await isAccountBanned(account.id);
  if (ban) {
    return NextResponse.json({
      error: "banned",
      reason: ban.reason,
      expiresAt: ban.expiresAt,
    }, { status: 403 });
  }
  return account;
}

export function isAccount(v: PlayerAccount | NextResponse): v is PlayerAccount {
  return !(v instanceof NextResponse);
}

/** Build the author payload from a linked account, pulling rank from profile_extra. */
export async function buildAuthor(account: PlayerAccount): Promise<CommunityAuthor> {
  const db = await getDb();
  let ingameRank: string | null = null;
  if (account.linkedPlayerUuid) {
    const row = await getOne(db,
      "SELECT rank FROM player_profile_extra WHERE xuid = ?",
      [account.linkedPlayerUuid]);
    ingameRank = (row?.rank as string) || null;
  }
  return {
    accountId: account.id,
    displayName: account.linkedPlayerName || account.microsoftGamertag || account.displayName || "Joueur",
    playerUuid: account.linkedPlayerUuid,
    avatarUrl: null,
    ingameRank,
  };
}

/** Returns true when the caller may moderate: staff with the perm OR the author. */
export async function canModerate(req: NextRequest, perm: Permission): Promise<boolean> {
  const staff = await getCurrentStaff(req);
  if (!staff) return false;
  return hasPermissionForStaff(staff, perm);
}
