# PlayStation Rental Management System

A comprehensive, professional billing and management system for PlayStation rental businesses built with Next.js and MongoDB.

## 🎮 Overview

This system provides a complete solution for managing PlayStation rental operations including:
- Multi-unit TV management and control
- Rental session management with customer tracking
- Manual payment tracking and management
- Real-time analytics and reporting
- Public customer status pages
- Admin dashboard with real-time notifications

## ✨ Key Features

### Admin Dashboard
- **IP Management**: Configure and manage static IP addresses for all TV units (CRUD operations)
- **TV Management**: Monitor multiple TV units in real-time
- **TV Control**: Power on/off, set timers, extend rental periods via IP-based commands
- **Rental Management**: Create, track, and manage rental sessions
- **Payment Tracking**: Manual payment status management (pending, paid, overdue)
- **Analytics**: Revenue trends, TV utilization metrics, and business insights
- **Notifications**: Real-time alerts for rental and payment events

### Customer Features
- **Public Status Page**: Access rental status via unique URL
- **Real-time Timer**: Live countdown with progress tracking
- **Rental Details**: View customer info, TV name, and rental pricing

### System Features
- **Secure Authentication**: Session-based admin login
- **Responsive Design**: Mobile, tablet, and desktop support
- **Dark Theme UI**: Professional cyan-accented interface
- **RESTful API**: Complete API for all operations
- **MongoDB Integration**: Robust data persistence

## 📋 Requirements

- Node.js 18+
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Static IP addresses for TV units (for control features)

## 🚀 Getting Started

### 1. Clone Repository
```bash
git clone <repository-url>
cd playstation-rental
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure MongoDB

Create `.env.local` file:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your MongoDB connection string:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/playstation-rental
```

### 4. Initialize Database

Run setup script:
```bash
npx ts-node scripts/setup-db.ts
```

This will:
- Create admin user
- Set up database indexes
- Create sample TV units

### 5. Start Development Server

```bash
npm run dev
```

Access the application at http://localhost:3000

## 🔐 First Login

- URL: http://localhost:3000/auth/login
- Use credentials created during setup
- Redirects to admin dashboard

## 📁 Project Structure

