# Woodpecker API - Troubleshooting Guide

## Installation Issues

### Security and Permissions

**Problem**: "Woodpecker API" cannot be opened because it is from an unidentified developer

**Solution**:
1. **Method 1 - Right-click to open**:
   - Right-click the app in Applications
   - Select "Open" from context menu
   - Click "Open" in the security dialog

2. **Method 2 - System Preferences**:
   - Open System Preferences > Security & Privacy
   - Click "Open Anyway" next to the blocked app message

3. **Method 3 - Command line** (advanced):
   ```bash
   sudo xattr -rd com.apple.quarantine "/Applications/Woodpecker API.app"
   ```

**Problem**: App requests permissions for file access

**Solution**: Grant the requested permissions. The app needs:
- File system access for CSV imports
- Network access for API calls

### Installation Failures

**Problem**: DMG won't mount or appears corrupted

**Solutions**:
1. Re-download the DMG file (may have been corrupted during download)
2. Verify file integrity if checksums are provided
3. Try mounting from command line:
   ```bash
   hdiutil attach "Woodpecker API-1.0.0-universal.dmg"
   ```

**Problem**: Cannot copy app to Applications folder

**Solutions**:
1. Ensure you have admin privileges
2. Check available disk space (need 500MB+)
3. Try copying manually via Finder

## Runtime Issues

### Application Startup

**Problem**: App crashes on startup

**Diagnostic Steps**:
1. Check Console.app for crash logs
2. Look for error messages in system logs
3. Try launching from Terminal to see error output:
   ```bash
   "/Applications/Woodpecker API.app/Contents/MacOS/Woodpecker API"
   ```

**Common Solutions**:
- Restart your Mac
- Clear app data and restart
- Reinstall the application

**Problem**: App starts but shows blank window

**Solutions**:
1. Check if app is running in background (Activity Monitor)
2. Force quit and restart
3. Reset app preferences:
   ```bash
   rm -rf "~/Library/Application Support/Woodpecker API"
   ```

### Database Issues

**Problem**: Data not saving between sessions

**Diagnostic**:
- Check if database file exists: `~/Library/Application Support/Woodpecker API/woodpecker.db`
- Verify app has write permissions to the directory

**Solutions**:
1. Ensure sufficient disk space
2. Check folder permissions:
   ```bash
   ls -la "~/Library/Application Support/Woodpecker API"
   ```
3. Reset database (will lose data):
   ```bash
   rm "~/Library/Application Support/Woodpecker API/woodpecker.db"
   ```

**Problem**: Database corruption errors

**Solutions**:
1. Backup existing database
2. Try database repair (if SQLite tools available)
3. Reset database as last resort

### API Connection Issues

**Problem**: Claude API not responding

**Diagnostic Steps**:
1. Verify API key is correctly entered
2. Check internet connection
3. Test API key with curl:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        https://api.anthropic.com/v1/messages
   ```

**Solutions**:
- Verify API key has sufficient credits
- Check for API service outages
- Ensure firewall isn't blocking requests

**Problem**: Woodpecker API connection fails

**Diagnostic Steps**:
1. Verify API key and account status
2. Check Woodpecker service status
3. Test API connection:
   ```bash
   curl -H "x-api-key: YOUR_API_KEY" \
        https://api.woodpecker.co/rest/v1/campaign_list
   ```

**Solutions**:
- Verify account is active and has campaigns
- Check API rate limits
- Ensure correct API endpoint configuration

## Performance Issues

### Slow Performance

**Problem**: App is slow or unresponsive

**Diagnostic**:
- Check Activity Monitor for CPU/Memory usage
- Look for memory leaks or high CPU usage

**Solutions**:
1. Close other memory-intensive applications
2. Restart the app
3. Restart your Mac
4. Check available disk space (need 1GB+ free)

**Problem**: Large CSV files cause crashes

**Solutions**:
1. Split large CSV files into smaller chunks
2. Increase available memory by closing other apps
3. Process files in smaller batches

### Network Performance

**Problem**: API calls are very slow

**Solutions**:
1. Check internet connection speed
2. Try different network (WiFi vs Ethernet)
3. Check for VPN interference
4. Verify no proxy settings are interfering

## Feature-Specific Issues

### CSV Import Problems

**Problem**: CSV file won't import

**Diagnostic**:
- Check file format (must be valid CSV)
- Verify file encoding (UTF-8 recommended)
- Check file size (very large files may cause issues)

**Solutions**:
1. Save CSV in UTF-8 encoding
2. Remove special characters from headers
3. Ensure required columns are present

**Problem**: Column mapping not working

**Solutions**:
1. Check column headers match expected format
2. Verify no extra spaces in headers
3. Use standard column names when possible

### Content Generation Issues

**Problem**: Generated content is poor quality

**Solutions**:
1. Verify Claude API key has access to latest models
2. Check input data quality
3. Adjust generation parameters if available

**Problem**: Content generation fails

**Diagnostic**:
- Check API key validity
- Verify sufficient API credits
- Look for error messages in app logs

## System Compatibility

### macOS Version Issues

**Problem**: App won't run on older macOS versions

**Requirements**: macOS 10.14 (Mojave) or later

**Solutions**:
1. Update macOS if possible
2. Check if older version of app is available
3. Use web-based alternative if available

### Architecture Issues

**Problem**: Performance issues on Intel Macs

**Note**: App is universal binary and should work on both Intel and Apple Silicon

**Solutions**:
1. Verify you're running the universal version
2. Check Activity Monitor to confirm architecture
3. Try forcing Intel mode if on Apple Silicon:
   ```bash
   arch -x86_64 "/Applications/Woodpecker API.app/Contents/MacOS/Woodpecker API"
   ```

## Getting Help

### Log Collection

To help with troubleshooting, collect these logs:

1. **Console logs**:
   - Open Console.app
   - Filter for "Woodpecker API"
   - Export relevant logs

2. **Crash reports**:
   - Located in: `~/Library/Logs/DiagnosticReports/`
   - Look for files starting with "Woodpecker API"

3. **App logs** (if available):
   - Check: `~/Library/Application Support/Woodpecker API/logs/`

### Contact Support

When contacting support, include:
- macOS version
- App version
- Description of the problem
- Steps to reproduce
- Relevant log files
- Screenshots if applicable

**Support Contact**:
- Email: support@makeshapes.com
- Include "Woodpecker API" in subject line

### Community Resources

- Check project documentation
- Search existing issues in project repository
- Review FAQ section

## Emergency Recovery

### Complete Reset

If all else fails, completely reset the application:

1. **Quit the app** completely
2. **Remove app data**:
   ```bash
   rm -rf "~/Library/Application Support/Woodpecker API"
   rm -rf "~/Library/Preferences/com.makeshapes.woodpecker-api.plist"
   rm -rf "~/Library/Caches/com.makeshapes.woodpecker-api"
   ```
3. **Reinstall the application**
4. **Reconfigure settings**

**Warning**: This will delete all local data including imported leads and generated content.
