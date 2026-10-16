# Agronomist Collaboration Survey

Phase: 1 - khảo sát và thiết kế.  
Scope đã kiểm tra: repository `DurianCare-IoT-Web-Client` hiện tại. Không có backend service source code hoặc mobile app source code trong workspace này, nên các phần backend/mobile bên dưới là kết luận từ API client, proxy, tài liệu hiện có và UI mock.

## Tóm tắt hiện trạng

DurianCare Web Client là Next.js App Router, React 19 và Tailwind CSS. Ứng dụng có auth thật qua DurianCare Gateway, một proxy chung `/api/backend/*`, proxy notification riêng `/api/notifications/*`, cultivation API client có fallback mock, và nhiều màn dashboard/chat/ủy quyền còn dùng mock data.

README cũ ghi dự án chưa kết nối backend, nhưng code hiện đã kết nối một phần:

- Auth/session/admin engineer application dùng backend thật.
- Profile dùng `/api/backend/users/me`.
- Notification dùng notification service qua proxy.
- Cultivation calendar/zone gọi backend nhưng fallback về mock khi backend trả `404`, `501`, `503` hoặc network error.
- Chat owner-engineer và màn ủy quyền kỹ sư hiện là frontend state/mock, chưa có API client thật.
- Không tìm thấy mobile frontend trong workspace.

## Thành phần có thể tái sử dụng

### Authentication/User

- `src/lib/auth/server.ts`
  - Quản lý `dc_access_token`, `dc_refresh_token`, `dc_session`, `dc_role`, `durian-role`, `dc_account_status`.
  - Có refresh token rotation, đọc session từ cookie, forward token tới backend.
- `src/lib/auth/client.ts`
  - Có `apiFetch()` dùng `/api/backend/*` để browser gọi backend.
  - Có đăng nhập, đăng ký farmer/engineer, OTP, session, logout, admin review engineer application.
- `src/lib/auth/types.ts`
  - Role hiện có: `ADMIN`, `ENGINEER`, `EXPERT`, `FARMER`, `GUEST`.
  - Dashboard role map: `FARMER -> OWNER`, `ENGINEER/EXPERT -> ENGINEER`.
- `src/proxy.ts`
  - Có route guard theo dashboard role ở frontend middleware.

Tái sử dụng được: session cookie, `apiFetch`, backend proxy, role mapping, engineer registration/application data.

### Farm/Cultivation

- `src/lib/cultivation/types.ts`
  - Có `FarmOption`, `CultivationZone`, `CultivationPlan`, `CultivationActivity`, `ActivityExecution`, `AgriculturalInput`, `HarvestBatch`, `AuditLog`.
- `src/lib/cultivation/client.ts`
  - Gọi endpoint farm, cultivation zones, plans, activities, inputs, lab, harvest, export release, audit.
  - Có endpoint care history và compliance.
- `src/features/cultivation-calendar/*`
  - Có workspace lịch chăm sóc, quyền UI theo role, trạng thái công việc, lịch tuần, nhật ký, phê duyệt hóa chất.
- `src/components/cultivation-zones/*`
  - Có quản lý khu canh tác trên web.
- `docs/cultivation-calendar-web/*`
  - Có tài liệu architecture, API mapping, permissions, test cases cho lịch chăm sóc.

Tái sử dụng được: model canh tác web, lịch chăm sóc, khu canh tác, audit log client, permission labels. Cần mở rộng activity metadata cho nguồn tạo.

### Notification

- `src/lib/notification/client.ts`
  - Có list/unread/count/mark read/delete.
- `src/app/api/notifications/[[...path]]/route.ts`
  - Forward tới `${DURIANCARE_API_URL}/api/v1/notification/*`.
  - Gắn `Authorization: Bearer ...` và `x-auth-user-id`.

Tái sử dụng được: notification proxy, notification list UI, unread count, mark read. Cần thêm event types cho invitation, authorization, activity, irrigation, chat.

### Chat

- `src/components/farmer-chat/*`
  - Có UI chat phía chủ vườn với chế độ AI/EXPERT, conversation list, unread, messages, attachment state.
