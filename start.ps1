$middlewarePath = ".\middleware"
$middlewareRunCommand = "func host start --port 7151"

$frontendPath = ".\frontend"
$frontendRunCommand = "npm run dev"

$backendPath = ".\backend"
$backendRunCommand = "flask run"

function Start-InNewTerminal {
    param (
        [string]$Path,
        [string]$Command
    )

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $Path; $Command"
}

function Test-Service {
    param (
        [string]$ServiceName,
        [int]$Port
    )

    $isRunning = $false
    $retry = 10

    while ($isRunning -eq $false -and $retry -gt 0) {
        $retry--
        $isRunning = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet
        Start-Sleep -Seconds 1
    }

    if ($isRunning -eq $false) {
        Write-Host "$ServiceName failed to start"
        exit
    }
}

Write-Host "Starting Middleware..."
Start-InNewTerminal -Path $middlewarePath -Command $middlewareRunCommand
Test-Service -ServiceName "Middleware" -Port 7151

Write-Host "Starting Backend..."
Start-InNewTerminal -Path $backendPath -Command $backendRunCommand
Test-Service -ServiceName "Backend" -Port 5000

Write-Host "Starting Frontend..."
Start-InNewTerminal -Path $frontendPath -Command $frontendRunCommand
Test-Service -ServiceName "Frontend" -Port 3000

Write-Host "App started!"