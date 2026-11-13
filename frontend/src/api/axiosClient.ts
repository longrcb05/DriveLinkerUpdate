/**
 * @file axiosClient.ts
 * @module Frontend/API
 * @description HTTP Client tập trung (Centralized HTTP Client) xây dựng trên nền tảng Axios.
 * 
 * NGUYÊN TẮC THIẾT KẾ & TÍNH NĂNG CHÍNH:
 * 1. Base URL Configuration:
 *    - Tự động nhận diện biến môi trường `VITE_API_BASE_URL` (hỗ trợ deployment Vercel/Docker/Nginx).
 *    - Fallback về `http://localhost:3000/api` phục vụ môi trường phát triển cục bộ với Next.js Backend.
 * 
 * 2. Request Interceptor (Bộ tiền xử lý Request):
 *    - Tự động trích xuất `tenantId` từ LocalStorage và gắn vào Custom Header `X-Tenant-ID`.
 *    - Tự động trích xuất JWT Bearer Token từ `localStorage('token')` (dành cho người dùng Tenant)
 *      hoặc `sessionStorage('sys_core_token')` (dành cho Super Admin phiên ngắn hạn), sau đó
 *      tiêm vào Header chuẩn `Authorization: Bearer <token>`.
 * 
 * 3. Chuẩn hóa Định dạng Payload:
 *    - Mặc định header `Content-Type: application/json; charset=utf-8` cho mọi request.
 */

import axios from 'axios';

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Timeout 15s tránh treo request khi server phản hồi chậm
});

// ============================================================================
// REQUEST INTERCEPTOR: Tiêm Header Định danh Đa doanh nghiệp và JWT Token
// ============================================================================
axiosClient.interceptors.request.use(
  (config) => {
    // 1. Tiêm Header định danh doanh nghiệp (Multi-tenancy isolation)
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    // 2. Tiêm JWT Token xác thực (ưu tiên token người dùng, fallback về token phiên Super Admin)
    const token = localStorage.getItem('token') || sessionStorage.getItem('sys_core_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR: Xử lý tập trung phản hồi & mã lỗi phổ biến
// ============================================================================
axiosClient.interceptors.response.use(
  (response) => {
    // Trả về dữ liệu phản hồi thành công
    return response;
  },
  (error) => {
    // Xử lý khi Token hết hạn hoặc không có quyền (HTTP 401 Unauthorized)
    if (error.response && error.response.status === 401) {
      console.warn('[HTTP 401] Phiên đăng nhập đã hết hạn hoặc không hợp lệ.');
      // Giữ cơ chế không ngắt cưỡng bức để ưu tiên fallback MockData khi chạy demo
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