- `src/components/expert-chat/*`
  - Có UI chat phía kỹ sư và màn admin dispatch.
- `src/constants/durianMockData.js`
  - Có `expertConversations`, `chatDispatchQueue`, engineer profile/mock messages.

Tái sử dụng được: UI layout, reducers, empty/error visual pattern. Cần thay mock bằng API client và model backend.

### Authorization UI mock

- `src/components/dashboard/AuthorizationManager.tsx`
  - Có UI xét duyệt kỹ sư, checkbox quyền điều trị/tưới, thu hồi quyền.
  - Dữ liệu lấy từ `authorizationRequests`, `activeEngineers` trong mock.

Tái sử dụng được: ý tưởng UX cấp quyền/thu hồi, nhưng cần thay bằng model `FarmAuthorization` thật và permission chi tiết.

## Thành phần còn thiếu

### Backend/source code

Không có backend repository trong workspace, nên chưa xác minh trực tiếp được:

- Entity/table hiện có trong DB.
- Có `farm_authorizations` hay chưa.
- Service boundaries thật giữa auth, farm, cultivation, IoT/device, notification, chat.
- Cơ chế permission service layer, audit log persistence, migration tooling.
- Test backend hiện có.

### Web frontend

Thiếu các phần sau:

- API client cho agronomist discovery/invitation/authorization.
- TypeScript model `FarmAuthorization`, `AgronomistInvitation`, `AuthorizedFarm`.
- Màn "Vườn được ủy quyền" cho kỹ sư.
- Trang farm detail dành cho kỹ sư.
- Integration giữa authorization và cultivation/calendar API.
- Badge nguồn tạo công việc: owner/agronomist/system/AI.
- Bộ lọc nguồn tạo trong lịch chăm sóc.
- Chat API client, realtime/SSE/WebSocket integration.
- UI permission denied theo authorization cụ thể.
- Thiết bị tưới thật, command/request flow.

### Mobile frontend

Không tìm thấy mobile app source trong workspace. Cần xác nhận repo mobile riêng nếu có.

## Rủi ro phân quyền

1. Frontend middleware chỉ chặn route theo role tổng quát, không thể thay thế backend authorization.
2. `cultivationClient` hiện fallback mock khi backend thiếu hoặc lỗi `404/501/503`; luồng production cần tắt fallback để tránh tự hiển thị dữ liệu giả.
3. Một số endpoint hiện truyền actor từ client:
   - `approveActivity(id, userId)`
   - `rejectActivity(id, userId, reason)`
   - `submitExportRelease(id, userId)`
   - `approveExportRelease(id, userId)`
   - `releaseExportRelease(id, userId)`
   - `recallExportRelease(id, userId, reason)`
   Backend phải bỏ qua actor từ body và lấy actor từ security context.
4. `createActivity` đang nhận body tự do `Record<string, unknown>`; cần chống mass assignment cho `createdByUserId`, `createdByRole`, `authorizationId`, `creationSource`, `farmId`, `plotId`.
5. UI `AuthorizationManager` chỉ là state client/mock; chưa có bảo vệ IDOR.
6. Chat hiện hoàn toàn mock/reducer client; chưa có participant enforcement, pagination, unread backend, revoke behavior.
7. Notification proxy thêm `x-auth-user-id`; backend không được tin header này nếu header có thể bị giả mạo ngoài gateway. Nên chỉ tin token/security context hoặc header nội bộ đã được gateway ký/xác thực.
8. Engineer và Expert cùng map vào dashboard role `ENGINEER`; backend cần thống nhất role name hoặc normalize rõ.
9. Cultivation area scoping chưa có `allowedCultivationAreaIds`, nên kỹ sư có nguy cơ xem/chỉnh toàn bộ farm nếu chỉ check farm-level.
10. Device/IoT không có client/model thật trong workspace; rủi ro lớn nhất là điều khiển thiết bị trước khi xác minh online/safety/audit.

## API hiện có liên quan

