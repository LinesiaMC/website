import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_API_URL, ANALYTICS_API_KEY } from "@/lib/analytics-config";
import { ADMIN_PASSWORD } from "@/lib/admin-config";

function checkAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${ADMIN_PASSWORD}`;
}

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const target = path.join("/");
  const url = new URL(req.url);
  const queryString = url.searchParams.toString();
  const fullUrl = `${ANALYTICS_API_URL}/api/${target}${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await fetch(fullUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ANALYTICS_API_KEY,
      },
      ...(req.method !== "GET" ? { body: await req.text() } : {}),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Analytics service unavailable" }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
