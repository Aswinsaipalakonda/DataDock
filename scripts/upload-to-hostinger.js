const fs = require('fs');
const path = require('path');
const https = require('https');

const zipPath = path.resolve(__dirname, '..', 'datadock-deployment.zip');
const stat = fs.statSync(zipPath);
const fileSize = stat.size;

const uploadUrl = 'https://srv1877-files.hstgr.io/rest/346ad3ac95b5541f/api/tus/public_html';
const authKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTU0NTgyNzIxMiIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc5MDcyMjY4OSwiaWF0IjoxNzkwNzAxMDg5fQ.C5efiRwsaOT481EP7OIuBXMKYDnlG1Oa2iW_Aryv4F4';
const restAuthKey = '802eee56e175c5635096c5face5133829ec1f2f7ac105f2292f5720f22ea2b5c-346ad3ac95b5541f';
const targetFile = 'datadock-deployment.zip';

async function upload() {
  console.log(`Starting upload of ${targetFile} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  const fullUrl = new URL(`${uploadUrl}/${targetFile}?override=true`);

  // Step 1: POST creation request
  const postOptions = {
    hostname: fullUrl.hostname,
    path: fullUrl.pathname + fullUrl.search,
    method: 'POST',
    headers: {
      'X-Auth': authKey,
      'X-Auth-Rest': restAuthKey,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': fileSize.toString(),
      'Upload-Offset': '0',
    },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(postOptions, (res) => {
      console.log(`POST response status: ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode === 201 || res.statusCode === 200 || res.statusCode === 204) {
        resolve();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => reject(new Error(`POST failed: ${res.statusCode} ${body}`)));
      }
    });
    req.on('error', reject);
    req.end();
  });

  // Step 2: PATCH payload stream
  const patchOptions = {
    hostname: fullUrl.hostname,
    path: fullUrl.pathname + fullUrl.search,
    method: 'PATCH',
    headers: {
      'X-Auth': authKey,
      'X-Auth-Rest': restAuthKey,
      'Tus-Resumable': '1.0.0',
      'Content-Type': 'application/offset+octet-stream',
      'Upload-Offset': '0',
      'Content-Length': fileSize.toString(),
    },
  };

  await new Promise((resolve, reject) => {
    const req = https.request(patchOptions, (res) => {
      console.log(`PATCH response status: ${res.statusCode} ${res.statusMessage}`);
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200 || res.statusCode === 201) {
          console.log('✓ File successfully uploaded to Hostinger!');
          resolve();
        } else {
          reject(new Error(`PATCH failed: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on('error', reject);

    const fileStream = fs.createReadStream(zipPath);
    fileStream.pipe(req);
  });
}

upload().catch(err => {
  console.error('❌ Upload error:', err);
  process.exit(1);
});
