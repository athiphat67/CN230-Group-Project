/**
 * pagination.js — shared client-side pagination helper
 * Keeps list rendering local to each page while standardizing controls.
 */

'use strict';

(function initPagination(global) {
  const DEFAULT_PAGE_SIZE = 10;
  const state = {};

  function ensureState(key, pageSize) {
    if (!state[key]) state[key] = { page: 1, pageSize: pageSize || DEFAULT_PAGE_SIZE };
    if (pageSize) state[key].pageSize = pageSize;
    return state[key];
  }

  function paginate(items, options = {}) {
    const key = options.key || 'default';
    const pageSize = options.pageSize || DEFAULT_PAGE_SIZE;
    const s = ensureState(key, pageSize);
    const total = Array.isArray(items) ? items.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / s.pageSize));

    if (s.page > totalPages) s.page = totalPages;
    if (s.page < 1) s.page = 1;

    const start = (s.page - 1) * s.pageSize;
    const end = start + s.pageSize;
    return {
      pageItems: (items || []).slice(start, end),
      page: s.page,
      pageSize: s.pageSize,
      total,
      totalPages,
      start,
      end: Math.min(end, total),
    };
  }

  function render(meta, options = {}) {
    const container = resolveContainer(options);
    const infoEl = options.infoEl || document.getElementById(options.infoId);
    const label = options.label || 'items';

    if (infoEl) {
      infoEl.textContent = meta.total === 0
        ? 'No items'
        : `Showing ${meta.start + 1}-${meta.end} of ${meta.total} ${label}`;
    }

    if (!container) return;

    if (meta.totalPages <= 1) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    const key = options.key || 'default';
    const pages = getVisiblePages(meta.page, meta.totalPages);
    const pageButtons = pages.map(page => {
      if (page === 'ellipsis') return `<span class="pg-ellipsis">…</span>`;
      return `<button type="button" class="pg-page-btn ${page === meta.page ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }).join('');

    container.innerHTML = `
      <button type="button" class="pg-page-btn" data-page="${meta.page - 1}" ${meta.page <= 1 ? 'disabled' : ''}>‹</button>
      ${pageButtons}
      <button type="button" class="pg-page-btn" data-page="${meta.page + 1}" ${meta.page >= meta.totalPages ? 'disabled' : ''}>›</button>
    `;

    container.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        goTo(key, Number(btn.dataset.page), options.onChange);
      });
    });
  }

  function resolveContainer(options) {
    if (options.containerEl) return options.containerEl;
    if (options.containerId) return document.getElementById(options.containerId);
    if (options.infoId) {
      const info = document.getElementById(options.infoId);
      if (info && info.parentElement) {
        let pager = info.parentElement.querySelector('.pg-pagination');
        if (!pager) {
          pager = document.createElement('div');
          pager.className = 'pg-pagination';
          info.parentElement.appendChild(pager);
        }
        return pager;
      }
    }
    return null;
  }

  function reset(key) {
    ensureState(key).page = 1;
  }

  function goTo(key, page, onChange) {
    const s = ensureState(key);
    s.page = Math.max(1, page);
    if (typeof onChange === 'function') onChange(s.page);
  }

  function getVisiblePages(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) pages.push('ellipsis');
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < total - 1) pages.push('ellipsis');
    pages.push(total);
    return pages;
  }

  global.Pagination = {
    paginate,
    render,
    reset,
    goTo,
  };
})(window);
