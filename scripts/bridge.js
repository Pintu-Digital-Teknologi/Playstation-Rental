/**
 * Bridge TV Control (MQTT -> ADB)
 *
 * Script ini dijalankan di komputer lokal (Windows/Linux) yang satu jaringan dengan TV.
 * Tugasnya:
 * 1. Subscribe ke MQTT topic 'playstation-rental/tv/control/<API_KEY>'
 * 2. Menerima perintah { ip, action: "OFF" }
 * 3. Eksekusi perintah ADB ke IP TV tersebut
 * 4. Update status TV ke server secara berkala
 */

require("dotenv").config();
const mqtt = require("mqtt");
const wol = require("wake_on_lan");
const { exec, execSync } = require("child_process");

// Check ADB availability
try {
  execSync("adb version", { stdio: "ignore" });
} catch (e) {
  console.error(
    "\x1b[31m%s\x1b[0m",
    "CRITICAL ERROR: Command 'adb' tidak ditemukan!",
  );
  console.error(
    "Silakan install Android Platform Tools dan tambahkan ke system PATH.",
  );
  process.exit(1);
}

// Konfigurasi Environment / Args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.split("=");
  acc[key.replace(/^--/, "")] = value || true;
  return acc;
}, {});

const MQTT_BROKER =
  args.broker || process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
const BRIDGE_API_KEY = args.key || process.env.BRIDGE_API_KEY;
const API_URL = args.api || process.env.API_URL || "http://localhost:3000";

if (!BRIDGE_API_KEY) {
  console.error("ERROR: BRIDGE_API_KEY wajib diisi!");
  console.error(
    "Gunakan file .env atau jalankan dengan: node bridge.js --key=YOUR_KEY",
  );
  process.exit(1);
}

const MQTT_TOPIC = `playstation-rental/tv/control/${BRIDGE_API_KEY}`;

console.log(`=== BRIDGE TV CONTROL STARTED ===`);
console.log(`Broker   : ${MQTT_BROKER}`);
console.log(`Topic    : ${MQTT_TOPIC}`);
console.log(`Key      : ${BRIDGE_API_KEY}`);
console.log(`API URL  : ${API_URL}`);
console.log(`=================================`);

// === LOGIC TIMER ===
const activeTimers = {}; // { '192.168.1.5': TimeoutID }

function setSleepTimer(ip, minutes) {
  // Clear existing timer if any
  if (activeTimers[ip]) {
    clearTimeout(activeTimers[ip]);
    delete activeTimers[ip];
  }

  if (minutes > 0) {
    console.log(`[TIMER] Set timer untuk ${ip}: ${minutes} menit`);
    const durationMs = minutes * 60 * 1000;

    activeTimers[ip] = setTimeout(() => {
      console.log(`[TIMER] Waktu habis untuk ${ip}. Mematikan TV...`);
      executeCommand(ip, "OFF");
      delete activeTimers[ip];
    }, durationMs);
  } else {
    console.log(`[TIMER] Timer dibatalkan untuk ${ip}`);
  }
}

// === MQTT CLIENT ===
const client = mqtt.connect(MQTT_BROKER, {
  reconnectPeriod: 5000,
});

client.on("connect", () => {
  console.log("[MQTT] Terhubung ke Broker");
  client.subscribe(MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`[MQTT] Subscribed le ${MQTT_TOPIC}`);
    } else {
      console.error("[MQTT] Gagal subscribe:", err);
    }
  });
});

client.on("message", (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log("[MQTT] Menerima Perintah:", payload);

    if (payload.ip && payload.action) {
      if (payload.action === "SLEEP_TIMER") {
        const minutes = payload.data?.duration || 0;
        setSleepTimer(payload.ip, minutes);
      } else if (payload.action === "WOL") {
        const mac = payload.data?.mac;
        if (mac) {
          console.log(`[WOL] Mengirim Magic Packet ke ${mac}...`);
          wol.wake(mac, (err) => {
            if (err) console.error(`[WOL] Gagal: ${err}`);
            else console.log(`[WOL] Berhasil dikirim.`);
          });
        }
      } else if (payload.action === "SHOW_MESSAGE") {
        handleShowMessage(payload.ip, payload.data);
      } else {
        executeCommand(payload.ip, payload.action, payload.data);
      }
    }
  } catch (e) {
    console.error("[MQTT] Gagal parse pesan:", e);
  }
});

// === SYNC STATUS ===
async function fetchTVs() {
  try {
    const res = await fetch(`${API_URL}/api/tv/list`, {
      headers: { "x-api-key": BRIDGE_API_KEY },
    });
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
    const data = await res.json();
    return data.tvs || [];
  } catch (err) {
    console.error("[SYNC] Gagal mengambil daftar TV:", err.message);
    return [];
  }
}

