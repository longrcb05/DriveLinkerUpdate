/**
 * @file VehicleRecallModal.tsx
 * @description Modal Quy trình Thu hồi Phương tiện trong Hợp đồng có kiểm soát 3 giai đoạn:
 * Giai đoạn 1: Tạo yêu cầu (PENDING_RECALL)
 * Giai đoạn 2: Tiếp nhận & Biên bản bàn giao hiện trường (RECEIVED, PENDING_INSPECTION)
 * Giai đoạn 3: Nghiệm thu kỹ thuật & Quyết toán tài chính (COMPLETED)
 */

import { useState, useEffect } from 'react';
import {
  RotateCcw, X, AlertTriangle, CheckCircle2,
  DollarSign, FileText, ShieldAlert
} from 'lucide-react';
import { vehicleService } from '../services/vehicleService';
import { useLanguage } from '../context/LanguageContext';

export interface VehicleRecallRecord {
  id: string;
  contractId: string;
  vehiclePlate: string;
  tenantId: string;
  recallType: 'EXPIRED' | 'EARLY_TERMINATION';
  reason: string;
  requestedBy: string;
  requestDate: string;
  receivedBy?: string;
  handoverDate?: string;
  mileage?: string;
  fuelLevel?: string;
  exteriorNotes?: string;
  damageFee?: number;
  depositRefund?: number;
  outstandingDebt?: number;
  isSettled: boolean;
  inspectionResult?: 'PASS' | 'FAIL';
  status: 'PENDING_RECALL' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  completedAt?: string;
}

interface VehicleRecallModalProps {
  contract: any;
  onClose: () => void;
  onSuccess: () => void;
}

const RECALL_STORAGE_KEY = 'sys_vehicle_recalls';

