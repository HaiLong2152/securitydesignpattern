const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const JWT_SECRET = 'secret-key-123';

// 1. GATEWAY OFFLOADING: Rate Limiting (Giới hạn 10 request / giây)
const limiter = rateLimit({
  windowMs: 1000, // 1 giây
  max: 10, // Tối đa 10 requests
  message: { error: 'Too many requests, limit is 10 req/s' }
});
app.use(limiter);

// Endpoint cấp token nhanh để test
app.post('/login', (req, res) => {
  const token = jwt.sign({ userId: 1, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// 1. GATEWAY OFFLOADING: Kiểm tra JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization Header' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or Expired Token' });
    req.user = user;
    next();
  });
};

app.use(authenticateJWT);

// 2. GATEWAY AGGREGATION: Gộp thông tin User và Order trong 1 lượt gọi song song
app.get('/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const [userRes, ordersRes] = await Promise.all([
      axios.get(`http://user-service:3001/users/${userId}`),
      axios.get(`http://order-service:3002/orders?userId=${userId}`)
    ]);

    res.json({
      user: userRes.data,
      orders: ordersRes.data
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate data', details: err.message });
  }
});

// 3. GATEWAY ROUTING: Định tuyến /users và /orders tới đúng service
app.use('/users', createProxyMiddleware({ target: 'http://user-service:3001', changeOrigin: true }));
app.use('/orders', createProxyMiddleware({ target: 'http://order-service:3002', changeOrigin: true }));

app.listen(8080, () => console.log('API Gateway running on port 8080'));