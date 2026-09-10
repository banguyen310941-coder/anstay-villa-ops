# ANSTAY Villa Ops

Phiên bản v1.3 cho chuỗi villa ANSTAY / Resort Hội An.

## Production stack
- Vercel: frontend Vite
- Neon Postgres: dữ liệu vận hành
- Neon Auth: đăng nhập
- Neon Data API: CRUD qua HTTPS
- PostgreSQL RLS: phân quyền tại database
- ANSTAY Integration Gateway: cổng versioned cho website/OTA

## Quyền
- `admin`: toàn hệ thống
- `sales`: CRM + booking + xem giá/kênh + xem availability
- `ops`: booking + vận hành + nhân sự + kho + giá/kênh + block phòng
- `housekeeping`: việc buồng phòng + điểm danh
- `stock`: kho
- `accounting`: tài chính + báo cáo
- `employee`: điểm danh cá nhân

## Nghiệp vụ villa
- Nhàn: chia 50/50, căn cứ hiện tại chỉ doanh thu bán phòng. Doanh thu dịch vụ không đưa vào căn cứ chia.
- SOL: thuê cố định 50.000.000 VND/tháng net.
- Nắng: thuê cố định 25.000.000 VND/tháng net.
- SAM, Gió, Tim: sở hữu.

## Availability + Website Booking v1.3
- `availability_blocks`: khóa phòng vì chủ nhà giữ, bảo trì, nội bộ hoặc khóa thủ công; không xóa lịch sử, chỉ active/inactive.
- SOL được block 22/08/2026–22/08/2027 và SAM 15/12/2026–15/12/2028 theo dữ liệu villa đã cung cấp.
- `villa_booking_policies`: sức chứa tối đa, giờ check-in/check-out và chính sách đặt phòng cơ bản. Sức chứa hiện tại: Nhàn/SOL/SAM/Gió 8, Nắng 6, Tim 14 khách.
- `booking_holds`: giữ phòng tạm 5–20 phút cho checkout website; bảng này chỉ Gateway server truy cập, không mở cho Data API client.
- Gateway kiểm tra booking đã xác nhận, block vận hành/chủ nhà, hold còn hiệu lực, sức chứa, min-stay, stop-sell và published rate trước khi trả kết quả bán.
- `GET /api/v1/search`: tìm đồng thời tất cả villa có thể bán theo ngày + số khách.
- `POST /api/v1/hold`: tạo hold tạm sau khi server kiểm tra lại availability và giá.
- `POST /api/v1/reservations` nhận `hold_token` tùy chọn và chuyển hold sang `converted` khi booking thành công.
- App có module **Phòng & Website** để quản lý block, sức chứa, mùa giá và mô phỏng luồng tìm phòng website.

## Price Engine + Channel Mapping v1.2+
- `rate_plans`: quản lý nhiều Rate Plan, mặc định có `BAR`.
- `rate_calendar`: giá theo từng ngày, min stay, stop-sell, CTA/CTD và trạng thái nháp/phát hành.
- `rate_seasons`: lưu mùa giá/dịp lễ thành rule có audit rồi materialize xuống `rate_calendar`.
- Giá chỉ được Gateway trả ra ngoài khi `published=true`; giá 0 không được coi là sellable.
- `sales_channels`: Direct, Website, Booking.com, Agoda, Airbnb, Traveloka.
- `channel_mappings`: mapping villa/rate plan sang từng kênh, lưu external Property/Room/Rate Plan ID và điều chỉnh giá theo `%` hoặc số tiền cố định.
- Direct + Website được tạo mapping nội bộ sẵn; OTA vẫn chờ ID/credential thật từ đối tác.
- `villa_guest_surcharges`: tách phụ thu người lớn, trẻ 6–12, trẻ dưới 6 và cách tính `manual/per_stay/per_night`. Mặc định giữ `manual` để không tự cộng sai khi quy tắc chưa được xác nhận.
- Bảng giá hiện có từ workbook ANSTAY được nạp vào database ở trạng thái **nháp**, không tự phát ra website/OTA.

## Integration Gateway v1.3
- `GET /api/v1/catalog`: villa + booking policy + channel + rate plan + mapping.
- `GET /api/v1/availability`: availability vật lý, có booking/block/hold conflicts.
- `GET /api/v1/ari`: inventory + published rate + min stay + stop-sell/CTA/CTD theo ngày.
- `GET /api/v1/search`: tìm villa bán được theo kỳ lưu trú và số khách.
- `GET /api/v1/quote`: báo giá chi tiết 1–31 đêm và phụ thu khi quy tắc đủ rõ.
- `POST /api/v1/hold`: giữ chỗ tạm cho checkout website.
- `POST/PATCH /api/v1/reservations`: tạo/cập nhật booking ngoài hệ thống theo idempotency key.
- `POST /api/v1/cancellations`, `POST /api/v1/webhook`, `GET /api/v1/ical`.
- Gateway có secret được sealed by default; không commit API key/DB password/OTA credential vào repository.

## Dòng tiền và doanh thu
Booking là nguồn doanh thu; `booking_payments` là nguồn tiền thực thu. Giá gộp, giảm giá, hoàn tiền, hoa hồng OTA, thuế/phí, doanh thu ghi nhận và căn cứ chia chủ được lưu tách riêng để không cộng trùng hoặc dùng sai mục đích.

## Housekeeping + Purchase Order v1.1
- Booking `confirmed`/`staying` tự sinh dọn trước check-in, kiểm minibar và dọn sau check-out.
- Task có ưu tiên, checklist, người phụ trách, trạng thái mở/đang làm/hoàn tất và kiểm tra đạt/làm lại.
- Housekeeping worker chỉ thao tác việc được giao cho mình; Admin/Ops phân công và nghiệm thu.
- Purchase Order: `draft` → `approved` → `ordered` → `received`; nhận hàng có thể tự nhập kho theo SKU.
- PO đã duyệt có thể ghi công nợ sang Finance một lần để tránh cộng trùng forecast.

## Đóng tháng
Control Center tách doanh thu ghi nhận, tiền thực thu, phải thu, chi phí, thuê/chia chủ và forecast. Khi khóa tháng, PostgreSQL chụp settlement từng villa và khóa sửa dữ liệu kỳ theo quy tắc hiện hành.

## Local
```bash
npm install
npm run dev
```

Xem thêm `docs/integrations.md`, `docs/v1.1-housekeeping-procurement.md`, `docs/v1.2-price-engine.md`, `docs/v1.3-availability-web.md` và `/api/openapi.json`.
