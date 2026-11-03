import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DashboardLayout from './UI/DashboardLayout';

import Login from './render/Login';
import Overview from './render/Overview';
import Settings from './render/Settings';
import LiveTracking from './render/LiveTracking';
import Analytics from './render/Analytics';
import ContractManagement from './render/ContractManagement';
import CreateContract from './render/CreateContract';
import PriceApprovals from './render/PriceApprovals';
import FleetManagement from './render/FleetManagement';

import AdminLogin from './render/admin/AdminLogin';
import AdminTenantList from './render/admin/AdminTenantList';
import { LanguageProvider } from './context/LanguageContext';

// Middleware bảo vệ Core Admin - SỬ DỤNG SESSION_STORAGE ĐỂ BẢO MẬT TỐI ĐA
const RequireAdminAuth = ({ children }: { children: React.ReactNode }) => {
  // Chỉ lưu tạm thời, tắt tab trình duyệt là tự động mất quyền Admin
  const role = sessionStorage.getItem('sys_core_role');
  const location = useLocation();

  if (role !== 'SUPER_ADMIN') {
    return <Navigate to="/overview/admin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/portal/login" replace />} />
          <Route path="/portal/login" element={<Login />} />

          {/* =========================================================
              KHU VỰC 1: CORE ADMIN LÕI (BẢO MẬT & ĐỘC LẬP HOÀN TOÀN)
              Phải đặt bên ngoài DashboardLayout để không dính Sidebar
              ========================================================= */}
          <Route path="/overview/admin/login" element={<AdminLogin />} />
          <Route
            path="/overview/admin"
            element={
              <RequireAdminAuth>
                <AdminTenantList />
              </RequireAdminAuth>
            }
          />

          {/* =========================================================
              KHU VỰC 2: GIAO DIỆN KHÁCH HÀNG (Manager, Staff, Admin nhập vai)
              ========================================================= */}
          <Route element={<DashboardLayout />}>
            <Route path="/overview" element={<Overview />} />
            <Route path="/fleet" element={<FleetManagement />} />
            <Route path="/tracking" element={<LiveTracking />} />
            <Route path="/analytics" element={<Analytics />} />

            {/* Trang danh sách Hợp đồng / Đối tác */}
            <Route path="/partners" element={<ContractManagement />} />
            <Route path="/create-contract" element={<CreateContract />} />

            {/* Route dành cho trang Duyệt đơn giá */}
            <Route path="/approvals" element={<PriceApprovals />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
