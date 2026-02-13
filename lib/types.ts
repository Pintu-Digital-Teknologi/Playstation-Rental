import { ObjectId } from "mongodb";

export interface MenuItem {
  _id?: ObjectId;
  name: string;
  category: "food" | "drink" | "snack" | "other";
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Admin User (now with roles)
export interface Admin {
  _id?: ObjectId;
  username: string;
  email: string;
  passwordHash: string; // stored as 'password' in DB but let's keep type consistent if possible, though register route uses 'password'
  fullName?: string;
  role: "admin" | "operator";
  createdAt: Date;
  updatedAt: Date;
}

// Shift Management
export interface Shift {
  _id?: ObjectId;
  operatorId: ObjectId;
  operatorName: string;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed";

  // Financial Summary
  totalTransactions: number; // Count of payment transactions
  totalRevenue: number; // Sum of payments received

  // Details
  transactions: {
    paymentId: ObjectId;
    amount: number;
    description: string; // e.g., "Rental TV 1"
    timestamp: Date;
  }[];

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// TV Unit
export interface TVUnit {
  _id?: ObjectId;
  name: string; // e.g., "TV 1", "TV 2"
  ipAddress: string; // Static IP for TV control
  macAddress?: string; // MAC Address for Wake-on-LAN
  description?: string; // Description of TV/unit
  pricePerHour?: number; // Price per hour in Indonesian Rupiah
  status: "available" | "in-use" | "offline" | "maintenance";
  isOnline: boolean; // TV power status (true = powered on, false = powered off)
  isReachable?: boolean; // Network reachable status (true = pingable, false = not pingable)
  currentRentalId?: ObjectId;
  timerId?: number; // remaining time in milliseconds
  lastChecked: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Rental Session
export interface Rental {
  _id?: ObjectId;
  tvId: ObjectId;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startTime: Date;
  endTime?: Date;
  durationMs: number; // Initial duration in milliseconds
  remainingMs: number; // Real-time remaining in milliseconds

  // Cost Separation
  rentalCost: number; // Biaya murni rental
  addOnsCost: number; // Total biaya makanan/minuman
  grandTotal: number; // rentalCost + addOnsCost
  totalPrice: number; // Deprecated or alias for grandTotal (kept for temporary compatibility if needed, but aim to use grandTotal)

  // Add-ons Data
  addOns?: {
    menuItemId: ObjectId;
    name: string;
    price: number;
    quantity: number;
    total: number;
    addedAt: Date;
  }[];

  type: "hourly" | "regular"; // Rental type
  status: "active" | "completed" | "paused";
  pausedAt?: Date | null; // Timestamp when rental was paused
  accumulatedDuration?: number; // Duration (in ms) accumulated before pause (for regular rentals) or preserved remaining (for hourly)
  publicAccessKey: string; // Unique key for customer to view status
  shiftId?: ObjectId; // Link to shift
  createdAt: Date;
  updatedAt: Date;
}

// Payment
export interface Payment {
  _id?: ObjectId;
  rentalId: ObjectId;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paymentMethod: "cash" | "qris" | "transfer";
  shiftId?: ObjectId; // Link to shift
  dueDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification
export interface Notification {
  _id?: ObjectId;
  rentalId: ObjectId;
  tvId: ObjectId;
  type: "time-warning" | "time-up" | "payment-due" | "system";
  message: string;
  read: boolean;
  createdAt: Date;
}

// Session
export interface Session {
  _id?: ObjectId;
  adminId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Daily Analytics
export interface DailyAnalytics {
  _id?: ObjectId;
  date: Date;
  totalRevenue: number;
  totalRentals: number;
  tvUtilization: {
    tvId: ObjectId;
    tvName: string;
    usageMs: number;
    rentalCount: number;
  }[];
  createdAt: Date;
}

// License / API Key
export interface License {
  _id?: ObjectId;
  key: string;
  name: string;
  status: "active" | "revoked";
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
}