async function checkTVStatus(ip) {
  return new Promise((resolve) => {
    // console.log(`[SYNC] Cek status ${ip}...`);
    exec(`adb connect ${ip}`, (error, stdout, stderr) => {
      if (error) {
        // console.log(`[${ip}] Connect Gagal: ${error.message}`);
        return resolve({ ip, isOnline: false, isReachable: false });
      }

      exec(`adb -s ${ip}:5555 shell dumpsys power`, (err, out, serr) => {
        if (err) {
          return resolve({ ip, isOnline: false, isReachable: true });
        }
        const output = out ? out.toString() : "";
        const isOnline = output.match(/mWakefulness=Awake/);
        resolve({ ip, isOnline: !!isOnline, isReachable: true });
      });
    });
  });
}

async function syncStatus() {
  // console.log("[SYNC] Memulai sinkronisasi...");
  const tvs = await fetchTVs();
  if (tvs.length === 0) return;

  const statuses = await Promise.all(
    tvs.map((tv) => checkTVStatus(tv.ipAddress)),
  );

  try {
    const res = await fetch(`${API_URL}/api/tv/bridge-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": BRIDGE_API_KEY,
      },
      body: JSON.stringify({ statuses }),
    });

    if (res.ok) {
      console.log(`[SYNC] Berhasil update status ${statuses.length} TV.`);
    } else {
      console.error(`[SYNC] Gagal update ke server: ${res.status}`);
    }
  } catch (err) {
    console.error("[SYNC] Error request:", err.message);
  }
}

// Loop Sync setiap 10 detik
setInterval(syncStatus, 10000);
syncStatus();

// === EXECUTE COMMAND ===
function executeCommand(ip, action, actionData) {
  console.log(`[ADB] Eksekusi ${action} ke TV ${ip}...`);

  exec(`adb connect ${ip}`, (error) => {
    if (error) console.log(`[${ip}] Connect Error: ${error.message}`);

    let adbCmd = "";
    switch (action) {
      case "POWER_OFF":
      case "OFF":
        adbCmd = "input keyevent 223"; // SLEEP
        // Batalkan timer jika dimatikan manual
        if (activeTimers[ip]) {
          console.log(`[TIMER] Timer dibatalkan karena manual OFF.`);
          clearTimeout(activeTimers[ip]);
          delete activeTimers[ip];
        }
        break;
      case "POWER_ON":
      case "ON":
        adbCmd = "input keyevent 224"; // WAKEUP
        break;
      case "VOLUME_UP":
        adbCmd = "input keyevent 24";
        break;
      case "VOLUME_DOWN":
        adbCmd = "input keyevent 25";
        break;
      case "BACK":
        adbCmd = "input keyevent 4";
        break;
      case "HOME":
        adbCmd = "input keyevent 3";
        break;
      default:
        console.log(`[ADB] Action tidak dikenal: ${action}`);
        return;
    }

    if (adbCmd) {
      exec(`adb -s ${ip}:5555 shell ${adbCmd}`, (e, o, s) => {
        if (e) {
          console.error(`[${ip}] Gagal Eksekusi: ${e.message}`);
          // Fallback Power Off
          if (action === "POWER_OFF" || action === "OFF") {
            console.log(`[${ip}] Mencoba alternatif Power Toggle...`);
            exec(`adb -s ${ip}:5555 shell input keyevent 26`);
          }
        } else {
          console.log(`[${ip}] Berhasil: ${action}`);
        }
      });
    }
  });
}

// === SHOW MESSAGE (TV OVERLAY) ===
function handleShowMessage(ip, actionData) {
  const msgText = actionData?.message || "Pesan dari Admin";
  console.log(`[ADB] Eksekusi SHOW_MESSAGE ke TV ${ip}...`);
  console.log(`[${ip}] Mengatur Izin Overlay...`);

  exec(`adb connect ${ip}`, (connErr) => {
    if (connErr) {
      console.log(`[${ip}] Connect Error: ${connErr.message}`);
    }

    exec(
      `adb -s ${ip}:5555 shell appops set com.tabdeveloper.tvoverlay SYSTEM_ALERT_WINDOW allow`,
      () => {
        console.log(`[${ip}] Mengirim HTTP Pesan: "${msgText}"`);
        // Gunakan request HTTP natif bawaan Node.js
        const http = require("http");
        const data = JSON.stringify({
          message: msgText,
          duration: actionData?.duration || 10,
          position: "BOTTOM_RIGHT",
          bgcolor: "#b91c1c",
          title: "Playstation Rental Admin",
        });
        const req = http.request(
          {
            hostname: ip,
            port: 5001,
            path: "/notify",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(data),
            },
          },
          (res) => {
            console.log(
              `[${ip}] Pesan TvOverlay Terkirim. Status: ${res.statusCode}`,
            );
          },
        );
        req.on("error", (e) => {
          console.error(`[${ip}] Gagal Mengirim Pesan TvOverlay: ${e.message}`);
        });
        req.write(data);
        req.end();
      },
    );
  });
}
