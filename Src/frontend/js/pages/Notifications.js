/**
 * Notifications.js — Page logic for Notification Management (FR7)
 * Purrfect Stay Admin Panel
 */

/* ── STATE ── */
let currentFilter = 'all';
let NOTIFICATIONS = []; // เคลียร์ Mock Data ออก และรอรับค่าจาก API

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  renderStats();
  renderList();
  
  // โหลดข้อมูลจริงจาก Backend ทันทีที่เปิดหน้า
  await fetchNotifications();
});

/* ── API CALLS ── */
async function fetchNotifications() {
  try {
    const response = await fetch('/api/notifications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.status === 'success') {
      NOTIFICATIONS = result.data;
      renderStats();
      renderList();
    } else {
      console.error('Failed to load notifications:', result.message);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
}

/* ── STATS ── */
function renderStats() {
  const unread       = NOTIFICATIONS.filter(n => !n.is_read).length;
  const careReports  = NOTIFICATIONS.filter(n => n.type === 'CARE_REPORT').length;
  const bookingNtfs  = NOTIFICATIONS.filter(n => n.type.includes('BOOKING')).length;
  const payments     = NOTIFICATIONS.filter(n => n.type === 'PAYMENT_CONFIRMED').length;

  document.getElementById('stat-unread').textContent   = unread;
  document.getElementById('stat-care').textContent     = careReports;
  document.getElementById('stat-booking').textContent  = bookingNtfs;
  document.getElementById('stat-payment').textContent  = payments;
}

/* ── RENDER ── */
function renderList() {
  const container = document.getElementById('nt-list');
  const emptyEl   = document.getElementById('nt-empty');

  const filtered = getFiltered();

  document.getElementById('nt-count').textContent = `${filtered.length} รายการ`;

  if (filtered.length === 0) {
    container.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  const typeIcon = {
    CARE_REPORT:       '📋',
    BOOKING_CONFIRMED: '✅',
    BOOKING_CANCELLED: '❌',
    PAYMENT_CONFIRMED: '💰',
    CHECKIN_REMINDER:  '⏰',
    NEW_BOOKING_ALERT: '🔔',
  };

  container.innerHTML = filtered.map((n, i) => `
    <div class="nt-item ${n.is_read ? '' : 'unread'}" style="animation-delay:${i * 0.04}s" onclick="markRead(${n.notification_id})">
      <div class="nt-item-icon ${n.type}">${typeIcon[n.type] ?? '🔔'}</div>
      <div class="nt-item-body">
        <div class="nt-item-header">
          <div class="nt-item-title">${n.title}</div>
          <span class="nt-type-badge ${n.type}">${typeLabel(n.type)}</span>
        </div>
        <div class="nt-item-body-text">${n.body}</div>
        <div class="nt-item-meta">
          <span class="nt-item-time">🕐 ${formatDateTime(n.sent_at)}</span>
          ${n.booking_id ? `<span>📌 ${n.booking_id}</span>` : ''}
          ${!n.is_read ? '<span style="color:var(--nt-indigo);font-weight:600">ยังไม่ได้อ่าน</span>' : ''}
        </div>
      </div>
      ${!n.is_read ? '<div class="nt-unread-dot"></div>' : ''}
    </div>
  `).join('');
}

function getFiltered() {
  return NOTIFICATIONS.filter(n => {
    if (currentFilter === 'unread') return !n.is_read;
    if (currentFilter !== 'all')    return n.type === currentFilter;
    return true;
  });
}

/* ── FILTER ── */
function filterNotifications(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.nt-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

/* ── MARK READ ── */
async function markRead(id) {
  const n = NOTIFICATIONS.find(x => x.notification_id === id);
  if (n && !n.is_read) {
    // 1. อัปเดต UI ทันที (Optimistic Update)
    n.is_read = true;
    renderStats();
    renderList();

    // 2. ยิง API อัปเดตสถานะที่ Backend
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      // หากต้องการให้สมบูรณ์ขึ้น สามารถเขียน Logic คืนค่า n.is_read กลับเป็น false ได้ถ้ายิง API พลาด
    }
  }
}

async function markAllRead() {
  // 1. อัปเดต UI ทันที
  NOTIFICATIONS.forEach(n => n.is_read = true);
  renderStats();
  renderList();
  showToast('⏳ กำลังอัปเดต...');

  // 2. ยิง API
  try {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (result.status === 'success') {
      showToast('✅ ทำเครื่องหมายอ่านทั้งหมดแล้ว');
    } else {
      showToast('❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    showToast('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

/* ── TOAST ── */
function showToast(msg) {
  document.getElementById('nt-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'nt-toast'; t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:#EEF2FF;color:#3730A3;border:1.5px solid #A5B4FC;padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ── UTILS ── */
function formatDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function typeLabel(t) {
  return {
    CARE_REPORT:       'รายงานดูแล',
    BOOKING_CONFIRMED: 'ยืนยันจอง',
    BOOKING_CANCELLED: 'ยกเลิกจอง',
    PAYMENT_CONFIRMED: 'ชำระเงิน',
    CHECKIN_REMINDER:  'แจ้งเตือน',
    NEW_BOOKING_ALERT: 'จองใหม่',
  }[t] ?? t;
}