import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

console.log("Balance recharge function started");

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, amount, code } = await req.json();

    // Validate input based on operation type
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required." }),
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If code is provided, handle code redemption
    if (code) {
      // Verify code exists and is unused
      const { data: codeData, error: codeError } = await supabase
        .from("codes")
        .select("*")
        .eq("code", code)
        .eq("status", "available")
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ error: "Invalid or already used code." }),
          { status: 400 }
        );
      }

      // Start transaction
      const { data: txData, error: txError } = await supabase.rpc('process_code_redemption', {
        p_user_id: user_id,
        p_code: code,
        p_code_value: codeData.value
      });

      if (txError) {
        return new Response(JSON.stringify({ error: txError.message }), { status: 500 });
      }

      return new Response(
        JSON.stringify({
          message: "Code redeemed successfully.",
          new_balance: txData.new_balance,
          code_value: codeData.value
        }),
        { status: 200 }
      );
    }

    // Handle direct balance recharge
    if (typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount is required for recharge." }),
        { status: 400 }
      );
    }

    // Get user's current balance and code count
    const { data: userData, error: userError } = await supabase
      .from("user_balances")
      .select("balance, code_count")
      .eq("user_id", user_id)
      .single();

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), { status: 500 });
    }

    // Check if user has enough codes
    if (!userData || userData.code_count <= 0) {
      return new Response(
        JSON.stringify({ error: "Insufficient codes for recharge." }),
        { status: 400 }
      );
    }

    // Process recharge transaction
    const { data: txData, error: txError } = await supabase.rpc('process_recharge', {
      p_user_id: user_id,
      p_amount: amount
    });

    if (txError) {
      return new Response(JSON.stringify({ error: txError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        message: "Balance updated successfully.",
        new_balance: txData.new_balance,
        new_code_count: txData.new_code_count
      }),
      { status: 200 }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: errorMessage }),
      { status: 500 }
    );
  }
});
