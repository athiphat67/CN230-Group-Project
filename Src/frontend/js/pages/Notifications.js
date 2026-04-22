/**
 * Notifications.js — Page logic for Notification Management (FR7)
 * Purrfect Stay Admin Panel
 */

/* ── STATE ── */
let statusFilter = 'all';
let typeFilter = 'all';
let NOTIFICATIONS = [];
let META = { page: 1, page_size: 8, total: 0, total_pages: 1, unread_count: 0 };
const NOTIFICATIONS_PAGE_KEY = 'admin-notifications';
const NOTIFICATIONS_PAGE_SIZE = 8;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  renderStats();
  renderList();
  bindTypeFilter();
  await fetchNotifications({ page: 1 });
});

/* ── API CALLS ── */
async function fetchNotifications({ page = META.page || 1 } = {}) {
  try {
    const params = {
      page,
      page_size: NOTIFICATIONS_PAGE_SIZE,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.type = typeFilter;
    const response = await window.API.notifications.getAll(params);
    
    if (response && response.ok) {
      const backendPayload = response.data;

      if (backendPayload && backendPayload.status === 'success') {
        NOTIFICATIONS = (backendPayload.data || []).map(normalizeNotification);
        META = {
          ...META,
          ...(backendPayload.meta || {}),
          page: backendPayload.meta?.page || page,
        };
        renderStats();
        renderList();
      } else {
        console.error('Backend returned an error:', backendPayload);
        showToast('❌ ไม่สามารถโหลดการแจ้งเตือนได้');
      }
    } else {
      console.error('Failed to load notifications. Raw Data:', response);
      showToast('❌ โหลดข้อมูลล้มเหลว (HTTP Error)');
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    showToast('❌ ขัดข้อง: การเชื่อมต่อเซิร์ฟเวอร์ผิดพลาด');
  }
}

/* ── STATS ── */
function renderStats() {
  const unread       = Number(META.unread_count || 0);
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
  const page = {
    page: META.page,
    pageSize: META.page_size,
    total: META.total,
    totalPages: META.total_pages,
    start: META.total === 0 ? 0 : ((META.page - 1) * META.page_size),
    end: Math.min((META.page - 1) * META.page_size + NOTIFICATIONS.length, META.total),
  };

  if (NOTIFICATIONS.length === 0) {
    container.innerHTML = '';
    emptyEl.style.display = 'block';
    window.Pagination?.render(page, {
      key: NOTIFICATIONS_PAGE_KEY,
      infoId: 'nt-count',
      label: 'รายการ',
      onChange: (newPage) => fetchNotifications({ page: newPage }),
    });
    return;
  }
  emptyEl.style.display = 'none';
  window.Pagination?.render(page, {
    key: NOTIFICATIONS_PAGE_KEY,
    infoId: 'nt-count',
    label: 'รายการ',
    onChange: (newPage) => fetchNotifications({ page: newPage }),
  });

  const typeIcon = {
    CARE_REPORT:       '📋',
    BOOKING_CONFIRMED: '✅',
    BOOKING_CANCELLED: '❌',
    PAYMENT_CONFIRMED: '💰',
    CHECKIN_REMINDER:  '⏰',
    NEW_BOOKING_ALERT: '🔔',
  };

  container.innerHTML = NOTIFICATIONS.map((n, i) => `
    <div class="nt-item ${n.is_read ? '' : 'unread'}" style="animation-delay:${i * 0.04}s">
      <div class="nt-item-icon ${n.type}">${typeIcon[n.type] ?? '🔔'}</div>
      <div class="nt-item-body">
        <div class="nt-item-header">
          <div class="nt-item-title">${n.title}</div>
          <span class="nt-type-badge ${n.type}">${typeLabel(n.type)}</span>
        </div>
        <div class="nt-item-body-text">${n.message || n.body || ''}</div>
        <div class="nt-item-meta">
          <span class="nt-item-time">🕐 ${formatDateTime(n.created_at || n.sent_at)}</span>
          ${n.related_id ? `<span>📌 ${n.related_id}</span>` : ''}
          ${!n.is_read ? '<span style="color:var(--nt-indigo);font-weight:600">ยังไม่ได้อ่าน</span>' : ''}
        </div>
        <div class="nt-item-actions">
          ${n.is_read
            ? `<button class="nt-row-btn secondary" onclick="toggleRead(${n.notification_id}, false)">ทำเป็นยังไม่อ่าน</button>`
            : `<button class="nt-row-btn" onclick="toggleRead(${n.notification_id}, true)">อ่านแล้ว</button>`
          }
        </div>
      </div>
      ${!n.is_read ? '<div class="nt-unread-dot"></div>' : ''}
    </div>
  `).join('');
}

/* ── FILTER ── */
async function filterNotifications(filter, btn) {
  statusFilter = filter;
  window.Pagination?.reset(NOTIFICATIONS_PAGE_KEY);
  document.querySelectorAll('.nt-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  await fetchNotifications({ page: 1 });
}

function bindTypeFilter() {
  const select = document.getElementById('nt-type-filter');
  if (!select) return;
  select.addEventListener('change', async (e) => {
    typeFilter = e.target.value;
    window.Pagination?.reset(NOTIFICATIONS_PAGE_KEY);
    await fetchNotifications({ page: 1 });
  });
}

/* ── MARK READ ── */
async function toggleRead(id, readValue) {
  const n = NOTIFICATIONS.find(x => x.notification_id === id);
  if (!n) return;
  const previous = n.is_read;
  n.is_read = !!readValue;
  renderList();
  try {
    await window.API.notifications.setReadStatus(id, !!readValue);
    await fetchNotifications({ page: META.page });
  } catch (error) {
    n.is_read = previous;
    renderList();
    console.error(`Error updating notification ${id} status:`, error);
    showToast('❌ อัปเดตสถานะไม่สำเร็จ');
  }
}

/* ── MARK READ ── */
async function markRead(id) {
  const n = NOTIFICATIONS.find(x => x.notification_id === id);
  if (n && !n.is_read) {
    await toggleRead(id, true);
  }
}

/* ── MARK READ ── */
async function markAllRead() {
  showToast('⏳ กำลังอัปเดต...');

  try {
    const response = await window.API.notifications.markAllRead();
    if (response && response.ok) {
      const backendPayload = response.data;
      if (backendPayload && backendPayload.status === 'success') {
        showToast('✅ ทำเครื่องหมายอ่านทั้งหมดแล้ว');
        await fetchNotifications({ page: 1 });
      } else {
        showToast('❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }
    } else {
      showToast('❌ ขัดข้อง: เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    }
  } catch (error) {
    console.error('Error marking all as read:', error);
    showToast('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

async function markAllUnread() {
  showToast('⏳ กำลังอัปเดต...');
  try {
    const response = await window.API.notifications.markAllUnread();
    if (response && response.ok && response.data?.status === 'success') {
      showToast('✅ ทำเครื่องหมายยังไม่อ่านทั้งหมดแล้ว');
      await fetchNotifications({ page: 1 });
      return;
    }
    showToast('❌ เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
  } catch (error) {
    console.error('Error marking all as unread:', error);
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

function normalizeNotification(n) {
  return {
    ...n,
    id: n.id ?? n.notification_id,
    notification_id: n.notification_id ?? n.id,
    message: n.message ?? n.body ?? '',
    related_id: n.related_id ?? n.booking_id ?? null,
    created_at: n.created_at ?? n.sent_at ?? null,
  };
}
