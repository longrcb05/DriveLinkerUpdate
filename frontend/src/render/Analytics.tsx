/**
 * @file Analytics.tsx
 * @module Frontend/Analytics
 * @description Báo cáo Phân tích An toàn Giao thông & Thống kê Rủi ro Đội xe (Fleet Safety & AI Infraction Analytics).
 * 
 * KIẾN TRÚC & MÔ HÌNH DỮ LIỆU BÁO CÁO:
 * 1. Sơ đồ Burndown Triệt tiêu Rủi ro (Incident Burndown Chart):
 *    - Mô phỏng tốc độ xử lý và triệt tiêu các cảnh báo an toàn phát sinh theo từng khung giờ trong ngày làm việc.
 *    - Trục tung thể hiện số lượng vi phạm còn tồn đọng; trục hoành là các mốc thời gian từ 07:00 đến 21:00.
 * 
 * 2. Phân bổ Vi phạm Theo Giờ & Cơ cấu Rủi ro:
 *    - Biểu đồ Cột (Bar Chart): Thống kê mật độ sự cố tập trung vào các khung giờ cao điểm hoặc giờ tài xế dễ buồn ngủ (13:00 - 15:00).
 *    - Biểu đồ Tròn (Pie Chart): Phân loại tỷ lệ các nhóm hành vi vi phạm: Nhắm mắt kéo dài (Drowsiness), Ngáp liên tục, Mất tập trung, Vượt tốc độ.
 * 
 * 3. Kết xuất Báo cáo CSV Chuẩn Hóa (UTF-8 CSV Exporter):
 *    - Tạo chuỗi CSV có tiền tố BOM `\uFEFF` để Excel và Google Sheets mở file tiếng Việt có dấu không bị lỗi font.
 *    - Đóng gói dữ liệu gồm Mã sự cố, Thời gian, Biển số, Tài xế, Loại vi phạm, Mức độ và Trạng thái xử lý.
 */

import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  Download, ChevronRight, AlertTriangle, ShieldCheck,
  Activity, BarChart3, PieChart, FileText, Loader2,
  TrendingDown, Flame, CheckCircle2, Clock
} from 'lucide-react';

const todayStr = new Date().toISOString().split('T')[0];

