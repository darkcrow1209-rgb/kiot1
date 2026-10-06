// Standalone server actions (no platform SDK).
// Each action: { schema, handler } — validated and dispatched by server/src/index.ts
// via POST /api/<name>. SQLite access through drizzle-orm/bun-sqlite.
import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import * as schema from "./schema";

export type Db = BunSQLiteDatabase<typeof schema>;
type Handler = (db: Db, args: any) => Promise<any>;

const resultResponse = z.object({ ok: z.boolean(), message: z.string() });
const kioskInput = z.object({ id: z.number().optional(), code: z.string().min(1), name: z.string().min(1), location: z.string().min(1), area: z.number().int().positive(), baseRent: z.number().int().nonnegative(), status: z.string(), deposit: z.number().int().nonnegative(), notes: z.string() });
const customerInput = z.object({ id: z.number().optional(), name: z.string().min(1), brand: z.string().min(1), phone: z.string().min(1), email: z.string(), address: z.string(), contact: z.string(), taxId: z.string(), notes: z.string() });
const contractInput = z.object({ id: z.number().optional(), customerId: z.number().int().positive(), kioskId: z.number().int().positive(), startDate: z.string(), endDate: z.string(), monthlyRent: z.number().int().nonnegative(), deposit: z.number().int().nonnegative(), paymentDay: z.number().int().min(1).max(28), cycle: z.string(), terms: z.string(), status: z.string() });

