# BÁO CÁO NÂNG CẤP HỆ THỐNG FRONTEND DRIVELINKER

> **Thời gian cập nhật:** 03/11/2026  
> **Phiên bản:** v1.2.0-enhanced  
> **Trạng thái Build:** ✅ **PASS (0 Lỗi TypeScript, 0 Lỗi Vite Build)**  
> **Tài liệu tham chiếu:** Kế hoạch nâng cấp và chuẩn hóa hệ thống DriveLinker  

---

## 1. Tổng quan thay đổi

Trong đợt nâng cấp này, toàn bộ mã nguồn Frontend DriveLinker đã được rà soát, khắc phục các lỗi biên dịch TypeScript nghiêm ngặt, chuẩn hóa kiến trúc dữ liệu đa doanh nghiệp (Multi-Tenant) và bổ sung các phân hệ nghiệp vụ quan trọng nhằm chuẩn bị cho buổi bảo vệ đồ án:

1. **Chuẩn hóa tầng API & Kiến trúc Core:** Khắc phục lỗi chính tả `axiosClinet.ts`, tạo HTTP Client chuẩn `axiosClient.ts` tự động gắn `Authorization: Bearer` và `X-Tenant-ID`.
2. **Hệ thống Đa ngôn ngữ (i18n):** Tích hợp chuyển đổi song ngữ Tiếng Việt (VI) và Tiếng Anh (EN) thông qua `LanguageContext` và từ điển dịch thuật độc lập, hỗ trợ lưu cấu hình vào `localStorage`.
3. **Phân hệ Quản lý Đội xe (`/fleet`):** Xây dựng trang quản lý phương tiện chuyên biệt với 6 trạng thái chuẩn hóa, bộ chỉ số KPI thời gian thực, bộ lọc thông minh, kiểm định kỹ thuật và kiểm soát an toàn trạng thái xe.
4. **Quản lý Hợp đồng & Cảnh báo Thời hạn:** Tự động tính toán số ngày còn lại của hợp đồng, hiển thị 4 mức trạng thái cảnh báo trực quan (`Còn hiệu lực`, `Sắp hết hạn ≤ 3 ngày`, `Đã hết hạn`, `Đã thu hồi`).
5. **Quy trình Thu hồi xe 3 giai đoạn chặt chẽ:** Kiểm soát nghiêm ngặt từ khâu tạo yêu cầu (`PENDING_RECALL`), bàn giao hiện trường (`RECEIVED`, chuyển xe sang `PENDING_INSPECTION`), đến quyết toán tài chính & nghiệm thu kỹ thuật (`COMPLETED` - ràng buộc bắt buộc `isSettled = true`).
6. **Cơ chế Phê duyệt Đơn giá an toàn:** Kiểm tra chống duyệt trùng (`status !== 'PENDING'`), lưu vết kiểm toán đầy đủ (`approvedBy`, `approvedAt`, `oldPrice`, `newPrice`) và phân quyền rõ ràng giữa Manager và Staff.
7. **Quản lý Tài khoản & Phân quyền Doanh nghiệp:** Bổ sung giao diện quản lý nhân sự tại `/settings`, cho phép tạo mới tài khoản và khóa/mở khóa tài khoản, đồng bộ dữ liệu tức thời với luồng đăng nhập tại `/portal/login`.
8. **Bảo toàn 100% các chức năng cốt lõi:** Tuyệt đối không làm thay đổi hoặc gián đoạn hoạt động của `LiveTracking.tsx`, mô hình AI nhận diện buồn ngủ (`src/AI`), webcam OSD, bản đồ định vị GPS Leaflet, và hợp đồng điện tử E-contract 2 trang A4.

---

## 2. Chi tiết các lỗi đã phát hiện và xử lý

