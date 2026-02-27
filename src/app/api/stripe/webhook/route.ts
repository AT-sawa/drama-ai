import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Signature missing" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { purchase_id, user_id, coin_amount } = session.metadata || {};

    if (!purchase_id || !user_id || !coin_amount) {
      console.error("Missing metadata in Stripe session");
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceRoleClient();

    // 購入ステータスを完了に
    await supabase
      .from("purchases")
      .update({ status: "completed" })
      .eq("id", purchase_id);

    // コイン追加（DB関数で処理）
    const { error } = await supabase.rpc("add_coins", {
      p_user_id: user_id,
      p_amount: parseInt(coin_amount),
      p_purchase_id: purchase_id,
    });

    if (error) {
      console.error("Failed to add coins:", error);
    }
  }

  return NextResponse.json({ received: true });
}
