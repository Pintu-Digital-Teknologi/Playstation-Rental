# IP Management Guide

## Overview

The IP Management system allows administrators to configure and control multiple PlayStation TV units using their static IP addresses. Each TV unit can be created, updated, or deleted through the admin dashboard.

## Features

### 1. Create New TV Unit
- Add a new TV unit with a name and static IP address
- Automatic validation of IP address format
- Duplicate IP prevention (each IP must be unique)

### 2. View All TV Units
- Display list of all configured TV units
- See current status (available, in-use, offline)
- Monitor last check timestamp

### 3. Edit TV Unit
- Update TV name and IP address
- Prevents duplicate IP addresses
- Changes reflected across the system immediately

### 4. Delete TV Unit
- Remove TV units that are no longer in use
- Safety check: prevents deletion if TV has active rentals
- Confirmation dialog to prevent accidental deletion

## How to Use

### Adding a New TV

1. Navigate to **Admin Dashboard** → **IP Management**
2. Click the **"Add New TV"** button
3. Fill in the following information:
   - **TV Name**: A descriptive name (e.g., "TV 1", "PlayStation Console A")
   - **Static IP Address**: The IP address of the TV (e.g., 192.168.1.100)
4. Click **"Create TV"**

**Note:** Ensure the TV is already configured with the static IP on your network before adding it to the system.

### Editing a TV

1. In the IP Management table, find the TV you want to edit
2. Click the **"Edit"** button
3. Update the name or IP address as needed
4. Click **"Update TV"**

### Deleting a TV

1. In the IP Management table, find the TV you want to delete
2. Click the **"Delete"** button
3. Confirm the deletion in the dialog
4. The TV will be removed from the system

**Important:** You cannot delete a TV if it has an active rental. Complete or cancel any active rentals first.

## IP Address Validation

The system performs the following IP address validation:

- **Format**: Must follow standard IPv4 format (xxx.xxx.xxx.xxx)
- **Octets**: Each octet must be between 0 and 255
- **Uniqueness**: Each IP address must be unique across all TV units

### Valid IP Examples
- 192.168.1.100
- 192.168.0.50
- 10.0.0.1
- 172.16.0.1

### Invalid IP Examples
- 192.168.1 (missing octets)
- 192.168.1.256 (octet exceeds 255)
- 192.168.1.1.1 (too many octets)
- abc.def.ghi.jkl (not numeric)

## TV Status Meanings

- **Available**: TV is not currently in use and is ready for rental
- **In-Use**: TV currently has an active rental session
- **Offline**: TV has not been checked recently or is not responding

## API Endpoints

### Create TV
```
POST /api/tv/create
Content-Type: application/json

{
  "name": "TV 1",
  "ipAddress": "192.168.1.100"
}
```

### List TVs
```
GET /api/tv/list
```

### Update TV
```
PUT /api/tv/update
Content-Type: application/json

{
  "tvId": "67abc123def456",
  "name": "TV 1",
  "ipAddress": "192.168.1.101"
}
```

### Delete TV
```
DELETE /api/tv/delete
Content-Type: application/json

{
  "tvId": "67abc123def456"
}
```

## Troubleshooting

### "IP address already in use"
- Another TV unit is already configured with this IP address
- Change the IP to a different one or delete the existing TV first

### "Cannot delete TV with active rental"
- The TV has a rental session in progress
- Complete or cancel the rental in the Rentals section first

### "Invalid IP address format"
- The IP address doesn't match the required format
- Use the format: XXX.XXX.XXX.XXX (e.g., 192.168.1.100)

## Best Practices

1. **Static IP Configuration**: Always configure your TVs with static IPs on your network router before adding them to the system
2. **Naming Convention**: Use clear, descriptive names (e.g., "Front Room TV", "Lounge Console")
3. **Network Documentation**: Keep a record of which IP addresses correspond to which physical TV locations
4. **Regular Checks**: Monitor the status of your TVs regularly to ensure they're online and responsive
5. **Before Deletion**: Ensure all rentals are completed before deleting a TV unit

## Integration with Other Features

- **TV Management Dashboard**: Shows real-time status of all configured TVs
- **TV Control**: Uses IP addresses to send control commands (power, timer, etc.)
- **Rental Creation**: Automatically selects from available TVs when creating new rentals
- **Customer Status**: Customers view TV status through rental-specific links

## Security Notes

- Only administrators with valid login can access IP Management
- IP addresses are stored in the database and used for internal control only
- All IP-based commands require proper authentication
