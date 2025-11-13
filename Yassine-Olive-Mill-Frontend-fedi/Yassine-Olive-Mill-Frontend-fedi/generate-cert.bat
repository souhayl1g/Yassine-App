@echo off
echo Creating self-signed certificate for HTTPS development...

mkdir certs 2>nul

echo Generating private key...
openssl genrsa -out certs/key.pem 2048

echo Generating certificate...
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=TN/ST=Tunisia/L=Tunis/O=OliveMill/CN=localhost"

echo Certificate created successfully!
echo You can now run: npm run dev
echo And access the site at: https://localhost:5173

pause