| STT | File | Mã lỗi | Nguyên nhân | Giải pháp xử lý |
|:---:|:---|:---|:---|:---|
| 1 | `src/API/axiosClient.ts` | `TS2307` | Lỗi chính tả tên file cũ `axiosClinet.ts` dẫn tới không tìm thấy module khi import chuẩn | Tạo mới file `axiosClient.ts` hoàn chỉnh dùng Fetch API native; đồng thời cấu hình `axiosClinet.ts` re-export để giữ tương thích ngược 100%. |
| 2 | `AdminDashboard.tsx`, `Analytics.tsx`, `PriceApprovals.tsx`, `Settings.tsx`, `AdminLayout.tsx` | `TS6133` | Khai báo `import React` thừa trong React 18+ với `noUnusedLocals: true` | Loại bỏ các câu lệnh import thừa, làm sạch mã nguồn. |
| 3 | `Analytics.tsx` | `TS6133` | Khai báo `Truck` từ `lucide-react` không sử dụng | Xóa `Truck` khỏi danh sách import. |
| 4 | `VehicleRecallModal.tsx` | `TS6133` | Import thừa `React` và `User` | Dọn dẹp import thừa, giữ nguyên các icon cần thiết. |
| 5 | `ContractManagement.tsx` | `TS6133`, `TS2304` | Import thừa `Calendar`, thiếu icon `X` trong modal sửa giá của Manager | Bổ sung `X`, xóa `Calendar`, xử lý biến `t` từ i18n context. |
| 6 | `CreateContract.tsx` vs `ContractManagement.tsx` | Data Key Conflict | `CreateContract` lưu bản nháp theo `sys_contract_drafts_${tenantId}` trong khi `ContractManagement` đọc `sys_contract_drafts` | Chuẩn hóa toàn hệ thống về khóa `sys_contract_drafts`; bổ sung logic gộp dữ liệu cũ (backward compatibility). |
| 7 | `PriceApprovals.tsx` vs `ContractManagement.tsx` | Storage Key Mismatch | `PriceApprovals` đọc và lưu vào khóa `sys_contracts`, trong khi hợp đồng chính thức lưu ở `sys_e_contracts` | Đồng bộ hóa `PriceApprovals` sử dụng chuẩn `sys_e_contracts`. |
| 8 | `Login.tsx` | `TS2322` | Kiểu dữ liệu `userRoleForTenant` chưa bao gồm trường hợp `undefined` | Cập nhật union type `string | null | undefined`. |
| 9 | `DashboardLayout.tsx` | `TS2353` | Phương thức `createVehicle` gọi với tên thuộc tính cũ | Cập nhật tham số theo đúng interface: `brand`, `model`, `year`, `payload`, `status`. |

---

## 3. Các chức năng mới đã triển khai

### 3.1. Hệ thống Đa ngôn ngữ (i18n)
- **Từ điển:** `src/locales/vi.ts` (Tiếng Việt) và `src/locales/en.ts` (Tiếng Anh) chuẩn hóa các nhóm từ vựng: Điều hướng (`nav`), Đội xe (`fleet`), Hợp đồng (`contracts`), Thu hồi (`recall`), Duyệt giá (`approvals`), Cài đặt (`settings`), Giám sát (`tracking`), Tổng quan (`overview`), Phân tích (`analytics`), Xác thực (`auth`).
- **Context & Hook:** `LanguageContext.tsx` cung cấp hook `useLanguage()` với hàm dịch `t('key')` và `toggleLanguage()`.
- **Giao diện chuyển đổi:** Nút chuyển ngữ trực tiếp trên thanh Header của `DashboardLayout` hiển thị badge `VI` / `EN`.

### 3.2. Quản lý Đội xe Chuyên nghiệp (`/fleet`)
- **Bộ chỉ số KPI:** 6 thẻ trạng thái phương tiện trực quan:
  - Sẵn sàng (`AVAILABLE` - Xanh lá)
  - Đang cho thuê (`RENTED` - Xanh dương)
  - Đã đặt trước (`RESERVED` - Tím)
  - Bảo trì / Sửa chữa (`MAINTENANCE` - Vàng cam)
  - Chờ kiểm định bàn giao (`PENDING_INSPECTION` - Hổ phách)
  - Tạm ngưng hoạt động (`INACTIVE` - Xám)
- **Máy trạng thái phương tiện (Finite State Machine):** Chặn hành vi chuyển đổi trạng thái không hợp lệ. Xe vừa thu hồi từ hợp đồng bắt buộc phải qua trạng thái `PENDING_INSPECTION` (kiểm định kỹ thuật) trước khi được chuyển về `AVAILABLE`.
- **Thao tác quản lý:**
  - Thêm phương tiện mới kèm thông tin tải trọng, năm sản xuất, tài xế phụ trách.
  - Sửa thông tin và cập nhật trạng thái hoạt động.
  - Nghiệm thu kỹ thuật sau khi thu hồi (Chuyển sang Sẵn sàng hoặc Bảo trì có ghi chú).
  - Modal xem chi tiết hồ sơ kỹ thuật xe.

