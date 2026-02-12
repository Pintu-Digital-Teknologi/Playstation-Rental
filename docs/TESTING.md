# PlayStation Rental System - Testing Guide

## Pre-Testing Checklist

- [ ] MongoDB connection verified
- [ ] Admin account created via setup script
- [ ] Development server running (`npm run dev`)
- [ ] Browser console open (F12) to check for errors
- [ ] Test data (sample TVs) created

---

## 1. Authentication Testing

### Login Functionality
- [ ] Navigate to `/auth/login`
- [ ] Try with invalid username → Should show error
- [ ] Try with invalid password → Should show error
- [ ] Login with correct credentials → Should redirect to dashboard
- [ ] Check cookie is set (DevTools → Application → Cookies)

### Logout Functionality
- [ ] Click "Logout" button
- [ ] Should redirect to login page
- [ ] Try accessing `/admin/dashboard` → Should redirect to login
- [ ] Verify cookie is cleared

### Protected Routes
- [ ] Access `/admin/dashboard` without login → Should redirect to login
- [ ] Access `/admin/rentals` without login → Should redirect to login
- [ ] Access `/admin/payments` without login → Should redirect to login

---

## 2. TV Management Testing

### TV List Display
- [ ] All TVs from database are displayed
- [ ] Each TV shows name and IP address
- [ ] Status badges display correctly (Available, In Use, Offline)
- [ ] Current rental info shows when TV is in use
- [ ] List updates every 5 seconds automatically

### TV Status Indicators
- [ ] Available TV has green badge
- [ ] In-use TV has blue badge
- [ ] Offline TV has red badge
- [ ] Hovering over TV card shows subtle border change

### TV Cards Content
- [ ] Customer name displays for in-use TVs
- [ ] Remaining time displays for active rentals
- [ ] "No active rental" message for available TVs
- [ ] Buttons show correct state (Rent button available, Control button available)

---

## 3. Rental Creation Testing

### Create Rental Dialog
- [ ] Click "Rent" button on available TV
- [ ] Dialog opens with form
- [ ] All required fields are marked

### Form Validation
- [ ] Leave customer name empty → Error message
- [ ] Leave phone number empty → Error message
- [ ] Enter invalid duration (0 or negative) → Error message
- [ ] Try submitting with missing fields → Prevent submission

### Successful Rental Creation
- [ ] Fill all required fields with valid data
- [ ] Auto-calculated price displays correctly
- [ ] Click "Create Rental" → Shows loading state
- [ ] Success message with access key displays
- [ ] TV card updates to "In Use" status
- [ ] Remaining time countdown shows on TV card

### Access Key
- [ ] Access key is unique and non-empty
- [ ] Format is hexadecimal string
- [ ] Can be used to access customer view

---

## 4. TV Control Testing

### Control Dialog
- [ ] Click "Control" on a TV card
- [ ] Dialog opens with control options
- [ ] Timer input shows default value (60 minutes)
- [ ] Can modify timer value

### Power Controls
- [ ] Click "Power On" → Button shows loading → Success message
- [ ] Click "Power Off" → Button shows loading → Success message
- [ ] Disable check: Control button disabled for offline TVs

### Timer Controls
- [ ] Set Timer: Enter minutes → Click "Set Timer" → Success message
- [ ] Extend Timer: Enter minutes → Click "Extend Timer" → Success message
- [ ] Invalid input (0 or negative) → Error message
- [ ] Very large input (e.g., 9999) → Should work or show validation

### Feedback
- [ ] Each action shows appropriate success message
- [ ] Dialog updates are visible
- [ ] TV card updates reflect changes

---

## 5. Rental Management Testing

### Rentals Page Display
- [ ] Navigate to `/admin/rentals`
- [ ] Page title and description display
- [ ] Tab selector for status filters (Active, Completed, Paused)

### Active Rentals Tab
- [ ] Shows all active rentals
- [ ] Displays customer name
- [ ] Shows TV name
- [ ] Shows phone number
- [ ] Shows remaining time in proper format (h/m/s)
- [ ] Shows total price
- [ ] Shows start time in locale format

### Completed Rentals Tab
- [ ] Click "Completed" tab
- [ ] Shows only completed rentals
- [ ] Badge shows "Completed" status
- [ ] Rental info preserved