const RAW_EVENTS = [
  // --- Dữ liệu ngày hiện tại (Hôm nay) ---
  { id: 'EVT-017', date: todayStr, time: '21:15:00', vehicle: '15C-456.78', driver: 'Lê Văn C', type: 'Ngáp liên tục', severity: 'LOW', status: 'UNRESOLVED' },
  { id: 'EVT-016', date: todayStr, time: '19:40:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Mất tập trung', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-015', date: todayStr, time: '17:20:00', vehicle: '43A-112.22', driver: 'Hoàng Văn D', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-014', date: todayStr, time: '15:10:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'RESOLVED' },
  { id: 'EVT-013', date: todayStr, time: '14:35:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'UNRESOLVED' },
  { id: 'EVT-012', date: todayStr, time: '14:05:00', vehicle: '15C-456.78', driver: 'Lê Văn C', type: 'Ngáp liên tục', severity: 'LOW', status: 'RESOLVED' },
  { id: 'EVT-011', date: todayStr, time: '11:20:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-010', date: todayStr, time: '09:15:00', vehicle: '43A-112.22', driver: 'Hoàng Văn D', type: 'Mất tập trung', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-009', date: todayStr, time: '07:50:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Ngáp liên tục', severity: 'LOW', status: 'RESOLVED' },

  // --- Dữ liệu test ngày 30/10 ---
  { id: 'EVT-008', date: '2026-10-30', time: '16:45:00', vehicle: '15C-456.78', driver: 'Lê Văn C', type: 'Ngáp liên tục', severity: 'LOW', status: 'UNRESOLVED' },
  { id: 'EVT-007', date: '2026-10-30', time: '11:20:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Mất tập trung', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-006', date: '2026-10-30', time: '08:15:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },

  // --- Dữ liệu test ngày 29/10 ---
  { id: 'EVT-005', date: '2026-10-29', time: '14:30:00', vehicle: '43A-112.22', driver: 'Hoàng Văn D', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'UNRESOLVED' },
  { id: 'EVT-004', date: '2026-10-29', time: '09:10:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },

  // --- Dữ liệu cũ ---
  { id: 'EVT-001', date: '2026-10-28', time: '10:15:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'UNRESOLVED' },
  { id: 'EVT-002', date: '2026-10-28', time: '09:30:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-003', date: '2026-10-27', time: '14:20:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Ngáp liên tục', severity: 'LOW', status: 'RESOLVED' },
];

export default function Analytics() {
  const { language, t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isExporting, setIsExporting] = useState(false);

  const getEventTypeName = (type: string) => {
    if (type === 'Nhắm mắt kéo dài' || type === 'Ngủ gật / Nhắm mắt') return t('analytics.typeDrowsy');
    if (type === 'Ngáp liên tục') return t('analytics.typeYawn');
    if (type === 'Mất tập trung') return t('analytics.typeDistracted');
    if (type === 'Vượt tốc độ') return t('analytics.typeSpeeding');
    return type;
  };

  // Chế độ hiển thị biểu đồ: 'burn' (Sơ đồ Burndown) hoặc 'bar' (Biểu đồ Cột)
  const [chartMode, setChartMode] = useState<'burn' | 'bar'>('burn');
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  /**
   * Lọc sự kiện theo ngày được chọn
   */
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return RAW_EVENTS;
    return RAW_EVENTS.filter(e => e.date === selectedDate);
  }, [selectedDate]);

  /**
   * Thống kê KPI tổng quan
   */
  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const unresolved = filteredEvents.filter(e => e.status === 'UNRESOLVED').length;
    const resolved = total - unresolved;
    const resolveRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    const highRiskCount = filteredEvents.filter(e => e.severity === 'HIGH').length;
    const safetyScore = Math.max(0, 100 - (highRiskCount * 10) - ((total - highRiskCount) * 2));

    return { total, unresolved, resolved, resolveRate, safetyScore, highRiskCount };
  }, [filteredEvents]);

  /**
   * 8 Khung giờ chuẩn hóa trong ngày phục vụ tính toán Sơ đồ Burndown & Bar Chart
   */
  const timeSlotsConfig = [
    { label: '06:00', start: 6, end: 8, ideal: 12, actual: 12, defaultCount: 2, defaultHigh: 0, defaultMed: 1, defaultLow: 1 },
    { label: '08:00', start: 8, end: 10, ideal: 10.3, actual: 11, defaultCount: 3, defaultHigh: 1, defaultMed: 2, defaultLow: 0 },
    { label: '10:00', start: 10, end: 12, ideal: 8.6, actual: 8, defaultCount: 2, defaultHigh: 0, defaultMed: 1, defaultLow: 1 },
    { label: '12:00', start: 12, end: 14, ideal: 6.9, actual: 6, defaultCount: 1, defaultHigh: 0, defaultMed: 0, defaultLow: 1 },
    { label: '14:00', start: 14, end: 16, ideal: 5.1, actual: 7, defaultCount: 4, defaultHigh: 2, defaultMed: 1, defaultLow: 1 }, // Đỉnh điểm buồn ngủ ca chiều
    { label: '16:00', start: 16, end: 18, ideal: 3.4, actual: 4, defaultCount: 2, defaultHigh: 0, defaultMed: 2, defaultLow: 0 },
    { label: '18:00', start: 18, end: 20, ideal: 1.7, actual: 2, defaultCount: 1, defaultHigh: 0, defaultMed: 1, defaultLow: 0 },
    { label: '20:00', start: 20, end: 22, ideal: 0, actual: 1, defaultCount: 1, defaultHigh: 0, defaultMed: 0, defaultLow: 1 },
  ];

  // Tọa độ hình học và dữ liệu phân bổ trên SVG
  const chartPoints = useMemo(() => {
    return timeSlotsConfig.map((slot, i) => {
      const x = 55 + (i / 7) * 545; // Trục X từ 55px đến 600px

      // Lọc các sự kiện phát sinh trong khung giờ này
      const slotEvents = filteredEvents.filter(e => {
        const hour = parseInt(e.time.split(':')[0], 10);
        return hour >= slot.start && hour < slot.end;
      });

      const count = slotEvents.length > 0 ? slotEvents.length : slot.defaultCount;
      const high = slotEvents.length > 0 ? slotEvents.filter(e => e.severity === 'HIGH').length : slot.defaultHigh;
      const med = slotEvents.length > 0 ? slotEvents.filter(e => e.severity === 'MEDIUM').length : slot.defaultMed;
      const low = slotEvents.length > 0 ? slotEvents.filter(e => e.severity === 'LOW').length : slot.defaultLow;

      // Tính tọa độ Y: thang giá trị từ 0 đến 12 (155px chiều cao biểu đồ)
      const yActual = 20 + ((12 - slot.actual) / 12) * 155;
      const yIdeal = 20 + ((12 - slot.ideal) / 12) * 155;

      return {
        ...slot,
        x,
        yActual,
        yIdeal,
        count,
        high,
        med,
        low,
      };
    });
  }, [filteredEvents]);

  // Đường vẽ SVG Burndown Line & Area
  const { burnLinePath, burnAreaPath } = useMemo(() => {
    if (!chartPoints.length) return { burnLinePath: '', burnAreaPath: '' };

    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];

    const lineCommands = chartPoints.map((pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.yActual}` : `L ${pt.x} ${pt.yActual}`)).join(' ');
    const areaCommands = `${lineCommands} L ${last.x} 175 L ${first.x} 175 Z`;

    return { burnLinePath: lineCommands, burnAreaPath: areaCommands };
  }, [chartPoints]);

  /**
   * Kết xuất báo cáo CSV
   */
  const handleExportCSV = () => {
    setIsExporting(true);

    setTimeout(() => {
      const headers = [t('analytics.colId'), 'Date', t('analytics.colTime'), t('analytics.colVehicle'), t('analytics.colDriver'), t('analytics.colType'), t('analytics.colSeverity'), t('analytics.colStatus')];
      const csvRows = [headers.join(',')];

      filteredEvents.forEach(e => {
        csvRows.push(`${e.id},${e.date},${e.time},${e.vehicle},${e.driver},${e.type},${e.severity},${e.status}`);
      });

      const csvContent = "data:text/csv;charset=utf-8,﻿" + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `BaoCao_VanHanh_${selectedDate || 'ALL'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
    }, 800);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC]">

      {/* KHU VỰC 1: HEADER & CÔNG CỤ BỘ LỌC */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          <span className="hover:text-slate-800 cursor-pointer transition-colors">{t('analytics.breadcrumbMenu')}</span>
          <ChevronRight className="w-3 h-3 mx-2" />
          <span className="text-sky-600 cursor-pointer">{t('nav.analytics')}</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">{t('analytics.title')}</h2>
            <p className="text-xs text-slate-500 mt-1">{t('analytics.subtitle')}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ chọn ngày (Date Picker) */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent transition-all shadow-sm cursor-pointer"
              />
            </div>

            {/* Nút xuất báo cáo */}
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="bg-[#0EA5E9] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-sky-600 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? t('analytics.exporting') : t('analytics.exportCsv')}
            </button>
          </div>
        </div>
      </div>

      {/* KHU VỰC 2: THẺ THỐNG KÊ (KPI CARDS) */}
      <div className="px-6 grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('analytics.totalViolations')}</p>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
        </div>

        <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">{t('tracking.kpiDrowsyAlert')}</p>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-3xl font-bold text-rose-600">{stats.highRiskCount}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('analytics.resolved')}</p>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.resolveRate}%</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('analytics.safetyScore')}</p>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.safetyScore} <span className="text-sm font-medium text-slate-500">/ 100</span></h3>
        </div>
      </div>

      {/* KHU VỰC 3: BIỂU ĐỒ TRỰC QUAN (CHARTS) */}
      <div className="px-6 flex gap-4 mb-6">
        {/* KHU VỰC 3A: SƠ ĐỒ PHÂN PHỐI & BURNDOWN CHART THEO THỜI GIAN */}
        <div className="flex-[2] bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between min-h-[350px]">
          {/* Header biểu đồ & Nút chuyển chế độ (Burndown vs Bar Chart) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center border border-sky-500/20">
                {chartMode === 'burn' ? (
                  <TrendingDown className="w-4 h-4 text-sky-600" />
                ) : (
                  <BarChart3 className="w-4 h-4 text-sky-600" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {t('analytics.distributionTitle')}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200/80 font-mono">
                    {chartMode === 'burn' ? 'BURNDOWN SLA' : 'HOURLY BAR'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {chartMode === 'burn'
                    ? t('analytics.burndownSubtitle')
                    : t('analytics.barSubtitle')}
                </p>
              </div>
            </div>

            {/* Bộ chuyển đổi chế độ biểu đồ */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setChartMode('burn')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'burn'
                    ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-sky-500" />
                <span>{t('analytics.burndownMode')}</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  chartMode === 'bar'
                    ? 'bg-white text-sky-700 shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('analytics.barMode')}</span>
              </button>
            </div>
          </div>

          {/* Thanh chỉ số nhanh & Chú thích (Legend) */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                <span>{t('analytics.resolvePerformance')}:</span>
                <strong className="text-emerald-700 font-bold">{stats.resolveRate}% {t('analytics.completed')}</strong>
              </span>
              <span className="hidden md:inline-block text-slate-300">|</span>
              <span className="hidden md:flex items-center gap-1.5 font-semibold text-slate-600">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>{t('analytics.peakRisk')}:</span>
                <span className="text-rose-600 font-bold bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded text-[11px]">14:00 - 16:00</span>
              </span>
            </div>

            {/* Chú giải tương ứng theo chế độ */}
            <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
              {chartMode === 'burn' ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 h-0.5 border-b-2 border-dashed border-slate-400 inline-block" />
                    <span>{t('analytics.slaTarget')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                    <span>{t('analytics.pendingIssues')}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>{t('analytics.highRisk')}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-600">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>{t('analytics.medLowRisk')}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Vùng vẽ đồ thị SVG linh hoạt & sắc nét */}
          <div className="relative w-full h-[220px] select-none">
            <svg
              viewBox="0 0 640 210"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Gradient nền diện tích của Burndown */}
                <linearGradient id="burnAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#0EA5E9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
                </linearGradient>

                {/* Gradient cho cột Bar Chart tiêu chuẩn */}
                <linearGradient id="barSkyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0284C7" />
                </linearGradient>

                {/* Gradient cho cột Bar Chart nguy cơ cao */}
                <linearGradient id="barRoseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>

              {/* Lưới tọa độ ngang (Horizontal Grid Lines) */}
              {[12, 9, 6, 3, 0].map((val, idx) => {
                const y = 20 + ((12 - val) / 12) * 155;
                return (
                  <g key={idx}>
                    <line
                      x1="40"
                      y1={y}
                      x2="615"
                      y2={y}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                      strokeDasharray={val === 0 ? "none" : "3 3"}
                    />
                    <text
                      x="32"
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-mono font-medium"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* TRƯỜNG HỢP 1: SƠ ĐỒ BURNDOWN (BURN CHART) */}
              {chartMode === 'burn' && (
                <>
                  {/* Đường chuẩn mục tiêu lý tưởng (Ideal Burndown Baseline) */}
                  <line
                    x1="55"
                    y1={20 + ((12 - 12) / 12) * 155}
                    x2="600"
                    y2={20 + ((12 - 0) / 12) * 155}
                    stroke="#94A3B8"
                    strokeWidth="2"
                    strokeDasharray="5 5"
                  />

                  {/* Vùng diện tích Gradient thực tế (Actual Burndown Area) */}
                  <path
                    d={burnAreaPath}
                    fill="url(#burnAreaGrad)"
                    className="transition-all duration-700"
                  />

                  {/* Đường nối thực tế (Actual Burndown Line) */}
                  <path
                    d={burnLinePath}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-700 drop-shadow-sm"
                  />

                  {/* Các điểm mốc thời gian (Nodes) */}
                  {chartPoints.map((pt, idx) => (
                    <g
                      key={idx}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredSlot(idx)}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {hoveredSlot === idx && (
                        <>
                          <line x1={pt.x} y1="20" x2={pt.x} y2="175" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" />
                          <circle cx={pt.x} cy={pt.yActual} r="12" className="fill-sky-500/20 animate-ping" />
                        </>
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.yActual}
                        r={hoveredSlot === idx ? 6 : 4}
                        className="fill-white stroke-sky-600 stroke-[3] transition-all drop-shadow-sm"
                      />
                    </g>
                  ))}
                </>
              )}

              {/* TRƯỜNG HỢP 2: BIỂU ĐỒ CỘT (BAR CHART) */}
              {chartMode === 'bar' && (
                <>
                  {chartPoints.map((pt, idx) => {
                    const barHeight = Math.max(8, (pt.count / 6) * 145);
                    const barY = 175 - barHeight;
                    const isHighRisk = pt.high > 0;

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredSlot(idx)}
                        onMouseLeave={() => setHoveredSlot(null)}
                      >
                        {/* Ray trượt nền mờ */}
                        <rect
                          x={pt.x - 17}
                          y="20"
                          width="34"
                          height="155"
                          rx="6"
                          className="fill-slate-50/80 hover:fill-slate-100 transition-colors"
                        />

                        {/* Cột dữ liệu chính */}
                        <rect
                          x={pt.x - 17}
                          y={barY}
                          width="34"
                          height={barHeight}
                          rx="6"
                          fill={isHighRisk ? 'url(#barRoseGrad)' : 'url(#barSkyGrad)'}
                          className="transition-all duration-500 hover:brightness-110 drop-shadow-xs"
                        />

                        {/* Số đếm trên đầu cột */}
                        <text
                          x={pt.x}
                          y={barY - 6}
                          textAnchor="middle"
                          className="text-[11px] font-mono font-extrabold fill-slate-700"
                        >
                          {pt.count}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* Nhãn trục thời gian X */}
              {chartPoints.map((pt, idx) => (
                <text
                  key={idx}
                  x={pt.x}
                  y="196"
                  textAnchor="middle"
                  className={`text-[11px] font-mono font-bold transition-colors ${
                    hoveredSlot === idx ? 'fill-sky-600 font-extrabold' : 'fill-slate-500'
                  }`}
                >
                  {pt.label}
                </text>
              ))}
            </svg>

            {/* Tooltip nổi bật khi người dùng rê chuột qua mốc thời gian */}
            {hoveredSlot !== null && chartPoints[hoveredSlot] && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-900/95 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-slate-700 backdrop-blur-sm -translate-x-1/2 transition-all duration-150 animate-in fade-in-50 zoom-in-95"
                style={{
                  left: `${(chartPoints[hoveredSlot].x / 640) * 100}%`,
                  top: '10px',
                }}
              >
                <div className="flex items-center gap-2 border-b border-slate-700/80 pb-1 mb-1.5">
                  <span className="font-bold text-sky-400 font-mono">
                    {t('analytics.timeFrame')}: {chartPoints[hoveredSlot].label} - {chartPoints[hoveredSlot].end}:00
                  </span>
                </div>
                {chartMode === 'burn' ? (
                  <div className="space-y-1 text-[11px]">
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-300">{t('analytics.actualPending')}:</span>
                      <strong className="text-amber-400 font-mono">{chartPoints[hoveredSlot].actual} {t('analytics.casesCount')}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-400">{t('analytics.idealSla')}:</span>
                      <span className="text-slate-300 font-mono">{chartPoints[hoveredSlot].ideal} {t('analytics.casesCount')}</span>
                    </p>
                    <p className="text-[10px] text-emerald-400 pt-0.5">
                      {t('analytics.resolvedShift', { count: chartPoints[hoveredSlot].count })}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px]">
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-300">{t('analytics.totalDetected')}:</span>
                      <strong className="text-sky-400 font-mono">{chartPoints[hoveredSlot].count} {t('analytics.casesCount')}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-rose-300">{t('analytics.highRiskLabel')}:</span>
                      <strong className="text-rose-400 font-mono">{chartPoints[hoveredSlot].high}</strong>
                    </p>
                    <p className="flex justify-between gap-4">
                      <span className="text-slate-400">{t('analytics.medReminder')}:</span>
                      <span className="text-slate-300 font-mono">{chartPoints[hoveredSlot].med + chartPoints[hoveredSlot].low}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* KHU VỰC 3B: PHÂN LOẠI VI PHẠM (PIE / BREAKDOWN) */}
        <div className="flex-[1] bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-500" /> {t('analytics.classificationTitle')}
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded">{stats.total} {t('analytics.casesCount')}</span>
          </div>

          <div className="flex-1 space-y-5">
            {[
              { label: t('analytics.typeDrowsy'), type: 'Nhắm mắt kéo dài', color: 'bg-rose-500' },
              { label: t('analytics.typeYawn'), type: 'Ngáp liên tục', color: 'bg-amber-500' },
              { label: t('analytics.typeDistracted'), type: 'Mất tập trung', color: 'bg-sky-500' },
              { label: t('analytics.typeSpeeding'), type: 'Vượt tốc độ', color: 'bg-indigo-500' }
            ].map((item, i) => {
              const count = filteredEvents.filter(e => e.type === item.type).length;
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

              return (
                <div key={i}>
                  <div className="flex justify-between text-[11px] font-bold mb-1.5 text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                      {item.label}
                    </span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KHU VỰC 4: BẢNG DỮ LIỆU CHI TIẾT (DATA TABLE) */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-800">{t('analytics.historyTableTitle')}</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="p-4">{t('analytics.colTime')}</th>
                  <th className="p-4">{t('analytics.colVehicle')}</th>
                  <th className="p-4">{t('analytics.colDriver')}</th>
                  <th className="p-4">{t('analytics.colType')}</th>
                  <th className="p-4 text-center">{t('analytics.colStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEvents.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600 font-medium">
                      {e.date} <span className="text-slate-400 ml-1">{e.time}</span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{e.vehicle}</td>
                    <td className="p-4 text-slate-600">{e.driver}</td>
                    <td className="p-4">
                      <span className="font-bold text-slate-700">{getEventTypeName(e.type)}</span>
                      <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border font-bold ${e.severity === 'HIGH' ? 'border-rose-200 text-rose-600 bg-rose-50' :
                        e.severity === 'MEDIUM' ? 'border-amber-200 text-amber-600 bg-amber-50' :
                          'border-sky-200 text-sky-600 bg-sky-50'
                        }`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-full ${e.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'
                        }`}>
                        {e.status === 'RESOLVED' ? t('analytics.resolved') : t('analytics.unresolved')}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Trạng thái rỗng (Empty State) khi bộ lọc không có kết quả */}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm font-medium">{t('analytics.emptyDate', { date: selectedDate || '---' })}</p>
                      <p className="text-xs text-slate-400 mt-1">{t('analytics.emptyDatePrompt')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
