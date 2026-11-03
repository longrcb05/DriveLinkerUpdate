import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    ChevronLeft, User, FileText, Save,
    AlertCircle, Printer, PenTool, Receipt, Check, X, Eraser,
    CheckCircle2, Download, CheckCircle, List, MapPin, Car, DollarSign, Users, Loader2
} from 'lucide-react';
import { vehicleService } from '../services/vehicleService';

export default function CreateContract() {
    const navigate = useNavigate();
    const location = useLocation();
    const draftId = location.state?.draftId as string | undefined;
    const tenantId = localStorage.getItem('tenantId') || 'COMPANY_A';
    const draftKey = 'sys_contract_drafts';

    const [formData, setFormData] = useState({
        id: draftId || `HD-NHAP-${Date.now()}`,
        partyAName: 'Công ty TNHH Vận tải & DVDL DriveLinker',
        partyAAddress: '120 Hoàng Minh Thảo, Phường Hòa Khánh, TP Đà Nẵng',
        partyAPhone: '0977.73.74.75',
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

    const [cccdFront, setCccdFront] = useState<string | null>(null);
    const [cccdBack, setCccdBack] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [isSigning, setIsSigning] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const formRef = useRef(formData);

    useEffect(() => {
        if (!draftId) return;
        try {
            const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
            const draft = drafts.find((item: any) => item.id === draftId);
            if (draft) {
                setFormData(prev => ({ ...prev, ...draft.formData }));
                setCccdFront(draft.cccdFront || null);
                setCccdBack(draft.cccdBack || null);
                setSignatureData(draft.signatureData || null);
            }
        } catch (err) {
            console.error('Lỗi khôi phục bản nháp:', err);
        }
    }, [draftId, draftKey]);

    useEffect(() => {
        formRef.current = formData;
    }, [formData]);

    const saveDraftToStorage = () => {
        const currentData = formRef.current;
        if (!currentData.renterName.trim() && !currentData.carPlate.trim()) return;

        const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
        const draftPayload = {
            id: currentData.id,
            tenantId,
            formData: currentData,
            cccdFront, cccdBack, signatureData,
            lastModified: new Date().toISOString()
        };

        const index = drafts.findIndex((item: any) => item.id === currentData.id);
        if (index >= 0) drafts[index] = draftPayload;
        else drafts.unshift(draftPayload);

        localStorage.setItem(draftKey, JSON.stringify(drafts));
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (formData.renterName || formData.carPlate) {
                setSaveStatus('SAVING');
                saveDraftToStorage();
                setTimeout(() => setSaveStatus('SAVED'), 500);
            }
        }, 2000);
        return () => window.clearTimeout(timer);
    }, [formData, cccdFront, cccdBack, signatureData]);

    const handleManualSave = () => {
        saveDraftToStorage();
        alert('Đã lưu bản nháp thành công!');
        navigate('/partners');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        if ((name === 'renterPhone' || name === 'guarantorPhone' || name === 'partyAPhone') && value && !/^[0-9\s.\-+]+$/.test(value)) {
            return;
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
        setIsDrawing(true);
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo((e.clientX - rect.left) * (canvas.width / rect.width), (e.clientY - rect.top) * (canvas.height / rect.height));
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);
    const clearSignature = () => {
        const canvas = canvasRef.current;
        canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData(null);
    };
    const saveSignature = () => {
        setSignatureData(canvasRef.current?.toDataURL('image/png') || null);
        setIsSigning(false);
    };

    useEffect(() => {
        if (isSigning && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) { ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#000000'; }
        }
    }, [isSigning]);

    const validateForm = () => {
        if (!formData.partyAName || !formData.renterName || !formData.renterPhone || !formData.cccdNumber || !formData.carPlate || !formData.rentPrice) {
            setError('Vui lòng nhập đầy đủ các trường bắt buộc (*).');
            return false;
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

        // Gọi lệnh in gốc, lúc này CSS Media Print sẽ hiển thị Portal chứa hợp đồng
        window.print();

        setTimeout(() => { document.title = originalTitle; }, 1000);
    };

    const handleFinalizeContract = () => {
        if (!validateForm()) return;
        setIsSaving(true);
        try {
            const contractId = `HD-${Date.now().toString().slice(-6)}`;
            const newContract = {
                id: contractId,
                tenantId,
                type: signatureData ? 'E_CONTRACT' : 'HARDCOPY',
                partnerName: formData.renterName,
                partnerPhone: formData.renterPhone,
                cccdNumber: formData.cccdNumber,
                hasInvoice: formData.requireInvoice,
                taxCode: formData.taxCode,
                value: formData.rentPrice ? `${Number(formData.rentPrice).toLocaleString('vi-VN')} VNĐ` : '0',
                date: new Date().toLocaleDateString('vi-VN'),
                status: 'ACTIVE',
                signature: signatureData,
                partyA: { ...formData },
                contractData: formData,
                cccdFront, cccdBack,
                rentStartDate: formData.rentStartDate,
                rentEndDate: formData.rentEndDate,
                carPlate: formData.carPlate,
                depositAmount: formData.depositAmount
            };

            const existingContracts = JSON.parse(localStorage.getItem('sys_e_contracts') || '[]');
            existingContracts.unshift(newContract);
            localStorage.setItem('sys_e_contracts', JSON.stringify(existingContracts));

            // Đồng bộ trạng thái xe tương ứng sang RENTED
            if (formData.carPlate) {
                try {
                    vehicleService.updateVehicleStatus(
                        tenantId,
                        formData.carPlate,
                        'RENTED',
                        `Đã ký hợp đồng ${contractId} (Khách: ${formData.renterName})`
                    );
                } catch (vErr) {
                    console.warn('Lỗi đồng bộ xe sang RENTED:', vErr);
                }
            }

            const drafts = JSON.parse(localStorage.getItem(draftKey) || '[]');
            localStorage.setItem(draftKey, JSON.stringify(drafts.filter((item: any) => item.id !== formData.id)));

            setIsSaving(false);
            setIsContractModalOpen(false);
            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            setError('Lỗi khi phát hành hợp đồng.');
            setIsSaving(false);
        }
    };

    const formatMoney = (amount: string) => amount ? Number(amount).toLocaleString('vi-VN') : '..........................';

    // ==========================================
    // COMPONENT LÕI TẠO BẢN HỢP ĐỒNG (TÁI SỬ DỤNG CHO DEMO VÀ PDF)
    // Quy chuẩn thể thức văn bản pháp lý: Font Times New Roman, Cỡ chữ 13pt
    // ==========================================
    const ContractPaperTemplate = () => (
        <div className="font-['Times_New_Roman',_Times,_serif] text-[13pt] leading-[1.35] text-black">

            {/* TRANG 1 */}
            <div className="contract-page page-1 bg-white mx-auto shadow-xl p-[15mm_18mm] w-full max-w-[210mm] min-h-[297mm] mb-8 print:w-full print:max-w-none print:min-h-0 print:shadow-none print:p-0 print:m-0 print:block">
                <div className="text-center mb-3">
                    <h2 className="font-bold text-[12.5pt] mb-0.5 uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                    <h3 className="font-bold text-[13pt] underline decoration-solid underline-offset-4 mb-2.5">Độc lập - Tự do - Hạnh phúc</h3>
                    <h1 className="text-[16pt] font-bold text-center mb-1 uppercase tracking-wide">HỢP ĐỒNG THUÊ XE Ô TÔ TỰ LÁI</h1>
                    <p className="italic text-center mb-2 text-[12pt]">
                        Hôm nay, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}, tại văn phòng {formData.partyAName || 'hệ thống DriveLinker'}, chúng tôi gồm có:
                    </p>
                </div>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN CHO THUÊ XE (BÊN A):</p>
                    <p>Tên tổ chức/Cá nhân: <span className="font-bold">{formData.partyAName || '............................................................'}</span></p>
                    <p>Địa chỉ trụ sở: {formData.partyAAddress || '..................................................................................'}</p>
                    <p>Điện thoại: {formData.partyAPhone || '............................................................'}</p>
                    <p>Người đại diện: <span className="font-bold">{formData.partyARepresentative || '..........................'}</span> <span className="ml-8">Chức vụ: {formData.partyARole || '..........................'}</span></p>
                </div>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">BÊN THUÊ XE (BÊN B):</p>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">Ông/Bà: <span className="font-bold uppercase">{formData.renterName || '........................................'}</span></p>
                        <p className="flex-1">Số điện thoại: <span className="font-bold">{formData.renterPhone || '..........................'}</span></p>
                    </div>
                    <p>Địa chỉ thường trú: {formData.renterAddress || '..................................................................................'}</p>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">CCCD/CMND số: <span className="font-bold">{formData.cccdNumber || '..........................'}</span></p>
                        <p className="flex-1">Cấp ngày: {formData.cccdDate ? new Date(formData.cccdDate).toLocaleDateString('vi-VN') : '....................'}</p>
                    </div>
                    <div className="flex justify-between gap-4">
                        <p className="flex-1">Nơi cấp: {formData.cccdPlace || '........................................'}</p>
                        <p className="flex-1">Giấy phép lái xe: <span className="font-bold">{formData.licenseNumber || '..........................'}</span></p>
                    </div>
                    {(formData.guarantorName || formData.guarantorPhone) && (
                        <p className="mt-0.5">
                            Người bảo lãnh / Liên hệ khẩn cấp: Ông/Bà <span className="font-bold">{formData.guarantorName || '....................'}</span>.
                            Quan hệ: {formData.guarantorRelation || '.........'} - Số điện thoại: <span className="font-bold">{formData.guarantorPhone || '....................'}</span>.
                        </p>
                    )}
                </div>

                <p className="italic text-[12.5pt] mb-2">Sau khi thỏa thuận, hai bên đồng ý ký kết Hợp đồng thuê xe với các điều khoản sau:</p>

                <div className="space-y-0.5 mb-2.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 1: THÔNG TIN TÀI SẢN CHO THUÊ</p>
                    <p>Bên A đồng ý cho Bên B thuê 01 chiếc xe ô tô mang biển kiểm soát: <span className="font-bold text-[13.5pt] border border-black/40 px-2 py-0.5 ml-1 inline-block rounded">{formData.carPlate || '....................'}</span>.</p>
                    <p className="text-justify leading-normal">Xe được trang bị đầy đủ thiết bị an toàn và hệ thống giám sát hành trình. Bên B cam kết không tự ý tháo dỡ, can thiệp vào hệ thống này trong suốt quá trình thuê xe.</p>
                </div>

                <div className="space-y-0.5 mb-1.5 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 2: THỜI GIAN VÀ GIÁ THUÊ XE</p>
                    <ul className="list-disc pl-6 space-y-0.5">
                        <li>Thời gian bắt đầu thuê: {formData.rentStartDate ? new Date(formData.rentStartDate).toLocaleString('vi-VN') : '............................................................'}</li>
                        <li>Thời gian dự kiến trả xe: {formData.rentEndDate ? new Date(formData.rentEndDate).toLocaleString('vi-VN') : '............................................................'}</li>
                        <li>Đơn giá thuê: <span className="font-bold">{formatMoney(formData.rentPrice)}</span> VNĐ / ngày.</li>
                        <li>Tiền đặt cọc / Tài sản thế chấp: <span className="font-bold">{formatMoney(formData.depositAmount)}</span> VNĐ. (Bên A sẽ hoàn trả lại cho Bên B sau khi thanh lý hợp đồng và trừ đi các khoản phạt vi phạm giao thông nếu có phát sinh).</li>
                    </ul>
                </div>
            </div>

            {/* TRANG 2 - Ép ngắt trang an toàn sang Sheet 2 */}
            <div className="contract-page page-2 bg-white mx-auto shadow-xl p-[15mm_18mm] w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:min-h-0 print:shadow-none print:p-0 print:m-0 print:block">

                <div className="space-y-0.5 mb-3 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</p>
                    <p className="font-bold text-[13pt] mt-0.5">3.1. Nghĩa vụ của Bên A:</p>
                    <ul className="list-disc pl-6 space-y-0.5 text-justify">
                        <li>Giao xe đúng chất lượng, đúng thời gian và địa điểm đã thỏa thuận.</li>
                        <li>Cung cấp đầy đủ giấy tờ pháp lý của xe (bản sao y có công chứng hoặc bản gốc tùy thỏa thuận).</li>
                    </ul>
                    <p className="font-bold text-[13pt] mt-1.5">3.2. Nghĩa vụ của Bên B:</p>
                    <ul className="list-disc pl-6 space-y-0.5 text-justify">
                        <li>Thanh toán đầy đủ tiền thuê xe và tiền cọc cho Bên A.</li>
                        <li>Tự chịu trách nhiệm dân sự, hình sự và chi phí phạt nguội về các vi phạm giao thông phát sinh trong thời gian thuê.</li>
                        <li>Không sử dụng xe vào mục đích cầm cố, thế chấp, chạy xe công nghệ hoặc vi phạm pháp luật.</li>
                    </ul>
                </div>

                {formData.requireInvoice ? (
                    <div className="space-y-0.5 mb-3 avoid-break">
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 4: THÔNG TIN XUẤT HÓA ĐƠN VAT</p>
                        <p>Bên A thực hiện xuất hóa đơn GTGT cho Bên B theo thông tin sau:</p>
                        <ul className="list-disc pl-6 space-y-0.5">
                            <li>Tên đơn vị: <span className="font-bold">{formData.companyName}</span></li>
                            <li>Mã số thuế: <span className="font-bold">{formData.taxCode}</span></li>
                            <li>Địa chỉ: {formData.companyAddress}</li>
                        </ul>
                    </div>
                ) : (
                    <div className="space-y-0.5 mb-3 avoid-break">
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 4: THÔNG TIN HÓA ĐƠN VAT</p>
                        <p className="text-justify leading-normal">Hợp đồng này không yêu cầu xuất hóa đơn GTGT. Nếu Bên B có nhu cầu xuất hóa đơn phát sinh sau thời điểm ký kết, Bên B phải thông báo cho Bên A trước khi bàn giao xe và thanh toán bổ sung thuế GTGT theo quy định của pháp luật.</p>
                    </div>
                )}

                <div className="space-y-0.5 mb-4 avoid-break">
                    <p className="font-bold uppercase text-[13pt] mb-0.5">ĐIỀU 5: CAM KẾT CHUNG</p>
                    <p className="text-justify leading-normal">Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Hợp đồng được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản có giá trị pháp lý như nhau và có hiệu lực kể từ ngày ký.</p>
                </div>

                <div className="grid grid-cols-2 text-center mt-5 gap-6 avoid-break pb-4">
                    <div>
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐẠI DIỆN BÊN A</p>
                        <p className="italic text-[11.5pt] mb-14">(Ký, đóng dấu, ghi rõ họ tên)</p>
                        <p className="font-bold uppercase text-[13pt]">{formData.partyARepresentative}</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-[13pt] mb-0.5">ĐẠI DIỆN BÊN B</p>
                        <p className="italic text-[11.5pt] mb-1">(Ký, ghi rõ họ tên)</p>
                        <div className="h-14 flex items-center justify-center mb-1">
                            {signatureData ? (
                                <img src={signatureData} alt="Chữ ký bên B" className="max-h-full max-w-full mix-blend-multiply object-contain" />
                            ) : (
                                <div className="w-full h-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-sans text-xs no-print">
                                    (Khu vực Ký tên)
                                </div>
                            )}
                        </div>
                        <p className="font-bold uppercase text-[13pt]">{formData.renterName || '........................................'}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6 space-y-6 relative h-full">

            {/* =========================================================
                PORTAL IN ẤN (GIẢI QUYẾT TRIỆT ĐỂ LỖI MẤT TRANG VÀ KHOẢNG TRỐNG)
                ========================================================= */}
            <style>{`
                /* Thiết lập ngầm để Portal không lộ diện khi dùng máy tính bình thường */
                @media screen {
                    #print-portal-mount { display: none !important; }
                }

                @media print {
                    /* Bước 1: Vô hiệu hóa thẻ #root chứa toàn bộ App */
                    #root { display: none !important; }
                    
                    /* Bước 2: Kích hoạt hiển thị Print Portal (Thẻ này đang nằm độc lập ở body) */
                    #print-portal-mount { 
                        display: block !important; 
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        background: white !important;
                    }

                    /* Bước 3: Đảm bảo thẻ html và body tự do co giãn chiều cao */
                    html, body {
                        height: auto !important;
                        min-height: 100% !important;
                        overflow: visible !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Cài đặt khổ in thực tế */
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

            {/* REACT PORTAL: Bắn vùng xuất PDF trực tiếp ra ngoài <body>
                Khắc phục hoàn toàn lỗi bị CSS của app chèn ép */}
            {createPortal(
                <div id="print-portal-mount">
                    <ContractPaperTemplate />
                </div>,
                document.body
            )}

            {/* =========================================================
                GIAO DIỆN CHÍNH
                ========================================================= */}
            {isSuccess ? (
                <div className="no-print flex flex-col items-center justify-center min-h-[70vh] animate-in zoom-in-95">
                    <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm"><CheckCircle className="w-12 h-12" /></div>
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Ký kết Thành công!</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-center">Hợp đồng của khách hàng <strong className="text-slate-700">{formData.renterName}</strong> đã được lưu.</p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsContractModalOpen(true)} className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"><FileText className="w-5 h-5" /> Xem Hợp đồng</button>
                        <button onClick={handleDownloadPDF} className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"><Download className="w-5 h-5" /> Xuất PDF / In</button>
                        <button onClick={() => navigate('/partners')} className="px-6 py-3 bg-[#0EA5E9] hover:bg-sky-600 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"><List className="w-5 h-5" /> Về Quản lý</button>
                    </div>
                </div>
            ) : (
                <div className="no-print space-y-6 max-w-7xl mx-auto pb-20">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                <span onClick={() => navigate('/partners')} className="hover:text-slate-800 cursor-pointer transition-colors">MENU</span>
                                <ChevronLeft className="w-3 h-3 mx-1" />
                                <span className="text-sky-600">Soạn thảo hợp đồng</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Biểu mẫu Hợp đồng Thuê xe</h2>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-2">
                                {saveStatus === 'SAVING' && <span className="flex items-center gap-1 text-sky-500"><Loader2 className="w-3 h-3 animate-spin" /> Đang tự động lưu...</span>}
                                {saveStatus === 'SAVED' && <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3 h-3" /> Đã lưu bản nháp</span>}
                                {saveStatus === 'IDLE' && <span>Bản nháp chưa có thay đổi</span>}
                            </div>
                        </div>
                        <button onClick={handleManualSave} className="px-5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors"><Save className="w-4 h-4" /> Lưu nháp</button>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-in fade-in"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>
                    )}

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Thông tin Bên A - Bên cho thuê</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Tên tổ chức / Cá nhân *</label>
                                <input name="partyAName" value={formData.partyAName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Số điện thoại *</label>
                                <input name="partyAPhone" value={formData.partyAPhone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none" />
                            </div>
                            <div className="lg:col-span-3">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Địa chỉ trụ sở</label>
                                <input name="partyAAddress" value={formData.partyAAddress} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none" />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Người đại diện</label>
                                <input name="partyARepresentative" value={formData.partyARepresentative} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Chức vụ</label>
                                <input name="partyARole" value={formData.partyARole} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-sky-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-xs"><User className="w-3 h-3" /></span>Thông tin Khách hàng (Bên B)</h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Họ và tên *</label>
                                        <input type="text" name="renterName" value={formData.renterName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-sky-500 uppercase" placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Số điện thoại *</label>
                                        <input type="text" name="renterPhone" value={formData.renterPhone} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-sky-500 font-mono" placeholder="090..." />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Địa chỉ thường trú</label>
                                        <div className="relative">
                                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input type="text" name="renterAddress" value={formData.renterAddress} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-sky-500" placeholder="Số nhà, Đường..." />
                                        </div>
                                    </div>
                                </div>

                                <h4 className="text-xs font-bold text-rose-600 mb-3 flex items-center gap-2 uppercase tracking-wide"><Users className="w-4 h-4" /> Người liên hệ khẩn cấp</h4>
                                <div className="grid grid-cols-3 gap-4 bg-rose-50/50 p-4 rounded-lg border border-rose-100">
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Họ tên người thân</label>
                                        <input type="text" name="guarantorName" value={formData.guarantorName} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-rose-500" placeholder="VD: Trần Thị B" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Mối quan hệ</label>
                                        <input type="text" name="guarantorRelation" value={formData.guarantorRelation} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-rose-500" placeholder="Vợ/Chồng, Bố/Mẹ..." />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Số điện thoại *</label>
                                        <input type="text" name="guarantorPhone" value={formData.guarantorPhone} onChange={handleChange} className="w-full px-3 py-2 border border-rose-300 bg-white rounded-lg text-sm outline-none focus:border-rose-500 font-mono text-rose-700" placeholder="098..." />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs"><Car className="w-3 h-3" /></span>Chi tiết Giao dịch Thuê xe</h3>
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Biển số xe thuê *</label>
                                        <input type="text" name="carPlate" value={formData.carPlate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 font-mono uppercase bg-yellow-50" placeholder="43A-123.45" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Giờ giao xe</label>
                                        <input type="datetime-local" name="rentStartDate" value={formData.rentStartDate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Giờ trả xe</label>
                                        <input type="datetime-local" name="rentEndDate" value={formData.rentEndDate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Đơn giá thuê (VNĐ/Ngày) *</label>
                                        <div className="relative">
                                            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input type="number" name="rentPrice" value={formData.rentPrice} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 text-emerald-700 font-bold" placeholder="800000" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Tiền đặt cọc (VNĐ)</label>
                                        <div className="relative">
                                            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input type="number" name="depositAmount" value={formData.depositAmount} onChange={handleChange} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="15000000" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs"><Receipt className="w-3 h-3" /></span>Xuất hóa đơn GTGT (VAT)</h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" name="requireInvoice" checked={formData.requireInvoice} onChange={handleChange} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>
                                {formData.requireInvoice && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-slate-100">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Mã số thuế *</label>
                                            <input type="text" name="taxCode" value={formData.taxCode} onChange={handleChange} className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-sm outline-none focus:border-amber-500" placeholder="0101234567" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Tên Công ty *</label>
                                            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-sm outline-none focus:border-amber-500" placeholder="Công ty A..." />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Địa chỉ hóa đơn</label>
                                            <input type="text" name="companyAddress" value={formData.companyAddress} onChange={handleChange} className="w-full px-3 py-2 border border-amber-300 bg-amber-50/30 rounded-lg text-sm outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs"><FileText className="w-3 h-3" /></span>Giấy tờ Pháp lý</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">CCCD gắn chip (12 số) *</label>
                                        <input type="text" name="cccdNumber" value={formData.cccdNumber} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 font-mono" placeholder="048..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Ngày cấp</label>
                                            <input type="date" name="cccdDate" value={formData.cccdDate} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Nơi cấp</label>
                                            <input type="text" name="cccdPlace" value={formData.cccdPlace} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Giấy phép lái xe</label>
                                        <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" placeholder="Hạng B1, B2..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-md flex items-center justify-between sticky bottom-6 z-10 animate-in slide-in-from-bottom-5">
                        <p className="text-xs text-slate-500 font-medium max-w-sm">Kiểm tra kỹ thông tin. Mẫu Hợp đồng chuẩn gồm 2 trang A4, hỗ trợ ký điện tử trực tiếp trên màn hình.</p>
                        <button onClick={() => { if (validateForm()) setIsContractModalOpen(true); }} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm">
                            <FileText className="w-4 h-4" /> Xem & Ký Hợp Đồng
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL XEM TRƯỚC BẢN DEMO */}
            {isContractModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg">Bản Phác thảo Hợp Đồng - {formData.renterName} (2 Trang)</h3>
                            <button onClick={() => setIsContractModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white p-1.5 rounded-md border border-slate-200 shadow-sm"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Màn hình Demo: Load chung 1 ruột Template để đảm bảo giống PDF */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#525659]">
                            <ContractPaperTemplate />
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 shrink-0 flex justify-between items-center shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
                            {isSigning ? (
                                <div className="w-full flex items-center gap-4 animate-in slide-in-from-bottom-4">
                                    <div className="bg-slate-50 rounded-lg flex-1 border-2 border-dashed border-sky-400 overflow-hidden relative" style={{ height: '140px' }}>
                                        {!isDrawing && !signatureData && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-sky-900 font-bold tracking-widest text-2xl uppercase">Ký trực tiếp vào vùng này</div>}
                                        <canvas ref={canvasRef} width={800} height={140} onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={stopDrawing} onPointerCancel={stopDrawing} onPointerLeave={stopDrawing} className="w-full h-full cursor-crosshair" style={{ touchAction: "none" }} />
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button onClick={clearSignature} className="px-6 py-2.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-300"><Eraser className="w-4 h-4" /> Ký lại</button>
                                        <button onClick={saveSignature} className="px-6 py-2.5 bg-sky-500 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-sky-600"><Check className="w-4 h-4" /> Đồng ý</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <button onClick={handleDownloadPDF} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg flex items-center gap-2 border border-slate-200 transition-colors">
                                        <Printer className="w-4 h-4" /> Xuất file PDF / In A4
                                    </button>
                                    <div className="flex gap-3">
                                        {!signatureData ? (
                                            <>
                                                <button onClick={() => setIsSigning(true)} className="px-5 py-3 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-200 text-sm font-bold rounded-lg flex items-center gap-2"><PenTool className="w-4 h-4" /> Ký điện tử tại đây</button>
                                                <button onClick={handleFinalizeContract} disabled={isSaving} className="px-6 py-3 bg-[#0EA5E9] text-white hover:bg-sky-600 text-sm font-bold rounded-lg flex items-center gap-2 shadow-md">
                                                    <CheckCircle2 className="w-4 h-4" /> Phát hành Hợp đồng giấy
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={handleFinalizeContract} disabled={isSaving} className="px-8 py-3 bg-[#0EA5E9] text-white hover:bg-sky-600 text-sm font-bold rounded-lg flex items-center gap-2 shadow-md">
                                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                                {isSaving ? 'Đang xử lý...' : 'Xác nhận Ký & Phát hành'}
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