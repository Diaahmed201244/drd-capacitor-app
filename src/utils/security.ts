import { supabase } from "../supabase/supabaseClient";

export interface IPInfo {
  ip: string;
  country: string;
  org?: string;
  city?: string;
  region?: string;
}

export async function getIPInfo(): Promise<IPInfo> {
  const res = await fetch("https://ipinfo.io/json?token=7bec9381caff9f");
  return res.json();
}

export async function checkSecurity(userId: string) {
  try {
    // Load FingerprintJS
    const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    const fingerprint = result.visitorId;

    // Get IP and location data
    const ipData = await getIPInfo();
    const currentCountry = ipData.country;
    const ipAddress = ipData.ip;
    const isp = ipData.org || "";
    const isVPN =
      isp.toLowerCase().includes("vpn") || isp.toLowerCase().includes("proxy");

    // Check region lock
    const regionLockKey = `region-lock-${fingerprint}`;
    const lockedCountry = localStorage.getItem(regionLockKey);

    if (!lockedCountry) {
      localStorage.setItem(regionLockKey, currentCountry);
    } else if (lockedCountry !== currentCountry) {
      console.warn("⚠️ Region change detected");
      // Log the suspicious activity
      await supabase.from("security_logs").insert({
        user_id: userId,
        fingerprint,
        event_type: "region_change",
        details: {
          old_country: lockedCountry,
          new_country: currentCountry,
          ip: ipAddress,
          isp,
        },
      });
    }

    // Save fingerprint data
    await supabase.from("user_fingerprints").upsert(
      {
        user_id: userId,
        fingerprint,
        ip: ipAddress,
        country: currentCountry,
        isp,
        is_vpn: isVPN,
        region_locked_to: lockedCountry || currentCountry,
        updated_at: new Date().toISOString(),
      },
      { onConflict: ["fingerprint"] }
    );

    return {
      fingerprint,
      ipData,
      isVPN,
      regionChanged: lockedCountry && lockedCountry !== currentCountry,
    };
  } catch (error) {
    console.error("Security check failed:", error);
    throw error;
  }
}
