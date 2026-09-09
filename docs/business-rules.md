# ANSTAY Villa Ops — Business Rules v0.3

## Asset models

- **Nhàn** — Revenue share 50/50 with owner. The sharing base is **room-sales revenue only**. Other revenue (food, transport, tours, minibar, service surcharges, etc.) is excluded from the 50/50 owner share. Treatment of OTA commission, refunds, tax/fees will be finalized from the contract.
- **SOL** — Fixed monthly rent: **50,000,000 VND/month**, net, paid monthly. Recipient/payment due date will be finalized from the contract.
- **Nắng** — Fixed monthly rent: **25,000,000 VND/month**, net, paid monthly.
- **SAM, Gió, Tim** — Owned assets. No fixed rent or owner revenue-share obligation.

## Revenue model

Every booking must retain separate fields for:
1. Gross guest price
2. Discount/refund
3. Tax and fees
4. OTA commission
5. Cash actually received
6. Recognized revenue
7. Revenue-share base

Direct bookings are not automatically classified as “no invoice”. Invoice status is tracked separately.

## Monthly forecast

Next-month cash outflow forecast = fixed obligations + due payables + approved purchasing + booking-driven operating costs + expected tax/fees + scheduled maintenance + reserve - prepaid amounts.

## Employee attendance

- Every attendance record belongs to an employee, work date, assigned shift and villa/work location.
- Production check-in/out timestamps must come from the server; the client device time is display-only.
- Attendance can capture authorized GPS and/or a villa QR check. Geofence radius will be configurable per villa.
- Late arrival and early leave are derived from the assigned shift, with a configurable grace period.
- Missing/incorrect punches are corrected through an adjustment request and manager approval; original events are never silently overwritten.
- Monthly timesheets can feed payroll only after salary/overtime/allowance rules are provided and approved.
