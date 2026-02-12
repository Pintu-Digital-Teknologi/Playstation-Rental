# PlayStation Rental System - API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

All admin endpoints require a valid admin session (HTTP-only cookie).

## Endpoints

### Authentication

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}

Response:
{
  "success": true,
  "admin": {
    "id": "....",
    "username": "admin",
    "email": "admin@example.com"
  }
}
```

#### Logout
```
POST /auth/logout

Response:
{
  "success": true
}
```

---

### TV Management

#### List All TVs
```
GET /tv/list

Response:
{
  "tvs": [
    {
      "_id": "...",
      "name": "TV 1",
      "ipAddress": "192.168.1.10",
      "status": "available",
      "currentRental": null,
      "timerId": null,
      "lastChecked": "2026-01-26T10:00:00Z",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### Create TV (IP Management)
```
POST /tv/create
Content-Type: application/json

{
  "name": "TV 1",
  "ipAddress": "192.168.1.100"
}

Response:
{
  "success": true,
  "tv": {
    "_id": "...",
    "name": "TV 1",
    "ipAddress": "192.168.1.100",
    "status": "available",
    "lastChecked": "2026-01-26T10:00:00Z",
    "createdAt": "...",
    "updatedAt": "..."
  }
}

Error Responses:
- 400: "Name and IP address are required"
- 400: "Invalid IP address format"
- 400: "IP address already in use"
```

#### Update TV (IP Management)
```
PUT /tv/update
Content-Type: application/json

{
  "tvId": "...",
  "name": "TV 1 Updated",
  "ipAddress": "192.168.1.101"
}

Response:
{
  "success": true,
  "message": "TV updated successfully"
}

Error Responses:
- 400: "TV ID, name, and IP address are required"
- 400: "Invalid IP address format"
- 400: "IP address already in use by another TV"
- 404: "TV not found"
```

#### Delete TV (IP Management)
```
DELETE /tv/delete
Content-Type: application/json

{
  "tvId": "..."
}

Response:
{
  "success": true,
  "message": "TV deleted successfully"
}

Error Responses:
- 400: "Cannot delete TV with active rental"
- 404: "TV not found"
```

#### Control TV
```
POST /tv/control
Content-Type: application/json

{
  "tvId": "...",
  "action": "power-on" | "power-off" | "set-timer" | "extend-timer",
  "timerMinutes": 60  // for set-timer and extend-timer
}

Response:
{
  "success": true,
  "message": "TV powered on"
}
```

---

### Rental Management

#### Create Rental
```
POST /rental/create
Content-Type: application/json

{
  "tvId": "...",
  "customerName": "John Doe",
  "customerPhone": "08123456789",
  "customerEmail": "john@example.com",
  "durationMinutes": 60,
  "pricePerHour": 50000
}

Response:
{
  "success": true,
  "rental": {
    "id": "...",
    "publicAccessKey": "a1b2c3d4e5f6...",
    "totalPrice": 50000,
    "durationMinutes": 60
  }
}
```

#### List Rentals
```
GET /rental/list?status=active|completed|paused

Response:
{
  "rentals": [
    {
      "_id": "...",
      "customerName": "John Doe",
      "customerPhone": "08123456789",
      "status": "active",
      "durationMinutes": 60,
      "remainingMinutes": 45,
      "totalPrice": 50000,
      "startTime": "2026-01-26T10:00:00Z",
      "publicAccessKey": "...",
      "tv": {
        "_id": "...",
        "name": "TV 1"
      }
    }
  ]
}
```

#### End Rental
```
POST /rental/end
Content-Type: application/json

{
  "rentalId": "..."
}

Response:
{
  "success": true
}
```

---

### Payment Management

#### List Payments
```
GET /payment/list

Response:
{
  "payments": [
    {
      "_id": "...",
      "amount": 50000,
      "status": "pending",
      "dueDate": "2026-01-27T10:00:00Z",
      "paidDate": null,
      "notes": "",
      "rental": {
        "customerName": "John Doe",
        "customerPhone": "08123456789"
      },
      "tv": {
        "name": "TV 1"
      }
    }
  ]
}
```

#### Update Payment Status
```
POST /payment/update
Content-Type: application/json

{
  "paymentId": "...",
  "status": "pending|paid|overdue",
  "notes": "Payment received via transfer"
}

Response:
{
  "success": true
}
```

---

### Analytics

#### Get Revenue Analytics
```
GET /analytics/revenue?days=30

Response:
{
  "summary": {
    "totalRevenue": 1500000,
    "totalRentals": 10,
    "averageRevenuePerDay": 50000
  },
  "revenueByDate": [
    {
      "_id": "2026-01-26",
      "revenue": 50000,
      "count": 1
    }
  ],
  "tvUtilization": [
    {
      "tvId": "...",
      "tvName": "TV 1",
      "totalMinutes": 480,
      "rentalCount": 8,
      "revenue": 800000
    }
  ]
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **400 Bad Request**: Missing or invalid parameters
- **401 Unauthorized**: Not authenticated or session expired
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

---

## Customer Public API

### Get Rental Status (No Authentication Required)

```
GET /status/[accessKey]

Response: HTML page showing rental status with real-time countdown timer
```

---

## Rate Limiting

Currently no rate limiting is implemented. In production, implement rate limiting to prevent abuse.

---

## Pagination

Currently no pagination is implemented. All endpoints return all results. For large datasets, implement pagination.

---

## Webhooks

Currently no webhook system is implemented. Future implementations could include:
- Rental time warnings
- Payment due notifications
- TV offline alerts
