const express = require('express');
const app = express();

const orders = [
  { id: 101, userId: 1, item: 'Laptop Gaming', total: 25000000 },
  { id: 102, userId: 1, item: 'Chuột không dây', total: 500000 },
  { id: 103, userId: 2, item: 'Bàn phím cơ', total: 1500000 }
];

app.get('/orders', (req, res) => {
  const { userId } = req.query;
  if (userId) {
    return res.json(orders.filter(o => o.userId === parseInt(userId)));
  }
  res.json(orders);
});

app.listen(3002, () => console.log('Order Service running on port 3002'));