# PlayStation Rental System - Quick Start Guide

## 5-Minute Setup

### Step 1: Install & Configure (2 min)
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your MongoDB connection
```

### Step 2: Initialize Database (2 min)
```bash
# Run setup script
npx ts-node scripts/setup-db.ts

# Follow prompts to create admin account
```

### Step 3: Start Server (1 min)
```bash
npm run dev
# Visit http://localhost:3000
```

---

## Day 1: Basic Operations

### 1. Login to Admin Dashboard
- Go to http://localhost:3000/auth/login
- Enter credentials created during setup
- You'll see the TV Management dashboard

### 2. Create Your First Rental

**Step 1**: On the Dashboard, find an "Available" TV
- Click the **"Rent"** button

**Step 2**: Fill in customer details
- Customer Name: e.g., "John Doe"
- Phone: e.g., "08123456789"
- Duration: e.g., "60" minutes
- Price/Hour: Confirm default price

**Step 3**: Create and note the access key
- The system will show a unique access key
- Share this with your customer
- Example: `http://localhost:3000/status/abc123xyz`

### 3. Send Customer Their Status Link

Share this URL with your customer:
```
http://localhost:3000/status/[ACCESS_KEY_HERE]
```

They can open it anytime to see:
- Remaining time (updates in real-time)
- Their rental details
- Total price

### 4. Control the TV

On the Dashboard:
1. Click **"Control"** on the TV card
2. Options available:
   - **Power On** - Turn on the TV
   - **Power Off** - Turn off the TV
   - **Set Timer** - Set rental time (e.g., 60 minutes)
   - **Extend Timer** - Add more time (e.g., +30 minutes)

### 5. End the Rental

When time is up:
1. Go to **Rentals** page
2. Find the customer's rental
3. Click **"Complete"** (or manually end via API)
4. TV automatically becomes "Available"

### 6. Track Payment

Go to **Payments** page:
1. Find the customer's payment record
2. Click **"Update"**
3. Change status:
   - **Pending** - Not paid yet
   - **Paid** - Payment received
   - **Overdue** - Payment past due date
4. Add notes if needed (e.g., "Paid via transfer")

---

## Daily Workflow

### Morning
- Check Dashboard for any offline TVs
- Review Notifications for alerts

### During Operations
- Monitor Rentals page for active sessions
- Control TVs as needed
- Track new payments as they come in

### Evening
- Check Analytics for daily revenue
- Review Payment tracking
- Prepare for next day

---

## Weekly Tasks

### Every Week
1. **Review Analytics**
   - Go to Analytics page
   - Check revenue trends
   - Identify peak usage times

2. **Check TV Utilization**
   - See which TVs earn most
   - Plan maintenance accordingly

3. **Follow Up on Overdue Payments**
   - Go to Payments page
   - Filter "Overdue" payments
   - Contact customers

---

## Customer View Example

When a customer opens their status link:

```
[Cyan Border Card]

⏱️ Time Remaining
   1h 23m 45s

[Progress Bar: ████████░░░░░]
[Progress: 65%]

Original Duration: 2 hours
Total Price: Rp 100,000
TV: TV 1
Status: In Progress

Customer: John Doe
Start Time: Jan 26, 10:00 AM
```

The timer updates every second automatically.

---

## Common Tasks

### How to Give Customer Extra Time?
1. Click "Control" on TV card
2. Enter minutes to add (e.g., "30")
3. Click "Extend Timer"
4. Done! Timer will add 30 minutes

### How to Change Customer Payment Status?
1. Go to "Payments" page
2. Find customer in list
3. Click "Update"
4. Select new status (Paid, Pending, Overdue)
5. Add notes if needed
6. Confirm

### How to See Revenue for This Month?
1. Go to "Analytics" page
2. Select "Last 30 days" from dropdown
3. View revenue chart and totals

### How to See Which TV Is Most Popular?
1. Go to "Analytics" page
2. Scroll to "TV Utilization" chart
3. Compare bars for each TV
4. See usage hours and revenue per TV

### How to Check Active Rentals Right Now?
1. Go to "Rentals" page
2. Click "Active" tab
3. See all ongoing rentals

---

## Pricing Guide

Rental pricing is flexible and set when creating each rental.

### Default Price
- **Rp 50,000 per hour**

### Example Calculations
| Duration | Price/Hour | Total |
|----------|-----------|-------|
| 1 hour | Rp 50,000 | Rp 50,000 |
| 2 hours | Rp 50,000 | Rp 100,000 |
| 30 min | Rp 50,000 | Rp 25,000 |
| 3 hours | Rp 75,000 | Rp 225,000 |

You can change the price per rental if offering discounts or premium pricing.

---

## Notifications

The system automatically shows alerts for:
- ⏰ **5-min Warning**: Rental time about to end
- 🔴 **Time Up**: Rental time expired
- 💰 **Payment Due**: Payment deadline approaching
- ⚠️ **System**: Important system messages

Click the **Bell icon** to view all notifications.

---

## Mobile Access

The dashboard works on mobile browsers:
- Phone: Hamburger menu for navigation
- Tablet: Same as desktop
- Responsive design adapts automatically

---

## Need Help?

1. **Check Documentation**
   - Setup Guide: `docs/SETUP.md`
   - API Details: `docs/API.md`
   - Features: `docs/FEATURES.md`

2. **Common Issues**
   - Can't login? Run setup script again
   - TV control not working? Check TV IP address
   - See error? Check browser console (F12)

3. **Contact Support**
   - Review logs for error messages
   - Check MongoDB connection
   - Verify environment variables

---

## Next Steps

1. **Customize Pricing**
   - Adjust price per hour for your market

2. **Configure TV IPs**
   - Update TV IP addresses for actual control
   - Implement TV control protocol

3. **Set Up Payment Process**
   - Decide payment collection method
   - Train staff on payment tracking

4. **Plan Analytics**
   - Review daily revenue reports
   - Track peak usage hours
   - Optimize TV distribution

---

## Pro Tips

✅ **Do**
- Share status links digitally (WhatsApp, SMS)
- Update payment status immediately when received
- Check analytics weekly for insights
- Keep customer contact info accurate

❌ **Don't**
- Forget to end rental after customer leaves
- Leave payment as "pending" indefinitely
- Ignore offline TV alerts
- Share admin credentials

---

**That's it! You're ready to manage your PlayStation rental business.** 🎮

For detailed information, see the full documentation in the `docs/` folder.
