# ANSTAY Villa Ops

Phiên bản v1.6 cho chuỗi villa ANSTAY / Resort Hội An.

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
- `accounting`: tài chính + báo cáo + đối soát OTA payout
- `employee`: điểm danh cá nhân

## OTA Adapter + Payout Reconciliation v1.6
- `channel_inbox_events`: lưu webhook inbound theo `channel + event_id`, chống xử lý lặp. Nếu OTA không có event ID thì Gateway tạo fingerprint SHA-256 từ payload.
- `channel_reservations`: giữ liên kết bền vững giữa external reservation ID của OTA và booking ANSTAY để update/cancel/payout không phải đoán booking.
- `/api/v1/adapters`: readiness của Booking.com, Agoda, Airbnb, Traveloka nhưng không lộ secret.
- `/api/v1/dispatch`: gửi các event outbox đã đủ mapping qua adapter server-side khi credential được cấu hình.
- `/api/v1/payouts`: nhận payout/remittance và từng booking line từ OTA/adapter.
- `ota_payouts` + `ota_payout_lines`: tách gross, commission, phí, thuế/khấu trừ và net payout.
- Khi đối soát, chỉ `net payout` thực nhận được ghi vào `booking_payments`; không cộng lại vào doanh thu và không tự thay đổi `recognized_revenue` hoặc `owner_share_base`.
- App có bảng **Đối soát OTA Commission & Payout** trong `Website & OTA`, gồm unmatched lines, ghép booking thủ công, kiểm net và chốt đối soát theo quyền Admin/Accounting.
- Adapter thật vẫn sealed cho tới khi có endpoint/credential chính thức của từng OTA.

## Website Booking + Deposit + OTA Sync v1.5
- `website_booking_requests` giữ yêu cầu đặt villa trước khi trở thành booking thật.
- Chính sách cọc theo từng villa hỗ trợ `manual`, `none`, `fixed`, `percent_total`; hiện mặc định vẫn là `manual` để không tự áp mức cọc chưa được duyệt.
- Admin/Ops/Accounting có thể ghi nhận tiền cọc đã đối soát. Khi Admin/Ops ghi đủ cọc và giá đã chốt, backend có thể tự xác nhận thành booking thật; kế toán chỉ ghi nhận tiền, không tự xác nhận booking.
- Booking được tạo vẫn đi qua kiểm tra overlap, availability block và hold trước khi khóa lịch.
- 4 OTA `BOOKING_COM`, `AGODA`, `AIRBNB`, `TRAVELOKA` đã có placeholder mapping cho cả 6 villa ở BAR; External Property/Room ID vẫn để trống cho đến khi đối tác cấp.
- Booking thay đổi sinh outbox cho OTA; thay đổi `rate_calendar` sinh `rate_changed`; thay đổi `availability_blocks` sinh `availability_changed`.
- Nếu thiếu Property/Room ID, outbox giữ `waiting_mapping`, tuyệt đối chưa gửi ra ngoài. Khi mapping đủ ID, trigger tự chuyển các dòng phù hợp về `pending`.
- Mỗi lần outbox đổi trạng thái hoặc tăng số lần thử đều ghi `channel_sync_events` để có audit.
- App có **OTA Readiness & Sync Control**: xem mapping sẵn sàng, pending/waiting/failed/sent và gửi lại các dòng lỗi theo quyền.

## Availability + Website Booking v1.3+
- `availability_blocks`: khóa phòng vì chủ nhà giữ, bảo trì, nội bộ hoặc khóa thủ công; không xóa lịch sử, chỉ active/inactive.
- SOL được block 22/08/2026–22/08/2027 và SAM 15/12/2026–15/12/2028 theo dữ liệu villa đã cung cấp.
- `villa_booking_policies`: sức chứa tối đa, giờ check-in/check-out và chính sách đặt phòng cơ bản. Sức chứa hiện tại: Nhàn/SOL/SAM/Gió 8, Nắng 6, Tim 14 khách.
- `booking_holds`: giữ phòng tạm 5–20 phút cho checkout website.
- Gateway kiểm tra booking đã xác nhận, block vận hành/chủ nhà, hold còn hiệu lực, sức chứa, min-stay, stop-sell và published rate trước khi trả kết quả bán.
- `GET /api/v1/search`: tìm đồng thời tất cả villa có thể bán theo ngày + số khách.
- `POST /api/v1/hold`: tạo hold tạm sau khi server kiểm tra lại availability và giá.
- App có module **Phòng & Website** để quản lý block, sức chứa, mùa giá và mô phỏng luồng tìm phòng website.

## Price Engine + Channel Mapping
- `rate_plans`: quản lý nhiều Rate Plan, mặc định có `BAR`.
- `rate_calendar`: giá theo từng ngày, min stay, stop-sell, CTA/CTD và trạng thái nháp/phát hành.
- `rate_seasons`: lưu mùa giá/dịp lễ thành rule có audit rồi materialize xuống `rate_calendar`.
- Giá chỉ được Gateway trả ra ngoài khi `published=true`; giá 0 không được coi là sellable.
- `sales_channels`: Direct, Website, Booking.com, Agoda, Airbnb, Traveloka.
- `channel_mappings`: mapping villa/rate plan sang từng kênh, lưu external Property/Room/Rate Plan ID và điều chỉnh giá theo `%` hoặc số tiền cố định.
- `villa_guest_surcharges`: tách phụ thu người lớn, trẻ 6–12, trẻ dưới 6 và cách tính `manual/per_stay/per_night`. Mặc định giữ `manual` để không tự cộng sai khi quy tắc chưa được xác nhận.
- Bảng giá hiện có từ workbook ANSTAY được nạp vào database ở trạng thái **nháp**, không tự phát ra website/OTA.

## Integration Gateway
- `GET /api/v1/catalog`: villa + booking policy + channel + rate plan + mapping.
- `GET /api/v1/availability`: availability vật lý, có booking/block/hold conflicts.
- `GET /api/v1/ari`: inventory + published rate + min stay + stop-sell/CTA/CTD theo ngày.
- `GET /api/v1/search`: tìm villa bán được theo kỳ lưu trú và số khách.
- `GET /api/v1/quote`: báo giá chi tiết 1–31 đêm và phụ thu khi quy tắc đủ rõ.
- `POST /api/v1/hold`: giữ chỗ tạm cho checkout website.
- `POST/PATCH /api/v1/reservations`: tạo/cập nhật booking ngoài hệ thống theo external reservation ID.
- `POST /api/v1/cancellations`, `POST /api/v1/webhook`, `GET /api/v1/ical`.
- `GET/PATCH /api/v1/outbox`: adapter lấy các sự kiện sẵn sàng gửi và ACK sent/failed theo API key server.
- `GET /api/v1/adapters`, `POST /api/v1/dispatch`, `POST /api/v1/payouts` phục vụ adapter delivery và payout reconciliation.
- Gateway có secret được sealed by default; không commit API key/DB password/OTA credential vào repository.

## Dòng tiền và doanh thu
Booking là nguồn doanh thu; `booking_payments` là nguồn tiền thực thu. Giá gộp, giảm giá, hoàn tiền, hoa hồng OTA, thuế/phí, doanh thu ghi nhận và căn cứ chia chủ được lưu tách riêng để không cộng trùng hoặc dùng sai mục đích.

## Housekeeping + Purchase Order
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

Xem thêm `docs/integrations.md`, `docs/booking-deposit-policy.md`, `docs/v1.6-ota-adapters-payouts.md` và `/api/openapi.json`.
