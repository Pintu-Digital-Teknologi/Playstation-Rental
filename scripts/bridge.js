/**
 * Bridge TV Control (MQTT -> ADB)
 * 
 * Script ini dijalankan di komputer lokal (Windows/Linux) yang satu jaringan dengan TV.
 * Tugasnya:
 * 1. Subscribe ke MQTT topic 'playstation-rental/tv/control/<API_KEY>'
 * 2. Menerima perintah { ip, action: "OFF" }
 * 3. Eksekusi perintah ADB ke IP TV tersebut
 * 
 * Cara install:
 * npm install mqtt adbkit
 * 
 * Cara jalan:
 * export BRIDGE_API_KEY="your-license-key-here"
 * node bridge.js
 * # Atau
 * node bridge.js --key="your-license-key-here"
 */

const mqtt = require('mqtt');
const { exec } = require('child_process');
const path = require('path');

// Helper to get args
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace(/^--/, '')] = value || true;
    return acc;
}, {});

// Konfigurasi
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || args.key;

if (!BRIDGE_API_KEY) {
    console.error("ERROR: BRIDGE_API_KEY is required!");
    console.error("Usage: node bridge.js --key=YOUR_KEY");
    process.exit(1);
}

const MQTT_TOPIC = `playstation-rental/tv/control/${BRIDGE_API_KEY}`;

console.log(`Starting Bridge...`);
console.log(`Broker: ${MQTT_BROKER}`);
console.log(`Topic: ${MQTT_TOPIC}`);
console.log(`API Key: ${BRIDGE_API_KEY}`);

const client = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: 1000,
});

client.on('connect', () => {
    console.log('Connected to MQTT Broker');
    client.subscribe(MQTT_TOPIC, (err) => {
        if (!err) {
            console.log(`Subscribed to ${MQTT_TOPIC}`);
        } else {
            console.error('Subscription failed:', err);
        }
    });
});

client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        console.log('Received:', payload);

        if (payload.ip && payload.action === 'OFF') {
            turnOffTV(payload.ip);
        }
    } catch (e) {
        console.error('Failed to parse message:', e);
    }
});

function turnOffTV(ip) {
    console.log(`Processing OFF for ${ip}...`);

    // 1. Connect ADB
    exec(`adb connect ${ip}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`ADB Connect Error: ${error.message}`);
            // Lanjut mencoba meski error, kadang adb sudah connect tapi return error code
        }

        // 2. Cek status power
        // Kita gunakan dumpsys power untuk melihat mWakefulness
        exec(`adb -s ${ip}:5555 shell dumpsys power | grep mWakefulness`, (err, out, serr) => {
            const isAwake = out && out.includes('mWakefulness=Awake');

            if (isAwake) {
                console.log(`TV ${ip} is Awake. Sending POWER button...`);
                // 3. Kirim tombol Power (KeyCode 26) atau Sleep (223)
                // Keycode 26 = Power Toggle
                // Keycode 223 = Sleep
                exec(`adb -s ${ip}:5555 shell input keyevent 223`, (e, o, s) => {
                    if (e) {
                        // Fallback ke Power Toggle jika Sleep tidak jalan
                        exec(`adb -s ${ip}:5555 shell input keyevent 26`);
                    }
                    console.log(`Sent OFF command to ${ip}`);

                    // Disconnect untuk cleanup (opsional)
                    // exec(`adb disconnect ${ip}`); 
                });
            } else {
                console.log(`TV ${ip} is already Asleep/Dozing. No action taken.`);
            }
        });
    });
}
