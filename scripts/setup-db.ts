import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function createDefaultAdmin() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
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

    console.log('\n=== PlayStation Rental System - Database Setup ===\n');

    // Check if admin already exists
    const adminCount = await db.collection('admins').countDocuments();
    if (adminCount > 0) {
      console.log('Admin already exists. Skipping admin creation.');
      rl.close();
      await client.close();
      return;
    }

    // Get admin credentials
    const username = await question('Enter admin username: ');
    const email = await question('Enter admin email: ');
    let password = '';
    let confirmPassword = '';

    while (password !== confirmPassword || password.length < 6) {
      password = await question('Enter admin password (min 6 chars): ');
      confirmPassword = await question('Confirm password: ');
      if (password !== confirmPassword) {
        console.log('Passwords do not match. Try again.');
      } else if (password.length < 6) {
        console.log('Password must be at least 6 characters.');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create indexes
    console.log('\nCreating indexes...');
    await db.collection('admins').createIndex({ username: 1 }, { unique: true });
    await db.collection('admins').createIndex({ email: 1 }, { unique: true });
    await db.collection('tvs').createIndex({ ipAddress: 1 }, { unique: true });
    await db.collection('rentals').createIndex({ publicAccessKey: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // Create admin user
    console.log('\nCreating admin user...');
    const adminResult = await db.collection('admins').insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✓ Admin created successfully! (ID: ${adminResult.insertedId})`);

    // Create sample TVs
    console.log('\nCreating sample TV units...');
    const tvs = [
      { name: 'TV 1', ipAddress: '192.168.1.10' },
      { name: 'TV 2', ipAddress: '192.168.1.11' },
      { name: 'TV 3', ipAddress: '192.168.1.12' },
    ];

    for (const tv of tvs) {
      await db.collection('tvs').insertOne({
        ...tv,
        status: 'available',
        lastChecked: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`✓ Created ${tvs.length} sample TV units`);

    console.log('\n=== Setup Complete! ===');
    console.log(`\nAdmin Credentials:`);
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log('\nYou can now log in to the admin dashboard.');

    rl.close();
    await client.close();
  } catch (error) {
    console.error('Setup error:', error);
    rl.close();
    process.exit(1);
  }
}

createDefaultAdmin();
