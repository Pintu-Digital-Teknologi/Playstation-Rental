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
        console.log(`Checking status for ${ip}...`);
        exec(`adb connect ${ip}`, (error, stdout, stderr) => {
            if (error) {
                console.log(`[${ip}] ADB Connect Error: ${error.message}`);
                // Connection failed (maybe offline)
                return resolve({ ip, isOnline: false, isReachable: false });
            }
            // console.log(`[${ip}] ADB Connect Output: ${stdout.trim()}`);

            // Check power state
            // Note: We remove '| grep' so we don't rely on local shell (Windows cmd doesn't have grep)
            // We parse the output in JS instead.
            exec(`adb -s ${ip}:5555 shell dumpsys power`, (err, out, serr) => {
                if (err) {
                    console.log(`[${ip}] Dumpsys Error: ${err.message}`);
                    return resolve({ ip, isOnline: false, isReachable: true });
                }

                const output = out ? out.toString() : '';
                // Look for mWakefulness=Awake
                const isOnline = output.match(/mWakefulness=Awake/);

                // Debug log (optional, maybe shorten it)
                // console.log(`[${ip}] Power Output length: ${output.length}`);
                console.log(`[${ip}] Status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

                resolve({ ip, isOnline: !!isOnline, isReachable: true });
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

client.on('message', (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());
        console.log('Received Command:', payload);

        if (payload.ip && payload.action) {
            executeCommand(payload.ip, payload.action);
        }
    } catch (e) {
        console.error('Failed to parse message:', e);
    }
});

// Start polling loop (every 10 seconds)
setInterval(syncStatus, 10000);
// Initial sync
syncStatus();


function executeCommand(ip, action) {
    console.log(`Executing ${action} on ${ip}...`);

    exec(`adb connect ${ip}`, (error) => {
        if (error) console.log(`[${ip}] Connect Error: ${error.message}`);

        let adbCmd = '';
        switch (action) {
            case 'POWER_OFF':
            case 'OFF':
                // SLEEP (223) or POWER (26)
                adbCmd = 'input keyevent 223';
                break;
            case 'POWER_ON':
            case 'ON':
                // WAKEUP (224)
                adbCmd = 'input keyevent 224';
                break;
            case 'VOLUME_UP':
                adbCmd = 'input keyevent 24';
                break;
            case 'VOLUME_DOWN':
                adbCmd = 'input keyevent 25';
                break;
            case 'BACK':
                adbCmd = 'input keyevent 4';
                break;
            case 'HOME':
                adbCmd = 'input keyevent 3';
                break;
            default:
                console.log(`Unknown action: ${action}`);
                return;
        }

        if (adbCmd) {
            exec(`adb -s ${ip}:5555 shell ${adbCmd}`, (e, o, s) => {
                if (e) {
                    console.error(`[${ip}] Command Failed: ${e.message}`);
                    // Fallback for Power Off
                    if (action === 'POWER_OFF' || action === 'OFF') {
                        console.log(`[${ip}] Retrying Power Toggle...`);
                        exec(`adb -s ${ip}:5555 shell input keyevent 26`);
                    }
                } else {
                    console.log(`[${ip}] Executed ${action}`);
                }
            });
        }
    });
}
