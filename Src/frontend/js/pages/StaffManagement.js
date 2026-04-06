/**
 * StaffManagement.js — Page logic for Staff Management
 * Purrfect Stay Admin Panel
 *
 * Handles: tab switching · modal open/close · staff filtering · leave approval
 */

/* ── TAB SWITCHING ── */
function switchTab(tabName, btn) {
  // Deactivate all tabs and buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Activate selected
  btn.classList.add('active');
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');

  // Show/hide search+filter tools (only relevant for staff list)
  const tools = document.querySelector('.tabs-tools');
  if (tools) {
    tools.style.visibility = (tabName === 'staff') ? 'visible' : 'hidden';
  }
}

/* ── MODAL: Add New Staff ── */
function openModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    overlay.classList.add('open');
    // Focus first input for accessibility
    const first = overlay.querySelector('input, select');
    if (first) setTimeout(() => first.focus(), 50);
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) overlay.classList.remove('open');
}

// Close modal on overlay background click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/* ── MODAL: Edit Staff ── */
function openEditModal(firstName, lastName, role, email, phone) {
  // Reuse the same modal — populate with existing values
  const overlay = document.getElementById('modal-add');
  if (!overlay) return;

  // Update modal title
  const title = overlay.querySelector('.modal-title');
  if (title) title.textContent = 'Edit Staff';

  // Populate fields
  const fields = overlay.querySelectorAll('input, select');
  const fieldMap = {
    'ชื่อจริง': firstName,
    'นามสกุล': lastName,
    'staff@purrfect.com': email,
    '0XX-XXX-XXXX': phone,
  };
  fields.forEach(field => {
    if (fieldMap[field.placeholder] !== undefined) {
      field.value = fieldMap[field.placeholder];
    }
    if (field.tagName === 'SELECT') {
      field.value = role;
    }
  });

  overlay.classList.add('open');

  // Reset title when modal closes
  overlay.addEventListener('click', function resetTitle(e) {
    if (e.target === overlay) {
      if (title) title.textContent = 'Add New Staff';
      overlay.removeEventListener('click', resetTitle);
    }
  }, { once: true });
}

/* ── STAFF LIST FILTER ── */
function filterStaff(query) {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const q = query.toLowerCase().trim();

  rows.forEach(row => {
    const name  = row.querySelector('.staff-name')?.textContent.toLowerCase() ?? '';
    const email = row.querySelector('.staff-email')?.textContent.toLowerCase() ?? '';
    row.style.display = (!q || name.includes(q) || email.includes(q)) ? '' : 'none';
  });
}

/* ── LEAVE: Approve / Reject ── */
function approveLeave(btn) {
  const row = btn.closest('tr');
  if (!row) return;

  const statusCell = row.querySelector('.badge.pending');
  if (!statusCell) return;

  // Optimistic UI update — replace Pending badge with Approved
  statusCell.className = 'badge approved';
  statusCell.textContent = 'Approved';

  // Replace action buttons cell with approver name
  const actionCell = btn.closest('td');
  if (actionCell) actionCell.innerHTML = '<span style="color:var(--text-3)">สมชาย มั่นคง</span>';

  // Update leave count badge
  const leaveCountEl = document.getElementById('leave-count');
  if (leaveCountEl) {
    const current = parseInt(leaveCountEl.textContent, 10);
    if (!isNaN(current) && current > 0) leaveCountEl.textContent = current - 1;
  }

  // TODO: PATCH /api/leave/{leave_id} — replace with real API call from api.js
}
