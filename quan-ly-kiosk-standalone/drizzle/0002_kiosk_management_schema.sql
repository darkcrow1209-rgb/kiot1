DROP TABLE entries;
--> statement-breakpoint
CREATE TABLE kiosks (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, location TEXT NOT NULL, area INTEGER NOT NULL, base_rent INTEGER NOT NULL, status TEXT NOT NULL, deposit INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, brand TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '', tax_id TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE contracts (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, kiosk_id INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, monthly_rent INTEGER NOT NULL, deposit INTEGER NOT NULL DEFAULT 0, payment_day INTEGER NOT NULL DEFAULT 5, cycle TEXT NOT NULL DEFAULT 'Hàng tháng', terms TEXT NOT NULL DEFAULT '', status TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX contracts_active_kiosk_period ON contracts(kiosk_id, start_date, end_date);
--> statement-breakpoint
CREATE TABLE rent_invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id INTEGER NOT NULL, period TEXT NOT NULL, base_rent INTEGER NOT NULL, other_fee INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL, due_date TEXT NOT NULL, status TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX rent_period_contract ON rent_invoices(contract_id, period);
--> statement-breakpoint
CREATE TABLE utility_readings (id INTEGER PRIMARY KEY AUTOINCREMENT, kiosk_id INTEGER NOT NULL, period TEXT NOT NULL, electric_previous INTEGER NOT NULL, electric_current INTEGER NOT NULL, electric_rate INTEGER NOT NULL, water_previous INTEGER NOT NULL, water_current INTEGER NOT NULL, water_rate INTEGER NOT NULL, cleaning_fee INTEGER NOT NULL DEFAULT 0, management_fee INTEGER NOT NULL DEFAULT 0, service_fee INTEGER NOT NULL DEFAULT 0, other_fee INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE UNIQUE INDEX utility_period_kiosk ON utility_readings(kiosk_id, period);
--> statement-breakpoint
CREATE TABLE utility_invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, reading_id INTEGER NOT NULL, electric_amount INTEGER NOT NULL, water_amount INTEGER NOT NULL, total INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE bills (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, kiosk_id INTEGER NOT NULL, period TEXT NOT NULL, rent INTEGER NOT NULL, electric INTEGER NOT NULL DEFAULT 0, water INTEGER NOT NULL DEFAULT 0, management_fee INTEGER NOT NULL DEFAULT 0, service_fee INTEGER NOT NULL DEFAULT 0, other_fee INTEGER NOT NULL DEFAULT 0, discount INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL, paid_amount INTEGER NOT NULL DEFAULT 0, due_date TEXT NOT NULL, status TEXT NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX bill_period_kiosk ON bills(kiosk_id, period);
--> statement-breakpoint
CREATE TABLE bill_items (id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER NOT NULL, label TEXT NOT NULL, amount INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE payments (id INTEGER PRIMARY KEY AUTOINCREMENT, bill_id INTEGER NOT NULL, payment_date TEXT NOT NULL, amount INTEGER NOT NULL, method TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE customer_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, customer_id INTEGER NOT NULL, kiosk_id INTEGER NOT NULL, content TEXT NOT NULL, type TEXT NOT NULL, created_date TEXT NOT NULL, priority TEXT NOT NULL, assignee TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', repair_cost INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, kiosk_id INTEGER, type TEXT NOT NULL, content TEXT NOT NULL, amount INTEGER NOT NULL, entered_by TEXT NOT NULL, payer TEXT NOT NULL, add_to_bill INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '');
--> statement-breakpoint
CREATE TABLE notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE settings (id INTEGER PRIMARY KEY, organization_name TEXT NOT NULL, address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', electric_rate INTEGER NOT NULL, water_rate INTEGER NOT NULL, management_fee INTEGER NOT NULL, bill_day INTEGER NOT NULL, due_day INTEGER NOT NULL);
