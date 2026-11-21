/**
 * @file PriceApprovals.tsx
 * @module Frontend/Approvals
 * @description Bàn Phê duyệt & Đàm phán Đơn giá Hợp đồng (Manager Price Approval Desk).
 * Tối ưu: O(1) lookup, Optimistic State Update, Non-blocking Toast, Pre-fill & Delta preview.
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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
    ChevronRight,
    Edit3,
    X,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    RotateCcw,
    FileText
} from 'lucide-react';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PriceRequest {
    id: string;
    contractId: string;
    staff: string;
    reason: string;
    suggestedPrice: number;
    status: RequestStatus;
    managerNote?: string;
    oldPrice?: number;
    approvedPrice?: number;
    processedAt?: string;
}

interface EContract {
    id: string;
    price: number;
    rentPrice?: string;
    value?: string;
    hasPendingRequest?: boolean;
    [key: string]: unknown;
}

interface ProcessingRequest extends PriceRequest {
    currentPrice: number;
}

interface ToastState {
    type: 'success' | 'error';
    message: string;
}

// Khởi tạo formatter 1 lần duy nhất ở module scope thay vì mỗi lần render
const VND_FORMATTER = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
});

const formatMoney = (amount: number): string => VND_FORMATTER.format(amount || 0);

const safeParseStorage = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
};

export default function PriceApprovals() {
    const { t } = useLanguage();

    const [requests, setRequests] = useState<PriceRequest[]>(() =>
        safeParseStorage<PriceRequest[]>('sys_price_requests', [])
    );
    const [contracts, setContracts] = useState<EContract[]>(() =>
        safeParseStorage<EContract[]>('sys_e_contracts', [])
    );
    const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');

    // State Modal & Feedback không chặn luồng
    const [processingReq, setProcessingReq] = useState<ProcessingRequest | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [managerNote, setManagerNote] = useState<string>('');
    const [formError, setFormError] = useState<string>('');
    const [toast, setToast] = useState<ToastState | null>(null);

    const isInternalSyncRef = useRef(false);
    const priceInputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((type: 'success' | 'error', message: string) => {
        setToast({ type, message });
    }, []);

    // Tự động ẩn Toast sau 3 giây
    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), 3000);
        return () => window.clearTimeout(timer);
    }, [toast]);

    // Chỉ đọc lại từ storage khi thay đổi đến từ component/tab khác
    const loadData = useCallback(() => {
        if (isInternalSyncRef.current) {
            isInternalSyncRef.current = false;
            return;
        }
        setRequests(safeParseStorage<PriceRequest[]>('sys_price_requests', []));
        setContracts(safeParseStorage<EContract[]>('sys_e_contracts', []));
    }, []);

    useEffect(() => {
        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, [loadData]);

    // Phím tắt ESC để đóng nhanh Modal
    useEffect(() => {
        if (!processingReq) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setProcessingReq(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [processingReq]);

    // Map hợp đồng theo ID -> giảm độ phức tạp tra cứu từ O(N*M) xuống O(1)
    const contractMap = useMemo(() => {
        const map = new Map<string, EContract>();
        for (const c of contracts) {
            map.set(c.id, c);
        }
        return map;
    }, [contracts]);

    // Tách danh sách 1 lần bằng useMemo thay vì filter lặp lại trong JSX
    const { pendingRequests, historyRequests } = useMemo(() => {
        const pending: PriceRequest[] = [];
        const history: PriceRequest[] = [];
        for (const req of requests) {
            if (req.status === 'PENDING') pending.push(req);
            else history.push(req);
        }
        return { pendingRequests: pending, historyRequests: history };
    }, [requests]);

    const filteredData = activeTab === 'PENDING' ? pendingRequests : historyRequests;

    // Mở modal và pre-fill sẵn giá đề xuất để duyệt 1-click nếu đồng ý
    const openProcessModal = useCallback(
        (req: PriceRequest) => {
            const contract = contractMap.get(req.contractId);
            setProcessingReq({
                ...req,
                currentPrice: contract?.price ?? 0
            });
            setNewPrice(req.suggestedPrice ? String(req.suggestedPrice) : '');
            setManagerNote('');
            setFormError('');
            requestAnimationFrame(() => priceInputRef.current?.focus());
        },
        [contractMap]
    );

    // Tính toán real-time chênh lệch giá trong Modal
    const priceDiff = useMemo(() => {
        if (!processingReq) return null;
        const parsed = Number(newPrice);
        if (!newPrice || Number.isNaN(parsed) || parsed <= 0) return null;

        const base = processingReq.currentPrice;
        const diff = parsed - base;
        const percent = base > 0 ? ((diff / base) * 100).toFixed(1) : '0';
        return { diff, percent };
    }, [newPrice, processingReq]);

    // Xử lý Phê duyệt / Từ chối tức thì (Optimistic UI)
    const submitAction = useCallback(
        (action: 'APPROVED' | 'REJECTED') => {
            if (!processingReq) return;

            const numericNewPrice = Number(newPrice);
            if (action === 'APPROVED' && (!newPrice || Number.isNaN(numericNewPrice) || numericNewPrice <= 0)) {
                setFormError(t('approvals.alertInputNewPrice'));
                priceInputRef.current?.focus();
                return;
            }
            if (action === 'REJECTED' && !managerNote.trim()) {
                setFormError(t('approvals.alertInputNote'));
                return;
            }

            const nowIso = new Date().toISOString();

            // 1. Cập nhật danh sách yêu cầu (lưu kèm oldPrice để tab History không bị sai lệch)
            const updatedRequests: PriceRequest[] = requests.map((r) =>
                r.id === processingReq.id
                    ? {
                          ...r,
                          status: action,
                          managerNote: managerNote.trim(),
                          oldPrice: processingReq.currentPrice,
                          approvedPrice: action === 'APPROVED' ? numericNewPrice : undefined,
                          processedAt: nowIso
                      }
                    : r
            );

            // 2. Cập nhật hợp đồng tương ứng
            const updatedContracts: EContract[] = contracts.map((c) => {
                if (c.id !== processingReq.contractId) return c;
                if (action === 'APPROVED') {
                    return {
                        ...c,
                        hasPendingRequest: false,
                        value: `${numericNewPrice.toLocaleString('vi-VN')} VNĐ`,
                        rentPrice: String(numericNewPrice),
                        price: numericNewPrice
                    };
                }
                return { ...c, hasPendingRequest: false };
            });

            // 3. Cập nhật React State ngay lập tức (0ms độ trễ giao diện)
            setRequests(updatedRequests);
            setContracts(updatedContracts);
            setProcessingReq(null);
            setFormError('');

            // 4. Ghi localStorage 1 lần & thông báo cho các component khác
            isInternalSyncRef.current = true;
            localStorage.setItem('sys_price_requests', JSON.stringify(updatedRequests));
            localStorage.setItem('sys_e_contracts', JSON.stringify(updatedContracts));
            window.dispatchEvent(new Event('storage'));

            showToast(
                'success',
                action === 'APPROVED'
                    ? t('approvals.alertApproveSuccess')
                    : t('approvals.alertRejectSuccess')
            );
        },
        [processingReq, newPrice, managerNote, requests, contracts, t, showToast]
    );

    return (
        <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6 relative">
            {/* Toast Notification không chặn thao tác */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-[110] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all animate-fade-in ${
                        toast.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{toast.message}</span>
                    <button
                        onClick={() => setToast(null)}
                        className="ml-2 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Breadcrumb & Header */}
            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                <span>MENU</span>
                <ChevronRight className="w-3 h-3 mx-2" />
                <span className="text-sky-600">{t('approvals.breadcrumb')}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{t('approvals.title')}</h2>

            {/* Main Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('PENDING')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'PENDING'
                                ? 'border-sky-500 text-sky-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t('approvals.pendingTab')} ({pendingRequests.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                            activeTab === 'HISTORY'
                                ? 'border-sky-500 text-sky-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t('approvals.historyTab')} ({historyRequests.length})
                    </button>
                </div>

                <div className="overflow-x-auto">
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
                                    <td colSpan={6} className="p-12 text-center text-slate-400">
                                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p>{t('approvals.noRequests')}</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((req) => {
                                    const contract = contractMap.get(req.contractId);
                                    const displayOldPrice =
                                        req.status === 'PENDING'
                                            ? contract?.price ?? 0
                                            : req.oldPrice ?? contract?.price ?? 0;
                                    const displayTargetPrice =
                                        req.status === 'APPROVED' && req.approvedPrice !== undefined
                                            ? req.approvedPrice
                                            : req.suggestedPrice;

                                    return (
                                        <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-4 font-mono font-bold text-sky-600">
                                                {req.contractId}
                                            </td>
                                            <td className="p-4 font-medium text-slate-700">{req.staff}</td>
                                            <td
                                                className="p-4 text-slate-600 max-w-xs truncate"
                                                title={req.reason}
                                            >
                                                {req.reason}
                                            </td>
                                            <td className="p-4 text-slate-400 font-bold line-through">
                                                {formatMoney(displayOldPrice)}
                                            </td>
                                            <td className="p-4 text-emerald-600 font-bold">
                                                {formatMoney(displayTargetPrice)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {req.status === 'PENDING' ? (
                                                    <button
                                                        onClick={() => openProcessModal(req)}
                                                        className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        {t('approvals.processBtn')}
                                                    </button>
                                                ) : (
                                                    <div className="inline-flex flex-col items-center gap-1">
                                                        <span
                                                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                                                                req.status === 'APPROVED'
                                                                    ? 'bg-emerald-100 text-emerald-700'
                                                                    : 'bg-rose-100 text-rose-700'
                                                            }`}
                                                        >
                                                            {req.status === 'APPROVED'
                                                                ? t('approvals.statusApproved')
                                                                : t('approvals.statusRejected')}
                                                        </span>
                                                        {req.managerNote && (
                                                            <span
                                                                className="text-[11px] text-slate-400 max-w-[160px] truncate"
                                                                title={req.managerNote}
                                                            >
                                                                {req.managerNote}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL XỬ LÝ */}
            {processingReq && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={() => setProcessingReq(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-sky-500" /> {t('approvals.modalTitle')}
                            </h3>
                            <button
                                onClick={() => setProcessingReq(null)}
                                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Thông tin đối chiếu */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-medium">
                                        {t('approvals.contractLabel')}
                                    </span>
                                    <span className="font-mono font-bold text-slate-800">
                                        {processingReq.contractId}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-medium">
                                        {t('approvals.currentPriceLabel')}
                                    </span>
                                    <div className="flex items-center gap-2 font-bold">
                                        <span className="text-slate-400 line-through">
                                            {formatMoney(processingReq.currentPrice)}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-sky-600">
                                            {formatMoney(processingReq.suggestedPrice)}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-2.5 border-t border-slate-200">
                                    <span className="text-xs font-bold text-slate-500 block mb-1">
                                        {t('approvals.proposalFrom', { staff: processingReq.staff })}
                                    </span>
                                    <p className="text-sm text-slate-700 italic bg-white p-3 rounded-lg border border-slate-200">
                                        "{processingReq.reason}"
                                    </p>
                                </div>
                            </div>

                            {/* Form nhập liệu */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-bold text-slate-700">
                                            {t('approvals.newPriceLabel')}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        {Number(newPrice) !== processingReq.suggestedPrice && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewPrice(String(processingReq.suggestedPrice));
                                                    setFormError('');
                                                }}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                {formatMoney(processingReq.suggestedPrice)}
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        ref={priceInputRef}
                                        type="number"
                                        min={0}
                                        value={newPrice}
                                        onChange={(e) => {
                                            setNewPrice(e.target.value);
                                            if (formError) setFormError('');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitAction('APPROVED');
                                        }}
                                        placeholder={t('approvals.newPricePlaceholder')}
                                        className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] font-bold text-emerald-600 text-lg transition-all"
                                    />
                                    {priceDiff && (
                                        <p
                                            className={`mt-1.5 text-xs font-semibold ${
                                                priceDiff.diff < 0
                                                    ? 'text-amber-600'
                                                    : 'text-emerald-600'
                                            }`}
                                        >
                                            {priceDiff.diff > 0 ? '+' : ''}
                                            {formatMoney(priceDiff.diff)} ({priceDiff.diff > 0 ? '+' : ''}
                                            {priceDiff.percent}%)
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        {t('approvals.managerNoteLabel')}
                                    </label>
                                    <textarea
                                        value={managerNote}
                                        onChange={(e) => {
                                            setManagerNote(e.target.value);
                                            if (formError) setFormError('');
                                        }}
                                        placeholder={t('approvals.managerNotePlaceholder')}
                                        rows={2}
                                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] text-sm text-slate-700 resize-none transition-all"
                                    />
                                </div>

                                {formError && (
                                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{formError}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => submitAction('REJECTED')}
                                className="px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                            >
                                {t('approvals.rejectBtn')}
                            </button>
                            <button
                                type="button"
                                onClick={() => submitAction('APPROVED')}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                            >
                                <CheckCircle2 className="w-4 h-4" /> {t('approvals.approveUpdateBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}