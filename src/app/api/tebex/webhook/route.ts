import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { query } from "@/lib/db";
import { packByTebexId } from "@/lib/store-config";

/**
 * POST /api/tebex/webhook
 *
 * Tebex POST une enveloppe JSON signée HMAC-SHA256 (header `X-Signature`,
 * secret = TEBEX_WEBHOOK_SECRET) à chaque transaction. On gère le validation
 * payload (`validation.webhook`) et les confirmations de paiement
 * (`payment.completed`). Pour chaque package du panier, on INSERT une ligne
 * dans `web.gem_orders` ; le trigger émet `linesia.gems_credit` qui réveille
 * le plugin LinesiaCore-PNX pour créditer le joueur en jeu.
 *
 * Idempotence : `transaction_id` est UNIQUE → ON CONFLICT DO NOTHING.
 */

interface TebexWebhookPayload {
  id?: string;
  type?: string;
  date?: string;
  subject?: {
    id?: number | string;
    transaction_id?: string;
    status?: { id?: number; description?: string };
    price?: { amount?: string | number; currency?: string };
    customer?: {
      first_name?: string;
      last_name?: string;
      email?: string;
    };
    products?: Array<{
      id?: number | string;
      name?: string;
      quantity?: number;
    }>;
    custom?: Record<string, unknown> | null;
  };
}

function verifySignature(raw: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(raw + secret)
    .digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.TEBEX_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const raw = await req.text();
  const sig = req.headers.get("x-signature") || "";
  if (!sig || !verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: TebexWebhookPayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Étape de validation initiale demandée par Tebex à l'enregistrement.
  if (payload.type === "validation.webhook") {
    return NextResponse.json({ id: payload.id });
  }

  // On ne traite que les paiements complétés.
  if (payload.type !== "payment.completed") {
    return NextResponse.json({ ok: true, ignored: payload.type });
  }

  const subject = payload.subject;
  if (!subject) return NextResponse.json({ error: "Missing subject" }, { status: 400 });

  const transactionId =
    subject.transaction_id || (subject.id != null ? String(subject.id) : null);
  if (!transactionId) {
    return NextResponse.json({ error: "Missing transaction_id" }, { status: 400 });
  }

  const username = String(
    (subject.custom && (subject.custom as Record<string, unknown>).mc_username) ||
      ""
  ).trim();
  if (!username) {
    return NextResponse.json(
      { error: "Missing mc_username in custom" },
      { status: 400 }
    );
  }

  const amountEur =
    subject.price && subject.price.amount != null
      ? Number(subject.price.amount)
      : null;

  const products = subject.products || [];
  if (products.length === 0) {
    return NextResponse.json({ error: "No products" }, { status: 400 });
  }

  const inserted: Array<{ pack_id: string; gems: number }> = [];
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const tebexId = prod.id != null ? String(prod.id) : "";
    const pack = packByTebexId(tebexId);
    if (!pack) {
      // Pas un de nos packs Gems — on ignore (cosmétique séparé éventuel).
      continue;
    }
    const quantity = Math.max(1, Math.floor(prod.quantity || 1));
    const gems = pack.gems * quantity;

    // Suffixe pour autoriser plusieurs packs d'une même transaction.
    const txKey = products.length === 1 ? transactionId : `${transactionId}:${i}`;

    await query(
      `INSERT INTO web.gem_orders
         (transaction_id, username, pack_id, package_id, quantity, gems, amount_eur, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (transaction_id) DO NOTHING`,
      [txKey, username, pack.id, tebexId, quantity, gems, amountEur]
    );

    inserted.push({ pack_id: pack.id, gems });
  }

  return NextResponse.json({ ok: true, inserted });
}
