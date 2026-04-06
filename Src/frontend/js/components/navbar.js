/**
 * navbar.js — Reusable Topbar / Navbar Component
 * Purrfect Stay Admin Panel
 *
 * Usage:
 *   <div id="topbar-root"></div>
 *   <script src="../js/components/navbar.js"></script>
 *   Navbar.render({
 *     title: 'Staff Management',
 *     breadcrumb: 'Admin › Staff Management',
 *     actions: document.getElementById('topbar-actions')  // optional slot
 *   });
 *
 * Or with inline actions HTML string:
 *   Navbar.render({ title: '...', actionsHTML: '<button ...>...</button>' });
 */

const Navbar = (() => {

  /**
   * Render topbar into #topbar-root (or a custom selector).
   * @param {Object} options
   * @param {string}      options.title        - Page title (required)
   * @param {string}      [options.breadcrumb] - Breadcrumb string below title
   * @param {string}      [options.actionsHTML]- Raw HTML for the right-side action slot
   * @param {HTMLElement} [options.actionsEl]  - DOM element to move into the action slot
   * @param {string}      [options.selector]   - Target selector (default '#topbar-root')
   */
  function render({ title = '', breadcrumb = '', actionsHTML = '', actionsEl = null, selector = '#topbar-root' } = {}) {
    const root = document.querySelector(selector);
    if (!root) {
      console.warn(`Navbar: element "${selector}" not found.`);
      return;
    }

    root.classList.add('topbar');
    root.setAttribute('role', 'banner');

    root.innerHTML = `
      <div class="topbar-left">
        <div class="page-title">${title}</div>
        ${breadcrumb ? `<div class="page-breadcrumb">${breadcrumb}</div>` : ''}
      </div>
      <div class="topbar-right" id="topbar-actions-slot">
        ${actionsHTML}
      </div>
    `;

    // If a DOM element was passed, move it into the slot
    if (actionsEl) {
      const slot = root.querySelector('#topbar-actions-slot');
      slot.innerHTML = '';
      slot.appendChild(actionsEl);
    }
  }

  return { render };

})();
