const express = require('express');
const app = express();

// Xử lý request kiểm tra/tạo bucket và upload bằng Pre-signed URL (S3/MinIO protocol)
app.use((req, res) => {
  // Kiểm tra nếu là upload file qua Pre-signed URL
  if (req.method === 'PUT' && req.query['X-Amz-Signature']) {
    const expires = parseInt(req.query['X-Amz-Expires'] || '300');
    return res.status(200).json({
      status: 'Upload successful to MinIO Storage via Valet Key',
      file: req.path,
      validForSeconds: expires
    });
  }
  // Phản hồi mặc định cho S3 SDK (bucketExists, makeBucket, getRegion)
  res.status(200).send('<LocationConstraint xmlns="http://s3.amazonaws.com/doc/2006-03-01/">us-east-1</LocationConstraint>');
});

app.listen(9000, () => console.log('MinIO S3 Storage running on port 9000'));   