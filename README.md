# ANSTAY Villa Ops

Phiên bản v1.0 cho chuỗi villa ANSTAY / Resort Hội An.

## Production stack
- Vercel: frontend Vite
- Neon Postgres: dữ liệu vận hành
- Neon Auth: đăng nhập
- Neon Data API: CRUD qua HTTPS
- PostgreSQL RLS: phân quyền tại database

## Quyền
- `admin`: toàn hệ thống
- `sales`: CRM + booking
- `ops`: booking + vận hành + nhân sự + kho
- `housekeeping`: việc buồng phòng + điểm danh
- `stock`: kho
- `accounting`: tài chính + báo cáo
- `employee`: điểm danh cá nhân

## Nghiệp vụ villa
- Nhàn: chia 50/50, căn cứ hiện tại chỉ doanh thu bán phòng. Doanh thu dịch vụ không đưa vào căn cứ chia.
- SOL: thuê cố định 50.000.000 VND/tháng net.
- Nắng: thuê cố định 25.000.000 VND/tháng net.
- SAM, Gió, Tim: sở hữu.

## Dòng tiền và doanh thu
Booking là nguồn doanh thu; `booking_payments` là nguồn tiền thực thu. Giá gộp, giảm giá, hoàn tiền, hoa hồng OTA, thuế/phí, doanh thu ghi nhận và căn cứ chia chủ được lưu tách riêng để không cộng trùng hoặc dùng sai mục đích.

## Điểm danh
Check-in / check-out production dùng PostgreSQL RPC để timestamp được lấy từ máy chủ. GPS được ghi cùng lần chấm công. Điều chỉnh công đi qua phiếu chờ duyệt.

## Đóng tháng v1.0
- Chọn kỳ báo cáo độc lập với tháng hiện tại.
- Control Center hiển thị doanh thu ghi nhận, tiền thực thu, phải thu, công suất và lợi nhuận đóng góp.
- Checklist trước đóng tháng: booking chưa hoàn tất, giao dịch thu chưa đối soát, công nợ khách, hóa đơn/chứng từ, căn cứ chia chủ Nhàn và khoản chi đến hạn.
- Hai lỗi chặn khóa tháng: booking chưa hoàn tất và tiền thu chưa đối soát.
- Khi khóa tháng, PostgreSQL chụp `monthly_settlements` cho từng villa và `monthly_closures` cho toàn kỳ.
- Nhàn lấy `owner_share_base` nếu đã cấu hình; nếu chưa có thì tạm dùng doanh thu phòng theo quy tắc hiện hành.
- SOL và Nắng ghi nghĩa vụ thuê cố định theo tháng; SAM/Gió/Tim không phát sinh thuê/chia chủ.
- Có theo dõi số tiền đã thanh toán đối soát, trạng thái chưa trả/trả một phần/đã trả và mã tham chiếu.
- Dự chi tháng tới tách thuê cố định, công nợ có hạn trả và nghĩa vụ settlement đã khóa nhưng chưa thanh toán.

## Local
```bash
npm install
npm run dev
```

## Integration Gateway
Đã mở API version `/api/v1` cho website/channel adapter: catalog, availability, ARI, reservation create/update/cancel, normalized webhook và iCal. Các cổng có secret đều sealed by default; không có secret nào được commit. Xem `docs/integrations.md` và `/api/openapi.json`.
