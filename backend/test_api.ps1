Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🚀 Starting WAHA Backend Server for Testing..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$serverProcess = Start-Process node -ArgumentList "dist/server.js" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

try {
    Write-Host "`n==============================================" -ForegroundColor Cyan
    Write-Host "🧪 Testing WAHA Backend REST API Endpoints..." -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan

    # 1. Health Check
    Write-Host "`n1. GET /api/health" -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get
    $health | ConvertTo-Json

    # 2. Buildings Analyze
    Write-Host "`n2. POST /api/buildings/analyze" -ForegroundColor Yellow
    $bInput = @{
        name = "Building 042 (Test)"
        latitude = 24.4539
        longitude = 54.3773
        buildingType = "Commercial"
        acUnits = 120
        averageOperatingHours = 10
        existingCondensateDrainage = $true
        landscaping = $true
    } | ConvertTo-Json

    $bRes = Invoke-RestMethod -Uri "http://localhost:3000/api/buildings/analyze" -Method Post -ContentType "application/json" -Body $bInput
    $bRes | ConvertTo-Json -Depth 5

    # 3. Buildings Opportunities
    Write-Host "`n3. GET /api/buildings/opportunities" -ForegroundColor Yellow
    $bList = Invoke-RestMethod -Uri "http://localhost:3000/api/buildings/opportunities" -Method Get
    Write-Host "Total buildings in list: $($bList.count)"

    # 4. Rainfall Analyze
    Write-Host "`n4. POST /api/rainfall/analyze" -ForegroundColor Yellow
    $rInput = @{
        latitude = 24.4539
        longitude = 54.3773
        rainfallMm = 18.4
        catchmentAreaM2 = 2500
        runoffCoefficient = 0.8
        areaName = "Test Catchment Zone"
    } | ConvertTo-Json

    $rRes = Invoke-RestMethod -Uri "http://localhost:3000/api/rainfall/analyze" -Method Post -ContentType "application/json" -Body $rInput
    $rRes | ConvertTo-Json -Depth 5

    # 5. Rainfall Opportunities
    Write-Host "`n5. GET /api/rainfall/opportunities" -ForegroundColor Yellow
    $rList = Invoke-RestMethod -Uri "http://localhost:3000/api/rainfall/opportunities" -Method Get
    Write-Host "Total rainfall zones: $($rList.count)"

    # 6. Community Post Report
    Write-Host "`n6. POST /api/community/reports" -ForegroundColor Yellow
    $cInput = @{
        latitude = 24.4539
        longitude = 54.3773
        type = "Water accumulation"
        description = "Significant water accumulation after rainfall near test street"
        photoUrl = $null
    } | ConvertTo-Json

    $cRes = Invoke-RestMethod -Uri "http://localhost:3000/api/community/reports" -Method Post -ContentType "application/json" -Body $cInput
    $cRes | ConvertTo-Json -Depth 5

    # 7. Community Reports List
    Write-Host "`n7. GET /api/community/reports" -ForegroundColor Yellow
    $cList = Invoke-RestMethod -Uri "http://localhost:3000/api/community/reports" -Method Get
    Write-Host "Total community reports: $($cList.count)"

    # 8. Unified Map Opportunities
    Write-Host "`n8. GET /api/map/opportunities?type=all" -ForegroundColor Yellow
    $mapRes = Invoke-RestMethod -Uri "http://localhost:3000/api/map/opportunities?type=all" -Method Get
    Write-Host "Total unified map markers returned: $($mapRes.count)"

    # 9. Dashboard API Summary
    Write-Host "`n9. GET /api/dashboard" -ForegroundColor Yellow
    $dashRes = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard" -Method Get
    $dashRes | ConvertTo-Json -Depth 5

    Write-Host "`n==============================================" -ForegroundColor Green
    Write-Host "✅ All 9 REST API endpoint tests PASSED successfully!" -ForegroundColor Green
    Write-Host "==============================================" -ForegroundColor Green
}
finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force
        Write-Host "Stopped test backend server process (PID $($serverProcess.Id))" -ForegroundColor Gray
    }
}
