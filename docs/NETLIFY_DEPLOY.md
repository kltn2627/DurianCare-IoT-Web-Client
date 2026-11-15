# Deploy Web Client lên Netlify (CI/CD bằng GitHub Actions)

Site hiện có: project **`leafy-tulumba-63cf69`**, domain **https://duriancare.io.vn**, Project ID (Site ID) `f16e2d39-72a3-46e9-addf-6159fe0b339a`.

## 1. Luồng CI/CD

```
Pull request vào dev/main ─► GitHub Actions "Web CI" (.github/workflows/ci.yml)
                              job verify: lint → typecheck → test → build
                              job deploy: Deploy Preview  https://pr-<số>--leafy-tulumba-63cf69.netlify.app
Push/merge vào main ───────► job verify → job deploy --prod ─► https://duriancare.io.vn
```

- Job **deploy** chỉ chạy khi **verify xanh**, nên code lỗi không lên Production.
- Job deploy dùng `netlify-cli` để build bằng Next.js runtime của Netlify, đọc biến môi trường từ Netlify (mục 3), rồi upload.
- Khi chưa có 2 secret ở mục 2, job deploy chỉ in thông báo và bỏ qua. CI không bị đỏ.
- PR từ fork không có secret nên không deploy, để tránh lộ token.

## 2. Bạn tự làm: tạo Secrets trên GitHub

### 2.1. Lấy Netlify Personal Access Token
1. Netlify → avatar góc phải → **User settings → Applications → Personal access tokens → New access token**.
2. **Description:** `github-actions-duriancare-web`. Chọn **Expiration** (ví dụ 1 năm).
3. Bấm **Generate token** và **copy ngay**, vì token chỉ hiện một lần. Không dán token vào chat, code hay issue.

### 2.2. Thêm 2 secret vào repo `kltn2627/DurianCare-IoT-Web-Client`
GitHub → repo → **Settings → Secrets and variables → Actions → tab Secrets → New repository secret**:

| Name | Secret |
|---|---|
| `NETLIFY_AUTH_TOKEN` | token vừa tạo ở 2.1 |
| `NETLIFY_SITE_ID` | `f16e2d39-72a3-46e9-addf-6159fe0b339a` |

Tên phải viết đúng hoa thường như trên. Repo nằm trong organization, nên cần quyền **Admin** của repo mới thấy mục Secrets.

### 2.3. Tắt build phía Netlify để không bị deploy hai lần
Sau khi thêm secret, Netlify đang **tự build mỗi lần push** (Git integration). Nếu giữ nguyên, mỗi lần merge sẽ có hai bản build. Để GitHub Actions là nơi deploy duy nhất:

Netlify → project → **Project configuration → Developer settings → Build settings → Configure → Build status: Stopped builds → Save**.

Repo vẫn liên kết với Netlify, chỉ là Netlify không tự build nữa. Nếu muốn quay lại cách cũ, chọn **Active builds** và xóa 2 secret.

### 2.4. Kiểm tra
- Mở một PR vào `dev` → tab **Actions** → workflow **Web CI** → job **Deploy to Netlify** → phần **Summary** có link preview.
- Merge vào `main` → job deploy chạy với `--prod` → https://duriancare.io.vn được cập nhật.
- Chạy tay: **Actions → Web CI → Run workflow → branch `main`**.

### 2.5. Bảo vệ nhánh (khuyến nghị)
**Settings → Branches → Add branch ruleset** cho `main` và `dev`:
- *Require a pull request before merging*
- *Require status checks to pass* → chọn **Lint, typecheck, test and build**

## 3. Biến môi trường trên Netlify (đã thiết lập)

Đặt tại **Project configuration → Environment variables**: *All scopes*, cùng một giá trị cho mọi deploy context. Không biến nào là secret.

| Biến | Giá trị hiện tại | Ý nghĩa |
|---|---|---|
| `DURIANCARE_API_URL` | URL Cloudflare Tunnel của Gateway (cổng 8080) | Mọi route `/api/*` của Next.js proxy tới đây (server-side). |
| `IOT_SERVICE_URL` | URL tunnel của IoT Service (3001) | Rewrite `/api/backend/v1/public/*`, `/api/backend/v1/export-assessment/*`. |
| `CHAT_SERVICE_URL` | URL tunnel của Chat Service (3002) | Proxy `/api/chat/*` (server-side). |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | như `CHAT_SERVICE_URL` | Socket.IO chạy trên trình duyệt. |
| `NEXT_PUBLIC_WEB_BASE_URL` | `https://duriancare.io.vn` | Gốc của link trong mã QR cây và lô xuất khẩu. |
| `NEXT_PUBLIC_DEFAULT_IOT_DEVICE_ID` | `esp32-01` | Thiết bị mặc định của biểu đồ cảm biến. |
| `NEXT_PUBLIC_ENABLE_CULTIVATION_MOCK` | `false` | Tắt dữ liệu giả. |

`NODE_VERSION=24` và `NEXT_TELEMETRY_DISABLED=1` nằm trong `netlify.toml`.

Biến `NEXT_PUBLIC_*` được nhúng vào JavaScript lúc build:
- Đổi giá trị thì phải build lại: chạy lại workflow, hoặc dùng **Deploys → Trigger deploy** nếu còn để Netlify build.
- Không bao giờ đặt secret vào biến `NEXT_PUBLIC_*`.

## 4. Cloudflare Quick Tunnel: khi URL thay đổi

Backend chạy trên laptop và được mở ra Internet bằng Cloudflare Quick Tunnel. **URL `*.trycloudflare.com` đổi mỗi lần chạy lại tunnel**, và tunnel chỉ sống khi máy, Docker và lệnh tunnel còn chạy.

Chạy lại tunnel (mỗi lệnh trong một terminal riêng):

```bash
"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --no-autoupdate --url http://localhost:8080
"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --no-autoupdate --url http://localhost:3001
"/c/Program Files (x86)/cloudflared/cloudflared.exe" tunnel --no-autoupdate --url http://localhost:3002
```

Mỗi lệnh in ra một URL `https://<tên>.trycloudflare.com`. Cập nhật 4 biến `DURIANCARE_API_URL`, `IOT_SERVICE_URL`, `CHAT_SERVICE_URL`, `NEXT_PUBLIC_CHAT_SOCKET_URL` trên Netlify, rồi build lại (mục 3).

Muốn URL cố định (ví dụ `api.duriancare.io.vn`): chuyển nameserver của `duriancare.io.vn` từ Long Vân sang Cloudflare và tạo **Named Tunnel**, hoặc deploy Backend lên server có HTTPS.

## 5. Kiểm tra sau deploy

- `https://duriancare.io.vn/login` → đăng nhập.
  - Lỗi **503 "Không thể kết nối đến DurianCare Gateway"**: tunnel đã tắt hoặc URL đã đổi.
  - Lỗi **401**: Backend vẫn kết nối được; kiểm tra lại tài khoản.
- Netlify → **Logs → Functions** để xem lỗi proxy phía server.
- Rollback: Netlify → **Deploys** → chọn bản cũ → **Publish deploy**.
