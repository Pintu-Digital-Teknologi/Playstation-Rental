import { Adb } from "@u4/adbkit";
import wol from "wake_on_lan";
import ping from "ping";
import path from "path";

// Singleton client instance
let client: ReturnType<typeof Adb.createClient>;

function getClient() {
  if (!client) {
    const options: any = {};

    // Cek jika berjalan di Windows
    if (
      process.platform === "win32" &&
      process.env.NODE_ENV === "development"
    ) {
      // Mengambil path absolut ke folder /bin/adb.exe di root proyek Anda
      const adbPath = path.join(process.cwd(), "bin", "adb.exe");
      options.bin = adbPath;
    }
    // Jika di Linux, options.bin dibiarkan kosong agar mencari di /usr/bin/adb secara otomatis

    client = Adb.createClient(options);
  }
  return client;
}

/**
 * Cek apakah TV dapat dijangkau via ping
 */
export async function isTVReachable(ip: string): Promise<boolean> {
  try {
    const res = await ping.promise.probe(ip, { timeout: 2 });
    return res.alive;
  } catch (error) {
    console.error(`Ping failed for ${ip}:`, error);
    return false;
  }
}

/**
 * Cek status TV secara detail (online/offline dan power state)
 */
export async function getTVStatus(ip: string): Promise<{
  isReachable: boolean;
  isPoweredOn: boolean;
  screenState: string | null;
}> {
  const adbClient = getClient();
  const deviceId = `${ip}:5555`;

  try {
    // 1. Cek apakah TV reachable via ping
    const isReachable = await isTVReachable(ip);
    if (!isReachable) {
      return { isReachable: false, isPoweredOn: false, screenState: null };
    }

    // 2. Coba koneksi ADB
    try {
      await adbClient.connect(ip, 5555);
      const device = adbClient.getDevice(deviceId);

      // 3. Cek screen state untuk mendeteksi apakah TV benar-benar hidup
      const screenStateOutput = await device.shell(
        "dumpsys power | grep 'mWakefulness='",
      );
      const screenStateStr = (await streamToString(screenStateOutput)).trim();

      // mWakefulness=Awake berarti TV hidup
      // mWakefulness=Asleep atau Dozing berarti TV dalam mode sleep/standby
      const isPoweredOn = screenStateStr.includes("Awake");

      return {
        isReachable: true,
        isPoweredOn,
        screenState: screenStateStr,
      };
    } catch (adbError) {
      // ADB tidak tersambung tetapi TV reachable (mungkin ADB tidak aktif)
      console.warn(`ADB connection failed for ${ip}, but TV is reachable`);
      return { isReachable: true, isPoweredOn: false, screenState: null };
    }
  } catch (error) {
    console.error(`Error checking TV status for ${ip}:`, error);
    return { isReachable: false, isPoweredOn: false, screenState: null };
  }
}

/**
 * Wake TV menggunakan Wake-on-LAN
 */
export async function wakeTV(mac: string): Promise<boolean> {
  return new Promise((resolve) => {
    wol.wake(mac, (error) => {
      if (error) {
        console.error("WoL failed:", error);
        resolve(false);
      } else {
        console.log(`WoL packet sent to ${mac}`);
        resolve(true);
      }
    });
  });
}

/**
 * METODE 5: Alternatif menggunakan notification system (fallback)
 */
