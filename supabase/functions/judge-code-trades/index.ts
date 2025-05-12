import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

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

        // Get all completed trades that need judging
        const { data: trades, error: tradesError } = await supabase
            .from("code_trades")
            .select(`
        id,
        code,
        from_user_id,
        to_user_id,
        from_fingerprint,
        to_fingerprint,
        from_ip,
        to_ip,
        status,
        created_at
      `)
            .eq("status", "completed");

        if (tradesError) {
            throw new Error("Error fetching trades: " + tradesError.message);
        }

        const results = [];

        for (const trade of trades) {
            try {
                // Get code data
                const { data: codeData, error: codeError } = await supabase
                    .from("codes")
                    .select("fingerprint, ip, user_id")
                    .eq("code", trade.code)
                    .single();

                if (codeError) {
                    results.push({
                        trade_id: trade.id,
                        status: "error",
                        message: "Code not found",
                    });
                    continue;
                }

                // Check for suspicious patterns
                const sameFingerprint =
                    trade.from_fingerprint === trade.to_fingerprint;
                const sameIP = trade.from_ip === trade.to_ip;
                const sameUser = trade.from_user_id === trade.to_user_id;
                const isOriginalOwner = codeData.user_id === trade.from_user_id;

                // Get user's recent trade history
                const { data: fromUserTrades, error: fromTradesError } =
                    await supabase
                        .from("code_trades")
                        .select("id")
                        .eq("from_user_id", trade.from_user_id)
                        .gte(
                            "created_at",
                            new Date(Date.now() - 24 * 60 * 60 * 1000)
                                .toISOString(),
                        );

                const { data: toUserTrades, error: toTradesError } =
                    await supabase
                        .from("code_trades")
                        .select("id")
                        .eq("to_user_id", trade.to_user_id)
                        .gte(
                            "created_at",
                            new Date(Date.now() - 24 * 60 * 60 * 1000)
                                .toISOString(),
                        );

                if (fromTradesError || toTradesError) {
                    results.push({
                        trade_id: trade.id,
                        status: "error",
                        message: "Error fetching trade history",
                    });
                    continue;
                }

                // Determine trade status
                let status = "approved";
                let notes = "✅ Trade validated successfully.";
                const suspiciousPatterns = [];

                if (sameUser) {
                    status = "flagged";
                    suspiciousPatterns.push(
                        "Same user trading with themselves",
                    );
                }
                if (sameFingerprint) {
                    status = "flagged";
                    suspiciousPatterns.push("Same device fingerprint detected");
                }
                if (sameIP) {
                    status = "flagged";
                    suspiciousPatterns.push("Same IP address detected");
                }
                if (!isOriginalOwner) {
                    status = "flagged";
                    suspiciousPatterns.push(
                        "Seller is not the original code owner",
                    );
                }
                if (fromUserTrades.length > 10) {
                    status = "flagged";
                    suspiciousPatterns.push(
                        "Seller has made more than 10 trades in 24 hours",
                    );
                }
                if (toUserTrades.length > 10) {
                    status = "flagged";
                    suspiciousPatterns.push(
                        "Buyer has received more than 10 trades in 24 hours",
                    );
                }

                if (suspiciousPatterns.length > 0) {
                    notes = "❌ Suspicious trade detected:\n" +
                        suspiciousPatterns.join("\n");
                }

                // Update trade status
                const { error: updateError } = await supabase
                    .from("code_trades")
                    .update({
                        status,
                        resolution_notes: notes,
                        resolved_at: new Date().toISOString(),
                    })
                    .eq("id", trade.id);

                if (updateError) {
                    results.push({
                        trade_id: trade.id,
                        status: "error",
                        message: "Failed to update trade status",
                    });
                } else {
                    results.push({
                        trade_id: trade.id,
                        status: "success",
                        decision: status,
                        message: notes,
                    });
                }
            } catch (error: unknown) {
                results.push({
                    trade_id: trade.id,
                    status: "error",
                    message: error instanceof Error
                        ? error.message
                        : "Unknown error",
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: trades.length,
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
