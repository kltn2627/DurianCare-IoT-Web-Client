# Deploy Web Client lên Netlify (kèm CI/CD GitHub)

## 1. Cách hệ thống chạy

```
GitHub (kltn2627/DurianCare-IoT-Web-Client)
  ├─ Pull request vào dev/main ──► GitHub Actions "Web CI" (.github/workflows/ci.yml)
  │                                lint → typecheck → test → build  (cổng chặn merge)
  └─ Push/merge vào main ────────► Netlify tự build + deploy Production
     Pull request ───────────────► Netlify tạo Deploy Preview (URL riêng cho từng PR)
```

- **CI**: GitHub Actions kiểm tra mọi PR. Workflow đã có sẵn và không cần secret.
- **CD**: Netlify kết nối thẳng với repo GitHub. Mỗi lần `main` thay đổi, Netlify build theo `netlify.toml` rồi deploy.
- Không cần token Netlify trong GitHub, vì Netlify tự lấy code qua GitHub App.

> **Điều kiện bắt buộc:** Web trên Netlify gọi Backend từ **server của Netlify**, không phải từ máy bạn.
> `http://localhost:8080` sẽ **không** hoạt động. Gateway (và Chat Service) phải có URL **HTTPS công khai**, ví dụ:
> - Backend deploy lên VPS hoặc cloud, hoặc
> - tạm thời mở Gateway bằng tunnel: `cloudflared tunnel --url http://localhost:8080` (Cloudflare Quick Tunnel), hoặc `ngrok http 8080`.
>
> URL tunnel miễn phí đổi sau mỗi lần chạy lại, nên phải cập nhật biến môi trường và deploy lại.

## 2. Tạo site trên Netlify (làm một lần)

1. Đăng nhập <https://app.netlify.com> bằng GitHub.
2. Chọn **Add new project → Import an existing project → GitHub**.
3. Cấp quyền Netlify GitHub App cho tổ chức `kltn2627` (chỉ cần repo `DurianCare-IoT-Web-Client`).
4. Chọn repo **DurianCare-IoT-Web-Client**:
   - **Branch to deploy:** `main`
   - **Base directory:** để trống
   - **Build command / Publish directory:** để mặc định, vì Netlify đọc từ `netlify.toml` (`npm run build`, `.next`)
5. Trước khi bấm **Deploy**, mở **Add environment variables** và nhập các biến ở mục 3. Có thể nhập sau trong **Project configuration → Environment variables**.
6. Bấm **Deploy**. Xem log trong **Deploys**. Lần đầu mất khoảng 3–5 phút.
7. Tùy chọn: đổi tên site trong **Project configuration → General → Project details → Change project name**, để có URL dạng `https://duriancare.netlify.app`.

## 3. Biến môi trường trên Netlify

Vào **Project configuration → Environment variables → Add a variable → Add a single variable**.
Với mỗi biến: **Scopes** = *All scopes* (hoặc tối thiểu *Builds* + *Functions*); **Values** = *Same value for all deploy contexts*.
Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc build, nên **sau khi đổi phải deploy lại** (**Deploys → Trigger deploy → Deploy project without cache**).

| Biến | Bắt buộc | Giá trị ví dụ | Dùng ở đâu |
|---|---|---|---|
| `DURIANCARE_API_URL` | **Có** | `https://api.duriancare.example.com` | URL công khai của API Gateway (cổng 8080). Mọi route `/api/*` của Next.js proxy qua đây. Không có `/` ở cuối. |
| `IOT_SERVICE_URL` | Có, nếu dùng trang xuất khẩu/truy xuất công khai | `https://iot.duriancare.example.com` | Rewrite `/api/backend/v1/public/*` và `/api/backend/v1/export-assessment/*` trong `next.config.ts`. |
| `CHAT_SERVICE_URL` | Có, nếu dùng chat | `https://chat.duriancare.example.com` | Proxy `/api/chat/*` phía server. |
| `DURIANCARE_CHAT_SERVICE_URL` | Không | như trên | Tên dự phòng, chỉ dùng khi không có `CHAT_SERVICE_URL`. Chỉ cần một trong hai. |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | Có, nếu dùng chat realtime | `https://chat.duriancare.example.com` | Socket.IO chạy **trên trình duyệt**, nên phải là URL HTTPS mà trình duyệt truy cập được. |
| `NEXT_PUBLIC_WEB_BASE_URL` | Nên có | `https://duriancare.netlify.app` | Tạo link trong mã QR của cây và lô xuất khẩu. Nếu bỏ trống, app lấy origin hiện tại. |
| `NEXT_PUBLIC_DEFAULT_IOT_DEVICE_ID` | Không | `esp32-01` | Thiết bị mặc định của biểu đồ cảm biến. |
| `NEXT_PUBLIC_ENABLE_CULTIVATION_MOCK` | Không | `false` | Chỉ đặt `true` khi demo bằng dữ liệu giả. **Production để `false` hoặc không tạo.** |

`NODE_VERSION=24` và `NEXT_TELEMETRY_DISABLED=1` đã có trong `netlify.toml`, không cần tạo trên giao diện.

Quy tắc an toàn:
- **Không** đặt secret (JWT secret, mật khẩu DB, API key) vào biến `NEXT_PUBLIC_*`, vì chúng hiện công khai trong JavaScript.
- Web Client không cần JWT secret hay mật khẩu DB. Các giá trị đó chỉ nằm ở Backend.
- Không commit file `.env`; file này đã có trong `.gitignore`.

Có thể nhập bằng CLI thay cho giao diện, sau khi chạy `npx netlify-cli login` và `npx netlify-cli link`:

```bash
npx netlify-cli env:set DURIANCARE_API_URL https://api.duriancare.example.com
```

## 4. Backend phải cho phép domain Netlify

- Cookie đăng nhập do route `/api/auth/*` của Next.js đặt trên domain Netlify, nên trình duyệt không gọi thẳng Gateway (trừ Socket.IO chat).
- Với chat realtime, Chat Service cần cho phép CORS và Socket.IO origin `https://<tên-site>.netlify.app`.
- Nếu Gateway chạy sau tunnel, cần bật HTTPS, vì Netlify chặn mixed content khi trình duyệt gọi `http://`.

## 5. Bảo vệ nhánh trên GitHub (khuyến nghị)

Repo → **Settings → Branches → Add branch ruleset** (hoặc *Branch protection rule*) cho `main` và `dev`:
- **Require a pull request before merging**
- **Require status checks to pass** → chọn **Lint, typecheck, test and build** (job của *Web CI*)
- (Tùy chọn) thêm check **netlify/…/deploy-preview** để PR chỉ merge khi Deploy Preview build thành công.

## 6. Quy trình phát hành

1. Làm việc trên nhánh tính năng → mở PR vào `dev` → CI xanh → merge.
2. Mở PR `dev` → `main` → CI xanh, Deploy Preview xanh, kiểm tra trên URL preview → merge.
3. Netlify tự deploy `main` lên Production. Nếu cần rollback: **Deploys** → chọn bản cũ → **Publish deploy**.

## 7. Kiểm tra sau khi deploy

- Mở `https://<tên-site>.netlify.app/login` → đăng nhập. Nếu thất bại, kiểm tra `DURIANCARE_API_URL` và việc Gateway có truy cập được từ Internet hay không (`curl https://<gateway>/actuator/health`).
- **Logs → Functions** trên Netlify hiển thị lỗi proxy phía server (timeout, 502).
- Quét QR của một cây: link phải bắt đầu bằng `NEXT_PUBLIC_WEB_BASE_URL`.
