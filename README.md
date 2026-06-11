# DurianCare IoT Web Client

Giao diện quản lý trang trại sầu riêng thông minh được xây dựng bằng Next.js App Router, React và Tailwind CSS.

## Routes

- `/login`: đăng nhập và chuyển hướng theo quyền
- `/dashboard/client`: dashboard chủ trang trại
- `/dashboard/client/calendar`: lịch canh tác, vật tư và xác nhận IoT
- `/dashboard/client/chat`: cổng chat kép AI và Kỹ sư dành cho chủ vườn
- `/dashboard/client/knowledge`: kho cẩm nang VietGAP dành cho chủ vườn
- `/dashboard/client/knowledge/[slug]`: trang đọc chi tiết bài viết
- `/dashboard/admin`: dashboard quản trị viên và kỹ sư
- `/dashboard/admin/knowledge`: quản lý bài viết và thư viện kiến thức nông nghiệp
- `/dashboard/admin/expert-chat`: bảng điều phối của Admin hoặc workspace chat của Kỹ sư theo quyền
- `/profile`: hồ sơ cá nhân theo quyền đăng nhập
- `/traceability/DC-2026-DONA-018`: trang truy xuất công khai

## Tài khoản mock

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| OWNER | `owner@duriancare.vn` | `123456` |
| ADMIN | `admin@duriancare.vn` | `123456` |
| ENGINEER | `engineer@duriancare.vn` | `123456` |

Toàn bộ dữ liệu nghiệp vụ nằm tại `src/constants/durianMockData.js`. Dự án chưa thực hiện kết nối backend.

## Khởi chạy

```bash
npm install
npm run dev
```

## Kiểm tra

```bash
npm run lint
npm run build
```
