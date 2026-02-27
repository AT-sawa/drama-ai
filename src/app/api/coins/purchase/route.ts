import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { COIN_PACKAGES } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { package_id } = await request.json();
    const pkg = COIN_PACKAGES.find((p) => p.id === package_id);

    if (!pkg) {
      return NextResponse.json(
        { error: "無効なパッケージです" },
        { status: 400 }
      );
    }

    // 購入レコード作成
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        user_id: user.id,
        amount_jpy: pkg.price,
        coin_amount: pkg.coins,
        status: "pending",
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: "購入レコードの作成に失敗しました" },
        { status: 500 }
      );
    }

    // Stripe Checkout Session 作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `DramaAI コイン - ${pkg.label}`,
              description: `${pkg.coins}コイン${pkg.bonus ? ` (${pkg.bonus})` : ""}`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/coins?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/coins?canceled=true`,
      metadata: {
        purchase_id: purchase.id,
        user_id: user.id,
        coin_amount: String(pkg.coins),
      },
    });

    // Stripe Session ID を購入レコードに紐付け
    await supabase
      .from("purchases")
      .update({ stripe_payment_intent_id: session.id })
      .eq("id", purchase.id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Coin purchase error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
