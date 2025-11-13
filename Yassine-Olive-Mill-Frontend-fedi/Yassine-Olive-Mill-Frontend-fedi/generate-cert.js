const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create certs directory
const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

try {
  console.log('Creating self-signed certificate for HTTPS development...');
  
  // Generate private key
  execSync('openssl genrsa -out certs/key.pem 2048', { stdio: 'inherit' });
  
  // Generate certificate
  execSync('openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 -subj "/C=TN/ST=Tunisia/L=Tunis/O=OliveMill/CN=localhost"', { stdio: 'inherit' });
  
  console.log('\n✅ Certificate created successfully!');
  console.log('You can now run: npm run dev');
  console.log('And access the site at: https://localhost:5173');
  
} catch (error) {
  console.error('❌ OpenSSL not found. Please install OpenSSL or use the manual method:');
  console.log('\nAlternative: Use mkcert for easier certificate generation:');
  console.log('1. Install mkcert: https://github.com/FiloSottile/mkcert');
  console.log('2. Run: mkcert -install');
  console.log('3. Run: mkcert localhost');
  console.log('4. Move generated files to certs/ folder as key.pem and cert.pem');
  process.exit(1);
}