const Sidebar = {
  render({ activePage = 'dashboard', user = {}, isSubPage = false }) {
    const root = document.getElementById('sidebar-root');
    if (!root) return;

    root.className = 'sidebar';

    const nav = [
      {
        label: 'OVERVIEW',
        items: [
          {
            id: 'dashboard', label: 'Dashboard', href: 'dashboard.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`
          },
        ]
      },
      {
        label: 'OPERATIONS',
        items: [
          {
            id: 'bookings', label: 'Bookings', href: 'Bookings.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
          },
          {
            id: 'petcare', label: 'Pet Care', href: 'PetCare.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>`
          },
          {
            id: 'billing', label: 'Billing', href: 'Billing.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`
          },
        ]
      },
      {
        label: 'MANAGEMENT',
        items: [
          {
            id: 'pets', label: 'Pet Profiles', href: 'PetProfile.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
          },
          {
            id: 'staff', label: 'Staff', href: 'StaffManagement.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
          },
          {
            id: 'inventory', label: 'Inventory', href: 'Inventory.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`
          },
        ]
      },
      {
        label: 'INSIGHTS',
        items: [
          {
            id: 'analytics', label: 'Analytics', href: 'Analytics.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`
          },
          {
            id: 'notifications', label: 'Notifications', href: 'Notifications.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`
          },
          {
            id: 'audit', label: 'Audit Trail', href: 'AuditTrail.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`
          },
        ]
      },
    ];

    const initial = (user.name || 'A').charAt(0).toUpperCase();

    root.innerHTML = `
      <div class="logo">
        <div class="logo-mark">🐾 Purrfect Stay</div>
        <div class="logo-sub">Admin Portal</div>
      </div>
      <nav class="nav">
        ${nav.map(section => `
          <span class="nav-label">${section.label}</span>
          ${section.items.map(item => `
            <a href="${item.href}" class="nav-item${activePage === item.id ? ' active' : ''}">
              <span class="nav-icon">${item.icon}</span>
              ${item.label}
            </a>
          `).join('')}
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-widget">
          <div class="user-main" style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <div class="user-avatar">${initial}</div>
            <div class="user-details" style="min-width: 0;">
              <div class="user-name" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.name || 'Admin'}
              </div>
              <div class="user-role">${user.role || 'Staff'}</div>
            </div>
          </div>
          <button class="logout-action" onclick="handleLogout()" title="ออกจากระบบ">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    `;
  }
};

async function handleLogout() {
  if (!confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;

  try {
    // 1. ยิง API ไปที่ Backend (ใช้ API Service ที่มีอยู่แล้วใน api.js)
    if (window.API && window.API.auth) {
      await window.API.auth.logout();
    }
  } catch (err) {
    console.error('Logout API Error:', err);
  } finally {
    // 2. ไม่ว่าจะยิง API สำเร็จหรือไม่ ต้องล้างข้อมูลในเครื่องออกเสมอเพื่อความปลอดภัย
    localStorage.removeItem('access_token');
    localStorage.removeItem('first_name');
    localStorage.removeItem('staff_id');
    localStorage.removeItem('role');

    // 3. ดีดกลับไปหน้า Login
    window.location.href = 'login.html';
  }
}
