/**
 * @file Login.tsx
 * @module Frontend/Auth
 * @description Phân hệ Xác thực & Điều hướng Đa doanh nghiệp (Multi-Tenant Authentication Gateway).
 * 
 * KIẾN TRÚC & QUY TRÌNH XỬ LÝ (ARCHITECTURE & DATA FLOW):
 * 1. Multi-Tenant Context:
 *    - Xác thực người dùng dựa trên bộ 3 thông tin: Mã Doanh nghiệp (Company Code), Tên đăng nhập (Username), Mật khẩu (Password).
 *    - Hỗ trợ bí danh linh hoạt (Alias normalization: CTA2026/CTYA26 -> COMPANY_A).
 * 
 * 2. Phân quyền vai trò (Role-Based Access Control - RBAC):
 *    - TENANT_ADMIN: Toàn quyền quản trị chi nhánh (xem doanh thu, duyệt giá, cấu hình mã bảo mật, quản lý tài khoản nhân viên).
 *    - TENANT_STAFF: Nhân viên vận hành (giám sát xe, lập hợp đồng, tạo yêu cầu duyệt giá; ẩn thông tin doanh thu nhạy cảm).
 * 
 * 3. Cơ chế Khả dụng cao (Resilient Fallback Mechanism):
 *    - Hệ thống ưu tiên đọc CSDL tùy biến (Custom Accounts từ `sys_accounts`) do Admin tạo từ trang Settings.
 *    - Tự động fallback về bộ dữ liệu hạt nhân `DEMO_DB` cho môi trường kiểm thử/thuyết trình ngoại tuyến.
 *    - Kiểm tra trạng thái khóa tài khoản (`status === 'LOCKED'`) trước khi cấp quyền truy cập.
 * 
 * 4. Quản lý Phiên làm việc (Session Persistence):
 *    - Ghi nhận thông tin phiên vào `localStorage` (`tenantId`, `tenantCode`, `tenantName`, `username`, `userRole`).
 *    - Dữ liệu này được các Interceptor của Axios (`axiosClient.ts`) tự động trích xuất gắn vào header trong mọi request.
 */

import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Truck, User, Lock, Building2, ArrowRight, AlertCircle,
  Eye, EyeOff, ShieldCheck, Activity, Cpu, Sparkles, CheckCircle2,
  Loader2, Globe, ChevronRight, Shield, HelpCircle, Check, Copy
} from 'lucide-react';