### 3.3. Quy trình Thu hồi Phương tiện 3 Giai đoạn
Tích hợp trực tiếp tại phân hệ Đối tác & Hợp đồng (`/partners`):
1. **Giai đoạn 1 - Tạo yêu cầu thu hồi (`PENDING_RECALL`):** Ghi nhận loại thu hồi (Đúng hạn hoặc Trước hạn), lý do thu hồi, người yêu cầu.
2. **Giai đoạn 2 - Tiếp nhận & Biên bản bàn giao hiện trường (`RECEIVED`):** 
   - Ghi nhận số km trên đồng hồ (ODO), mức nhiên liệu thực tế, tình trạng ngoại quan xe.
   - Xe được tự động chuyển trạng thái sang `PENDING_INSPECTION`.
   - **Đặc biệt:** Cho phép lưu hồ sơ tiếp nhận ngay cả khi các vấn đề công nợ hoặc tranh chấp tài chính chưa xử lý xong.
3. **Giai đoạn 3 - Nghiệm thu kỹ thuật & Quyết toán tài chính (`COMPLETED`):**
   - Ràng buộc nghiêm ngặt: Nút Hoàn tất nghiệm thu chỉ khả dụng khi Quản trị viên kích hoạt xác nhận `Đã hoàn tất thanh toán & quyết toán tài chính (isSettled = true)`.
   - Cập nhật đồng bộ hợp đồng sang `RECALLED` và ghi lịch sử vào `sys_vehicle_recalls`.

### 3.4. Quản lý Tài khoản & Phân quyền Doanh nghiệp
- Bổ sung module tại `/settings` hiển thị danh sách nhân sự của doanh nghiệp hiện tại.
- Phân biệt rõ quyền hạn giữa:
  - `TENANT_ADMIN`: Toàn quyền duyệt đơn giá, sửa cấu hình, thêm/khóa tài khoản nhân viên.
  - `TENANT_STAFF`: Nhân viên vận hành, xem danh sách xe, tạo yêu cầu duyệt giá, lập hợp đồng.
- Nút Thêm tài khoản nhân sự mới kèm kiểm tra chống trùng `username` và `email`.
- Tính năng Khóa / Mở khóa tài khoản nhân sự tức thời.
- Đồng bộ hóa trực tiếp với màn hình Đăng nhập (`/portal/login`).

---

## 4. Danh sách các file đã chỉnh sửa

1. `src/App.tsx`: Bọc `LanguageProvider`, khai báo route `/fleet` và liên kết `FleetManagement`.
2. `src/UI/DashboardLayout.tsx`: Bổ sung menu "Đội xe" (Truck), tích hợp Language Switcher, hoàn thiện modal thêm nhanh phương tiện thông qua `vehicleService`.
3. `src/UI/AdminLayout.tsx`: Làm sạch import thừa.
4. `src/api/axiosClinet.ts`: Cấu hình re-export từ `axiosClient.ts` để giữ tương thích ngược.
5. `src/render/Analytics.tsx`: Dọn dẹp import thừa `React` và `Truck`.
6. `src/render/admin/AdminDashboard.tsx`: Dọn dẹp import thừa `React`.
7. `src/render/ContractManagement.tsx`: Bổ sung tính năng tính thời hạn hợp đồng, tích hợp modal `VehicleRecallModal`, thêm quyền Manager sửa đơn giá trực tiếp.
8. `src/render/CreateContract.tsx`: Chuẩn hóa lưu bản nháp về khóa `sys_contract_drafts`, tích hợp cập nhật trạng thái xe sang `RENTED` khi phát hành hợp đồng.
9. `src/render/PriceApprovals.tsx`: Chống duyệt trùng yêu cầu, chuyển sang lưu dữ liệu vào `sys_e_contracts`, lưu vết kiểm toán đầy đủ (`approvedBy`, `approvedAt`, `oldPrice`, `newPrice`).
10. `src/render/Settings.tsx`: Bổ sung module Quản lý Tài khoản Doanh nghiệp, modal Thêm nhân sự mới, và logic khóa/mở khóa tài khoản.
11. `src/render/Login.tsx`: Bổ sung xác thực người dùng từ `sys_accounts` và mã doanh nghiệp từ `sys_tenants`.

