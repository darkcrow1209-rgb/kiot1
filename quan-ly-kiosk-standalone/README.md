# Quản lý cho thuê kiosk — Bản standalone (tự deploy)

Web app quản lý kiosk cho thuê, **chạy độc lập 100%** — không phụ thuộc nền tảng Muse:
1 server Bun + SQLite, frontend React build sẵn, serve chung trên 1 port.

Tính năng: dashboard, CRUD kiosk / khách hàng / hợp đồng, tiền thuê hàng tháng,
nhập chỉ số điện nước, bill tháng (in / xuất PDF), yêu cầu khách hàng, chi phí phát
sinh, theo dõi thanh toán & công nợ, báo cáo CSV, thông báo, cài đặt.
Giao diện tiếng Việt, responsive desktop + mobile. Dữ liệu demo tự nạp ở lần chạy đầu.

## Chạy local

Cần [Bun](https://bun.sh) >= 1.3.

```bash
bun install
bun run build:client   # build frontend vào client/dist
bun start              # chạy server ở http://localhost:3000
```

Mở http://localhost:3000 — dashboard hiện dữ liệu mẫu ngay.

Biến môi trường:

| Biến       | Mặc định            | Ý nghĩa                              |
|------------|---------------------|--------------------------------------|
| `PORT`     | `3000`              | Port server lắng nghe                |
| `DATA_DIR` | `./data`            | Thư mục chứa `app.db` và PDF bills   |

Database SQLite nằm ở `$DATA_DIR/app.db` — backup file này là backup toàn bộ dữ liệu.

## Cấu trúc

```
├── client/            # Frontend React 19 + Tailwind 4 + Recharts
│   ├── src/App.tsx    # Toàn bộ UI (dashboard + 12 module)
│   ├── src/api.ts     # Gọi API: POST /api/<action>
│   └── build.mjs      # Script build frontend (Bun.build)
├── server/src/
│   ├── index.ts       # Bun.serve: API + serve frontend + PDF
│   ├── actions.ts     # 15 server actions (CRUD, tạo bill, xuất PDF, seed demo)
│   └── schema.ts      # Schema drizzle-orm
├── drizzle/           # SQL migration (tự chạy khi khởi động)
└── Dockerfile         # Build + runtime image
```

API: `POST /api/<tên-action>` với body JSON, ví dụ `getAppData`, `saveKiosk`,
`createMonthlyBills`, `recordPayment`, `generateBillPdf`... (xem `server/src/actions.ts`).

## Deploy

### Cách 1 — Render.com (khuyên dùng, có Blueprint sẵn)

1. Push code lên GitHub.
2. Vào [render.com](https://render.com) → New → Blueprint → chọn repo → Render tự đọc `render.yaml`.
3. Đợi build xong, mở URL Render cấp.

> Lưu ý: gói miễn phí của Render không có disk bền vững — database SQLite sẽ
> **mất khi deploy lại**. Muốn giữ dữ liệu lâu dài: nâng lên gói Starter
> (disk 1GB đã cấu hình sẵn trong `render.yaml`), hoặc dùng Railway bên dưới.

### Cách 2 — Railway.app

1. Push code lên GitHub.
2. Vào [railway.app](https://railway.app) → New Project → Deploy from GitHub → chọn repo.
   Railway tự phát hiện `Dockerfile` và build.
3. Thêm Volume: mở service → Volumes → New Volume → mount path `/data`
   (khớp với `DATA_DIR=/data` trong Dockerfile) để database không mất khi deploy lại.
4. Mở URL ở mục Domains.

### Cách 3 — VPS / máy chủ riêng (Docker)

```bash
docker build -t quan-ly-kiosk .
docker run -d -p 3000:3000 -v kiosk-data:/data --name kiosk-app quan-ly-kiosk
```

Mở `http://<IP-server>:3000`.

### Cách 4 — Chạy trực tiếp bằng Bun (không Docker)

```bash
bun install
bun run build:client
DATA_DIR=/var/lib/kiosk PORT=3000 bun server/src/index.ts
```

## Sao lưu dữ liệu

Copy file `$DATA_DIR/app.db` (và thư mục `$DATA_DIR/pdfs` nếu cần các PDF đã xuất).
Khôi phục: chép đè vào `DATA_DIR` rồi restart server.
