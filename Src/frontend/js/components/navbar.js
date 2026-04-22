/**
 * navbar.js — Dynamic Navbar Injection
 * Location: frontend/js/components/navbar.js
 *
 * Usage: call renderNavbar({ activePage: 'dashboard' })
 * Active page values: 'dashboard' | 'reservations' | 'pets' | 'profile'
 */

'use strict';

const Navbar = {
  /**
   * Renders the top navbar into #navbar-placeholder
   * @param {Object} opts
   * @param {string} opts.activePage  - which nav link is active
   */
  render(opts = {}) {
    const placeholder = document.getElementById('navbar-placeholder');
    if (!placeholder) return;

    const { activePage = '' } = opts;

    // Get user info from localStorage/CustomerAPI helpers
    const firstName = window.getCustomerFirstName ? getCustomerFirstName() : 'You';
    const lastName  = (() => {
      try {
        const info = JSON.parse(localStorage.getItem('customer_info') || '{}');
        return info.lastname || '';
      } catch { return ''; }
    })();
    const initials  = (firstName[0] || 'U').toUpperCase() + (lastName[0] || '').toUpperCase();

    const links = [
      { key: 'dashboard',     href: 'CustomerDashboard.html', label: 'Dashboard',    icon: dashboardIcon() },
      { key: 'reservations',  href: 'ReservationForm.html',   label: 'Reservations', icon: reservationsIcon() },
      { key: 'pets',          href: 'AddPet.html',            label: 'My Pets',      icon: petsIcon() },
    ];

    const navLinks = links.map(l => `
      <a href="${l.href}" class="nav-link ${activePage === l.key ? 'active' : ''}">
        ${l.icon}
        ${l.label}
      </a>
    `).join('');

    placeholder.innerHTML = `
      <nav class="navbar">
        <div class="navbar__inner">

          <!-- Brand -->
          <a href="CustomerDashboard.html" class="navbar__brand">
            Pet<span>Serenity</span>
          </a>

          <!-- Center Nav -->
          <div class="navbar__nav">
            ${navLinks}
          </div>

          <!-- Right Actions -->
          <div class="navbar__actions">

            <!-- Notification Bell -->
            <button class="nav-bell" id="notif-bell" title="Notifications" aria-label="Notifications">
              ${bellIcon()}
              <span class="nav-bell__badge" id="notif-badge" style="display:none"></span>
            </button>

            <!-- User Dropdown -->
            <div class="nav-user-wrapper" id="nav-user-wrapper">
              <button class="nav-user" id="nav-user-btn" aria-expanded="false" aria-haspopup="true">
                <div class="nav-user__avatar" id="nav-avatar">${initials}</div>
                <div class="nav-user__info">
                  <div class="nav-user__name" id="nav-name">${firstName}</div>
                  <div class="nav-user__role">Premium Member</div>
                </div>
                ${chevronIcon()}
              </button>

              <!-- Dropdown Menu -->
              <div class="nav-dropdown" id="nav-dropdown" style="display:none" role="menu">
                <a href="CustomerProfile.html" class="nav-dropdown__item" role="menuitem">
                  ${profileIcon()}
                  My Profile
                </a>
                <a href="AddPet.html" class="nav-dropdown__item" role="menuitem">
                  ${petsIcon()}
                  My Pets
                </a>
                <div class="nav-dropdown__divider"></div>
                <button class="nav-dropdown__item danger" id="logout-btn" role="menuitem">
                  ${logoutIcon()}
                  Sign Out
                </button>
              </div>
            </div>

          </div><!-- /.navbar__actions -->
        </div><!-- /.navbar__inner -->
      </nav>
    `;

    // ── Bind events after injection ──────────────────
    Navbar._bindEvents();
    Navbar._loadNotifCount();
  },

  _bindEvents() {
    // User dropdown toggle
    const btn      = document.getElementById('nav-user-btn');
    const dropdown = document.getElementById('nav-dropdown');
    const wrapper  = document.getElementById('nav-user-wrapper');

    if (btn && dropdown) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = dropdown.style.display !== 'none';
        dropdown.style.display = open ? 'none' : 'block';
        btn.setAttribute('aria-expanded', String(!open));
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (wrapper && !wrapper.contains(e.target)) {
          dropdown.style.display = 'none';
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (window.CustomerAPI) {
          await CustomerAPI.auth.logout().catch(() => {});
        }
        if (window.clearSession) clearSession();
        window.location.href = '../login.html';
      });
    }

    // Notification bell
    const bell = document.getElementById('notif-bell');
    if (bell) {
      bell.addEventListener('click', () => {
        // Could open a notification dropdown; for now go to dashboard
        window.location.href = 'CustomerDashboard.html';
      });
    }
  },

  async _loadNotifCount() {
    if (!window.CustomerAPI) return;
    try {
      const res = await CustomerAPI.notifications.getAll({ is_read: false, limit: 10 });
      if (res.ok) {
        const count = (res.data?.data || []).length;
        const badge = document.getElementById('notif-badge');
        if (badge) {
          badge.style.display = count > 0 ? 'block' : 'none';
        }
      }
    } catch { /* silent */ }
  },
};

/* ── SVG ICONS ──────────────────────────────────── */
function dashboardIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>`;
}
function reservationsIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>`;
}
function petsIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M12 21c-4-3-8-5-8-10a8 8 0 0116 0c0 5-4 7-8 10z"/>
    <circle cx="9" cy="7" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="7" r="1.5" fill="currentColor" stroke="none"/>
  </svg>`;
}
function bellIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>`;
}
function chevronIcon() {
  return `<svg style="width:14px;height:14px;color:var(--text-3)" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M6 9l6 6 6-6"/>
  </svg>`;
}
function profileIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <circle cx="12" cy="7" r="4"/><path d="M5.5 21a7.5 7.5 0 0113 0"/>
  </svg>`;
}
function logoutIcon() {
  return `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>`;
}

window.Navbar = Navbar;