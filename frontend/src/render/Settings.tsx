/**
 * @file Settings.tsx
 * @description Phân hệ Cài đặt hệ thống (Settings) dành cho Quản trị viên doanh nghiệp (Tenant Admin).
 * Module này quản lý:
 * 1. Thiết lập bảo mật (Mã đăng nhập doanh nghiệp).
 * 2. Cấu hình dịch vụ lõi (Chỉ System Admin mới được chỉnh sửa).
 * 3. Quản lý thiết bị truy cập (Giám sát PC, Laptop, Mobile đăng nhập vào hệ thống).
 * 4. Nhật ký thao tác (Audit Logs).
 */

import { useState, useEffect } from 'react';
import {
  Key, CheckCircle2, AlertCircle, Eye, EyeOff,
  History, Clock, ShieldAlert,
  Smartphone, Monitor, Laptop, Info, AlertTriangle, Cpu, Check, X,
  Camera, MapPin, Bell, Lock, Save, Terminal,
  ClipboardEdit, CheckSquare, Users, UserPlus
} from 'lucide-react';

/**
 * Hàm khởi tạo dữ liệu mẫu (Seed Data) cho môi trường phát triển.
 */
const initDemoData = () => {
  const storedTenants = JSON.parse(localStorage.getItem('sys_tenants') || '[]');
  if (storedTenants.length === 0 || storedTenants.some((t: any) => t.code === 'CTYA26')) {
    localStorage.setItem('sys_tenants', JSON.stringify([
      { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTA2026' },
      { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTB2026' },
      { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTC2026' }
    ]));
  }

  if (!localStorage.getItem('sys_logs')) {
    localStorage.setItem('sys_logs', JSON.stringify([]));
  }

  // KHỞI TẠO DỮ LIỆU TÀI KHOẢN DOANH NGHIỆP
  const existingAccounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');
  if (existingAccounts.length === 0 || existingAccounts.some((a: any) => !a.password)) {
    localStorage.setItem('sys_accounts', JSON.stringify([
      { id: 'ACC-001', tenantId: 'COMPANY_A', username: 'owner.an', fullName: 'Nguyễn Văn An', email: 'owner.an@drivelinker.vn', role: 'TENANT_ADMIN', status: 'ACTIVE', password: '123456', createdAt: '2026-10-15' },
      { id: 'ACC-002', tenantId: 'COMPANY_A', username: 'staff.a', fullName: 'Trần Thị Lan', email: 'staff.a@drivelinker.vn', role: 'TENANT_STAFF', status: 'ACTIVE', password: '123456', createdAt: '2026-10-20' },
      { id: 'ACC-003', tenantId: 'COMPANY_B', username: 'staff.b', fullName: 'Lê Văn Bình', email: 'staff.b@drivelinker.vn', role: 'TENANT_STAFF', status: 'ACTIVE', password: '123456', createdAt: '2026-10-22' },
      { id: 'ACC-004', tenantId: 'COMPANY_C', username: 'owner.c', fullName: 'Vũ Văn Cường', email: 'owner.c@drivelinker.vn', role: 'TENANT_ADMIN', status: 'ACTIVE', password: '123456', createdAt: '2026-10-25' },
      { id: 'ACC-005', tenantId: 'COMPANY_C', username: 'staff.c', fullName: 'Phạm Thị Chi', email: 'staff.c@drivelinker.vn', role: 'TENANT_STAFF', status: 'ACTIVE', password: '123456', createdAt: '2026-10-26' }
    ]));
  }

  // KHỞI TẠO DỮ LIỆU THIẾT BỊ TRUY CẬP (Có thiết bị đang chờ duyệt)
  if (!localStorage.getItem('sys_access_devices')) {
    localStorage.setItem('sys_access_devices', JSON.stringify([
      { id: 'DEV-001', tenantId: 'COMPANY_A', name: 'MacBook Pro', type: 'Laptop', ip: '113.190.23.44', account: 'manager@drivelinker.vn', lastLogin: '2026-10-28 08:00', status: 'APPROVED', os: 'macOS', browser: 'Safari' },
      { id: 'DEV-002', tenantId: 'COMPANY_A', name: 'iPhone 15 Pro', type: 'Mobile', ip: '14.232.11.22', account: 'nhanvien1@drivelinker.vn', lastLogin: '2026-10-28 09:15', status: 'LOCKED', os: 'iOS 17.1', browser: 'Chrome' },
      { id: 'DEV-003', tenantId: 'COMPANY_A', name: 'Windows PC', type: 'Desktop', ip: '113.190.23.44', account: 'admin@drivelinker.vn', lastLogin: '2026-10-27 14:00', status: 'APPROVED', os: 'Windows 11', browser: 'Cốc Cốc' },
      { id: 'DEV-004', tenantId: 'COMPANY_A', name: 'iPad Air 5', type: 'Mobile', ip: '113.190.23.12', account: 'sale1@drivelinker.vn', lastLogin: 'Vừa xong', status: 'PENDING', os: 'iPadOS 17', browser: 'Safari' },
      { id: 'DEV-005', tenantId: 'COMPANY_A', name: 'Dell XPS 15', type: 'Laptop', ip: '113.190.23.12', account: 'sale2@drivelinker.vn', lastLogin: 'Vừa xong', status: 'PENDING', os: 'Windows 11', browser: 'Edge' }
    ]));
  }
};

export default function Settings() {
  const [userRole] = useState(localStorage.getItem('userRole') || 'TENANT_STAFF');
  const [tenantId] = useState(localStorage.getItem('tenantId') || 'COMPANY_A');
  const currentUserEmail = localStorage.getItem('username') || 'admin@drivelinker.vn';
  
  // KIỂM TRA QUYỀN SYSTEM ADMIN NHẬP VAI
  const isAdminImpersonating = localStorage.getItem('isAdminImpersonating') === 'true';

  // --- Trạng thái: Mã doanh nghiệp ---
  const [currentCode, setCurrentCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeMessage, setCodeMessage] = useState({ type: '', text: '' });

  // --- Trạng thái: Cấu hình dịch vụ lõi ---
  const [coreServices, setCoreServices] = useState({
    gpsTracking: true,
    aiCamera: false,
    speedAlert: true,
  });

  // --- Trạng thái: Thiết bị truy cập ---
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [deviceAnomaly, setDeviceAnomaly] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  // --- Trạng thái: Xét duyệt thiết bị (MỚI) ---
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<{[key: string]: string}>({});

  // --- Trạng thái: Quản lý tài khoản doanh nghiệp ---
  const [accountList, setAccountList] = useState<any[]>([]);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'TENANT_STAFF',
  });
  const [accountFormError, setAccountFormError] = useState('');

  // --- Trạng thái: Lịch sử ---
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    localStorage.removeItem('sys_access_devices'); // Hỗ trợ reload lại demo data
    initDemoData();
    loadData();
  }, [tenantId]);

  const loadData = () => {
    // 1. Tải Mã CTY
    const tenants = JSON.parse(localStorage.getItem('sys_tenants') || '[]');
    const currentTenant = tenants.find((t: any) => t.id === tenantId);
    if (currentTenant) setCurrentCode(currentTenant.code);

    // 2. Tải Lịch sử
    const allLogs = JSON.parse(localStorage.getItem('sys_logs') || '[]');
    setActivityLogs(allLogs.filter((l: any) => l.tenantId === tenantId).sort((a: any, b: any) => b.timestamp - a.timestamp));

    // 3. Tải Danh sách Tài khoản
    const allAccounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');
    setAccountList(allAccounts.filter((a: any) => a.tenantId === tenantId));

    // 4. Tải Thiết bị truy cập & Phân tích IP
    const allDevices = JSON.parse(localStorage.getItem('sys_access_devices') || '[]');
    const tenantDevices = allDevices.filter((d: any) => d.tenantId === tenantId);
    setDeviceList(tenantDevices);

    // Thuật toán phát hiện xung đột IP
    const ipMap = new Map();
    tenantDevices.forEach((d: any) => {
      if (!ipMap.has(d.ip)) ipMap.set(d.ip, new Set());
      ipMap.get(d.ip).add(d.account);
    });

    const conflicts = [];
    for (let [ip, accounts] of ipMap.entries()) {
      if (accounts.size > 1) conflicts.push({ ip, accounts: Array.from(accounts) });
    }
    setDeviceAnomaly(conflicts);
  };

  /**
   * HÀM GHI NHẬT KÝ ĐA LUỒNG (Bổ sung Bắn log về Admin Core)
   */
  const logActivity = (action: string, target: string, result: string = 'Thành công') => {
    // 1. GHI LOG CHO DOANH NGHIỆP TẠI CHỖ
    const allLogs = JSON.parse(localStorage.getItem('sys_logs') || '[]');
    const newLog = {
      id: `LOG_${Date.now()}`, tenantId, user: currentUserEmail, action, target, result,
      timestamp: Date.now(), timeStr: new Date().toLocaleString('vi-VN')
    };
    localStorage.setItem('sys_logs', JSON.stringify([newLog, ...allLogs]));
    loadData(); // Tự động load lại sau khi log

    // 2. NẾU LÀ ADMIN NHẬP VAI -> BẮN THÊM LOG VỀ BẢNG ĐIỀU KHIỂN LÕI
    if (isAdminImpersonating) {
      const adminName = sessionStorage.getItem('sys_core_admin_name') || 'Quản trị viên';
      const tenantName = localStorage.getItem('tenantName') || 'Doanh nghiệp';
      const coreLogs = JSON.parse(localStorage.getItem('sys_core_audit_logs') || '[]');

      // Phân loại nhãn hành động cho dễ nhìn bên bảng Admin
      let coreAction = 'THAY ĐỔI';
      if (action.includes('Cập nhật trạng thái thiết bị')) coreAction = 'XÉT DUYỆT';
      if (action.includes('Cấu hình dịch vụ')) coreAction = 'CẤU HÌNH';
      if (action.includes('Đổi mã')) coreAction = 'BẢO MẬT';

      const newCoreLog = {
        id: Date.now() + 1, // +1 để đảm bảo ID không trùng
        time: new Date().toLocaleString('vi-VN'),
        admin: adminName,
        action: coreAction,
        details: `${action}: ${target} (tại ${tenantName})`
      };
      
      localStorage.setItem('sys_core_audit_logs', JSON.stringify([newCoreLog, ...coreLogs]));
    }
  };

  // ================= LOGIC MÃ DOANH NGHIỆP =================
  const handleSaveCode = () => {
    setCodeMessage({ type: '', text: '' });
    const codeRegex = /^[A-Za-z0-9]{6}$/;

    if (!codeRegex.test(newCode)) return setCodeMessage({ type: 'error', text: 'Mã doanh nghiệp phải gồm đúng 6 ký tự chữ và số.' });
    if (newCode !== confirmCode) return setCodeMessage({ type: 'error', text: 'Mã xác nhận không khớp.' });
    if (newCode.toUpperCase() === currentCode.toUpperCase()) return setCodeMessage({ type: 'error', text: 'Mã mới phải khác mã hiện tại.' });

    const tenants = JSON.parse(localStorage.getItem('sys_tenants') || '[]');
    if (tenants.some((t: any) => t.code.toUpperCase() === newCode.toUpperCase())) {
      return setCodeMessage({ type: 'error', text: 'Mã doanh nghiệp này đã được sử dụng.' });
    }

    const updatedTenants = tenants.map((t: any) => t.id === tenantId ? { ...t, code: newCode.toUpperCase() } : t);
    localStorage.setItem('sys_tenants', JSON.stringify(updatedTenants));
    localStorage.setItem('tenantCode', newCode.toUpperCase());

    logActivity('Đổi mã doanh nghiệp', `Mã mới: ${newCode.toUpperCase()}`);

    setCurrentCode(newCode.toUpperCase());
    setIsEditingCode(false);
    setNewCode(''); setConfirmCode('');
    setCodeMessage({ type: 'success', text: 'Đổi mã doanh nghiệp thành công. Mã cũ đã vô hiệu hóa.' });
    setTimeout(() => setCodeMessage({ type: '', text: '' }), 5000);
  };

  // ================= LOGIC THIẾT BỊ TRUY CẬP =================
  const handleDeviceAction = (id: string, action: 'APPROVED' | 'REJECTED' | 'LOCKED', customNote?: string) => {
    const actionText = action === 'LOCKED' ? 'khóa' : action === 'APPROVED' ? 'mở khóa/duyệt' : 'từ chối';
    
    // Xử lý ghi chú
    const finalNote = customNote !== undefined ? customNote : approvalNotes[id] || '';

    if (window.confirm(`Xác nhận ${actionText} thiết bị này?`)) {
      const allDevices = JSON.parse(localStorage.getItem('sys_access_devices') || '[]');
      const updated = allDevices.map((d: any) => d.id === id && d.tenantId === tenantId ? { ...d, status: action, note: finalNote } : d);
      localStorage.setItem('sys_access_devices', JSON.stringify(updated));
      
      let logTarget = `Chuyển thiết bị ID ${id} thành ${action}`;
      if (finalNote) logTarget += ` (Ghi chú: ${finalNote})`;

      logActivity(`Cập nhật trạng thái thiết bị`, logTarget);
      loadData();

      // Clear note sau khi duyệt xong
      const newNotes = {...approvalNotes};
      delete newNotes[id];
      setApprovalNotes(newNotes);

      if (selectedDevice && selectedDevice.id === id) {
        setSelectedDevice({ ...selectedDevice, status: action, note: finalNote });
      }
    }
  };

  // ================= LOGIC TẠO TÀI KHOẢN MỚI =================
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError('');

    if (!accountForm.fullName.trim() || !accountForm.username.trim() || !accountForm.email.trim() || !accountForm.password) {
      setAccountFormError('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    if (accountForm.password.length < 6) {
      setAccountFormError('Mật khẩu khởi tạo phải có độ dài tối thiểu 6 ký tự.');
      return;
    }

    const cleanUsername = accountForm.username.trim().toLowerCase();
    const cleanEmail = accountForm.email.trim().toLowerCase();

    const allAccounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');

    // Kiểm tra chống trùng lặp username hoặc email
    const isDuplicate = allAccounts.some((a: any) =>
      a.username.toLowerCase() === cleanUsername ||
      a.email.toLowerCase() === cleanEmail
    );

    if (isDuplicate) {
      setAccountFormError(`Tên đăng nhập "${cleanUsername}" hoặc Email "${cleanEmail}" đã tồn tại trong hệ thống!`);
      return;
    }

    // Mã hóa an toàn Client-side giả lập (Base64 hash simulation)
    const mockPasswordHash = btoa(unescape(encodeURIComponent(accountForm.password)));

    const newAccount = {
      id: `ACC-${Date.now().toString().slice(-6)}`,
      tenantId,
      username: cleanUsername,
      fullName: accountForm.fullName.trim(),
      email: cleanEmail,
      password: accountForm.password, // giữ cho demo login
      passwordHash: mockPasswordHash,
      role: accountForm.role,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };

    allAccounts.push(newAccount);
    localStorage.setItem('sys_accounts', JSON.stringify(allAccounts));

    logActivity('Tạo tài khoản mới', `Tài khoản: ${cleanUsername} (${accountForm.role === 'TENANT_ADMIN' ? 'Quản trị viên' : 'Nhân viên'})`);
    loadData();

    setIsAddAccountModalOpen(false);
    setAccountForm({ fullName: '', username: '', email: '', password: '', role: 'TENANT_STAFF' });
    alert(`Tạo tài khoản "${cleanUsername}" thành công! Tài khoản đã sẵn sàng để đăng nhập.`);
  };

  const handleToggleAccountStatus = (account: any) => {
    const nextStatus = account.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const actionText = nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Xác nhận ${actionText} tài khoản "${account.username}"?`)) return;

    const allAccounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');
    const updated = allAccounts.map((a: any) =>
      a.id === account.id ? { ...a, status: nextStatus } : a
    );
    localStorage.setItem('sys_accounts', JSON.stringify(updated));

    logActivity('Thay đổi trạng thái tài khoản', `${account.username} ➔ ${nextStatus}`);
    loadData();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'Laptop': return <Laptop className="w-5 h-5 text-slate-500" />;
      case 'Mobile': return <Smartphone className="w-5 h-5 text-slate-500" />;
      case 'Desktop': return <Monitor className="w-5 h-5 text-slate-500" />;
      default: return <Monitor className="w-5 h-5 text-slate-500" />;
    }
  };

  // ================= LOGIC DỊCH VỤ LÕI =================
  const handleToggleCoreService = (service: keyof typeof coreServices) => {
    if (!isAdminImpersonating) return; 
    setCoreServices(prev => ({ ...prev, [service]: !prev[service] }));
  };

  const handleSaveCoreServices = () => {
    const activeModules = Object.entries(coreServices)
      .filter(([_, isActive]) => isActive)
      .map(([key]) => key)
      .join(', ');

    logActivity('Cấu hình dịch vụ Lõi', `Kích hoạt các module: [${activeModules}]`);
    alert('Đã cập nhật cấu hình dịch vụ thành công!');
  };

  // Tính toán số lượng thiết bị đang chờ duyệt
  const pendingDevices = deviceList.filter(d => d.status === 'PENDING');
  const pendingCount = pendingDevices.length;

  // --- Kiểm tra quyền truy cập trang ---
  if (userRole !== 'TENANT_ADMIN' && userRole !== 'SYS_ADMIN' && userRole !== 'SUPER_ADMIN_VIEW') {
    return (
      <div className="flex-1 bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-700">Khu vực Giới hạn</h2>
        <p className="text-slate-500">Chỉ Quản trị viên doanh nghiệp mới có quyền truy cập trang Cài đặt.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6 space-y-6 font-sans relative">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt Hệ thống</h2>
        <p className="text-sm text-slate-500 mt-1">Quản lý bảo mật, thiết bị truy cập và cấu hình dịch vụ</p>
      </div>

      {/* ================= 1. MODULE: BẢO MẬT & MÃ ĐĂNG NHẬP ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Key className="w-5 h-5" /></div>
          <div><h3 className="font-bold text-slate-800">Bảo mật & Đăng nhập</h3><p className="text-xs text-slate-500">Quản lý mã định danh doanh nghiệp (Company Login Code)</p></div>
        </div>
        <div className="p-5">
          {codeMessage.text && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm font-medium ${codeMessage.type === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} border`}>
              {codeMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}{codeMessage.text}
            </div>
          )}
          {!isEditingCode ? (
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mã đăng nhập hiện tại</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono font-bold text-slate-800 tracking-widest">{showCode ? currentCode : '•••' + currentCode.slice(-3)}</span>
                  <button onClick={() => setShowCode(!showCode)} className="text-slate-400 hover:text-sky-600 transition-colors">{showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                </div>
              </div>
              <button onClick={() => setIsEditingCode(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">Đổi mã doanh nghiệp</button>
            </div>
          ) : (
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Mã doanh nghiệp mới (6 ký tự)</label><input type="text" maxLength={6} value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-mono uppercase" placeholder="VD: CTYA26" /></div>
                <div><label className="block text-xs font-bold text-slate-700 mb-1">Xác nhận mã mới</label><input type="text" maxLength={6} value={confirmCode} onChange={(e) => setConfirmCode(e.target.value.toUpperCase())} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-mono uppercase" placeholder="Nhập lại mã mới" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setIsEditingCode(false); setCodeMessage({ type: '', text: '' }); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Hủy bỏ</button>
                <button onClick={handleSaveCode} className="bg-rose-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-rose-700 flex items-center gap-2"><Key className="w-4 h-4" /> Lưu mã mới</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= 2. MODULE: CẤU HÌNH DỊCH VỤ LÕI (CHỈ ADMIN THAO TÁC) ================= */}
      <div className={`rounded-xl shadow-sm border overflow-hidden relative ${isAdminImpersonating ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className={`px-5 py-4 flex items-center justify-between border-b ${isAdminImpersonating ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-50 border-slate-100'}`}>
          <div>
            <h3 className={`font-bold flex items-center gap-2 ${isAdminImpersonating ? 'text-rose-400' : 'text-slate-800'}`}>
              {isAdminImpersonating ? <Terminal className="w-5 h-5" /> : <Cpu className="w-5 h-5 text-indigo-500" />}
              Cấu hình Dịch vụ Hệ thống
            </h3>
            <p className={`text-xs mt-1 ${isAdminImpersonating ? 'text-slate-400' : 'text-slate-500'}`}>Quản lý cấp phép tính năng hoạt động cho doanh nghiệp.</p>
          </div>
          {!isAdminImpersonating && <div className="p-2 bg-slate-100 rounded-lg"><Lock className="w-4 h-4 text-slate-400" /></div>}
        </div>

        <div className="p-5 space-y-6">
          {!isAdminImpersonating ? (
            <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
              Khu vực này được quản lý bởi Hệ thống DriveLinker. Quản trị viên doanh nghiệp chỉ có thể <strong>XEM</strong> các tính năng phần cứng/phần mềm đang được cấp phép. Liên hệ với DriveLinker để nâng cấp.
            </p>
          ) : (
            <p className="text-xs text-rose-300 leading-relaxed bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
              Chế độ <strong>Core Admin</strong>. Bạn có quyền cấp phép hoặc vô hiệu hóa các dịch vụ cho doanh nghiệp này.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Module Định vị */}
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isAdminImpersonating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${coreServices.gpsTracking ? (isAdminImpersonating ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-600') : (isAdminImpersonating ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isAdminImpersonating ? 'text-slate-200' : 'text-slate-700'}`}>Định vị bản đồ</p>
                  <p className={`text-[10px] ${isAdminImpersonating ? 'text-slate-400' : 'text-slate-400'}`}>Giám sát hành trình</p>
                </div>
              </div>
              <button onClick={() => handleToggleCoreService('gpsTracking')} disabled={!isAdminImpersonating} className={`w-11 h-6 rounded-full relative transition-colors shadow-inner ${!isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${coreServices.gpsTracking ? 'bg-sky-500' : (isAdminImpersonating ? 'bg-slate-600' : 'bg-slate-200')}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${coreServices.gpsTracking ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Module AI Camera */}
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isAdminImpersonating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${coreServices.aiCamera ? (isAdminImpersonating ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-50 text-rose-600') : (isAdminImpersonating ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isAdminImpersonating ? 'text-slate-200' : 'text-slate-700'}`}>Camera AI (Edge)</p>
                  <p className={`text-[10px] ${isAdminImpersonating ? 'text-slate-400' : 'text-slate-400'}`}>Nhận diện tài xế</p>
                </div>
              </div>
              <button onClick={() => handleToggleCoreService('aiCamera')} disabled={!isAdminImpersonating} className={`w-11 h-6 rounded-full relative transition-colors shadow-inner ${!isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${coreServices.aiCamera ? 'bg-rose-500' : (isAdminImpersonating ? 'bg-slate-600' : 'bg-slate-200')}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${coreServices.aiCamera ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Module Cảnh báo */}
            <div className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${isAdminImpersonating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${coreServices.speedAlert ? (isAdminImpersonating ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-600') : (isAdminImpersonating ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${isAdminImpersonating ? 'text-slate-200' : 'text-slate-700'}`}>Cảnh báo vi phạm</p>
                  <p className={`text-[10px] ${isAdminImpersonating ? 'text-slate-400' : 'text-slate-400'}`}>Cảnh báo ngủ gật</p>
                </div>
              </div>
              <button onClick={() => handleToggleCoreService('speedAlert')} disabled={!isAdminImpersonating} className={`w-11 h-6 rounded-full relative transition-colors shadow-inner ${!isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${coreServices.speedAlert ? 'bg-amber-500' : (isAdminImpersonating ? 'bg-slate-600' : 'bg-slate-200')}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${coreServices.speedAlert ? 'left-6' : 'left-1'}`}></div>
              </button>
            </div>

          </div>

          {/* Nút lưu cấu hình của Admin */}
          {isAdminImpersonating && (
            <div className="flex justify-end pt-2">
              <button onClick={handleSaveCoreServices} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 text-sm font-bold rounded-xl transition-colors shadow-lg active:scale-95 flex items-center gap-2">
                <Save className="w-4 h-4" /> Cập nhật Hệ thống
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= 3. MODULE: QUẢN LÝ THIẾT BỊ TRUY CẬP ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Monitor className="w-5 h-5 text-indigo-500" /> Quản lý Thiết bị Truy cập</h3>
            <p className="text-xs text-slate-500 mt-1">Giám sát PC, Laptop, Mobile đăng nhập vào hệ thống. {deviceAnomaly.length > 0 && <span className="text-rose-500 font-bold ml-2">Phát hiện {deviceAnomaly.length} IP có dấu hiệu dùng chung!</span>}</p>
          </div>
          
          {/* NÚT HIỂN THỊ DANH SÁCH CHỜ DUYỆT */}
          {pendingCount > 0 && (
            <button 
              onClick={() => setIsApprovalModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors animate-pulse hover:animate-none"
            >
              <CheckSquare className="w-4 h-4" /> 
              Duyệt yêu cầu mới ({pendingCount})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="p-4">Thiết bị</th>
                <th className="p-4">Địa chỉ IP</th>
                <th className="p-4">Tài khoản truy cập</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {deviceList.map(d => {
                const isAnomaly = deviceAnomaly.some(a => a.ip === d.ip);
                return (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">{getDeviceIcon(d.type)}</div>
                        <div>
                          <span className="font-bold text-slate-800">{d.name}</span>
                          <p className="text-[10px] text-slate-400 font-normal">Truy cập cuối: {d.lastLogin}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono font-medium ${isAnomaly ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-slate-500'}`}>
                        {d.ip}
                        {isAnomaly && <AlertTriangle className="w-3 h-3 inline-block ml-1" />}
                      </span>
                    </td>
                    <td className="p-4 text-sky-600 font-bold">{d.account}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${d.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        d.status === 'PENDING' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-rose-100 text-rose-700'
                        }`}>
                        {d.status === 'APPROVED' ? 'Đã duyệt' : d.status === 'PENDING' ? 'Chờ duyệt' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {d.status === 'PENDING' ? (
                          <button onClick={() => setIsApprovalModalOpen(true)} className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded transition-colors text-xs font-bold px-3">Xử lý ngay</button>
                        ) : d.status === 'LOCKED' ? (
                          <button onClick={() => handleDeviceAction(d.id, 'APPROVED')} className="text-xs font-bold text-emerald-500 hover:bg-emerald-50 px-2 py-1 rounded transition-colors">Mở khóa</button>
                        ) : (
                          <button onClick={() => handleDeviceAction(d.id, 'LOCKED')} className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-2 py-1 rounded transition-colors">Khóa</button>
                        )}
                        <button onClick={() => setSelectedDevice(d)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 rounded flex items-center gap-1">
                          <Info className="w-3 h-3" /> Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 4. MODULE: NHẬT KÝ THAO TÁC ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div><h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500" /> Lịch sử Thao tác Doanh nghiệp</h3></div>
        </div>
        <div className="overflow-auto max-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
              <tr><th className="p-3 pl-5">Thời gian</th><th className="p-3">Người thực hiện</th><th className="p-3">Thao tác</th><th className="p-3">Đối tượng</th><th className="p-3 text-center">Kết quả</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3 pl-5 whitespace-nowrap text-slate-500 flex items-center gap-1.5"><Clock className="w-3 h-3" /> {log.timeStr}</td>
                  <td className="p-3 font-medium text-slate-700">{log.user}</td>
                  <td className="p-3 text-sky-600 font-medium">{log.action}</td>
                  <td className="p-3 text-slate-600">{log.target}</td>
                  <td className="p-3 text-center"><span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">{log.result}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 5. MODULE: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN DOANH NGHIỆP ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-500" /> Quản lý Tài khoản & Phân quyền Doanh nghiệp
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Danh sách nhân sự thuộc doanh nghiệp. Phân quyền chặt chẽ giữa Quản trị viên (TENANT_ADMIN) và Nhân viên (TENANT_STAFF).
            </p>
          </div>
          <button
            onClick={() => {
              setAccountFormError('');
              setAccountForm({ fullName: '', username: '', email: '', password: '', role: 'TENANT_STAFF' });
              setIsAddAccountModalOpen(true);
            }}
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Thêm tài khoản
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
              <tr>
                <th className="p-4">Họ và tên</th>
                <th className="p-4">Tên đăng nhập</th>
                <th className="p-4">Email</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Ngày tạo</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accountList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Chưa có tài khoản nào được tạo cho doanh nghiệp này.
                  </td>
                </tr>
              ) : (
                accountList.map((acc: any) => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{acc.fullName}</td>
                    <td className="p-4 font-mono text-xs font-semibold text-slate-600">{acc.username}</td>
                    <td className="p-4 text-slate-600 text-xs">{acc.email}</td>
                    <td className="p-4">
                      {acc.role === 'TENANT_ADMIN' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                          Quản trị viên (ADMIN)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                          Nhân viên (STAFF)
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {acc.status === 'ACTIVE' ? (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                          Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500 font-mono">{acc.createdAt || '---'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleAccountStatus(acc)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                          acc.status === 'ACTIVE'
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {acc.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

{/* ================= MODALS ================= */}

      {/* MODAL: XÉT DUYỆT HÀNG LOẠT (TÍNH NĂNG MỚI) */}
      {isApprovalModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-500" /> Xét duyệt Thiết bị truy cập
                </h2>
                <p className="text-xs text-slate-500 mt-1">Danh sách các thiết bị mới đang chờ cấp quyền truy cập vào hệ thống.</p>
              </div>
              <button onClick={() => setIsApprovalModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors bg-white p-2 rounded-lg border border-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {pendingDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 className="w-16 h-16 text-emerald-100 mb-4" />
                  <p className="text-lg font-bold text-slate-600">Tuyệt vời!</p>
                  <p className="text-sm">Không còn yêu cầu truy cập nào đang chờ duyệt.</p>
                </div>
              ) : (
                pendingDevices.map(d => (
                  <div key={d.id} className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Cột 1: Thông tin */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-100 rounded-xl">{getDeviceIcon(d.type)}</div>
                          <div>
                            <p className="font-bold text-slate-800 text-lg">{d.name}</p>
                            <p className="text-xs font-mono text-slate-500">{d.id} • {d.os} • {d.browser}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div><span className="text-slate-400 text-xs block mb-0.5 uppercase font-bold">Tài khoản</span><span className="font-bold text-sky-600">{d.account}</span></div>
                          <div><span className="text-slate-400 text-xs block mb-0.5 uppercase font-bold">IP Yêu cầu</span><span className="font-bold font-mono text-slate-700">{d.ip}</span></div>
                        </div>
                      </div>

                      {/* Cột 2: Ghi chú & Nút */}
                      <div className="w-64 shrink-0 flex flex-col gap-3">
                        <div className="relative">
                          <ClipboardEdit className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input 
                            type="text" 
                            placeholder="Nhập ghi chú duyệt..."
                            value={approvalNotes[d.id] || ''}
                            onChange={(e) => setApprovalNotes({...approvalNotes, [d.id]: e.target.value})}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:bg-white transition-colors"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeviceAction(d.id, 'APPROVED')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 shadow-sm transition-colors"><Check className="w-4 h-4" /> Duyệt</button>
                          <button onClick={() => handleDeviceAction(d.id, 'REJECTED')} className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors"><X className="w-4 h-4" /> Từ chối</button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT THIẾT BỊ TRUY CẬP */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                {getDeviceIcon(selectedDevice.type)} Thông tin Thiết bị
              </h2>
              <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Định danh phần cứng</p>
                <p className="font-bold text-slate-800 text-lg">{selectedDevice.name}</p>
                <p className="text-sm text-slate-600 font-mono mt-1">ID: {selectedDevice.id}</p>
                {selectedDevice.note && (
                  <p className="mt-3 text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 flex gap-2">
                    <ClipboardEdit className="w-4 h-4 shrink-0 mt-0.5" /> Ghi chú: {selectedDevice.note}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Hệ điều hành</p>
                  <p className="font-bold text-slate-700 text-sm">{selectedDevice.os}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Trình duyệt / App</p>
                  <p className="font-bold text-slate-700 text-sm">{selectedDevice.browser}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Địa chỉ IP</p>
                  <p className="font-bold font-mono text-sky-600 text-sm">{selectedDevice.ip}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tài khoản</p>
                  <p className="font-bold text-slate-700 text-sm truncate" title={selectedDevice.account}>{selectedDevice.account}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              {selectedDevice.status === 'PENDING' ? (
                <>
                  <button onClick={() => handleDeviceAction(selectedDevice.id, 'APPROVED')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><Check className="w-4 h-4" /> Duyệt thiết bị</button>
                  <button onClick={() => handleDeviceAction(selectedDevice.id, 'REJECTED')} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"><X className="w-4 h-4" /> Từ chối</button>
                </>
              ) : selectedDevice.status === 'LOCKED' ? (
                <>
                  <button onClick={() => handleDeviceAction(selectedDevice.id, 'APPROVED')} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors">Mở khóa truy cập</button>
                  <button onClick={() => setSelectedDevice(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">Đóng</button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDeviceAction(selectedDevice.id, 'LOCKED')} className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors">Khóa truy cập</button>
                  <button onClick={() => setSelectedDevice(null)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-300 transition-colors">Đóng</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM TÀI KHOẢN MỚI */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-500" /> Thêm tài khoản nhân sự
              </h2>
              <button
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {accountFormError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {accountFormError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn Bình"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: binh.nv"
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email công việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="VD: binh.nv@drivelinker.vn"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Vai trò phân quyền
                </label>
                <select
                  value={accountForm.role}
                  onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                >
                  <option value="TENANT_STAFF">Nhân viên (TENANT_STAFF - Quản lý xe, xem hợp đồng, tạo yêu cầu)</option>
                  <option value="TENANT_ADMIN">Quản trị viên (TENANT_ADMIN - Duyệt giá, cấu hình, quản lý nhân sự)</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <strong>Lưu ý:</strong> Tài khoản được tạo sẽ lưu vào hệ thống dữ liệu doanh nghiệp và có thể dùng để đăng nhập ngay lập tức.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl shadow transition-all active:scale-95 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}