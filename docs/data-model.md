# Core data model v0.3

Customer -> Lead -> Quote -> Booking -> BookingItem -> Payment -> Invoice -> Reconciliation

Villa -> Room
Villa -> Owner -> Contract -> MonthlySettlement
Booking -> HousekeepingTask -> InventoryConsumption
Villa -> Expense -> Payable
CashAccount -> BankTransaction -> Reconciliation

## Initial modules

- CRM & Marketing
- Sales / Booking calendar
- Housekeeping & Maintenance
- Inventory & Purchasing
- Finance / AR / AP / invoice status / cash accounts
- Villa / Owner / Contract rules
- Reports / Monthly Closing / Forecast

## HR & Attendance

Employee -> EmploymentProfile -> ShiftAssignment -> AttendanceSession
AttendanceSession -> AttendanceEvent (IN/OUT)
AttendanceEvent -> LocationEvidence (GPS/QR/device)
AttendanceSession -> AttendanceAdjustment -> Approval
Employee + Month -> Timesheet -> PayrollInput (future)

Core attendance fields: employee_id, work_date, villa_id/location_id, shift_id, scheduled_start/end, check_in/out_at, source, GPS lat/lng/accuracy, QR location, late_minutes, early_leave_minutes, overtime_minutes, status, adjustment_reason, approver_id, audit timestamps.
