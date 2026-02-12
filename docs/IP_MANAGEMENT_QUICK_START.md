# IP Management - Quick Start Guide

## Access IP Management

1. Login to Admin Dashboard
2. Click **IP Management** in the sidebar menu
3. You'll see a list of all configured TVs

## Quick Tasks

### Add New TV ⚡
```
1. Click "Add New TV" button
2. Enter TV Name: "TV 1"
3. Enter IP Address: "192.168.1.100"
4. Click "Create TV"
```

### Edit TV ✏️
```
1. Find the TV in the table
2. Click "Edit" button
3. Modify name or IP address
4. Click "Update TV"
```

### Delete TV 🗑️
```
1. Find the TV in the table
2. Click "Delete" button
3. Confirm deletion
```

## IP Address Format

**Correct Format:** `192.168.1.100`
- Four numbers separated by dots
- Each number: 0-255

**Examples:**
- ✅ `192.168.0.50`
- ✅ `10.0.0.1`
- ✅ `172.16.0.1`
- ❌ `192.168.1` (incomplete)
- ❌ `192.168.1.256` (256 is too high)

## TV Status Meanings

| Status | Meaning |
|--------|---------|
| 🟢 Available | Not in use, ready for rental |
| 🔵 In-Use | Currently has active rental |
| 🔴 Offline | Not responding/not checked recently |

## Troubleshooting

### "IP address already in use"
→ Another TV has this IP. Use a different IP or delete that TV first.

### "Cannot delete TV with active rental"
→ A customer is currently using this TV. End the rental first.

### "Invalid IP address format"
→ Use format: XXX.XXX.XXX.XXX (e.g., 192.168.1.100)

## Common IP Ranges

For home/small business:
- **192.168.x.x** (most common)
  - Example: 192.168.1.100, 192.168.1.101

- **10.x.x.x** (also common)
  - Example: 10.0.0.1, 10.0.0.2

- **172.16.x.x** (less common)
  - Example: 172.16.0.1

## Tips

✨ **Best Practices:**
- Use descriptive names: "Front Room", "Lounge", "Bedroom"
- Write down which TV is at which physical location
- Ensure TVs have static IPs on your router before adding them
- Check TV status regularly in the dashboard

⚠️ **Don't:**
- Don't use the same IP for multiple TVs
- Don't reuse IPs from other devices on your network
- Don't try to delete a TV during a rental

## Next Steps

After setting up IPs:
1. Go to **TV Management** to see all TVs
2. Create a **Rental** to start using a TV
3. Check **Analytics** to see TV usage
4. Monitor **Notifications** for alerts

## Help & Support

For more detailed information, see:
- `/docs/IP_MANAGEMENT.md` - Complete guide
- `/docs/API.md` - API documentation
- `/README.md` - Full system overview
