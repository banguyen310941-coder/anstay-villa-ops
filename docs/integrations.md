# ANSTAY v0.7 — Integration Gateway

Production gateway: `https://anstay-channel-gateway.vercel.app`

## Mục tiêu

Mở lớp tích hợp có version để website ANSTAY, channel manager hoặc adapter OTA có thể kết nối mà không phụ thuộc vào giao diện quản trị nội bộ.

## Nguyên tắc

- Không đưa `DATABASE_URL`, API key hoặc token OTA vào frontend/GitHub.
- API tích hợp chạy server-to-server tại `/api/v1/*` trên service `anstay-channel-gateway` tách riêng khỏi app quản trị.
- Cổng production mặc định ở trạng thái **sealed** cho tới khi secret được nạp vào environment của Vercel.
- Booking ngoài hệ thống dùng mã idempotent dạng `EXT-<CHANNEL>-...`; cùng một `channel + external_reservation_id` không tạo booking trùng.
- Quy tắc chống trùng lịch và khóa tháng tiếp tục do PostgreSQL trigger hiện tại kiểm soát.
- Website/OTA chỉ nhận mã villa và dữ liệu cần thiết; không xuất mô hình sở hữu, giá thuê chủ nhà hoặc dữ liệu nội bộ khác.

## Cổng đã dựng

| Cổng | Mục đích |
| --- | --- |
| `GET /api/v1/health` | Kiểm tra gateway và trạng thái cấu hình an toàn |
| `GET /api/v1/catalog` | Danh sách mã villa để mapping |
| `GET /api/v1/availability` | Kiểm tra trống theo khoảng lưu trú |
| `GET /api/v1/ari` | Availability/Inventory theo ngày, tối đa 93 ngày; rate đang để `null` |
| `POST /api/v1/reservations` | Tạo booking từ website/OTA; idempotent |
| `PATCH /api/v1/reservations` | Cập nhật booking ngoài hệ thống |
| `POST /api/v1/cancellations` | Hủy booking ngoài hệ thống |
| `POST /api/v1/webhook` | Nhận event chuẩn hóa từ adapter OTA |
| `GET /api/v1/ical` | Xuất calendar block một chiều theo villa |
| `/api/openapi.json` | Hợp đồng OpenAPI cho đội website/đối tác |

## Secret cần cấu hình ở Vercel khi bật dữ liệu thật

- `DATABASE_URL`: connection string Neon dùng **chỉ ở server function**.
- `ANSTAY_INTEGRATION_API_KEY`: khóa server-to-server cho website/channel adapter.
- `ANSTAY_ICAL_TOKEN`: token dài, ngẫu nhiên cho feed iCal.
- `ANSTAY_ALLOWED_ORIGINS`: danh sách origin được phép gọi từ browser nếu thật sự cần; mặc định không mở CORS rộng.

Không commit các giá trị này vào repository. Cho tới khi các secret được nạp, gateway trả `gateway_sealed` thay vì mở dữ liệu ra internet.

## Event chuẩn hóa cho adapter OTA

```json
{
  "event_id": "provider-event-id",
  "type": "reservation.created",
  "channel": "bookingcom",
  "reservation": {
    "external_reservation_id": "ABC123",
    "villa_code": "NHAN",
    "check_in": "2026-10-01",
    "check_out": "2026-10-03",
    "guests": 4,
    "currency": "VND",
    "room_revenue": 5400000,
    "ota_commission": 810000,
    "amount_received": 4590000,
    "guest": {"name":"Nguyen Van A","phone":"","email":""}
  }
}
```

Các event v1: `reservation.created`, `reservation.updated`, `reservation.cancelled`.

## Adapter OTA tương lai

Lớp gateway không giả định API riêng của Booking.com/Airbnb/Agoda/Expedia/Traveloka giống nhau. Khi ANSTAY có tài khoản partner/credential và tài liệu kỹ thuật chính thức của từng kênh, tạo adapter riêng ở phía ngoài rồi map dữ liệu vào contract chuẩn trên. Cách này tránh sửa core Booking mỗi lần đổi OTA.

Mỗi adapter sau này có thể triển khai xác thực/chữ ký riêng của nhà cung cấp, property/rate-plan mapping, retry, audit và outbound ARI mà không làm thay đổi contract core `/api/v1`.

## Website ANSTAY

Website nên gọi gateway từ backend/server action của website, không nhúng `ANSTAY_INTEGRATION_API_KEY` vào JavaScript trình duyệt. Luồng chuẩn: website -> backend website -> `/api/v1/availability` -> `/api/v1/reservations` -> ANSTAY Postgres.

## ARI

`/api/v1/ari` đã mở Availability/Inventory. Trường `rate` cố ý để `null` cho tới khi module bảng giá theo villa/ngày/mùa/phụ thu được chốt. Không phát giá giả ra OTA.
