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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
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
      console.error("Missing metadata in Stripe session:", {
        session_id: session.id,
        purchase_id,
        user_id,
        coin_amount,
      });
      // 400を返してStripeにリトライさせる
      return NextResponse.json(
        { error: "Missing required metadata" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // 冪等性チェック: 既に完了済みの購入は再処理しない
    const { data: existingPurchase } = await supabase
      .from("purchases")
      .select("status")
      .eq("id", purchase_id)
      .single();

    if (existingPurchase?.status === "completed") {
      return NextResponse.json({ received: true });
    }

    // コイン追加（DB関数で処理）
    const { error } = await supabase.rpc("add_coins", {
      p_user_id: user_id,
      p_amount: parseInt(coin_amount),
      p_purchase_id: purchase_id,
    });

    if (error) {
      console.error("Failed to add coins:", {
        error,
        purchase_id,
        user_id,
        coin_amount,
      });
      // 500を返してStripeにリトライさせる
      return NextResponse.json(
        { error: "Failed to add coins" },
        { status: 500 }
      );
    }

    // コイン追加成功後に購入ステータスを完了に
    await supabase
      .from("purchases")
      .update({ status: "completed" })
      .eq("id", purchase_id);
  }

  return NextResponse.json({ received: true });
}
