# Quản lý cho thuê kiosk — bản Cloudflare Workers

Frontend React build sẵn → **Workers Static Assets**. API (`POST /api/<action>`) và PDF hóa đơn chạy trong **Worker**.
Dữ liệu nằm trong **Cloudflare D1** (SQLite). Không cần Docker, không cần server.

## Deploy lần đầu (từ máy bạn)

```bash
bun install                                  # (đã xóa bun.lock cũ, lệnh này tạo lại)
bunx wrangler login
bunx wrangler d1 create kiosk-db             # copy "database_id" in ra
```

Mở `wrangler.jsonc`, thay `THAY_BANG_DATABASE_ID_CUA_BAN` bằng database_id vừa copy. Rồi:

```bash
bun run db:migrate:remote                    # tạo bảng trên D1
bun run db:seed:remote                       # (tuỳ chọn) nạp dữ liệu mẫu
bunx wrangler secret put APP_PASSWORD        # đặt mật khẩu đăng nhập (khuyên dùng, dùng ký tự ASCII)
bun run deploy                               # build frontend + deploy Worker
```

Xong sẽ có URL dạng `https://quan-ly-kiosk.<tên-bạn>.workers.dev`.
Khi đã đặt `APP_PASSWORD`, trình duyệt hỏi đăng nhập: tên người dùng nhập gì cũng được, mật khẩu là `APP_PASSWORD`.
**Nếu không đặt, ai có link cũng xem/sửa được toàn bộ dữ liệu.**

## Deploy tự động từ GitHub (Workers Builds)

Dashboard → Workers & Pages → Create → Import a repository → chọn repo, rồi:

- Build command: `bun run build:client`
- Deploy command: `bunx wrangler deploy`
- Biến môi trường build: `BUN_VERSION` = đúng bản Bun bạn dùng ở máy (`bun --version`), để đọc được `bun.lock`.

Migration D1 vẫn chạy tay (`bun run db:migrate:remote`) mỗi khi thêm file SQL mới vào `drizzle/`.

## Chạy thử local

```bash
bun install
bun run db:migrate:local
bun run db:seed:local      # tuỳ chọn
bun run dev                # http://localhost:8787
```

(Muốn thử mật khẩu local: tạo file `.dev.vars` chứa `APP_PASSWORD=abc123`.)

## Khác với bản Docker cũ

- Dữ liệu ở D1, không còn file `app.db`. Backup: `bunx wrangler d1 export kiosk-db --remote --output=backup.sql`.
- PDF hóa đơn dựng tại chỗ mỗi lần bấm tải, không lưu file.
- Không tự nạp dữ liệu mẫu nữa — chạy `db:seed:remote` nếu muốn.
- Đã bỏ `Dockerfile`, `render.yaml`.
