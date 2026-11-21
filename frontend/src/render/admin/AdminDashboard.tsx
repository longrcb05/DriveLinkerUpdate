import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Server,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
    ArrowLeft,
    LogOut,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';

type SyncPhase = 'IDLE' | 'CHECKING' | 'SYNCING' | 'SUCCESS' | 'FAILED';

interface StagedPatch {
    id: string;
    targetTenant: string;
    module: string;
    description: string;
    author: string;
    createdAt: string;
}

interface TenantOption {
    id: string;
    name: string;
    code?: string;
}

interface CoreAuditLog {
    id: number;
    time: string;
    admin: string;
    action: string;
    details: string;
}

const SYSTEM_MODULES = [
    'API Gateway',
    'Telemetry & GPS',
    'Phân quyền & Bảo mật',
    'Cơ sở dữ liệu & Cache'
];

const QUICK_TEMPLATES = [
    {
        label: 'Tăng Rate Limit API',
        module: 'API Gateway',
        description: 'Nâng giới hạn Rate Limit lên 300 req/phút cho các tuyến API định vị.'
    },
    {
        label: 'Giảm chu kỳ GPS (5s)',
        module: 'Telemetry & GPS',
        description: 'Cập nhật chu kỳ đồng bộ tọa độ phương tiện từ 10s xuống 5s.'
    },
    {
        label: 'Làm mới Cache cấu hình',
        module: 'Cơ sở dữ liệu & Cache',
        description: 'Xóa và nạp lại bộ nhớ đệm cấu hình gói dịch vụ của các đơn vị đối tác.'
    }
];

const safeParse = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

