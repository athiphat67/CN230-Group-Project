/**
 * sidebar.js — Reusable Sidebar Component
 * Purrfect Stay Admin Panel
 *
 * Usage:
 *   <aside id="sidebar-root"></aside>
 *   <script src="../js/components/sidebar.js"></script>
 *   Sidebar.render({ activePage: 'staff' });
 *
 * activePage values:
 *   'dashboard' | 'bookings' | 'rooms' | 'inventory' | 'staff' | 'audit'
 */

const Sidebar = (() => {

  const NAV_ITEMS = [
    {
      group: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Dashboard',
          href: 'dashboard.html',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                   <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                   <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                   <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                 </svg>`,
        },
      ],
    },
    {
      group: 'Operations',
      items: [
        {
          id: 'bookings',
          label: 'Bookings',
          href: '#',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                 </svg>`,
        },
        {
          id: 'rooms',
          label: 'Room Settings',
          href: '#',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                 </svg>`,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          href: '#',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                   <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
                 </svg>`,
        },
      ],
    },
    {
      group: 'Admin',
      items: [
        {
          id: 'staff',
          label: 'Staff Management',
          href: 'StaffManagement.html',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                 </svg>`,
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          href: '#',
          icon: `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                   <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                 </svg>`,
        },
      ],
    },
  ];

  /** Build sidebar HTML string */
  function _buildHTML({ activePage, user }) {
    const navHTML = NAV_ITEMS.map(section => `
      <div class="nav-label">${section.group}</div>
      ${section.items.map(item => `
        <a class="nav-item${item.id === activePage ? ' active' : ''}" href="${item.href}">
          ${item.icon}
          ${item.label}
        </a>
      `).join('')}
    `).join('');

    const initial = user.name ? user.name.charAt(0) : '?';

    return `
      <div class="logo">
        <div class="logo-mark">🐾 Purrfect Stay</div>
        <div class="logo-sub">Admin Panel</div>
      </div>
      <nav class="nav" aria-label="Main navigation">
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">${initial}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render sidebar into #sidebar-root (or a custom selector).
   * @param {Object} options
   * @param {string} options.activePage   - nav item id to mark active
   * @param {Object} [options.user]       - { name, role }
   * @param {string} [options.selector]   - target element selector (default '#sidebar-root')
   */
  function render({ activePage = '', user = { name: 'Administrator', role: 'Admin' }, selector = '#sidebar-root' } = {}) {
    const root = document.querySelector(selector);
    if (!root) {
      console.warn(`Sidebar: element "${selector}" not found.`);
      return;
    }
    root.classList.add('sidebar');
    root.innerHTML = _buildHTML({ activePage, user });
  }

  return { render };

})();
