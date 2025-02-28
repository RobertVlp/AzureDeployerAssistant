$middlewarePath = ".\middleware"
$middlewareRunCommand = "func host start --port 7151"

$frontendPath = ".\frontend"
$frontendRunCommand = "npm start"

$backendPath = ".\backend"
$backendRunCommand = "flask run"

function Start-InNewTerminal {
    param (
        [string]$Path,
        [string]$Command
    )

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $Path; $Command"
}

Write-Host "Starting Middleware..."
Start-InNewTerminal -Path $middlewarePath -Command $middlewareRunCommand

$middlewareStarted = $false
$timeout = 0
while ($middlewareStarted -eq $false -and $timeout -lt 10) {
    $timeout++
    $middlewareStarted = Test-NetConnection -ComputerName "localhost" -Port 7151 -InformationLevel Quiet
    Start-Sleep -Seconds 1
}

if ($middlewareStarted -eq $false) {
    Write-Host "Middleware failed to start"
    exit
}

Write-Host "Starting Frontend..."
Start-InNewTerminal -Path $frontendPath -Command $frontendRunCommand

Write-Host "Starting Backend..."
Start-InNewTerminal -Path $backendPath -Command $backendRunCommand

Write-Host "App started!"