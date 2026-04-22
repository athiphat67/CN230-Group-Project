/**
 * Rooms.js — Room Management
 * Standalone admin/staff CRUD page for boarding rooms.
 */

'use strict';

let roomSizeOptions = ['SMALL', 'MEDIUM', 'LARGE'];
let petTypeOptions = ['CAT', 'DOG'];
const DEFAULT_STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'];

let ROOMS = [];
let currentFilter = 'all';
let currentSearch = '';
let sortKey = 'room_number';
let sortDirection = 'asc';
let editingRoomId = null;
let statusOptions = [...DEFAULT_STATUS_OPTIONS];
const ROOMS_PAGE_KEY = 'admin-rooms';
const ROOMS_PAGE_SIZE = 10;

document.addEventListener('DOMContentLoaded', async () => {
  bindModalBackdrops();
  bindEscapeKey();
  await loadRoomOptions();
  renderStatusOptions();
  await loadRooms();
});

async function loadRoomOptions() {
  if (!window.API.rooms.getOptions) return;

  const res = await window.API.rooms.getOptions();
  if (!res.ok) return;

  const options = res.data?.data || {};
  if (Array.isArray(options.room_sizes) && options.room_sizes.length > 0) {
    roomSizeOptions = options.room_sizes;
    renderSelectOptions('room-size', roomSizeOptions);
  }
  if (Array.isArray(options.pet_types) && options.pet_types.length > 0) {
    petTypeOptions = options.pet_types;
    renderSelectOptions('room-pet-type', petTypeOptions);
  }
  if (Array.isArray(options.statuses) && options.statuses.length > 0) {
    statusOptions = options.statuses;
  }
}

async function loadRooms() {
  setLoading(true);
  const res = await window.API.rooms.getAll();

  if (!res.ok) {
    setLoading(false);
    showRoomToast(res.data?.message || 'Unable to load rooms.', 'error');
    return;
  }

  ROOMS = normalizeRooms(res.data?.data || res.data || []);
  syncStatusOptionsFromRooms();
  renderStatusOptions();
  renderAll();
}

function normalizeRooms(rows) {
  return rows.map(room => ({
    room_id: room.room_id ?? room.roomid,
    room_number: room.room_number ?? room.roomnumber,
    room_type: room.room_type ?? room.roomsize,
    pet_type: room.pet_type ?? room.pettype,
    price_per_night: Number(room.price_per_night ?? room.rate ?? 0),
    status: String(room.status || 'AVAILABLE').toUpperCase(),
  }));
}

function syncStatusOptionsFromRooms() {
  const seen = new Set(statusOptions);
  ROOMS.forEach(room => {
    if (room.status) seen.add(room.status);
  });
  statusOptions = [...seen];
}

function renderStatusOptions() {
  const options = statusOptions.map(status => `<option value="${status}">${statusLabel(status)}</option>`).join('');
  const formStatus = document.getElementById('room-status');
  if (formStatus) formStatus.innerHTML = options;
}

function renderSelectOptions(id, options) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = options.map(option => `<option value="${option}">${statusLabel(option)}</option>`).join('');
}

function renderAll() {
  renderStats();
  renderCounts();
  renderTable();
}

function setLoading(loading) {
  const tbody = document.getElementById('rooms-tbody');
  if (loading && tbody) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="rm-loading">Loading rooms...</div></td></tr>';
  }
}

function renderStats() {
  const total = ROOMS.length;
  const available = ROOMS.filter(r => r.status === 'AVAILABLE').length;
  const inUse = ROOMS.filter(r => ['OCCUPIED', 'RESERVED'].includes(r.status)).length;
  const attention = ROOMS.filter(r => ['CLEANING', 'MAINTENANCE'].includes(r.status)).length;

  setText('stat-total', total);
  setText('stat-available', available);
  setText('stat-in-use', inUse);
  setText('stat-attention', attention);
}

function renderCounts() {
  setText('count-all', ROOMS.length);
  setText('count-available', ROOMS.filter(r => r.status === 'AVAILABLE').length);
  setText('count-occupied', ROOMS.filter(r => r.status === 'OCCUPIED').length);
  setText('count-maintenance', ROOMS.filter(r => r.status === 'MAINTENANCE').length);
}

