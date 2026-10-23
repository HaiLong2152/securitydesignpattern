const express = require('express');
const Minio = require('minio');
const app = express();
app.use(express.json());

// Kết nối nội bộ tới container minio để tạo bucket
const internalMinio = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'password123'
});

// Client dùng để ký URL trả về cho người dùng (host là localhost:9000)
const signerMinio = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: 'admin',
  secretKey: 'password123',
  region: 'us-east-1'
});

const BUCKET = 'avatars';
setTimeout(async () => {
  try {
    const exists = await internalMinio.bucketExists(BUCKET);
    if (!exists) await internalMinio.makeBucket(BUCKET, 'us-east-1');
    console.log('Bucket avatars ready');
  } catch (err) {
    console.error('MinIO init error:', err.message);
  }
}, 5000);

const users = {
  1: { id: 1, name: 'Nguyen Van A', email: 'vana@example.com' },
  2: { id: 2, name: 'Tran Thi B', email: 'thib@example.com' }
};

app.get('/users/:id', (req, res) => {
  const user = users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Mẫu Valet Key: cấp pre-signed URL chỉ ghi, hết hạn sau 5 phút (300 giây)
app.post('/users/:id/avatar-upload-url', async (req, res) => {
  try {
    const objectName = `user-${req.params.id}-${Date.now()}.png`;
    const expirySeconds = 5 * 60; // 5 phút
    const presignedUrl = await signerMinio.presignedPutObject(BUCKET, objectName, expirySeconds);
    res.json({
      message: 'Valet Key generated (Valid for 5 minutes)',
      uploadUrl: presignedUrl,
      expiresIn: '300 seconds'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('User Service running on port 3001'));