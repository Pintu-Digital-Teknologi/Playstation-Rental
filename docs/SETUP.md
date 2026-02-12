# PlayStation Rental System - Setup Guide

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account or local MongoDB installation
- Git

## Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd playstation-rental
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Set Up MongoDB

#### Option A: MongoDB Atlas (Cloud)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a new project and cluster
3. Get your connection string
4. Note: Your connection string should look like:
   ```
   mongodb+srv://username:password@cluster-name.mongodb.net/playstation-rental?retryWrites=true&w=majority
   ```

#### Option B: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service
3. Connection string:
   ```
   mongodb://localhost:27017/playstation-rental
   ```

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MongoDB connection string:

```
MONGODB_URI=your_mongodb_connection_string_here
```

### 5. Initialize the Database

Run the setup script to create the admin user and sample TV units:

```bash
npx ts-node scripts/setup-db.ts
```

This script will:
- Prompt you to create an admin account
- Create indexes for the database
- Create 3 sample TV units (TV 1, TV 2, TV 3)

When prompted:
- Enter a username (e.g., `admin`)
- Enter an email address
- Enter a password (minimum 6 characters)

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

## First Login

1. Go to http://localhost:3000/auth/login
2. Enter the credentials you created during setup
3. You will be redirected to the Admin Dashboard

## Configuration

### TV IP Addresses

The default setup creates 3 sample TVs with these IP addresses:
- TV 1: 192.168.1.10
- TV 2: 192.168.1.11
- TV 3: 192.168.1.12

You can modify these in the database or update them in the admin dashboard.

### Rental Pricing

Default rental pricing is set to Rp 50,000 per hour. You can change this when creating rentals in the admin dashboard.

## Database Schema

### Collections

1. **admins**
   - username (unique)
   - email (unique)
   - passwordHash
   - createdAt, updatedAt

2. **tvs**
   - name
   - ipAddress (unique)
   - status (available, in-use, offline)
   - currentRentalId (ObjectId, optional)
   - timerId (seconds, optional)
   - lastChecked
   - createdAt, updatedAt

3. **rentals**
   - tvId (ObjectId)
   - customerName
   - customerPhone
   - customerEmail (optional)
   - startTime
   - endTime (optional)
   - durationMinutes
   - remainingMinutes
   - totalPrice
   - status (active, completed, paused)
   - publicAccessKey (unique)
   - createdAt, updatedAt

4. **payments**
   - rentalId (ObjectId)
   - amount
   - status (pending, paid, overdue)
   - dueDate
   - paidDate (optional)
   - notes (optional)
   - createdAt, updatedAt

5. **sessions**
   - adminId (ObjectId)
   - token
   - expiresAt
   - createdAt

## Features

### Admin Dashboard

- **TV Management**: View all TV units, their status, and current rentals
- **TV Control**: Power on/off, set timers, extend rental periods
- **Rental Creation**: Create new rental sessions with customer details
- **Rentals**: View active, completed, and paused rentals
- **Payments**: Track and manage payment statuses
- **Analytics**: Revenue trends, TV utilization, and business metrics

### Customer Features

- **Public View**: Customers access their rental status via unique URL
- **Real-time Timer**: See remaining time in real-time with countdown
- **Rental Details**: View customer info, TV name, start time, and total price

## TV Control Implementation

The TV control API currently has placeholder functionality. To implement actual TV control:

1. Identify the TV control protocol (HTTP, TCP, USB-RS232, etc.)
2. Update the `sendCommandToTV` function in `/app/api/tv/control/route.ts`
3. Implement the actual communication with your TV units

Example protocols:
- **LG TVs**: Use HDMI CEC protocol
- **Samsung TVs**: Use Samsung SmartThings API
- **Generic**: Use HDMI CEC or TV's native protocol

## Troubleshooting

### MongoDB Connection Error
- Verify your connection string in `.env.local`
- Check if MongoDB server is running
- Ensure IP address is whitelisted in MongoDB Atlas

### Admin Login Not Working
- Check if the setup script was completed successfully
- Verify the credentials you entered during setup
- Check browser console for error messages

### TV Control Not Working
- Ensure TV units have correct IP addresses configured
- Check network connectivity to TV units
- Implement actual control protocol (see TV Control Implementation above)

## Production Deployment

Before deploying to production:

1. Use environment variables securely
2. Implement HTTPS/SSL
3. Use bcrypt for password hashing (update from current SHA256)
4. Set up proper session management
5. Implement actual TV control protocol
6. Set up monitoring and logging
7. Configure CORS properly for cross-domain requests
8. Set up database backups

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the API endpoints documentation
3. Check MongoDB logs for database issues

## License

This project is proprietary. All rights reserved.
