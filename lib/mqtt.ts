import mqtt from "mqtt";
import { getDatabase } from "@/lib/db";
import { License } from "@/lib/types";

// Konfigurasi Cloud MQTT (Gunakan public broker untuk testing, private untuk production)
// Contoh: 'mqtt://broker.hivemq.com' atau 'mqtt://test.mosquitto.org'
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
const MQTT_BASE_TOPIC = "playstation-rental/tv/control";

let client: mqtt.MqttClient | null = null;

function getClient() {
    if (!client) {
        console.log(`Initializing MQTT client to ${MQTT_BROKER}`);
        client = mqtt.connect(MQTT_BROKER, {
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
        });

        client.on("connect", () => {
            console.log("MQTT Client Connected to Cloud Broker");
        });

        client.on("error", (err: Error) => {
            console.error("MQTT Client Error:", err);
        });
    }
    return client;
}

export type TVAction = "OFF" | "ON";

/**
 * Publish perintah ke Broker MQTT agar diambil oleh Local Bridge
 * @param ip IP Address TV di jaringan lokal rental
 * @param action Action yang dilakukan (OFF/ON)
 */
export async function publishTVAction(ip: string, action: TVAction) {
    try {
        const db = await getDatabase();
        const now = new Date();

        // Ambil semua license yang aktif dan belum expired
        const activeLicenses = await db
            .collection<License>("licenses")
            .find({
                status: "active",
                expiresAt: { $gt: now },
            })
            .toArray();

        if (activeLicenses.length === 0) {
            console.log("No active licenses found. Skipping MQTT publish.");
            return;
        }

        const mqttClient = getClient();

        // Pastikan client terhubung
        if (!mqttClient.connected && !mqttClient.reconnecting) {
            // Force reconnect logic handled by library mostly
        }

        const payload = JSON.stringify({ ip, action, timestamp: now.toISOString() });

        // Broadcast ke semua active license key topic
        activeLicenses.forEach((license) => {
            const topic = `${MQTT_BASE_TOPIC}/${license.key}`;

            mqttClient.publish(topic, payload, { qos: 1 }, (err?: Error) => {
                if (err) {
                    console.error(`Failed to publish to ${topic}:`, err);
                } else {
                    console.log(`MQTT Sent to ${license.name} (${license.key}): ${action} -> ${ip}`);
                }
            });
        });

    } catch (error) {
        console.error("Error publishing TV action:", error);
    }
}
