/**
 * api.js — Centralized API Service Layer
 * Purrfect Stay Admin Panel
 */

const BASE_URL = 'http://127.0.0.1:5000/api';

/* ─── AUTH TOKEN ─────────────────────────────────── */
function getToken() {
  return localStorage.getItem('access_token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  };
}

/* ─── BASE FETCH ─────────────────────────────────── */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: authHeaders(),
      ...options,
    });

    if (res.status === 401) {
      console.warn('Unauthorized — token may have expired');
    }

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[API Error] ${path}:`, err);
    return { ok: false, status: 0, data: { error: true, message: err.message } };
  }
}

/* ─── WINDOW.API ─────────────────────────────────── */
window.API = {

  /* --- Auth --- */
  auth: {
    login:  (username, password) => apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ staff_username: username, password }),
    }),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  },

  /* --- Staff --- */
  staff: {
    getAll:     ()           => apiFetch('/staff'),
    getById:    (id)         => apiFetch(`/staff/${id}`),
    create:     (data)       => apiFetch('/staff', { method: 'POST', body: JSON.stringify(data) }),
    update:     (id, data)   => apiFetch(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id)         => apiFetch(`/staff/${id}/deactivate`, { method: 'PATCH' }),
  },

  /* --- Customers --- */
  customers: {
    getAll:  (params = {}) => apiFetch('/customers?' + new URLSearchParams(params)),
    getById: (id)          => apiFetch(`/customers/${id}`),
    getPets: (id)          => apiFetch(`/customers/${id}/pets`),
    create:  (data)        => apiFetch('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id, data)    => apiFetch(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:  (id)          => apiFetch(`/customers/${id}`, { method: 'DELETE' }),
  },

  /* --- Bookings --- */
  bookings: {
    getAll:      (params = {}) => apiFetch('/bookings?' + new URLSearchParams(params)),
    getById:     (id)          => apiFetch(`/bookings/${id}`),
    create:      (data)        => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    checkin:     (id)          => apiFetch(`/bookings/${id}/checkin`, { method: 'PATCH' }),
    checkout:    (id, data)    => apiFetch(`/bookings/${id}/checkout`, { method: 'PATCH', body: JSON.stringify(data) }),
    cancel:      (id, data)    => apiFetch(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
    addAddon:    (id, data)    => apiFetch(`/bookings/${id}/addons`, { method: 'POST', body: JSON.stringify(data) }),
    getServices: ()            => apiFetch('/bookings/services'),
  },

  /* --- Rooms --- */
  rooms: {
    getAll:          ()         => apiFetch('/rooms'),
    getById:         (id)       => apiFetch(`/rooms/${id}`),
    getOptions:      ()         => apiFetch('/rooms/options'),
    create:          (data)     => apiFetch('/rooms', { method: 'POST', body: JSON.stringify(data) }),
    getAvailability: (p)        => apiFetch('/rooms/availability?' + new URLSearchParams(p)),
    update:          (id, data) => apiFetch(`/rooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete:          (id)       => apiFetch(`/rooms/${id}`, { method: 'DELETE' }),
  },

  /* --- Billing --- */
  billing: {
    getAll:   (params = {}) => apiFetch('/billing?' + new URLSearchParams(params)),
    getById:  (id)          => apiFetch(`/billing/${id}`),
    preview:  (bookingId)   => apiFetch('/billing/preview', { method: 'POST', body: JSON.stringify({ booking_id: bookingId }) }),
    update:   (id, data)    => apiFetch(`/billing/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    pay:      (id, data)    => apiFetch(`/billing/${id}/pay`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  /* --- Care Reports --- */
  care: {
    getAll:       (params = {}) => apiFetch('/care-reports?' + new URLSearchParams(params)),
    getActiveStays: ()          => apiFetch('/care-reports/active-stays'),
    create:       (data)        => apiFetch('/care-reports', { method: 'POST', body: JSON.stringify(data) }),
    uploadPhotos: (id, formData) => fetch(`${BASE_URL}/care-reports/${id}/photos`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData,
    }).then(r => r.json()),
  },

  /* --- Inventory --- */
  inventory: {
    getAll:   (params = {}) => apiFetch('/inventory?' + new URLSearchParams(params)),
    getAlerts: ()           => apiFetch('/inventory/alerts'),
    create:   (data)        => apiFetch('/inventory', { method: 'POST', body: JSON.stringify(data) }),
    update:   (id, data)    => apiFetch(`/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete:   (id)          => apiFetch(`/inventory/${id}`, { method: 'DELETE' }),
  },

  /* --- Analytics --- */
  analytics: {
    getDashboard: (params = {}) => apiFetch('/analytics/dashboard?' + new URLSearchParams(params)),
  },

  /* --- Audit Trail --- */
  audit: {
    getAll: (params = {}) => apiFetch('/audit?' + new URLSearchParams(params)),
  },

  /* --- Attendance --- */
  attendance: {
    clock:  (staffId, action) => apiFetch('/attendance/clock', {
      method: 'POST',
      body: JSON.stringify({ staff_id: staffId, action }),
    }),
    getAll: (params = {}) => apiFetch('/attendance?' + new URLSearchParams(params)),
  },

  /* --- Leave --- */
  leave: {
    getAll:   (params = {}) => apiFetch('/leave?' + new URLSearchParams(params)),
    approve:  (id, approvedBy, status) => apiFetch(`/leave/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, approved_by: approvedBy }),
    }),
  },

  /* --- Notifications --- */
  notifications: {
    getAll:     (params = {}) => apiFetch('/notifications?' + new URLSearchParams(params)),
    markRead:   (id)          => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: ()           => apiFetch('/notifications/read-all', { method: 'PATCH' }),
  },

  /* --- Dashboard (aggregate helper) --- */
  dashboard: {
    /**
     * โหลดข้อมูลทั้งหมดที่ Dashboard ต้องการพร้อมกัน
     * คืนค่า object { bookings, notifications, staff, rooms, analytics }
     * แต่ละ key เป็น array/object หรือ [] ถ้า API พัง
     */
    loadAll: async () => {
      const today = new Date().toLocaleDateString('en-CA');
      const results = await Promise.allSettled([
        apiFetch('/bookings'),
        apiFetch('/notifications?is_read=false'),
        apiFetch('/staff'),
        apiFetch('/rooms'),
        apiFetch(`/analytics/dashboard?start_date=${today}&end_date=${today}`),
      ]);

      const safe = (r, fallback) => {
        if (r.status !== 'fulfilled' || !r.value.ok) return fallback;
        return r.value.data?.data ?? r.value.data ?? fallback;
      };

      return {
        bookings:      safe(results[0], []),
        notifications: safe(results[1], []),
        staff:         safe(results[2], []),
        rooms:         safe(results[3], []),
        analytics:     safe(results[4], null),
      };
    },
  },

  /* --- Pets (FR2) --- */
  pets: {
    getAll:      (params = {}) => apiFetch('/pets?' + new URLSearchParams(params)),
    getById:     (id)          => apiFetch(`/pets/${id}`),
    create:      (data)        => apiFetch('/pets', { method: 'POST', body: JSON.stringify(data) }),
    update:      (id, data)    => apiFetch(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:      (id)          => apiFetch(`/pets/${id}`, { method: 'DELETE' }),
    getVaccines: (id)          => apiFetch(`/pets/${id}/vaccines`),
    addVaccine:  (id, data)    => apiFetch(`/pets/${id}/vaccines`, { method: 'POST', body: JSON.stringify(data) }),
    getMealPlans:(id)          => apiFetch(`/pets/${id}/meal-plans`),
    saveMealPlans:(id, data)   => apiFetch(`/pets/${id}/meal-plans`, { method: 'POST', body: JSON.stringify(data) }),
  },
};

/* ─── LEGACY COMPAT (StaffManagement.js ใช้อยู่) ── */
window.staffAPI = {
  getAllStaff: async () => {
    const res = await window.API.staff.getAll();
    return res.ok ? { status: 'success', data: res.data } : { status: 'error', data: [] };
  },
  addStaff: async (staffData) => {
    const res = await window.API.staff.create(staffData);
    return res.ok
      ? { status: 'success', message: 'เพิ่มพนักงานสำเร็จ', data: res.data }
      : { status: 'error', message: res.data?.message || 'เกิดข้อผิดพลาด' };
  },
};

/* ─── CUSTOMER API (window.CustomerAPI) ──────────────── */
window.CustomerAPI = {
  /* --- Auth --- */
  auth: {
    login: (username, password) => apiFetch('/auth/login/customer', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  },

  /* --- Customer Profile --- */
  customer: {
    getMe: () => apiFetch('/customers/me'),
    getById: (id) => apiFetch(`/customers/${id}`),
    update: (id, data) => apiFetch(`/customers/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  },

  /* --- Pets --- */
  pets: {
    getAll:  (params = {}) => apiFetch('/pets?' + new URLSearchParams(params)),
    getById: (id)          => apiFetch(`/pets/${id}`),
    create:  (data)        => apiFetch('/pets', { method: 'POST', body: JSON.stringify(data) }),
    update:  (id, data)    => apiFetch(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete:  (id)          => apiFetch(`/pets/${id}`, { method: 'DELETE' }),
    getVaccines: (id)      => apiFetch(`/pets/${id}/vaccines`),
    addVaccine:  (id, data) => apiFetch(`/pets/${id}/vaccines`, { method: 'POST', body: JSON.stringify(data) }),
    getMealPlans:(id)       => apiFetch(`/pets/${id}/meal-plans`),
    saveMealPlans:(id, data)=> apiFetch(`/pets/${id}/meal-plans`, { method: 'POST', body: JSON.stringify(data) }),
  },

  /* --- Bookings --- */
  bookings: {
    getAll: (params = {}) => apiFetch('/bookings?' + new URLSearchParams(params)),
    create: (data)        => apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }),
    getById: (id)         => apiFetch(`/bookings/${id}`),
    cancel: (id, data)    => apiFetch(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify(data || {}) }),
    getServices: ()       => apiFetch('/bookings/services'),
    getRooms: ()          => apiFetch('/rooms'),
  },

  // 🟢 เพิ่มโค้ด 4 บรรทัดนี้ลงไปครับ 🟢
  /* --- Rooms --- */
  rooms: {
    getAvailability: (params) => apiFetch('/rooms/availability?' + new URLSearchParams(params)),
  },

  /* --- Notifications --- */
  notifications: {
    getAll:      (params = {}) => apiFetch('/notifications?' + new URLSearchParams(params)),
    markRead:    (id)          => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: ()           => apiFetch('/notifications/read-all', { method: 'PATCH' }),
  }
  
};
