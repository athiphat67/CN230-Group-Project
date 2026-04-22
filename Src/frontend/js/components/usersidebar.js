'use strict';

/**
 * usersidebar.js — Customer Sidebar Component
 * Location: frontend/js/components/usersidebar.js
 *
 * Mirrors the staff sidebar structure/style.
 * Nav IDs: 'dashboard' | 'pets' | 'addpet' | 'booking' | 'profile'
 */

const UserSidebar = {
  render({ activePage = 'dashboard', user = {} }) {
    const root = document.getElementById('sidebar-root');
    if (!root) return;

    root.className = 'sidebar';

    const nav = [
      {
        label: 'OVERVIEW',
        items: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            href: 'CustomerDashboard.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                     <rect x="3" y="3" width="7" height="7" rx="1"/>
                     <rect x="14" y="3" width="7" height="7" rx="1"/>
                     <rect x="3" y="14" width="7" height="7" rx="1"/>
                     <rect x="14" y="14" width="7" height="7" rx="1"/>
                   </svg>`
          },
        ]
      },
      {
        label: 'MY PETS',
        items: [
          {
            id: 'pets',
            label: 'Pet Profiles',
            href: 'PetProfile.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                     <path d="M12 21c-4-3-8-5-8-10a8 8 0 0116 0c0 5-4 7-8 10z"/>
                     <circle cx="9" cy="7" r="1.5" fill="currentColor" stroke="none"/>
                     <circle cx="15" cy="7" r="1.5" fill="currentColor" stroke="none"/>
                   </svg>`
          },
          {
            id: 'addpet',
            label: 'Add New Pet',
            href: 'AddPet.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                     <circle cx="12" cy="12" r="10"/>
                     <path d="M12 8v8M8 12h8"/>
                   </svg>`
          },
        ]
      },
      {
        label: 'RESERVATIONS',
        items: [
          {
            id: 'booking',
            label: 'Book a Stay',
            href: 'ReservationForm.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                     <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                   </svg>`
          },
        ]
      },
      {
        label: 'ACCOUNT',
        items: [
          {
            id: 'profile',
            label: 'My Profile',
            href: 'CustomerProfile.html',
            icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                     <circle cx="12" cy="7" r="4"/>
                     <path d="M5.5 21a7.5 7.5 0 0113 0"/>
                   </svg>`
          },
        ]
      },
    ];

    const initial = (user.name || 'C').charAt(0).toUpperCase();

    root.innerHTML = `
      <div class="logo">
        <div class="logo-mark">🐾 Purrfect Stay</div>
        <div class="logo-sub">Member Portal</div>
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
          <div class="user-main" style="display:flex;align-items:center;gap:12px;min-width:0;">
            <div class="user-avatar">${initial}</div>
            <div class="user-details" style="min-width:0;">
              <div class="user-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${user.name || 'Member'}
              </div>
              <div class="user-role">Premium Member</div>
            </div>
          </div>
          <button class="logout-action" onclick="handleUserLogout()" title="Sign Out">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
};

async function handleUserLogout() {
  if (!confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) return;
  try {
    if (window.CustomerAPI && window.CustomerAPI.auth) {
      await window.CustomerAPI.auth.logout();
    }
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    localStorage.removeItem('access_token');
    localStorage.removeItem('first_name');
    localStorage.removeItem('last_name');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('role');
    localStorage.removeItem('customer_info');
    window.location.href = '../login.html';
  }
}

window.UserSidebar = UserSidebar;
window.handleUserLogout = handleUserLogout;