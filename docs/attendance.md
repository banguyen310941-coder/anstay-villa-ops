# Attendance model

Core flow:
- Employee master record.
- Shift selection: morning, afternoon, office, flex.
- Check-in and check-out timestamp.
- Villa/workplace assignment.
- GPS captured at check-in/out when permission is granted.
- Late detection currently uses a 5-minute grace period in the UI prototype.
- Monthly timesheet aggregates worked days, completed shifts, late count, and actual hours.
- Missing/wrong punches create adjustment requests with pending/approved/rejected states.

Database readiness:
- `employees`, `shifts`, and `attendance` tables already exist.
- `attendance.adjustment_reason` and `attendance.approved_by` are already reserved for correction workflow.

Before payroll integration, ANSTAY still needs to lock:
- official shift start/end times;
- grace minutes;
- overtime rules;
- break deduction;
- geofence radius by villa;
- attendance adjustment approval roles;
- monthly lock date.
