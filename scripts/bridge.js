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
// Konfigurasi
const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || args.key;
// Allow overriding API URL (default to localhost for dev, but user likely needs to set this)
const API_URL = process.env.API_URL || args.api || "http://localhost:3000";
// Note: User running this script against VPS needs to set API_URL=https://vps-domain.com

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
console.log(`API URL: ${API_URL}`);

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

// --- Polling & Sync Logic ---

async function fetchTVs() {
    try {
        const res = await fetch(`${API_URL}/api/tv/list`, {
            headers: { 'x-api-key': BRIDGE_API_KEY }
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        const data = await res.json();
        return data.tvs || [];
    } catch (err) {
        console.error('Failed to fetch TVs:', err.message);
        return [];
    }
}

async function checkTVStatus(ip) {
    return new Promise((resolve) => {
        exec(`adb connect ${ip}`, (error) => {
            if (error) {
                // Connection failed (maybe offline)
                return resolve({ ip, isOnline: false, isReachable: false });
            }

            // Check power state
            exec(`adb -s ${ip}:5555 shell dumpsys power | grep mWakefulness`, (err, out) => {
                const isOnline = out && out.includes('mWakefulness=Awake');
                resolve({ ip, isOnline: !!isOnline, isReachable: true });
                // Optional: disconnect to save resources, or keep open
            });
        });
    });
}

async function syncStatus() {
    console.log('Syncing status...');
    const tvs = await fetchTVs();
    if (tvs.length === 0) return;

    const statuses = await Promise.all(tvs.map(tv => checkTVStatus(tv.ipAddress)));

    try {
        const res = await fetch(`${API_URL}/api/tv/bridge-sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': BRIDGE_API_KEY
            },
            body: JSON.stringify({ statuses })
        });

        if (res.ok) {
            console.log(`Synced ${statuses.length} TVs successfully.`);
        } else {
            console.error(`Sync failed: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.error('Sync error:', err.message);
    }
}

// Start polling loop (every 10 seconds)
setInterval(syncStatus, 10000);
// Initial sync
syncStatus();


function turnOffTV(ip) {
    console.log(`Processing OFF for ${ip}...`);

    exec(`adb connect ${ip}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`ADB Connect Error: ${error.message}`);
        }

        exec(`adb -s ${ip}:5555 shell dumpsys power | grep mWakefulness`, (err, out, serr) => {
            const isAwake = out && out.includes('mWakefulness=Awake');

            if (isAwake) {
                console.log(`TV ${ip} is Awake. Sending POWER button...`);
                exec(`adb -s ${ip}:5555 shell input keyevent 223`, (e, o, s) => {
                    if (e) {
                        exec(`adb -s ${ip}:5555 shell input keyevent 26`);
                    }
                    console.log(`Sent OFF command to ${ip}`);
                });
            } else {
                console.log(`TV ${ip} is already Asleep/Dozing. No action taken.`);
            }
        });
    });
}
