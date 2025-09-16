# Woodpecker API App Testing Guide

## Manual Testing Checklist

### 1. App Launch and Display
- [ ] App launches without errors
- [ ] Main window displays correctly (not blank)
- [ ] App title shows "Woodpecker API"
- [ ] Window is properly sized (1200x800)
- [ ] Menu bar is visible and functional

### 2. Navigation and Layout
- [ ] Sidebar navigation is visible
- [ ] Can navigate between different sections (Leads, Import, etc.)
- [ ] Layout is responsive and properly styled
- [ ] Dark theme is applied correctly

### 3. Core Features to Test

#### Database Functionality
- [ ] App connects to SQLite database successfully
- [ ] Can view existing leads (if any)
- [ ] Database operations don't throw errors

#### Import Functionality
- [ ] Can access the Import page
- [ ] File upload interface is functional
- [ ] CSV import validation works

#### Leads Management
- [ ] Can view leads list
- [ ] Leads table displays correctly
- [ ] Filtering and search work

#### IPC Communication
- [ ] Frontend can communicate with backend
- [ ] API calls to main process work
- [ ] Error handling is functional

### 4. Performance and Stability
- [ ] App doesn't crash during normal use
- [ ] Memory usage is reasonable
- [ ] UI is responsive to user interactions

### 5. Integration Features
- [ ] Claude API integration is accessible
- [ ] Woodpecker API integration is accessible
- [ ] Settings and configuration work

## How to Test

1. **Launch the app** from the release folder
2. **Check the main window** - it should display the Woodpecker API interface, not a blank screen
3. **Navigate through the app** using the sidebar menu
4. **Try basic operations** like viewing leads or accessing import
5. **Check for any console errors** (if accessible)

## Expected Behavior

The app should:
- Display a dark-themed interface with sidebar navigation
- Show the Leads page by default
- Allow navigation between Import, Leads, and other sections
- Connect to the database successfully
- Not show any blank screens or loading states indefinitely

## Troubleshooting

If the app shows a blank screen:
- Check if the frontend assets are loading correctly
- Verify the main process is finding the correct index.html path
- Check for any JavaScript errors in the renderer process