function renderTable() {
  const tbody = document.getElementById('rooms-tbody');
  const emptyEl = document.getElementById('rooms-empty');
  const showingEl = document.getElementById('rooms-showing');
  if (!tbody || !emptyEl || !showingEl) return;

  const filtered = getFilteredRooms();
  const page = window.Pagination
    ? Pagination.paginate(filtered, { key: ROOMS_PAGE_KEY, pageSize: ROOMS_PAGE_SIZE })
    : { pageItems: filtered, total: filtered.length, start: 0, end: filtered.length, totalPages: 1 };

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showingEl.textContent = 'No rooms found';
    window.Pagination?.render(page, { key: ROOMS_PAGE_KEY, infoId: 'rooms-showing', label: 'rooms', onChange: renderTable });
    return;
  }

  emptyEl.style.display = 'none';
  window.Pagination?.render(page, { key: ROOMS_PAGE_KEY, infoId: 'rooms-showing', label: 'rooms', onChange: renderTable });

  tbody.innerHTML = page.pageItems.map(room => `
    <tr>
      <td>
        <div class="rm-room-cell">
          <div class="rm-room-icon">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>
          </div>
          <div>
            <div class="rm-room-number">${escapeHtml(room.room_number)}</div>
            <div class="rm-room-id">ID ${room.room_id}</div>
          </div>
        </div>
      </td>
      <td><span class="rm-chip">${escapeHtml(statusLabel(room.room_type))}</span></td>
      <td><span class="rm-chip ${String(room.pet_type).toLowerCase()}">${escapeHtml(statusLabel(room.pet_type))}</span></td>
      <td style="font-weight:700;color:var(--rm-text-1)">฿${formatNumber(room.price_per_night)}</td>
      <td><span class="rm-status-badge ${statusClass(room.status)}">${statusDot(room.status)} ${statusLabel(room.status)}</span></td>
      <td>
        <select class="rm-status-select" onchange="quickUpdateStatus(${room.room_id}, this.value)" aria-label="Update room status">
          ${statusOptions.map(status => `<option value="${status}" ${room.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}
        </select>
      </td>
      <td>
        <div class="rm-action-btns">
          <button class="rm-btn-icon" title="Edit room" onclick="openEditRoomModal(${room.room_id})">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="rm-btn-icon danger" title="Delete room" onclick="deleteRoom(${room.room_id})">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function getFilteredRooms() {
  const q = currentSearch.trim().toLowerCase();
  return [...ROOMS]
    .filter(room => currentFilter === 'all' || room.status === currentFilter)
    .filter(room => {
      if (!q) return true;
      return [
        room.room_number,
        room.room_type,
        room.pet_type,
        room.status,
        String(room.price_per_night),
      ].some(value => String(value || '').toLowerCase().includes(q));
    })
    .sort((a, b) => compareRooms(a, b));
}

function compareRooms(a, b) {
  const left = a[sortKey];
  const right = b[sortKey];
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (sortKey === 'price_per_night') {
    return (Number(left) - Number(right)) * direction;
  }
  return String(left || '').localeCompare(String(right || ''), undefined, { numeric: true }) * direction;
}

function filterRooms(filter, btn) {
  currentFilter = filter;
  window.Pagination?.reset(ROOMS_PAGE_KEY);
  document.querySelectorAll('.rm-tab').forEach(tab => tab.classList.remove('active'));
  btn?.classList.add('active');
  renderTable();
}

function searchRooms(value) {
  currentSearch = value;
  window.Pagination?.reset(ROOMS_PAGE_KEY);
  renderTable();
}

function sortRooms(key) {
  if (sortKey === key) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDirection = 'asc';
  }
  window.Pagination?.reset(ROOMS_PAGE_KEY);
  renderTable();
}

function openAddRoomModal() {
  editingRoomId = null;
  setText('modal-room-title', 'Add Room');
  clearRoomForm();
  clearFormError();
  openRoomModal();
}

function openEditRoomModal(roomId) {
  const room = ROOMS.find(item => Number(item.room_id) === Number(roomId));
  if (!room) return;

  editingRoomId = room.room_id;
  setText('modal-room-title', `Edit Room ${room.room_number}`);
  setValue('room-id', room.room_id);
  setValue('room-number', room.room_number);
  setValue('room-rate', room.price_per_night);
  setValue('room-size', room.room_type);
  setValue('room-pet-type', room.pet_type);
  setValue('room-status', room.status);
  clearFormError();
  openRoomModal();
}

async function saveRoom() {
  const payload = getFormPayload();
  const errors = validateRoomPayload(payload, editingRoomId);

  if (errors.length > 0) {
    showFormError(errors);
    return;
  }

  clearFormError();
  setButtonBusy(true);
  const res = editingRoomId
    ? await window.API.rooms.update(editingRoomId, payload)
    : await window.API.rooms.create(payload);
  setButtonBusy(false);

  if (!res.ok) {
    const message = getApiErrorMessage(res);
    showFormError([message]);
    showRoomToast(message, 'error');
    return;
  }

  showRoomToast(editingRoomId ? 'Room updated.' : 'Room created.');
  closeRoomModal();
  await loadRooms();
}

