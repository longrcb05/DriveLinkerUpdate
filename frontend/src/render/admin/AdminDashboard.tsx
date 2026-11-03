import { useState, useEffect } from 'react';
import {
    Server, Activity, ShieldCheck, AlertTriangle,
    Settings, RefreshCw, CheckCircle2, XCircle, Database, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [syncState, setSyncState] = useState<'IDLE' | 'PENDING_CHANGES' | 'CHECKING' | 'SYNCING' | 'SUCCESS' | 'FAILED'>('IDLE');
    const [syncMessage, setSyncMessage] = useState('');
    const [stagedChanges, setStagedChanges] = useState<any[]>([]);

    useEffect(() => {
        const pending = JSON.parse(localStorage.getItem('sys_staging_changes') || '[]');
        setStagedChanges(pending);
        if (pending.length > 0) setSyncState('PENDING_CHANGES');
    }, []);

    const handleCreatePatch = () => {
        const newPatch = {
            id: `PATCH_${Date.now()}`,
            module: 'API Gateway',
            description: 'Điều chỉnh giới hạn Rate Limit cho Tenant COMPANY_A để tránh timeout.',
            author: 'Core_Admin_1',
            createdAt: new Date().toLocaleString('vi-VN')
        };
        const updatedChanges = [...stagedChanges, newPatch];
        setStagedChanges(updatedChanges);
        localStorage.setItem('sys_staging_changes', JSON.stringify(updatedChanges));
        setSyncState('PENDING_CHANGES');
    };

    const handleSyncToProduction = async () => {
        if (!window.confirm('Cảnh báo: Hành động này sẽ áp dụng cấu hình xuống môi trường Production của các Doanh nghiệp. Xác nhận?')) return;

        try {
            setSyncState('CHECKING');
            setSyncMessage('Đang kiểm tra tính hợp lệ của dữ liệu...');
            await new Promise(resolve => setTimeout(resolve, 1500));

            setSyncState('SYNCING');
            setSyncMessage('Đang áp dụng thay đổi vào Database (Production)...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            const sysLogs = JSON.parse(localStorage.getItem('sys_core_audit_logs') || '[]');
            sysLogs.push({ id: Date.now(), action: 'SYNC_PRODUCTION', changes: stagedChanges.length, status: 'SUCCESS' });
            localStorage.setItem('sys_core_audit_logs', JSON.stringify(sysLogs));

            localStorage.removeItem('sys_staging_changes');
            setStagedChanges([]);
            setSyncState('SUCCESS');
            setSyncMessage('Đồng bộ hoàn tất. Manager và Staff đã nhận được cập nhật mới.');

            setTimeout(() => { setSyncState('IDLE'); setSyncMessage(''); }, 5000);

        } catch (error) {
            setSyncState('FAILED');
            setSyncMessage('Đồng bộ thất bại: Xung đột khóa ngoại. Đã rollback giao dịch.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('sys_core_role');
        localStorage.removeItem('sys_core_token');
        navigate('/overview/admin/login');
    };

    return (
        <div className="min-h-screen bg-[#0F172A] font-sans text-slate-300 flex flex-col w-full">
            <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-rose-500" />
                    <h1 className="font-bold text-white">DriveLinker <span className="text-rose-500">Core Admin</span></h1>
                </div>
                <button onClick={handleLogout} className="text-sm font-medium hover:text-rose-400 transition-colors">Thoát phiên Quản trị</button>
            </header>

            <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-6xl mx-auto space-y-6">

                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-lg"><Activity className="w-6 h-6 text-emerald-400" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái API Lõi</p>
                                <h3 className="text-xl font-bold text-emerald-400">Stable (99.9%)</h3>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-4">
                            <div className="p-3 bg-sky-500/10 rounded-lg"><Database className="w-6 h-6 text-sky-400" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Kết nối Database</p>
                                <h3 className="text-xl font-bold text-white">Đang kết nối</h3>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-lg"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Báo cáo lỗi từ Tenant</p>
                                <h3 className="text-xl font-bold text-amber-400">2 Ticket chờ</h3>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                                <h2 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-sky-500" /> Công cụ Chẩn đoán & Cấu hình</h2>
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                                <Settings className="w-12 h-12 text-slate-600 mb-2" />
                                <p className="text-sm text-slate-400 max-w-sm">Mọi cấu hình tại đây sẽ được đưa vào hàng đợi Staging để kiểm tra trước khi đồng bộ.</p>

                                <button
                                    onClick={handleCreatePatch}
                                    className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors border border-slate-700"
                                >
                                    + Cấu hình / Tạo bản vá lỗi mới
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col relative">
                            <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                                <h2 className="font-bold text-white flex items-center gap-2"><RefreshCw className="w-4 h-4 text-rose-500" /> Quản lý Đồng bộ (Production)</h2>
                                {stagedChanges.length > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full">{stagedChanges.length} Pending</span>}
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex-1 overflow-auto mb-6">
                                    {stagedChanges.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                            <ShieldCheck className="w-10 h-10 mb-2 opacity-50" />
                                            <p className="text-sm">Không có thay đổi nào chờ đồng bộ.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {stagedChanges.map(patch => (
                                                <div key={patch.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs font-bold text-sky-400">Module: {patch.module}</span>
                                                        <span className="text-[10px] text-slate-500">{patch.createdAt}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-300">{patch.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {syncMessage && (
                                    <div className={`mb-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${syncState === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                        syncState === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                        }`}>
                                        {syncState === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                        {syncState === 'FAILED' && <XCircle className="w-4 h-4 shrink-0" />}
                                        {(syncState === 'CHECKING' || syncState === 'SYNCING') && <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />}
                                        {syncMessage}
                                    </div>
                                )}

                                <button
                                    onClick={handleSyncToProduction}
                                    disabled={syncState !== 'PENDING_CHANGES'}
                                    className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${syncState === 'PENDING_CHANGES' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    <RefreshCw className={`w-5 h-5 ${syncState === 'CHECKING' || syncState === 'SYNCING' ? 'animate-spin' : ''}`} />
                                    {syncState === 'IDLE' ? 'Không có dữ liệu để Đồng bộ' :
                                        syncState === 'PENDING_CHANGES' ? 'Bắt đầu Đồng bộ lên Production' :
                                            syncState === 'CHECKING' ? 'Đang chạy Validation...' :
                                                syncState === 'SYNCING' ? 'Đang ghi vào CSDL...' :
                                                    syncState === 'SUCCESS' ? 'Đã Đồng bộ' : 'Rollback hoàn tất'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}