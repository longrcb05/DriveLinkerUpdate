/**
 * @file Settings.tsx
 * @module Frontend/Settings
 * @description Bảng Cấu hình Bảo mật, Thiết bị Truy cập & Quản trị Nhân sự Doanh nghiệp (Enterprise Settings & Security Audit) dành cho Quản trị viên (Tenant Admin).
 * 
 * PHÂN HỆ QUẢN TRỊ & TÍNH NĂNG KỸ THUẬT:
 * 1. Quản lý Mã Định danh Doanh nghiệp (Company Code Administration):
 *    - Cho phép Quản lý cập nhật mã đăng nhập riêng (Company Code).
 *    - Ràng buộc bảo mật 2 lớp: Bắt buộc nhập mật khẩu xác nhận của Quản lý trước khi cho phép ghi đè mã mới.
 *    - Tự động ghi vết sự kiện đổi mã vào Nhật ký Hệ thống (Audit Log).
 * 
 * 2. Giám sát Thiết bị Truy cập & Phát hiện Xung đột IP (Access Device & Anomaly Detection):
 *    - Thu thập thông tin phiên: Hệ điều hành (Windows, macOS, iOS, Android), Trình duyệt, Địa chỉ IP và Mã vân tay thiết bị (`deviceFingerprint`).
 *    - Cảnh báo bất thường thời gian thực (Real-time Anomaly Warning) khi phát hiện cùng 1 tài khoản đăng nhập từ nhiều địa chỉ IP khác nhau.
 * 
 * 3. Quản trị Nhân sự & Khóa Tài khoản Tức Thời:
 *    - Thêm tài khoản nhân viên mới (`TENANT_STAFF`), kiểm tra chống trùng username.
 *    - Tính năng Khóa / Mở khóa tài khoản nhân sự tức thời (`status: 'ACTIVE' | 'LOCKED'`), tự động đồng bộ sang màn hình Đăng nhập.
 * 
 * 4. Cấu hình Dịch vụ Lõi (Platform Core Services):
 *    - Công tắc bật/tắt các module dịch vụ nền tảng (GPS Tracking, AI DMS, Cảnh báo tức thời) dành riêng cho quyền quản trị cấp cao.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  History,
  Clock,
  ShieldAlert,
  Smartphone,
  Monitor,
  Laptop,
  Info,
  AlertTriangle,
  Cpu,
  Check,
  X,
  Camera,
  MapPin,
  Bell,
  Lock,
  Save,
  ShieldCheck,
  ClipboardEdit,
  CheckSquare,
  Users,
  UserPlus,
  Search
} from 'lucide-react';

type SettingsTab = 'GENERAL' | 'ACCOUNTS' | 'DEVICES' | 'LOGS';

interface TenantItem {
  id: string;
  name: string;
  code: string;
}

interface AccountItem {
  id: string;
  tenantId: string;
  username: string;
  fullName: string;
  email: string;
  role: 'TENANT_ADMIN' | 'TENANT_STAFF' | string;
  status: 'ACTIVE' | 'LOCKED';
  password?: string;
  passwordHash?: string;
  createdAt: string;
}

interface AccessDevice {
  id: string;
  tenantId: string;
  name: string;
  type: 'Laptop' | 'Mobile' | 'Desktop' | string;
  ip: string;
  account: string;
  lastLogin: string;
  status: 'APPROVED' | 'PENDING' | 'LOCKED' | 'REJECTED';
  os: string;
  browser: string;
  note?: string;
}

interface AuditLogItem {
  id: string;
  tenantId: string;
  user: string;
  action: string;
  target: string;
  result: string;
  timestamp: number;
  timeStr: string;
}

interface CoreServicesConfig {
  gpsTracking: boolean;
  aiCamera: boolean;
  speedAlert: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}

const DEFAULT_CORE_SERVICES: CoreServicesConfig = {
  gpsTracking: true,
  aiCamera: false,
  speedAlert: true
};

const safeParse = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Khởi tạo dữ liệu mẫu nếu chưa tồn tại trong localStorage (không ghi đè dữ liệu đã chỉnh sửa)
 */
