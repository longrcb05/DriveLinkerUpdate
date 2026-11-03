/**
 * @file vehicleService.ts
 * @description Unified Vehicle Service & Storage Adapter for DriveLinker.
 * Quản lý phương tiện tập trung, phân lập dữ liệu đa doanh nghiệp (tenantId)
 * và tuân thủ máy trạng thái hữu hạn 6 cấp độ nghiêm ngặt.
 */

export type VehicleStatus =
  | 'AVAILABLE'
  | 'RENTED'
  | 'RESERVED'
  | 'MAINTENANCE'
  | 'PENDING_INSPECTION'
  | 'INACTIVE';

export interface Vehicle {
  id: string; // Biển số xe hoặc mã định danh duy nhất (VD: '43A-112.22')
  plate: string;
  brand: string;
  model: string;
  year: number;
  payload: string;
  status: VehicleStatus;
  driver?: string;
  driverPhone?: string;
  speed?: string;
  lat?: number;
  lng?: number;
  gpsOnline?: boolean;
  cameraOnline?: boolean;
  tenantId: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

export interface VehicleFilter {
  status?: VehicleStatus | 'ALL';
  search?: string;
}

const STORAGE_KEY = 'sys_vehicles';

// Dữ liệu hạt giống mặc định cho các công ty nếu storage rỗng
const SEED_VEHICLES: Vehicle[] = [
  // --- COMPANY_A (Đà Nẵng & Miền Trung) ---
  {
    id: '43A-112.22',
    plate: '43A-112.22',
    brand: 'Hyundai',
    model: 'Solati 16 Chỗ',
    year: 2024,
    payload: '16 Chỗ ngồi',
    status: 'RENTED',
    driver: 'Trần Văn Bình',
    driverPhone: '0905.123.456',
    speed: '70 km/h',
    lat: 16.054407,
    lng: 108.202167,
    gpsOnline: true,
    cameraOnline: true,
    tenantId: 'COMPANY_A',
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now(),
  },
  {
    id: '29C-123.45',
    plate: '29C-123.45',
    brand: 'Isuzu',
    model: 'Forward N-Series',
    year: 2023,
    payload: 'Xe Tải 5 Tấn',
    status: 'AVAILABLE',
    driver: 'Nguyễn Văn A',
    driverPhone: '0912.888.999',
    speed: '0 km/h',
    lat: 16.047079,
    lng: 108.206230,
    gpsOnline: true,
    cameraOnline: true,
    tenantId: 'COMPANY_A',
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now(),
  },
  {
    id: '51D-987.65',
    plate: '51D-987.65',
    brand: 'Hino',
    model: '500 Series FL',
    year: 2022,
    payload: 'Xe Tải 8 Tấn',
    status: 'RESERVED',
    driver: 'Chưa xếp tài',
    driverPhone: '',
    speed: '0 km/h',
    lat: 16.055000,
    lng: 108.215000,
    gpsOnline: true,
    cameraOnline: false,
    tenantId: 'COMPANY_A',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now(),
  },
  {
    id: '15C-456.78',
    plate: '15C-456.78',
    brand: 'Kia',
    model: 'K250 Frontier',
    year: 2021,
    payload: 'Xe Tải 2.4 Tấn',
    status: 'MAINTENANCE',
    driver: 'Đang bảo dưỡng định kỳ',
    driverPhone: '',
    speed: '0 km/h',
    lat: 16.035000,
    lng: 108.225000,
    gpsOnline: false,
    cameraOnline: false,
    tenantId: 'COMPANY_A',
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now(),
    notes: 'Thay dầu nhớt máy và kiểm tra hệ thống phanh ABS.',
  },
  {
    id: '43B-789.01',
    plate: '43B-789.01',
    brand: 'Ford',
    model: 'Transit DCar',
    year: 2023,
    payload: '10 Chỗ VIP',
    status: 'PENDING_INSPECTION',
    driver: 'Vừa hoàn tất chuyến',
    driverPhone: '0935.444.555',
    speed: '0 km/h',
    lat: 16.060000,
    lng: 108.210000,
    gpsOnline: true,
    cameraOnline: false,
    tenantId: 'COMPANY_A',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now(),
    notes: 'Chờ vệ sinh nội thất và kiểm tra ngoại quan sau chuyến đi.',
  },

  // --- COMPANY_B (Hồ Chí Minh) ---
  {
    id: '51F-888.11',
    plate: '51F-888.11',
    brand: 'Volvo',
    model: 'FH16 750',
    year: 2024,
    payload: 'Xe Đầu Kéo 15 Tấn',
    status: 'RENTED',
    driver: 'Phạm Văn D',
    driverPhone: '0978.111.222',
    speed: '50 km/h',
    lat: 10.762622,
    lng: 106.660172,
    gpsOnline: true,
    cameraOnline: true,
    tenantId: 'COMPANY_B',
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now(),
  },
  {
    id: '51G-999.22',
    plate: '51G-999.22',
    brand: 'Thaco',
    model: 'Mobihome 36 Phòng',
    year: 2023,
    payload: 'Xe Khách Giường Nằm',
    status: 'AVAILABLE',
    driver: 'Hoàng Thị E',
    driverPhone: '0988.222.333',
    speed: '0 km/h',
    lat: 10.775000,
    lng: 106.700000,
    gpsOnline: true,
    cameraOnline: true,
    tenantId: 'COMPANY_B',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now(),
  },

  // --- COMPANY_C (Hà Nội) ---
  {
    id: '29A-111.11',
    plate: '29A-111.11',
    brand: 'Ford',
    model: 'Ranger Raptor',
    year: 2024,
    payload: 'Xe Bán Tải 5 Chỗ',
    status: 'AVAILABLE',
    driver: 'Vũ Thị H',
    driverPhone: '0911.333.444',
    speed: '0 km/h',
    lat: 21.028511,
    lng: 105.804817,
    gpsOnline: true,
    cameraOnline: true,
    tenantId: 'COMPANY_C',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now(),
  },
];

class VehicleService {
  /**
   * Khởi tạo kho dữ liệu phương tiện an toàn nếu chưa có trong LocalStorage.
   */
  private initStorage(): Vehicle[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_VEHICLES));
      return SEED_VEHICLES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_VEHICLES));
      return SEED_VEHICLES;
    }
  }

  private saveStorage(vehicles: Vehicle[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    // Phát sự kiện đồng bộ đa Tab và thông báo cho các component trong cùng tab
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('dl_vehicles_updated', { detail: vehicles }));
  }

  /**
   * Lấy danh sách phương tiện theo Doanh nghiệp (tenantId) kèm bộ lọc tìm kiếm & trạng thái.
   */
  async getFleetList(tenantId: string, filter?: VehicleFilter): Promise<Vehicle[]> {
    const all = this.initStorage();
    let tenantVehicles = all.filter(v => v.tenantId === tenantId);

    if (filter?.status && filter.status !== 'ALL') {
      tenantVehicles = tenantVehicles.filter(v => v.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      tenantVehicles = tenantVehicles.filter(
        v =>
          v.plate.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          (v.driver && v.driver.toLowerCase().includes(q))
      );
    }

    return tenantVehicles;
  }

  /**
   * Lấy chi tiết phương tiện theo ID / Biển số.
   */
  async getVehicleById(tenantId: string, id: string): Promise<Vehicle | null> {
    const all = this.initStorage();
    const found = all.find(v => v.tenantId === tenantId && (v.id === id || v.plate === id));
    return found || null;
  }

  /**
   * Thêm mới phương tiện vào doanh nghiệp. Kiểm tra chống trùng biển số.
   */
  async createVehicle(
    tenantId: string,
    data: {
      plate: string;
      brand: string;
      model: string;
      year: number;
      payload: string;
      status?: VehicleStatus;
      driver?: string;
      driverPhone?: string;
      notes?: string;
    }
  ): Promise<Vehicle> {
    const all = this.initStorage();
    const cleanPlate = data.plate.trim().toUpperCase();

    // Kiểm tra trùng biển số trong cùng doanh nghiệp
    const isExisted = all.some(
      v => v.tenantId === tenantId && v.plate.toUpperCase() === cleanPlate
    );
    if (isExisted) {
      throw new Error(`Biển số xe "${cleanPlate}" đã tồn tại trong hệ thống!`);
    }

    const now = Date.now();
    const newVehicle: Vehicle = {
      id: cleanPlate,
      plate: cleanPlate,
      brand: data.brand.trim() || 'Hyundai',
      model: data.model.trim() || 'Thương mại',
      year: Number(data.year) || new Date().getFullYear(),
      payload: data.payload.trim() || 'Xe Tải',
      status: data.status || 'AVAILABLE',
      driver: data.driver?.trim() || 'Chưa xếp tài',
      driverPhone: data.driverPhone?.trim() || '',
      speed: '0 km/h',
      lat: 16.047079 + (Math.random() - 0.5) * 0.02,
      lng: 108.206230 + (Math.random() - 0.5) * 0.02,
      gpsOnline: true,
      cameraOnline: false,
      tenantId,
      createdAt: now,
      updatedAt: now,
      notes: data.notes?.trim() || '',
    };

    all.unshift(newVehicle);
    this.saveStorage(all);
    return newVehicle;
  }

  /**
   * Cập nhật thông tin phương tiện.
   */
  async updateVehicle(
    tenantId: string,
    id: string,
    data: Partial<Omit<Vehicle, 'id' | 'tenantId' | 'createdAt'>>
  ): Promise<Vehicle> {
    const all = this.initStorage();
    const index = all.findIndex(v => v.tenantId === tenantId && (v.id === id || v.plate === id));
    if (index === -1) {
      throw new Error(`Không tìm thấy phương tiện "${id}"`);
    }

    const updatedVehicle: Vehicle = {
      ...all[index],
      ...data,
      updatedAt: Date.now(),
    };

    all[index] = updatedVehicle;
    this.saveStorage(all);
    return updatedVehicle;
  }

  /**
   * Cập nhật trạng thái xe theo Máy trạng thái hữu hạn 6 cấp độ.
   * Ngăn chặn việc chuyển trực tiếp từ RENTED sang AVAILABLE mà chưa qua PENDING_INSPECTION.
   */
  async updateVehicleStatus(
    tenantId: string,
    plateOrId: string,
    targetStatus: VehicleStatus,
    reason?: string
  ): Promise<Vehicle> {
    const vehicle = await this.getVehicleById(tenantId, plateOrId);
    if (!vehicle) {
      throw new Error(`Không tìm thấy phương tiện "${plateOrId}"`);
    }

    const currentStatus = vehicle.status;

    // RÀNG BUỘC MÁY TRẠNG THÁI:
    // 1. Xe đang thuê (RENTED) không được phép nhảy trực tiếp sang AVAILABLE
    if (currentStatus === 'RENTED' && targetStatus === 'AVAILABLE') {
      throw new Error(
        'Vi phạm quy trình: Phương tiện đang thuê (RENTED) bắt buộc phải chuyển sang Chờ kiểm tra (PENDING_INSPECTION) trước khi được xác nhận Sẵn sàng (AVAILABLE)!'
      );
    }

    return this.updateVehicle(tenantId, vehicle.id, {
      status: targetStatus,
      notes: reason ? `${vehicle.notes || ''} [${new Date().toLocaleDateString('vi-VN')}]: ${reason}`.trim() : vehicle.notes,
    });
  }

  /**
   * Xóa phương tiện khỏi hệ thống.
   * Chặn xóa nếu xe đang trong hợp đồng thuê RENTED.
   */
  async deleteVehicle(tenantId: string, id: string): Promise<boolean> {
    const all = this.initStorage();
    const target = all.find(v => v.tenantId === tenantId && (v.id === id || v.plate === id));
    if (!target) {
      throw new Error(`Không tìm thấy phương tiện "${id}"`);
    }

    if (target.status === 'RENTED') {
      throw new Error('Không thể xóa phương tiện đang trong hợp đồng thuê (RENTED). Vui lòng hoàn tất thu hồi xe trước khi xóa!');
    }

    const remaining = all.filter(v => !(v.tenantId === tenantId && (v.id === id || v.plate === id)));
    this.saveStorage(remaining);
    return true;
  }
}

export const vehicleService = new VehicleService();

