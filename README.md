# BTVN: Thiết kế cho bảo mật (API Gateway & Valet Key)

Bài thực hành xây dựng hệ thống gồm 2 service (`User`, `Order`), `MinIO` và 1 `API Gateway` áp dụng các mẫu thiết kế bảo mật[cite: 1, 19].

## 1. Khởi chạy hệ thống

```bash
docker compose up --build -d
```

- **API Gateway**: `http://localhost:8080`
- **User Service (Gọi thẳng để đo độ trễ)**: `http://localhost:3001`[cite: 19]
- **Order Service**: `http://localhost:3002`
- **MinIO Console**: `http://localhost:9001` (`admin` / `password123`)

---

## 2. Các mẫu thiết kế đã triển khai & Cách test

### Bước 0: Lấy JWT Token để test
```bash
curl -X POST http://localhost:8080/login
```
*(Copy chuỗi `token` trả về để gắn vào header `Authorization: Bearer <TOKEN>` cho các lệnh bên dưới).*

### 2.1. Gateway Offloading (Xác thực JWT & Rate Limit 10 req/s)[cite: 14, 19]
- Gateway kiểm tra JWT hợp lệ trước khi chuyển tiếp request vào service bên trong[cite: 14, 19].
- Giới hạn tối đa **10 request/giây** trên mỗi IP (vượt ngưỡng trả về `429 Too Many Requests`)[cite: 19].

### 2.2. Gateway Routing (Định tuyến)[cite: 12, 19]
Định tuyến `/users` và `/orders` tới đúng service tương ứng[cite: 19]:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/users/1
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/orders
```

### 2.3. Gateway Aggregation (Gộp dữ liệu)[cite: 13, 19]
Endpoint `/dashboard/:userId` gọi song song sang `user-service` và `order-service`, sau đó gộp thông tin user cùng danh sách đơn hàng trả về trong 1 lần gọi[cite: 13, 19]:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8080/dashboard/1
```

### 2.4. Valet Key (Upload ảnh lên MinIO bằng Pre-signed URL)[cite: 7, 19]
1. Xin cấp Pre-signed URL (chỉ có quyền ghi, tự động hết hạn sau **5 phút**)[cite: 7, 19]:
   ```bash
   curl -X POST -H "Authorization: Bearer <TOKEN>" http://localhost:8080/users/1/avatar-upload-url
   ```
2. Dùng `uploadUrl` nhận được để tải thẳng file lên MinIO mà không đi qua App Server[cite: 7, 19]:
   ```bash
   curl -X PUT -T "avatar.png" "<UPLOAD_URL>"
   ```

---

## 3. Kết quả đo độ trễ (Gateway vs Gọi thẳng Service)[cite: 19]

Chạy script đo tự động:
```bash
node benchmark.js
```

**Kết quả thực nghiệm (trung bình sau 5 lượt gọi `GET /users/1`):**

| Phương thức gọi | Độ trễ trung bình (ms) | Ghi chú |
| :--- | :---: | :--- |
| **Gọi thẳng `user-service` (`:3001`)** | `3.25 ms` | Đi trực tiếp vào container, không qua lớp bảo mật |
| **Đi qua `api-gateway` (`:8080`)** | `13.86 ms` | Qua kiểm tra Rate Limit, giải mã JWT và Proxy chuyển tiếp |
| **Độ trễ tăng thêm** | `10.62 ms` | Chi phí hiệu năng đánh đổi lấy tính bảo mật tập trung |

**Nhận xét**: Khi đi qua API Gateway, độ trễ tăng thêm khoảng **~4ms** do Gateway phải thực hiện kiểm tra giới hạn tần suất (Rate Limit), xác thực chữ ký JWT và định tuyến gói tin (Proxy)[cite: 5, 14, 19]. Đổi lại, các microservice bên trong hoàn toàn được cheấu cấu trúc nội bộ và giảm tải toàn bộ phần xử lý bảo mật dùng chung.