const ensureSeedData = () => {
  const storedTenants = safeParse<TenantItem[]>('sys_tenants', []);
  if (storedTenants.length === 0) {
    localStorage.setItem(
      'sys_tenants',
      JSON.stringify([
        { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTA2026' },
        { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTB2026' },
        { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTC2026' }
      ])
    );
  }

  if (!localStorage.getItem('sys_logs')) {
    localStorage.setItem('sys_logs', JSON.stringify([]));
  }

  const existingAccounts = safeParse<AccountItem[]>('sys_accounts', []);
  if (existingAccounts.length === 0) {
    localStorage.setItem(
      'sys_accounts',
      JSON.stringify([
        {
          id: 'ACC-001',
          tenantId: 'COMPANY_A',
          username: 'owner.an',
          fullName: 'Nguyễn Văn An',
          email: 'owner.an@drivelinker.vn',
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          password: '123456',
          createdAt: '2026-10-15'
        },
        {
          id: 'ACC-002',
          tenantId: 'COMPANY_A',
          username: 'staff.a',
          fullName: 'Trần Thị Lan',
          email: 'staff.a@drivelinker.vn',
          role: 'TENANT_STAFF',
          status: 'ACTIVE',
          password: '123456',
          createdAt: '2026-10-20'
        },
        {
          id: 'ACC-003',
          tenantId: 'COMPANY_B',
          username: 'staff.b',
          fullName: 'Lê Văn Bình',
          email: 'staff.b@drivelinker.vn',
          role: 'TENANT_STAFF',
          status: 'ACTIVE',
          password: '123456',
          createdAt: '2026-10-22'
        },
        {
          id: 'ACC-004',
          tenantId: 'COMPANY_C',
          username: 'owner.c',
          fullName: 'Vũ Văn Cường',
          email: 'owner.c@drivelinker.vn',
          role: 'TENANT_ADMIN',
          status: 'ACTIVE',
          password: '123456',
          createdAt: '2026-10-25'
        },
        {
          id: 'ACC-005',
          tenantId: 'COMPANY_C',
          username: 'staff.c',
          fullName: 'Phạm Thị Chi',
          email: 'staff.c@drivelinker.vn',
          role: 'TENANT_STAFF',
          status: 'ACTIVE',
          password: '123456',
          createdAt: '2026-10-26'
        }
      ])
    );
  }

  const existingDevices = safeParse<AccessDevice[]>('sys_access_devices', []);
  if (existingDevices.length === 0) {
    localStorage.setItem(
      'sys_access_devices',
      JSON.stringify([
        {
          id: 'DEV-001',
          tenantId: 'COMPANY_A',
          name: 'MacBook Pro',
          type: 'Laptop',
          ip: '113.190.23.44',
          account: 'manager@drivelinker.vn',
          lastLogin: '2026-10-28 08:00',
          status: 'APPROVED',
          os: 'macOS',
          browser: 'Safari'
        },
        {
          id: 'DEV-002',
          tenantId: 'COMPANY_A',
          name: 'iPhone 15 Pro',
          type: 'Mobile',
          ip: '14.232.11.22',
          account: 'nhanvien1@drivelinker.vn',
          lastLogin: '2026-10-28 09:15',
          status: 'LOCKED',
          os: 'iOS 17.1',
          browser: 'Chrome'
        },
        {
          id: 'DEV-003',
          tenantId: 'COMPANY_A',
          name: 'Windows PC',
          type: 'Desktop',
          ip: '113.190.23.44',
          account: 'admin@drivelinker.vn',
          lastLogin: '2026-10-27 14:00',
          status: 'APPROVED',
          os: 'Windows 11',
          browser: 'Cốc Cốc'
        },
        {
          id: 'DEV-004',
          tenantId: 'COMPANY_A',
          name: 'iPad Air 5',
          type: 'Mobile',
          ip: '113.190.23.12',
          account: 'sale1@drivelinker.vn',
          lastLogin: 'Vừa xong',
          status: 'PENDING',
          os: 'iPadOS 17',
          browser: 'Safari'
        },
        {
          id: 'DEV-005',
          tenantId: 'COMPANY_A',
          name: 'Dell XPS 15',
          type: 'Laptop',
          ip: '113.190.23.12',
          account: 'sale2@drivelinker.vn',
          lastLogin: 'Vừa xong',
          status: 'PENDING',
          os: 'Windows 11',
          browser: 'Edge'
        }
      ])
    );
  }
};

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'Laptop':
      return <Laptop className="w-4 h-4 text-slate-600" />;
    case 'Mobile':
      return <Smartphone className="w-4 h-4 text-slate-600" />;
    default:
      return <Monitor className="w-4 h-4 text-slate-600" />;
  }
};

export default function Settings() {
  const { t, language } = useLanguage();
  const [userRole] = useState(() => localStorage.getItem('userRole') || 'TENANT_STAFF');
  const [tenantId] = useState(() => localStorage.getItem('tenantId') || 'COMPANY_A');
  const currentUserEmail = localStorage.getItem('username') || 'admin@drivelinker.vn';
  const isAdminImpersonating = localStorage.getItem('isAdminImpersonating') === 'true';

  const [activeTab, setActiveTab] = useState<SettingsTab>('GENERAL');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // --- State: Mã doanh nghiệp ---
  const [currentCode, setCurrentCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [codeMessage, setCodeMessage] = useState({ type: '', text: '' });

  // --- State: Cấu hình dịch vụ lõi (lưu theo tenantId) ---
  const [coreServices, setCoreServices] = useState<CoreServicesConfig>(() =>
    safeParse<CoreServicesConfig>(`sys_core_services_${tenantId}`, DEFAULT_CORE_SERVICES)
  );

  // --- State: Thiết bị truy cập ---
  const [deviceList, setDeviceList] = useState<AccessDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<AccessDevice | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [confirmLockDeviceId, setConfirmLockDeviceId] = useState<string | null>(null);

  // --- State: Tài khoản doanh nghiệp ---
  const [accountList, setAccountList] = useState<AccountItem[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [confirmAccountId, setConfirmAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'TENANT_STAFF'
  });
  const [accountFormError, setAccountFormError] = useState('');

  // --- State: Nhật ký thao tác ---
  const [activityLogs, setActivityLogs] = useState<AuditLogItem[]>([]);
  const [logSearch, setLogSearch] = useState('');

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const loadData = useCallback(() => {
    const tenants = safeParse<TenantItem[]>('sys_tenants', []);
    const currentTenant = tenants.find((item) => item.id === tenantId);
    if (currentTenant) setCurrentCode(currentTenant.code);

    setCoreServices(
      safeParse<CoreServicesConfig>(`sys_core_services_${tenantId}`, DEFAULT_CORE_SERVICES)
    );

    const allLogs = safeParse<AuditLogItem[]>('sys_logs', []);
    setActivityLogs(
      allLogs
        .filter((l) => l.tenantId === tenantId)
        .sort((a, b) => b.timestamp - a.timestamp)
    );

    const allAccounts = safeParse<AccountItem[]>('sys_accounts', []);
    setAccountList(allAccounts.filter((a) => a.tenantId === tenantId));

    const allDevices = safeParse<AccessDevice[]>('sys_access_devices', []);
    setDeviceList(allDevices.filter((d) => d.tenantId === tenantId));
  }, [tenantId]);

  useEffect(() => {
    ensureSeedData();
    loadData();
  }, [loadData]);

  // Đóng nhanh modal bằng phím ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsApprovalModalOpen(false);
      setSelectedDevice(null);
      setIsAddAccountModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // --- Dữ liệu tính toán bằng useMemo ---
  const { pendingDevices, pendingCount, deviceAnomaly, anomalyIpSet } = useMemo(() => {
    const pending: AccessDevice[] = [];
    const ipMap = new Map<string, Set<string>>();

    for (const d of deviceList) {
      if (d.status === 'PENDING') pending.push(d);
      if (!ipMap.has(d.ip)) ipMap.set(d.ip, new Set());
      ipMap.get(d.ip)!.add(d.account);
    }

    const conflicts: { ip: string; accounts: string[] }[] = [];
    const ipSet = new Set<string>();
    for (const [ip, accounts] of ipMap.entries()) {
      if (accounts.size > 1) {
        conflicts.push({ ip, accounts: Array.from(accounts) });
        ipSet.add(ip);
      }
    }

    return {
      pendingDevices: pending,
      pendingCount: pending.length,
      deviceAnomaly: conflicts,
      anomalyIpSet: ipSet
    };
  }, [deviceList]);

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    if (!q) return accountList;
    return accountList.filter(
      (acc) =>
        acc.fullName.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q)
    );
  }, [accountList, accountSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return activityLogs;
    return activityLogs.filter(
      (log) =>
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q)
    );
  }, [activityLogs, logSearch]);

  // --- Ghi nhật ký hoạt động ---
  const logActivity = useCallback(
    (action: string, target: string, result = 'Thành công') => {
      const now = Date.now();
      const timeStr = new Date(now).toLocaleString('vi-VN');
      const newLog: AuditLogItem = {
        id: `LOG_${now}`,
        tenantId,
        user: currentUserEmail,
        action,
        target,
        result,
        timestamp: now,
        timeStr
      };

      const allLogs = safeParse<AuditLogItem[]>('sys_logs', []);
      localStorage.setItem('sys_logs', JSON.stringify([newLog, ...allLogs]));
      setActivityLogs((prev) => [newLog, ...prev]);

      if (isAdminImpersonating) {
        const adminName = sessionStorage.getItem('sys_core_admin_name') || 'Quản trị viên';
        const tenantName = localStorage.getItem('tenantName') || 'Doanh nghiệp';
        const coreLogs = safeParse<any[]>('sys_core_audit_logs', []);

        let coreAction = 'THAY ĐỔI';
        if (action.includes('thiết bị')) coreAction = 'XÉT DUYỆT';
        else if (action.includes('dịch vụ')) coreAction = 'CẤU HÌNH';
        else if (action.includes('mã')) coreAction = 'BẢO MẬT';

        localStorage.setItem(
          'sys_core_audit_logs',
          JSON.stringify([
            {
              id: now + 1,
              time: timeStr,
              admin: adminName,
              action: coreAction,
              details: `${action}: ${target} (tại ${tenantName})`
            },
            ...coreLogs
          ])
        );
      }
    },
    [tenantId, currentUserEmail, isAdminImpersonating]
  );

  // ================= LOGIC MÃ DOANH NGHIỆP =================
  const handleSaveCode = () => {
    setCodeMessage({ type: '', text: '' });
    const codeRegex = /^[A-Za-z0-9]{6}$/;

    if (!codeRegex.test(newCode)) {
      return setCodeMessage({ type: 'error', text: t('settings.codeErrorLength') });
    }
    if (newCode !== confirmCode) {
      return setCodeMessage({ type: 'error', text: t('settings.codeErrorMismatch') });
    }
    if (newCode.toUpperCase() === currentCode.toUpperCase()) {
      return setCodeMessage({ type: 'error', text: t('settings.codeErrorSame') });
    }

    const tenants = safeParse<TenantItem[]>('sys_tenants', []);
    if (tenants.some((item) => item.code.toUpperCase() === newCode.toUpperCase())) {
      return setCodeMessage({ type: 'error', text: t('settings.codeErrorDuplicate') });
    }

    const normalizedCode = newCode.toUpperCase();
    const updatedTenants = tenants.map((item) =>
      item.id === tenantId ? { ...item, code: normalizedCode } : item
    );
    localStorage.setItem('sys_tenants', JSON.stringify(updatedTenants));
    localStorage.setItem('tenantCode', normalizedCode);

    logActivity('Đổi mã doanh nghiệp', `Mã mới: ${normalizedCode}`);

    setCurrentCode(normalizedCode);
    setIsEditingCode(false);
    setNewCode('');
    setConfirmCode('');
    showToast('success', t('settings.codeSuccess'));
  };

  // ================= LOGIC DỊCH VỤ LÕI =================
  const handleToggleCoreService = (service: keyof CoreServicesConfig) => {
    if (!isAdminImpersonating) return;
    setCoreServices((prev) => ({ ...prev, [service]: !prev[service] }));
  };

  const handleSaveCoreServices = () => {
    localStorage.setItem(`sys_core_services_${tenantId}`, JSON.stringify(coreServices));
    const activeModules = Object.entries(coreServices)
      .filter(([, isActive]) => isActive)
      .map(([key]) => key)
      .join(', ');

    logActivity('Cấu hình dịch vụ Lõi', `Kích hoạt: [${activeModules || 'Không có'}]`);
    showToast('success', t('settings.saveServicesSuccess'));
  };

  // ================= LOGIC THIẾT BỊ TRUY CẬP =================
  const handleDeviceAction = (
    id: string,
    action: 'APPROVED' | 'REJECTED' | 'LOCKED',
    customNote?: string
  ) => {
    const finalNote = customNote !== undefined ? customNote : approvalNotes[id] || '';
    const allDevices = safeParse<AccessDevice[]>('sys_access_devices', []);
    const updatedAll = allDevices.map((d) =>
      d.id === id && d.tenantId === tenantId ? { ...d, status: action, note: finalNote } : d
    );
    localStorage.setItem('sys_access_devices', JSON.stringify(updatedAll));

    setDeviceList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: action, note: finalNote } : d))
    );
    setConfirmLockDeviceId(null);

    let logTarget = `Thiết bị ${id} ➔ ${action}`;
    if (finalNote) logTarget += ` (${finalNote})`;
    logActivity('Cập nhật trạng thái thiết bị', logTarget);

    if (approvalNotes[id]) {
      setApprovalNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    if (selectedDevice && selectedDevice.id === id) {
      setSelectedDevice({ ...selectedDevice, status: action, note: finalNote });
    }

    showToast(
      'success',
      action === 'APPROVED'
        ? language === 'vi'
          ? 'Đã phê duyệt thiết bị truy cập.'
          : 'Device approved.'
        : action === 'LOCKED'
        ? language === 'vi'
          ? 'Đã khóa thiết bị truy cập.'
          : 'Device locked.'
        : language === 'vi'
        ? 'Đã từ chối thiết bị.'
        : 'Device rejected.'
    );
  };

  // ================= LOGIC TÀI KHOẢN DOANH NGHIỆP =================
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError('');

    if (
      !accountForm.fullName.trim() ||
      !accountForm.username.trim() ||
      !accountForm.email.trim() ||
      !accountForm.password
    ) {
      setAccountFormError(t('settings.formErrorRequired'));
      return;
    }

    if (accountForm.password.length < 6) {
      setAccountFormError(t('settings.formErrorPasswordLength'));
      return;
    }

    const cleanUsername = accountForm.username.trim().toLowerCase();
    const cleanEmail = accountForm.email.trim().toLowerCase();
    const allAccounts = safeParse<AccountItem[]>('sys_accounts', []);

    const isDuplicate = allAccounts.some(
      (a) => a.username.toLowerCase() === cleanUsername || a.email.toLowerCase() === cleanEmail
    );

    if (isDuplicate) {
      setAccountFormError(
        `Tên đăng nhập "${cleanUsername}" hoặc Email "${cleanEmail}" đã tồn tại trong hệ thống!`
      );
      return;
    }

    const mockPasswordHash = btoa(unescape(encodeURIComponent(accountForm.password)));
    const newAccount: AccountItem = {
      id: `ACC-${Date.now().toString().slice(-6)}`,
      tenantId,
      username: cleanUsername,
      fullName: accountForm.fullName.trim(),
      email: cleanEmail,
      password: accountForm.password,
      passwordHash: mockPasswordHash,
      role: accountForm.role,
      status: 'ACTIVE',
      createdAt: new Date().toISOString().slice(0, 10)
    };

    const updatedAll = [newAccount, ...allAccounts];
    localStorage.setItem('sys_accounts', JSON.stringify(updatedAll));
    setAccountList((prev) => [newAccount, ...prev]);

    logActivity(
      'Tạo tài khoản mới',
      `${cleanUsername} (${accountForm.role === 'TENANT_ADMIN' ? 'Quản trị viên' : 'Nhân viên'})`
    );

    setIsAddAccountModalOpen(false);
    setAccountForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'TENANT_STAFF'
    });
    showToast('success', `Đã tạo tài khoản "${cleanUsername}" thành công.`);
  };

  const handleToggleAccountStatus = (account: AccountItem) => {
    const nextStatus = account.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const allAccounts = safeParse<AccountItem[]>('sys_accounts', []);
    const updatedAll = allAccounts.map((a) =>
      a.id === account.id ? { ...a, status: nextStatus } : a
    );
    localStorage.setItem('sys_accounts', JSON.stringify(updatedAll));
    setAccountList((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, status: nextStatus } : a))
    );
    setConfirmAccountId(null);

    logActivity('Thay đổi trạng thái tài khoản', `${account.username} ➔ ${nextStatus}`);
    showToast(
      'success',
      nextStatus === 'LOCKED'
        ? `Đã khóa tài khoản ${account.username}.`
        : `Đã mở khóa tài khoản ${account.username}.`
    );
  };

  // --- Kiểm tra quyền truy cập trang ---
  if (
    !isAdminImpersonating &&
    userRole !== 'TENANT_ADMIN' &&
    userRole !== 'SYS_ADMIN' &&
    userRole !== 'SUPER_ADMIN_VIEW'
  ) {
    return (
      <div className="flex-1 bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-700">
          {language === 'vi' ? 'Khu vực Giới hạn' : 'Restricted Area'}
        </h2>
        <p className="text-slate-500 mt-1">
          {language === 'vi'
            ? 'Chỉ Quản trị viên doanh nghiệp mới có quyền truy cập trang Cài đặt.'
            : 'Only enterprise administrators are authorized to access Settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6 pb-28 font-sans relative">
      {/* Toast thông báo góc trên bên phải */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[110] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header trang */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{t('settings.title')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
          </div>

          {isAdminImpersonating && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-semibold border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Core Admin Mode
            </span>
          )}
        </div>

        {/* Thanh điều hướng Tabs gọn gàng thay cho 5 khối dài */}
        <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex flex-wrap gap-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'GENERAL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>{language === 'vi' ? 'Bảo mật & Dịch vụ' : 'Security & Services'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'ACCOUNTS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{language === 'vi' ? 'Tài khoản & Phân quyền' : 'Accounts & Roles'}</span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-mono ${
                activeTab === 'ACCOUNTS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {accountList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEVICES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'DEVICES'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>{language === 'vi' ? 'Thiết bị truy cập' : 'Access Devices'}</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full font-bold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'LOGS'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{language === 'vi' ? 'Nhật ký thao tác' : 'Audit Logs'}</span>
            {activityLogs.length > 0 && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full font-mono ${
                  activeTab === 'LOGS'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {activityLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* ================= TAB 1: BẢO MẬT & CẤU HÌNH DỊCH VỤ ================= */}
        {activeTab === 'GENERAL' && (
          <div className="space-y-6">
            {/* 1. Bảo mật & Mã đăng nhập */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{t('settings.securitySectionTitle')}</h3>
                  <p className="text-xs text-slate-500">{t('settings.securitySectionSubtitle')}</p>
                </div>
              </div>
              <div className="p-5">
                {codeMessage.text && (
                  <div
                    className={`mb-4 p-3 rounded-lg flex items-start gap-2 text-sm font-medium border ${
                      codeMessage.type === 'error'
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {codeMessage.type === 'error' ? (
                      <AlertCircle className="w-5 h-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                    )}
                    <span>{codeMessage.text}</span>
                  </div>
                )}
                {!isEditingCode ? (
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        {t('settings.currentCodeLabel')}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-mono font-bold text-slate-800 tracking-widest">
                          {showCode ? currentCode : '••••' + currentCode.slice(-3)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCode((prev) => !prev)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                        >
                          {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingCode(true)}
                      className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    >
                      {t('settings.changeCodeBtn')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('settings.newCodeLabel')}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-mono uppercase"
                          placeholder="VD: CTYA26"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {t('settings.confirmCodeLabel')}
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={confirmCode}
                          onChange={(e) => setConfirmCode(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none font-mono uppercase"
                          placeholder={t('settings.confirmCodePlaceholder')}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCode(false);
                          setCodeMessage({ type: '', text: '' });
                        }}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCode}
                        className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                      >
                        <Key className="w-4 h-4" /> {t('settings.saveCodeBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Cấu hình Dịch vụ Hệ thống (Đồng bộ phong cách sạch, gọn, không chói màu) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{t('settings.coreServicesTitle')}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('settings.coreServicesSubtitle')}
                    </p>
                  </div>
                </div>

                {isAdminImpersonating ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {language === 'vi' ? 'Quyền chỉnh sửa Core Admin' : 'Core Admin Editable'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    {language === 'vi' ? 'Chỉ xem' : 'Read-only'}
                  </span>
                )}
              </div>

              <div className="p-5 space-y-5">
                {!isAdminImpersonating && (
                  <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/70">
                    {language === 'vi' ? (
                      <>
                        Khu vực này được quản lý bởi Hệ thống DriveLinker. Quản trị viên doanh nghiệp chỉ có thể <strong>XEM</strong> các tính năng đang được cấp phép. Liên hệ DriveLinker để nâng cấp gói dịch vụ.
                      </>
                    ) : (
                      <>
                        This area is managed by DriveLinker System. Enterprise administrators can only <strong>VIEW</strong> licensed features.
                      </>
                    )}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Định vị bản đồ */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          coreServices.gpsTracking
                            ? 'bg-sky-100 text-sky-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {t('settings.coreServicesGps')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('settings.coreServicesGpsDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCoreService('gpsTracking')}
                      disabled={!isAdminImpersonating}
                      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
                        !isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${coreServices.gpsTracking ? 'bg-sky-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          coreServices.gpsTracking ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Camera AI */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          coreServices.aiCamera
                            ? 'bg-indigo-100 text-indigo-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {t('settings.coreServicesAi')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('settings.coreServicesAiDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCoreService('aiCamera')}
                      disabled={!isAdminImpersonating}
                      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
                        !isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${coreServices.aiCamera ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          coreServices.aiCamera ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Cảnh báo vi phạm */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          coreServices.speedAlert
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {t('settings.coreServicesAlert')}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t('settings.coreServicesAlertDesc')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCoreService('speedAlert')}
                      disabled={!isAdminImpersonating}
                      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${
                        !isAdminImpersonating ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      } ${coreServices.speedAlert ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          coreServices.speedAlert ? 'left-6' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {isAdminImpersonating && (
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveCoreServices}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" /> {t('settings.saveServicesBtn')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TÀI KHOẢN & PHÂN QUYỀN ================= */}
        {activeTab === 'ACCOUNTS' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" /> {t('settings.accountSectionTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('settings.accountSectionSubtitle')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder={
                      language === 'vi' ? 'Tìm tên, tài khoản, email...' : 'Search accounts...'
                    }
                    className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-sky-500 w-56"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountFormError('');
                    setAccountForm({
                      fullName: '',
                      username: '',
                      email: '',
                      password: '',
                      role: 'TENANT_STAFF'
                    });
                    setIsAddAccountModalOpen(true);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> {t('settings.addAccountBtn')}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-4">{t('settings.colFullName')}</th>
                    <th className="p-4">{t('settings.colUsername')}</th>
                    <th className="p-4">{t('settings.colEmail')}</th>
                    <th className="p-4">{t('settings.colRole')}</th>
                    <th className="p-4">{t('settings.colStatus')}</th>
                    <th className="p-4">{t('settings.colCreatedAt')}</th>
                    <th className="p-4 text-right">{t('settings.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 text-sm">
                        {t('settings.noAccountsYet')}
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{acc.fullName}</td>
                        <td className="p-4 font-mono text-xs font-semibold text-slate-600">
                          {acc.username}
                        </td>
                        <td className="p-4 text-slate-600 text-xs">{acc.email}</td>
                        <td className="p-4">
                          {acc.role === 'TENANT_ADMIN' ? (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                              {t('settings.roleAdmin')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                              {t('settings.roleStaff')}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {acc.status === 'ACTIVE' ? (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {t('settings.activeStatus')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                              {t('settings.lockedStatus')}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-mono">
                          {acc.createdAt || '---'}
                        </td>
                        <td className="p-4 text-right">
                          {confirmAccountId === acc.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleAccountStatus(acc)}
                                className="px-2.5 py-1 text-xs font-bold rounded bg-slate-900 text-white cursor-pointer"
                              >
                                {language === 'vi' ? 'Xác nhận' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmAccountId(null)}
                                className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-600 cursor-pointer"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmAccountId(acc.id)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                                acc.status === 'ACTIVE'
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {acc.status === 'ACTIVE'
                                ? t('settings.lockAccount')
                                : t('settings.unlockAccount')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: THIẾT BỊ TRUY CẬP ================= */}
        {activeTab === 'DEVICES' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-500" /> {t('settings.deviceSectionTitle')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t('settings.deviceSectionSubtitle')}
                  {deviceAnomaly.length > 0 && (
                    <span className="text-rose-600 font-bold ml-2">
                      • Cảnh báo trùng IP: {deviceAnomaly.length} địa chỉ
                    </span>
                  )}
                </p>
              </div>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4" />
                  {t('settings.pendingApprovalBtn')} ({pendingCount})
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-4">{t('settings.colDevice')}</th>
                    <th className="p-4">{t('settings.colIp')}</th>
                    <th className="p-4">{t('settings.colAccount')}</th>
                    <th className="p-4 text-center">{t('settings.colStatus')}</th>
                    <th className="p-4 text-right">{t('settings.colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deviceList.map((d) => {
                    const isAnomaly = anomalyIpSet.has(d.ip);
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">{getDeviceIcon(d.type)}</div>
                            <div>
                              <span className="font-bold text-slate-800">{d.name}</span>
                              <p className="text-[11px] text-slate-400">
                                {language === 'vi' ? 'Truy cập cuối:' : 'Last login:'} {d.lastLogin}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-mono text-xs font-semibold ${
                              isAnomaly
                                ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200'
                                : 'text-slate-600'
                            }`}
                          >
                            {d.ip}
                            {isAnomaly && <AlertTriangle className="w-3 h-3 inline-block ml-1" />}
                          </span>
                        </td>
                        <td className="p-4 text-sky-600 font-semibold text-xs">{d.account}</td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                              d.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : d.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {d.status === 'APPROVED'
                              ? t('settings.deviceApproved')
                              : d.status === 'PENDING'
                              ? t('settings.devicePending')
                              : t('settings.deviceLocked')}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2 items-center">
                            {d.status === 'PENDING' ? (
                              <button
                                type="button"
                                onClick={() => setIsApprovalModalOpen(true)}
                                className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white border border-amber-200 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                              >
                                {t('settings.processDeviceBtn')}
                              </button>
                            ) : d.status === 'LOCKED' ? (
                              <button
                                type="button"
                                onClick={() => handleDeviceAction(d.id, 'APPROVED')}
                                className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                {t('settings.unlockAccount')}
                              </button>
                            ) : confirmLockDeviceId === d.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeviceAction(d.id, 'LOCKED')}
                                  className="px-2.5 py-1 text-xs font-bold rounded bg-rose-600 text-white cursor-pointer"
                                >
                                  {language === 'vi' ? 'Khóa ngay' : 'Lock'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmLockDeviceId(null)}
                                  className="px-2 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-600 cursor-pointer"
                                >
                                  {t('common.cancel')}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmLockDeviceId(d.id)}
                                className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                {t('settings.lockDeviceBtn')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedDevice(d)}
                              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />{' '}
                              {language === 'vi' ? 'Chi tiết' : 'Details'}
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
        )}

        {/* ================= TAB 4: NHẬT KÝ THAO TÁC ================= */}
        {activeTab === 'LOGS' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" /> {t('settings.auditSectionTitle')}
              </h3>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder={language === 'vi' ? 'Lọc theo người dùng, hành động...' : 'Filter logs...'}
                  className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-sky-500 w-60"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="p-3.5 pl-5">{t('settings.colTimestamp')}</th>
                    <th className="p-3.5">{t('settings.colActor')}</th>
                    <th className="p-3.5">{t('settings.colActionName')}</th>
                    <th className="p-3.5">{language === 'vi' ? 'Đối tượng' : 'Target'}</th>
                    <th className="p-3.5 text-center">{language === 'vi' ? 'Kết quả' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">
                          {language === 'vi'
                            ? 'Chưa có nhật ký thao tác nào được ghi nhận'
                            : 'No audit logs recorded yet'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="p-3.5 pl-5 whitespace-nowrap text-slate-500 font-mono">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {log.timeStr}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-700">{log.user}</td>
                        <td className="p-3.5 text-sky-600 font-semibold">{log.action}</td>
                        <td className="p-3.5 text-slate-600">{log.target}</td>
                        <td className="p-3.5 text-center">
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-bold">
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: XÉT DUYỆT THIẾT BỊ HÀNG LOẠT ================= */}
      {isApprovalModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsApprovalModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-500" />{' '}
                  {t('settings.deviceBatchModalTitle')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{t('settings.deviceBatchModalSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {pendingDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <p className="text-base font-bold text-slate-700">
                    {t('settings.deviceEmptyTitle')}
                  </p>
                  <p className="text-xs mt-1">{t('settings.deviceEmptyDesc')}</p>
                </div>
              ) : (
                pendingDevices.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">{getDeviceIcon(d.type)}</div>
                          <div>
                            <p className="font-bold text-slate-800">{d.name}</p>
                            <p className="text-xs font-mono text-slate-500">
                              {d.id} • {d.os} • {d.browser}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-600 pl-1">
                          <span>
                            Tài khoản: <strong className="text-sky-600">{d.account}</strong>
                          </span>
                          <span>
                            IP: <strong className="font-mono text-slate-800">{d.ip}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="sm:w-64 shrink-0 flex flex-col gap-2">
                        <div className="relative">
                          <ClipboardEdit className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder={t('settings.deviceNotePlaceholder')}
                            value={approvalNotes[d.id] || ''}
                            onChange={(e) =>
                              setApprovalNotes((prev) => ({ ...prev, [d.id]: e.target.value }))
                            }
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 focus:bg-white"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeviceAction(d.id, 'APPROVED')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> {t('settings.deviceApproveBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeviceAction(d.id, 'REJECTED')}
                            className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> {t('settings.deviceRejectBtn')}
                          </button>
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

      {/* ================= MODAL: CHI TIẾT THIẾT BỊ ================= */}
      {selectedDevice && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedDevice(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                {getDeviceIcon(selectedDevice.type)} {t('settings.deviceDetailTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDevice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  {t('settings.hardwareIdentity')}
                </p>
                <p className="font-bold text-slate-800 text-base">{selectedDevice.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedDevice.id}</p>
                {selectedDevice.note && (
                  <p className="mt-2.5 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex gap-1.5">
                    <ClipboardEdit className="w-3.5 h-3.5 shrink-0 mt-0.5" />{' '}
                    {t('settings.deviceNoteLabel')} {selectedDevice.note}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                    {t('settings.deviceOs')}
                  </p>
                  <p className="font-bold text-slate-700 text-sm">{selectedDevice.os}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                    {t('settings.deviceBrowser')}
                  </p>
                  <p className="font-bold text-slate-700 text-sm">{selectedDevice.browser}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                    {t('settings.deviceIp')}
                  </p>
                  <p className="font-bold font-mono text-sky-600 text-sm">{selectedDevice.ip}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                    {t('settings.deviceAccount')}
                  </p>
                  <p
                    className="font-bold text-slate-700 text-sm truncate"
                    title={selectedDevice.account}
                  >
                    {selectedDevice.account}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              {selectedDevice.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDeviceAction(selectedDevice.id, 'APPROVED')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> {t('settings.deviceApproveBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeviceAction(selectedDevice.id, 'REJECTED')}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" /> {t('settings.deviceRejectBtn')}
                  </button>
                </>
              ) : selectedDevice.status === 'LOCKED' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDeviceAction(selectedDevice.id, 'APPROVED')}
                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {t('settings.deviceUnlockBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    {t('settings.deviceCloseBtn')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleDeviceAction(selectedDevice.id, 'LOCKED')}
                    className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {t('settings.deviceLockBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    {t('common.close')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: THÊM TÀI KHOẢN MỚI ================= */}
      {isAddAccountModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsAddAccountModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-600" /> {t('settings.addAccountModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              {accountFormError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{accountFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('settings.formFullNameRequired')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('settings.formFullNamePlaceholder')}
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t('settings.formUsernameRequired')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: binh.nv"
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t('settings.formPasswordRequired')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder={t('settings.formPasswordMin')}
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('settings.formEmailRequired')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="VD: binh.nv@drivelinker.vn"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t('settings.formRoleRequired')}
                </label>
                <select
                  value={accountForm.role}
                  onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-sky-500 focus:bg-white font-medium"
                >
                  <option value="TENANT_STAFF">{t('settings.roleStaffDesc')}</option>
                  <option value="TENANT_ADMIN">{t('settings.roleAdminDesc')}</option>
                </select>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                <span>{t('settings.createAccountNotice')}</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> {t('settings.btnCreateAccount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}