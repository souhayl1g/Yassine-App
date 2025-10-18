# Quick Start Script for Backend Testing

Write-Host "🚀 Starting Olive Mill Backend Server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Your PC IP: 192.168.1.19" -ForegroundColor Yellow
Write-Host "🔌 Backend Port: 3000" -ForegroundColor Yellow
Write-Host "🌐 Backend URL: http://192.168.1.19:3000" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Test on phone: http://192.168.1.19:3000/api/health" -ForegroundColor Magenta
Write-Host ""
Write-Host "⚠️  Make sure:" -ForegroundColor Red
Write-Host "   1. PostgreSQL is running" -ForegroundColor White
Write-Host "   2. Database credentials in .env are correct" -ForegroundColor White
Write-Host "   3. Windows Firewall allows port 3000" -ForegroundColor White
Write-Host "   4. Phone is on same WiFi network" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""

# Start the backend
npm start