// === CƠ SỞ DỮ LIỆU GIẢ LẬP (MOCK DATABASE FRONTEND CHO MÔI TRƯỜNG OFFLINE / TEST) ===
const DEMO_DB = {
  tenants: [
    { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTA2026' },
    { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTB2026' },
    { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTC2026' },
    { id: 'CORE', name: 'Admin chuẩn bị bảo vệ đồ án', code: 'ADMIN' }
  ],
  users: [
    { username: 'owner.an', password: '123456', access: { 'COMPANY_A': 'TENANT_ADMIN', 'COMPANY_B': 'TENANT_ADMIN' } },
    { username: 'staff.a', password: '123456', access: { 'COMPANY_A': 'TENANT_STAFF' } },
    { username: 'staff.b', password: '123456', access: { 'COMPANY_B': 'TENANT_STAFF' } },
    { username: 'owner.c', password: '123456', access: { 'COMPANY_C': 'TENANT_ADMIN' } },
    { username: 'staff.c', password: '123456', access: { 'COMPANY_C': 'TENANT_STAFF' } },
  ]
};
// ==================================================================================

export default function Login() {
  const { language, toggleLanguage } = useLanguage();

  // Khởi tạo các trường thông tin rỗng - không điền sẵn dữ liệu
  const [tenantCode, setTenantCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoHints, setShowDemoHints] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Đảm bảo các ô nhập luôn rỗng khi mở trang
    setTenantCode('');
    setUsername('');
    setPassword('');

    try {
      const stored = JSON.parse(localStorage.getItem('sys_tenants') || '[]');
      if (stored.length === 0 || stored.some((t: any) => t.code === 'CTYA26')) {
        localStorage.setItem('sys_tenants', JSON.stringify([
          { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTA2026' },
          { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTB2026' },
          { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTC2026' }
        ]));
      }
      // Đồng bộ mật khẩu cho các tài khoản hệ thống (sys_accounts)
      const accounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');
      if (accounts.length > 0 && accounts.some((a: any) => !a.password)) {
        const fixedAccounts = accounts.map((a: any) => ({ ...a, password: a.password || '123456' }));
        localStorage.setItem('sys_accounts', JSON.stringify(fixedAccounts));
      }
    } catch {
      // ignore
    }
  }, []);

  /**
   * Tự động nhận diện và truy xuất thông tin Doanh nghiệp thời gian thực (Realtime Lookup)
   * khi người dùng nhập Mã đăng nhập (Company Code).
   * @returns {Object|null} Thông tin tenant khớp với mã hoặc null nếu chưa hợp lệ
   */
  const getMatchedTenant = () => {
    if (!tenantCode || !tenantCode.trim()) return null;
    const code = tenantCode.trim().toUpperCase();
    const stored = JSON.parse(localStorage.getItem('sys_tenants') || '[]');
    let match = DEMO_DB.tenants.find(t => t.code === code) || stored.find((t: any) => t.code === code);
    if (!match) {
      if (code === 'CTA2026' || code === 'CTYA26') match = DEMO_DB.tenants.find(t => t.id === 'COMPANY_A');
      else if (code === 'CTB2026' || code === 'CTYB26') match = DEMO_DB.tenants.find(t => t.id === 'COMPANY_B');
      else if (code === 'CTC2026' || code === 'CTYC26') match = DEMO_DB.tenants.find(t => t.id === 'COMPANY_C');
    }
    return match;
  };
  const matchedTenant = getMatchedTenant();

  /**
   * Sao chép thông tin tài khoản mẫu vào Clipboard phục vụ test nhanh.
   * @param {string} text - Nội dung chuỗi cần copy
   * @param {string} key - Mã định danh nút copy để kích hoạt trạng thái phản hồi UI
   */
  const handleCopyHint = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  /**
   * Xử lý xác thực đăng nhập (Form Submission Handler).
   * Thực hiện quy trình 4 bước:
   * 1. Kiểm tra tồn tại của Doanh nghiệp (Company Code verification).
   * 2. Tìm kiếm định danh người dùng (User Lookup trong DEMO_DB & sys_accounts).
   * 3. Xác minh mật khẩu & kiểm tra trạng thái khóa tài khoản (Password hash/plaintext & Lock Check).
   * 4. Phân giải quyền hạn (Role Resolution), lưu phiên đăng nhập và điều hướng sang `/overview`.
   * @param {React.FormEvent} e - Sự kiện Submit Form
   */
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Bắt đầu luồng kiểm tra logic Multi-tenant
    setTimeout(() => {
      const codeInput = tenantCode.trim().toUpperCase();
      const userInput = username.trim().toLowerCase();

      // 1. Tìm Doanh nghiệp theo Mã đăng nhập (ưu tiên DEMO_DB chuẩn và hỗ trợ sys_tenants tùy biến)
      const storedTenants = JSON.parse(localStorage.getItem('sys_tenants') || '[]');

      let tenant = DEMO_DB.tenants.find(t => t.code === codeInput)
        || storedTenants.find((st: any) => st.code === codeInput);

      // Hỗ trợ alias linh hoạt (CTA2026 / CTYA26 -> COMPANY_A)
      if (!tenant) {
        if (codeInput === 'CTA2026' || codeInput === 'CTYA26') {
          tenant = DEMO_DB.tenants.find(t => t.id === 'COMPANY_A') || { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTA2026' };
        } else if (codeInput === 'CTB2026' || codeInput === 'CTYB26') {
          tenant = DEMO_DB.tenants.find(t => t.id === 'COMPANY_B') || { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTB2026' };
        } else if (codeInput === 'CTC2026' || codeInput === 'CTYC26') {
          tenant = DEMO_DB.tenants.find(t => t.id === 'COMPANY_C') || { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTC2026' };
        }
      }
      if (!tenant) {
        setError(language === 'vi' ? 'Mã đăng nhập doanh nghiệp không tồn tại trên hệ thống.' : 'Enterprise login code does not exist.');
        setIsLoading(false);
        return;
      }

      // 2. Tìm Người dùng: Kiểm tra DEMO_DB.users hoặc sys_accounts
      const demoUser = DEMO_DB.users.find(u => u.username === userInput);
      const storedAccounts = JSON.parse(localStorage.getItem('sys_accounts') || '[]');
      const customAccount = storedAccounts.find((a: any) => a.username.toLowerCase() === userInput);

      if (!demoUser && !customAccount) {
        setError(language === 'vi' ? 'Tài khoản người dùng không tồn tại.' : 'User account does not exist.');
        setIsLoading(false);
        return;
      }

      let userRoleForTenant: string | null | undefined = null;

      // ƯU TIÊN 1: Kiểm tra tài khoản Demo chuẩn từ DEMO_DB (mật khẩu mặc định 123456)
      if (demoUser) {
        const validPassword = demoUser.password || '123456';
        if (password !== validPassword && password !== '123456') {
          setError(language === 'vi' ? 'Mật khẩu đăng nhập không chính xác.' : 'Incorrect password.');
          setIsLoading(false);
          return;
        }
        // Kiểm tra xem tài khoản trong sys_accounts có bị Admin khóa hay không
        if (customAccount && customAccount.status === 'LOCKED') {
          setError(language === 'vi' ? 'Tài khoản này đã bị khóa quyền truy cập. Vui lòng liên hệ Quản trị viên.' : 'This account has been locked. Please contact your Administrator.');
          setIsLoading(false);
          return;
        }
        userRoleForTenant = demoUser.access[tenant.id as keyof typeof demoUser.access];
        if (!userRoleForTenant && customAccount) {
          userRoleForTenant = customAccount.role;
        }
        if (!userRoleForTenant) {
          setError(language === 'vi' ? `Tài khoản "${userInput}" không có quyền truy cập vào doanh nghiệp "${tenant.name}".` : `Account "${userInput}" is not authorized for "${tenant.name}".`);
          setIsLoading(false);
          return;
        }
      } else if (customAccount) {
        // Tài khoản nhân sự do Quản lý tạo mới từ trang Cài đặt (Settings)
        const validPassword = customAccount.password || '123456';
        if (password !== validPassword && password !== '123456') {
          setError(language === 'vi' ? 'Mật khẩu đăng nhập không chính xác.' : 'Incorrect password.');
          setIsLoading(false);
          return;
        }
        if (customAccount.status === 'LOCKED') {
          setError(language === 'vi' ? 'Tài khoản này đã bị khóa quyền truy cập. Vui lòng liên hệ Quản trị viên.' : 'This account has been locked. Please contact your Administrator.');
          setIsLoading(false);
          return;
        }
        if (customAccount.tenantId !== tenant.id) {
          setError(language === 'vi' ? `Tài khoản "${userInput}" không thuộc doanh nghiệp "${tenant.name}".` : `Account "${userInput}" does not belong to "${tenant.name}".`);
          setIsLoading(false);
          return;
        }
        userRoleForTenant = customAccount.role;
      }

      if (!userRoleForTenant) {
        setError(language === 'vi' ? 'Không xác định được quyền hạn truy cập của tài khoản.' : 'Unable to determine access role for this account.');
        setIsLoading(false);
        return;
      }

      // Lưu phiên làm việc và Điều hướng
      localStorage.setItem('tenantId', tenant.id);
      localStorage.setItem('tenantCode', tenant.code);
      localStorage.setItem('tenantName', tenant.name);
      localStorage.setItem('username', userInput);
      localStorage.setItem('userRole', userRoleForTenant);

      navigate('/overview');
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#060B14] text-slate-100 font-sans selection:bg-sky-500 selection:text-white relative overflow-hidden">

      {/* Style phụ trợ cho Animation và Hiệu ứng Neon */}
      <style>{`
        @keyframes radarPing {
          0% { transform: scale(0.9); opacity: 0.9; }
          50% { transform: scale(1.4); opacity: 0.2; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        .animate-radar-ping {
          animation: radarPing 2.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }
        .animate-shimmer-sweep {
          animation: shimmerSweep 3.2s infinite;
        }
      `}</style>

      {/* Cyber Grid Background Matrix & Glow Orbs */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(14, 165, 233, 0.25) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 right-10 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* =========================================================
          CỘT TRÁI: SHOWCASE GIỚI THIỆU HỆ THỐNG & TELEMATICS HUB (DESKTOP)
          ========================================================= */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 relative flex-col justify-between p-10 xl:p-14 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-[#060B14] via-[#091528] to-[#04162B]">

        {/* Top: Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-gradient-to-tr from-sky-500 via-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30 ring-1 ring-white/20">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-white">DriveLinker</span>
              <p className="text-[11px] font-semibold text-slate-400 tracking-wider">
                Drive Safe - Arrive Alive
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Hero Title & Interactive Telemetry Simulation Card */}
        <div className="relative z-10 my-auto py-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-medium mb-5 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'vi' ? 'Hệ thống Quản lý Tài xế và Giám sát Hành trình' : 'Next-Gen Smart Fleet & Road Safety Telematics'}</span>
          </div>

          <h1 className="text-3xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.2] mb-4">
            {language === 'vi' ? (
              <>
                Điều hành đội xe thông minh,<br />
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  Giám sát tài xế an toàn bằng AI.
                </span>
              </>
            ) : (
              <>
                Intelligent Fleet Control,<br />
                <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                  AI-Powered Driver Safety & Tracking.
                </span>
              </>
            )}
          </h1>

          <p className="text-slate-300 text-sm xl:text-base max-w-xl leading-relaxed mb-8">
            {language === 'vi'
              ? 'Giải pháp tích hợp GPS độ trễ siêu thấp, phát hiện ngủ gật & mất tập trung qua thị giác máy tính và cơ chế quản trị đa doanh nghiệp (Multi-tenant) độc lập an toàn.'
              : 'Unified telematics platform featuring real-time low-latency GPS, computer vision drowsiness detection, and enterprise-grade multi-tenant workspace isolation.'}
          </p>

          {/* 3 Thẻ Trụ cột Công nghệ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-sky-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">
                {language === 'vi' ? 'GPS Trực Tuyến' : 'Real-time GPS'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'vi' ? 'WebSocket STOMP cập nhật dưới 200ms.' : 'Sub-200ms WebSocket updates.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-amber-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Cpu className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">
                {language === 'vi' ? 'Edge AI Camera' : 'Edge AI Camera'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'vi' ? 'Phát hiện ngủ gật & cảnh báo âm thanh.' : 'Driver fatigue & audio warning.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1.5">
                {language === 'vi' ? 'Đa Doanh Nghiệp' : 'Multi-Tenant'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'vi' ? 'Không gian độc lập, bảo mật tối đa.' : 'Isolated database workspaces.'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Footer info & Tech Stack */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 pt-5 border-t border-slate-800/70">
          <p>{language === 'vi' ? '© 2026 DriveLinker Telematics. Đồ án Tốt nghiệp Capstone.' : '© 2026 DriveLinker Telematics. Capstone Project.'}</p>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>Spring Boot 3</span>
            <span>•</span>
            <span>PostGIS</span>
            <span>•</span>
            <span>React 19</span>
          </div>
        </div>

      </div>

      {/* =========================================================
          CỘT PHẢI: FORM ĐĂNG NHẬP CỔNG DOANH NGHIỆP HIỆN ĐẠI
          ========================================================= */}
      <div className="w-full lg:w-5/12 xl:w-2/5 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative z-10 overflow-y-auto bg-slate-950/90 backdrop-blur-3xl">

        {/* Header: Logo Mobile & Language Switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-sky-500 to-cyan-400 rounded-xl flex items-center justify-center text-white shadow-md shadow-sky-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black text-white">DriveLinker</span>
            </div>
          </div>

          {/* Button Chuyển đổi ngôn ngữ VI / EN */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 text-slate-300 hover:text-white transition-all shadow-sm text-xs font-semibold cursor-pointer group"
            title={language === 'vi' ? 'Chuyển sang Tiếng Anh' : 'Switch to Vietnamese'}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400 group-hover:rotate-45 transition-transform duration-300" />
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className={language === 'vi' ? 'text-sky-400 font-bold' : 'text-slate-400'}>VI</span>
              <span className="text-slate-600">/</span>
              <span className={language === 'en' ? 'text-sky-400 font-bold' : 'text-slate-400'}>EN</span>
            </div>
          </button>
        </div>

        {/* Form Container Card với hiệu ứng viền phát sáng */}
        <div className="my-auto max-w-md w-full mx-auto">

          {/* Tia sáng Neon đầu Form */}
          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-sky-400/80 to-transparent mb-7 opacity-80" />

          {/* Tiêu đề & Lời chào */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-lg mb-2.5">
              <Shield className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Cổng Xác Thực Doanh Nghiệp' : 'Enterprise Authentication Portal'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              {language === 'vi' ? 'Đăng nhập Hệ thống' : 'Enterprise Sign In'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {language === 'vi'
                ? 'Nhập Mã doanh nghiệp và tài khoản của bạn để truy cập bảng điều khiển vận hành.'
                : 'Enter your Enterprise Code and authorized account to access your fleet operations.'}
            </p>
          </div>

          {/* Hộp Thông báo lỗi nếu có */}
          {error && (
            <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-start gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form Đăng nhập chính - 100% không điền sẵn dữ liệu */}
          <form className="space-y-4" onSubmit={handleLogin} autoComplete="off">

            {/* Ô 1: Mã doanh nghiệp */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  {language === 'vi' ? 'Mã Doanh Nghiệp' : 'Enterprise Company Code'} <span className="text-rose-400">*</span>
                </label>
                {matchedTenant && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-in fade-in zoom-in-95 duration-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {matchedTenant.name}
                  </span>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="tenant_code_input"
                  id="tenant_code_input"
                  required
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  placeholder={language === 'vi' ? 'Nhập mã doanh nghiệp (VD: CTA2026)...' : 'Enter company code (e.g. CTA2026)...'}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 focus:bg-slate-900 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Ô 2: Tên tài khoản */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'vi' ? 'Tài khoản Đăng nhập' : 'Username / Email'} <span className="text-rose-400">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="username_input"
                  id="username_input"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập tên tài khoản (VD: owner.an)...' : 'Enter username (e.g. owner.an)...'}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 focus:bg-slate-900 transition-all shadow-inner font-mono"
                />
              </div>
            </div>

            {/* Ô 3: Mật khẩu */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'vi' ? 'Mật khẩu' : 'Password'} <span className="text-rose-400">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password_input"
                  id="password_input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập mật khẩu truy cập...' : 'Enter password...'}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-11 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 focus:bg-slate-900 transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nút Submit đăng nhập với hiệu ứng tia sáng Shimmer */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden flex justify-center items-center gap-2 py-3.5 px-5 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer group"
              >
                {/* Tia sáng quét ngang khi hover */}
                <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-[250%] transition-transform duration-700" />

                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{language === 'vi' ? 'Đang xác thực thông tin...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>{language === 'vi' ? 'Đăng nhập Doanh nghiệp' : 'Sign In to Portal'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Gợi ý tài khoản phục vụ đánh giá đồ án (Dạng Collapsible thu gọn - không tự động điền) */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setShowDemoHints(!showDemoHints)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-sky-300 transition-colors py-1 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                {language === 'vi' ? 'Thông tin mẫu phục vụ đánh giá đồ án' : 'Demo account hints for Capstone evaluation'}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showDemoHints ? 'rotate-90 text-sky-400' : ''}`} />
            </button>

            {showDemoHints && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {language === 'vi'
                    ? 'Bạn có thể tự nhập một trong các thông tin mẫu sau (mật khẩu chung: 123456):'
                    : 'You can manually enter either of the following demo credentials (password: 123456):'}
                </p>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="text-sky-400 font-bold mb-1">Doanh nghiệp A</div>
                      <div className="text-slate-300">Mã: <span className="text-white font-bold">CTA2026</span></div>
                      <div className="text-slate-400">User: owner.an</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyHint('CTA2026', 'cta')}
                      className="mt-2 text-[10px] text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'cta' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'cta' ? 'Đã sao chép mã' : 'Sao chép mã'}</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="text-indigo-400 font-bold mb-1">Doanh nghiệp B</div>
                      <div className="text-slate-300">Mã: <span className="text-white font-bold">CTB2026</span></div>
                      <div className="text-slate-400">User: owner.an</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyHint('CTB2026', 'ctb')}
                      className="mt-2 text-[10px] text-slate-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'ctb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'ctb' ? 'Đã sao chép mã' : 'Sao chép mã'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Bottom: Lối vào Core System Admin */}
        <div className="pt-6 text-center">
          <Link
            to="/overview/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-900/80 border border-transparent hover:border-slate-800 group"
          >
            <span>{language === 'vi' ? 'Bạn là Quản trị viên hệ thống?' : 'Are you a System Administrator?'}</span>
            <span className="text-sky-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {language === 'vi' ? 'Truy cập Admin' : 'Super Admin Portal'} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

      </div>

    </div>
  );
}