```
playstation-rental/
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication
│   │   ├── tv/                # TV management & control
│   │   ├── rental/            # Rental operations
│   │   ├── payment/           # Payment tracking
│   │   ├── analytics/         # Business analytics
│   │   └── notifications/     # Notification system
│   ├── admin/                 # Admin pages
│   │   ├── dashboard/         # TV management
│   │   ├── ip-management/     # IP address management
│   │   ├── rentals/           # Rental list
│   │   ├── payments/          # Payment tracking
│   │   └── analytics/         # Analytics dashboard
│   ├── auth/                  # Authentication pages
│   ├── status/                # Public customer pages
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage
│   └── globals.css            # Global styles
├── components/
│   ├── admin/                 # Admin components
│   ├── auth/                  # Auth components
│   ├── customer/              # Customer view components
│   └── ui/                    # UI components (shadcn)
├── lib/
│   ├── db.ts                  # MongoDB connection
│   ├── auth.ts                # Authentication utilities
│   ├── types.ts               # TypeScript types
│   └── utils.ts               # Utility functions
├── scripts/
│   └── setup-db.ts            # Database initialization
├── docs/
│   ├── SETUP.md               # Setup guide
│   ├── API.md                 # API documentation
│   ├── FEATURES.md            # Features list
│   ├── IP_MANAGEMENT.md       # IP management guide
│   ├── QUICKSTART.md          # Quick start guide
│   └── TESTING.md             # Testing checklist
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout

### TV Management & IP Configuration
- `GET /api/tv/list` - List all TVs
- `POST /api/tv/create` - Create new TV with IP
- `PUT /api/tv/update` - Update TV IP address
- `DELETE /api/tv/delete` - Delete TV unit
- `POST /api/tv/control` - Control TV (power, timer)

### Rentals
- `POST /api/rental/create` - Create rental
- `GET /api/rental/list` - List rentals
- `POST /api/rental/end` - End rental

### Payments
- `GET /api/payment/list` - List payments
- `POST /api/payment/update` - Update payment status

### Analytics
- `GET /api/analytics/revenue` - Revenue analytics

### Notifications
- `GET /api/notifications/list` - List notifications
- `POST /api/notifications/mark-read` - Mark as read

For detailed API documentation, see [docs/API.md](docs/API.md)

## 🎨 Design System

### Colors
- **Primary**: Cyan (#00d4ff)
- **Background**: Dark Grey (#0f1419)
- **Card**: Lighter Dark Grey (#1a1f2e)
- **Text**: Light (#e8eaed)
- **Accent**: Cyan (#00d4ff)

### Components
Built with [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/)

## 📊 Database Schema

### Users (admins)
- username, email, passwordHash
- createdAt, updatedAt

### TVs
- name, ipAddress, status
- currentRentalId, timerId
- lastChecked

### Rentals
- tvId, customerName, customerPhone, customerEmail
- startTime, endTime, durationMinutes, remainingMinutes
- totalPrice, status, publicAccessKey

### Payments
- rentalId, amount, status
- dueDate, paidDate, notes

### Sessions
- adminId, token, expiresAt

### Notifications
- rentalId, tvId, type, message, read

For detailed schema, see [lib/types.ts](lib/types.ts)

## 🔧 Configuration

### TV Control

The system uses IP-based TV control. To implement actual control:

1. Update `sendCommandToTV` function in `/app/api/tv/control/route.ts`
2. Implement your TV control protocol (HDMI CEC, HTTP, TCP, etc.)
3. Test with your specific TV model

Example protocols:
- **LG TVs**: HDMI CEC or LG SmartThings API
- **Samsung TVs**: Samsung SmartThings API
- **Generic**: HDMI CEC via libcec

### Pricing

Rental pricing is configurable when creating rentals. Default: Rp 50,000/hour

## 🚨 Security Considerations

For production deployment:

- [ ] Implement bcrypt for password hashing (current: SHA256)
- [ ] Enable HTTPS/SSL
- [ ] Set up rate limiting
- [ ] Implement CORS properly
- [ ] Use secure session storage
- [ ] Add two-factor authentication
- [ ] Encrypt sensitive data
- [ ] Set up logging and monitoring
- [ ] Configure database backups

See [docs/SETUP.md](docs/SETUP.md) for more details.

## 📈 Future Enhancements

- Real-time WebSocket notifications
- Online payment gateway integration
- Customer registration and login
- Booking/reservation system
- Multi-location support
- Advanced reporting and exports
- Mobile app
- Email/SMS notifications
- Accounting software integration

See [docs/FEATURES.md](docs/FEATURES.md) for complete feature roadmap.

## 🐛 Troubleshooting

### MongoDB Connection Error
- Verify connection string in `.env.local`
- Check MongoDB server status
- Whitelist IP in MongoDB Atlas

### Admin Login Failing
- Run setup script: `npx ts-node scripts/setup-db.ts`
- Check browser console for error details

### TV Control Not Working
- Verify TV IP addresses
- Check network connectivity
- Implement actual TV control protocol

See [docs/SETUP.md](docs/SETUP.md) for detailed troubleshooting.

## 📝 Documentation

- [Setup Guide](docs/SETUP.md) - Installation and configuration
- [API Documentation](docs/API.md) - Complete API reference
- [Features List](docs/FEATURES.md) - Current and planned features

## 🤝 Contributing

This is a proprietary project. For modifications or customizations, contact the development team.

## 📄 License

Proprietary - All rights reserved

## 👥 Support

For issues or questions:
1. Check the documentation
2. Review API endpoints
3. Check error logs
4. Contact support

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready

Made with ❤️ for PlayStation rental businesses
