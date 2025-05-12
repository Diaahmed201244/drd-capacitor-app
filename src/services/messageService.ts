import { supabase } from "../../supabase/supabaseClient";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface Message {
  user_id: string;
  content: string;
  fingerprint: string;
  ip: string;
  country: string;
  is_vpn: boolean;
  created_at: string;
}

interface UserStatus {
  is_animal: boolean;
}

class MessageService {
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
      console.error("Error initializing message service:", error);
      throw error;
    }
  }

  async sendMessage(text: string) {
    if (!this.fingerprint || !this.ipInfo) {
      await this.initialize();
    }

    if (text.trim() === "") return;

    try {
      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check animal mode
      const { data: profile } = await supabase
        .from("user_status")
        .select("is_animal")
        .eq("user_id", user.id)
        .single();

      if (profile?.is_animal) {
        throw new Error("🐾 You are in animal mode and cannot use chat.");
      }

      // Check for suspicious behavior
      const { data: recentMsgs } = await supabase
        .from("messages")
        .select("user_id, fingerprint")
        .eq("fingerprint", this.fingerprint);

      const uniqueUsers = new Set(recentMsgs?.map((m) => m.user_id) || []);
      if (uniqueUsers.size > 1) {
        throw new Error(
          "⚠️ Suspicious behavior: multiple accounts using this device. Message blocked."
        );
      }

      // Send message
      const isp = this.ipInfo?.org || "";
      const isVPN =
        isp.toLowerCase().includes("vpn") ||
        isp.toLowerCase().includes("proxy");

      const { error } = await supabase.from("messages").insert({
        user_id: user.id,
        content: text,
        fingerprint: this.fingerprint,
        ip: this.ipInfo?.ip || "",
        country: this.ipInfo?.country || "",
        is_vpn: isVPN,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }

  async getMessages() {
    try {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return messages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
  }

  formatMessage(message: Message): string {
    const badge = message.is_vpn ? "⚠️ VPN" : "🔐 Verified";
    return `<p><strong>${badge}</strong> ${message.content}</p>`;
  }
}

export const messageService = new MessageService();
