@echo off
REM === Step 1: Create a local CA ===
if not exist certs mkdir certs
cd certs

REM Generate CA private key
if not exist ca-key.pem openssl genrsa -out ca-key.pem 4096

REM Generate CA certificate
if not exist ca-cert.pem openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 3650 -out ca-cert.pem -subj "/C=TN/ST=Tunisia/L=Tunis/O=OliveMill-CA/CN=OliveMill-Local-CA"

cd ..

REM === Step 2: Generate server key and CSR ===
set /p HOSTNAME=Enter your PC hostname (as seen on the network): 
cd certs
openssl genrsa -out server-key.pem 2048
openssl req -new -key server-key.pem -out server.csr -subj "/C=TN/ST=Tunisia/L=Tunis/O=OliveMill/CN=%HOSTNAME%"

REM === Step 3: Create ext file for SAN ===
echo subjectAltName=DNS:%HOSTNAME% > server.ext

REM === Step 4: Sign server certificate with CA ===
openssl x509 -req -in server.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 825 -sha256 -extfile server.ext

echo.
echo Certificates generated in certs/ folder.
echo Install ca-cert.pem on each device to trust your server.
echo Use server-key.pem and server-cert.pem in your Vite config.
pause
