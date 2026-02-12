const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Manually verify .env loading without dotenv package
function loadEnv() {
    const currentDir = process.cwd();
    const parentDir = path.join(__dirname, '..');

    // Check possible locations: current directory, script directory, and parent of script directory
    // This covers running from root, running from scripts/, and running node scripts/reset-admin.js
    const searchDirs = [
        currentDir,
        __dirname,
        parentDir
    ];

    // Deduplicate directories
    const uniqueDirs = [...new Set(searchDirs)];
    const envFiles = ['.env.local', '.env'];

    console.log('Searching for env files in:', uniqueDirs);

    for (const dir of uniqueDirs) {
        for (const file of envFiles) {
            const envPath = path.join(dir, file);
            if (fs.existsSync(envPath)) {
                console.log('Found env file:', envPath);
                const content = fs.readFileSync(envPath, 'utf-8');

                const lines = content.split(/\r?\n/);
                lines.forEach(line => {
                    // Match KEY=VALUE, allowing for spaces around =
                    const match = line.match(/^\s*([^=]+?)\s*=\s*(.*)?\s*$/);
                    if (match) {
                        const key = match[1];
                        let value = match[2] || '';

                        // Remove quotes
                        if (value.length > 1 &&
                            ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'")))) {
                            value = value.substring(1, value.length - 1);
                        }

                        if (!process.env[key]) {
                            process.env[key] = value;
                            if (key === 'MONGODB_URI') console.log('Loaded MONGODB_URI');
                        }
                    }
                });
            }
        }
    }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env or .env.local');
    console.log('Current env keys:', Object.keys(process.env));
    process.exit(1);
}

async function resetPassword() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const question = (prompt) => {
        return new Promise((resolve) => {
            rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    };

    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db('playstation-rental');

        console.log('\n=== Admin Password Reset ===\n');

        const username = await question('Enter admin username to reset (or create): ');
        let password = '';
        let confirmPassword = '';

        while (password !== confirmPassword || password.length < 6) {
            password = await question('Enter new password (min 6 chars): ');
            confirmPassword = await question('Confirm password: ');
            if (password !== confirmPassword) {
                console.log('Passwords do not match. Try again.');
            } else if (password.length < 6) {
                console.log('Password must be at least 6 characters.');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.collection('admins').updateOne(
            { username: { $regex: `^${username}$`, $options: 'i' } },
            {
                $set: {
                    username: username, // Ensure case match
                    password: hashedPassword,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    email: `${username}@example.com`,
                    createdAt: new Date(),
                },
            },
            { upsert: true }
        );

        if (result.matchedCount > 0) {
            console.log(`✓ Password updated for user '${username}'.`);
        } else if (result.upsertedCount > 0) {
            console.log(`✓ Created new admin user '${username}'.`);
        }

        rl.close();
        await client.close();
    } catch (error) {
        console.error('Error:', error);
        rl.close();
        process.exit(1);
    }
}

resetPassword();