async function quickUpdateStatus(roomId, status) {
  const room = ROOMS.find(item => Number(item.room_id) === Number(roomId));
  if (!room || room.status === status) return;

  const oldStatus = room.status;
  room.status = status;
  renderAll();

  const res = await window.API.rooms.update(roomId, { status });
  if (!res.ok) {
    room.status = oldStatus;
    renderAll();
    showRoomToast(getApiErrorMessage(res), 'error');
    return;
  }

  showRoomToast(`Room ${room.room_number} marked ${statusLabel(status)}.`);
  await loadRooms();
}

async function deleteRoom(roomId) {
  const room = ROOMS.find(item => Number(item.room_id) === Number(roomId));
  if (!room) return;
  if (!confirm(`Delete room "${room.room_number}"? This cannot be undone.`)) return;

  const res = await window.API.rooms.delete(roomId);
  if (!res.ok) {
    showRoomToast(getApiErrorMessage(res), 'error');
    return;
  }

  showRoomToast(`Room ${room.room_number} deleted.`, 'warn');
  await loadRooms();
}

function getFormPayload() {
  return {
    roomnumber: document.getElementById('room-number')?.value.trim(),
    roomsize: document.getElementById('room-size')?.value,
    pettype: document.getElementById('room-pet-type')?.value,
    rate: Number(document.getElementById('room-rate')?.value),
    status: document.getElementById('room-status')?.value,
  };
}

function validateRoomPayload(payload, currentId = null) {
  const errors = [];
  if (!payload.roomnumber) errors.push('Room number is required.');
  if (!roomSizeOptions.includes(payload.roomsize)) errors.push('Room size is required.');
  if (!petTypeOptions.includes(payload.pettype)) errors.push('Pet type is required.');
  if (!statusOptions.includes(payload.status)) errors.push('Status is required.');
  if (!Number.isFinite(payload.rate) || payload.rate <= 0) errors.push('Rate must be a number greater than 0.');

  const duplicate = ROOMS.find(room =>
    room.room_number?.toLowerCase() === payload.roomnumber?.toLowerCase()
    && Number(room.room_id) !== Number(currentId)
  );
  if (duplicate) errors.push('Room number must be unique.');

  return errors;
}

function clearRoomForm() {
  setValue('room-id', '');
  setValue('room-number', '');
  setValue('room-rate', '');
  setValue('room-size', 'SMALL');
  setValue('room-pet-type', 'CAT');
  setValue('room-status', 'AVAILABLE');
  clearFormError();
}

function openRoomModal() {
  document.getElementById('modal-room')?.classList.add('open');
  setTimeout(() => document.getElementById('room-number')?.focus(), 50);
}

function closeRoomModal() {
  document.getElementById('modal-room')?.classList.remove('open');
  clearFormError();
}

function bindModalBackdrops() {
  document.querySelectorAll('.rm-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.classList.remove('open');
    });
  });
}

function bindEscapeKey() {
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeRoomModal();
  });
}

function setButtonBusy(isBusy) {
  const btn = document.getElementById('save-room-btn');
  if (!btn) return;
  btn.disabled = isBusy;
  btn.dataset.originalText ||= btn.textContent;
  btn.textContent = isBusy ? 'Saving...' : btn.dataset.originalText;
}

function getApiErrorMessage(res) {
  const detail = res.data?.detail;
  if (Array.isArray(detail)) return detail[0] || 'Request failed.';
  return detail || res.data?.message || 'Request failed.';
}

function showFormError(errors) {
  const el = document.getElementById('room-form-error');
  if (!el) return;
  const list = Array.isArray(errors) ? errors.filter(Boolean) : [String(errors || 'Request failed.')];
  el.innerHTML = list.map(error => `<div>${escapeHtml(error)}</div>`).join('');
  el.style.display = 'block';
}

function clearFormError() {
  const el = document.getElementById('room-form-error');
  if (!el) return;
  el.innerHTML = '';
  el.style.display = 'none';
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/_/g, '-');
}

function statusDot(status) {
  return {
    AVAILABLE: '●',
    OCCUPIED: '●',
    RESERVED: '●',
    CLEANING: '●',
    MAINTENANCE: '●',
  }[status] || '●';
}

function statusLabel(value) {
  return String(value || '—')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showRoomToast(msg, type = 'success') {
  document.getElementById('rm-toast')?.remove();
  const colors = {
    success: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    warn: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
    error: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  };
  const c = colors[type] || colors.success;
  const toast = document.createElement('div');
  toast.id = 'rm-toast';
  toast.textContent = msg;
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${c.bg};color:${c.color};border:1.5px solid ${c.border};padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;max-width:380px;`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

window.filterRooms = filterRooms;
window.searchRooms = searchRooms;
window.sortRooms = sortRooms;
window.openAddRoomModal = openAddRoomModal;
window.openEditRoomModal = openEditRoomModal;
window.saveRoom = saveRoom;
window.quickUpdateStatus = quickUpdateStatus;
window.deleteRoom = deleteRoom;
window.closeRoomModal = closeRoomModal;