export default function VehicleRecallModal({ contract, onClose, onSuccess }: VehicleRecallModalProps) {
  const { t } = useLanguage();
  const tenantId = localStorage.getItem('tenantId') || 'COMPANY_A';
  const currentUser = localStorage.getItem('username') || 'Nhân viên';

  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [existingRecord, setExistingRecord] = useState<VehicleRecallRecord | null>(null);

  // Form states
  const [recallType, setRecallType] = useState<'EXPIRED' | 'EARLY_TERMINATION'>('EXPIRED');
  const [reason, setReason] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<string>(currentUser);
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stage 2 fields
  const [receivedBy, setReceivedBy] = useState<string>(currentUser);
  const [handoverDate, setHandoverDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState<string>('');
  const [fuelLevel, setFuelLevel] = useState<string>('80%');
  const [exteriorNotes, setExteriorNotes] = useState<string>('Thân vỏ bình thường, không trầy xước.');
  const [damageFee, setDamageFee] = useState<number>(0);
  const [depositRefund, setDepositRefund] = useState<number>(1000000);
  const [outstandingDebt, setOutstandingDebt] = useState<number>(0);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  // Stage 3 fields
  const [inspectionResult, setInspectionResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const carPlate = contract.carPlate || contract.vehicle?.plate || contract.contractData?.carPlate || '43A-112.22';
  const partnerName = contract.partnerName || contract.partyB?.name || contract.contractData?.renterName || 'Khách hàng';

  // Tải hồ sơ thu hồi hiện tại nếu đã có
  useEffect(() => {
    const allRecalls: VehicleRecallRecord[] = JSON.parse(localStorage.getItem(RECALL_STORAGE_KEY) || '[]');
    const current = allRecalls.find(r => r.contractId === contract.id && r.tenantId === tenantId);
    if (current) {
      setExistingRecord(current);
      setRecallType(current.recallType);
      setReason(current.reason);
      setRequestedBy(current.requestedBy);
      setRequestDate(current.requestDate);
      if (current.receivedBy) setReceivedBy(current.receivedBy);
      if (current.handoverDate) setHandoverDate(current.handoverDate);
      if (current.mileage) setMileage(current.mileage);
      if (current.fuelLevel) setFuelLevel(current.fuelLevel);
      if (current.exteriorNotes) setExteriorNotes(current.exteriorNotes);
      if (current.damageFee !== undefined) setDamageFee(current.damageFee);
      if (current.depositRefund !== undefined) setDepositRefund(current.depositRefund);
      if (current.outstandingDebt !== undefined) setOutstandingDebt(current.outstandingDebt);
      setIsSettled(!!current.isSettled);
      if (current.inspectionResult) setInspectionResult(current.inspectionResult);

      if (current.status === 'PENDING_RECALL') setActiveStage(2);
      else if (current.status === 'RECEIVED') setActiveStage(3);
    }
  }, [contract.id, tenantId]);

  // Lưu record vào LocalStorage
  const saveRecallRecord = (record: VehicleRecallRecord) => {
    const allRecalls: VehicleRecallRecord[] = JSON.parse(localStorage.getItem(RECALL_STORAGE_KEY) || '[]');
    const idx = allRecalls.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      allRecalls[idx] = record;
    } else {
      allRecalls.unshift(record);
    }
    localStorage.setItem(RECALL_STORAGE_KEY, JSON.stringify(allRecalls));
  };

  // Cập nhật trạng thái hợp đồng trong `sys_e_contracts`
  const updateContractStatus = (newStatus: string, recallStatus: string) => {
    const allContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
    const updated = allContracts.map((c: any) => {
      if (c.id === contract.id) {
        return {
          ...c,
          status: newStatus,
          recallStatus: recallStatus,
          lastModified: new Date().toLocaleDateString('vi-VN'),
        };
      }
      return c;
    });
    localStorage.setItem('sys_e_contracts', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  // XỬ LÝ GIAI ĐOẠN 1: Tạo yêu cầu thu hồi
  const handleStage1Submit = () => {
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do cụ thể để tạo yêu cầu thu hồi xe.');
      return;
    }
    setErrorMsg('');

    const newRecord: VehicleRecallRecord = {
      id: existingRecord?.id || `REC-${Date.now().toString().slice(-6)}`,
      contractId: contract.id,
      vehiclePlate: carPlate,
      tenantId,
      recallType,
      reason,
      requestedBy,
      requestDate,
      isSettled: false,
      status: 'PENDING_RECALL',
    };

    saveRecallRecord(newRecord);
    setExistingRecord(newRecord);
    updateContractStatus('PENDING_RECALL', 'PENDING_RECALL');
    setActiveStage(2);
  };

  // XỬ LÝ GIAI ĐOẠN 2: Tiếp nhận bàn giao thực tế tại hiện trường
  const handleStage2Submit = async () => {
    if (!mileage.trim()) {
      setErrorMsg('Vui lòng nhập số km công tơ mét khi tiếp nhận xe.');
      return;
    }
    setErrorMsg('');

    const updatedRecord: VehicleRecallRecord = {
      ...existingRecord!,
      receivedBy,
      handoverDate,
      mileage,
      fuelLevel,
      exteriorNotes,
      damageFee: Number(damageFee) || 0,
      depositRefund: Number(depositRefund) || 0,
      outstandingDebt: Number(outstandingDebt) || 0,
      isSettled,
      status: 'RECEIVED',
    };

    saveRecallRecord(updatedRecord);
    setExistingRecord(updatedRecord);

    // Cập nhật hợp đồng sang RECEIVED, và cập nhật xe sang PENDING_INSPECTION (Chờ kiểm tra)
    updateContractStatus('RECEIVED', 'RECEIVED');
    try {
      await vehicleService.updateVehicleStatus(
        tenantId,
        carPlate,
        'PENDING_INSPECTION',
        `Đã tiếp nhận xe thu hồi từ HĐ ${contract.id}. Chờ kiểm định kỹ thuật.`
      );
    } catch (err) {
      console.warn('Lỗi cập nhật trạng thái xe:', err);
    }

    setActiveStage(3);
  };

  // XỬ LÝ GIAI ĐOẠN 3: Nghiệm thu kỹ thuật & Quyết toán hoàn tất
  const handleStage3Finalize = async () => {
    // RÀNG BUỘC NGHIÊM NGẶT: Không được phép hoàn tất nếu chưa quyết toán tài chính!
    if (!isSettled) {
      setErrorMsg(
        'RÀNG BUỘC BẮT BUỘC: Hợp đồng chưa hoàn tất thanh toán tài chính và quyết toán công nợ! Vui lòng tích chọn xác nhận quyết toán tài chính ở Giai đoạn 2 trước khi hoàn tất thu hồi xe.'
      );
      return;
    }
    setErrorMsg('');

    const completedRecord: VehicleRecallRecord = {
      ...existingRecord!,
      inspectionResult,
      isSettled: true,
      status: 'COMPLETED',
      completedAt: new Date().toLocaleString('vi-VN'),
    };

    saveRecallRecord(completedRecord);

    // Đóng hợp đồng thành COMPLETED (hoặc RECALLED)
    updateContractStatus('COMPLETED', 'RECALLED');

    // Chuyển trạng thái xe: nếu ĐẠT -> AVAILABLE, nếu HỎNG -> MAINTENANCE
    const targetVehicleStatus = inspectionResult === 'PASS' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      await vehicleService.updateVehicleStatus(
        tenantId,
        carPlate,
        targetVehicleStatus,
        `Hoàn tất thu hồi HĐ ${contract.id}. Kết quả kiểm tra: ${inspectionResult === 'PASS' ? 'ĐẠT (Sẵn sàng cho thuê)' : 'HỎNG (Chuyển bảo dưỡng)'}`
      );
    } catch (err: any) {
      console.warn(err);
    }

    alert('Đã hoàn tất quy trình thu hồi phương tiện và quyết toán hợp đồng thành công!');
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">{t('recall.modalTitle')}</h3>
              <p className="text-xs text-slate-500">
                Mã HĐ: <strong className="font-mono text-slate-700">{contract.id}</strong> • Xe: <strong className="font-mono text-sky-600">{carPlate}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TIẾN TRÌNH 3 GIAI ĐOẠN */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-500">
          <div
            onClick={() => setActiveStage(1)}
            className={`flex items-center gap-2 cursor-pointer ${activeStage === 1 ? 'text-sky-600 font-extrabold' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStage >= 1 ? 'bg-sky-600 text-white' : 'bg-slate-300'}`}>1</span>
            <span>Yêu cầu thu hồi</span>
          </div>
          <span className="text-slate-300">───</span>
          <div
            onClick={() => existingRecord && setActiveStage(2)}
            className={`flex items-center gap-2 cursor-pointer ${activeStage === 2 ? 'text-sky-600 font-extrabold' : ''} ${!existingRecord ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStage >= 2 ? 'bg-sky-600 text-white' : 'bg-slate-300'}`}>2</span>
            <span>Tiếp nhận hiện trường</span>
          </div>
          <span className="text-slate-300">───</span>
          <div
            onClick={() => existingRecord?.status === 'RECEIVED' && setActiveStage(3)}
            className={`flex items-center gap-2 cursor-pointer ${activeStage === 3 ? 'text-sky-600 font-extrabold' : ''} ${existingRecord?.status !== 'RECEIVED' ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeStage === 3 ? 'bg-sky-600 text-white' : 'bg-slate-300'}`}>3</span>
            <span>Nghiệm thu & Hoàn tất</span>
          </div>
        </div>

        {/* NỘI DUNG CHÍNH THEO GIAI ĐOẠN */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 font-bold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* GIAI ĐOẠN 1: TẠO YÊU CẦU */}
          {activeStage === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Bên thuê / Khách hàng</span>
                  <span className="font-bold text-slate-800 text-sm">{partnerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[10px]">Phương tiện gán</span>
                  <span className="font-mono font-bold text-sky-600 text-sm">{carPlate}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('recall.typeLabel')} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecallType('EXPIRED')}
                    className={`p-3 rounded-xl border text-left font-bold transition ${recallType === 'EXPIRED' ? 'bg-sky-50 border-sky-500 text-sky-700 ring-1 ring-sky-500' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    {t('recall.typeExpired')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecallType('EARLY_TERMINATION')}
                    className={`p-3 rounded-xl border text-left font-bold transition ${recallType === 'EARLY_TERMINATION' ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    {t('recall.typeEarly')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('recall.reasonLabel')} *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('recall.reasonPlaceholder')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.requestedByLabel')}</label>
                  <input
                    type="text"
                    value={requestedBy}
                    onChange={e => setRequestedBy(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.requestDateLabel')}</label>
                  <input
                    type="date"
                    value={requestDate}
                    onChange={e => setRequestDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 2: BÀN GIAO THỰC TẾ & CÔNG NỢ */}
          {activeStage === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-sky-800 flex items-center gap-2">
                <FileText className="w-4 h-4 shrink-0 text-sky-600" />
                <span>Ghi nhận biên bản hiện trường khi phương tiện được bàn giao thực tế về bãi kiểm soát.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.receiverLabel')} *</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={e => setReceivedBy(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.handoverDateLabel')} *</label>
                  <input
                    type="date"
                    value={handoverDate}
                    onChange={e => setHandoverDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.mileageLabel')} *</label>
                  <input
                    type="text"
                    value={mileage}
                    onChange={e => setMileage(e.target.value)}
                    placeholder="VD: 45,210 km"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('recall.fuelLabel')}</label>
                  <input
                    type="text"
                    value={fuelLevel}
                    onChange={e => setFuelLevel(e.target.value)}
                    placeholder="VD: 85% hoặc 4/5 bình"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('recall.exteriorLabel')}</label>
                <textarea
                  rows={2}
                  value={exteriorNotes}
                  onChange={e => setExteriorNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium"
                />
              </div>

              {/* Phần tài chính & Quyết toán */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Quyết toán tài chính & Công nợ
                </h4>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('recall.damageFeeLabel')}</label>
                    <input
                      type="number"
                      value={damageFee}
                      onChange={e => setDamageFee(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('recall.refundDepositLabel')}</label>
                    <input
                      type="number"
                      value={depositRefund}
                      onChange={e => setDepositRefund(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-emerald-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{t('recall.outstandingDebtLabel')}</label>
                    <input
                      type="number"
                      value={outstandingDebt}
                      onChange={e => setOutstandingDebt(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-rose-600 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isSettled"
                    checked={isSettled}
                    onChange={e => setIsSettled(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="isSettled" className="font-bold text-slate-700 cursor-pointer select-none">
                    {t('recall.isSettledLabel')}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 3: NGHIỆM THU KỸ THUẬT & HOÀN TẤT */}
          {activeStage === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <span className="font-bold block mb-1">Phương tiện đã được bàn giao thực tế:</span>
                <p>Biển số: <strong className="font-mono">{carPlate}</strong> • Số km: <strong>{mileage || 'Đã ghi nhận'}</strong> • Nhiên liệu: <strong>{fuelLevel}</strong></p>
                <p className="mt-1">
                  Trạng thái quyết toán công nợ: {isSettled ? <strong className="text-emerald-700">Đã thanh toán đủ</strong> : <strong className="text-rose-600">Còn công nợ chưa xử lý</strong>}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">{t('recall.inspectionResultLabel')} *</label>
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setInspectionResult('PASS')}
                    className={`w-full p-3.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${inspectionResult === 'PASS' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <span>{t('recall.inspectPass')}</span>
                    {inspectionResult === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionResult('FAIL')}
                    className={`w-full p-3.5 rounded-xl border text-left font-bold transition flex items-center justify-between ${inspectionResult === 'FAIL' ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    <span>{t('recall.inspectFail')}</span>
                    {inspectionResult === 'FAIL' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  </button>
                </div>
              </div>

              {!isSettled && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  {t('recall.unsettledWarning')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition"
          >
            {t('common.cancel')}
          </button>

          <div className="flex gap-2">
            {activeStage === 1 && (
              <button
                type="button"
                onClick={handleStage1Submit}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition"
              >
                {t('recall.step1Submit')}
              </button>
            )}

            {activeStage === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveStage(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleStage2Submit}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow transition"
                >
                  {t('recall.step2Submit')}
                </button>
              </>
            )}

            {activeStage === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveStage(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleStage3Finalize}
                  disabled={!isSettled}
                  className={`px-5 py-2.5 font-bold rounded-xl shadow transition ${
                    isSettled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {t('recall.step3Submit')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

