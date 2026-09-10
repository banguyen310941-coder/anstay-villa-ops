# ANSTAY Website Deposit Policy

Updated: 2026-09-10

## Safe default

All villas currently use `deposit_policy_mode = manual`, with no automatic deposit amount and no deposit deadline. This preserves the existing operating rule until ANSTAY explicitly configures a policy.

Supported modes on `villa_booking_policies`:

- `manual`: staff sets deposit per website request.
- `none`: no deposit required.
- `fixed`: fixed VND amount, capped at the request total.
- `percent_total`: percentage of the final request total, from 0 to 100.

Optional `deposit_due_hours` sets the deposit deadline after the request is created.

## Website request flow

`public_web_create_request` resolves the configured villa deposit policy when the quote is already final. Requests that still require manual surcharge confirmation do not receive an automatic deposit amount yet.

`admin_update_website_request_quote` finalizes surcharge/total and, if staff does not manually provide a deposit amount, falls back to the configured villa deposit policy.

`public_web_request_status` exposes `deposit_required`, `deposit_paid`, and `deposit_due_at` for guest status tracking.

## Auto-confirm after verified deposit

`admin_record_website_request_payment` records only money staff has checked as actually received. After recording, it automatically calls `admin_confirm_website_request` only when all of these are true:

- caller role is `admin` or `ops`;
- request is still open;
- manual quote is finished;
- final total exists;
- deposit requirement is configured and greater than zero;
- verified paid deposit is at least the required deposit.

Accounting may record a verified deposit, but does not automatically confirm a booking. The normal booking confirmation function still rechecks overlap, villa blocks, and other active holds before creating the confirmed booking.

## Operational UI source

`public/parts/main-19.txt` adds deposit-to-booking automation feedback. `public/parts/main-20.txt` adds an admin-only villa deposit-policy editor. `loader.js` loads both modules.

No rates were published as part of this change.
