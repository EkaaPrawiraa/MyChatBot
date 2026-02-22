@echo off
setlocal

set ROOT_DIR=%~dp0..

pushd "%ROOT_DIR%\launcher" || exit /b 1

echo Starting Axis Assistant Launcher...
echo It will open a browser at http://127.0.0.1:4187
echo.

start "Axis Assistant Launcher" go run .

timeout /t 1 >nul
start "Axis Assistant" http://127.0.0.1:4187

popd
endlocal