---

## 5. Danh sách các file mới tạo

1. `src/API/axiosClient.ts`: HTTP Client chuẩn hóa với Native Fetch API, tự động tiêm `Authorization: Bearer <token>` và `X-Tenant-ID`.
2. `src/context/LanguageContext.tsx`: React Context quản lý trạng thái ngôn ngữ toàn ứng dụng (`vi` / `en`).
3. `src/locales/vi.ts`: Từ điển Tiếng Việt hoàn chỉnh cho tất cả các phân hệ.
4. `src/locales/en.ts`: Từ điển Tiếng Anh tiêu chuẩn.
5. `src/services/vehicleService.ts`: Tầng Service quản lý phương tiện theo kiến trúc Adapter Pattern, hỗ trợ Mock LocalStorage và sẵn sàng chuyển đổi sang REST API.
6. `src/render/FleetManagement.tsx`: Phân hệ quản lý đội xe hoàn chỉnh với 6 trạng thái và quy trình kiểm định kỹ thuật.
7. `src/components/VehicleRecallModal.tsx`: Modal quy trình thu hồi xe 3 giai đoạn độc lập.
8. `update.md`: Báo cáo chi tiết toàn bộ quá trình nâng cấp và kiểm thử.

---

## 6. Đối chiếu và Yêu cầu API Backend

Dưới đây là bảng đối chiếu hiện trạng giữa Backend hiện có và các API cần bổ sung:

| Phân hệ | API Endpoint | Phương thức | Hiện trạng Backend | Yêu cầu cần hoàn thiện |
|:---|:---|:---:|:---:|:---|
| **Xác thực** | `/api/auth/login` | `POST` | ✅ Đã có (`AuthController`) | Hoạt động tốt với `companyCode`, `username`, `password`. |
| **Phương tiện** | `/api/vehicles` | `GET` | ✅ Đã có | Lấy danh sách xe của Organization từ JWT. |
| **Phương tiện** | `/api/vehicles` | `POST` | ✅ Đã có | Thêm xe mới vào Organization. |
| **Phương tiện** | `/api/vehicles/{id}` | `PUT` | ❌ Chưa có | Cần bổ sung để cập nhật thông tin và trạng thái xe. |
| **Phương tiện** | `/api/vehicles/{id}` | `DELETE` | ❌ Chưa có | Cần bổ sung để xóa/vô hiệu hóa xe. |
| **Phương tiện** | `/api/vehicles/{id}/inspect` | `POST` | ❌ Chưa có | Ghi nhận kết quả nghiệm thu kỹ thuật sau khi thu hồi. |
| **Hợp đồng** | `/api/contracts` | `GET` | ❌ Chưa có | Cần bổ sung API lấy danh sách hợp đồng theo Tenant. |
| **Hợp đồng** | `/api/contracts` | `POST` | ⚠️ Bị hardcode | API đã có nhưng `staffId` đang bị hardcode = 1. Cần lấy từ JWT. |
| **Duyệt giá** | `/api/contracts/{id}/price-requests` | `GET / POST` | ❌ Chưa có | Cần API lưu trữ và quản lý yêu cầu điều chỉnh đơn giá. |
| **Duyệt giá** | `/api/contracts/{id}/price-approve` | `PUT` | ❌ Chưa có | Cần API phê duyệt/từ chối đơn giá dành cho Quản lý. |
| **Thu hồi xe** | `/api/contracts/{id}/recall` | `POST / PUT` | ❌ Chưa có | Cần API hỗ trợ quy trình 3 giai đoạn: tạo yêu cầu, tiếp nhận hiện trường, quyết toán tài chính. |
| **Người dùng** | `/api/users` | `GET / POST` | ❌ Chưa có | Cần `UserController` để Quản lý thêm tài khoản nhân viên. |
| **Người dùng** | `/api/users/{id}/status` | `PUT` | ❌ Chưa có | Cần API khóa/mở khóa tài khoản nhân viên. |

---

## 7. Kết quả kiểm thử

