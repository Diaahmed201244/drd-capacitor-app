import { supabase } from "../../supabase/supabaseClient";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { judgeService } from "./judgeService";

interface CodeClaim {
  user_id: string;
  code: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  resolution_notes: string;
  resolved_by: string;
  resolved_at: string;
}

class CodeClaimService {
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
      console.error("Error initializing code claim service:", error);
      throw error;
    }
  }

  async submitClaim(code: string, reason: string) {
    if (!this.fingerprint || !this.ipInfo) {
      await this.initialize();
    }

    try {
      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in.");

      // Get code data
      const { data: codeData } = await supabase
        .from("codes")
        .select("user_id, fingerprint, ip")
        .eq("code", code)
        .single();

      if (!codeData) {
        throw new Error("Code not found.");
      }

      // Get AI judge decision
      const decision = await judgeService.evaluateClaim({
        userId: user.id,
        code,
        codeFingerprint: codeData.fingerprint,
        userFingerprint: this.fingerprint || "unknown",
        reason,
        ipInfo: this.ipInfo || {},
      });

      let status: "pending" | "approved" | "rejected" = "pending";
      let notes = "";

      if (decision.approved) {
        status = "approved";
        notes = `AI Judge approved: ${decision.reason} (Confidence: ${decision.confidence})`;
      } else {
        status = "rejected";
        notes = `AI Judge rejected: ${decision.reason} (Confidence: ${decision.confidence})`;
      }

      // Insert claim log
      const { error } = await supabase.from("code_claims").insert({
        user_id: user.id,
        code,
        reason,
        status,
        resolution_notes: notes,
        resolved_by: "AI-Judge",
        resolved_at: new Date().toISOString(),
      });

      if (error) throw error;

      return {
        status,
        notes,
      };
    } catch (error) {
      console.error("Error submitting claim:", error);
      throw error;
    }
  }

  async getClaims(userId: string) {
    try {
      const { data: claims, error } = await supabase
        .from("code_claims")
        .select("*")
        .eq("user_id", userId)
        .order("resolved_at", { ascending: false });

      if (error) throw error;
      return claims;
    } catch (error) {
      console.error("Error fetching claims:", error);
      throw error;
    }
  }
}

export const codeClaimService = new CodeClaimService();
