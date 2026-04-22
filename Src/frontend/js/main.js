/**
 * main.js — Global Utility Init
 * Location: frontend/js/main.js
 *
 * Handles: toast container creation · global error handlers
 *          · common DOM helpers · page transition polish
 */

'use strict';

/* ── Ensure toast container exists ── */
(function initToastContainer() {
  if (document.getElementById('toast-container')) return;
  const tc = document.createElement('div');
  tc.id = 'toast-container';
  document.body.appendChild(tc);
})();

/* ── Smooth page load reveal ── */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity   = '1';
  });
});

/* ── Global helpers ─────────────────────────────── */

/** Debounce function calls */
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/** Query selector shorthand */
function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
function qsa(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/** Set loading state on a button */
function setButtonLoading(btn, loading, originalText = '') {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.classList.add('loading');
    btn.disabled = true;
    btn.textContent = '';
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || originalText;
  }
}

/** Simple form validation helper */
function validateRequired(formEl) {
  let valid = true;
  const fields = formEl.querySelectorAll('[required]');
  fields.forEach(field => {
    const isEmpty = !field.value.trim();
    field.classList.toggle('error', isEmpty);
    if (isEmpty) valid = false;
  });
  return valid;
}

/** Currency formatter */
function formatCurrency(amount, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Number formatter with commas */
function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

/* ── Expose ── */
window.debounce         = debounce;
window.qs               = qs;
window.qsa              = qsa;
window.setButtonLoading = setButtonLoading;
window.validateRequired = validateRequired;
window.formatCurrency   = formatCurrency;
window.formatNumber     = formatNumber;

function checkCustomerAccess() {
    const role = localStorage.getItem('role');
    const token = localStorage.getItem('access_token');
    // ดึงข้อมูลชื่อจาก localStorage ที่เก็บไว้ตอน Login
    const customerInfo = JSON.parse(localStorage.getItem('customer_info') || '{}');
    const customerId = localStorage.getItem('customer_id') || customerInfo.customerid || customerInfo.customer_id || customerInfo.id;

    if (!token || role !== 'customer') {
        window.location.href = '../login.html';
        return null;
    }
    return {
        id: customerId,
        customerid: customerId,
        firstname: localStorage.getItem('first_name') || 'Guest',
        ...customerInfo
    };
}

function speciesEmoji(species) {
    const s = String(species).toLowerCase();
    if (s.includes('dog')) return '🐶';
    if (s.includes('cat')) return '🐱';
    if (s.includes('bird')) return '🦜';
    return '🐾';
}

function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

function showToast(msg, type = 'info') {
    console.log(`[Toast ${type}]: ${msg}`);
    const container = document.getElementById('toast-container');
    if (container) {
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerText = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}
