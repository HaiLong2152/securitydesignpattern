const http = require('http');

function request(options) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const end = process.hrtime.bigint();
        resolve(Number(end - start) / 1e6); // Đổi sang ms
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runBenchmark() {
  // Lấy JWT Token trước
  const tokenRes = await new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 8080, path: '/login', method: 'POST' }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body).token));
    });
    req.end();
  });

  console.log('--- ĐO ĐỘ TRỄ (LATENCY BENCHMARK) ---');
  const iterations = 5;

  let directTotal = 0;
  for (let i = 0; i < iterations; i++) {
    const ms = await request({ hostname: 'localhost', port: 3001, path: '/users/1', method: 'GET' });
    directTotal += ms;
  }

  let gatewayTotal = 0;
  for (let i = 0; i < iterations; i++) {
    const ms = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/users/1',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenRes}` }
    });
    gatewayTotal += ms;
  }

  console.log(`Gọi thẳng User Service (Port 3001) trung bình: ${(directTotal / iterations).toFixed(2)} ms`);
  console.log(`Gọi qua API Gateway   (Port 8080) trung bình: ${(gatewayTotal / iterations).toFixed(2)} ms`);
  console.log(`Độ trễ tăng thêm do Gateway (Xác thực JWT + Proxy): ${((gatewayTotal - directTotal) / iterations).toFixed(2)} ms`);
}

runBenchmark();