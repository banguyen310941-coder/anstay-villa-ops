-- ANSTAY Villa Ops v0.3 database schema
CREATE TABLE IF NOT EXISTS villas (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  ownership_model TEXT NOT NULL CHECK (ownership_model IN ('owned','fixed_rent','revenue_share')),
  monthly_rent NUMERIC(18,2) NOT NULL DEFAULT 0,
  revenue_share_owner_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue_share_basis TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_contracts (
  id BIGSERIAL PRIMARY KEY,
  villa_id BIGINT NOT NULL REFERENCES villas(id),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('owned','fixed_rent','revenue_share')),
  monthly_rent NUMERIC(18,2),
  owner_share_pct NUMERIC(5,2),
  share_room_revenue_only BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  payment_day SMALLINT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  grace_minutes INTEGER NOT NULL DEFAULT 5,
  flexible BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  villa_id BIGINT REFERENCES villas(id),
  shift_id BIGINT REFERENCES shifts(id),
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  check_in_lat NUMERIC(10,7),
  check_in_lng NUMERIC(10,7),
  check_out_lat NUMERIC(10,7),
  check_out_lng NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'working',
  adjustment_reason TEXT,
  approved_by BIGINT REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  nationality TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id),
  source TEXT NOT NULL,
  campaign TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  assigned_employee_id BIGINT REFERENCES employees(id),
  expected_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_code TEXT UNIQUE NOT NULL,
  villa_id BIGINT NOT NULL REFERENCES villas(id),
  customer_id BIGINT REFERENCES customers(id),
  source TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'confirmed',
  room_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  ota_commission NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(18,2) NOT NULL DEFAULT 0,
  invoice_status TEXT NOT NULL DEFAULT 'undetermined',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id BIGSERIAL PRIMARY KEY,
  villa_id BIGINT NOT NULL REFERENCES villas(id),
  booking_id BIGINT REFERENCES bookings(id),
  task_type TEXT NOT NULL,
  assigned_employee_id BIGINT REFERENCES employees(id),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  min_stock NUMERIC(18,3) NOT NULL DEFAULT 0,
  average_cost NUMERIC(18,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT NOT NULL REFERENCES inventory_items(id),
  villa_id BIGINT REFERENCES villas(id),
  booking_id BIGINT REFERENCES bookings(id),
  movement_type TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL,
  unit_cost NUMERIC(18,2),
  note TEXT,
  movement_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id BIGSERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  villa_id BIGINT REFERENCES villas(id),
  booking_id BIGINT REFERENCES bookings(id),
  category TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  source TEXT,
  payment_method TEXT,
  account_name TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'undetermined',
  due_date DATE,
  paid BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_settlements (
  id BIGSERIAL PRIMARY KEY,
  villa_id BIGINT NOT NULL REFERENCES villas(id),
  month_start DATE NOT NULL,
  room_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_revenue NUMERIC(18,2) NOT NULL DEFAULT 0,
  owner_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
  fixed_rent_payable NUMERIC(18,2) NOT NULL DEFAULT 0,
  operating_expenses NUMERIC(18,2) NOT NULL DEFAULT 0,
  contribution_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(villa_id, month_start)
);

INSERT INTO villas(code,name,ownership_model,monthly_rent,revenue_share_owner_pct,revenue_share_basis)
VALUES
 ('NHAN','Nhàn','revenue_share',0,50,'room_revenue_only'),
 ('SOL','SOL','fixed_rent',50000000,0,NULL),
 ('SAM','SAM','owned',0,0,NULL),
 ('GIO','Gió','owned',0,0,NULL),
 ('NANG','Nắng','fixed_rent',25000000,0,NULL),
 ('TIM','Tim','owned',0,0,NULL)
ON CONFLICT (code) DO UPDATE SET
 name=EXCLUDED.name,
 ownership_model=EXCLUDED.ownership_model,
 monthly_rent=EXCLUDED.monthly_rent,
 revenue_share_owner_pct=EXCLUDED.revenue_share_owner_pct,
 revenue_share_basis=EXCLUDED.revenue_share_basis;
