import { getDatabase } from "@/lib/db";
import { publishTVAction } from "@/lib/mqtt";
import { ObjectId } from "mongodb";

/**
 * Cek status TV dari Database
 * (Updated by Bridge, so we trust DB)
 */
export async function getTVStatus(ip: string): Promise<{
  isReachable: boolean;
  isPoweredOn: boolean;
  screenState: string | null;
}> {
  try {
    const db = await getDatabase();
    const tv = await db.collection("tvs").findOne({ ipAddress: ip });

    if (!tv) {
      return { isReachable: false, isPoweredOn: false, screenState: null };
    }

    // Trust the status from DB (updated by Bridge)
    return {
      isReachable: !!tv.isReachable,
      isPoweredOn: !!tv.isOnline, // Bridge maps "Awake" to isOnline=true
      screenState: tv.isOnline ? "Awake" : "Asleep",
    };
  } catch (error) {
    console.error(`Error checking TV status for ${ip}:`, error);
    return { isReachable: false, isPoweredOn: false, screenState: null };
  }
}

/**
 * Kirim perintah ke TV via MQTT
 */
export async function sendCommandToTV(
  ip: string,
  actionType:
    | "POWER_ON"
    | "POWER_OFF"
    | "SLEEP_TIMER"
    | "WAKE_UP"
    | "HOME"
    | "BACK"
    | "VOLUME_UP"
    | "VOLUME_DOWN",
  payload?: any,
) {
  try {
    console.log(`Sending command ${actionType} to ${ip} via MQTT...`);

    switch (actionType) {
      case "POWER_ON":
      case "WAKE_UP":
        await publishTVAction(ip, "ON");
        break;

      case "POWER_OFF":
        await publishTVAction(ip, "OFF");
        break;

      case "HOME":
        await publishTVAction(ip, "HOME");
        break;

      case "BACK":
        await publishTVAction(ip, "BACK");
        break;

      case "VOLUME_UP":
        await publishTVAction(ip, "VOLUME_UP");
        break;

      case "VOLUME_DOWN":
        await publishTVAction(ip, "VOLUME_DOWN");
        break;

      case "SLEEP_TIMER":
        // Payload is duration in minutes
        await publishTVAction(ip, "SLEEP_TIMER", { duration: payload });
        break;
    }
    return true;
  } catch (error) {
    console.error(`Error sending command to ${ip}:`, error);
    throw error;
  }
}

/**
 * Tampilkan overlay informasi rental di TV
 * (Deprecated/Placeholder: Requires Bridge support to show message via Browser or App)
 */
export async function showRentalInfo(
  ip: string,
  customerName: string,
  tvName: string,
  durationMinutes: number,
): Promise<boolean> {
  // Feature disabled for now as requested
  console.log(`[INFO] Rental Info requested for ${ip} (Feature Disabled)`);
  return true;
}
