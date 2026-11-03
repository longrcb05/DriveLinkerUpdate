import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldAlert, Key, User, AlertCircle, Eye, EyeOff,
  ArrowRight, ShieldCheck, Terminal, ArrowLeft, Loader2, Lock
} from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('ADMINLONG');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Hàm chọn nhanh tài khoản Quản trị viên lõi (1-Click)
  const applyPreset = (user: string, pass: string = '123456') => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      let adminName = '';
      const inputUser = username.trim().toUpperCase();

      if (inputUser === 'ADMINLONG' && password === '123456') {
        adminName = 'Nguyễn Nhật Long';
      } else if (inputUser === 'ADMINAN' && password === '123456') {
        adminName = 'Nguyễn Phạm Thiện Ân';
      }

      if (adminName) {
        // 1. KHỞI TẠO DỮ LIỆU CÔNG TY MẪU NẾU TRÌNH DUYỆT CHƯA CÓ
        if (!localStorage.getItem('sys_tenants')) {
          localStorage.setItem('sys_tenants', JSON.stringify([
            { id: 'COMPANY_A', name: 'Demo CTY A', code: 'CTYA26', ownerName: 'Trần Văn A', phone: '0901234567', address: '123 Nguyễn Văn Linh, Đà Nẵng' },
            { id: 'COMPANY_B', name: 'Demo CTY B', code: 'CTYB26', ownerName: 'Lê Thị B', phone: '0912345678', address: '456 Lê Duẩn, Hà Nội' },
            { id: 'COMPANY_C', name: 'Demo CTY C', code: 'CTYC26', ownerName: 'Phạm Văn C', phone: '0987654321', address: '789 Nguyễn Huệ, TP. HCM' }
          ]));
        }

        // 2. LƯU PHIÊN ĐĂNG NHẬP ADMIN VÀO SESSION STORAGE (TỰ ĐỘNG THU HỒI KHI ĐÓNG TAB)
        sessionStorage.setItem('sys_core_role', 'SUPER_ADMIN');
        sessionStorage.setItem('sys_core_admin_name', adminName);

        // 3. CHUYỂN HƯỚNG SANG TRANG DANH SÁCH DOANH NGHIỆP
        navigate('/overview/admin');
      } else {
        setError('Tài khoản hoặc mật khẩu Quản trị viên không chính xác!');
        setIsLoading(false);
      }
    }, 500); // Giả lập handshake xác thực 500ms
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative font-sans selection:bg-rose-500 selection:text-white overflow-hidden">

      {/* Hiệu ứng hào quang bảo mật nền tối (Cyber Crimson Ambient Light) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Grid Pattern nhẹ nhàng */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Khối Card chính */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-xl p-8 sm:p-10 relative z-10 animate-in fade-in zoom-in-95 duration-200">

        {/* Header Huy Hiệu Bảo Mật Cấp Cao */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-xl shadow-rose-600/30 ring-1 ring-white/20 mb-4 transform hover:scale-105 transition-transform">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Terminal className="w-3.5 h-3.5" />
              Root Privilege // Level 1
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Xác thực System Admin
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-sm mx-auto">
            Cổng quản trị lõi DriveLinker. Truy cập quyền giám sát toàn quyền và kiểm soát Tenant.
          </p>
        </div>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3.5 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form Đăng Nhập */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* Ô Tài khoản Root */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Tài khoản Quản trị viên (Username) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toUpperCase())}
                placeholder="VD: ADMINLONG hoặc ADMINAN"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-slate-950 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Ô Mật khẩu Root */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Mật khẩu truy cập (Secret Key) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Key className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mã bảo mật..."
                className="w-full pl-11 pr-11 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-slate-950 transition-all shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập Quyền Root */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-5 bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác minh chữ ký quyền Root...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Xác thực & Mở quyền Root</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Tiện ích chọn nhanh Admin (Dành cho buổi bảo vệ đồ án) */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              Chọn nhanh Admin (1-Click):
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Pass: 123456</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => applyPreset('ADMINLONG')}
              className={`text-left p-3 rounded-xl border text-xs transition-all ${
                username === 'ADMINLONG'
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Quản trị viên 1</span>
                <span className="text-[10px] font-mono text-rose-400 font-bold">ADMINLONG</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">Nguyễn Nhật Long</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('ADMINAN')}
              className={`text-left p-3 rounded-xl border text-xs transition-all ${
                username === 'ADMINAN'
                  ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/70 hover:border-slate-700'
              }`}
            >
              <div className="font-bold flex items-center justify-between">
                <span>Quản trị viên 2</span>
                <span className="text-[10px] font-mono text-rose-400 font-bold">ADMINAN</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-1 truncate">Nguyễn Phạm Thiện Ân</div>
            </button>
          </div>
        </div>

        {/* Ghi chú về cơ chế bảo mật Session Storage */}
        <p className="text-[11px] text-slate-500 text-center mt-6 leading-relaxed italic">
          *Phiên đăng nhập Super Admin được lưu trữ tạm thời trên SessionStorage và tự động bị vô hiệu hóa khi đóng tab trình duyệt.
        </p>

        {/* Lối quay về Portal Doanh nghiệp */}
        <div className="mt-4 pt-4 border-t border-slate-800/50 text-center">
          <Link
            to="/portal/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-sky-400 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Cổng Đăng nhập Doanh nghiệp (DriveLinker)</span>
          </Link>
        </div>

      </div>

    </div>
  );
}
