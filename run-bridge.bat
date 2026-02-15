@echo off
setlocal
title Playstation Rental Bridge System

:: ========================================================
:: KONFIGURASI PENGGUNA (EDIT DI SINI)
:: ========================================================
:: Masukkan API Key dari halaman Admin dan URL Server VPS/Local
:: Contoh: set BRIDGE_API_KEY=xxxxx-xxxx-xxxx

set BRIDGE_API_KEY=e3577621-7463-447a-b044-5af06c413683
set API_URL=http://3.27.212.112:3000

:: ========================================================

cls
echo ===============================================================================
echo.
echo           PLAYSTATION RENTAL BRIDGE SYSTEM (TV CONTROL)
echo           Versi 2.0 - VPS Ready
echo.
echo ===============================================================================
echo.
echo  [SYSTEM CHECK] Memeriksa kebutuhan sistem...

:: 1. Cek Node.js
echo.
echo  [1/4] Memeriksa Node.js Runtime...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 4
    echo.
    echo  [KRITIKAL] Node.js TIDAK DITEMUKAN!
    echo.
    echo  Sistem ini membutuhkan Node.js untuk berjalan.
    echo  Silakan download dan install dari: https://nodejs.org/
    echo.
    pause
    exit /b
) else (
    echo        OK - Node.js terdeteksi.
)

:: 2. Cek ADB
echo.
echo  [2/4] Memeriksa Android Debug Bridge (ADB)...
where adb >nul 2>nul
if %errorlevel% neq 0 (
    color 4
    echo.
    echo  [KRITIKAL] ADB TIDAK DITEMUKAN PADA SYSTEM PATH!
    echo.
    echo  Pastikan 'platform-tools' Android SDK sudah terinstall dan foldernya
    echo  sudah ditambahkan ke Environment Variable 'PATH' Windows.
    echo.
    echo  Jika Anda baru menginstall, coba restart komputer/CMD ini.
    echo.
    pause
    exit /b
) else (
    echo        OK - ADB terdeteksi.
)

:: 3. Cek Module Dependencies
echo.
echo  [3/4] Memeriksa Library Pendukung (node_modules)...
if not exist node_modules (
    echo        Module belum terinstall. Sedang mengunduh dependencies...
    echo        (Ini mungkin memakan waktu beberapa menit tergantung internet)
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 4
        echo.
        echo  [ERROR] Gagal menginstall dependencies!
        echo  Pastikan koneksi internet Anda stabil.
        echo.
        pause
        exit /b
    )
    echo.
    echo        OK - Installasi selesai.
) else (
    echo        OK - Library siap digunakan.
)

:: 4. Jalankan Bridge
echo.
echo  [4/4] Menjalankan Bridge Service...
echo ===============================================================================
echo.
echo  [INFO] Konfigurasi Aktif:
if "%BRIDGE_API_KEY%"=="" (
    echo         Mode: Menggunakan file .env (Pastikan file .env sudah ada)
    echo.
    echo  [START] Memulai Script...
    node scripts/bridge.js
) else (
    echo         Mode: Menggunakan Script Settings
    echo         API URL : %API_URL%
    echo         API KEY : %BRIDGE_API_KEY%
    echo.
    echo  [START] Memulai Script...
    node scripts/bridge.js --key=%BRIDGE_API_KEY% --api=%API_URL%
)

echo.
echo  [STOP] Bridge telah berhenti.
echo.
pause
