/**
 * Notifications.js — Page logic for Notification Management (FR7)
 * Purrfect Stay Admin Panel
 */

/* ── MOCK DATA ── */
const NOTIFICATIONS = [
  { notification_id: 1, type: 'NEW_BOOKING_ALERT',  title: 'การจองใหม่ — น้องมะม่วง',  body: 'อาพิญา ศ. ได้สร้างการจองใหม่สำหรับน้องมะม่วง ห้อง A01 Check-in 2 เม.ย.',    booking_id: 'BK-0001', is_read: false, sent_at: '2026-04-21T09:05:00' },
  { notification_id: 2, type: 'CHECKIN_REMINDER',   title: 'แจ้งเตือน Check-in พรุ่งนี้ — น้องบิ๊กบอย', body: 'บิ๊กบอย (Golden Retriever) กำหนด Check-in พรุ่งนี้ ห้อง V-02',     booking_id: 'BK-0003', is_read: false, sent_at: '2026-04-21T08:00:00' },
  { notification_id: 3, type: 'CARE_REPORT',        title: 'รายงานดูแลรายวัน — น้องมะม่วง', body: 'นริน พรหมดี ได้อัปเดตรายงานดูแลน้องมะม่วงประจำวันที่ 5 เม.ย. อารมณ์: Happy 😄', booking_id: 'BK-0001', is_read: false, sent_at: '2026-04-21T18:00:00' },
  { notification_id: 4, type: 'PAYMENT_CONFIRMED',  title: 'ยืนยันการชำระเงิน — INV-0001', body: 'ชำระเงินสำเร็จ ฿2,350 สำหรับ Booking BK-0001 โดย เงินสด',             booking_id: 'BK-0001', is_read: true,  sent_at: '2026-04-20T14:30:00' },
  { notification_id: 5, type: 'BOOKING_CONFIRMED',  title: 'ยืนยันการจอง — น้องโดนัท',  body: 'ยืนยันการจองน้องโดนัท ห้อง A03 Check-in 3 เม.ย. — Check-out 6 เม.ย.',      booking_id: 'BK-0002', is_read: true,  sent_at: '2026-04-19T10:30:00' },
  { notification_id: 6, type: 'CARE_REPORT',        title: 'รายงานดูแลรายวัน — น้องทาโร่', body: 'สมชาย มั่นคง รายงานว่าน้องทาโร่ท้องเสียเล็กน้อย อารมณ์: Sick 🤒 ควรติดตามอาการ', booking_id: 'BK-0006', is_read: true,  sent_at: '2026-04-19T17:00:00' },
  { notification_id: 7, type: 'BOOKING_CANCELLED',  title: 'ยกเลิกการจอง — น้องโคโค่', body: 'ยกเลิกการจอง BK-0008 สำหรับน้องโคโค่ เนื่องจากเจ้าของป่วย',             booking_id: 'BK-0008', is_read: true,  sent_at: '2026-04-18T09:00:00' },
  { notification_id: 8, type: 'NEW_BOOKING_ALERT',  title: 'การจองใหม่ — น้องพีช',     body: 'มาลี สุขสันต์ ได้สร้างการจองใหม่สำหรับน้องพีช ห้อง C02 ระยะเวลา 5 คืน',  booking_id: 'BK-0009', is_read: true,  sent_at: '2026-04-18T14:00:00' },
];

/* ── STATE ── */
let currentFilter = 'all';

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  renderList();

  // TODO: เชื่อม API จริง
  // window.API.notifications.getAll().then(res => { if (res.ok) { NOTIFICATIONS.length=0; res.data.forEach(n=>NOTIFICATIONS.push(n)); } renderStats(); renderList(); });
});

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
function markRead(id) {
  const n = NOTIFICATIONS.find(x => x.notification_id === id);
  if (n && !n.is_read) {
    n.is_read = true;
    // TODO: PATCH /api/notifications/{id}/read
    renderStats();
    renderList();
  }
}

function markAllRead() {
  NOTIFICATIONS.forEach(n => n.is_read = true);
  // TODO: PATCH /api/notifications/read-all
  renderStats();
  renderList();
  showToast('✅ ทำเครื่องหมายอ่านทั้งหมดแล้ว');
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