export default function AdminDashboard() {
    const navigate = useNavigate();

    const adminName = useMemo(
        () => sessionStorage.getItem('sys_core_admin_name') || 'System Admin',
        []
    );

    const [tenants] = useState<TenantOption[]>(() =>
        safeParse<TenantOption[]>('sys_tenants', [])
    );
    const [stagedChanges, setStagedChanges] = useState<StagedPatch[]>(() =>
        safeParse<StagedPatch[]>('sys_staging_changes', [])
    );
    const [auditLogs, setAuditLogs] = useState<CoreAuditLog[]>(() =>
        safeParse<CoreAuditLog[]>('sys_core_audit_logs', [])
    );

    // State form tạo bản vá / cấu hình mới
    const [targetTenant, setTargetTenant] = useState<string>('ALL');
    const [moduleName, setModuleName] = useState<string>(SYSTEM_MODULES[0]);
    const [description, setDescription] = useState<string>('');
    const [formError, setFormError] = useState<string>('');

    // State tiến trình đồng bộ Production
    const [syncPhase, setSyncPhase] = useState<SyncPhase>('IDLE');
    const [syncMessage, setSyncMessage] = useState<string>('');
    const [confirmDeploy, setConfirmDeploy] = useState<boolean>(false);

    useEffect(() => {
        const handleStorageSync = () => {
            setStagedChanges(safeParse<StagedPatch[]>('sys_staging_changes', []));
            setAuditLogs(safeParse<CoreAuditLog[]>('sys_core_audit_logs', []));
        };
        window.addEventListener('storage', handleStorageSync);
        return () => window.removeEventListener('storage', handleStorageSync);
    }, []);

    const lastSyncTime = useMemo(() => {
        const latestSync = auditLogs.find(
            (log) => log.action === 'ĐỒNG BỘ' || log.action === 'SYNC_PRODUCTION'
        );
        return latestSync?.time || 'Chưa ghi nhận';
    }, [auditLogs]);

    const tenantNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const t of tenants) {
            map.set(t.id, t.name);
        }
        return map;
    }, [tenants]);

    const addPatchToStaging = useCallback(() => {
        const trimmedDesc = description.trim();
        if (!trimmedDesc) {
            setFormError('Vui lòng nhập nội dung cấu hình hoặc mô tả bản vá.');
            return;
        }

        const newPatch: StagedPatch = {
            id: `PATCH-${Date.now().toString().slice(-6)}`,
            targetTenant,
            module: moduleName,
            description: trimmedDesc,
            author: adminName,
            createdAt: new Date().toLocaleString('vi-VN')
        };

        const updatedChanges = [newPatch, ...stagedChanges];
        setStagedChanges(updatedChanges);
        localStorage.setItem('sys_staging_changes', JSON.stringify(updatedChanges));

        setDescription('');
        setFormError('');
        setConfirmDeploy(false);
        if (syncPhase === 'SUCCESS' || syncPhase === 'FAILED') {
            setSyncPhase('IDLE');
            setSyncMessage('');
        }
    }, [description, targetTenant, moduleName, adminName, stagedChanges, syncPhase]);

    const handleCreatePatch = (e: React.FormEvent) => {
        e.preventDefault();
        addPatchToStaging();
    };

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            addPatchToStaging();
        }
    };

    const handleRemovePatch = useCallback(
        (patchId: string) => {
            const updated = stagedChanges.filter((item) => item.id !== patchId);
            setStagedChanges(updated);
            localStorage.setItem('sys_staging_changes', JSON.stringify(updated));
            if (updated.length === 0) setConfirmDeploy(false);
        },
        [stagedChanges]
    );

    const handleSyncToProduction = async () => {
        if (stagedChanges.length === 0) return;
        setConfirmDeploy(false);

        try {
            setSyncPhase('CHECKING');
            setSyncMessage('Đang kiểm tra ràng buộc và tính hợp lệ của tham số...');
            await new Promise((resolve) => setTimeout(resolve, 450));

            setSyncPhase('SYNCING');
            setSyncMessage('Đang ghi cấu hình xuống môi trường vận hành...');
            await new Promise((resolve) => setTimeout(resolve, 600));

            const nowStr = new Date().toLocaleString('vi-VN');
            const summaryDetails = stagedChanges
                .map((p) => `[${p.module} • ${p.targetTenant}] ${p.description}`)
                .join(' | ');

            const newLog: CoreAuditLog = {
                id: Date.now(),
                time: nowStr,
                admin: adminName,
                action: 'ĐỒNG BỘ',
                details: `Phát hành ${stagedChanges.length} thay đổi: ${summaryDetails}`
            };

            const existingLogs = safeParse<CoreAuditLog[]>('sys_core_audit_logs', []);
            const updatedLogs = [newLog, ...existingLogs];
            localStorage.setItem('sys_core_audit_logs', JSON.stringify(updatedLogs));
            setAuditLogs(updatedLogs);

            localStorage.removeItem('sys_staging_changes');
            setStagedChanges([]);
            setSyncPhase('SUCCESS');
            setSyncMessage(`Đã áp dụng ${stagedChanges.length} thay đổi lên Production (${nowStr}).`);
        } catch {
            setSyncPhase('FAILED');
            setSyncMessage('Đồng bộ thất bại do xung đột cấu hình. Hệ thống đã hoàn tác.');
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('sys_core_role');
        sessionStorage.removeItem('sys_core_admin_name');
        localStorage.removeItem('sys_core_role');
        localStorage.removeItem('sys_core_token');
        navigate('/overview/admin/login');
    };

    const isProcessing = syncPhase === 'CHECKING' || syncPhase === 'SYNCING';

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col w-full antialiased">
            {/* TOP BAR */}
            <header className="h-14 bg-white border-b border-slate-200 px-6 lg:px-10 flex items-center justify-between shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-3 text-xs">
                    <Link
                        to="/overview/admin"
                        className="flex items-center gap-2 font-bold text-slate-900 hover:opacity-80 transition-opacity"
                    >
                        <span className="w-7 h-7 rounded-md bg-[#0B1324] flex items-center justify-center text-white">
                            <Server className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-sm tracking-tight">DriveLinker</span>
                    </Link>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

                    <Link
                        to="/overview/admin"
                        className="text-slate-500 hover:text-slate-900 font-medium transition-colors hidden sm:inline"
                    >
                        Doanh nghiệp
                    </Link>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />

                    <span className="font-semibold text-slate-800">
                        Điều phối cấu hình
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-mono text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>PROD-VN</span>
                    </div>

                    <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                        {adminName}
                    </span>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:text-rose-600 text-xs font-medium text-slate-600 transition-colors cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Thoát</span>
                    </button>
                </div>
            </header>

            {/* MAIN WORKSPACE */}
            <main className="flex-1 px-6 lg:px-10 py-6">
                <div className="max-w-6xl mx-auto space-y-5">
                    {/* TIÊU ĐỀ & NÚT QUAY LẠI */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                Điều phối Cấu hình &amp; Đồng bộ Hệ thống
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Quản lý tham số kỹ thuật tại hàng đợi Staging trước khi triển khai xuống các đơn vị vận hành.
                            </p>
                        </div>

                        <Link
                            to="/overview/admin"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                            <span>Danh sách doanh nghiệp</span>
                        </Link>
                    </div>

                    {/* DẢI THÔNG SỐ TỔNG QUAN LIỀN KHỐI (Thay thế 3 card rời rạc) */}
                    <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                        <div className="px-5 py-3.5">
                            <p className="text-[11px] font-medium text-slate-500">
                                Đơn vị vận hành
                            </p>
                            <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                                {tenants.length}{' '}
                                <span className="text-xs font-normal text-slate-500">doanh nghiệp</span>
                            </p>
                        </div>

                        <div className="px-5 py-3.5">
                            <p className="text-[11px] font-medium text-slate-500">
                                Chờ triển khai (Staging)
                            </p>
                            <p className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                                {stagedChanges.length}{' '}
                                <span className="text-xs font-normal text-slate-500">bản ghi</span>
                            </p>
                        </div>

                        <div className="px-5 py-3.5">
                            <p className="text-[11px] font-medium text-slate-500">
                                Lần đồng bộ gần nhất
                            </p>
                            <p className="text-xs font-semibold text-slate-800 mt-2 font-mono tabular-nums truncate">
                                {lastSyncTime}
                            </p>
                        </div>

                        <div className="px-5 py-3.5">
                            <p className="text-[11px] font-medium text-slate-500">
                                Trạng thái triển khai
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span
                                    className={`w-2 h-2 rounded-full ${
                                        isProcessing
                                            ? 'bg-sky-500 animate-pulse'
                                            : stagedChanges.length > 0
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                    }`}
                                />
                                <span className="text-xs font-semibold text-slate-800">
                                    {isProcessing
                                        ? 'Đang đồng bộ'
                                        : stagedChanges.length > 0
                                        ? 'Có thay đổi chờ duyệt'
                                        : 'Đã đồng bộ'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* KHU VỰC TÁC VỤ CHÍNH: SOẠN CẤU HÌNH (4 CỘT) & HÀNG ĐỢI STAGING (8 CỘT) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* CỘT TRÁI: SOẠN THẢO BẢN VÁ */}
                        <form
                            onSubmit={handleCreatePatch}
                            className="lg:col-span-4 bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Tạo cấu hình mới
                                </h2>
                            </div>

                            <div className="p-4 space-y-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Phạm vi áp dụng
                                    </label>
                                    <select
                                        value={targetTenant}
                                        onChange={(e) => setTargetTenant(e.target.value)}
                                        className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                    >
                                        <option value="ALL">Toàn bộ hệ thống (Tất cả Tenant)</option>
                                        {tenants.map((tenant) => (
                                            <option key={tenant.id} value={tenant.id}>
                                                {tenant.name} ({tenant.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Phân hệ kỹ thuật
                                    </label>
                                    <select
                                        value={moduleName}
                                        onChange={(e) => setModuleName(e.target.value)}
                                        className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                                    >
                                        {SYSTEM_MODULES.map((mod) => (
                                            <option key={mod} value={mod}>
                                                {mod}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-medium text-slate-700">
                                            Mô tả thay đổi
                                        </label>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            ⌘ + Enter
                                        </span>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onKeyDown={handleTextareaKeyDown}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                            if (formError) setFormError('');
                                        }}
                                        placeholder="Nhập tham số điều chỉnh hoặc nội dung bản vá..."
                                        className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 resize-none leading-relaxed"
                                    />
                                    {formError && (
                                        <p className="text-[11px] font-medium text-rose-600 mt-1">
                                            {formError}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-0.5">
                                    <p className="text-[11px] text-slate-400 mb-1.5">
                                        Điền nhanh mẫu cấu hình:
                                    </p>
                                    <div className="space-y-1">
                                        {QUICK_TEMPLATES.map((tpl, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setModuleName(tpl.module);
                                                    setDescription(tpl.description);
                                                    setFormError('');
                                                }}
                                                className="w-full text-left px-2.5 py-1.5 rounded-md border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 text-[11px] text-slate-700 font-medium flex items-center justify-between transition-colors cursor-pointer"
                                            >
                                                <span>{tpl.label}</span>
                                                <span className="text-[10px] font-mono text-slate-400">
                                                    {tpl.module}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full h-9 bg-[#0B1324] hover:bg-slate-800 text-white text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Thêm vào hàng đợi Staging</span>
                                </button>
                            </div>
                        </form>

                        {/* CỘT PHẢI: HÀNG ĐỢI STAGING & TRIỂN KHAI */}
                        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Hàng đợi Staging
                                </h2>
                                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                                    {stagedChanges.length} mục chờ phát hành
                                </span>
                            </div>

                            {/* Bảng danh sách bản vá */}
                            {stagedChanges.length === 0 ? (
                                <div className="py-14 px-6 text-center">
                                    <p className="text-xs font-semibold text-slate-600">
                                        Hàng đợi Staging hiện đang trống
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Tạo tham số cấu hình ở cột bên trái để kiểm tra trước khi đồng bộ.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-[320px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 sticky top-0">
                                            <tr>
                                                <th className="py-2.5 px-4">Mã / Phân hệ</th>
                                                <th className="py-2.5 px-3">Phạm vi</th>
                                                <th className="py-2.5 px-3">Nội dung thay đổi</th>
                                                <th className="py-2.5 px-4 text-right w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {stagedChanges.map((patch) => (
                                                <tr
                                                    key={patch.id}
                                                    className="hover:bg-slate-50/80 transition-colors"
                                                >
                                                    <td className="py-3 px-4 align-top whitespace-nowrap">
                                                        <div className="font-mono text-[11px] font-semibold text-slate-800">
                                                            {patch.id}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {patch.module}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3 align-top whitespace-nowrap">
                                                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] font-medium text-slate-700">
                                                            {patch.targetTenant === 'ALL'
                                                                ? 'ALL'
                                                                : tenantNameMap.get(patch.targetTenant) ||
                                                                  patch.targetTenant}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 align-top">
                                                        <p className="text-slate-700 leading-relaxed">
                                                            {patch.description}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-1">
                                                            {patch.author} • {patch.createdAt}
                                                        </p>
                                                    </td>
                                                    <td className="py-3 px-4 align-top text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePatch(patch.id)}
                                                            disabled={isProcessing}
                                                            title="Gỡ khỏi hàng đợi"
                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer disabled:opacity-40"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Thanh thao tác triển khai Production */}
                            <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
                                {syncMessage && (
                                    <div
                                        className={`px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2 border ${
                                            syncPhase === 'SUCCESS'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : syncPhase === 'FAILED'
                                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                                : 'bg-sky-50 text-sky-800 border-sky-200'
                                        }`}
                                    >
                                        {syncPhase === 'SUCCESS' && (
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                        )}
                                        {syncPhase === 'FAILED' && (
                                            <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                        )}
                                        {isProcessing && (
                                            <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-sky-600" />
                                        )}
                                        <span>{syncMessage}</span>
                                    </div>
                                )}

                                {confirmDeploy ? (
                                    <div className="p-3 rounded-md bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-rose-900">
                                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                            <span>
                                                Xác nhận phát hành {stagedChanges.length} cấu hình xuống môi trường Production?
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeploy(false)}
                                                className="px-3 py-1.5 rounded-md bg-white border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSyncToProduction}
                                                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer"
                                            >
                                                Triển khai ngay
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className="text-[11px] text-slate-500">
                                            Thao tác đồng bộ sẽ cập nhật trực tiếp cấu hình đang chạy của các doanh nghiệp.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDeploy(true)}
                                            disabled={stagedChanges.length === 0 || isProcessing}
                                            className={`h-9 px-4 rounded-md text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                                                stagedChanges.length > 0 && !isProcessing
                                                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                                                    : 'bg-slate-200/80 text-slate-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <RefreshCw
                                                className={`w-3.5 h-3.5 ${
                                                    isProcessing ? 'animate-spin' : ''
                                                }`}
                                            />
                                            <span>
                                                {syncPhase === 'CHECKING'
                                                    ? 'Đang kiểm tra...'
                                                    : syncPhase === 'SYNCING'
                                                    ? 'Đang đồng bộ...'
                                                    : 'Đồng bộ lên Production'}
                                            </span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BẢNG NHẬT KÝ TRIỂN KHAI HỆ THỐNG */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Nhật ký thao tác quản trị
                            </h2>
                            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                                {auditLogs.length} bản ghi
                            </span>
                        </div>

                        {auditLogs.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                                Chưa có hoạt động quản trị nào được ghi nhận.
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[260px]">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 sticky top-0">
                                        <tr>
                                            <th className="py-2.5 px-4 w-40">Thời gian</th>
                                            <th className="py-2.5 px-3 w-28">Loại</th>
                                            <th className="py-2.5 px-3">Nội dung chi tiết</th>
                                            <th className="py-2.5 px-4 w-44 text-right">Người thực hiện</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {auditLogs.slice(0, 12).map((log) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-slate-50/70 transition-colors"
                                            >
                                                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                                                    {log.time || '---'}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700">
                                                        {log.action || 'HỆ THỐNG'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-700">
                                                    {log.details || 'Cập nhật cấu hình hệ thống'}
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                                                    {log.admin || adminName}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}