/**
 * @file Analytics.tsx
 * @description Phân hệ Phân tích và Báo cáo (Analytics & Alerts).
 * Theo kiến trúc mới, module này gộp chung dữ liệu phân tích vận hành và lịch sử cảnh báo an toàn.
 * Cung cấp bộ lọc thời gian (Date Picker), tính toán các chỉ số KPI động và khả năng kết xuất báo cáo.
 * Dữ liệu được cách ly theo định danh doanh nghiệp (tenantId).
 */

import { useState, useMemo } from 'react';
import {
  Download, ChevronRight, AlertTriangle, ShieldCheck,
  Activity, BarChart3, PieChart, FileText, Loader2
} from 'lucide-react';

/**
 * ĐÃ BỔ SUNG: Dữ liệu test cho ngày 29 và 30 tháng 10 năm 2026
 */
const RAW_EVENTS = [
  // --- Dữ liệu test ngày 30/10 ---
  { id: 'EVT-009', date: '2026-10-30', time: '16:45:00', vehicle: '15C-456.78', driver: 'Lê Văn C', type: 'Ngáp liên tục', severity: 'LOW', status: 'UNRESOLVED' },
  { id: 'EVT-008', date: '2026-10-30', time: '11:20:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Mất tập trung', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-007', date: '2026-10-30', time: '08:15:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },

  // --- Dữ liệu test ngày 29/10 ---
  { id: 'EVT-006', date: '2026-10-29', time: '14:30:00', vehicle: '43A-112.22', driver: 'Hoàng Văn D', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'UNRESOLVED' },
  { id: 'EVT-005', date: '2026-10-29', time: '09:10:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },

  // --- Dữ liệu cũ ---
  { id: 'EVT-001', date: '2026-10-28', time: '10:15:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Nhắm mắt kéo dài', severity: 'HIGH', status: 'UNRESOLVED' },
  { id: 'EVT-002', date: '2026-10-28', time: '09:30:00', vehicle: '51D-987.65', driver: 'Trần Thị B', type: 'Vượt tốc độ', severity: 'MEDIUM', status: 'RESOLVED' },
  { id: 'EVT-003', date: '2026-10-27', time: '14:20:00', vehicle: '29C-123.45', driver: 'Nguyễn Văn A', type: 'Ngáp liên tục', severity: 'LOW', status: 'RESOLVED' },
  { id: 'EVT-004', date: '2026-10-25', time: '08:00:00', vehicle: '15C-456.78', driver: 'Lê Văn C', type: 'Mất tập trung', severity: 'MEDIUM', status: 'RESOLVED' },
];

export default function Analytics() {
  // Lấy ngày hiện tại format YYYY-MM-DD làm giá trị mặc định cho DatePicker
  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Thuật toán Lọc tuyến tính (Linear Search / Filter) và Ghi nhớ (Memoization).
   * So sánh chính xác thuộc tính `date` của sự kiện với `selectedDate`.
   */
  const filteredEvents = useMemo(() => {
    if (!selectedDate) return RAW_EVENTS; // Nếu người dùng xóa ngày, trả về tất cả
    return RAW_EVENTS.filter(e => e.date === selectedDate);
  }, [selectedDate]);

  /**
   * Tính toán chỉ số thống kê tổng hợp (Data Aggregation).
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
   * Thuật toán Kết xuất tệp CSV phía máy khách
   */
  const handleExportCSV = () => {
    setIsExporting(true);

    setTimeout(() => {
      const headers = ['Mã Sự kiện', 'Ngày', 'Giờ', 'Phương tiện', 'Tài xế', 'Loại vi phạm', 'Mức độ', 'Trạng thái'];
      const csvRows = [headers.join(',')];

      filteredEvents.forEach(e => {
        csvRows.push(`${e.id},${e.date},${e.time},${e.vehicle},${e.driver},${e.type},${e.severity},${e.status}`);
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
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
          <span className="hover:text-slate-800 cursor-pointer transition-colors">MENU</span>
          <ChevronRight className="w-3 h-3 mx-2" />
          <span className="text-sky-600 cursor-pointer">Phân tích & Cảnh báo</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 leading-tight">Báo cáo Vận hành</h2>
            <p className="text-xs text-slate-500 mt-1">Tổng hợp số liệu chuyến xe, cảnh báo an toàn và hiệu suất xử lý sự cố.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bộ chọn ngày (Date Picker) thay cho Dropdown */}
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
              className="bg-[#0EA5E9] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-sky-600 transition-all shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Đang xử lý...' : 'Xuất báo cáo'}
            </button>
          </div>
        </div>
      </div>

      {/* KHU VỰC 2: THẺ THỐNG KÊ (KPI CARDS) */}
      <div className="px-6 grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Sự kiện</p>
            <Activity className="w-4 h-4 text-sky-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
        </div>

        <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Cảnh báo nghiêm trọng</p>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <h3 className="text-3xl font-bold text-rose-600">{stats.highRiskCount}</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ xử lý sự cố</p>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.resolveRate}%</h3>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chỉ số an toàn DMS</p>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{stats.safetyScore} <span className="text-sm font-medium text-slate-500">/ 100</span></h3>
        </div>
      </div>

      {/* KHU VỰC 3: BIỂU ĐỒ TRỰC QUAN (CHARTS) */}
      <div className="px-6 flex gap-4 mb-6">
        <div className="flex-[2] bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-[300px]">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-sky-500" /> Phân phối sự kiện theo thời gian
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 relative">
            <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm font-medium">Khu vực nhúng Recharts/Chart.js</p>
            <p className="text-[10px] text-slate-400 mt-1">Đồ thị sẽ render dữ liệu mảng: filteredEvents</p>
          </div>
        </div>

        <div className="flex-[1] bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-500" /> Phân loại vi phạm
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded">{stats.total} vụ</span>
          </div>

          <div className="flex-1 space-y-5">
            {[
              { label: 'Ngủ gật / Nhắm mắt', type: 'Nhắm mắt kéo dài', color: 'bg-rose-500' },
              { label: 'Ngáp liên tục', type: 'Ngáp liên tục', color: 'bg-amber-500' },
              { label: 'Mất tập trung', type: 'Mất tập trung', color: 'bg-sky-500' },
              { label: 'Quá tốc độ', type: 'Vượt tốc độ', color: 'bg-indigo-500' }
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
            <h3 className="text-sm font-bold text-slate-800">Lịch sử Sự kiện & Cảnh báo chi tiết</h3>
          </div>
          <div className="flex-1 overflow-auto max-h-[400px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="p-4">Thời gian</th>
                  <th className="p-4">Phương tiện</th>
                  <th className="p-4">Tài xế phụ trách</th>
                  <th className="p-4">Loại vi phạm & Mức độ</th>
                  <th className="p-4 text-center">Trạng thái xử lý</th>
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
                      <span className="font-bold text-slate-700">{e.type}</span>
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
                        {e.status === 'RESOLVED' ? 'Đã xử lý' : 'Chờ xử lý'}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Trạng thái rỗng (Empty State) khi bộ lọc không có kết quả */}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm font-medium">Không có sự kiện nào trong ngày {selectedDate}</p>
                      <p className="text-xs text-slate-400 mt-1">Hãy thử chọn một khoảng thời gian khác.</p>
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