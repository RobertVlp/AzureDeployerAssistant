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

Start-Sleep -Seconds 10

Write-Host "Starting Frontend..."
Start-InNewTerminal -Path $frontendPath -Command $frontendRunCommand

Write-Host "Starting Backend..."
Start-InNewTerminal -Path $backendPath -Command $backendRunCommand

Write-Host "App started!"