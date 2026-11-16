import fs from 'fs';
import path from 'path';

const licenseHash = '8933bac1632f877c005cca6edfc1b846cf3736f8\n';
const licensesDir = 'C:\\Android\\Sdk\\licenses';

if (!fs.existsSync(licensesDir)) {
  fs.mkdirSync(licensesDir, { recursive: true });
}

fs.writeFileSync(path.join(licensesDir, 'android-sdk-license'), licenseHash);
fs.writeFileSync(path.join(licensesDir, 'android-sdk-preview-license'), licenseHash);
console.log('Licenses written successfully.');
