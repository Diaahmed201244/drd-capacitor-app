// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.1.0";

console.log("Hello from Functions!");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Security thresholds
const MAX_CLAIMS_PER_DAY = 5;
const MIN_CLAIM_INTERVAL = 3600; // 1 hour in seconds
const SUSPICIOUS_IP_THRESHOLD = 3;
const SUSPICIOUS_FINGERPRINT_THRESHOLD = 2;

interface Request {
  method: string;
  headers: Headers;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get all pending claims
    const { data: claims, error: claimErr } = await supabase
      .from("code_claims")
      .select("id, code, user_id, reason")
      .eq("status", "pending");

    if (claimErr) {
      throw new Error("Error fetching claims: " + claimErr.message);
    }

    const results = [];

    for (const claim of claims) {
      try {
        // Get code data
        const { data: codeData, error: codeErr } = await supabase
          .from("codes")
          .select("fingerprint, ip, user_id")
          .eq("code", claim.code)
          .single();

        if (codeErr) {
          results.push({
            claim_id: claim.id,
            status: "error",
            message: "Code not found",
          });
          continue;
        }

        // Get user's fingerprint data
        const { data: userFP, error: fpErr } = await supabase
          .from("user_fingerprints")
          .select("fingerprint, ip")
          .eq("user_id", claim.user_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (fpErr) {
          results.push({
            claim_id: claim.id,
            status: "error",
            message: "User fingerprint not found",
          });
          continue;
        }

        // Check for matches
        const fingerprintMatch = codeData.fingerprint === userFP.fingerprint;
        const ipMatch = codeData.ip === userFP.ip;
        const isOriginalOwner = codeData.user_id === claim.user_id;

        // Determine claim status
        let status = "rejected";
        let resolutionNotes = "❌ Auto-rejected: ";

        if (isOriginalOwner) {
          status = "approved";
          resolutionNotes = "✅ Auto-approved: Original code owner.";
        } else if (fingerprintMatch && ipMatch) {
          status = "approved";
          resolutionNotes = "✅ Auto-approved: Fingerprint and IP matched.";
        } else {
          if (!fingerprintMatch) resolutionNotes += "Fingerprint mismatch. ";
          if (!ipMatch) resolutionNotes += "IP mismatch.";
        }

        // Update claim status
        const { error: updateErr } = await supabase
          .from("code_claims")
          .update({
            status,
            resolved_by: "AI_Judge",
            resolution_notes: resolutionNotes,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", claim.id);

        if (updateErr) {
          results.push({
            claim_id: claim.id,
            status: "error",
            message: "Failed to update claim status",
          });
        } else {
          results.push({
            claim_id: claim.id,
            status: "success",
            decision: status,
            message: resolutionNotes,
          });
        }
      } catch (error: unknown) {
        results.push({
          claim_id: claim.id,
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: claims.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/judge-code-claims' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
