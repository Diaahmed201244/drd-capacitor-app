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

        // 1. Check for multiple animal accounts per device
        const { data: animalUsers, error: animalError } = await supabase
            .from("user_status")
            .select("user_id, fingerprint, is_animal")
            .eq("is_animal", true);

        if (animalError) {
            throw new Error(
                "Error fetching animal users: " + animalError.message,
            );
        }

        const animalMap = new Map();
        const violations = [];

        for (const user of animalUsers) {
            if (animalMap.has(user.fingerprint)) {
                // Violation: same device has multiple animals
                violations.push({
                    user_id: user.user_id,
                    type: "multiple_animals",
                    fingerprint: user.fingerprint,
                });

                await supabase
                    .from("user_status")
                    .update({
                        banned: true,
                        ban_reason: "Multiple animal accounts on one device",
                        banned_at: new Date().toISOString(),
                    })
                    .eq("user_id", user.user_id);
            } else {
                animalMap.set(user.fingerprint, user.user_id);
            }
        }

        // 2. Check for suspicious animal transfers
        const { data: transfers, error: transferError } = await supabase
            .from("animal_transfers")
            .select(`
        id,
        from_user,
        to_user,
        from_fingerprint,
        to_fingerprint,
        created_at
      `)
            .order("created_at", { ascending: false });

        if (transferError) {
            throw new Error(
                "Error fetching transfers: " + transferError.message,
            );
        }

        for (const transfer of transfers) {
            // Check for self-transfers
            if (transfer.from_fingerprint === transfer.to_fingerprint) {
                violations.push({
                    transfer_id: transfer.id,
                    type: "self_transfer",
                    from_user: transfer.from_user,
                    to_user: transfer.to_user,
                });

                await supabase
                    .from("animal_transfers")
                    .update({
                        status: "rejected",
                        rejection_reason: "Self-transfer detected",
                        processed_at: new Date().toISOString(),
                    })
                    .eq("id", transfer.id);

                // Ban both users involved
                await supabase
                    .from("user_status")
                    .update({
                        banned: true,
                        ban_reason: "Attempted animal power self-transfer",
                        banned_at: new Date().toISOString(),
                    })
                    .in("user_id", [transfer.from_user, transfer.to_user]);
            }

            // Check for rapid transfers
            const { data: recentTransfers, error: recentError } = await supabase
                .from("animal_transfers")
                .select("id")
                .or(`from_user.eq.${transfer.from_user},to_user.eq.${transfer.to_user}`)
                .gte(
                    "created_at",
                    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                );

            if (recentError) {
                console.error("Error checking recent transfers:", recentError);
                continue;
            }

            if (recentTransfers.length > 5) {
                violations.push({
                    transfer_id: transfer.id,
                    type: "rapid_transfer",
                    from_user: transfer.from_user,
                    to_user: transfer.to_user,
                    count: recentTransfers.length,
                });

                await supabase
                    .from("user_status")
                    .update({
                        banned: true,
                        ban_reason: "Excessive animal transfers detected",
                        banned_at: new Date().toISOString(),
                    })
                    .in("user_id", [transfer.from_user, transfer.to_user]);
            }
        }

        // 3. Enforce irreversible animal status
        const { data: statusChanges, error: statusError } = await supabase
            .from("user_status")
            .select("user_id, is_animal, became_animal_at")
            .eq("is_animal", true);

        if (statusError) {
            throw new Error(
                "Error fetching status changes: " + statusError.message,
            );
        }

        for (const status of statusChanges) {
            // Ensure animal status is properly recorded
            if (!status.became_animal_at) {
                await supabase
                    .from("user_status")
                    .update({
                        became_animal_at: new Date().toISOString(),
                        animal_level: "1", // Default level
                    })
                    .eq("user_id", status.user_id);
            }
        }

        // 4. Block banned users from trading/chatting
        const { data: bannedUsers, error: bannedError } = await supabase
            .from("user_status")
            .select("user_id")
            .eq("banned", true);

        if (bannedError) {
            throw new Error(
                "Error fetching banned users: " + bannedError.message,
            );
        }

        for (const user of bannedUsers) {
            // Disable trading
            await supabase
                .from("code_trades")
                .update({ status: "cancelled" })
                .or(`from_user_id.eq.${user.user_id},to_user_id.eq.${user.user_id}`)
                .eq("status", "pending");

            // Disable chat
            await supabase
                .from("chat_messages")
                .update({ status: "hidden" })
                .eq("user_id", user.user_id);
        }

        return new Response(
            JSON.stringify({
                success: true,
                violations,
                banned_users: bannedUsers.length,
                animal_users: animalUsers.length,
                processed_transfers: transfers.length,
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
