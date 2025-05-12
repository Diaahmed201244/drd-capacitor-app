// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://obmufgumrrxjvgjquqro.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ibXVmZ3VtcnJ4anZnanF1cXJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY3NjQxNSwiZXhwIjoyMDUzMjUyNDE1fQ.J-28YlgQ1gpb7fPr1SHFpl_BzdX1V39rj1ciAVK_VLM";
const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Hello from Functions!")

serve(async (req) => {
  try {
    const { userId, amount, useCode = false } = await req.json();
    
    // Validate input
    if (!userId || !amount || amount <= 0) {
      return new Response(JSON.stringify({ 
        error: "Invalid input",
        details: "User ID and positive amount required" 
      }), { status: 400 });
    }

    // Get current balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .single();
      
    if (balanceError) {
      console.error('Balance fetch error:', balanceError);
      return new Response(JSON.stringify({ 
        error: "Failed to fetch balance",
        details: balanceError.message 
      }), { status: 500 });
    }

    // Get code count if using codes
    const { data: codeData, error: _codeError } = await supabase
      .from('user_codes')
      .select('code_count')
      .eq('user_id', userId)
      .single();

    if (useCode && (!codeData || codeData.code_count < 1)) {
      return new Response(JSON.stringify({
        error: "Insufficient codes",
        details: "No codes available for recharge"
      }), { status: 400 });
    }

    // Use stored procedure for atomic transaction
    const { data: txData, error: txError } = await supabase
      .rpc('process_recharge', {
        p_user_id: userId,
        p_amount: amount,
        p_code_count: useCode ? (codeData?.code_count || 0) : null,
        p_current_balance: balanceData?.balance || 0
      });

    if (txError) {
      console.error('Transaction error:', txError);
      return new Response(JSON.stringify({
        error: "Transaction failed",
        details: txError.message
      }), { status: 500 });
    }

    // Return success with updated values
    return new Response(JSON.stringify({ 
      success: true,
      data: txData
    }), { status: 200 });
  } catch (_error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/handleRecharge' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9zZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