### Auth/User

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/register/engineer`
- `POST /api/auth/otp/verify`
- `POST /api/auth/otp/resend`
- `GET /api/auth/session`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- Admin engineer application:
  - `GET /api/auth/admin/engineer-applications`
  - `GET /api/auth/admin/engineer-applications/{applicationId}`
  - `POST /api/auth/admin/engineer-applications/{applicationId}/approve`
  - `POST /api/auth/admin/engineer-applications/{applicationId}/reject`

### Profile

- `GET /api/backend/users/me`
- `PUT /api/backend/users/me`
- `POST /api/backend/users/me/avatar`
- `DELETE /api/backend/users/me/avatar`

### Farm/Cultivation

Qua `/api/backend/api/v1/*`:

- `GET /api/v1/farms`
- `GET/POST /api/v1/cultivation-zones`
- `GET/PATCH/DELETE /api/v1/cultivation-zones/{id}`
- `GET/POST /api/v1/cultivation-plans`
- `GET /api/v1/cultivation-plans/{id}`
- `GET /api/v1/cultivation-plans/{id}/calendar`
- `GET/POST /api/v1/cultivation-activities`
- `GET/PATCH /api/v1/cultivation-activities/{id}`
- `POST /api/v1/cultivation-activities/{id}/start`
- `POST /api/v1/cultivation-activities/{id}/complete`
- `POST /api/v1/cultivation-activities/{id}/skip`
- `POST /api/v1/cultivation-activities/{id}/cancel`
- `POST /api/v1/cultivation-activities/{id}/approve`
- `POST /api/v1/cultivation-activities/{id}/reject`
- `GET /api/v1/cultivation-seasons/{id}/care-history`
- `GET /api/v1/audit-logs`

### Notification

Qua `/api/notifications/*`:

- `GET /api/v1/notification/notifications`
- `GET /api/v1/notification/notifications/unread`
- `GET /api/v1/notification/notifications/count`
- `PATCH /api/v1/notification/notifications/{id}/read`
- `PATCH /api/v1/notification/notifications/read-all`
- `DELETE /api/v1/notification/notifications/{id}`

## API cần thêm hoặc sửa

### Phase 2 - invitation/authorization backend

- `GET /api/v1/agronomists`
- `POST /api/v1/farms/{farmId}/agronomist-invitations`
- `GET /api/v1/farms/{farmId}/agronomist-authorizations`
- `PATCH /api/v1/farm-authorizations/{authorizationId}`
- `DELETE /api/v1/farm-authorizations/{authorizationId}`
- `GET /api/v1/me/agronomist-invitations`
- `POST /api/v1/agronomist-invitations/{invitationId}/accept`
- `POST /api/v1/agronomist-invitations/{invitationId}/reject`
- `GET /api/v1/me/authorized-farms`

### Phase 3 - authorized farm/cultivation access

- `GET /api/v1/me/authorized-farms/{farmId}`
- `GET /api/v1/me/authorized-farms/{farmId}/cultivation-zones`
- `GET /api/v1/me/authorized-farms/{farmId}/dashboard`
- Extend existing cultivation activity create/update/delete APIs to resolve active authorization from security context.
- Add optional filter to activity list: `creationSource`, `createdByRole`, `authorizationId` where appropriate.

### Phase 4 - irrigation/device

- `GET /api/v1/authorized-farms/{farmId}/irrigation-devices`
- `POST /api/v1/irrigation-devices/{deviceId}/commands`
- If direct control is not safe yet:
  - `POST /api/v1/irrigation-devices/{deviceId}/control-requests`
  - owner approval endpoints for requests.

### Phase 5 - chat

- `GET /api/v1/conversations`
- `POST /api/v1/farms/{farmId}/conversations/agronomist`
- `GET /api/v1/conversations/{conversationId}/messages`
- `POST /api/v1/conversations/{conversationId}/messages`
- `POST /api/v1/conversations/{conversationId}/read`
- `GET /api/v1/conversations/unread-count`
- Realtime channel via existing WebSocket/SSE if backend has one; otherwise REST-first.

### Existing API changes required

- Remove trust in client-supplied actor fields for activity/export approval endpoints.
- Add backend authorization checks to all farm/cultivation/device/chat endpoints.
- Disable mock fallback in production Web FE or gate it behind explicit development flag.
- Add source metadata to `CultivationActivity` response.

## Collection/table cần thêm hoặc migrate

### New

#### `farm_authorizations`

Fields:

- `id`
- `farmId`
- `ownerId`
- `agronomistId`
- `status`: `PENDING`, `ACTIVE`, `REJECTED`, `REVOKED`, `EXPIRED`
- `permissions`: string array
- `allowedCultivationAreaIds`: string array
- `grantedAt`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

Indexes/constraints:

- Unique active authorization per `(farmId, agronomistId)` where `status = ACTIVE`.
- Query index `(ownerId, farmId, status)`.
- Query index `(agronomistId, status, expiresAt)`.

#### `agronomist_invitations`

If not merged into `farm_authorizations`, keep a separate invitation table:

- `id`
- `farmId`
- `ownerId`
- `agronomistId`
- `status`: `PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `EXPIRED`
- `message`
- `initialPermissions`
- `initialAllowedCultivationAreaIds`
- `createdAt`
- `respondedAt`
- `expiresAt`

Constraints:

- No duplicate `PENDING` invitation for `(farmId, agronomistId)`.
- No pending invitation if an `ACTIVE` authorization exists.

#### `authorization_audit_logs`

Can reuse existing audit log if available. Required fields:

- `id`, `action`, `resourceType`, `resourceId`, `farmId`, `actorId`, `actorRole`, `before`, `after`, `metadata`, `createdAt`.

#### `conversations`

- `id`
- `type = OWNER_AGRONOMIST`
- `farmId`
- `authorizationId`
- `participantIds`
- `lastMessageAt`
- `createdAt`
- `updatedAt`

#### `messages`

- `id`
- `conversationId`
- `senderId`
- `senderRole`
- `content`
- `messageType`
- `attachments`
- `sentAt`
- `deliveredAt`
- `readAt`
- `deletedAt`

#### `irrigation_device_commands` or `irrigation_control_requests`

- `id`
- `deviceId`
- `farmId`
- `cultivationAreaId`
- `authorizationId`
- `command`
- `parameters`
- `actorId`
- `actorRole`
- `status`
- `result`
- `createdAt`
- `acknowledgedAt`
- `failedAt`

### Existing migrations

#### `cultivation_activities`

Add:

- `createdByUserId`
- `createdByRole`
- `createdByDisplayName`
- `creationSource`: `OWNER`, `AGRONOMIST`, `SYSTEM`, `AI`, `UNKNOWN`
- `authorizationId`
- `updatedByUserId`
- `updatedByRole`
- `updatedByDisplayName`

Backfill:

- Existing records: `creationSource = OWNER` if `createdBy` maps to a farmer/owner; otherwise `UNKNOWN`.
- Preserve old `createdBy` until all consumers migrate.

## Thiết kế model nghiệp vụ

### Permission enum đề xuất

- `VIEW_FARM`
- `VIEW_CULTIVATION_AREA`
- `VIEW_SENSOR_DATA`
- `VIEW_ALERTS`
- `VIEW_DEVICES`
- `CREATE_CARE_SCHEDULE`
- `UPDATE_CARE_SCHEDULE`
- `DELETE_CARE_SCHEDULE`
- `CONTROL_IRRIGATION`
- `CHAT_WITH_OWNER`

### Authorization rule bắt buộc

Backend service layer phải xác minh:

1. Actor lấy từ JWT/security context.
2. Owner thật sự sở hữu `farmId`.
3. Agronomist nhận lời mời đúng là user đang đăng nhập.
4. Authorization đang `ACTIVE`, chưa `REVOKED`, chưa `EXPIRED`.
5. Permission cụ thể tồn tại trong authorization.
6. Cultivation area thuộc farm và nằm trong `allowedCultivationAreaIds`.
7. Không tin `ownerId`, `agronomistId`, `actorId`, `createdByUserId`, `createdByRole`, `authorizationId` từ request body.

### Activity source rule

Khi owner tạo lịch:

- `createdByUserId = currentUser.id`
- `createdByRole = FARMER/OWNER`
- `createdByDisplayName = snapshot profile name`
- `creationSource = OWNER`
- `authorizationId = null`

Khi agronomist tạo lịch:

- Resolve active authorization by current user + farm + area + permission.
- `createdByUserId = currentUser.id`
- `createdByRole = ENGINEER/EXPERT`
- `createdByDisplayName = snapshot profile name`
- `creationSource = AGRONOMIST`
- `authorizationId = resolvedAuthorization.id`

Khi system/AI tạo lịch:

- `creationSource = SYSTEM` hoặc `AI`
- Actor fields reflect service account/model provenance where supported.

## Kế hoạch triển khai theo phase

### Phase 1 - khảo sát và thiết kế

Status: completed in this document.

Deliverables:

- Survey hiện trạng Web FE/API clients.
- Missing components.
- Risk list.
- Proposed APIs.
- Proposed data model/migration.
- Phase plan.

### Phase 2 - Authorization/invitation Backend

Backend work:

- Implement `FarmAuthorization` and invitation model/migration.
- Add service-layer guards for owner/invitee/permission/scope.
- Add audit logs.
- Add duplicate invitation/authorization constraints.
- Unit tests and integration tests for invite/accept/reject/update/revoke.

Web FE work:

- Add TypeScript types and API client only if backend endpoints are available for smoke testing.
- Keep UI integration for Phase 6 unless backend phase needs an admin test harness.

### Phase 3 - Kỹ sư truy cập farm và lịch chăm sóc

Backend:

- Authorized farm summary/detail endpoints.
- Cultivation list/create/update/delete checks for agronomist.
- Activity source metadata and backfill migration.
- Owner notification when agronomist creates/updates/cancels activity.

Web FE:

- Display source badge in activity cards/tables/detail.
- Add creation source filter.

### Phase 4 - Quyền can thiệp thiết bị tưới

Backend:

- Device access guard by authorization and area.
- Command/request flow with safety validation.
- Audit and notification.
- No fake success before device/MQTT acknowledgement.

Web FE:

- Device list/status and confirmation dialogs.
- Command lifecycle states.

### Phase 5 - Chat Backend, realtime và notification

Backend:

- Conversation/message model.
- Participant guard.
- Cursor pagination, unread count, mark read.
- Revoke/expire behavior.
- Realtime if existing infra supports it; otherwise REST-first.

Web FE:

- Replace mock reducers with API-backed state.
- Add reconnect/disconnected state.

### Phase 6 - Web FE và Mobile FE

Web:

- Owner: agronomist search, invite, authorization list, edit scope/permissions, revoke.
- Agronomist: authorized farms list and farm detail.
- Chat UX, permission denied, loading, empty, error states.
- Remove production mock fallback in connected flows.

Mobile:

- Not in current workspace. Apply equivalent UX/API integration in mobile repo if provided.

### Phase 7 - Security review, regression, E2E, API docs

- IDOR test sweep.
- 401/403/404/409 coverage.
- Cross-farm data leakage tests.
- Regression for existing farmer/admin flows.
- API documentation and manual QA checklist.

## Phase 1 test/validation

Commands to run after this document is added:

- `npm run lint`
- `npm run build`
- `git diff --check`

Expected:

- No production behavior change from Phase 1.
- Only documentation file added for this phase.

## Blockers and questions before Phase 2

1. Need backend repository or confirmation that backend implementation belongs in a separate repo.
2. Need DB technology and migration convention.
3. Need existing farm ownership schema details.
4. Need existing audit log contract and notification event contract.
5. Need decision: role naming should use `ENGINEER`, `EXPERT`, or normalized `AGRONOMIST`.
6. Need confirm whether direct irrigation control exists; if not, Phase 4 should start with owner-approved control requests.
7. Need mobile app repository if mobile implementation is required.
