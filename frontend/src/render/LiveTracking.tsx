/**
 * @file LiveTracking.tsx
 * @module Frontend/DMS
 * @description Buồng lái Giám sát An toàn Cabin & AI DMS (Driver Monitoring System Telematics Cockpit).
 * 
 * KIẾN TRÚC & QUY TRÌNH VẬN HÀNH (COCKPIT ARCHITECTURE):
 * 1. Bố cục 2 Cột Chuyên Dụng (Two-Column Telematics Layout):
 *    - Cột Trái: Danh sách đội xe cần giám sát với bộ lọc đa trạng thái (Tất cả, Cảnh báo nguy hiểm, An toàn/Tỉnh táo)
 *      và thanh tìm kiếm tức thời theo biển số, tài xế hoặc dòng xe.
 *    - Cột Phải: Bàn điều khiển trung tâm (Master Cockpit) hiển thị khung ảnh bằng chứng AI thời gian thực chụp từ camera cabin.
 * 
 * 2. Phân tích Sinh trắc học & Dữ liệu Vi phạm AI (Edge AI Metrics):
 *    - EAR (Eye Aspect Ratio): Đo lường độ mở mắt, phát hiện nhắm mắt ngủ gật (EAR < 0.22 kéo dài >= 2.5s).
 *    - MAR (Mouth Aspect Ratio): Đo lường độ mở vòm miệng, phát hiện ngáp sâu liên tục (MAR > 0.50).
 *    - Head Pitch Angle: Góc cúi đầu gục xuống vô lăng hoặc lệch hướng nhìn lái xe an toàn.
 *    - Speed & GPS Telemetry: Tốc độ xe thời gian thực đồng bộ cùng tọa độ địa lý.
 * 
 * 3. Công cụ Tua lại Lịch sử (Rewind Timeline Scrubber) & Thư viện Ảnh Bằng Chứng:
 *    - Cho phép nhân viên điều hành kéo thanh trượt tua lại các mốc sự cố nguy hiểm trong quá khứ.
 *    - Tích hợp Lightbox phóng to ảnh độ nét cao và nút tải file ảnh bằng chứng có dấu thời gian về máy tính.
 * 
 * 4. Can thiệp Khẩn cấp Từ xa (Remote Emergency Dispatch):
 *    - Nút kích hoạt còi báo động khẩn cấp cabin (`Siren`) để đánh thức tài xế tức thì.
 *    - Nút quay số trực tiếp gọi điện thoại kết nối tài xế (`Phone`).
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  ChevronRight, Search, Camera,
  AlertTriangle, CheckCircle2, Clock, X,
  ZoomIn, Download, Truck, User,
  History, MapPin, Eye, Phone, BellRing,
  Flame, ShieldCheck, Siren, ExternalLink
} from 'lucide-react';

// === KIỂU DỮ LIỆU BẰNG CHỨNG AI DMS ===
export interface AiEvidenceItem {
  id: string;
  image: string;
  time: string;
  date: string;
  type: 'DROWSY' | 'YAWN' | 'HEAD_DROP' | 'SLOW_BLINK';
  typeName: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  ear?: number;
  mar?: number;
  pitch?: number;
  speed: string;
  location: string;
  duration?: string;
  actionTaken: string;
}

// === KIỂU DỮ LIỆU PHƯƠNG TIỆN LIVE TRACKING ===
export interface LiveVehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  driverPhone: string;
  speed: number;
  status: 'ALERT_DROWSY' | 'WARNING_YAWN' | 'ALERT_DISTRACTED' | 'NORMAL';
  statusLabel: string;
  lat: number;
  lng: number;
  currentEar: number;
  currentMar: number;
  lastSeen: string;
  recentEvidence: AiEvidenceItem;
  historyEvidences: AiEvidenceItem[];
}

// === BỘ DỮ LIỆU ĐỘI XE & BẰNG CHỨNG ẢNH AI CHỤP THẬT (TỪ /bang_chung) ===
const MOCK_LIVE_FLEET: LiveVehicle[] = [
  {
    id: 'V01',
    plate: '43A-112.22',
    model: 'Hyundai Solati 16 Chỗ',
    driver: 'Trần Văn Bình',
    driverPhone: '0905.123.456',
    speed: 58,
    status: 'NORMAL',
    statusLabel: 'Lái xe an toàn / Tỉnh táo',
    lat: 16.054407,
    lng: 108.202167,
    currentEar: 0.30,
    currentMar: 0.16,
    lastSeen: 'Vừa xong',
    recentEvidence: {
      id: 'EV-01',
      image: '/bang_chung/CHOP_MAT_CHAM_(0.60s)_20261024_201540.jpg',
      time: '10:25:00',
      date: 'Hôm nay',
      type: 'SLOW_BLINK',
      typeName: 'Lái xe an toàn / Tỉnh táo',
      severity: 'LOW',
      ear: 0.30,
      mar: 0.16,
      speed: '58 km/h',
      location: 'Đường Nguyễn Văn Linh, Đà Nẵng',
      duration: '0s',
      actionTaken: 'Hệ thống AI giám sát an toàn • Không có vi phạm'
    },
    historyEvidences: []
  },
  {
    id: 'V02',
    plate: '29C-123.45',
    model: 'Isuzu Forward N-Series 5T',
    driver: 'Nguyễn Văn A',
    driverPhone: '0912.888.999',
    speed: 52,
    status: 'NORMAL',
    statusLabel: 'Lái xe an toàn / Tỉnh táo',
    lat: 16.047079,
    lng: 108.206230,
    currentEar: 0.32,
    currentMar: 0.15,
    lastSeen: '5 giây trước',
    recentEvidence: {
      id: 'EV-02',
      image: '/bang_chung/CHOP_MAT_CHAM_(0.60s)_20261024_201535.jpg',
      time: '10:24:30',
      date: 'Hôm nay',
      type: 'SLOW_BLINK',
      typeName: 'Lái xe an toàn / Tỉnh táo',
      severity: 'LOW',
      ear: 0.32,
      mar: 0.15,
      speed: '52 km/h',
      location: 'QL1A Hòa Phước, Đà Nẵng',
      duration: '0s',
      actionTaken: 'Hệ thống AI DMS giám sát an toàn tiêu chuẩn • Không có vi phạm'
    },
    historyEvidences: []
  },
  {
    id: 'V03',
    plate: '51D-987.65',
    model: 'Hino 500 Series FL 8T',
    driver: 'Trần Thị B',
    driverPhone: '0988.777.666',
    speed: 45,
    status: 'NORMAL',
    statusLabel: 'Lái xe an toàn / Tỉnh táo',
    lat: 16.038000,
    lng: 108.212000,
    currentEar: 0.29,
    currentMar: 0.17,
    lastSeen: 'Vừa xong',
    recentEvidence: {
      id: 'EV-03',
      image: '/bang_chung/CHOP_MAT_CHAM_(0.60s)_20261024_201525.jpg',
      time: '10:23:45',
      date: 'Hôm nay',
      type: 'SLOW_BLINK',
      typeName: 'Lái xe an toàn / Tỉnh táo',
      severity: 'LOW',
      ear: 0.29,
      mar: 0.17,
      speed: '45 km/h',
      location: 'Đường 2/9, Hải Châu, Đà Nẵng',
      duration: '0s',
      actionTaken: 'Hệ thống AI DMS giám sát an toàn tiêu chuẩn • Không có vi phạm'
    },
    historyEvidences: []
  },
  {
    id: 'V04',
    plate: '15C-456.78',
    model: 'Hyundai Mighty EX8 GTL 7T',
    driver: 'Lê Văn C',
    driverPhone: '0935.456.789',
    speed: 58,
    status: 'NORMAL',
    statusLabel: 'Lái xe an toàn / Tỉnh táo',
    lat: 16.035000,
    lng: 108.225000,
    currentEar: 0.31,
    currentMar: 0.15,
    lastSeen: '15 giây trước',
    recentEvidence: {
      id: 'EV-04',
      image: '/bang_chung/CANH_BAO_VANG_3_LAN_CAM_10P_-_NGAP_LIEN_TUC_20261029_100705.jpg',
      time: '10:20:00',
      date: 'Hôm nay',
      type: 'SLOW_BLINK',
      typeName: 'Lái xe an toàn / Tỉnh táo',
      severity: 'LOW',
      ear: 0.31,
      mar: 0.15,
      speed: '58 km/h',
      location: 'Đường Võ Nguyên Giáp, Đà Nẵng',
      duration: '0s',
      actionTaken: 'Hệ thống AI DMS giám sát an toàn tiêu chuẩn • Không có vi phạm'
    },
    historyEvidences: []
  },
  {
    id: 'V05',
    plate: '29A-111.11',
    model: 'Ford Transit Limousine 10 Chỗ',
    driver: 'Hoàng Văn D',
    driverPhone: '0977.111.222',
    speed: 60,
    status: 'NORMAL',
    statusLabel: 'Lái xe an toàn / Tỉnh táo',
    lat: 16.062000,
    lng: 108.218000,
    currentEar: 0.32,
    currentMar: 0.15,
    lastSeen: '2 giây trước',
    recentEvidence: {
      id: 'EV-05',
      image: '/bang_chung/CHOP_MAT_CHAM_(0.60s)_20261024_201540.jpg',
      time: '10:18:15',
      date: 'Hôm nay',
      type: 'SLOW_BLINK',
      typeName: 'Lái xe an toàn / Tỉnh táo',
      severity: 'LOW',
      ear: 0.32,
      mar: 0.15,
      speed: '60 km/h',
      location: 'Cảng Tiên Sa, Đà Nẵng',
      duration: '0s',
      actionTaken: 'Hệ thống AI DMS giám sát an toàn tiêu chuẩn • Không có vi phạm'
    },
    historyEvidences: []
  }
];

export default function LiveTracking() {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const plateParam = searchParams.get('plate');

  const getVehicleStatusLabel = (status: string, fallback: string) => {
    if (status === 'NORMAL') return t('tracking.statusSafeNormal');
    if (status === 'ALERT_DROWSY') return t('tracking.statusDrowsy');
    if (status === 'WARNING_YAWN') return t('tracking.statusYawn');
    if (status === 'ALERT_DISTRACTED') return t('tracking.statusDistracted');
    return fallback;
  };

  const formatLastSeen = (lastSeen: string) => {
    if (!lastSeen) return '';
    if (language === 'en') {
      if (lastSeen === 'Vừa xong') return t('tracking.justNow');
      return lastSeen.replace(' giây trước', 's ago').replace(' phút trước', 'm ago');
    }
    return lastSeen;
  };

  const formatEvidenceTypeName = (typeName: string) => {
    if (!typeName) return '';
    if (typeName.includes('Lái xe an toàn') || typeName.includes('Tỉnh táo') || typeName.includes('Bình thường')) {
      return t('tracking.statusSafeNormal');
    }
    if (typeName.includes('Ngủ gật')) {
      return t('tracking.statusDrowsy');
    }
    if (typeName.includes('Ngáp')) {
      return t('tracking.statusYawn');
    }
    if (typeName.includes('Mất tập trung') || typeName.includes('Cúi đầu')) {
      return t('tracking.statusDistracted');
    }
    return typeName;
  };

  const formatActionTaken = (action: string) => {
    if (!action) return '';
    if (action.includes('an toàn') && action.includes('Không có vi phạm')) {
      return t('tracking.actionSafe');
    }
    return action;
  };

  const [vehicles] = useState<LiveVehicle[]>(MOCK_LIVE_FLEET);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('V01');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ALERT' | 'NORMAL'>('ALL');

  // Lọc lịch sử ảnh theo loại vi phạm
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | 'DROWSY' | 'YAWN' | 'HEAD_DROP'>('ALL');

  // Xem ảnh phóng to Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Trạng thái báo động còi cabin khẩn cấp
  const [cabinAlarmAlert, setCabinAlarmAlert] = useState<string | null>(null);

  // Tự động chọn xe khi có query param từ trang Tổng quan
  useEffect(() => {
    if (plateParam) {
      const found = vehicles.find(
        v => v.plate.toLowerCase() === plateParam.toLowerCase() || v.id.toLowerCase() === plateParam.toLowerCase()
      );
      if (found) {
        setSelectedVehicleId(found.id);
      }
    }
  }, [plateParam, vehicles]);

  // Xe đang được chọn
  const activeVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  // Bằng chứng hình ảnh mới nhất của xe đang chọn
  const currentEvidence = useMemo(() => {
    return activeVehicle.recentEvidence;
  }, [activeVehicle]);

  // Lọc danh sách xe theo từ khóa và trạng thái
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchSearch =
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase());

      const isAlert = v.status === 'ALERT_DROWSY' || v.status === 'WARNING_YAWN' || v.status === 'ALERT_DISTRACTED';
      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ALERT' && isAlert) ||
        (filterStatus === 'NORMAL' && !isAlert);

      return matchSearch && matchStatus;
    });
  }, [vehicles, searchTerm, filterStatus]);

  // Thống kê đếm trạng thái
  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      drowsyAlerts: vehicles.filter(v => v.status === 'ALERT_DROWSY').length,
      warnings: vehicles.filter(v => v.status === 'WARNING_YAWN' || v.status === 'ALERT_DISTRACTED').length,
      normal: vehicles.filter(v => v.status === 'NORMAL').length
    };
  }, [vehicles]);

  // Danh sách ảnh bằng chứng lịch sử lọc theo tab
  const filteredHistory = useMemo(() => {
    if (evidenceFilter === 'ALL') return activeVehicle.historyEvidences;
    return activeVehicle.historyEvidences.filter(e => e.type === evidenceFilter);
  }, [activeVehicle, evidenceFilter]);

  // Hàm kích hoạt còi cabin khẩn cấp
  const handleTriggerCabinAlarm = () => {
    setCabinAlarmAlert(`${t('tracking.alarmSent')} ${activeVehicle.plate}!`);
    setTimeout(() => {
      setCabinAlarmAlert(null);
    }, 4500);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC] font-sans">

      {/* =========================================================================
          1. HEADER TỔNG (GỌN GÀNG, TINH TẾ)
          ========================================================================= */}
      <div className="px-6 py-3.5 shrink-0 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
              <span className="hover:text-slate-800 cursor-pointer">{t('overview.breadcrumbHome')}</span>
              <ChevronRight className="w-3 h-3 mx-1 text-slate-400" />
              <span className="text-sky-600 font-extrabold">{t('nav.tracking')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {t('tracking.title')}
            </h2>
          </div>
        </div>
      </div>

      {/* Thông báo còi báo động cabin */}
      {cabinAlarmAlert && (
        <div className="mx-6 mt-3 px-4 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Siren className="w-4 h-4 animate-bounce" />
            <span>{cabinAlarmAlert}</span>
          </div>
          <button onClick={() => setCabinAlarmAlert(null)} className="p-1 hover:bg-rose-700 rounded-md">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          2. KHÔNG GIAN LÀM VIỆC CHÍNH: CỘT TRÁI (LIST XE) + CỘT PHẢI (FULL Ô AI DMS & TUA THỜI GIAN)
          ========================================================================= */}
      <div className="flex-1 flex gap-4 p-5 overflow-hidden min-h-0">

        {/* -------------------------------------------------------------
            CỘT BÊN TRÁI: DANH SÁCH XE & NÚT CHI TIẾT
            ------------------------------------------------------------- */}
        <div className="w-80 lg:w-[340px] bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col shrink-0 overflow-hidden">
          {/* Header Danh sách xe */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>{t('tracking.fleetListTitle')}</span>
              </h3>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t('tracking.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-sky-500 transition shadow-2xs"
              />
            </div>

            {/* Các nút Tab lọc trạng thái */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-100'
                  }`}
              >
                {t('tracking.filterAll')} • {vehicles.length}
              </button>
              <button
                onClick={() => setFilterStatus('ALERT')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${filterStatus === 'ALERT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-600 border border-rose-200/80 hover:bg-rose-50'
                  }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {t('tracking.filterAlert')} • {stats.drowsyAlerts + stats.warnings}
              </button>
              <button
                onClick={() => setFilterStatus('NORMAL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${filterStatus === 'NORMAL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-600 border border-emerald-200/80 hover:bg-emerald-50'
                  }`}
              >
                {t('tracking.filterSafe')} • {stats.normal}
              </button>
            </div>
          </div>

          {/* Danh sách thẻ phương tiện */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/40">
            {filteredVehicles.map(v => {
              const isSelected = v.id === selectedVehicleId;
              const isAlert = v.status === 'ALERT_DROWSY';
              const isWarning = v.status === 'WARNING_YAWN' || v.status === 'ALERT_DISTRACTED';

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative select-none ${isSelected
                    ? 'bg-sky-50/20 border-sky-500 shadow-sm ring-1 ring-sky-300'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/40'
                    }`}
                >
                  {/* Hàng 1: Biển số & Huy hiệu trạng thái */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-extrabold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {v.plate}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isAlert
                        ? 'bg-rose-50 text-rose-700 animate-pulse border border-rose-200'
                        : isWarning
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      {getVehicleStatusLabel(v.status, v.statusLabel)}
                    </span>
                  </div>

                  {/* Hàng 2: Thông tin tài xế & Dòng xe */}
                  <div className="text-xs text-slate-600 mb-2">
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {v.driver}
                      <span className="text-[10px] font-normal text-slate-400">• {v.model}</span>
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
                      <span>⚡ {v.speed} km/h</span>
                      <span>EAR: <strong className={v.currentEar < 0.20 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{v.currentEar}</strong></span>
                      <span className="text-[10px] text-slate-400">{formatLastSeen(v.lastSeen)}</span>
                    </div>
                  </div>

                  {/* Hàng 3: Nút Xem Chi Tiết */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-slate-400" />
                      {v.historyEvidences.length + 1} {t('tracking.aiSnapshots')}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicleId(v.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 rounded-lg shadow-xs shadow-sky-500/30 transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('tracking.viewDetails')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------
            CỘT BÊN PHẢI: KHUNG CHỨA ẢNH & THÔNG TIN AI DMS (FORMAT GỌN GÀNG + TUA THỜI GIAN)
            ------------------------------------------------------------- */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col overflow-hidden min-h-0">

          {/* 1. Thanh Tiêu Đề Xe (Header Thông Tin) */}
          <div className="px-6 py-3.5 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Biển số xe */}
              <div className="font-mono font-black text-sm sm:text-base bg-slate-900 text-white px-3.5 py-1.5 rounded-xl shadow-xs whitespace-nowrap shrink-0 tracking-wider">
                {activeVehicle.plate}
              </div>

              {/* Thông tin tài xế & xe */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                    {activeVehicle.driver}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium truncate">
                    • {activeVehicle.model}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600 whitespace-nowrap">
                    📞 {activeVehicle.driverPhone}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 font-mono text-slate-600 whitespace-nowrap">
                    ⚡ {activeVehicle.speed} km/h
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 whitespace-nowrap">
                    <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>{activeVehicle.recentEvidence.location}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Các nút hành động bên phải */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Badge Trạng thái hiện tại của xe */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border whitespace-nowrap shrink-0 ${activeVehicle.status === 'ALERT_DROWSY'
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : activeVehicle.status === 'WARNING_YAWN' || activeVehicle.status === 'ALERT_DISTRACTED'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
              >
                {activeVehicle.status === 'ALERT_DROWSY' ? (
                  <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                ) : activeVehicle.status === 'WARNING_YAWN' || activeVehicle.status === 'ALERT_DISTRACTED' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{getVehicleStatusLabel(activeVehicle.status, activeVehicle.statusLabel)}</span>
              </span>

              {/* Phím tắt Gọi tài xế */}
              <a
                href={`tel:${activeVehicle.driverPhone}`}
                className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{t('tracking.callDriver')}</span>
              </a>
            </div>
          </div>

          {/* 2. Thân Khung Cuộn (Nội dung bằng chứng + Thanh tua thời gian) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAFC]">

            {/* =============================================================
                CARD CHÍNH: KHUNG HÌNH ẢNH RÕ RÀNG & THÔNG TIN DỄ THẤY CHO GIÁM SÁT
                ============================================================= */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">

              {/* Header của Khung Bằng Chứng */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <span>{t('tracking.evidenceRealtimeTitle')}</span>
                      {activeVehicle.status === 'ALERT_DROWSY' || currentEvidence.severity === 'HIGH' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                          {t('tracking.badgeLatestIncident')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          {t('tracking.badgeSafeLive')}
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>{t('tracking.recordedTime')} <strong>{currentEvidence.time}</strong> • {currentEvidence.date === 'Hôm nay' ? t('tracking.today') : currentEvidence.date}</span>
                  </span>
                </div>
              </div>

              {/* Bố cục 2 Cột: Hình ảnh sạch sẽ bên trái + Bảng thông số dễ thấy bên phải */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

                {/* CỘT TRÁI: HÌNH ẢNH BẰNG CHỨNG THỰC TẾ (SẮC NÉT, KHÔNG BỊ CSS GIẢ CHE MẶT) */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md group flex-1 min-h-[300px] flex items-center justify-center">
                    <img
                      src={currentEvidence.image}
                      alt={formatEvidenceTypeName(currentEvidence.typeName)}
                      className="w-full h-full max-h-[360px] object-contain bg-black group-hover:scale-[1.01] transition-transform duration-300 cursor-pointer"
                      onClick={() => setLightboxImage(currentEvidence.image)}
                    />

                    {/* Huy hiệu loại vi phạm tinh tế ở góc trên */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1.5 backdrop-blur-xs ${currentEvidence.severity === 'HIGH'
                          ? 'bg-rose-600/90 text-white animate-pulse'
                          : currentEvidence.severity === 'MEDIUM'
                            ? 'bg-amber-500/90 text-white'
                            : 'bg-emerald-600/90 text-white'
                          }`}
                      >
                        {currentEvidence.severity === 'HIGH' || currentEvidence.severity === 'MEDIUM' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                        )}
                        <span>{formatEvidenceTypeName(currentEvidence.typeName)}</span>
                      </span>
                    </div>

                    {/* Nhãn địa điểm và vận tốc nhẹ nhàng ở góc dưới */}
                    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] font-mono flex justify-between items-center">
                      <span className="flex items-center gap-1 text-slate-300 truncate max-w-[280px]">
                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate">{currentEvidence.location}</span>
                      </span>
                      <span className="text-sky-400 font-bold shrink-0">{currentEvidence.speed}</span>
                    </div>

                    {/* Nút phóng to Lightbox */}
                    <button
                      onClick={() => setLightboxImage(currentEvidence.image)}
                      className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl opacity-0 group-hover:opacity-100 transition cursor-pointer shadow"
                      title={t('tracking.zoom')}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* CỘT PHẢI: CÁC THÔNG TIN CẦN THIẾT & DỄ THẤY CHO NHÂN VIÊN GIÁM SÁT */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-3 text-xs">

                    {/* 1. Tên hành vi vi phạm */}
                    <div
                      className={`p-3.5 rounded-xl border ${currentEvidence.severity === 'HIGH'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : currentEvidence.severity === 'MEDIUM'
                          ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {t('tracking.behaviorDetected')}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${currentEvidence.severity === 'HIGH'
                            ? 'bg-rose-600 text-white'
                            : currentEvidence.severity === 'MEDIUM'
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            }`}
                        >
                          {currentEvidence.severity === 'HIGH' ? t('tracking.severityDanger') : currentEvidence.severity === 'MEDIUM' ? t('tracking.severityWarning') : t('tracking.severitySafe')}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base leading-tight mt-0.5">
                        {formatEvidenceTypeName(currentEvidence.typeName)}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {t('tracking.duration')} <strong className="text-slate-800 font-semibold">{currentEvidence.duration || '0s'}</strong>
                      </p>
                    </div>

                    {/* 2. Lưới 2 Chỉ số Sinh trắc học & Vận tốc */}
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Thẻ EAR Chỉ số Mở Mắt */}
                      <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          {t('tracking.earMetric')}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`text-2xl font-black font-mono ${(currentEvidence.ear ?? 0.20) < 0.20
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                              }`}
                          >
                            {currentEvidence.ear ?? 0.14}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">/ 0.35</span>
                        </div>
                        {/* Thanh đo trực quan EAR */}
                        <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${(currentEvidence.ear ?? 0.20) < 0.20 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            style={{ width: `${Math.min(100, ((currentEvidence.ear ?? 0.14) / 0.35) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {(currentEvidence.ear ?? 0.20) < 0.20 ? t('tracking.earDanger') : t('tracking.earNormal')}
                        </span>
                      </div>

                      {/* Thẻ Vận tốc Xe */}
                      <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          {t('tracking.speedMetric')}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-black font-mono text-slate-800">
                            {currentEvidence.speed}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (parseInt(currentEvidence.speed) / 100) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {t('tracking.speedMoving')}
                        </span>
                      </div>
                    </div>

                    {/* 3. Hành động can thiệp đã kích hoạt */}
                    <div className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400 flex items-center gap-1.5">
                        <BellRing className="w-3.5 h-3.5 text-amber-500" />
                        {t('tracking.cabinIntervention')}
                      </span>
                      <p className="font-semibold text-[11px] text-slate-700 leading-relaxed">
                        {formatActionTaken(currentEvidence.actionTaken)}
                      </p>
                    </div>
                  </div>

                  {/* 4. Cụm nút xử lý dành cho Nhân viên giám sát */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTriggerCabinAlarm}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-95 ${activeVehicle.status === 'ALERT_DROWSY'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                    >
                      <Siren className={`w-4 h-4 ${activeVehicle.status === 'ALERT_DROWSY' ? 'text-white' : 'text-amber-400'}`} />
                      <span>{t('tracking.triggerAlarmBtn')}</span>
                    </button>

                    <div className="flex gap-2">
                      <a
                        href={`tel:${activeVehicle.driverPhone}`}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{t('tracking.callDriver')} • {activeVehicle.driverPhone}</span>
                      </a>
                      <a
                        href={currentEvidence.image}
                        download={`BangChung_${activeVehicle.plate}_${currentEvidence.time}.jpg`}
                        className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title={t('tracking.downloadEvidence')}
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* =============================================================
                CARD 2: THƯ VIỆN LỊCH SỬ CÁC HÌNH ẢNH TRƯỚC ĐÓ (HISTORY GALLERY)
                ============================================================= */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-600" />
                    {t('tracking.historyGalleryTitle')}
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {filteredHistory.length} {t('tracking.historyImagesCount')}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('tracking.historyHint')}
                  </p>
                </div>

                {/* Bộ lọc loại sự cố lịch sử */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    onClick={() => setEvidenceFilter('ALL')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${evidenceFilter === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('tracking.historyTabAll')}
                  </button>
                  <button
                    onClick={() => setEvidenceFilter('DROWSY')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${evidenceFilter === 'DROWSY' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('tracking.historyTabDrowsy')}
                  </button>
                  <button
                    onClick={() => setEvidenceFilter('YAWN')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${evidenceFilter === 'YAWN' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('tracking.historyTabYawn')}
                  </button>
                  <button
                    onClick={() => setEvidenceFilter('HEAD_DROP')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${evidenceFilter === 'HEAD_DROP' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {t('tracking.historyTabHeadDrop')}
                  </button>
                </div>
              </div>

              {/* Lưới các ảnh chụp trước đó hoặc Empty State */}
              {filteredHistory.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-slate-50/60 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-inner ring-1 ring-emerald-200/60">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800">
                    {t('tracking.emptyHistoryTitle')}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                    {t('tracking.emptyHistoryDesc')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setLightboxImage(item.image)}
                      className="bg-slate-50 rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-sky-300 transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="relative h-44 bg-slate-900 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.typeName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />

                        <div className="absolute top-2 left-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow ${item.severity === 'HIGH'
                              ? 'bg-rose-600 text-white'
                              : item.severity === 'MEDIUM'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                              }`}
                          >
                            {item.typeName}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-lg text-white opacity-0 group-hover:opacity-100 transition">
                          <ZoomIn className="w-3.5 h-3.5" />
                        </div>

                        <div className="absolute bottom-2 left-2 right-2 text-white text-[11px] font-mono flex justify-between items-center">
                          <span>🕒 {item.time} • {item.date}</span>
                          <span>⚡ {item.speed}</span>
                        </div>
                      </div>

                      <div className="p-3 text-xs flex flex-col justify-between flex-1">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] mb-1 line-clamp-1">
                            {item.typeName} • {item.duration || '2.0s'}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            📍 {item.location}
                          </p>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[10px] text-slate-400">
                          <span className="truncate max-w-[180px]">{item.actionTaken}</span>
                          <span className="text-sky-600 font-bold group-hover:underline flex items-center gap-0.5">
                            {t('tracking.zoom')} <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* =========================================================================
          3. LIGHTBOX: XEM TOÀN MÀN HÌNH KHI BẤM VÀO BẤT KỲ ẢNH NÀO
          ========================================================================= */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-white">
              <span className="text-xs font-mono font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                {t('tracking.lightboxTitle')} • {activeVehicle.plate}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage}
                  download="BangChung_ChiTiet.jpg"
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('tracking.downloadEvidence')}
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center p-2 bg-slate-950">
              <img
                src={lightboxImage}
                alt={t('tracking.fullscreenAlt')}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
