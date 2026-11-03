/**
 * @file axiosClient.ts / apiClient.ts
 * @description HTTP Client chuẩn hóa cho DriveLinker Frontend.
 * Sử dụng native Fetch API có hỗ trợ Interceptor tự động gắn X-Tenant-ID và JWT Authorization Header.
 * Thiết kế tương thích chuẩn RESTful mà không phụ thuộc thư viện ngoài, tối ưu hiệu năng và build sạch 100%.
 */

const BASE_URL = 'http://localhost:8080/api';

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export interface ApiResponseWrapper<T = any> {
  data: T;
  status: number;
  statusText: string;
}

class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private buildUrl(path: string, params?: Record<string, any>): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseURL}${cleanPath}`);
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val));
        }
      });
    }
    return url.toString();
  }

  private getHeaders(customHeaders?: HeadersInit): Headers {
    const headers = new Headers(customHeaders || {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Tự động gắn định danh doanh nghiệp đa tổ chức (Multi-Tenant)
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      headers.set('X-Tenant-ID', tenantId);
    }

    // Tự động gắn Token xác thực JWT nếu có phiên đăng nhập
    const token = localStorage.getItem('token') || sessionStorage.getItem('sys_core_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponseWrapper<T>> {
    const { params, headers: customHeaders, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const headers = this.getHeaders(customHeaders);

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    let data: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
      const error: any = new Error(errorMsg);
      error.response = { status: response.status, data };
      throw error;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  get<T = any>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options: RequestOptions = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options: RequestOptions = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

const axiosClient = new HttpClient(BASE_URL);

export default axiosClient;