export async function showSystemNotification(
  ip: string,
  title: string,
  message: string,
): Promise<boolean> {
  const adbClient = getClient();
  const deviceId = `${ip}:5555`;

  try {
    await adbClient.connect(ip, 5555);
    const device = adbClient.getDevice(deviceId);

    // Menggunakan notification system Android
    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedMessage = message.replace(/"/g, '\\"');

    await device.shell(
      `cmd notification post -S bigtext -t "${escapedTitle}" "Tag" "${escapedMessage}"`,
    );

    console.log(`System notification sent to TV ${ip}`);
    return true;
  } catch (error) {
    console.error(`Failed to show system notification on ${ip}:`, error);
    return false;
  }
}

/**
 * Kirim perintah ke TV
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
  const adbClient = getClient();
  const deviceId = `${ip}:5555`;

  try {
    // 1. Koneksi ke TV
    await adbClient.connect(ip, 5555);
    const device = adbClient.getDevice(deviceId);

    switch (actionType) {
      case "POWER_ON":
      case "WAKE_UP":
        // KEYCODE_WAKEUP (224) - untuk membangunkan TV dari sleep
        await device.shell("input keyevent 224");

        // Alternatif: menggunakan power button jika wakeup tidak berhasil
        await new Promise((resolve) => setTimeout(resolve, 500));
        await device.shell("input keyevent KEYCODE_POWER");

        console.log(`Power ON command sent to ${ip}`);
        break;

      case "POWER_OFF":
        // KEYCODE_SLEEP (223) - untuk mematikan TV
        await device.shell("input keyevent 223");
        console.log(`Power OFF command sent to ${ip}`);
        break;

      case "HOME":
        // KEYCODE_HOME (3) - kembali ke home screen
        await device.shell("input keyevent 3");
        break;

      case "BACK":
        // KEYCODE_BACK (4) - tombol back
        await device.shell("input keyevent 4");
        break;

      case "VOLUME_UP":
        // KEYCODE_VOLUME_UP (24)
        await device.shell("input keyevent 24");
        console.log(`Volume UP command sent to ${ip}`);
        break;

      case "VOLUME_DOWN":
        // KEYCODE_VOLUME_DOWN (25)
        await device.shell("input keyevent 25");
        console.log(`Volume DOWN command sent to ${ip}`);
        break;

      case "SLEEP_TIMER":
        if (payload && typeof payload === "number") {
          const delayMs = payload * 60000;
          console.log(`Timer: TV ${ip} akan mati dalam ${payload} menit.`);

          // Set timer untuk mematikan TV
          setTimeout(async () => {
            try {
              await adbClient.connect(ip, 5555);
              const timerDevice = adbClient.getDevice(deviceId);
              await timerDevice.shell("input keyevent 223");
              console.log(`Timer selesai: TV ${ip} OFF.`);
            } catch (err) {
              console.error(`Gagal mematikan TV via timer: ${err}`);
            }
          }, delayMs);
        }
        break;
    }
    return true;
  } catch (error) {
    console.error(`ADB Error on ${ip}:`, error);
    throw error;
  }
}

/**
 * Tampilkan overlay informasi rental di TV
 */
export async function showRentalInfo(
  ip: string,
  customerName: string,
  tvName: string,
  durationMinutes: number,
): Promise<boolean> {
  const adbClient = getClient();
  const deviceId = `${ip}:5555`;

  try {
    await adbClient.connect(ip, 5555);
    const device = adbClient.getDevice(deviceId);

    // Buat HTML overlay untuk ditampilkan
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      font-family: 'Arial', sans-serif;
      color: white;
    }
    .container {
      text-align: center;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 60px 80px;
      border-radius: 30px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.5s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    h1 {
      font-size: 4em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.3);
    }
    .info {
      font-size: 2.5em;
      margin: 15px 0;
      padding: 15px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 15px;
    }
    .label {
      font-size: 0.6em;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .timer {
      font-size: 1.2em;
      font-weight: bold;
      color: #ffd700;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎮 Rental Started</h1>
    <div class="info">
      <div class="label">Unit</div>
      <div>${tvName}</div>
    </div>
    <div class="info">
      <div class="label">Customer</div>
      <div>${customerName}</div>
    </div>
    <div class="info">
      <div class="label">Duration</div>
      <div class="timer">${durationMinutes} Minutes</div>
    </div>
  </div>
  <script>
    setTimeout(() => {
      window.close();
      window.location = 'about:blank';
    }, 3000);
  </script>
</body>
</html>
    `.trim();

    // Simpan HTML ke file temporary di TV
    const tempFile = "/sdcard/rental_info.html";
    await device.shell(
      `echo '${htmlContent.replace(/'/g, "\\'")}' > ${tempFile}`,
    );

    // Buka file HTML dengan browser
    await device.shell(
      `am start -a android.intent.action.VIEW -d file://${tempFile} -t text/html`,
    );

    console.log(`Rental info displayed on TV ${ip}`);

    // Hapus file temporary setelah 5 detik
    setTimeout(async () => {
      try {
        await device.shell(`rm ${tempFile}`);
      } catch (e) {
        console.warn("Failed to clean up temp file:", e);
      }
    }, 5000);

    return true;
  } catch (error) {
    console.error(`Failed to show rental info on ${ip}:`, error);
    return false;
  }
}

/**
 * Helper function untuk convert stream ke string
 */
async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}
