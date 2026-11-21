  import React, { useState, useEffect } from 'react';
import coreAdminService from '../../api/coreAdminService';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Server, LogOut, ArrowRight, UserCircle, 
  Plus, Info, MapPin, Phone, User, X, History, Clock
} from 'lucide-react';

export default function AdminTenantList() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  
  // State quản lý Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  
  // State lưu trữ lịch sử
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // State quản lý Form thêm mới
  const [formData, setFormData] = useState({
    name: '', ownerName: '', phone: '', address: ''
  });
  
  // Đọc tên Admin từ SessionStorage
  const adminName = sessionStorage.getItem('sys_core_admin_name') || 'Quản trị viên';

  useEffect(() => {
    // 1. Khởi tạo dữ liệu công ty mẫu
    if (!localStorage.getItem('sys_tenants')) {
      localStorage.setItem('sys_tenants', JSON.stringify([
        { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTYA26', ownerName: 'Trần Văn A', phone: '0901234567', address: '123 Nguyễn Văn Linh, Đà Nẵng' },
        { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTYB26', ownerName: 'Lê Thị B', phone: '0912345678', address: '456 Lê Duẩn, Hà Nội' },
        { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTYC26', ownerName: 'Phạm Văn C', phone: '0987654321', address: '789 Nguyễn Huệ, TP. HCM' }
      ]));
    }
    
    // 2. TỰ ĐỘNG RESET LỊCH SỬ NẾU PHÁT HIỆN DỮ LIỆU CŨ BỊ KẸT LẠI
    const existingLogs = localStorage.getItem('sys_core_audit_logs');
    if (!existingLogs || existingLogs.includes('cảnh báo tốc độ') || existingLogs.includes('Quản trị lõi')) {
      localStorage.setItem('sys_core_audit_logs', JSON.stringify([
        { id: 1, time: '29/10/2026 08:30:00', admin: 'Nguyễn Phạm Thiện Ân', action: 'ĐỒNG BỘ', details: 'Đồng bộ cấu hình Camera cho Demo CTY A' },
        { id: 2, time: '29/10/2026 09:15:20', admin: 'Nguyễn Nhật Long', action: 'CẤU HÌNH', details: 'Sửa lỗi giao diện Map cho Demo CTY B' }
      ]));
    }

    loadData();
  }, []);

  const loadData = () => {
    setTenants(JSON.parse(localStorage.getItem('sys_tenants') || '[]'));
    setAuditLogs(JSON.parse(localStorage.getItem('sys_core_audit_logs') || '[]'));
  };

  /**
   * HÀM LƯU NHẬT KÝ THAO TÁC (AUDIT LOG)
   */
  const logAction = (action: string, details: string) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleString('vi-VN'),
      admin: adminName,
      action: action,
      details: details
    };
    const currentLogs = JSON.parse(localStorage.getItem('sys_core_audit_logs') || '[]');
    const updatedLogs = [newLog, ...currentLogs];
    
    localStorage.setItem('sys_core_audit_logs', JSON.stringify(updatedLogs));
    setAuditLogs(updatedLogs);
  };

  // Hàm xử lý Thêm doanh nghiệp mới
  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ownerName) {
      alert("Vui lòng nhập ít nhất Tên doanh nghiệp và Tên chủ doanh nghiệp!");
      return;
    }

    const newId = `COMPANY_${Date.now()}`;
    const newCode = `CTY${Math.floor(Math.random() * 1000)}`;
    const newTenant = {
      id: newId, code: newCode, name: formData.name, ownerName: formData.ownerName, phone: formData.phone, address: formData.address
    };

    const updatedTenants = [...tenants, newTenant];
    localStorage.setItem('sys_tenants', JSON.stringify(updatedTenants));
    
    // GHI LOG: Đã thêm mới doanh nghiệp
    logAction('THÊM MỚI', `Tạo doanh nghiệp: ${formData.name} (Mã: ${newCode})`);

    setTenants(updatedTenants);
    setIsAddModalOpen(false);
    setFormData({ name: '', ownerName: '', phone: '', address: '' });
  };

  // Hàm xử lý Nhập vai (Truy cập hệ thống)
  const handleImpersonate = (tenantId: string, tenantName: string) => {
    // GHI LOG: Admin bắt đầu chui vào hệ thống của công ty nào
    logAction('TRUY CẬP', `Nhập vai quản trị vào hệ thống: ${tenantName}`);

    localStorage.setItem('isAdminImpersonating', 'true');
    localStorage.setItem('tenantId', tenantId);
    localStorage.setItem('tenantName', tenantName);
    localStorage.setItem('userRole', 'SUPER_ADMIN_VIEW');
    navigate('/overview');
  };

  const handleLogout = () => {
    logAction('ĐĂNG XUẤT', 'Kết thúc phiên làm việc'); // Đã sửa hoàn chỉnh ở đây
    sessionStorage.removeItem('sys_core_role');
    sessionStorage.removeItem('sys_core_admin_name');
    navigate('/overview/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-6 h-6 text-rose-500"/> DriveLinker Admin
            </h1>
            <p className="text-sm text-slate-500 mt-1">Danh sách doanh nghiệp đang quản lý.</p>
          </div>
          
          <div className="flex items-center gap-3">
            
            {/* Nút Xem Lịch sử */}
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors active:scale-95"
            >
              <History className="w-4 h-4" /> Lịch sử
            </button>

            {/* Nút Thêm Doanh nghiệp */}
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm transition-colors active:scale-95"
            >
              <Plus className="w-5 h-5" /> Thêm mới
            </button>

            {/* Thông tin Admin */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm ml-2">
              <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-700 leading-none">{adminName}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">System Admin</p>
              </div>
            </div>

            {/* Nút Thoát */}
            <button 
              onClick={handleLogout} 
              className="text-rose-500 font-bold hover:bg-rose-50 px-3 py-3 rounded-xl flex items-center justify-center transition-colors border border-transparent hover:border-rose-200"
              title="Thoát phiên làm việc"
            >
              <LogOut className="w-5 h-5"/>
            </button>
          </div>
        </div>

        {/* ================= DANH SÁCH DOANH NGHIỆP ================= */}
        <div className="grid grid-cols-2 gap-4">
          {tenants.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-md transition-all group overflow-hidden flex flex-col">
              
              <div className="p-6 flex justify-between items-center flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{t.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">ID: {t.id}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 bg-slate-50 flex grid grid-cols-2 divide-x divide-slate-200">
                <button 
                  onClick={() => setSelectedTenant(t)}
                  className="py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                >
                  <Info className="w-4 h-4" /> Xem chi tiết
                </button>
                <button 
                  onClick={() => handleImpersonate(t.id, t.name)}
                  className="py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Truy cập hệ thống <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL: LỊCH SỬ THAO TÁC ================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><History className="w-5 h-5 text-sky-500"/> Lịch sử Thao tác Hệ thống</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Thời gian</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Admin</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Hành động</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500">Chưa có bản ghi nhật ký nào.</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-slate-500 whitespace-nowrap flex items-center gap-2"><Clock className="w-4 h-4 text-slate-300"/> {log.time}</td>
                        <td className="px-6 py-3 text-sm font-bold text-slate-700 whitespace-nowrap">{log.admin}</td>
                        <td className="px-6 py-3 text-sm whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                            log.action === 'THÊM MỚI' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'TRUY CẬP' ? 'bg-sky-100 text-sky-700' :
                            log.action === 'ĐĂNG XUẤT' ? 'bg-slate-200 text-slate-600' :
                            'bg-rose-100 text-rose-700'
                          }`}>{log.action}</span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 text-right">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">Đóng Lịch sử</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM DOANH NGHIỆP ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-rose-500"/> Thêm Doanh nghiệp</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Tên doanh nghiệp *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="VD: Công ty Vận tải ABC" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Tên chủ doanh nghiệp *</label>
                <input required type="text" value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="VD: Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Số điện thoại liên hệ</label>
                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="VD: 0901234567" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Địa chỉ</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-rose-500" placeholder="VD: 123 Đường A, Quận B..." />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm">Lưu doanh nghiệp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TIẾT DOANH NGHIỆP ================= */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2"><Info className="w-5 h-5 text-sky-500"/> Hồ sơ Doanh nghiệp</h2>
              <button onClick={() => setSelectedTenant(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 mx-auto mb-3">
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{selectedTenant.name}</h3>
                <p className="text-sm font-mono text-slate-400 mt-1">ID: {selectedTenant.id} • Mã: {selectedTenant.code}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chủ doanh nghiệp</p>
                    <p className="font-medium text-slate-700">{selectedTenant.ownerName || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số điện thoại</p>
                    <p className="font-medium text-slate-700">{selectedTenant.phone || 'Chưa cập nhật'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Địa chỉ</p>
                    <p className="font-medium text-slate-700 leading-snug">{selectedTenant.address || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setSelectedTenant(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors">Đóng</button>
                <button onClick={() => handleImpersonate(selectedTenant.id, selectedTenant.name)} className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  Truy cập <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}