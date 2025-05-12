import { supabase } from "../../supabase/supabaseClient";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

interface WatchSession {
  userId: string;
  videoId: string;
  watchTime: number;
  fingerprint: string;
  ip: string;
  country: string;
  isHeadless: boolean;
  lastInteraction: number;
}

class WatchTrackerService {
  private session: WatchSession | null = null;
  private timer: number | null = null;

  async initializeSession(userId: string, videoId: string) {
    try {
      // Get fingerprint
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const fingerprint = result.visitorId;

      // Get IP Info
      const ipInfo = await fetch(
        "https://ipinfo.io/json?token=7bec9381caff9f"
      ).then((r) => r.json());

      this.session = {
        userId,
        videoId,
        watchTime: 0,
        fingerprint,
        ip: ipInfo.ip,
        country: ipInfo.country,
        isHeadless: this.checkHeadless(),
        lastInteraction: Date.now(),
      };

      // Save initial session
      await this.saveSession();
    } catch (error) {
      console.error("Error initializing watch session:", error);
      throw error;
    }
  }

  private checkHeadless(): boolean {
    return (
      !navigator.webdriver &&
      navigator.plugins.length > 0 &&
      document.visibilityState !== "hidden"
    );
  }

  private isUserActive(): boolean {
    if (!this.session) return false;
    const inactiveLimit = 60 * 1000; // 60 seconds
    return (
      document.hasFocus() &&
      Date.now() - this.session.lastInteraction < inactiveLimit
    );
  }

  async updateInteraction() {
    if (this.session) {
      this.session.lastInteraction = Date.now();
    }
  }

  async startTracking() {
    if (this.timer) return;

    this.timer = window.setInterval(async () => {
      if (this.session && this.isUserActive() && !this.session.isHeadless) {
        this.session.watchTime++;
        await this.saveSession();
        this.updateUI();
      }
    }, 60 * 1000); // every minute
  }

  async stopTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.session) {
      await this.saveSession();
    }
  }

  private async saveSession() {
    if (!this.session) return;

    try {
      const { error } = await supabase.from("watch_sessions").upsert({
        user_id: this.session.userId,
        video_id: this.session.videoId,
        watch_time: this.session.watchTime,
        fingerprint: this.session.fingerprint,
        ip: this.session.ip,
        country: this.session.country,
        is_headless: this.session.isHeadless,
        last_interaction: new Date(this.session.lastInteraction).toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error saving watch session:", error);
      throw error;
    }
  }

  private updateUI() {
    const watchMinutesElement = document.getElementById("watch-minutes");
    if (watchMinutesElement && this.session) {
      watchMinutesElement.textContent = this.session.watchTime.toString();
    }
  }
}

export const watchTrackerService = new WatchTrackerService();
