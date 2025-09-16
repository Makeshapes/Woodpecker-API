# Woodpecker API - Installation Guide

## System Requirements

### macOS
- **Operating System**: macOS 10.14 (Mojave) or later
- **Architecture**: Intel x64 or Apple Silicon (M1/M2/M3)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 500MB free disk space

## Installation Instructions

### Method 1: DMG Installer (Recommended)

1. **Download the DMG file**
   - Download `Woodpecker API-1.0.0-universal.dmg` from the release package

2. **Open the DMG file**
   - Double-click the downloaded DMG file
   - The installer window will open showing the Woodpecker API app and Applications folder

3. **Install the application**
   - Drag the "Woodpecker API" app icon to the "Applications" folder
   - Wait for the copy process to complete

4. **Launch the application**
   - Open Finder and navigate to Applications
   - Double-click "Woodpecker API" to launch
   - On first launch, you may see a security dialog (see Troubleshooting below)

5. **Eject the DMG**
   - After installation, eject the DMG by dragging it to the Trash or right-clicking and selecting "Eject"

### Method 2: Direct App Bundle

If you have the raw app bundle:
1. Copy `Woodpecker API.app` to your Applications folder
2. Launch from Applications folder

## First Launch Setup

1. **Security Permissions**
   - The app may request permissions for file access
   - Grant permissions as needed for CSV import functionality

2. **API Configuration**
   - Configure your Claude API key in Settings
   - Configure your Woodpecker API key in Settings
   - Test connections to ensure proper setup

## Troubleshooting

### Security Warnings

**"Woodpecker API" cannot be opened because it is from an unidentified developer**

1. Right-click on the app in Applications
2. Select "Open" from the context menu
3. Click "Open" in the security dialog
4. The app will launch and be trusted for future use

**Alternative method:**
1. Open System Preferences > Security & Privacy
2. Click "Open Anyway" next to the blocked app message

### Performance Issues

**Slow startup or performance**
- Ensure you have sufficient free disk space (500MB+)
- Close other memory-intensive applications
- Restart the application if it becomes unresponsive

### Database Issues

**Data not persisting between sessions**
- Check that the app has write permissions to its data directory
- Ensure sufficient disk space for the SQLite database

### API Connection Issues

**Claude API not working**
- Verify your API key is correctly entered
- Check your internet connection
- Ensure your API key has sufficient credits

**Woodpecker API not working**
- Verify your API key and account status
- Check that your Woodpecker account has active campaigns

## Uninstallation

To remove Woodpecker API:

1. **Quit the application** if it's running
2. **Delete the app**: Drag "Woodpecker API" from Applications to Trash
3. **Remove user data** (optional):
   - Open Finder and press Cmd+Shift+G
   - Go to: `~/Library/Application Support/Woodpecker API`
   - Delete the folder if you want to remove all data

## Support

For technical support or questions:
- Email: support@makeshapes.com
- Documentation: [Project Documentation](../README.md)

## Version Information

- **Current Version**: 1.0.0
- **Build Type**: Universal Binary (Intel + Apple Silicon)
- **Code Signed**: Yes
- **Notarized**: No (development build)
