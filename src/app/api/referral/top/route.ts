import { NextResponse } from "next/server";
import { getTopReferrers } from "@/lib/referral";

export const revalidate = 120;

export async function GET() {
  const top = await getTopReferrers(50);
  return NextResponse.json({ top });
}
