const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

async function run() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, { days: 365, keySize: 2048, extensions: [{ name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] }] });

  const shopifyDir = path.join(__dirname, '.shopify');
  if (!fs.existsSync(shopifyDir)) {
    fs.mkdirSync(shopifyDir);
  }

  fs.writeFileSync(path.join(shopifyDir, 'localhost.pem'), pems.cert);
  fs.writeFileSync(path.join(shopifyDir, 'localhost-key.pem'), pems.private);
  console.log('Successfully generated localhost SSL certificates!');
}

run();
