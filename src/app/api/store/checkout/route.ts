import { NextResponse } from "next/server";
import { GEM_PACKS, packById } from "@/lib/store-config";

interface CartItem {
  packId: string;
  quantity: number;
}

interface BasketResponse {
  data?: {
    ident?: string;
    links?: { checkout?: string };
  };
}

const HEADLESS = "https://headless.tebex.io/api";

function bad(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/store/checkout
 * Body: { username: string, items: [{ packId, quantity }] }
 * Réponse: { url: string } — URL Tebex à ouvrir pour finaliser le paiement.
 */
export async function POST(req: Request) {
  const ident = process.env.TEBEX_WEBSTORE_IDENT;
  if (!ident) return bad(503, "Boutique indisponible (config Tebex manquante).");

  let body: { username?: string; items?: CartItem[] };
  try {
    body = await req.json();
  } catch {
    return bad(400, "Corps de requête invalide.");
  }

  const username = (body.username || "").trim();
  if (username.length < 3 || !/^[A-Za-z0-9_ ]{3,32}$/.test(username)) {
    return bad(400, "Pseudo Minecraft invalide.");
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .map((it) => ({
      pack: packById(String(it.packId || "")),
      quantity: Math.max(1, Math.min(99, Math.floor(Number(it.quantity) || 0))),
    }))
    .filter((x): x is { pack: NonNullable<ReturnType<typeof packById>>; quantity: number } =>
      Boolean(x.pack)
    );

  if (items.length === 0) return bad(400, "Panier vide.");

  const missing = items.find((x) => !x.pack.tebexPackageId);
  if (missing) {
    return bad(
      503,
      `Le pack "${missing.pack.id}" n'est pas encore disponible à l'achat.`
    );
  }

  const origin = new URL(req.url).origin;

  // 1) Créer le panier
  const createRes = await fetch(`${HEADLESS}/accounts/${ident}/baskets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      complete_url: `${origin}/fr/store?status=success`,
      cancel_url: `${origin}/fr/store?status=cancel`,
      complete_auto_redirect: true,
      custom: { mc_username: username },
    }),
  });

  if (!createRes.ok) {
    return bad(502, "Création du panier Tebex impossible.");
  }
  const createJson = (await createRes.json()) as BasketResponse;
  const basketIdent = createJson.data?.ident;
  const checkoutUrl = createJson.data?.links?.checkout;
  if (!basketIdent || !checkoutUrl) return bad(502, "Réponse Tebex invalide.");

  // 2) Ajouter les packages
  for (const it of items) {
    const addRes = await fetch(
      `${HEADLESS}/baskets/${basketIdent}/packages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          package_id: it.pack.tebexPackageId,
          quantity: it.quantity,
        }),
      }
    );
    if (!addRes.ok) {
      return bad(502, `Ajout du pack "${it.pack.id}" au panier impossible.`);
    }
  }

  return NextResponse.json({ url: checkoutUrl });
}

/**
 * GET /api/store/checkout — diagnostic léger pour le front (sait-on
 * configurer un panier ?). Pas de secret renvoyé.
 */
export async function GET() {
  return NextResponse.json({
    ready: !!process.env.TEBEX_WEBSTORE_IDENT,
    packs: GEM_PACKS.map((p) => ({
      id: p.id,
      tebexConfigured: !!p.tebexPackageId,
    })),
  });
}
