import mqtt from "mqtt";
import wakeonlan from "wake_on_lan";
import axios from "axios";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

// ==========================================
// KONFIGURASI LOCAL BRIDGE RENTAL
// ==========================================

// 1. Dapatkan dari Dashboard Admin VPS Anda
const LICENSE_KEY = process.env.LICENSE_KEY || "YOUR_RENTAL_LICENSE_KEY";

// 2. Broker MQTT yang sama dengan VPS Cloud (wajib sama!)
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";

// Topic khusus untuk rental ini
const SUBSCRIBE_TOPIC = `playstation-rental/tv/control/${LICENSE_KEY}`;

// ==========================================

console.log("====================================");
console.log("🚀 PS Rental Local Bridge Starting...");
console.log(`📡 Connecting to MQTT: ${MQTT_BROKER}`);
console.log(`🔑 License/Topic: ${SUBSCRIBE_TOPIC}`);
console.log("====================================\n");

const client = mqtt.connect(MQTT_BROKER, {
  reconnectPeriod: 2000,
  connectTimeout: 30 * 1000,
});

client.on("connect", () => {
  console.log("✅ Connected to Cloud MQTT Broker!");

  // Subscribe ke perintah khusus untuk rental cabang ini
  client.subscribe(SUBSCRIBE_TOPIC, (err) => {
    if (!err) {
      console.log(`🎧 Listening for TV commands on ${SUBSCRIBE_TOPIC}...`);
    } else {
      console.error("❌ Failed to subscribe:", err);
    }
  });
});

client.on("message", async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const { action, ip, data, timestamp } = payload;

    console.log(`\n📥 Received Command [${action}] for IP: ${ip}`);

    // Abaikan pesan usang melebihi 60 detik (mencegah ghost command)
    if (timestamp) {
      const msgTime = new Date(timestamp).getTime();
      if (Date.now() - msgTime > 60000) {
        console.log("⚠️ Ignoring old message.");
        return;
      }
    }

    // ==========================================
    // ROUTING PERINTAH KE TV LOKAL
    // ==========================================
    switch (action) {
      case "WOL":
        if (data && data.mac) {
          console.log(
            `🔮 Sending Wake-On-LAN Magic Packet to MAC: ${data.mac}`,
          );
          wakeonlan.wake(data.mac, (error) => {
            if (error) console.error(`❌ WOL Failed:`, error);
            else console.log(`✅ WOL Packet Sent!`);
          });
        } else {
          console.log("⚠️ No MAC address provided for WOL");
        }
        break;

      case "SHOW_MESSAGE":
        if (data && data.message) {
          console.log(
            `✉️ Sending On-Screen Message to ${ip}: "${data.message}"`,
          );
          await sendToastToTV(ip, data.message);
        }
        break;

      case "POWER_ON":
        console.log(`🔌 Attempting API Power On for IP: ${ip}`);
        await sendCommandViaADB(ip, 26); // KeyCode 26 is Power
        break;

      case "POWER_OFF":
        console.log(`🛑 Attempting API Power Off (Sleep) for IP: ${ip}`);
        await sendCommandViaADB(ip, 26); // Power key acts as toggle
        break;

      case "VOLUME_UP":
        await sendCommandViaADB(ip, 24); // Volume Up
        break;

      case "VOLUME_DOWN":
        await sendCommandViaADB(ip, 25); // Volume Down
        break;

      case "HOME":
        await sendCommandViaADB(ip, 3); // Home
        break;

      case "BACK":
        await sendCommandViaADB(ip, 4); // Back
        break;

      default:
        console.log(`❓ Unknown Action: ${action}`);
    }
  } catch (error) {
    console.error("❌ Error processing MQTT message:", error);
  }
});

client.on("error", (error) => {
  console.error("❌ MQTT Connection Error:", error);
});

// ==========================================
// TV SPECIFIC CONTROLLERS (Adaptasikan dengan merk TV Anda)
// ==========================================

/**
 * Mengirim pesan Toast/Popup.
 * KODE DI BAWAH ADALAH CONTOH UNTUK ANDROID TV YANG TERINSTALL "PiPup"
 * https://github.com/rogro82/PiPup
 */
async function sendToastToTV(ip, messageText) {
  try {
    // Port 7979 adalah port default aplikasi PiPup
    const response = await axios.post(
      `http://${ip}:7979/notify`,
      {
        message: messageText,
        duration: 10, // Muncul 10 Detik
        position: 1, // 1: Center, 2: Bottom, dll tergantung apk
        backgroundColor: "#b91c1c", // Merah alert
        title: "Playstation Rental Admin",
        titleColor: "#ffffff",
      },
      { timeout: 3000 },
    );

    console.log(`✅ Message displayed successfully on ${ip}`);
  } catch (error) {
    console.error(
      `❌ Failed to send message to ${ip}. (Is PiPup installed & running?)`,
    );
    // Fallback: Bisa tambahkan Audio Text-to-Speech via bluetooth jika TV nge-block.
  }
}

/**
 * Contoh Kontrol menggunakan Native ADB (Android Debug Bridge)
 * Sangat ampuh untuk Android TV / STB Indihome / Xiaomi TV
 * Syarat: "Developer mode" & "USB Debugging" aktif di TV.
 */
async function sendCommandViaADB(ip, keyCode) {
  try {
    // 1. Pastikan Connect
    await execPromise(`adb connect ${ip}`);

    // 2. Kirim KeyEvent (26 = Power, 24 = Vol Up, dll)
    await execPromise(`adb -s ${ip}:5555 shell input keyevent ${keyCode}`);

    console.log(`✅ ADB KeyEvent ${keyCode} executed on ${ip}`);
  } catch (error) {
    console.error(`❌ ADB Failed on ${ip}. (Is ADB Debugging enabled on TV?)`);
  }
}

// Catatan JIKA MENGGUNAKAN LG WebOS:
// Ganti fungsi di atas menggunakan npm package 'lgtv2'
// lgtv.request('luna://com.webos.notification/createToast', { message: "Hello" });
