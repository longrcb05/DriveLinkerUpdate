import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Car,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

// Danh sách ảnh ô tô cho thuê độ phân giải cao (tự động chuyển ảnh kế tiếp nếu lỗi mạng)
const CAR_RENTAL_IMAGES = [
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1920&q=85',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=85'
];

const DEFAULT_TENANTS = [
  {
    id: 'COMPANY_A',
    name: 'Demo CTY A',
    code: 'CTYA26',
    ownerName: 'Trần Văn A',
    phone: '0901234567',
    address: '123 Nguyễn Văn Linh, Đà Nẵng'
  },
  {
    id: 'COMPANY_B',
    name: 'Demo CTY B',
    code: 'CTYB26',
    ownerName: 'Lê Thị B',
    phone: '0912345678',
    address: '456 Lê Duẩn, Hà Nội'
  },
  {
    id: 'COMPANY_C',
    name: 'Demo CTY C',
    code: 'CTYC26',
    ownerName: 'Phạm Văn C',
    phone: '0987654321',
    address: '789 Nguyễn Huệ, TP. HCM'
  }
];

export default function AdminLogin() {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [bgIndex, setBgIndex] = useState(0);

  const usernameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsername('');
    setPassword('');
    usernameInputRef.current?.focus();
  }, []);

  const handleImageError = () => {
    setBgIndex((prev) =>
      prev + 1 < CAR_RENTAL_IMAGES.length ? prev + 1 : prev
    );
  };

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState('CapsLock'));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

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
        if (!localStorage.getItem('sys_tenants')) {
          localStorage.setItem('sys_tenants', JSON.stringify(DEFAULT_TENANTS));
        }

        sessionStorage.setItem('sys_core_role', 'SUPER_ADMIN');
        sessionStorage.setItem('sys_core_admin_name', adminName);
        navigate('/overview/admin');
      } else {
        setError(
          language === 'vi'
            ? 'Tài khoản hoặc mật khẩu không chính xác.'
            : 'Invalid administrator username or password.'
        );
        setIsLoading(false);
      }
    }, 350);
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between bg-[#0B1324] font-sans overflow-x-hidden selection:bg-sky-600 selection:text-white">
      {/* 1. ẢNH NỀN XE Ô TÔ TRÀN TOÀN MÀN HÌNH */}
      <div className="fixed inset-0 z-0">
        <img
          src={CAR_RENTAL_IMAGES[bgIndex]}
          onError={handleImageError}
          alt="DriveLinker Car Rental Platform"
          className="w-full h-full object-cover object-center"
        />
        {/* Lớp phủ tối cân đối toàn khung hình */}
        <div className="absolute inset-0 bg-[#0B1324]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324]/80 via-transparent to-[#0B1324]/50" />
      </div>

      {/* 2. THANH HEADER TRONG SUỐT */}
      <header className="relative z-10 w-full px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white leading-none">
                DRIVELINKER
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/15 text-slate-200 border border-white/15 backdrop-blur-sm leading-none">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium mt-1 leading-none">
              Drive Safe - Arrive Alive
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLanguage}
          className="text-xs font-medium text-white/90 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
        >
          {language === 'vi' ? 'EN' : 'VI'}
        </button>
      </header>

      {/* 3. KHUNG XÁC THỰC ĐĂNG NHẬP CĂN CHÍNH GIỮA MÀN HÌNH */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-6">
        <div className="w-full max-w-[400px] bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/40 p-7 sm:p-8 text-slate-900">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {language === 'vi' ? 'Xác thực System Admin' : 'System Admin Login'}
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {language === 'vi'
                ? 'Dành cho quản trị viên vận hành hệ thống và quản lý các đơn vị cho thuê xe.'
                : 'For system operators managing platform operations and rental partners.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {language === 'vi' ? 'Tên đăng nhập' : 'Username'}
              </label>
              <input
                ref={usernameInputRef}
                id="admin-username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder={
                  language === 'vi' ? 'Nhập mã quản trị viên' : 'Enter admin ID'
                }
                className="w-full h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-sm font-mono uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium text-slate-700"
                >
                  {language === 'vi' ? 'Mật khẩu' : 'Password'}
                </label>
                {capsLockOn && (
                  <span className="text-[11px] font-medium text-amber-600">
                    Caps Lock
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onKeyUp={handleKeyEvent}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full h-10 pl-3.5 pr-10 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 mt-2 bg-[#0B1324] hover:bg-slate-800 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {isLoading
                  ? language === 'vi'
                    ? 'Đang xác thực...'
                    : 'Signing in...'
                  : language === 'vi'
                    ? 'Đăng nhập'
                    : 'Sign in'}
              </span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-200/80 text-center">
            <Link
              to="/portal/login"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {language === 'vi'
                  ? 'Đăng nhập cổng doanh nghiệp'
                  : 'Enterprise portal login'}
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* 4. FOOTER */}
      <footer className="relative z-10 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-xs text-slate-300/80">
        <span>© 2026 DriveLinker</span>
        <span className="hidden md:inline text-slate-300/70">
          {language === 'vi'
            ? 'Nền tảng quản lý điều hành và cho thuê xe ô tô'
            : 'Car rental operations and fleet management platform'}
        </span>
        <span className="font-mono">v2.6</span>
      </footer>
    </div>
  );
}