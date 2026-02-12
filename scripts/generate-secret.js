const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('base64');
console.log('\n=== Generated CRON_SECRET_KEY ===');
console.log(secret);
console.log('=================================\n');
console.log('Copy the line above and paste it into your .env file as:');
console.log(`CRON_SECRET_KEY='${secret}'`);