function ascii(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/Đ/g, "D").replace(/đ/g, "d").replace(/[^\x20-\x7E]/g, "");
}
function pdfEscape(text: string) { return ascii(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function simplePdf(lines: string[]) {
  const body = lines.map((line, i) => `BT /F1 ${i === 0 ? 18 : 11} Tf 48 ${790 - i * 25} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj",
    `4 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (const obj of objects) { offsets.push(pdf.length); pdf += `${obj}\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function pdfDir() {
  const dir = join(process.env.DATA_DIR ?? join(process.cwd(), "data"), "pdfs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function getAppData(db: Db) {
  const [kiosks, customers, contracts, utilityReadings, bills, payments, requests, expenses, notifications, settingRows] = await Promise.all([
    db.select().from(schema.kiosks).orderBy(asc(schema.kiosks.code)), db.select().from(schema.customers).orderBy(asc(schema.customers.name)),
    db.select().from(schema.contracts).orderBy(desc(schema.contracts.endDate)), db.select().from(schema.utilityReadings).orderBy(desc(schema.utilityReadings.period)),
    db.select().from(schema.bills).orderBy(desc(schema.bills.period)), db.select().from(schema.payments).orderBy(desc(schema.payments.paymentDate)),
    db.select().from(schema.customerRequests).orderBy(desc(schema.customerRequests.createdDate)), db.select().from(schema.expenses).orderBy(desc(schema.expenses.date)),
    db.select().from(schema.notifications).orderBy(desc(schema.notifications.date)), db.select().from(schema.settings).limit(1),
  ]);
  return { kiosks, customers, contracts, utilityReadings, bills, payments, requests, expenses, notifications, settings: settingRows[0] ?? null };
}

/** Seed demo data on first boot (runs once, when the kiosks table is empty). */
export async function seedDemo(db: Db): Promise<void> {
  const existing = await db.select({ id: schema.kiosks.id }).from(schema.kiosks).limit(1);
  if (existing.length) return;
  const kioskRows = [
    ["A01","Kiosk A01","Tầng trệt · Cổng Đông",18,12000000,"Đang cho thuê"],["A02","Kiosk A02","Tầng trệt · Cổng Đông",20,13500000,"Đang cho thuê"],
    ["A03","Kiosk A03","Tầng trệt · Sảnh chính",24,16000000,"Đang cho thuê"],["B01","Kiosk B01","Tầng 1 · Khu ẩm thực",30,18500000,"Đang cho thuê"],
    ["B02","Kiosk B02","Tầng 1 · Khu ẩm thực",28,17500000,"Đang cho thuê"],["B03","Kiosk B03","Tầng 1 · Khu dịch vụ",22,14500000,"Đang cho thuê"],
    ["C01","Kiosk C01","Tầng 2 · Hành lang Bắc",20,11000000,"Còn trống"],["C02","Kiosk C02","Tầng 2 · Hành lang Bắc",20,11000000,"Còn trống"],
    ["C03","Kiosk C03","Tầng 2 · Hành lang Nam",25,12500000,"Đang bảo trì"],["D01","Kiosk D01","Tầng trệt · Cổng Tây",16,10500000,"Còn trống"],
  ];
  await db.insert(schema.kiosks).values(kioskRows.map((r) => ({ code:String(r[0]), name:String(r[1]), location:String(r[2]), area:Number(r[3]), baseRent:Number(r[4]), status:String(r[5]), deposit:Number(r[4])*2, notes:"Dữ liệu mẫu" })));
  await db.insert(schema.customers).values([
    {name:"Nguyễn Minh Anh",brand:"Lá Coffee",phone:"0901 234 567",email:"minhanh@example.vn",address:"Quận 1, TP.HCM",contact:"Minh Anh",taxId:"",notes:""},
    {name:"Trần Quốc Bảo",brand:"Bếp Mộc",phone:"0902 345 678",email:"quocbao@example.vn",address:"Quận 3, TP.HCM",contact:"Quốc Bảo",taxId:"",notes:""},
    {name:"Lê Thu Hà",brand:"Nhà Len",phone:"0903 456 789",email:"thuha@example.vn",address:"Bình Thạnh, TP.HCM",contact:"Thu Hà",taxId:"",notes:""},
    {name:"Phạm Gia Huy",brand:"Tech Corner",phone:"0904 567 890",email:"giahuy@example.vn",address:"Thủ Đức, TP.HCM",contact:"Gia Huy",taxId:"",notes:""},
    {name:"Võ Thanh Mai",brand:"Mộc Beauty",phone:"0905 678 901",email:"thanhmai@example.vn",address:"Quận 7, TP.HCM",contact:"Thanh Mai",taxId:"",notes:""},
    {name:"Đặng Hoàng Nam",brand:"Nomad Goods",phone:"0906 789 012",email:"hoangnam@example.vn",address:"Phú Nhuận, TP.HCM",contact:"Hoàng Nam",taxId:"",notes:""},
  ]);
  const ks = await db.select().from(schema.kiosks).orderBy(asc(schema.kiosks.id)); const cs = await db.select().from(schema.customers).orderBy(asc(schema.customers.id));
  const starts=["2026-01-01","2026-02-01","2026-03-01","2026-04-01","2026-05-01","2026-06-01"]; const ends=["2026-12-31","2026-11-30","2026-10-25","2027-03-31","2027-04-30","2027-05-31"];
  await db.insert(schema.contracts).values(cs.map((c,i)=>({customerId:c.id,kioskId:ks[i]?.id ?? 1,startDate:starts[i] ?? "2026-01-01",endDate:ends[i] ?? "2026-12-31",monthlyRent:ks[i]?.baseRent ?? 0,deposit:(ks[i]?.baseRent ?? 0)*2,paymentDay:5,cycle:"Hàng tháng",terms:"Thanh toán chuyển khoản trước ngày 05 hàng tháng",status:i===2?"Sắp hết hạn":"Đang hiệu lực"})));
  const periods=["2026-06","2026-07","2026-08","2026-09","2026-10"];
  for (let p=0;p<periods.length;p++) { const period=periods[p] ?? "2026-10"; for(let i=0;i<6;i++){ const kiosk=ks[i]; const customer=cs[i]; if(!kiosk||!customer) continue; const ePrev=1000+i*120+p*80; const eCur=ePrev+75+i*8; const wPrev=180+i*25+p*12; const wCur=wPrev+10+i; const electric=(eCur-ePrev)*3500; const water=(wCur-wPrev)*18000; const total=kiosk.baseRent+electric+water+450000; const isPaid=p<3 || (p===3&&i<3); const partial=p===3&&i===3; const paid=isPaid?total:partial?Math.floor(total*0.65):0; const due=`${period}-05`; const status=isPaid?"Đã thanh toán":partial?"Thanh toán một phần":(period<"2026-10"?"Quá hạn":"Chưa thanh toán");
    await db.insert(schema.utilityReadings).values({kioskId:kiosk.id,period,electricPrevious:ePrev,electricCurrent:eCur,electricRate:3500,waterPrevious:wPrev,waterCurrent:wCur,waterRate:18000,cleaningFee:150000,managementFee:300000,serviceFee:0,otherFee:0});
    await db.insert(schema.bills).values({customerId:customer.id,kioskId:kiosk.id,period,rent:kiosk.baseRent,electric,water,managementFee:300000,serviceFee:150000,otherFee:0,discount:0,total,paidAmount:paid,dueDate:due,status});
  }}
  const billRows=await db.select().from(schema.bills); for(const b of billRows.filter(b=>b.paidAmount>0)){ await db.insert(schema.payments).values({billId:b.id,paymentDate:b.dueDate,amount:b.paidAmount,method:"Chuyển khoản",notes:"Dữ liệu mẫu"}); }
  await db.insert(schema.customerRequests).values([
    {code:"YC-2601",customerId:cs[0]?.id??1,kioskId:ks[0]?.id??1,content:"Ổ cắm phía sau quầy bị chập chờn",type:"Sửa điện",createdDate:"2026-10-04",priority:"Cao",assignee:"Anh Tuấn",status:"Đang xử lý",notes:"",repairCost:0},
    {code:"YC-2602",customerId:cs[3]?.id??1,kioskId:ks[3]?.id??1,content:"Điều hòa không đủ mát vào buổi trưa",type:"Điều hòa",createdDate:"2026-10-05",priority:"Trung bình",assignee:"Chị Linh",status:"Mới",notes:"",repairCost:0},
    {code:"YC-2603",customerId:cs[1]?.id??1,kioskId:ks[1]?.id??1,content:"Thay bóng đèn khu biển hiệu",type:"Thay bóng đèn",createdDate:"2026-09-29",priority:"Thấp",assignee:"Anh Tuấn",status:"Đã hoàn thành",notes:"Đã thay",repairCost:280000},
  ]);
  await db.insert(schema.expenses).values([
    {date:"2026-10-03",kioskId:ks[8]?.id??null,type:"Bảo trì",content:"Sơn lại vách kiosk C03",amount:3200000,enteredBy:"Quản lý",payer:"Chủ mặt bằng",addToBill:false,notes:""},
    {date:"2026-10-05",kioskId:ks[0]?.id??null,type:"Sửa chữa",content:"Kiểm tra ổ cắm điện",amount:350000,enteredBy:"Quản lý",payer:"Khách hàng",addToBill:true,notes:"Sẽ đưa vào bill tháng 10"},
  ]);
  await db.insert(schema.notifications).values([{type:"bill",title:"3 bill tháng 10 chưa thanh toán",date:"2026-10-06",read:false},{type:"contract",title:"Hợp đồng Kiosk A03 sắp hết hạn",date:"2026-10-06",read:false},{type:"request",title:"Có yêu cầu điều hòa mới",date:"2026-10-05",read:false}]);
  await db.insert(schema.settings).values({id:1,organizationName:"Ban quản lý Kiosk Central",address:"TP. Hồ Chí Minh",phone:"028 7300 8899",email:"quanly@example.vn",electricRate:3500,waterRate:18000,managementFee:300000,billDay:1,dueDay:5});
}

export const actions: Record<string, { schema: z.ZodTypeAny; handler: Handler }> = {
  getAppData: { schema: z.object({}), handler: getAppData },

  saveKiosk: { schema: kioskInput, handler: async (db,args)=>{ const values={code:args.code,name:args.name,location:args.location,area:args.area,baseRent:args.baseRent,status:args.status,deposit:args.deposit,notes:args.notes}; if(args.id) await db.update(schema.kiosks).set(values).where(eq(schema.kiosks.id,args.id)); else await db.insert(schema.kiosks).values(values); return {ok:true,message:"Đã lưu kiosk."}; }},
  deleteKiosk: { schema: z.object({id:z.number()}), handler: async (db,args)=>{ const linked=await db.select().from(schema.contracts).where(eq(schema.contracts.kioskId,args.id)).limit(1); if(linked.length) return {ok:false,message:"Không thể xóa kiosk đã có hợp đồng."}; await db.delete(schema.kiosks).where(eq(schema.kiosks.id,args.id)); return {ok:true,message:"Đã xóa kiosk."}; }},
  saveCustomer: { schema: customerInput, handler: async (db,args)=>{ const values={name:args.name,brand:args.brand,phone:args.phone,email:args.email,address:args.address,contact:args.contact,taxId:args.taxId,notes:args.notes}; if(args.id) await db.update(schema.customers).set(values).where(eq(schema.customers.id,args.id)); else await db.insert(schema.customers).values(values); return {ok:true,message:"Đã lưu khách hàng."}; }},
  deleteCustomer: { schema: z.object({id:z.number()}), handler: async (db,args)=>{ const linked=await db.select().from(schema.contracts).where(eq(schema.contracts.customerId,args.id)).limit(1); if(linked.length) return {ok:false,message:"Không thể xóa khách hàng đã có hợp đồng."}; await db.delete(schema.customers).where(eq(schema.customers.id,args.id)); return {ok:true,message:"Đã xóa khách hàng."}; }},
  saveContract: { schema: contractInput, handler: async (db,args)=>{ const values={customerId:args.customerId,kioskId:args.kioskId,startDate:args.startDate,endDate:args.endDate,monthlyRent:args.monthlyRent,deposit:args.deposit,paymentDay:args.paymentDay,cycle:args.cycle,terms:args.terms,status:args.status}; if(args.id) await db.update(schema.contracts).set(values).where(eq(schema.contracts.id,args.id)); else await db.insert(schema.contracts).values(values); await db.update(schema.kiosks).set({status:"Đang cho thuê"}).where(eq(schema.kiosks.id,args.kioskId)); return {ok:true,message:"Đã lưu hợp đồng."}; }},
  deleteContract: { schema: z.object({id:z.number()}), handler: async (db,args)=>{ await db.delete(schema.contracts).where(eq(schema.contracts.id,args.id)); return {ok:true,message:"Đã xóa hợp đồng."}; }},

  addUtilityReading: { schema: z.object({kioskId:z.number(),period:z.string(),electricPrevious:z.number(),electricCurrent:z.number(),electricRate:z.number(),waterPrevious:z.number(),waterCurrent:z.number(),waterRate:z.number(),cleaningFee:z.number(),managementFee:z.number(),serviceFee:z.number(),otherFee:z.number()}), handler: async (db,args)=>{ if(args.electricCurrent<args.electricPrevious||args.waterCurrent<args.waterPrevious) return {ok:false,message:"Chỉ số kỳ này không được nhỏ hơn kỳ trước."}; const existing=await db.select().from(schema.utilityReadings).where(and(eq(schema.utilityReadings.kioskId,args.kioskId),eq(schema.utilityReadings.period,args.period))).limit(1); if(existing.length) return {ok:false,message:"Kiosk đã có chỉ số cho kỳ này."}; await db.insert(schema.utilityReadings).values(args); return {ok:true,message:"Đã lưu chỉ số điện nước."}; }},
  createMonthlyBills: { schema: z.object({period:z.string()}), handler: async (db,args)=>{ const contracts=await db.select().from(schema.contracts).where(eq(schema.contracts.status,"Đang hiệu lực")); let created=0; for(const c of contracts){ const old=await db.select().from(schema.bills).where(and(eq(schema.bills.kioskId,c.kioskId),eq(schema.bills.period,args.period))).limit(1); if(old.length) continue; const readings=await db.select().from(schema.utilityReadings).where(and(eq(schema.utilityReadings.kioskId,c.kioskId),eq(schema.utilityReadings.period,args.period))).limit(1); const r=readings[0]; const electric=r?(r.electricCurrent-r.electricPrevious)*r.electricRate:0; const water=r?(r.waterCurrent-r.waterPrevious)*r.waterRate:0; const management=r?.managementFee??0; const service=(r?.serviceFee??0)+(r?.cleaningFee??0); const other=r?.otherFee??0; const total=c.monthlyRent+electric+water+management+service+other; await db.insert(schema.bills).values({customerId:c.customerId,kioskId:c.kioskId,period:args.period,rent:c.monthlyRent,electric,water,managementFee:management,serviceFee:service,otherFee:other,discount:0,total,paidAmount:0,dueDate:`${args.period}-${String(c.paymentDay).padStart(2,"0")}`,status:"Chưa thanh toán"}); created++; } return {ok:true,message:`Đã tạo ${created} bill mới cho kỳ ${args.period}.`}; }},
  recordPayment: { schema: z.object({billId:z.number(),amount:z.number().positive(),paymentDate:z.string(),method:z.string(),notes:z.string()}), handler: async (db,args)=>{ const rows=await db.select().from(schema.bills).where(eq(schema.bills.id,args.billId)).limit(1); const bill=rows[0]; if(!bill) return {ok:false,message:"Không tìm thấy bill."}; const newPaid=Math.min(bill.total,bill.paidAmount+args.amount); await db.insert(schema.payments).values(args); await db.update(schema.bills).set({paidAmount:newPaid,status:newPaid>=bill.total?"Đã thanh toán":"Thanh toán một phần"}).where(eq(schema.bills.id,args.billId)); return {ok:true,message:"Đã ghi nhận thanh toán."}; }},
  saveRequest: { schema: z.object({customerId:z.number(),kioskId:z.number(),content:z.string().min(1),type:z.string(),priority:z.string(),assignee:z.string(),status:z.string(),notes:z.string(),repairCost:z.number()}), handler: async (db,args)=>{ const count=await db.select({id:schema.customerRequests.id}).from(schema.customerRequests); await db.insert(schema.customerRequests).values({...args,code:`YC-${String(count.length+2601)}`,createdDate:new Date().toISOString().slice(0,10)}); return {ok:true,message:"Đã tạo yêu cầu."}; }},
  updateRequestStatus: { schema: z.object({id:z.number(),status:z.string()}), handler: async (db,args)=>{ await db.update(schema.customerRequests).set({status:args.status}).where(eq(schema.customerRequests.id,args.id)); return {ok:true,message:"Đã cập nhật yêu cầu."}; }},
  saveExpense: { schema: z.object({date:z.string(),kioskId:z.number().nullable(),type:z.string(),content:z.string().min(1),amount:z.number().nonnegative(),enteredBy:z.string(),payer:z.string(),addToBill:z.boolean(),notes:z.string()}), handler: async (db,args)=>{ await db.insert(schema.expenses).values(args); return {ok:true,message:"Đã lưu chi phí."}; }},
  saveSettings: { schema: z.object({organizationName:z.string(),address:z.string(),phone:z.string(),email:z.string(),electricRate:z.number(),waterRate:z.number(),managementFee:z.number(),billDay:z.number(),dueDay:z.number()}), handler: async (db,args)=>{ await db.insert(schema.settings).values({id:1,...args}).onConflictDoUpdate({target:schema.settings.id,set:args}); return {ok:true,message:"Đã lưu cài đặt."}; }},
  generateBillPdf: { schema: z.object({billId:z.number()}), handler: async (db,args)=>{ const bills=await db.select().from(schema.bills).where(eq(schema.bills.id,args.billId)).limit(1); const bill=bills[0]; if(!bill) return {ok:false,url:"",filename:"",message:"Không tìm thấy bill."}; const customer=(await db.select().from(schema.customers).where(eq(schema.customers.id,bill.customerId)).limit(1))[0]; const kiosk=(await db.select().from(schema.kiosks).where(eq(schema.kiosks.id,bill.kioskId)).limit(1))[0]; const lines=["HOA DON KIOSK",`Ky thanh toan: ${bill.period}`,`Khach hang: ${customer?.name??""} - ${customer?.brand??""}`,`Kiosk: ${kiosk?.code??""}`,`Tien thue: ${bill.rent.toLocaleString("vi-VN")} VND`,`Tien dien: ${bill.electric.toLocaleString("vi-VN")} VND`,`Tien nuoc: ${bill.water.toLocaleString("vi-VN")} VND`,`Phi quan ly & dich vu: ${(bill.managementFee+bill.serviceFee+bill.otherFee).toLocaleString("vi-VN")} VND`,`Tong thanh toan: ${bill.total.toLocaleString("vi-VN")} VND`,`Da thanh toan: ${bill.paidAmount.toLocaleString("vi-VN")} VND`,`Han thanh toan: ${bill.dueDate}`]; const filename=`bill-${bill.id}-${bill.period}.pdf`; await Bun.write(join(pdfDir(), filename), simplePdf(lines)); return {ok:true,url:`/files/bills/${filename}`,filename:`bill-${kiosk?.code??bill.id}-${bill.period}.pdf`,message:"Đã tạo PDF."}; }},
};