### 7.1. Kiểm thử Biên dịch (Build Test)
- **Lệnh thực hiện:** `npm run build` (`tsc -b && vite build`)
- **Kết quả:**
  ```
  ✓ 1954 modules transformed.
  dist/index.html                   0.41 kB │ gzip:   0.28 kB
  dist/assets/index-B1f56f57.css   85.38 kB │ gzip:  13.54 kB
  dist/assets/index-47xDZym5.js   718.51 kB │ gzip: 195.30 kB
  ✓ built in 2.67s
  ```
- **Số lỗi TypeScript:** 0 lỗi.
- **Số cảnh báo nghiêm trọng:** 0.

### 7.2. Kiểm thử Nghiệp vụ Mô phỏng (Demo Scenarios)
1. **Kiểm thử Multi-Tenant & Phân quyền:**
   - Đăng nhập `owner.an` (CTA2026): Nhận diện đúng vai trò `TENANT_ADMIN`, truy cập đầy đủ menu Duyệt đơn giá, Cài đặt, Đội xe.
   - Đăng nhập `staff.a` (CTA2026): Nhận diện đúng `TENANT_STAFF`, tự động ẩn menu Duyệt đơn giá và Cài đặt.
2. **Kiểm thử Quản lý Đội xe (`/fleet`):**
   - Đổi trạng thái xe từ `AVAILABLE` sang `MAINTENANCE` thành công.
   - Chặn thành công không cho chuyển trực tiếp từ `RENTED` về `AVAILABLE` khi chưa qua `PENDING_INSPECTION`.
3. **Kiểm thử Thu hồi xe 3 giai đoạn:**
   - Tạo yêu cầu thu hồi xe `43A-112.22`: Ghi nhận `PENDING_RECALL`.
   - Tiếp nhận hiện trường: Ghi nhận ODO, mức xăng, tình trạng xe; xe chuyển sang `PENDING_INSPECTION`.
   - Quyết toán tài chính: Nếu chưa tick chọn `isSettled = true`, nút Hoàn tất bị khóa mờ; sau khi tick chọn, hợp đồng chuyển sang `RECALLED` thành công.
4. **Kiểm thử Chuyển đổi Ngôn ngữ:**
   - Bấm nút `VI` / `EN` trên Header: Chuyển đổi tức thời toàn bộ thanh menu Sidebar, các nút hành động, và lưu trạng thái vào `localStorage('dl_language')`.

---

## 8. Các lưu ý kỹ thuật quan trọng và Giới hạn hiện tại

1. **Đồng bộ Đa thiết bị (Multi-Device Sync):**
   - Hiện tại, việc đồng bộ dữ liệu giữa các tab được thực hiện qua `localStorage` và `storage event`. Cơ chế này hoạt động hoàn hảo trên **cùng một trình duyệt/máy tính**.
   - Để đồng bộ giữa **nhiều máy tính khác nhau của nhiều nhân viên trong thời gian thực**, hệ thống cần kết nối với Backend WebSocket (hoặc Server-Sent Events / Polling) khi Backend hoàn thiện.
2. **Bảo mật Tài khoản Môi trường Demo:**
   - Cơ chế tạo tài khoản tại `/settings` và xác thực tại `/portal/login` sử dụng mô phỏng Client-side hashing.
   - Đây là giải pháp phục vụ buổi báo cáo và kiểm thử đồ án; khi triển khai thực tế trên môi trường sản xuất (Production), toàn bộ mật khẩu phải được mã hóa BCrypt tại Backend và trả về JWT Token an toàn.
3. **Phân định Chức năng Mock Service vs Backend thật:**
   - **Chức năng đã sẵn sàng gọi Backend thật:** API Client (`axiosClient.ts`) với cấu trúc JWT Token và Tenant Header.
   - **Chức năng đang hoạt động qua Mock Service / Local Storage Adapter:** Phê duyệt đơn giá, Quản lý tài khoản doanh nghiệp, Lịch sử thu hồi xe 3 giai đoạn. Tầng Service được thiết kế theo Adapter Pattern giúp việc chuyển đổi sang Backend sau này chỉ cần thay đổi tầng Adapter mà không phải viết lại giao diện người dùng.

---

*Báo cáo được khởi tạo tự động và lưu trữ tại thư mục dự án DriveLinker Frontend.*
