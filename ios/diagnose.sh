#!/bin/bash

echo "🔍 Diagnosing API Connection Issues"
echo "===================================="
echo ""

# Get current IP
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
echo "📍 Current IP Address: $IP"
echo ""

# Check if backend is running
echo "🔌 Testing Backend Connection..."
if curl -s --connect-timeout 5 http://192.168.55.101:5001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is reachable at http://192.168.55.101:5001"
else
    echo "❌ Cannot reach backend at http://192.168.55.101:5001"
    echo "   - Make sure your backend server is running"
    echo "   - Check if the IP address is correct: $IP"
    echo "   - Verify port 5001 is open"
fi
echo ""

# Check config file
echo "📄 Checking API config file..."
if [ -f "../src/config/api.ts" ]; then
    CONFIG_IP=$(grep "LOCAL_IP =" ../src/config/api.ts | sed "s/.*'\(.*\)'.*/\1/")
    echo "   Config file IP: $CONFIG_IP"

    if [ "$CONFIG_IP" != "$IP" ]; then
        echo "⚠️  WARNING: Config IP ($CONFIG_IP) doesn't match current IP ($IP)"
        echo "   Update src/config/api.ts with your current IP"
    else
        echo "✅ Config IP matches current IP"
    fi
else
    echo "❌ Config file not found"
fi
echo ""

echo "🔧 Troubleshooting Steps:"
echo "1. Make sure backend is running: cd backend && npm start"
echo "2. Update src/config/api.ts with current IP: $IP"
echo "3. Restart Metro: npx react-native start --reset-cache"
echo "4. Rebuild app: npx react-native run-ios"
