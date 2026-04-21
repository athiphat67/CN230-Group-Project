/**
 * navbar.js — Shared Topbar Component
 * Purrfect Stay Admin Panel
 */
const Navbar = {
  render({ title = '', breadcrumb = '', actionsHTML = '' }) {
    const root = document.getElementById('topbar-root');
    if (!root) return;
    root.innerHTML = `
      <div class="topbar">
        <div class="topbar-left">
          <div class="page-title">${title}</div>
          <div class="page-breadcrumb">${breadcrumb}</div>
        </div>
        <div class="topbar-right">
          ${actionsHTML}
        </div>
      </div>
    `;
  }
};
