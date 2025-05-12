import { supabase } from "../../supabase/supabaseClient";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface CodeTrade {
  code: string;
  from_user: string;
  to_user: string;
  from_fingerprint: string;
  to_fingerprint: string;
  from_ip: string;
  to_ip: string;
  status: "flagged" | "completed";
  created_at: string;
}

class TradeService {
  private fingerprint: string | null = null;
  private ipInfo: Record<string, any> | null = null;

  async initialize() {
    try {
      // Get fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      this.fingerprint = result.visitorId;

      // Get IP/region info
      const response = await fetch(
        "https://ipinfo.io/json?token=7bec9381caff9f"
      );
      this.ipInfo = await response.json();
    } catch (error) {
      console.error("Error initializing trade service:", error);
      throw error;
    }
  }

  async tradeCode(code: string, toUserId: string) {
    if (!this.fingerprint || !this.ipInfo) {
      await this.initialize();
    }

    try {
      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must log in.");

      const userId = user.id;

      // 1. Get code info
      const { data: codeData } = await supabase
        .from("codes")
        .select("status, used_by, fingerprint")
        .eq("code", code)
        .single();

      if (!codeData) throw new Error("Code not found.");
      if (codeData.status !== "unused")
        throw new Error("❌ Code already used or invalid.");
      if (codeData.used_by !== userId)
        throw new Error("⚠️ You do not own this code.");

      // 2. Get receiver info
      const { data: receiverFPData } = await supabase
        .from("user_fingerprints")
        .select("fingerprint, ip")
        .eq("user_id", toUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      const toFP = receiverFPData?.fingerprint || "unknown";
      const toIP = receiverFPData?.ip || "unknown";

      // 3. Check for fraud
      if (this.fingerprint && this.fingerprint === toFP) {
        throw new Error(
          "🚫 Trade Blocked: Sender and receiver share the same device."
        );
      }

      // 4. Transfer code
      const { error: updateError } = await supabase
        .from("codes")
        .update({
          used_by: toUserId,
          updated_at: new Date().toISOString(),
        })
        .eq("code", code);

      if (updateError) throw updateError;

      // 5. Log trade
      const { error: tradeError } = await supabase.from("code_trades").insert({
        code,
        from_user: userId,
        to_user: toUserId,
        from_fingerprint: this.fingerprint || "unknown",
        to_fingerprint: toFP,
        from_ip: this.ipInfo?.ip || "unknown",
        to_ip: toIP,
        status: this.ipInfo?.ip === toIP ? "flagged" : "completed",
        created_at: new Date().toISOString(),
      });

      if (tradeError) throw tradeError;

      return {
        success: true,
        message: `Code ${code} transferred successfully!`,
        status: this.ipInfo?.ip === toIP ? "flagged" : "completed",
      };
    } catch (error) {
      console.error("Error trading code:", error);
      throw error;
    }
  }

  async getTradeHistory(userId: string) {
    try {
      const { data: trades, error } = await supabase
        .from("code_trades")
        .select("*")
        .or(`from_user.eq.${userId},to_user.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return trades;
    } catch (error) {
      console.error("Error fetching trade history:", error);
      throw error;
    }
  }
}

export const tradeService = new TradeService();