### Paused Rentals Tab
- [ ] Click "Paused" tab
- [ ] Shows paused rentals if any
- [ ] Badge shows "Paused" status

### Table Functionality
- [ ] Horizontal scroll on mobile
- [ ] Table responsive on different screen sizes
- [ ] Data updates when new rental created

---

## 6. Payment Management Testing

### Payments Page Display
- [ ] Navigate to `/admin/payments`
- [ ] Page title and description display
- [ ] All payments display in table

### Payment Information
- [ ] Customer name displays
- [ ] TV name displays
- [ ] Amount displays with currency
- [ ] Status badge shows (Pending, Paid, Overdue)
- [ ] Due date displays
- [ ] Action buttons present

### Update Payment
- [ ] Click "Update" on any payment
- [ ] Dialog opens with amount and notes field
- [ ] Can enter notes
- [ ] Three status buttons available (Pending, Paid, Overdue)
- [ ] Clicking status updates record → Success
- [ ] Dialog closes after update
- [ ] Table refreshes to show new status

### Status Icons
- [ ] Pending payments show clock icon
- [ ] Paid payments show check icon
- [ ] Overdue payments show alert icon

---

## 7. Analytics Testing

### Analytics Page Display
- [ ] Navigate to `/admin/analytics`
- [ ] Page loads with data
- [ ] Date range selector visible
- [ ] Three summary cards display (Revenue, Rentals, Average)

### Summary Cards
- [ ] Total Revenue shows correct amount
- [ ] Daily average calculates correctly
- [ ] Total Rentals count is accurate
- [ ] Amounts format with thousand separator

### Revenue Chart
- [ ] Line chart displays with data
- [ ] X-axis shows dates
- [ ] Y-axis shows revenue
- [ ] Tooltip shows on hover
- [ ] Legend displays "Revenue"

### TV Utilization Chart
- [ ] Bar chart displays TVs
- [ ] Each TV has two bars (usage and revenue)
- [ ] Colors are distinct and readable
- [ ] Tooltip shows values on hover

### Date Range Selection
- [ ] Change to "Last 7 days" → Chart updates
- [ ] Change to "Last 30 days" → Chart updates
- [ ] Change to "Last 90 days" → Chart updates
- [ ] Data recalculates correctly

### Detailed TV Stats
- [ ] Each TV shows in individual card
- [ ] Revenue displays for each TV
- [ ] Usage hours calculate correctly
- [ ] Rental count is accurate

---

## 8. Customer View Testing

### Access via Status Link
- [ ] Create a rental and get access key
- [ ] Visit `/status/[accessKey]` in different browser/incognito
- [ ] Page loads without requiring login
- [ ] Page displays correctly with data

### Customer Status Display
- [ ] TV name displays
- [ ] Customer name displays
- [ ] Status badge shows
- [ ] Rental details show correctly

### Real-time Timer
- [ ] Timer countdown works (updates every second)
- [ ] Format is correct (h:m:s)
- [ ] Progress bar updates in real-time
- [ ] Percentage updates correctly
- [ ] Timer reaches zero gracefully
- [ ] Page shows "Time is up!" when expired

### Responsive Design
- [ ] Mobile view: Single column, readable
- [ ] Tablet view: Proper spacing
- [ ] Desktop view: Proper width constraint
- [ ] All text readable at different sizes

### Access Control
- [ ] Non-existent access key → 404 page
- [ ] Random string → 404 page
- [ ] Expired key → Should show expired message (if implemented)

---

## 9. Notifications Testing

### Notification Bell Icon
- [ ] Bell icon displays in admin header
- [ ] Desktop: Top-right of sidebar
- [ ] Mobile: Top-right of header
- [ ] Badge shows unread count when > 0

### Notification Popover
- [ ] Click bell icon → Popover opens
- [ ] Lists all notifications
- [ ] Old notifications first? / Recent first?
- [ ] Unread notifications have dot indicator
- [ ] Click notification → Marks as read and dot disappears

### Notification Types
- [ ] Time warning notifications show clock icon
- [ ] Time up notifications show alert icon
- [ ] Payment notifications show dollar icon
- [ ] System notifications show bell icon

### Mark as Read
- [ ] Click individual notification → Marks as read
- [ ] Click "Mark all as read" → All marked
- [ ] Unread count updates correctly
- [ ] Badge disappears when all read

---

## 10. Responsive Design Testing

