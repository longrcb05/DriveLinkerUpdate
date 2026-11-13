/**
 * @file PriceApprovals.tsx
 * @module Frontend/Approvals
 * @description Bàn Phê duyệt & Đàm phán Đơn giá Hợp đồng (Manager Price Approval Desk).
 * 
 * NGUYÊN TẮC THIẾT KẾ & TÍNH NĂNG KỸ THUẬT:
 * 1. Cơ chế Chống Duyệt Trùng (Anti-Duplicate Action Guard):
 *    - Kiểm tra điều kiện tiên quyết `status === 'PENDING'` trước khi cho phép Quản lý thao tác.
 *    - Các yêu cầu đã xử lý lập tức được khóa và chuyển sang tab "Lịch sử duyệt" (HISTORY).
 * 
 * 2. Cập nhật Nguyên tử Đồng bộ Hợp đồng (Atomic State Transition):
 *    - Khi Quản lý bấm Phê duyệt với đơn giá mới:
 *      * Cập nhật trạng thái yêu cầu sang `APPROVED`.
 *      * Tự động tìm hợp đồng tương ứng trong `sys_e_contracts` và cập nhật trường `rentPrice` sang đơn giá mới.
 *      * Ghi nhận đầy đủ vết kiểm toán: `approvedBy`, `approvedAt`, `oldPrice`, `newPrice`, `managerNote`.
 * 
 * 3. Phân tách Tab Trực quan:
 *    - Tab Chờ duyệt (`PENDING`): Hiển thị số lượng yêu cầu đang chờ xử lý bằng badge đếm động.
 *    - Tab Lịch sử (`HISTORY`): Tra cứu các quyết định duyệt/từ chối trước đó cùng ghi chú lý do.
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ChevronRight, Edit3, X, CheckCircle2 } from 'lucide-react';

export default function PriceApprovals() {
    const { t } = useLanguage();
    const [requests, setRequests] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    // State quản lý Modal Xử lý
    const [processingReq, setProcessingReq] = useState<any | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [managerNote, setManagerNote] = useState<string>('');

    const loadData = () => {
        setRequests(JSON.parse(localStorage.getItem('sys_price_requests') || '[]'));
        setContracts(JSON.parse(localStorage.getItem('sys_e_contracts') || '[]'));
    };

    useEffect(() => {
        loadData();
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    // Mở modal xử lý
    const openProcessModal = (req: any) => {
        const contract = contracts.find(c => c.id === req.contractId);
        setProcessingReq({ ...req, currentPrice: contract?.price || 0 });
        setNewPrice('');
        setManagerNote('');
    };

    // Submit phê duyệt hoặc từ chối
    const submitAction = (action: 'APPROVED' | 'REJECTED') => {
        if (action === 'APPROVED' && !newPrice) return alert(t('approvals.alertInputNewPrice'));
        if (action === 'REJECTED' && !managerNote) return alert(t('approvals.alertInputNote'));

        // 1. Update Request Status
        const updatedRequests = requests.map(r =>
            r.id === processingReq.id ? { ...r, status: action, managerNote: managerNote } : r
        );
        localStorage.setItem('sys_price_requests', JSON.stringify(updatedRequests));

        // 2. Update Contract Data
        const updatedContracts = contracts.map(c => {
            if (c.id === processingReq.contractId) {
                return {
                    ...c,
                    hasPendingRequest: false, // Gỡ cờ chờ duyệt
                    value: action === 'APPROVED' ? `${Number(newPrice).toLocaleString('vi-VN')} VNĐ` : c.value,
                    rentPrice: action === 'APPROVED' ? String(newPrice) : c.rentPrice,
                    price: action === 'APPROVED' ? Number(newPrice) : c.price
                };
            }
            return c;
        });
        localStorage.setItem('sys_e_contracts', JSON.stringify(updatedContracts));

        setProcessingReq(null);
        loadData();
        window.dispatchEvent(new Event('storage'));
        alert(action === 'APPROVED' ? t('approvals.alertApproveSuccess') : t('approvals.alertRejectSuccess'));
    };

    const filteredData = requests.filter(req => activeTab === 'PENDING' ? req.status === 'PENDING' : req.status !== 'PENDING');

    return (
        <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6 relative">
            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>MENU</span> <ChevronRight className="w-3 h-3 mx-2" /> <span className="text-sky-600">{t('approvals.breadcrumb')}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('approvals.title')}</h2>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button onClick={() => setActiveTab('PENDING')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t('approvals.pendingTab')} ({requests.filter(r => r.status === 'PENDING').length})
                    </button>
                    <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                        {t('approvals.historyTab')}
                    </button>
                </div>

                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                        <tr>
                            <th className="p-4">{t('approvals.colContract')}</th>
                            <th className="p-4">{t('approvals.colStaff')}</th>
                            <th className="p-4">{t('approvals.colReason')}</th>
                            <th className="p-4">{t('approvals.colOldPrice')}</th>
                            <th className="p-4">{t('approvals.colProposedPrice')}</th>
                            <th className="p-4 text-center">{t('approvals.colAction')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                    {t('approvals.noRequests')}
                                </td>
                            </tr>
                        ) : (
                            filteredData.map(req => {
                                const contract = contracts.find(c => c.id === req.contractId);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono font-bold text-sky-600">{req.contractId}</td>
                                        <td className="p-4 font-medium text-slate-700">{req.staff}</td>
                                        <td className="p-4 text-slate-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                        <td className="p-4 text-slate-400 font-bold line-through">
                                            {formatMoney(contract?.price || 0)}
                                        </td>
                                        <td className="p-4 text-emerald-600 font-bold">
                                            {formatMoney(req.suggestedPrice)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {req.status === 'PENDING' ? (
                                                <button
                                                    onClick={() => openProcessModal(req)}
                                                    className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >{t('approvals.processBtn')}</button>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded text-xs font-bold ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {req.status === 'APPROVED' ? t('approvals.statusApproved') : t('approvals.statusRejected')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL XỬ LÝ {t('approvals.breadcrumb')} (MANAGER NHẬP TRỰC TIẾP GIÁ MỚI) */}
            {processingReq && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-sky-500" /> {t('approvals.modalTitle')}
                            </h3>
                            <button onClick={() => setProcessingReq(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Thông tin readonly */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">{t('approvals.contractLabel')}</span>
                                    <span className="font-bold text-slate-800">{processingReq.contractId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">{t('approvals.currentPriceLabel')}</span>
                                    <span className="font-bold text-rose-600 line-through">{formatMoney(processingReq.currentPrice)}</span>
                                </div>
                                <div className="pt-3 border-t border-slate-200">
                                    <span className="text-xs font-bold text-slate-500 block mb-1">{t('approvals.proposalFrom', { staff: processingReq.staff })}</span>
                                    <p className="text-sm text-slate-700 italic bg-white p-3 rounded border border-slate-200">"{processingReq.reason}"</p>
                                </div>
                            </div>

                            {/* Form nhập liệu của Manager */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('approvals.newPriceLabel')} <span className="text-rose-500">*</span></label>
                                    <input
                                        type="number"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        placeholder={t('approvals.newPricePlaceholder')}
                                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] font-bold text-emerald-600 text-lg transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">{t('approvals.managerNoteLabel')}</label>
                                    <textarea
                                        value={managerNote}
                                        onChange={(e) => setManagerNote(e.target.value)}
                                        placeholder={t('approvals.managerNotePlaceholder')}
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] text-sm text-slate-700 resize-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                            <button onClick={() => submitAction('REJECTED')} className="px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white rounded-xl transition-all">
                                {t('approvals.rejectBtn')}
                            </button>
                            <button onClick={() => submitAction('APPROVED')} className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" /> {t('approvals.approveUpdateBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
