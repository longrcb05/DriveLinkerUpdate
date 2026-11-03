/**
 * @file DashboardLayout.tsx
 * @description Layout chính của toàn bộ hệ thống sau khi người dùng đăng nhập.
 */

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Map as MapIcon,
  BarChart3, Settings, Handshake, LogOut, Settings2, RefreshCw, XCircle,
  ClipboardCheck, Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DashboardLayout() {
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'TENANT_STAFF');
  const [tenantName, setTenantName] = useState(localStorage.getItem('tenantName') || 'DriveLinker');
  const isAdminImpersonating = localStorage.getItem('isAdminImpersonating') === 'true';
  const [syncState, setSyncState] = useState<'IDLE' | 'STAGED' | 'SYNCING'>('IDLE');

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || 'TENANT_STAFF');
    setTenantName(localStorage.getItem('tenantName') || 'DriveLinker');
  }, [location.pathname]);

  const menuItems = [
    { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard, path: '/overview', roles: ['TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN_VIEW'] },
    { id: 'fleet', label: t('nav.fleet'), icon: Truck, path: '/fleet', roles: ['TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN_VIEW'] },
    { id: 'tracking', label: t('nav.tracking'), icon: MapIcon, path: '/tracking', roles: ['TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN_VIEW'] },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart3, path: '/analytics', roles: ['TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN_VIEW'] },
    { id: 'partners', label: t('nav.contract'), icon: Handshake, path: '/partners', roles: ['TENANT_ADMIN', 'TENANT_STAFF', 'SUPER_ADMIN_VIEW'] },
    { id: 'approvals', label: t('nav.approvals'), icon: ClipboardCheck, path: '/approvals', roles: ['TENANT_ADMIN', 'SUPER_ADMIN_VIEW'] },
    { id: 'settings', label: t('nav.settings'), icon: Settings, path: '/settings', roles: ['TENANT_ADMIN', 'SUPER_ADMIN_VIEW'] },
  ];

  const filteredMenu = menuItems.filter(item => !item.roles || item.roles.includes(userRole));

  const handleLogout = () => {
    if (isAdminImpersonating) {
      localStorage.removeItem('isAdminImpersonating');
      localStorage.removeItem('userRole');
      navigate('/overview/admin');
    } else {
      localStorage.clear();
      navigate('/portal/login');
    }
  };

  const handleFixSystem = () => {
    setSyncState('STAGED');
    alert('Đã thiết lập cấu hình vá lỗi cho doanh nghiệp này. Vui lòng bấm Đồng bộ để lưu thay đổi.');
  };

  const handleSync = () => {
    setSyncState('SYNCING');
    setTimeout(() => {
      setSyncState('IDLE');
      alert('Đồng bộ hoàn tất! Manager và Staff của doanh nghiệp đã nhận được bản cập nhật.');
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans overflow-hidden relative print:bg-white">
      <style>{`
        @media print {
          aside, header, .core-toolbar, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; }
        }
      `}</style>

      <aside className="w-[260px] bg-[#0F172A] text-slate-300 flex flex-col justify-between shrink-0 z-50">
        <div className="flex-1 overflow-auto overflow-x-hidden">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/overview')}>
              <div className="w-9 h-9 bg-gradient-to-tr from-[#0284C7] to-[#0EA5E9] rounded-xl flex items-center justify-center shadow-md shadow-sky-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-sky-500/40">
                <Truck className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-x-0.5" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight tracking-wide flex items-center gap-1.5">
                  DriveLinker
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Drive Safe - Arrive Alive</p>
              </div>
            </div>
          </div>

          <div className="py-6 px-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-3 flex items-center justify-between">
              <span>{t('auth.menu')}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </p>
            <nav className="space-y-1.5">
              {filteredMenu.map((item) => {
                const Icon = item.icon;
                const isCurrent = (item.path === '/overview' && location.pathname === '/overview') || location.pathname === item.path;

                const getIconAnimation = (id: string) => {
                  switch (id) {
                    case 'overview':
                      return 'group-hover:rotate-12 group-hover:scale-125 group-hover:text-sky-400';
                    case 'fleet':
                      return 'group-hover:translate-x-1 group-hover:scale-125 group-hover:text-cyan-400';
                    case 'tracking':
                      return 'group-hover:-translate-y-1 group-hover:scale-125 group-hover:text-emerald-400';
                    case 'analytics':
                      return 'group-hover:scale-125 group-hover:text-amber-400';
                    case 'partners':
                      return 'group-hover:-rotate-12 group-hover:scale-125 group-hover:text-indigo-400';
                    case 'approvals':
                      return 'group-hover:scale-125 group-hover:rotate-6 group-hover:text-emerald-400';
                    case 'settings':
                      return 'group-hover:rotate-90 group-hover:scale-125 group-hover:text-rose-400 duration-500';
                    default:
                      return 'group-hover:scale-125 group-hover:text-sky-400';
                  }
                };

                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => {
                      const active = isActive || isCurrent;
                      return `group w-full flex items-center justify-between px-3.5 py-3 font-medium transition-all duration-300 rounded-xl relative overflow-hidden select-none ${
                        active
                          ? 'bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent text-sky-400 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`;
                    }}
                  >
                    {({ isActive }) => {
                      const active = isActive || isCurrent;
                      return (
                        <>
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0EA5E9] rounded-r-full shadow-[0_0_10px_#0EA5E9]" />
                          )}
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                              active ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 group-hover:text-white group-hover:bg-slate-800'
                            }`}>
                              <Icon className={`w-5 h-5 transition-transform duration-300 ease-out ${getIconAnimation(item.id)}`} />
                            </div>
                            <span className="text-sm tracking-wide">{item.label}</span>
                          </div>
                        </>
                      );
                    }}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3 shrink-0 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all duration-300 font-medium text-sm border border-transparent hover:border-rose-500/20 cursor-pointer"
          >
            <div className="p-1 rounded-lg text-slate-400 group-hover:text-rose-400 transition-colors">
              {isAdminImpersonating ? (
                <XCircle className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
              ) : (
                <LogOut className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1 group-hover:scale-110" />
              )}
            </div>
            <span>{isAdminImpersonating ? 'Thoát chế độ Admin' : t('auth.logout')}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-6 shrink-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-xs font-bold text-slate-700 transition-all shadow-sm"
              title="Chuyển đổi ngôn ngữ / Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{language === 'vi' ? 'VI' : 'EN'}</span>
            </button>

            <div className="w-px h-6 bg-slate-200"></div>

            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isAdminImpersonating ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-sky-100 text-sky-600 border border-sky-200'}`}>
                {isAdminImpersonating ? 'A' : 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 leading-none">{t('common.account')}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide">
                  {tenantName} •
                  <span className={isAdminImpersonating ? 'text-rose-600 font-bold ml-1' : userRole === 'TENANT_ADMIN' ? 'text-emerald-600 font-bold ml-1' : 'text-sky-600 font-bold ml-1'}>
                    {isAdminImpersonating ? 'ADMIN_HỆ_THỐNG' : userRole}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <Outlet />

        {isAdminImpersonating && (
          <div className="core-toolbar absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10">
            <div className="flex items-center gap-2 mr-4 border-r border-slate-700 pr-4">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping absolute"></div>
              <div className="w-2 h-2 bg-rose-500 rounded-full relative"></div>
              <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Core Mode</span>
            </div>
            <button onClick={handleFixSystem} className="text-slate-300 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors">
              <Settings2 className="w-4 h-4 text-sky-400" /> Cấu hình & Sửa lỗi
            </button>
            <button
              onClick={handleSync}
              disabled={syncState === 'IDLE' || syncState === 'SYNCING'}
              className={`ml-2 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${syncState === 'STAGED' ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              <RefreshCw className={`w-4 h-4 ${syncState === 'SYNCING' ? 'animate-spin' : ''}`} />
              {syncState === 'SYNCING' ? 'Đang đẩy...' : 'Đồng bộ hệ thống'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