### Mobile (320px - 640px)
- [ ] Hamburger menu works
- [ ] Navigation drawer slides in from left
- [ ] Content stacks vertically
- [ ] Buttons are tap-friendly (44px minimum)
- [ ] Tables scroll horizontally
- [ ] Forms are easy to fill

### Tablet (640px - 1024px)
- [ ] Sidebar visible with mobile drawer still available
- [ ] Grid layouts use 2 columns
- [ ] Charts resize appropriately
- [ ] Content readable without horizontal scroll

### Desktop (1024px+)
- [ ] Sidebar always visible (left side)
- [ ] Main content takes remaining space
- [ ] Grid layouts use 3+ columns
- [ ] Charts full width
- [ ] Tables display without scroll where possible

---

## 11. Browser Compatibility Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## 12. Performance Testing

### Page Load Time
- [ ] Dashboard loads in < 2 seconds
- [ ] Rentals page loads in < 2 seconds
- [ ] Analytics page loads in < 3 seconds (with charts)
- [ ] Customer view loads instantly

### Real-time Updates
- [ ] TV status updates every 5 seconds
- [ ] Timer on customer view updates every 1 second
- [ ] Notifications update every 30 seconds
- [ ] No performance degradation over time

### Data Handling
- [ ] 100 rentals display smoothly
- [ ] 50 payments display smoothly
- [ ] Charts render without lag
- [ ] Filters work quickly

---

## 13. Error Handling Testing

### Network Errors
- [ ] Offline mode → Shows error messages
- [ ] Server down → Shows appropriate error
- [ ] Timeout → Shows timeout error
- [ ] Retry button works

### Form Errors
- [ ] Invalid input → Validation message
- [ ] Server error on submit → Error displays
- [ ] Database error → Graceful error message

### 404 Errors
- [ ] Invalid URL → 404 page
- [ ] Expired access key → 404 page
- [ ] Non-existent rental → 404 page

---

## 14. Data Integrity Testing

### Create Operation
- [ ] New rental saved to database
- [ ] Payment automatically created
- [ ] TV status updates
- [ ] Session starts correctly

### Read Operation
- [ ] Database data matches display
- [ ] No duplicate data shown
- [ ] Filters work correctly
- [ ] Sorting works correctly

### Update Operation
- [ ] Payment status updates save correctly
- [ ] TV state changes persist
- [ ] No stale data displayed after update
- [ ] Confirmations match actual changes

### Delete/End Operation
- [ ] Rental can be ended/completed
- [ ] TV becomes available again
- [ ] Historical data preserved

---

## 15. Security Testing

### Session Security
- [ ] Session expires after 30 days
- [ ] Logout clears session
- [ ] Cookie is HTTP-only
- [ ] Invalid session redirects to login

### Input Validation
- [ ] SQL injection attempt → Fails safely
- [ ] XSS attempt → Sanitized
- [ ] CSRF protection (verify same-site cookies)

### Authentication
- [ ] Cannot access admin pages without login
- [ ] Cannot use admin endpoints without session
- [ ] Password complexity requirements (if any)

### Data Privacy
- [ ] Customer phone not exposed publicly
- [ ] Payment info not visible in customer view
- [ ] Access keys not predictable
- [ ] No data leakage in error messages

---

## Test Data Creation

### Sample Rentals
```javascript
// Create 5 active rentals with different customers
// Use different durations and prices
// Verify analytics calculations
```

### Sample Payments
```javascript
// 3 paid
// 2 pending
// 1 overdue
// Verify payment totals in analytics
```

---

## Regression Testing

After any code changes, verify:
- [ ] Login still works
- [ ] Dashboard loads correctly
- [ ] TV management functional
- [ ] Rentals display correctly
- [ ] Payments update correctly
- [ ] Analytics calculate correctly
- [ ] Customer view works
- [ ] Notifications functional
- [ ] No console errors
- [ ] No performance regression

---

## Sign-off Checklist

- [ ] All tests passed
- [ ] No console errors
- [ ] All features working
- [ ] Mobile responsive
- [ ] Performance acceptable
- [ ] Data integrity verified
- [ ] Security checks passed
- [ ] Ready for deployment

---

## Testing Notes

Document any issues found:
- Issue description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/device tested
- Screenshot/logs if applicable

---

**Last Updated**: January 2026  
**Version**: 1.0
