import { supabase } from "../../supabase/supabaseClient";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface Code {
  code: string;
  fingerprint: string;
  ip: string;
}

export const codeSecurityService = {
  async generateCode(userId: string) {
    try {
      // Get fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      // Get IP Info
      const ipInfo = await fetch(
        "https://ipinfo.io/json?token=7bec9381caff9f"
      ).then((r) => r.json());

      // Generate code (example format: 1ABC1GO)
      const code = this.generateUniqueCode();

      // Save to Supabase with metadata
      const { error } = await supabase.from("codes").insert({
        code,
        user_id: userId,
        fingerprint,
        ip: ipInfo.ip,
        country: ipInfo.country,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      return code;
    } catch (error) {
      console.error("Code generation error:", error);
      throw error;
    }
  },

  async checkGoldCodePattern(userId: string) {
    try {
      const prefix = "1";
      const suffix = "GO";

      const { data: userCodes, error } = await supabase
        .from("codes")
        .select("code, fingerprint, ip")
        .eq("user_id", userId)
        .like("code", `${prefix}%${suffix}`);

      if (error) throw error;

      if (userCodes.length >= 4) {
        const uniqueFingerprints = new Set(
          userCodes.map((c: Code) => c.fingerprint)
        );
        const uniqueIPs = new Set(userCodes.map((c: Code) => c.ip));

        if (uniqueFingerprints.size === 1 || uniqueIPs.size === 1) {
          // Log suspicious activity
          await supabase.from("security_logs").insert({
            user_id: userId,
            event_type: "suspicious_gold_farming",
            details: {
              codes: userCodes,
              unique_fingerprints: uniqueFingerprints.size,
              unique_ips: uniqueIPs.size,
            },
          });
          return {
            suspicious: true,
            message: "⚠️ Suspicious gold code farming detected",
          };
        }
        return {
          suspicious: false,
          message: "🎉 Legitimate 4-code gold set detected!",
        };
      }
      return { suspicious: false, message: "Continue collecting codes" };
    } catch (error) {
      console.error("Gold code check error:", error);
      throw error;
    }
  },

  generateUniqueCode(): string {
    const prefix = "1";
    const suffix = "GO";
    const middle = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}${middle}${suffix}`;
  },
};
