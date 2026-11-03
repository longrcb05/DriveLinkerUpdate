/**
 * @file ContractManagement.tsx
 * @description Quản lý Đối tác, Hợp đồng Vận chuyển & Bản nháp.
 * Khắc phục hoàn toàn lỗi trôi trang PDF (Ép cứng đúng 2 trang A4 chuẩn).
 */

import { useState, useEffect } from 'react';
import {
  ChevronRight, FileText, Printer,
  User, Eye, Search, Lock, ShieldAlert, Edit3, Trash2, X,
  RotateCcw, Clock, AlertTriangle, CheckCircle2, Car
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestPriceChangeModal from '../components/RequestPriceChangeModal';
import VehicleRecallModal from '../components/VehicleRecallModal';
import { useLanguage } from '../context/LanguageContext';

export default function ContractManagement() {
  const { t } = useLanguage();
  void t;
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'TENANT_STAFF';
  const tenantId = localStorage.getItem('tenantId') || 'COMPANY_A';

  const isManager = userRole === 'TENANT_ADMIN' || userRole === 'SYS_ADMIN' || userRole === 'SUPER_ADMIN_VIEW';

  const [activeTab, setActiveTab] = useState<'OFFICIAL' | 'DRAFT'>('OFFICIAL');
  const [contracts, setContracts] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [requestContractId, setRequestContractId] = useState<string | null>(null);
  const [recallingContract, setRecallingContract] = useState<any | null>(null);
  const [editingPriceContract, setEditingPriceContract] = useState<any | null>(null);
  const [managerNewPrice, setManagerNewPrice] = useState<string>('');

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [tenantId]);

  const loadData = () => {
    if (!localStorage.getItem('sys_price_requests')) localStorage.setItem('sys_price_requests', JSON.stringify([]));

    const allContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
    setContracts(allContracts.filter((c: any) => c.tenantId === tenantId).reverse());

    // Hỗ trợ gộp cả key sys_contract_drafts và sys_contract_drafts_${tenantId}
    const legacyDrafts = JSON.parse(localStorage.getItem(`sys_contract_drafts_${tenantId}`) || '[]');
    const standardDrafts = JSON.parse(localStorage.getItem('sys_contract_drafts') || '[]');
    const draftMap = new Map();
    [...legacyDrafts, ...standardDrafts].forEach((d: any) => {
      if (d && d.id) draftMap.set(d.id, d);
    });
    const merged = Array.from(draftMap.values());
    localStorage.setItem('sys_contract_drafts', JSON.stringify(merged));
    setDrafts(merged.filter((d: any) => d.tenantId === tenantId || !d.tenantId).reverse());
  };

  /**
   * Thuật toán tính toán thời hạn hợp đồng và xác định trạng thái tự động.
   */
  const calculateContractExpiry = (contract: any) => {
    if (contract.status === 'COMPLETED' || contract.recallStatus === 'RECALLED') {
      return {
        status: 'RECALLED',
        badge: 'Đã thanh lý / Thu hồi',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        remainingText: 'Hợp đồng đã kết thúc',
      };
    }

    if (contract.status === 'RECEIVED' || contract.recallStatus === 'RECEIVED') {
      return {
        status: 'RECEIVED',
        badge: 'Đã nhận xe / Chờ nghiệm thu',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-300 font-bold',
        remainingText: 'Đang kiểm định hiện trường',
      };
    }

    if (contract.status === 'PENDING_RECALL' || contract.recallStatus === 'PENDING_RECALL') {
      return {
        status: 'PENDING_RECALL',
        badge: 'Đang yêu cầu thu hồi',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 font-bold',
        remainingText: 'Chờ tiếp nhận bàn giao xe',
      };
    }

    const endDateStr = contract.rentEndDate || contract.contractData?.rentEndDate;
    if (!endDateStr) {
      return {
        status: 'ACTIVE',
        badge: 'Còn hiệu lực',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        remainingText: 'Không giới hạn ngày',
      };
    }

    let endDate: Date;
    if (endDateStr.includes('/')) {
      const parts = endDateStr.split('/');
      if (parts.length === 3) {
        endDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59);
      } else {
        endDate = new Date(endDateStr);
      }
    } else {
      endDate = new Date(endDateStr);
    }

    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'EXPIRED',
        badge: 'Đã hết hạn',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold',
        remainingText: `Quá hạn ${Math.abs(diffDays)} ngày`,
      };
    }

    if (diffDays <= 3) {
      return {
        status: 'EXPIRING_SOON',
        badge: 'Sắp hết hạn',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold animate-pulse',
        remainingText: `Còn ${diffDays} ngày (${Math.max(1, Math.round(diffMs / 3600000))} giờ)`,
      };
    }

    return {
      status: 'ACTIVE',
      badge: 'Còn hiệu lực',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      remainingText: `Còn ${diffDays} ngày`,
    };
  };

  // Quản lý lưu giá sửa trực tiếp
  const handleManagerSavePriceDirect = () => {
    if (!editingPriceContract || !managerNewPrice) return;
    const numPrice = Number(managerNewPrice.replace(/[^0-9]/g, ''));
    if (!numPrice || numPrice <= 0) {
      alert('Vui lòng nhập đơn giá hợp lệ lớn hơn 0.');
      return;
    }

    const allContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
    const updated = allContracts.map((c: any) => {
      if (c.id === editingPriceContract.id) {
        return {
          ...c,
          value: `${numPrice.toLocaleString('vi-VN')} VNĐ`,
          rentPrice: String(numPrice),
          hasPendingRequest: false,
          lastModified: new Date().toLocaleDateString('vi-VN'),
        };
      }
      return c;
    });

    localStorage.setItem('sys_e_contracts', JSON.stringify(updated));
    setEditingPriceContract(null);
    setManagerNewPrice('');
    loadData();
    window.dispatchEvent(new Event('storage'));
    alert('Đã cập nhật đơn giá hợp đồng thành công!');
  };

  const handleSubmitPriceRequest = (reason: string) => {
    if (!requestContractId) return;

    const allContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
    const targetContract = allContracts.find((c: any) => c.id === requestContractId);
    const userName = localStorage.getItem('sys_core_role') === 'SUPER_ADMIN' ? 'Hệ thống Admin' : 'Nhân viên A';

    const newRequest = {
      id: `REQ-${Date.now()}`,
      contractId: requestContractId,
      customer: targetContract?.partnerName || 'Khách hàng',
      staff: userName,
      date: new Date().toLocaleString('vi-VN'),
      reason: reason,
      status: 'PENDING',
      managerNote: ''
    };

    const requests = JSON.parse(localStorage.getItem('sys_price_requests') || '[]');
    localStorage.setItem('sys_price_requests', JSON.stringify([newRequest, ...requests]));

    const updatedContracts = allContracts.map((c: any) =>
      c.id === requestContractId ? { ...c, hasPendingRequest: true } : c
    );
    localStorage.setItem('sys_e_contracts', JSON.stringify(updatedContracts));

    loadData();
    setRequestContractId(null);
    alert('Đã gửi yêu cầu phê duyệt thành công! Vui lòng chờ Quản lý duyệt.');
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeleteDraft = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa bản nháp này không?')) {
      const updated = drafts.filter(d => d.id !== id);
      localStorage.setItem('sys_contract_drafts', JSON.stringify(updated));
      setDrafts(updated);
    }
  };

  const totalClients = contracts.length;
  const eContractCount = contracts.filter(c => c.type === 'E_CONTRACT' || c.status === 'OFFICIAL').length;
  const displayData = activeTab === 'OFFICIAL' ? contracts : drafts;
  const filteredData = displayData.filter(c =>
    (c.partnerName || c.partyB?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (amount: any) => {
    if (!amount) return '0 VNĐ';
    const num = Number(String(amount).replace(/[^0-9]/g, ''));
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  /**
   * Component Render Hợp Đồng chuẩn thiết kế 2 Trang A4
   */
  /**
   * Component Render Hợp Đồng chuẩn thiết kế 2 Trang A4 đồng đều
   */
  const ContractPrintDocument = ({ contract }: { contract: any }) => {
    const plate = contract.carPlate || contract.vehicle?.plate || contract.contractData?.carPlate || '43A-12299';
    const partyAName = contract.partyA?.name || contract.contractData?.partyAName || 'Đại lý DriveLinker';
    const partyAAddress = contract.partyA?.address || contract.contractData?.partyAAddress || '120 Hoàng Minh Thảo, Đà Nẵng';
    const partyAPhone = contract.partyA?.phone || contract.contractData?.partyAPhone || '0977.73.74.75';
    const partyARole = contract.partyA?.role || contract.contractData?.partyARole || '';
    const partyARepresentative = contract.partyA?.representative || contract.contractData?.partyARepresentative || 'Hệ thống DriveLinker';

    const renterName = contract.partnerName || contract.partyB?.name || contract.contractData?.renterName || '---------------------';
    const renterPhone = contract.partnerPhone || contract.partyB?.phone || contract.contractData?.renterPhone || '---------------------';
    const renterAddress = contract.partyB?.address || contract.contractData?.renterAddress || 'Đồng Hới, Quảng Trị';
    const renterCccd = contract.partyB?.cccd || contract.cccdNumber || contract.contractData?.cccdNumber || '---------------------';
    const renterCccdDate = contract.partyB?.cccdDate || (contract.contractData?.cccdDate ? new Date(contract.contractData.cccdDate).toLocaleDateString('vi-VN') : '26/10/2026');
    const renterCccdPlace = contract.partyB?.cccdPlace || contract.contractData?.cccdPlace || 'Cục QLHC';
    const renterLicense = contract.partyB?.licenseNumber || contract.contractData?.licenseNumber || '442836949029021';
    const guarantorName = contract.partyB?.guarantorName || contract.contractData?.guarantorName || 'Nguyễn Văn B';
    const guarantorRelation = contract.partyB?.guarantorRelation || contract.contractData?.guarantorRelation || 'Bạn đi chung xe';
    const guarantorPhone = contract.partyB?.guarantorPhone || contract.contractData?.guarantorPhone || '09123456789';

    const startDate = contract.rentStartDate
      ? (contract.rentStartDate.includes('T') ? new Date(contract.rentStartDate).toLocaleString('vi-VN') : contract.rentStartDate)
      : (contract.contractData?.rentStartDate ? new Date(contract.contractData.rentStartDate).toLocaleString('vi-VN') : '13:26:00 01/11/2026');
    const endDate = contract.rentEndDate
      ? (contract.rentEndDate.includes('T') ? new Date(contract.rentEndDate).toLocaleString('vi-VN') : contract.rentEndDate)
      : (contract.contractData?.rentEndDate ? new Date(contract.contractData.rentEndDate).toLocaleString('vi-VN') : '13:26:00 02/11/2026');

    const rentPrice = formatMoney(contract.value || contract.rentPrice || contract.contractData?.rentPrice || contract.vehicle?.price || 800000);
    const depositAmount = formatMoney(contract.depositAmount || contract.contractData?.depositAmount || 1500000);

    const hasInvoice = contract.hasInvoice || contract.requireInvoice || contract.contractData?.requireInvoice;
    const taxCode = contract.taxCode || contract.contractData?.taxCode || '0101234567';
    const companyName = contract.companyName || contract.contractData?.companyName || 'Công ty cổ phần vận tải ABC';
    const companyAddress = contract.companyAddress || contract.contractData?.companyAddress || '115 Nguyễn Nhai, Đà Nẵng';
    const signature = contract.signature || contract.contractData?.signatureData;

    return (
      <div className="printable-contract-container text-black bg-white mx-auto">

        {/* ==================== TRANG 1 ==================== */}
        <div className="a4-page page-1 relative box-border overflow-hidden">
          <div className="watermark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
            <h1 className="text-7xl font-bold tracking-widest -rotate-45">DRIVELINKER</h1>
          </div>

          <div className="text-center mb-3">
            <h2 className="font-bold text-[12.5pt] uppercase mb-0.5">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
            <h3 className="font-bold text-[13pt] underline decoration-solid underline-offset-4 mb-2.5">Độc lập - Tự do - Hạnh phúc</h3>
            <h1 className="text-[16pt] font-bold uppercase mb-1 tracking-wide">HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI</h1>
            <p className="text-[12pt] italic mb-2">Hôm nay, ngày {contract.date || new Date().toLocaleDateString('vi-VN')}, tại văn phòng hệ thống DriveLinker, chúng tôi gồm có:</p>
          </div>

          {/* BÊN A */}
          <div className="mb-2.5 space-y-0.5 text-[13pt]">
            <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN CHO THUÊ XE (BÊN A):</p>
            <p>Tên tổ chức/Cá nhân: <span className="font-bold">{partyAName}</span></p>
            <p>Địa chỉ trụ sở: {partyAAddress}</p>
            <p>Điện thoại: {partyAPhone}</p>
            {partyARole && <p>Người đại diện: <span className="font-bold">{partyARepresentative}</span> - Chức vụ: {partyARole}</p>}
          </div>

          {/* BÊN B */}
          <div className="mb-2.5 space-y-0.5 text-[13pt]">
            <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN THUÊ XE (BÊN B):</p>
            <div className="flex justify-between gap-4">
              <p className="flex-1">Ông/Bà: <span className="font-bold uppercase">{renterName}</span></p>
              <p className="flex-1">Số điện thoại: {renterPhone}</p>
            </div>
            <p>Địa chỉ thường trú: {renterAddress}</p>
            <div className="flex justify-between gap-4">
              <p className="flex-1">CCCD/CMND số: <span className="font-bold">{renterCccd}</span> - Cấp ngày: {renterCccdDate}</p>
              <p className="flex-1">Nơi cấp: {renterCccdPlace}</p>
            </div>
            <p>Giấy phép lái xe số: {renterLicense}</p>
            <p>Người bảo lãnh / Liên hệ khẩn cấp: <span className="font-bold">{guarantorName}</span> (Quan hệ: {guarantorRelation}) - SĐT: {guarantorPhone}</p>
          </div>

          <p className="italic text-[12.5pt] mb-2">Sau khi thỏa thuận, hai bên đồng ý ký kết Hợp đồng thuê xe với các điều khoản sau:</p>

          {/* ĐIỀU 1 */}
          <div className="mb-2.5 text-[13pt] space-y-0.5">
            <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 1: THÔNG TIN TÀI SẢN CHO THUÊ</p>
            <p>Bên A đồng ý cho Bên B thuê 01 chiếc xe ô tô mang biển kiểm soát: <span className="font-bold px-2 py-0.5 border border-black rounded inline-block text-[13.5pt]">{plate}</span></p>
            <p className="text-justify leading-normal">Xe được trang bị đầy đủ thiết bị an toàn và hệ thống giám sát hành trình. Bên B cam kết không tự ý tháo dỡ, can thiệp vào hệ thống này trong suốt quá trình thuê xe.</p>
          </div>

          {/* ĐIỀU 2 (CHUYỂN SANG TRANG 1 ĐỂ ĐỒNG BỘ ĐỒNG ĐỀU KHOẢNG CÁCH GIỮA 2 TRANG) */}
          <div className="mb-1.5 text-[13pt] space-y-0.5">
            <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 2: THỜI GIAN VÀ GIÁ THUÊ XE</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>Thời gian bắt đầu thuê: <span className="font-semibold">{startDate}</span></li>
              <li>Thời gian dự kiến trả xe: <span className="font-semibold">{endDate}</span></li>
              <li>Đơn giá thuê: <span className="font-bold">{rentPrice} / ngày</span></li>
              <li>Tiền đặt cọc / Tài sản thế chấp: <span className="font-bold">{depositAmount}</span> (Bên A sẽ hoàn trả lại cho Bên B sau khi thanh lý hợp đồng và trừ đi các khoản phí vi phạm giao thông nếu có phát sinh).</li>
            </ul>
          </div>
        </div>

        {/* ==================== TRANG 2 ==================== */}
        <div className="a4-page page-2 relative box-border overflow-hidden">
          <div className="watermark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none select-none">
            <h1 className="text-7xl font-bold tracking-widest -rotate-45">DRIVELINKER</h1>
          </div>

          {/* ĐIỀU 3 */}
          <div className="mb-3 text-[13pt] space-y-0.5">
            <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</p>
            <p className="font-bold text-[13pt] mt-0.5">3.1. Nghĩa vụ của Bên A:</p>
            <p className="pl-3">• Giao xe đúng chất lượng, đúng thời gian và địa điểm đã thỏa thuận.</p>
            <p className="pl-3">• Cung cấp đầy đủ giấy tờ pháp lý của xe (bản sao y có công chứng hoặc bản gốc tùy thỏa thuận).</p>

            <p className="font-bold text-[13pt] mt-1.5">3.2. Nghĩa vụ của Bên B:</p>
            <p className="pl-3">• Thanh toán đầy đủ tiền thuê xe và tiền cọc cho Bên A.</p>
            <p className="pl-3">• Tự chịu trách nhiệm dân sự, hình sự và chi phí phạt nguội về các vi phạm giao thông phát sinh trong thời gian thuê.</p>
            <p className="pl-3">• Không sử dụng xe vào mục đích cầm cố, thế chấp, chạy xe công nghệ hoặc hành vi vi phạm pháp luật.</p>
          </div>

          {/* ĐIỀU 4 */}
          <div className="mb-3 text-[13pt] space-y-0.5">
            <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 4: THÔNG TIN XUẤT HÓA ĐƠN VAT</p>
            {hasInvoice ? (
              <>
                <p>Bên A thực hiện xuất hóa đơn GTGT cho Bên B theo thông tin sau:</p>
                <p className="pl-3">• Tên đơn vị: <span className="font-bold">{companyName}</span></p>
                <p className="pl-3">• Mã số thuế: <span className="font-bold">{taxCode}</span></p>
                <p className="pl-3">• Địa chỉ: {companyAddress}</p>
              </>
            ) : (
              <p className="text-justify leading-normal">Hợp đồng này không yêu cầu xuất hóa đơn GTGT. Nếu Bên B có nhu cầu xuất hóa đơn phát sinh sau thời điểm ký kết, Bên B phải thông báo cho Bên A trước khi bàn giao xe và thanh toán bổ sung thuế GTGT theo quy định của pháp luật.</p>
            )}
          </div>

          {/* ĐIỀU 5 */}
          <div className="mb-4 text-[13pt] space-y-0.5">
            <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 5: CAM KẾT CHUNG</p>
            <p className="text-justify leading-normal">Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Hợp đồng được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.</p>
          </div>

          {/* CHỮ KÝ XÁC NHẬN */}
          <div className="grid grid-cols-2 text-center mt-5 text-[13pt]">
            <div>
              <p className="font-bold uppercase mb-0.5 text-[13pt]">ĐẠI DIỆN BÊN A</p>
              <p className="italic text-[11.5pt] mb-14">(Ký, ghi rõ họ tên)</p>
              <p className="font-bold uppercase text-[13pt]">{partyARepresentative}</p>
            </div>
            <div>
              <p className="font-bold uppercase mb-0.5 text-[13pt]">ĐẠI DIỆN BÊN B</p>
              <p className="italic text-[11.5pt] mb-1">(Ký, ghi rõ họ tên)</p>
              <div className="h-14 flex items-center justify-center mb-1">
                {signature ? (
                  <img src={signature} alt="Chữ ký bên B" className="max-h-full mix-blend-multiply object-contain" />
                ) : (
                  <span className="text-xs text-gray-400 italic">[Đã ký điện tử]</span>
                )}
              </div>
              <p className="font-bold uppercase text-[13pt]">{renterName}</p>
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">

      {/* CẤU HÌNH CSS DÙNG CHO MÁY IN / XUẤT PDF TRUYỀN THỐNG */}
      <style>{`
        /* CSS Xem Demo trên màn hình Web */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm 18mm;
          background: white;
          margin: 0 auto 24px auto;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          line-height: 1.35;
          box-sizing: border-box;
        }

        /* Rule đặc biệt dành riêng cho Máy in / Xuất PDF */
        @media print {
          /* Ẩn hoàn toàn tất cả thành phần UI của Web */
          body * {
            visibility: hidden !important;
          }

          /* Chỉ hiển thị duy nhất khu vực chứa tài liệu */
          #printable-pdf-area, #printable-pdf-area * {
            visibility: visible !important;
          }

          #printable-pdf-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* Reset khung trang khi vào chế độ in */
          .a4-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }

          .a4-page.page-1 {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .a4-page.page-2 {
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Khấu trừ lề trang in A4 chuẩn */
          @page {
            size: A4 portrait;
            margin: 12mm 18mm;
          }
        }
      `}</style>

      {/* GIAO DIỆN QUẢN LÝ CHÍNH (NO-PRINT) */}
      <div className="no-print flex-1 overflow-auto">
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <span>MENU</span>
            <ChevronRight className="w-3 h-3 mx-2" />
            <span className="text-sky-600">ĐỐI TÁC & HỢP ĐỒNG</span>
          </div>

          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">Quản lý Đối tác & Hợp đồng</h2>
            <button
              onClick={() => navigate('/create-contract')}
              className="bg-[#0EA5E9] hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <User className="w-4 h-4" /> Thêm hợp đồng mới
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="px-6 grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng hợp đồng / Khách</p>
            <h3 className="text-3xl font-bold text-sky-600 leading-none">{totalClients}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hợp đồng chính thức</p>
            <h3 className="text-3xl font-bold text-emerald-600 leading-none">{eContractCount}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Doanh thu dự kiến</p>
            <h3 className="text-3xl font-bold text-slate-300 leading-none">{isManager ? '---' : '***'}</h3>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hợp đồng Nháp</p>
            <h3 className="text-3xl font-bold text-amber-500 leading-none">{drafts.length}</h3>
          </div>
        </div>

        {/* DANH SÁCH BẢNG */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-200">
              <button onClick={() => setActiveTab('OFFICIAL')} className={`px-6 py-4 text-sm font-bold border-b-2 ${activeTab === 'OFFICIAL' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500'}`}>
                Hợp đồng Chính thức ({contracts.length})
              </button>
              <button onClick={() => setActiveTab('DRAFT')} className={`px-6 py-4 text-sm font-bold border-b-2 ${activeTab === 'DRAFT' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}>
                Quản lý Bản nháp ({drafts.length})
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo Mã HĐ, Tên..."
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-sky-500 w-64 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="p-4 pl-6">Mã HĐ & Phương Tiện</th>
                    <th className="p-4">Khách Hàng (Bên Thuê)</th>
                    <th className="p-4">Thời hạn & Tình trạng Hạn</th>
                    <th className="p-4">Đơn giá thuê</th>
                    <th className="p-4">Tiến độ Thu Hồi</th>
                    <th className="p-4 text-right pr-6">Thao tác & Phân quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500">
                        <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="font-bold text-slate-600">Chưa có dữ liệu</p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item) => {
                      const expiry = calculateContractExpiry(item);
                      const plate = item.carPlate || item.vehicle?.plate || item.contractData?.carPlate || '---';
                      const startDate = item.rentStartDate || item.contractData?.rentStartDate || item.date || '---';
                      const endDate = item.rentEndDate || item.contractData?.rentEndDate || '---';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Cột 1: Mã HĐ & Xe */}
                          <td className="p-4 pl-6">
                            <span className="font-mono text-slate-800 font-bold text-xs">{item.id}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Car className="w-3.5 h-3.5 text-sky-500" />
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {plate}
                              </span>
                            </div>
                          </td>

                          {/* Cột 2: Khách hàng */}
                          <td className="p-4">
                            <p className="font-bold text-slate-800">{item.partnerName || item.partyB?.name || '(Chưa nhập tên)'}</p>
                            <p className="text-[10px] font-mono text-slate-500">{item.partnerPhone || item.partyB?.phone || '---'}</p>
                          </td>

                          {/* Cột 3: Thời hạn & Tình trạng hạn HĐ */}
                          <td className="p-4">
                            {activeTab === 'OFFICIAL' ? (
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${expiry.badgeClass}`}>
                                  {expiry.status === 'EXPIRING_SOON' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                                  {expiry.status === 'EXPIRED' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                  {expiry.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {expiry.badge}
                                </span>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{expiry.remainingText}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {startDate} ➔ {endDate}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">Đang soạn thảo</span>
                            )}
                          </td>

                          {/* Cột 4: Đơn giá */}
                          <td className="p-4 font-bold text-emerald-600 text-sm">
                            {formatMoney(item.value || item.vehicle?.price || item.rentPrice)}
                          </td>

                          {/* Cột 5: Tiến độ Thu hồi */}
                          <td className="p-4">
                            {activeTab === 'OFFICIAL' ? (
                              item.recallStatus === 'RECALLED' || item.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã hoàn tất thu hồi
                                </span>
                              ) : item.recallStatus === 'RECEIVED' || item.status === 'RECEIVED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-300">
                                  <Car className="w-3 h-3 text-sky-600" /> Đã nhận xe / Chờ nghiệm thu
                                </span>
                              ) : item.recallStatus === 'PENDING_RECALL' || item.status === 'PENDING_RECALL' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600 animate-spin" /> Chờ tiếp nhận xe
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Chưa yêu cầu</span>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400">---</span>
                            )}
                          </td>

                          {/* Cột 6: Thao tác */}
                          <td className="p-4 pr-6 text-right">
                            <div className="flex justify-end gap-1.5 items-center">
                              {activeTab === 'OFFICIAL' && (
                                <>
                                  <button
                                    onClick={() => setViewingContract(item)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded flex items-center gap-1 transition"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Xem PDF
                                  </button>

                                  {/* Nút Thu hồi xe */}
                                  <button
                                    onClick={() => setRecallingContract(item)}
                                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded flex items-center gap-1 transition"
                                    title="Quy trình thu hồi phương tiện 3 giai đoạn"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Thu hồi xe
                                  </button>

                                  {isManager ? (
                                    <button
                                      onClick={() => {
                                        setEditingPriceContract(item);
                                        setManagerNewPrice(String(item.value || item.vehicle?.price || item.rentPrice || ''));
                                      }}
                                      className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold rounded text-xs border border-sky-200 flex items-center gap-1 transition"
                                    >
                                      <Edit3 className="w-3 h-3" /> Sửa giá
                                    </button>
                                  ) : (
                                    item.hasPendingRequest ? (
                                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Chờ duyệt sửa
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => setRequestContractId(item.id)}
                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 text-xs font-bold rounded flex items-center gap-1 transition"
                                      >
                                        <Lock className="w-3 h-3" /> Yêu cầu sửa giá
                                      </button>
                                    )
                                  )}
                                </>
                              )}

                              {activeTab === 'DRAFT' && (
                                <>
                                  <button onClick={() => navigate('/create-contract', { state: { draftId: item.id } })} className="px-3 py-1.5 bg-sky-50 text-sky-600 text-xs font-bold rounded flex items-center gap-1 border border-sky-200">
                                    <Edit3 className="w-3.5 h-3.5" /> Tiếp tục soạn
                                  </button>
                                  <button onClick={() => handleDeleteDraft(item.id)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SỬA GIÁ (YÊU CẦU CỦA NHÂN VIÊN) */}
      {requestContractId && (
        <RequestPriceChangeModal
          contractId={requestContractId}
          onClose={() => setRequestContractId(null)}
          onSubmit={handleSubmitPriceRequest}
        />
      )}

      {/* MODAL QUẢN LÝ SỬA GIÁ TRỰC TIẾP */}
      {editingPriceContract && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-base">Cập nhật Đơn giá Hợp đồng (Quản lý)</h3>
              <button onClick={() => setEditingPriceContract(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Mã HĐ: <strong className="font-mono text-slate-800">{editingPriceContract.id}</strong> • Khách: <strong>{editingPriceContract.partnerName}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá mới (VNĐ)</label>
                <input
                  type="text"
                  value={managerNewPrice}
                  onChange={e => setManagerNewPrice(e.target.value)}
                  placeholder="VD: 1,200,000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-emerald-600 outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingPriceContract(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleManagerSavePriceDirect}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow"
                >
                  Cập nhật giá
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THU HỒI PHƯƠNG TIỆN 3 GIAI ĐOẠN */}
      {recallingContract && (
        <VehicleRecallModal
          contract={recallingContract}
          onClose={() => setRecallingContract(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* PDF VIEWER / CONTAINER IN */}
      {viewingContract && (
        <div className="fixed inset-0 bg-[#323639] z-[200] flex flex-col animate-in fade-in duration-200">
          <div className="no-print h-14 bg-[#323639] border-b border-white/10 flex justify-between items-center px-6 shrink-0 shadow-md z-10">
            <div className="flex items-center gap-4">
              <FileText className="w-5 h-5 text-white/70" />
              <span className="text-white font-medium text-sm truncate max-w-md">HopDong_{viewingContract.id}.pdf</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => window.print()} className="px-3 py-1.5 text-white/90 hover:text-white hover:bg-white/10 rounded flex items-center gap-2 text-sm font-bold">
                <Printer className="w-4 h-4" /> In / Tải PDF
              </button>
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              <button onClick={() => setViewingContract(null)} className="px-5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg shadow">
                Đóng
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#525659]">
            <div id="printable-pdf-area">
              <ContractPrintDocument contract={viewingContract} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}