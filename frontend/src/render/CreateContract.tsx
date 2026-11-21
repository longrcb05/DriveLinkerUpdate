/**
 * @file CreateContract.tsx
 * @module Frontend/Contracts
 * @description Phân hệ Soạn thảo & Phát hành Hợp đồng Thuê xe Điện tử (Digital E-Contract Authoring Engine).
 * 
 * TÍNH NĂNG & NGUYÊN TẮC KỸ THUẬT:
 * 1. Khung Ký số Điện tử HTML5 Canvas (Biometric Touch Signature):
 *    - Sử dụng `canvasRef` bắt sự kiện chuột (`mousedown`, `mousemove`, `mouseup`) và màn hình cảm ứng (`touchstart`, `touchmove`, `touchend`).
 *    - Trích xuất chữ ký điện tử trực tiếp sang định dạng Base64 PNG URL (`canvas.toDataURL('image/png')`) để nhúng vào trang in hợp đồng.
 * 
 * 2. Cơ chế Tự động Lưu & Khôi phục Bản nháp (Auto-Draft Resilience):
 *    - Sử dụng `useRef(formData)` để giải quyết triệt để lỗi Stale Closure khi lưu bản nháp vào `sys_contract_drafts`.
 *    - Cho phép phục hồi nguyên vẹn dữ liệu form, ảnh CCCD 2 mặt và chữ ký khi bấm sửa bản nháp từ màn hình danh sách.
 * 
 * 3. Đồng bộ Trạng thái Phương tiện (Fleet State Sync):
 *    - Khi hợp đồng chính thức được phát hành, hệ thống tự động gọi `vehicleService.updateStatus(carPlate, 'RENTED')`
 *      và phát sự kiện `dl_vehicles_updated` để cập nhật trạng thái xe trên toàn hệ thống.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import contractService from '../api/contractService';
import { vehicleService } from '../services/vehicleService';
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    User,
    FileText,
    Save,
    AlertCircle,
    Printer,
    PenTool,
    Receipt,
    Check,
    X,
    Eraser,
    CheckCircle2,
    Download,
    CheckCircle,
    List,
    MapPin,
    Car,
    Users,
    Loader2,
    Info
} from 'lucide-react';

interface VehicleOption {
    id?: string;
    plate: string;
    model: string;
    dailyRate: number;
    status?: string;
}

interface ContractFormData {
    id: string;
    partyAName: string;
    partyAAddress: string;
    partyAPhone: string;
    partyARepresentative: string;
    partyARole: string;

    renterName: string;
    renterPhone: string;
    renterAddress: string;

    carPlate: string;
    rentStartDate: string;
    rentEndDate: string;
    rentPrice: string;
    depositAmount: string;

    cccdNumber: string;
    cccdDate: string;
    cccdPlace: string;
    licenseNumber: string;

    guarantorName: string;
    guarantorPhone: string;
    guarantorRelation: string;

    requireInvoice: boolean;
    taxCode: string;
    companyName: string;
    companyAddress: string;
}

interface RentalSummary {
    isValidRange: boolean;
    days: number;
    hours: number;
    dailyRate: number;
    deposit: number;
    totalRental: number;
    grandTotal: number;
}

interface ContractPaperProps {
    formData: ContractFormData;
    signatureData: string | null;
    rentalSummary: RentalSummary;
}

// Các biểu thức chính quy (Regex) kiểm tra điều kiện chuẩn
const PHONE_REGEX = /^0\d{9}$/; // Bắt đầu bằng 0, đúng 10 chữ số
const CCCD_REGEX = /^\d{12}$/; // CCCD gắn chip đúng 12 chữ số
const TAX_CODE_REGEX = /^\d{10}(\d{3})?$/; // MST doanh nghiệp 10 hoặc 13 chữ số
const PLATE_REGEX = /^\d{2}[A-Z]{1,2}[-.]?\d{4,5}(\.\d{2})?$/; // Biển số xe VN (VD: 43A-682.19, 51H-12345)

// Danh sách xe gợi ý sẵn (luôn có lựa chọn ngay cả khi kho xe chưa nhập liệu)
const PRESET_VEHICLES: VehicleOption[] = [
    { id: 'PRESET-1', plate: '43A-682.19', model: 'Mazda 3 Luxury', dailyRate: 850000, status: 'AVAILABLE' },
    { id: 'PRESET-2', plate: '43A-519.84', model: 'Hyundai Accent AT', dailyRate: 700000, status: 'AVAILABLE' },
    { id: 'PRESET-3', plate: '43A-791.05', model: 'Kia Carnival', dailyRate: 1800000, status: 'AVAILABLE' },
    { id: 'PRESET-4', plate: '43A-348.62', model: 'Toyota Vios G', dailyRate: 650000, status: 'AVAILABLE' }
];

const formatVND = (amount: string | number): string => {
    const num = typeof amount === 'string' ? Number(amount) : amount;
    return num && !Number.isNaN(num) ? num.toLocaleString('vi-VN') : '..........................';
};

const cleanLabel = (text: string): string => text.replace(/\s*\*+$/, '').trim();

const sanitizeDigits = (value: string, maxLen: number): string =>
    value.replace(/\D/g, '').slice(0, maxLen);

const sanitizePersonName = (value: string): string =>
    value.replace(/[0-9!@#$%^&*()_+=[\]{};:"\\|<>/?~`]/g, '');

const ContractPaperTemplate = React.memo(function ContractPaperTemplate({
    formData,
    signatureData,
    rentalSummary
}: ContractPaperProps) {
    const today = new Date();

    return (
        <div className="font-['Times_New_Roman',_Times,_serif] text-[13pt] leading-[1.35] text-black">
            {/* TRANG 1 */}
            <div className="contract-page page-1 bg-white mx-auto shadow-xl p-[15mm_18mm] w-full max-w-[210mm] min-h-[297mm] mb-8 print:w-full print:max-w-none print:min-h-0 print:shadow-none print:p-0 print:m-0 print:block">
                <div className="text-center mb-3">
                    <h2 className="font-bold text-[12.5pt] mb-0.5 uppercase">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </h2>
                    <h3 className="font-bold text-[13pt] underline decoration-solid underline-offset-4 mb-2.5">
                        Độc lập - Tự do - Hạnh phúc
                    </h3>
                    <h1 className="text-[16pt] font-bold text-center mb-1 uppercase tracking-wide">
                        HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI
                    </h1>
                    <p className="italic text-center mb-2 text-[12pt]">
                        Hôm nay, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}, tại văn phòng{' '}
                        {formData.partyAName || 'hệ thống DriveLinker'}, chúng tôi gồm có:
                    </p>
                </div>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN CHO THUÊ XE - BÊN A:</p>
                    <p>
                        Tên tổ chức/Cá nhân:{' '}
                        <span className="font-bold">
                            {formData.partyAName || '............................................................'}
                        </span>
                    </p>
                    <p>
                        Địa chỉ trụ sở:{' '}
                        {formData.partyAAddress || '..................................................................................'}
                    </p>
                    <p>
                        Điện thoại:{' '}
                        {formData.partyAPhone || '............................................................'}
                    </p>
                    <p>
                        Người đại diện:{' '}
                        <span className="font-bold">
                            {formData.partyARepresentative || '..........................'}
                        </span>{' '}
                        <span className="ml-8">
                            Chức vụ: {formData.partyARole || '..........................'}
                        </span>
                    </p>
                </div>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN THUÊ XE - BÊN B:</p>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">
                            Ông/Bà:{' '}
                            <span className="font-bold uppercase">
                                {formData.renterName || '........................................'}
                            </span>
                        </p>
                        <p className="flex-1">
                            Số điện thoại:{' '}
                            <span className="font-bold">
                                {formData.renterPhone || '..........................'}
                            </span>
                        </p>
                    </div>
                    <p>
                        Địa chỉ thường trú:{' '}
                        {formData.renterAddress || '..................................................................................'}
                    </p>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">
                            CCCD/CMND số:{' '}
                            <span className="font-bold">
                                {formData.cccdNumber || '..........................'}
                            </span>
                        </p>
                        <p className="flex-1">
                            Cấp ngày:{' '}
                            {formData.cccdDate
                                ? new Date(formData.cccdDate).toLocaleDateString('vi-VN')
                                : '....................'}
                        </p>
                    </div>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">
                            Nơi cấp: {formData.cccdPlace || '........................................'}
                        </p>
                        <p className="flex-1">
                            Giấy phép lái xe:{' '}
                            <span className="font-bold">
                                {formData.licenseNumber || '..........................'}
                            </span>
                        </p>
                    </div>
                    {(formData.guarantorName || formData.guarantorPhone) && (
                        <p className="mt-0.5">
                            Người bảo lãnh / Liên hệ khẩn cấp: Ông/Bà{' '}
                            <span className="font-bold">{formData.guarantorName || '....................'}</span>. Quan hệ:{' '}
                            {formData.guarantorRelation || '.........'} - Số điện thoại:{' '}
                            <span className="font-bold">{formData.guarantorPhone || '....................'}</span>.
                        </p>
                    )}
                </div>

                <p className="italic text-[12.5pt] mb-2">
                    Sau khi thỏa thuận, hai bên đồng ý ký kết Hợp đồng thuê xe với các điều khoản sau:
                </p>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">
                        ĐIỀU 1: THÔNG TIN TÀI SẢN CHO THUÊ
                    </p>
                    <p>
                        Bên A đồng ý cho Bên B thuê 01 chiếc xe ô tô mang biển kiểm soát:{' '}
                        <span className="font-bold text-[13.5pt] border border-black/40 px-2 py-0.5 ml-1 inline-block rounded">
                            {formData.carPlate || '....................'}
                        </span>
                        .
                    </p>
                    <p className="text-justify leading-normal">
                        Xe được trang bị đầy đủ thiết bị an toàn và hệ thống giám sát hành trình. Bên B cam kết không tự ý tháo dỡ, can thiệp vào hệ thống này trong suốt quá trình thuê xe.
                    </p>
                </div>

                <div className="space-y-0.5 mb-1.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">
                        ĐIỀU 2: THỜI GIAN VÀ GIÁ THUÊ XE
                    </p>
                    <ul className="list-disc pl-6 space-y-0.5">
                        <li>
                            Thời gian bắt đầu thuê:{' '}
                            {formData.rentStartDate
                                ? new Date(formData.rentStartDate).toLocaleString('vi-VN')
                                : '............................................................'}
                        </li>
                        <li>
                            Thời gian dự kiến trả xe:{' '}
                            {formData.rentEndDate
                                ? new Date(formData.rentEndDate).toLocaleString('vi-VN')
                                : '............................................................'}
                            {rentalSummary.days > 0 && (
                                <span className="font-bold"> ({rentalSummary.days} ngày)</span>
                            )}
                        </li>
                        <li>
                            Đơn giá thuê: <span className="font-bold">{formatVND(formData.rentPrice)}</span> VNĐ / ngày.
                        </li>
                        {rentalSummary.totalRental > 0 && (
                            <li>
                                Tổng tiền thuê xe dự kiến:{' '}
                                <span className="font-bold">{formatVND(rentalSummary.totalRental)}</span> VNĐ.
                            </li>
                        )}
                        <li>
                            Tiền đặt cọc / Tài sản thế chấp:{' '}
                            <span className="font-bold">{formatVND(formData.depositAmount)}</span> VNĐ. Bên A sẽ hoàn trả lại cho Bên B sau khi thanh lý hợp đồng và trừ đi các khoản phạt vi phạm giao thông nếu có phát sinh.
                        </li>
                    </ul>
                </div>
            </div>

            {/* TRANG 2 */}
            <div className="contract-page page-2 bg-white mx-auto shadow-xl p-[15mm_18mm] w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:min-h-0 print:shadow-none print:p-0 print:m-0 print:block">
                <div className="space-y-0.5 mb-3 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">
                        ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN
                    </p>
                    <p className="font-bold text-[13pt] mt-0.5">3.1. Nghĩa vụ của Bên A:</p>
                    <ul className="list-disc pl-6 space-y-0.5 text-justify">
                        <li>Giao xe đúng chất lượng, đúng thời gian và địa điểm đã thỏa thuận.</li>
                        <li>
                            Cung cấp đầy đủ giấy tờ pháp lý của xe - bản sao y có công chứng hoặc bản gốc tùy thỏa thuận.
                        </li>
                    </ul>
                    <p className="font-bold text-[13pt] mt-1.5">3.2. Nghĩa vụ của Bên B:</p>
                    <ul className="list-disc pl-6 space-y-0.5 text-justify">
                        <li>Thanh toán đầy đủ tiền thuê xe và tiền cọc cho Bên A.</li>
                        <li>
                            Tự chịu trách nhiệm dân sự, hình sự và chi phí phạt nguội về các vi phạm giao thông phát sinh trong thời gian thuê.
                        </li>
                        <li>
                            Không sử dụng xe vào mục đích cầm cố, thế chấp, chạy xe công nghệ hoặc vi phạm pháp luật.
                        </li>
                    </ul>
                </div>

                {formData.requireInvoice ? (
                    <div className="space-y-0.5 mb-3 avoid-break">
                        <p className="font-bold uppercase text-[13pt] mb-0.5">
                            ĐIỀU 4: THÔNG TIN XUẤT HÓA ĐƠN VAT
                        </p>
                        <p>Bên A thực hiện xuất hóa đơn GTGT cho Bên B theo thông tin sau:</p>
                        <ul className="list-disc pl-6 space-y-0.5">
                            <li>
                                Tên đơn vị: <span className="font-bold">{formData.companyName}</span>
                            </li>
                            <li>
                                Mã số thuế: <span className="font-bold">{formData.taxCode}</span>
                            </li>
                            <li>Địa chỉ: {formData.companyAddress}</li>
                        </ul>
                    </div>
                ) : (
                    <div className="space-y-0.5 mb-3 avoid-break">
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 4: THÔNG TIN HÓA ĐƠN VAT</p>
                        <p className="text-justify leading-normal">
                            Hợp đồng này không yêu cầu xuất hóa đơn GTGT. Nếu Bên B có nhu cầu xuất hóa đơn phát sinh sau thời điểm ký kết, Bên B phải thông báo cho Bên A trước khi bàn giao xe và thanh toán bổ sung thuế GTGT theo quy định của pháp luật.
                        </p>
                    </div>
                )}

                <div className="space-y-0.5 mb-4 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 5: CAM KẾT CHUNG</p>
                    <p className="text-justify leading-normal">
                        Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Hợp đồng được lập thành 02 bản, mỗi bên giữ 01 bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.
                    </p>
                </div>

                <div className="grid grid-cols-2 text-center mt-5 gap-6 avoid-break pb-4">
                    <div>
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐẠI DIỆN BÊN A</p>
                        <p className="italic text-[11.5pt] mb-14">Ký, đóng dấu, ghi rõ họ tên</p>
                        <p className="font-bold uppercase text-[13pt]">{formData.partyARepresentative}</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐẠI DIỆN BÊN B</p>
                        <p className="italic text-[11.5pt] mb-1">Ký, ghi rõ họ tên</p>
                        <div className="h-14 flex items-center justify-center mb-1">
                            {signatureData ? (
                                <img
                                    src={signatureData}
                                    alt="Chữ ký bên B"
                                    className="max-h-full max-w-full mix-blend-multiply object-contain"
                                />
                            ) : (
                                <div className="w-full h-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-sans text-xs no-print">
                                    Khu vực Ký tên
                                </div>
                            )}
                        </div>
                        <p className="font-bold uppercase text-[13pt]">
                            {formData.renterName || '........................................'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default function CreateContract() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const draftId = location.state?.draftId as string | undefined;

    const tenantId =
        localStorage.getItem('tenantId') ||
        sessionStorage.getItem('tenantId') ||
        'COMPANY_A';
    const draftKey = 'sys_contract_drafts';

    const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>(PRESET_VEHICLES);
    const [standardVehiclePrice, setStandardVehiclePrice] = useState<number>(0);
    const [priceChangeReason, setPriceChangeReason] = useState<string>('');
    const [isPartyAExpanded, setIsPartyAExpanded] = useState<boolean>(false);

    const [formData, setFormData] = useState<ContractFormData>({
        id: draftId || `HD-NHAP-${Date.now()}`,
        partyAName: 'Công ty TNHH Vận tải & DVDL DriveLinker',
        partyAAddress: '120 Hoàng Minh Thảo, Phường Hòa Khánh, TP Đà Nẵng',
        partyAPhone: '0977737475',
        partyARepresentative: 'Nguyễn Văn Quản Lý',
        partyARole: 'Giám đốc',

        renterName: '',
        renterPhone: '',
        renterAddress: '',

        carPlate: '',
        rentStartDate: '',
        rentEndDate: '',
        rentPrice: '',
        depositAmount: '',

        cccdNumber: '',
        cccdDate: '',
        cccdPlace: '',
        licenseNumber: '',

        guarantorName: '',
        guarantorPhone: '',
        guarantorRelation: '',

        requireInvoice: false,
        taxCode: '',
        companyName: '',
        companyAddress: ''
    });

    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
    const [error, setError] = useState('');
    const [phoneHint, setPhoneHint] = useState<{ field: string; message: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);

    const topContainerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const formRef = useRef(formData);
    const hasUserEditedRef = useRef(false);

    const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

    // 1. Nạp danh sách xe từ kho + kết hợp sẵn các xe gợi ý để luôn có lựa chọn
    useEffect(() => {
        try {
            const storageKey = `sys_vehicles_${tenantId}`;
            const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const globalStored = JSON.parse(localStorage.getItem('sys_vehicles') || '[]');
            const sourceList =
                Array.isArray(stored) && stored.length > 0
                    ? stored
                    : Array.isArray(globalStored) && globalStored.length > 0
                    ? globalStored
                    : [];

            if (sourceList.length > 0) {
                const mapped: VehicleOption[] = sourceList.map((v: any, idx: number) => ({
                    id: v.id || `VEH-${idx}`,
                    plate: String(v.plate || v.carPlate || v.licensePlate || `XE-${idx + 1}`).toUpperCase(),
                    model: v.model || v.name || v.vehicleName || '',
                    dailyRate: Number(v.price || v.dailyRate || 0),
                    status: v.status || 'AVAILABLE'
                }));

                const freeList = mapped.filter(
                    (v) =>
                        !v.status ||
                        v.status === 'AVAILABLE' ||
                        v.status === 'Rảnh' ||
                        v.status === 'Sẵn sàng'
                );

                setAvailableVehicles(freeList.length > 0 ? freeList : mapped);
            } else {
                setAvailableVehicles(PRESET_VEHICLES);
            }
        } catch (e) {
            console.error('Lỗi tải danh sách xe:', e);
            setAvailableVehicles(PRESET_VEHICLES);
        }
    }, [tenantId]);

    // 2. Khôi phục bản nháp nếu có (đồng thời chuẩn hóa lại SĐT/CCCD về dạng chỉ chứa số)
    useEffect(() => {
        if (!draftId) return;
        try {
            const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
            const draft = drafts.find((item: any) => item.id === draftId);
            if (draft && draft.formData) {
                const restored = draft.formData;
                setFormData((prev) => ({
                    ...prev,
                    ...restored,
                    partyAPhone: sanitizeDigits(restored.partyAPhone || prev.partyAPhone, 10),
                    renterPhone: sanitizeDigits(restored.renterPhone || '', 10),
                    guarantorPhone: sanitizeDigits(restored.guarantorPhone || '', 10),
                    cccdNumber: sanitizeDigits(restored.cccdNumber || '', 12),
                    taxCode: sanitizeDigits(restored.taxCode || '', 13)
                }));
                setSignatureData(draft.signatureData || null);
                setSaveStatus('SAVED');
            }
        } catch (err) {
            console.error('Lỗi khôi phục bản nháp:', err);
        }
    }, [draftId]);

    useEffect(() => {
        formRef.current = formData;
    }, [formData]);

    // 3. Tự động lưu nháp khi có thay đổi
    const saveDraftToStorage = useCallback(() => {
        if (isSuccess) return;
        const currentData = formRef.current;
        try {
            const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
            const draftPayload = {
                id: currentData.id,
                tenantId,
                formData: currentData,
                signatureData,
                lastModified: new Date().toISOString()
            };

            const index = drafts.findIndex((item: any) => item.id === currentData.id);
            if (index >= 0) {
                drafts[index] = draftPayload;
            } else {
                drafts.unshift(draftPayload);
            }
            localStorage.setItem(draftKey, JSON.stringify(drafts));
        } catch (err) {
            console.warn('Không thể lưu bản nháp vào localStorage:', err);
        }
    }, [tenantId, signatureData, isSuccess]);

    useEffect(() => {
        if (!hasUserEditedRef.current || isSuccess) return;

        setSaveStatus('SAVING');
        const timer = window.setTimeout(() => {
            saveDraftToStorage();
            setSaveStatus('SAVED');
        }, 1200);

        return () => window.clearTimeout(timer);
    }, [formData, signatureData, saveDraftToStorage, isSuccess]);

    const handleManualSave = () => {
        saveDraftToStorage();
        navigate('/partners');
    };

    // 4. Tính toán thời gian thuê & tổng chi phí tự động
    const rentalSummary = useMemo<RentalSummary>(() => {
        const dailyRate = Number(formData.rentPrice) || 0;
        const deposit = Number(formData.depositAmount) || 0;

        if (!formData.rentStartDate || !formData.rentEndDate) {
            return {
                isValidRange: true,
                days: 0,
                hours: 0,
                dailyRate,
                deposit,
                totalRental: 0,
                grandTotal: deposit
            };
        }

        const startMs = new Date(formData.rentStartDate).getTime();
        const endMs = new Date(formData.rentEndDate).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
            return {
                isValidRange: false,
                days: 0,
                hours: 0,
                dailyRate,
                deposit,
                totalRental: 0,
                grandTotal: deposit
            };
        }

        const diffHours = (endMs - startMs) / (1000 * 60 * 60);
        const days = Math.max(1, Math.ceil(diffHours / 24));
        const totalRental = days * dailyRate;

        return {
            isValidRange: true,
            days,
            hours: Math.round(diffHours),
            dailyRate,
            deposit,
            totalRental,
            grandTotal: totalRental + deposit
        };
    }, [formData.rentStartDate, formData.rentEndDate, formData.rentPrice, formData.depositAmount]);

    const hasCustomPriceDiff = useMemo(() => {
        const currentPrice = Number(formData.rentPrice) || 0;
        return standardVehiclePrice > 0 && currentPrice > 0 && currentPrice !== standardVehiclePrice;
    }, [formData.rentPrice, standardVehiclePrice]);

    // Chọn nhanh từ danh sách xe gợi ý
    const handleSelectPresetVehicle = (vehicle: VehicleOption) => {
        hasUserEditedRef.current = true;
        if (error) setError('');
        setStandardVehiclePrice(vehicle.dailyRate || 0);
        setPriceChangeReason('');
        setFormData((prev) => ({
            ...prev,
            carPlate: vehicle.plate,
            rentPrice: vehicle.dailyRate > 0 ? String(vehicle.dailyRate) : prev.rentPrice
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        // 1. Điều kiện Số điện thoại: chỉ nhận số, bắt đầu bằng số 0, tối đa 10 chữ số
        if (name === 'renterPhone' || name === 'guarantorPhone' || name === 'partyAPhone') {
            const digitsOnly = sanitizeDigits(value, 10);
            if (digitsOnly.length > 0 && digitsOnly[0] !== '0') {
                setPhoneHint({
                    field: name,
                    message:
                        language === 'vi'
                            ? 'Số điện thoại phải bắt đầu bằng số 0.'
                            : 'Phone number must start with 0.'
                });
                return;
            }
            setPhoneHint(null);
            hasUserEditedRef.current = true;
            if (error) setError('');
            setFormData((prev) => ({
                ...prev,
                [name]: digitsOnly
            }));
            return;
        }

        // 2. Điều kiện CCCD gắn chip: chỉ nhận số, tối đa 12 chữ số
        if (name === 'cccdNumber') {
            const cccdDigits = sanitizeDigits(value, 12);
            hasUserEditedRef.current = true;
            if (error) setError('');
            setFormData((prev) => ({
                ...prev,
                cccdNumber: cccdDigits
            }));
            return;
        }

        // 3. Điều kiện Mã số thuế VAT: chỉ nhận số, tối đa 13 chữ số
        if (name === 'taxCode') {
            const taxDigits = sanitizeDigits(value, 13);
            hasUserEditedRef.current = true;
            if (error) setError('');
            setFormData((prev) => ({
                ...prev,
                taxCode: taxDigits
            }));
            return;
        }

        // 4. Điều kiện Họ tên & Chức vụ: loại bỏ chữ số và ký tự đặc biệt
        if (
            name === 'renterName' ||
            name === 'guarantorName' ||
            name === 'partyARepresentative' ||
            name === 'partyARole' ||
            name === 'guarantorRelation'
        ) {
            const cleanText = sanitizePersonName(value);
            hasUserEditedRef.current = true;
            if (error) setError('');
            setFormData((prev) => ({
                ...prev,
                [name]: cleanText
            }));
            return;
        }

        // 5. Điều kiện Giấy phép lái xe: chỉ cho phép chữ cái, số, dấu cách, gạch ngang và dấu phẩy
        if (name === 'licenseNumber') {
            const cleanLicense = value.replace(/[^a-zA-ZÀ-ỹ0-9\s,.-]/g, '').slice(0, 30);
            hasUserEditedRef.current = true;
            if (error) setError('');
            setFormData((prev) => ({
                ...prev,
                licenseNumber: cleanLicense
            }));
            return;
        }

        hasUserEditedRef.current = true;
        if (error) setError('');

        // 6. Điều kiện Biển số xe: tự động in hoa, chỉ nhận chữ, số, dấu gạch ngang & dấu chấm
        if (name === 'carPlate') {
            const normalizedPlate = value
                .toUpperCase()
                .replace(/[^A-Z0-9.-]/g, '')
                .slice(0, 12);

            const matchedVehicle = availableVehicles.find(
                (v) => v.plate.toUpperCase() === normalizedPlate.trim()
            );

            if (matchedVehicle) {
                setStandardVehiclePrice(matchedVehicle.dailyRate || 0);
                setPriceChangeReason('');
                setFormData((prev) => ({
                    ...prev,
                    carPlate: normalizedPlate,
                    rentPrice:
                        matchedVehicle.dailyRate > 0
                            ? String(matchedVehicle.dailyRate)
                            : prev.rentPrice
                }));
            } else {
                setStandardVehiclePrice(0);
                setPriceChangeReason('');
                setFormData((prev) => ({
                    ...prev,
                    carPlate: normalizedPlate
                }));
            }
            return;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const rawValue = sanitizeDigits(value, 12);
        hasUserEditedRef.current = true;
        if (error) setError('');
        setFormData((prev) => ({
            ...prev,
            [name]: rawValue
        }));
    };

    // Xử lý Canvas chữ ký điện tử
    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(
            (e.clientX - rect.left) * (canvas.width / rect.width),
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );
        setIsDrawing(true);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(
            (e.clientX - rect.left) * (canvas.width / rect.width),
            (e.clientY - rect.top) * (canvas.height / rect.height)
        );
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearSignature = () => {
        const canvas = canvasRef.current;
        canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
    };

    const saveSignature = () => {
        hasUserEditedRef.current = true;
        setSignatureData(canvasRef.current?.toDataURL('image/png') || null);
        setIsSigning(false);
    };

    useEffect(() => {
        if (isSigning && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#000000';
            }
        }
    }, [isSigning]);

    const failValidation = (message: string) => {
        setError(message);
        topContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
    };

    // Kiểm tra toàn bộ điều kiện trước khi cho phép xem/ký/phát hành hợp đồng
    const validateForm = () => {
        // 1. Kiểm tra Bên Cho Thuê (Bên A)
        if (!formData.partyAName.trim() || formData.partyAName.trim().length < 2) {
            setIsPartyAExpanded(true);
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng nhập đầy đủ tên tổ chức / cá nhân Bên Cho Thuê.'
                    : 'Please enter the lessor organization or individual name.'
            );
        }
        if (!PHONE_REGEX.test(formData.partyAPhone)) {
            setIsPartyAExpanded(true);
            return failValidation(
                language === 'vi'
                    ? 'Số điện thoại Bên Cho Thuê phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'
                    : 'Lessor phone number must be 10 digits starting with 0.'
            );
        }

        // 2. Kiểm tra Khách Thuê (Bên B)
        if (!formData.renterName.trim() || formData.renterName.trim().length < 2) {
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng nhập đầy đủ họ và tên khách thuê xe (tối thiểu 2 ký tự).'
                    : 'Please enter the renter full name (at least 2 characters).'
            );
        }
        if (!PHONE_REGEX.test(formData.renterPhone)) {
            return failValidation(
                language === 'vi'
                    ? 'Số điện thoại khách thuê phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'
                    : 'Renter phone number must be 10 digits starting with 0.'
            );
        }

        // 3. Kiểm tra Người bảo lãnh / Liên hệ khẩn cấp (nếu có nhập 1 trong 2 ô thì phải nhập đủ & đúng)
        const hasGuarantorName = formData.guarantorName.trim().length > 0;
        const hasGuarantorPhone = formData.guarantorPhone.length > 0;

        if (hasGuarantorName && formData.guarantorName.trim().length < 2) {
            return failValidation(
                language === 'vi'
                    ? 'Họ tên người bảo lãnh phải có tối thiểu 2 ký tự.'
                    : 'Guarantor name must be at least 2 characters.'
            );
        }
        if (hasGuarantorName && !hasGuarantorPhone) {
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng nhập số điện thoại của người bảo lãnh.'
                    : 'Please enter the guarantor phone number.'
            );
        }
        if (hasGuarantorPhone && !hasGuarantorName) {
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng nhập họ tên người bảo lãnh đi kèm số điện thoại.'
                    : 'Please enter the guarantor name.'
            );
        }
        if (hasGuarantorPhone && !PHONE_REGEX.test(formData.guarantorPhone)) {
            return failValidation(
                language === 'vi'
                    ? 'Số điện thoại người bảo lãnh phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'
                    : 'Guarantor phone number must be 10 digits starting with 0.'
            );
        }
        if (hasGuarantorPhone && formData.guarantorPhone === formData.renterPhone) {
            return failValidation(
                language === 'vi'
                    ? 'Số điện thoại người bảo lãnh không được trùng với số điện thoại khách thuê.'
                    : 'Guarantor phone number cannot be the same as renter phone number.'
            );
        }

        // 4. Kiểm tra Giấy tờ Pháp lý (CCCD gắn chip 12 số & Ngày cấp hợp lệ)
        if (!CCCD_REGEX.test(formData.cccdNumber)) {
            return failValidation(
                language === 'vi'
                    ? 'Số CCCD gắn chip bắt buộc phải gồm đúng 12 chữ số.'
                    : 'Citizen ID number must be exactly 12 digits.'
            );
        }
        if (formData.cccdDate && formData.cccdDate > todayDateStr) {
            return failValidation(
                language === 'vi'
                    ? 'Ngày cấp CCCD không được lớn hơn ngày hiện tại.'
                    : 'ID issue date cannot be in the future.'
            );
        }

        // 5. Kiểm tra Biển số xe, Thời gian thuê & Đơn giá
        const cleanPlate = formData.carPlate.trim();
        if (!cleanPlate) {
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng chọn hoặc nhập biển số xe thuê.'
                    : 'Please select or enter a vehicle license plate.'
            );
        }
        if (!PLATE_REGEX.test(cleanPlate)) {
            return failValidation(
                language === 'vi'
                    ? 'Biển số xe chưa đúng định dạng (VD: 43A-682.19 hoặc 51H-12345).'
                    : 'Invalid license plate format (e.g. 43A-682.19).'
            );
        }
        if (!formData.rentStartDate || !formData.rentEndDate) {
            return failValidation(
                language === 'vi'
                    ? 'Vui lòng chọn đầy đủ thời gian giao xe và thời gian trả xe.'
                    : 'Please select both pickup and return date/time.'
            );
        }
        if (!rentalSummary.isValidRange) {
            return failValidation(
                language === 'vi'
                    ? 'Thời gian trả xe phải sau thời gian giao xe.'
                    : 'Return date/time must be after pickup date/time.'
            );
        }
        if (!formData.rentPrice || Number(formData.rentPrice) <= 0) {
            return failValidation(
                language === 'vi'
                    ? 'Đơn giá thuê xe bắt buộc phải lớn hơn 0 VNĐ.'
                    : 'Daily rental rate must be greater than 0 VND.'
            );
        }

        // 6. Kiểm tra Hóa đơn VAT (nếu bật yêu cầu xuất hóa đơn)
        if (formData.requireInvoice) {
            if (!TAX_CODE_REGEX.test(formData.taxCode)) {
                return failValidation(
                    language === 'vi'
                        ? 'Mã số thuế doanh nghiệp phải gồm đúng 10 hoặc 13 chữ số.'
                        : 'Tax ID must be 10 or 13 digits.'
                );
            }
            if (!formData.companyName.trim() || formData.companyName.trim().length < 2) {
                return failValidation(
                    language === 'vi'
                        ? 'Vui lòng nhập đầy đủ Tên đơn vị / Công ty xuất hóa đơn VAT.'
                        : 'Please enter the company name for VAT invoice.'
                );
            }
            if (!formData.companyAddress.trim() || formData.companyAddress.trim().length < 5) {
                return failValidation(
                    language === 'vi'
                        ? 'Vui lòng nhập đầy đủ Địa chỉ xuất hóa đơn VAT.'
                        : 'Please enter the company address for VAT invoice.'
                );
            }
        }

        setError('');
        return true;
    };

    const handleDownloadPDF = () => {
        if (!validateForm()) return;
        const originalTitle = document.title;
        const safeName = formData.renterName.trim().replace(/\s+/g, '_') || 'KhachHang';
        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        document.title = `HopDong_${formData.id}_${safeName}_${dateStr}`;

        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    };

    const handleFinalizeContract = async () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const enteredPrice = Number(formData.rentPrice) || 0;
            const cleanPlate = formData.carPlate.trim().toUpperCase();
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    await contractService.create({
                        customerId: 1,
                        vehicleId: 1,
                        startTime: formData.rentStartDate
                            ? new Date(formData.rentStartDate).toISOString()
                            : new Date().toISOString(),
                        endTime: formData.rentEndDate
                            ? new Date(formData.rentEndDate).toISOString()
                            : new Date(Date.now() + 86400000 * 3).toISOString(),
                        price: enteredPrice || 1000000,
                        depositAmount: Number(formData.depositAmount) || 0,
                        notes: `Hợp đồng thuê xe ${cleanPlate || 'tự lái'} - Khách: ${formData.renterName}`
                    });
                } catch (beErr) {
                    console.warn('Lỗi ghi nhận hợp đồng Backend:', beErr);
                }
            }

            const contractId = `HD-${Date.now().toString().slice(-6)}`;
            const basePriceForContract = hasCustomPriceDiff ? standardVehiclePrice : enteredPrice;

            const newContract = {
                id: contractId,
                tenantId,
                type: signatureData ? 'E_CONTRACT' : 'HARDCOPY',
                partnerName: formData.renterName.trim(),
                partnerPhone: formData.renterPhone,
                cccdNumber: formData.cccdNumber,
                hasInvoice: formData.requireInvoice,
                taxCode: formData.taxCode,
                price: basePriceForContract,
                rentPrice: String(basePriceForContract),
                value: `${basePriceForContract.toLocaleString('vi-VN')} VNĐ`,
                totalRentalAmount: rentalSummary.totalRental,
                rentalDays: rentalSummary.days,
                hasPendingRequest: hasCustomPriceDiff,
                date: new Date().toLocaleDateString('vi-VN'),
                status: 'ACTIVE',
                signature: signatureData,
                partyA: { ...formData },
                contractData: { ...formData, carPlate: cleanPlate },
                rentStartDate: formData.rentStartDate,
                rentEndDate: formData.rentEndDate,
                carPlate: cleanPlate,
                depositAmount: formData.depositAmount
            };

            const existingContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
            existingContracts.unshift(newContract);
            localStorage.setItem('sys_e_contracts', JSON.stringify(existingContracts));

            if (hasCustomPriceDiff) {
                const existingPriceReqs = JSON.parse(
                    localStorage.getItem('sys_price_requests') || '[]'
                );
                const staffName =
                    sessionStorage.getItem('sys_staff_name') ||
                    localStorage.getItem('userName') ||
                    'Nhân viên kinh doanh';

                existingPriceReqs.unshift({
                    id: `PR-${Date.now().toString().slice(-6)}`,
                    tenantId,
                    contractId,
                    staff: staffName,
                    reason:
                        priceChangeReason.trim() ||
                        `Đề xuất điều chỉnh đơn giá xe ${cleanPlate} cho khách ${formData.renterName}`,
                    suggestedPrice: enteredPrice,
                    status: 'PENDING',
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem('sys_price_requests', JSON.stringify(existingPriceReqs));
            }

            if (cleanPlate) {
                try {
                    vehicleService.updateVehicleStatus(
                        tenantId,
                        cleanPlate,
                        'RENTED',
                        `Đã ký hợp đồng ${contractId} (Khách: ${formData.renterName})`
                    );
                } catch (vErr) {
                    console.warn('Lỗi đồng bộ xe sang RENTED:', vErr);
                }
            }

            const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
            localStorage.setItem(
                draftKey,
                JSON.stringify(drafts.filter((item: any) => item.id !== formData.id))
            );

            window.dispatchEvent(new Event('storage'));
            setIsSaving(false);
            setIsContractModalOpen(false);
            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            failValidation(
                language === 'vi' ? 'Lỗi khi phát hành hợp đồng.' : 'Error finalizing contract.'
            );
            setIsSaving(false);
        }
    };

    const isRenterPhoneInvalid =
        formData.renterPhone.length > 0 && !PHONE_REGEX.test(formData.renterPhone);
    const isGuarantorPhoneInvalid =
        formData.guarantorPhone.length > 0 && !PHONE_REGEX.test(formData.guarantorPhone);
    const isPartyAPhoneInvalid =
        formData.partyAPhone.length > 0 && !PHONE_REGEX.test(formData.partyAPhone);
    const isCccdInvalid =
        formData.cccdNumber.length > 0 && !CCCD_REGEX.test(formData.cccdNumber);
    const isTaxCodeInvalid =
        formData.requireInvoice &&
        formData.taxCode.length > 0 &&
        !TAX_CODE_REGEX.test(formData.taxCode);

    return (
        <div
            ref={topContainerRef}
            className="flex-1 overflow-auto bg-[#F8FAFC] p-6 pb-28 relative h-full"
        >
            <style>{`
                @media screen {
                    #print-portal-mount { display: none !important; }
                }

                @media print {
                    #root { display: none !important; }
                    
                    #print-portal-mount { 
                        display: block !important; 
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                    }

                    html, body {
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    @page { 
                        size: A4 portrait; 
                        margin: 12mm 18mm; 
                    }
                    
                    .contract-page.page-1 {
                        page-break-after: always !important;
                        break-after: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .contract-page.page-2 {
                        page-break-before: always !important;
                        break-before: page !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {createPortal(
                <div id="print-portal-mount">
                    <ContractPaperTemplate
                        formData={formData}
                        signatureData={signatureData}
                        rentalSummary={rentalSummary}
                    />
                </div>,
                document.body
            )}

            {isSuccess ? (
                <div className="no-print flex flex-col items-center justify-center min-h-[70vh] animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5 shadow-sm">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                        {language === 'vi'
                            ? 'Ký kết Hợp đồng Thành công!'
                            : 'Contract Signed Successfully!'}
                    </h2>
                    <p className="text-sm text-slate-500 mb-6 max-w-md text-center">
                        {language === 'vi'
                            ? 'Hợp đồng của khách hàng '
                            : 'Contract for customer '}
                        <strong className="text-slate-800">{formData.renterName}</strong>
                        {language === 'vi'
                            ? ' đã được lưu và cập nhật trạng thái xe.'
                            : ' has been saved and vehicle status updated.'}
                    </p>
                    {hasCustomPriceDiff && (
                        <div className="mb-6 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                            {language === 'vi'
                                ? 'Yêu cầu điều chỉnh đơn giá đã được gửi sang mục Duyệt đơn giá.'
                                : 'Price adjustment request has been sent to Price Approvals.'}
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                            onClick={() => setIsContractModalOpen(true)}
                            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <FileText className="w-4 h-4" />{' '}
                            {language === 'vi' ? 'Xem Hợp đồng' : 'View Contract'}
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            <Download className="w-4 h-4" />{' '}
                            {language === 'vi' ? 'Xuất PDF / In' : 'Export PDF / Print'}
                        </button>
                        <button
                            onClick={() => navigate('/partners')}
                            className="px-5 py-2.5 bg-[#0EA5E9] hover:bg-sky-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            <List className="w-4 h-4" />{' '}
                            {language === 'vi' ? 'Về Quản lý' : 'Back to Contracts'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="no-print space-y-5 max-w-7xl mx-auto">
                    {/* Header trang */}
                    <div className="flex flex-wrap justify-between items-end gap-4">
                        <div>
                            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                <span
                                    onClick={() => navigate('/partners')}
                                    className="hover:text-slate-800 cursor-pointer transition-colors"
                                >
                                    MENU
                                </span>
                                <ChevronLeft className="w-3 h-3 mx-1" />
                                <span className="text-sky-600">
                                    {t('createContract.breadcrumbCreate')}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                {t('createContract.title')}
                            </h2>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1.5">
                                {saveStatus === 'SAVING' && (
                                    <span className="flex items-center gap-1 text-sky-600">
                                        <Loader2 className="w-3 h-3 animate-spin" />{' '}
                                        {language === 'vi'
                                            ? 'Đang tự động lưu...'
                                            : 'Auto-saving...'}
                                    </span>
                                )}
                                {saveStatus === 'SAVED' && (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                        <CheckCircle2 className="w-3 h-3" />{' '}
                                        {language === 'vi' ? 'Đã lưu bản nháp' : 'Draft saved'}
                                    </span>
                                )}
                                {saveStatus === 'IDLE' && (
                                    <span>
                                        {language === 'vi'
                                            ? 'Tự động lưu khi bạn nhập thông tin'
                                            : 'Auto-saves as you type'}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleManualSave}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                        >
                            <Save className="w-4 h-4" /> {t('createContract.saveDraftBtn')}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* KHỐI BÊN CHO THUÊ (BÊN A) */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsPartyAExpanded((prev) => !prev)}
                            className="w-full px-6 py-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="text-sm font-bold text-slate-800">
                                    {t('createContract.partyA')}
                                </span>
                                <span className="text-xs text-slate-500">
                                    • {formData.partyAName} ({formData.partyARepresentative} -{' '}
                                    {formData.partyAPhone})
                                </span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 shrink-0">
                                {isPartyAExpanded
                                    ? language === 'vi'
                                        ? 'Thu gọn'
                                        : 'Collapse'
                                    : language === 'vi'
                                    ? 'Chỉnh sửa'
                                    : 'Edit'}
                                {isPartyAExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </span>
                        </button>

                        {isPartyAExpanded && (
                            <div className="px-6 pb-5 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {language === 'vi'
                                            ? 'Tên tổ chức / Cá nhân'
                                            : 'Organization / Individual Name'}{' '}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        name="partyAName"
                                        value={formData.partyAName}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {cleanLabel(t('createContract.renterPhone'))}{' '}
                                        <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={10}
                                        name="partyAPhone"
                                        value={formData.partyAPhone}
                                        onChange={handleChange}
                                        placeholder="0977737475"
                                        className={`w-full px-3 py-2 border rounded-lg text-sm outline-none font-mono ${
                                            isPartyAPhoneInvalid || phoneHint?.field === 'partyAPhone'
                                                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                                                : 'border-slate-300 focus:border-sky-500'
                                        }`}
                                    />
                                    {(isPartyAPhoneInvalid || phoneHint?.field === 'partyAPhone') && (
                                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                            {phoneHint?.field === 'partyAPhone'
                                                ? phoneHint.message
                                                : `Nhập đủ 10 số bắt đầu bằng 0 (${formData.partyAPhone.length}/10)`}
                                        </p>
                                    )}
                                </div>
                                <div className="lg:col-span-3">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {language === 'vi'
                                            ? 'Địa chỉ trụ sở'
                                            : 'Headquarters Address'}
                                    </label>
                                    <input
                                        name="partyAAddress"
                                        value={formData.partyAAddress}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {language === 'vi' ? 'Người đại diện' : 'Representative'}
                                    </label>
                                    <input
                                        name="partyARepresentative"
                                        value={formData.partyARepresentative}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">
                                        {language === 'vi' ? 'Chức vụ' : 'Position / Title'}
                                    </label>
                                    <input
                                        name="partyARole"
                                        value={formData.partyARole}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NỘI DUNG NHẬP LIỆU CHÍNH */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-6">
                            {/* Bên Thuê Xe */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs">
                                        <User className="w-3.5 h-3.5" />
                                    </span>
                                    {t('createContract.partyB')}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.renterName'))}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="renterName"
                                            value={formData.renterName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-sky-500 uppercase"
                                            placeholder="NGUYỄN VĂN A"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.renterPhone'))}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            name="renterPhone"
                                            value={formData.renterPhone}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none font-mono ${
                                                isRenterPhoneInvalid ||
                                                phoneHint?.field === 'renterPhone'
                                                    ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                                                    : 'border-slate-300 focus:border-sky-500'
                                            }`}
                                            placeholder="0901234567"
                                        />
                                        {(isRenterPhoneInvalid ||
                                            phoneHint?.field === 'renterPhone') && (
                                            <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                                {phoneHint?.field === 'renterPhone'
                                                    ? phoneHint.message
                                                    : `Nhập đủ 10 số bắt đầu bằng 0 (${formData.renterPhone.length}/10)`}
                                            </p>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {t('createContract.renterAddress')}
                                        </label>
                                        <div className="relative">
                                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                name="renterAddress"
                                                value={formData.renterAddress}
                                                onChange={handleChange}
                                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-sky-500"
                                                placeholder="Số nhà, Đường, Phường/Xã, Quận/Huyện..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-xs font-bold text-rose-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                    <Users className="w-4 h-4" />{' '}
                                    {t('createContract.formGuarantor')}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-rose-50/50 p-4 rounded-lg border border-rose-100">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            {t('createContract.guarantorName')}
                                        </label>
                                        <input
                                            type="text"
                                            name="guarantorName"
                                            value={formData.guarantorName}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-rose-500"
                                            placeholder="VD: Trần Thị B"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            {t('createContract.guarantorRelation')}
                                        </label>
                                        <input
                                            type="text"
                                            name="guarantorRelation"
                                            value={formData.guarantorRelation}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-rose-500"
                                            placeholder="Vợ/Chồng, Bố/Mẹ..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.guarantorPhone'))}
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={10}
                                            name="guarantorPhone"
                                            value={formData.guarantorPhone}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border bg-white rounded-lg text-sm outline-none font-mono text-rose-700 ${
                                                isGuarantorPhoneInvalid ||
                                                phoneHint?.field === 'guarantorPhone'
                                                    ? 'border-rose-400 focus:border-rose-500'
                                                    : 'border-rose-200 focus:border-rose-500'
                                            }`}
                                            placeholder="0981234567"
                                        />
                                        {(isGuarantorPhoneInvalid ||
                                            phoneHint?.field === 'guarantorPhone') && (
                                            <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                                {phoneHint?.field === 'guarantorPhone'
                                                    ? phoneHint.message
                                                    : `Nhập đủ 10 số bắt đầu bằng 0 (${formData.guarantorPhone.length}/10)`}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chi tiết Giao dịch Thuê xe */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                                        <Car className="w-3.5 h-3.5" />
                                    </span>
                                    {t('createContract.tradeDetails')}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.carPlate'))}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="carPlate"
                                            list="car-plate-options"
                                            maxLength={12}
                                            value={formData.carPlate}
                                            onChange={handleChange}
                                            placeholder={
                                                language === 'vi'
                                                    ? 'Nhập hoặc chọn biển số...'
                                                    : 'Type or pick plate...'
                                            }
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 font-mono uppercase bg-slate-50 focus:bg-white font-bold text-slate-800"
                                        />
                                        <datalist id="car-plate-options">
                                            {availableVehicles.map((v) => (
                                                <option key={v.id || v.plate} value={v.plate}>
                                                    {v.model
                                                        ? `${v.model} - ${v.dailyRate.toLocaleString('vi-VN')}đ/ngày`
                                                        : ''}
                                                </option>
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {t('createContract.pickupTime')}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="rentStartDate"
                                            value={formData.rentStartDate}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {t('createContract.returnTime')}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="datetime-local"
                                            name="rentEndDate"
                                            value={formData.rentEndDate}
                                            min={formData.rentStartDate || undefined}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${
                                                !rentalSummary.isValidRange
                                                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                                                    : 'border-slate-300 focus:border-emerald-500'
                                            }`}
                                        />
                                    </div>
                                </div>

                                {/* Hàng chọn nhanh biển số xe có sẵn */}
                                <div className="mb-4 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] font-semibold text-slate-400 mr-1">
                                        {language === 'vi' ? 'Gợi ý nhanh:' : 'Quick pick:'}
                                    </span>
                                    {availableVehicles.slice(0, 6).map((v) => {
                                        const isSelected =
                                            formData.carPlate.trim().toUpperCase() ===
                                            v.plate.toUpperCase();
                                        return (
                                            <button
                                                key={v.id || v.plate}
                                                type="button"
                                                onClick={() => handleSelectPresetVehicle(v)}
                                                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                                        : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200 hover:border-emerald-300'
                                                }`}
                                            >
                                                {v.plate}
                                                {v.model && (
                                                    <span
                                                        className={`font-sans ml-1 ${
                                                            isSelected
                                                                ? 'text-emerald-100'
                                                                : 'text-slate-400'
                                                        }`}
                                                    >
                                                        • {v.model}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {!rentalSummary.isValidRange && (
                                    <p className="text-xs font-semibold text-rose-600 mb-3">
                                        {language === 'vi'
                                            ? 'Giờ trả xe phải sau giờ giao xe.'
                                            : 'Return time must be later than pickup time.'}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.dailyRate'))}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600">
                                                ₫
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                name="rentPrice"
                                                value={
                                                    formData.rentPrice
                                                        ? Number(formData.rentPrice).toLocaleString(
                                                              'vi-VN'
                                                          )
                                                        : ''
                                                }
                                                onChange={handleMoneyChange}
                                                className="w-full pl-8 pr-12 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 text-emerald-700 font-bold font-mono"
                                                placeholder="800.000"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                                VNĐ
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {t('createContract.depositAmount')}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                                                ₫
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                name="depositAmount"
                                                value={
                                                    formData.depositAmount
                                                        ? Number(
                                                              formData.depositAmount
                                                          ).toLocaleString('vi-VN')
                                                        : ''
                                                }
                                                onChange={handleMoneyChange}
                                                className="w-full pl-8 pr-12 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 font-mono text-slate-700 font-bold"
                                                placeholder="15.000.000"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                                VNĐ
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {hasCustomPriceDiff && (
                                    <div className="mt-4 p-3.5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                                        <div className="flex items-start gap-2 text-xs text-amber-800 font-medium">
                                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <span>
                                                {language === 'vi'
                                                    ? `Đơn giá nhập (${Number(formData.rentPrice).toLocaleString('vi-VN')}đ) khác giá niêm yết (${standardVehiclePrice.toLocaleString('vi-VN')}đ/ngày). Yêu cầu điều chỉnh giá sẽ tự động gửi tới Manager phê duyệt.`
                                                    : `Entered rate differs from standard vehicle rate (${standardVehiclePrice.toLocaleString('vi-VN')} VND/day). An approval request will be submitted to Manager.`}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            value={priceChangeReason}
                                            onChange={(e) => setPriceChangeReason(e.target.value)}
                                            placeholder={
                                                language === 'vi'
                                                    ? 'Nhập lý do điều chỉnh đơn giá (VD: Khách thuê dài ngày, khách quen...)'
                                                    : 'Reason for price adjustment...'
                                            }
                                            className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-md text-xs text-slate-700 outline-none focus:border-amber-500"
                                        />
                                    </div>
                                )}

                                {(rentalSummary.days > 0 || rentalSummary.deposit > 0) && (
                                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-4 text-slate-600">
                                            {rentalSummary.days > 0 && (
                                                <span>
                                                    Thời lượng:{' '}
                                                    <strong className="text-slate-800">
                                                        {rentalSummary.days} ngày
                                                    </strong>{' '}
                                                    ({rentalSummary.hours} giờ)
                                                </span>
                                            )}
                                            {rentalSummary.totalRental > 0 && (
                                                <span>
                                                    Tiền thuê xe:{' '}
                                                    <strong className="text-emerald-700">
                                                        {rentalSummary.totalRental.toLocaleString(
                                                            'vi-VN'
                                                        )}{' '}
                                                        VNĐ
                                                    </strong>
                                                </span>
                                            )}
                                        </div>
                                        {rentalSummary.grandTotal > 0 && (
                                            <div className="text-slate-700">
                                                Tổng thu (gồm cọc):{' '}
                                                <strong className="text-sm text-slate-900 font-mono">
                                                    {rentalSummary.grandTotal.toLocaleString(
                                                        'vi-VN'
                                                    )}{' '}
                                                    VNĐ
                                                </strong>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Hóa đơn VAT */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">
                                            <Receipt className="w-3.5 h-3.5" />
                                        </span>
                                        {t('createContract.vatSection')}
                                    </h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="requireInvoice"
                                            checked={formData.requireInvoice}
                                            onChange={handleChange}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>
                                {formData.requireInvoice && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                {t('createContract.taxCode')}{' '}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={13}
                                                name="taxCode"
                                                value={formData.taxCode}
                                                onChange={handleChange}
                                                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none font-mono ${
                                                    isTaxCodeInvalid
                                                        ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500'
                                                        : 'border-amber-300 bg-amber-50/30 focus:border-amber-500'
                                                }`}
                                                placeholder="0101234567"
                                            />
                                            {isTaxCodeInvalid && (
                                                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                                    Mã số thuế gồm 10 hoặc 13 chữ số ({formData.taxCode.length}/10)
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                {t('createContract.companyName')}{' '}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="companyName"
                                                value={formData.companyName}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-sm outline-none focus:border-amber-500"
                                                placeholder="Công ty A..."
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                {t('createContract.invoiceAddress')}{' '}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="companyAddress"
                                                value={formData.companyAddress}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-sm outline-none focus:border-amber-500"
                                                placeholder="Địa chỉ đăng ký kinh doanh trên hóa đơn..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cột phải: Giấy tờ Pháp lý */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">
                                        <FileText className="w-3.5 h-3.5" />
                                    </span>
                                    {t('createContract.legalDocs')}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {cleanLabel(t('createContract.cccdChip'))}{' '}
                                            <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={12}
                                            name="cccdNumber"
                                            value={formData.cccdNumber}
                                            onChange={handleChange}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm outline-none font-mono ${
                                                isCccdInvalid
                                                    ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                                                    : 'border-slate-300 focus:border-indigo-500'
                                            }`}
                                            placeholder="048200012345"
                                        />
                                        {isCccdInvalid && (
                                            <p className="text-[11px] text-rose-600 mt-1 font-medium">
                                                Cần nhập đủ 12 chữ số CCCD ({formData.cccdNumber.length}/12)
                                            </p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                {t('createContract.issueDate')}
                                            </label>
                                            <input
                                                type="date"
                                                max={todayDateStr}
                                                name="cccdDate"
                                                value={formData.cccdDate}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">
                                                {t('createContract.issuePlace')}
                                            </label>
                                            <input
                                                type="text"
                                                name="cccdPlace"
                                                value={formData.cccdPlace}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                                placeholder="Cục CSQLHC..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">
                                            {t('createContract.driverLicense')}
                                        </label>
                                        <input
                                            type="text"
                                            name="licenseNumber"
                                            value={formData.licenseNumber}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500"
                                            placeholder="Hạng B1, B2..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thanh hành động Sticky bên trong vùng nội dung */}
                    <div className="sticky bottom-0 z-30 -mx-6 -mb-6 mt-6 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(15,23,42,0.04)]">
                        <p className="text-xs text-slate-500 font-medium max-w-md">
                            {t('createContract.previewNote')}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                if (validateForm()) setIsContractModalOpen(true);
                            }}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                        >
                            <FileText className="w-4 h-4" /> {t('createContract.viewSignBtn')}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL XEM TRƯỚC & KÝ HỢP ĐỒNG */}
            {isContractModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {t('createContract.draftTitle')} {formData.renterName} -{' '}
                                {t('createContract.twoPages')}
                            </h3>
                            <button
                                onClick={() => setIsContractModalOpen(false)}
                                className="text-slate-400 hover:text-rose-500 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#525659]">
                            <ContractPaperTemplate
                                formData={formData}
                                signatureData={signatureData}
                                rentalSummary={rentalSummary}
                            />
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex flex-wrap justify-between items-center gap-3 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
                            {isSigning ? (
                                <div className="w-full flex items-center gap-4 animate-in slide-in-from-bottom-4">
                                    <div
                                        className="bg-slate-50 rounded-lg flex-1 border-2 border-dashed border-sky-400 overflow-hidden relative"
                                        style={{ height: '140px' }}
                                    >
                                        {!isDrawing && !signatureData && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-sky-900 font-bold tracking-widest text-2xl uppercase">
                                                {t('createContract.signAreaPrompt')}
                                            </div>
                                        )}
                                        <canvas
                                            ref={canvasRef}
                                            width={800}
                                            height={140}
                                            onPointerDown={startDrawing}
                                            onPointerMove={draw}
                                            onPointerUp={stopDrawing}
                                            onPointerCancel={stopDrawing}
                                            onPointerLeave={stopDrawing}
                                            className="w-full h-full cursor-crosshair"
                                            style={{ touchAction: 'none' }}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            onClick={clearSignature}
                                            className="px-6 py-2.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-300 cursor-pointer"
                                        >
                                            <Eraser className="w-4 h-4" />{' '}
                                            {t('createContract.clearSign')}
                                        </button>
                                        <button
                                            onClick={saveSignature}
                                            className="px-6 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-sky-600 cursor-pointer"
                                        >
                                            <Check className="w-4 h-4" />{' '}
                                            {t('createContract.acceptSign')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
                                    >
                                        <Printer className="w-4 h-4" />{' '}
                                        {t('createContract.printA4')}
                                    </button>
                                    <div className="flex gap-3">
                                        {!signatureData ? (
                                            <>
                                                <button
                                                    onClick={() => setIsSigning(true)}
                                                    className="px-5 py-2.5 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 text-sm font-bold rounded-lg flex items-center gap-2 cursor-pointer"
                                                >
                                                    <PenTool className="w-4 h-4" />{' '}
                                                    {t('createContract.eSignBtn')}
                                                </button>
                                                <button
                                                    onClick={handleFinalizeContract}
                                                    disabled={isSaving}
                                                    className="px-6 py-2.5 bg-[#0EA5E9] text-white hover:bg-sky-600 text-sm font-bold rounded-lg flex items-center gap-2 shadow-md cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />{' '}
                                                    {t('createContract.paperContractBtn')}
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={handleFinalizeContract}
                                                disabled={isSaving}
                                                className="px-7 py-2.5 bg-[#0EA5E9] text-white hover:bg-sky-600 text-sm font-bold rounded-lg flex items-center gap-2 shadow-md cursor-pointer"
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-5 h-5" />
                                                )}
                                                {isSaving
                                                    ? t('createContract.saving')
                                                    : t('createContract.confirmSignSubmit')}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}