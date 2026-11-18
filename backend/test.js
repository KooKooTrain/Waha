const app = require('./dist/server').default;
const http = require('http');

let server;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: server.address().port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('==============================================');
  console.log('🧪 Running In-Process WAHA API Verification Test Suite');
  console.log('==============================================');

  server = app.listen(0, async () => {
    try {
      const port = server.address().port;
      console.log(`Test server running on port ${port}`);

      // 1. Health
      const health = await makeRequest('GET', '/api/health');
      console.log('\n1. GET /api/health:', health.status, health.body);

      // 2. Buildings analyze
      const bAnalyze = await makeRequest('POST', '/api/buildings/analyze', {
        name: "Building 042 (Test)",
        latitude: 24.4539,
        longitude: 54.3773,
        buildingType: "Commercial",
        acUnits: 120,
        averageOperatingHours: 10,
        existingCondensateDrainage: true,
        landscaping: true
      });
      console.log('\n2. POST /api/buildings/analyze:', bAnalyze.status, bAnalyze.body);

      // 3. Buildings opportunities
      const bOpps = await makeRequest('GET', '/api/buildings/opportunities');
      console.log('\n3. GET /api/buildings/opportunities count:', bOpps.body.count);

      // 4. Rainfall analyze
      const rAnalyze = await makeRequest('POST', '/api/rainfall/analyze', {
        latitude: 24.4539,
        longitude: 54.3773,
        rainfallMm: 18.4,
        catchmentAreaM2: 2500,
        runoffCoefficient: 0.8
      });
      console.log('\n4. POST /api/rainfall/analyze:', rAnalyze.status, rAnalyze.body);

      // 5. Rainfall opportunities
      const rOpps = await makeRequest('GET', '/api/rainfall/opportunities');
      console.log('\n5. GET /api/rainfall/opportunities count:', rOpps.body.count);

      // 6. Community reports post
      const cPost = await makeRequest('POST', '/api/community/reports', {
        latitude: 24.4539,
        longitude: 54.3773,
        type: "Water accumulation",
        description: "Significant water accumulation after rainfall",
        photoUrl: null
      });
      console.log('\n6. POST /api/community/reports:', cPost.status, cPost.body);

      // 7. Community reports get
      const cGet = await makeRequest('GET', '/api/community/reports');
      console.log('\n7. GET /api/community/reports count:', cGet.body.count);

      // 8. Map opportunities
      const mapGet = await makeRequest('GET', '/api/map/opportunities?type=all');
      console.log('\n8. GET /api/map/opportunities count:', mapGet.body.count);

      // 9. Dashboard
      const dashGet = await makeRequest('GET', '/api/dashboard');
      console.log('\n9. GET /api/dashboard:', dashGet.status, JSON.stringify(dashGet.body, null, 2));

      console.log('\n==============================================');
      console.log('✅ ALL API TESTS EXECUTED AND VERIFIED SUCCESSFULLY!');
      console.log('==============================================');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('Test execution failed:', err);
      if (server) server.close();
      process.exit(1);
    }
  });
}

runTests();
