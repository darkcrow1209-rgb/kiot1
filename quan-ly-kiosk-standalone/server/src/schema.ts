import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const kiosks = sqliteTable("kiosks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  area: integer("area").notNull(),
  baseRent: integer("base_rent").notNull(),
  status: text("status").notNull(),
  deposit: integer("deposit").notNull().default(0),
  notes: text("notes").notNull().default(""),
});

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  contact: text("contact").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  notes: text("notes").notNull().default(""),
});

export const contracts = sqliteTable("contracts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  kioskId: integer("kiosk_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  monthlyRent: integer("monthly_rent").notNull(),
  deposit: integer("deposit").notNull().default(0),
  paymentDay: integer("payment_day").notNull().default(5),
  cycle: text("cycle").notNull().default("Hàng tháng"),
  terms: text("terms").notNull().default(""),
  status: text("status").notNull(),
});

export const rentInvoices = sqliteTable("rent_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contractId: integer("contract_id").notNull(),
  period: text("period").notNull(),
  baseRent: integer("base_rent").notNull(),
  otherFee: integer("other_fee").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull(),
});

export const utilityReadings = sqliteTable("utility_readings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kioskId: integer("kiosk_id").notNull(),
  period: text("period").notNull(),
  electricPrevious: integer("electric_previous").notNull(),
  electricCurrent: integer("electric_current").notNull(),
  electricRate: integer("electric_rate").notNull(),
  waterPrevious: integer("water_previous").notNull(),
  waterCurrent: integer("water_current").notNull(),
  waterRate: integer("water_rate").notNull(),
  cleaningFee: integer("cleaning_fee").notNull().default(0),
  managementFee: integer("management_fee").notNull().default(0),
  serviceFee: integer("service_fee").notNull().default(0),
  otherFee: integer("other_fee").notNull().default(0),
});

export const utilityInvoices = sqliteTable("utility_invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  readingId: integer("reading_id").notNull(),
  electricAmount: integer("electric_amount").notNull(),
  waterAmount: integer("water_amount").notNull(),
  total: integer("total").notNull(),
});

export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  kioskId: integer("kiosk_id").notNull(),
  period: text("period").notNull(),
  rent: integer("rent").notNull(),
  electric: integer("electric").notNull().default(0),
  water: integer("water").notNull().default(0),
  managementFee: integer("management_fee").notNull().default(0),
  serviceFee: integer("service_fee").notNull().default(0),
  otherFee: integer("other_fee").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull(),
});

export const billItems = sqliteTable("bill_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billId: integer("bill_id").notNull(),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  billId: integer("bill_id").notNull(),
  paymentDate: text("payment_date").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  notes: text("notes").notNull().default(""),
});

export const customerRequests = sqliteTable("customer_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id").notNull(),
  kioskId: integer("kiosk_id").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  createdDate: text("created_date").notNull(),
  priority: text("priority").notNull(),
  assignee: text("assignee").notNull().default(""),
  status: text("status").notNull(),
  notes: text("notes").notNull().default(""),
  repairCost: integer("repair_cost").notNull().default(0),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  kioskId: integer("kiosk_id"),
  type: text("type").notNull(),
  content: text("content").notNull(),
  amount: integer("amount").notNull(),
  enteredBy: text("entered_by").notNull(),
  payer: text("payer").notNull(),
  addToBill: integer("add_to_bill", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").notNull().default(""),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  organizationName: text("organization_name").notNull(),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  electricRate: integer("electric_rate").notNull(),
  waterRate: integer("water_rate").notNull(),
  managementFee: integer("management_fee").notNull(),
  billDay: integer("bill_day").notNull(),
  dueDay: integer("due_day").notNull(),
});
