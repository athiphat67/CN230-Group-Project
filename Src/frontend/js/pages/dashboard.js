/**
 * dashboard.js — Purrfect Stay Dashboard
 * เชื่อม API จริงครบ: bookings, notifications, staff, rooms, analytics
 * Refactored: ใช้ shared sidebar.js / navbar.js / api.js
 */

/* ─── STATE ─────────────────────────────── */
let _clockAction = null;   // 'CLOCK_IN' | 'CLOCK_OUT'
let _clockTimer  = null;

/* ─── INIT ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  _setWelcome();
  await loadDashboard();
});

/* ─── WELCOME SECTION ────────────────────── */
function _setWelcome() {
  const firstName = localStorage.getItem('first_name') || 'สวัสดี';
  const el = document.getElementById('welcome-name');
  if (el) el.textContent = firstName;

  const dateEl = document.getElementById('welcome-date');
  if (dateEl) {
    const now = new Date();
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    dateEl.textContent = now.toLocaleDateString('th-TH', opts);
  }

  // Check if already clocked in today (simple localStorage flag)
  const clockedIn = localStorage.getItem('db_clocked_in_today');
  const today     = new Date().toLocaleDateString('en-CA');
  if (clockedIn === today) {
    const btnText = document.getElementById('clock-btn-text');
    if (btnText) btnText.textContent = 'ลงเวลาออก';
  }
}

/* ─── MASTER LOAD ────────────────────────── */
async function loadDashboard() {
  try {
    // Parallel fetch ทั้งหมดพร้อมกัน
    const today = new Date().toLocaleDateString('en-CA');

    const [bookingsRes, notifRes, staffRes, roomsRes, analyticsRes] = await Promise.allSettled([
      window.API.bookings.getAll(),
      window.API.notifications.getAll({ is_read: false }),
      window.API.staff.getAll(),
      window.API.rooms.getAll(),
      window.API.analytics.getDashboard({ start_date: today, end_date: today }),
    ]);

    // Extract data safely
    const bookings  = _extract(bookingsRes,   []);
    const notifs    = _extract(notifRes,      []);
    const staff     = _extract(staffRes,      []);
    const rooms     = _extract(roomsRes,      []);
    const analytics = _extractObj(analyticsRes, null);

    // Render each section
    renderStats(bookings, analytics, rooms);
    renderPriorityCheckin(bookings);
    renderPendingTable(bookings);
    renderActiveTable(bookings);
    renderTeam(staff);
    renderNotifications(notifs);
    renderRoomGrid(rooms, bookings);

  } catch (err) {
    console.error('[Dashboard] Load error:', err);
    showToast('❌ โหลดข้อมูล Dashboard ไม่สำเร็จ', 'warn');
  }
}

/* ─── SAFE EXTRACT HELPERS ───────────────── */
function _extract(settled, fallback) {
  if (settled.status !== 'fulfilled') return fallback;
  const res = settled.value;
  if (!res.ok) return fallback;
  return res.data?.data ?? res.data ?? fallback;
}

function _extractObj(settled, fallback) {
  if (settled.status !== 'fulfilled') return fallback;
  const res = settled.value;
  if (!res.ok) return fallback;
  return res.data?.data ?? res.data ?? fallback;
}

/* ─── 1. KPI STAT CARDS ──────────────────── */
function renderStats(bookings, analytics, rooms) {
  const today = new Date().toLocaleDateString('en-CA');

  // นับ PENDING (รอ check-in)
  const pending = bookings.filter(b => b.status === 'PENDING').length;
  _setText('stat-checkins', pending);

  // นับ ACTIVE (กำลังพัก)
  const active     = bookings.filter(b => b.status === 'CHECKED_IN').length;
  const totalRooms = rooms.length || 1;
  const occ        = Math.round((active / totalRooms) * 100);
  _setText('stat-active', active);
  _setText('stat-occupancy', `Occupancy ${occ}%`);

  // Check-out วันนี้ (booking ที่ checkout_date เป็นวันนี้)
  const todayCheckouts = bookings.filter(b => {
    const co = (b.checkout_date || b.checkout || '').slice(0, 10);
    return co === today;
  }).length;
  _setText('stat-checkouts', todayCheckouts);

  // รายรับวันนี้จาก analytics (ถ้าไม่ได้รับให้แสดง —)
  if (analytics?.revenue?.total !== undefined) {
    const rev = analytics.revenue.total;
    _setText('stat-revenue', `฿${Math.round(rev).toLocaleString()}`);
  } else {
    _setText('stat-revenue', '—');
  }
}

/* ─── 2. PRIORITY CHECK-IN ───────────────── */
function renderPriorityCheckin(bookings) {
  const pending = bookings
    .filter(b => b.status === 'PENDING')
    .sort((a, b) => new Date(a.checkin_date || a.checkin) - new Date(b.checkin_date || b.checkin));

  const avatarEl  = document.getElementById('priority-avatar');
  const nameEl    = document.getElementById('priority-pet-name');
  const detailEl  = document.getElementById('priority-detail');

  if (!pending.length) {
    if (avatarEl)  avatarEl.textContent  = '✅';
    if (nameEl)    nameEl.textContent    = 'ไม่มีการจองที่รอ Check-in';
    if (detailEl)  detailEl.textContent  = 'ทุกการจองในวันนี้ดำเนินการแล้ว';
    return;
  }

  const top = pending[0];
  const emoji = _petEmoji(top.pet_species);
  if (avatarEl)  avatarEl.textContent = emoji;
  if (nameEl)    nameEl.textContent   = `${top.pet_name} (${top.breed || '—'})`;
  if (detailEl)  detailEl.textContent = `เจ้าของ: ${top.owner_name} · ห้อง ${top.room_number || top.room || '—'} · Check-in: ${_fmtDate(top.checkin_date || top.checkin)}`;
}

/* ─── 3. PENDING TABLE ───────────────────── */
function renderPendingTable(bookings) {
  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;

  const list = bookings.filter(b => b.status === 'PENDING').slice(0, 6);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="db-loading-cell">ไม่มีการจองที่รอ Check-in 🎉</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    const nights = _calcNights(b.checkin_date || b.checkin, b.checkout_date || b.checkout);
    return `
      <tr>
        <td>
          <div class="db-pet-cell">
            <div class="db-pet-emoji">${_petEmoji(b.pet_species)}</div>
            <div>
              <div class="db-pet-name">${b.pet_name}</div>
              <div class="db-pet-meta">${b.owner_name}</div>
            </div>
          </div>
        </td>
        <td><span class="db-room-badge">${b.room_number || b.room || '—'}</span></td>
        <td style="font-size:12.5px;color:var(--db-text-2)">${_fmtDate(b.checkin_date || b.checkin)}</td>
        <td style="font-size:12.5px;color:var(--db-text-2)">${nights} คืน</td>
      </tr>
    `;
  }).join('');
}

/* ─── 4. ACTIVE STAYS TABLE ─────────────── */
function renderActiveTable(bookings) {
  const tbody = document.getElementById('active-tbody');
  if (!tbody) return;

  const list = bookings.filter(b => b.status === 'CHECKED_IN').slice(0, 6);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="db-loading-cell">ไม่มีผู้เข้าพักในขณะนี้</td></tr>`;
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  tbody.innerHTML = list.map(b => {
    const coDate = new Date(b.checkout_date || b.checkout);
    coDate.setHours(0,0,0,0);
    const diff = Math.round((coDate - today) / 86400000);
    let daysBadge;
    if (diff === 0)      daysBadge = `<span class="db-days-badge today">วันนี้!</span>`;
    else if (diff === 1) daysBadge = `<span class="db-days-badge soon">พรุ่งนี้</span>`;
    else if (diff <= 2)  daysBadge = `<span class="db-days-badge soon">อีก ${diff} วัน</span>`;
    else                 daysBadge = `<span class="db-days-badge ok">อีก ${diff} วัน</span>`;

    return `
      <tr>
        <td>
          <div class="db-pet-cell">
            <div class="db-pet-emoji">${_petEmoji(b.pet_species)}</div>
            <div>
              <div class="db-pet-name">${b.pet_name}</div>
              <div class="db-pet-meta">${b.owner_name}</div>
            </div>
          </div>
        </td>
        <td><span class="db-room-badge">${b.room_number || b.room || '—'}</span></td>
        <td style="font-size:12.5px;color:var(--db-text-2)">${_fmtDate(b.checkout_date || b.checkout)}</td>
        <td>${daysBadge}</td>
      </tr>
    `;
  }).join('');
}

/* ─── 5. TEAM ON DUTY ────────────────────── */
function renderTeam(staff) {
  const listEl  = document.getElementById('team-list');
  const badgeEl = document.getElementById('team-badge');

  if (!staff.length) {
    if (listEl) listEl.innerHTML = '<div class="db-loading-state">ไม่พบข้อมูลพนักงาน</div>';
    return;
  }

  const onDuty  = staff.filter(s => s.is_on_duty).length;
  if (badgeEl) badgeEl.textContent = `${onDuty} Online`;

  const colors = ['blue','teal','amber','rose','purple','slate'];

  if (listEl) {
    listEl.innerHTML = staff.slice(0, 6).map((s, i) => {
      const initial = (s.first_name || '?').charAt(0);
      const color   = colors[i % colors.length];
      const online  = s.is_on_duty;
      return `
        <div class="db-team-member">
          <div class="db-team-av ${color}">${initial}</div>
          <div class="db-member-info">
            <div class="db-member-name">${s.first_name} ${s.last_name}</div>
            <div class="db-member-role">${_roleLabel(s.role)}</div>
          </div>
          <div class="db-online-dot ${online ? 'online' : 'offline'}"></div>
        </div>
      `;
    }).join('');
  }
}

/* ─── 6. NOTIFICATIONS ───────────────────── */
function renderNotifications(notifs) {
  const listEl  = document.getElementById('notif-list');
  const badgeEl = document.getElementById('unread-badge');

  const unread = notifs.filter(n => !n.is_read).length;
  if (badgeEl) {
    badgeEl.style.display = unread > 0 ? 'inline-flex' : 'none';
    badgeEl.textContent   = unread;
  }

  if (!notifs.length) {
    if (listEl) listEl.innerHTML = '<div class="db-loading-state">🎉 ไม่มีการแจ้งเตือนใหม่</div>';
    return;
  }

  const typeIcon = {
    CARE_REPORT: '📋', BOOKING_CONFIRMED: '✅', BOOKING_CANCELLED: '❌',
    PAYMENT_CONFIRMED: '💰', CHECKIN_REMINDER: '⏰', NEW_BOOKING_ALERT: '🔔',
  };

  if (listEl) {
    listEl.innerHTML = notifs.slice(0, 5).map(n => `
      <div class="db-notif-item ${n.is_read ? '' : 'unread'}"
           onclick="window.location.href='Notifications.html'">
        <div class="db-notif-icon">${typeIcon[n.type] || '🔔'}</div>
        <div class="db-notif-content">
          <div class="db-notif-title">${n.title || '—'}</div>
          <div class="db-notif-time">🕐 ${_fmtDateTime(n.sent_at)}</div>
        </div>
        ${!n.is_read ? '<div class="db-notif-dot"></div>' : ''}
      </div>
    `).join('');
  }
}

/* ─── 7. ROOM GRID ───────────────────────── */
function renderRoomGrid(rooms, bookings) {
  const wrap = document.getElementById('room-grid-wrap');
  if (!wrap) return;

  if (!rooms.length) {
    wrap.innerHTML = '<div class="db-loading-state">ไม่พบข้อมูลห้องพัก</div>';
    return;
  }

  // Group rooms by pet_type (zone)
  const zones = {};
  rooms.forEach(r => {
    const zone = r.pet_type || 'OTHER';
    if (!zones[zone]) zones[zone] = [];
    zones[zone].push(r);
  });

  const zoneConfig = {
    CAT: { label: 'โซนแมว (Cat Suites)', icon: '🐱' },
    DOG: { label: 'โซนสุนัข (Dog Wing)', icon: '🐶' },
    OTHER: { label: 'ห้องอื่นๆ', icon: '🐾' },
  };

  // Active booking room IDs
  const activeRoomIds = new Set(
    bookings.filter(b => b.status === 'CHECKED_IN').map(b => b.room_id)
  );

  wrap.innerHTML = '';

  Object.entries(zones).forEach(([zone, zoneRooms]) => {
    const cfg = zoneConfig[zone] || { label: zone, icon: '🏠' };
    const occupied  = zoneRooms.filter(r => r.status !== 'AVAILABLE' && r.status !== 'MAINTENANCE' || activeRoomIds.has(r.room_id)).length;
    const available = zoneRooms.filter(r => r.status === 'AVAILABLE' && !activeRoomIds.has(r.room_id)).length;
    const pct = Math.round((occupied / zoneRooms.length) * 100);

    const roomDots = zoneRooms.map(r => {
      let cls = 'available';
      if (activeRoomIds.has(r.room_id) || r.status === 'OCCUPIED') cls = 'occupied';
      else if (r.status === 'MAINTENANCE') cls = 'maintenance';
      return `<div class="db-mini-room ${cls}" title="${r.room_number || r.room_type}">${r.room_number || ''}</div>`;
    }).join('');

    const card = document.createElement('div');
    card.className = 'db-room-zone-card';
    card.innerHTML = `
      <div class="db-zone-header">
        <div class="db-zone-title">${cfg.icon} ${cfg.label}</div>
        <div class="db-zone-pct">${pct}% occupied</div>
      </div>
      <div class="db-mini-rooms">${roomDots}</div>
      <div class="db-zone-footer">
        <span>🔴 ${occupied} มีผู้เข้าพัก</span>
        <span>🟢 ${available} ว่าง</span>
        <span>ทั้งหมด ${zoneRooms.length}</span>
      </div>
    `;
    wrap.appendChild(card);
  });
}

/* ─── CLOCK IN / OUT ─────────────────────── */
function handleClockAction() {
  const today    = new Date().toLocaleDateString('en-CA');
  const clockedIn = localStorage.getItem('db_clocked_in_today') === today;

  _clockAction = clockedIn ? 'CLOCK_OUT' : 'CLOCK_IN';
  const now    = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const title = _clockAction === 'CLOCK_IN' ? 'ยืนยันลงเวลาเข้างาน' : 'ยืนยันลงเวลาออกงาน';
  _setText('clock-modal-title', title);

  const box = document.getElementById('clock-box');
  if (box) {
    box.innerHTML = `
      <div class="clock-action-label">${_clockAction === 'CLOCK_IN' ? '🟢 เข้างาน' : '🔴 ออกงาน'}</div>
      <div class="clock-time">${timeStr}</div>
      <div class="clock-date">${dateStr}</div>
    `;
  }

  document.getElementById('modal-clock').style.display = 'flex';

  // Live clock update
  _clockTimer = setInterval(() => {
    const t = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeEl = box?.querySelector('.clock-time');
    if (timeEl) timeEl.textContent = t;
  }, 1000);
}

async function confirmClock() {
  const btn = document.getElementById('clock-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...'; }

  clearInterval(_clockTimer);

  const staffId = localStorage.getItem('staff_id');
  if (!staffId) {
    showToast('⚠️ ไม่พบข้อมูล Session กรุณา Login ใหม่', 'warn');
    closeClockModal();
    return;
  }

  try {
    const res = await window.API.attendance.clock(staffId, _clockAction);
    if (res.ok) {
      const today = new Date().toLocaleDateString('en-CA');
      if (_clockAction === 'CLOCK_IN') {
        localStorage.setItem('db_clocked_in_today', today);
        _setText('clock-btn-text', 'ลงเวลาออก');
        showToast('✅ ลงเวลาเข้างานสำเร็จ!');
      } else {
        localStorage.removeItem('db_clocked_in_today');
        _setText('clock-btn-text', 'ลงเวลาเข้างาน');
        showToast('✅ ลงเวลาออกงานสำเร็จ!');
      }
    } else {
      showToast('⚠️ ' + (res.data?.message || 'บันทึกไม่สำเร็จ'), 'warn');
    }
  } catch (e) {
    showToast('❌ ไม่สามารถเชื่อมต่อ Server ได้', 'warn');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ ยืนยัน'; }
    closeClockModal();
  }
}

function closeClockModal() {
  clearInterval(_clockTimer);
  document.getElementById('modal-clock').style.display = 'none';
}

/* ─── TOAST ──────────────────────────────── */
function showToast(msg, type = 'success') {
  document.getElementById('db-toast')?.remove();
  const c = type === 'warn'
    ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
    : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
  const t = document.createElement('div');
  t.id = 'db-toast'; t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${c.bg}; color:${c.color}; border:1.5px solid ${c.border};
    padding:12px 20px; border-radius:14px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);
    animation:dbFadeUp .3s ease; max-width:380px;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ─── UTILS ──────────────────────────────── */
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _petEmoji(species) {
  const s = (species || '').toLowerCase();
  return s.includes('cat') ? '🐱' : s.includes('dog') ? '🐶' : '🐾';
}

function _fmtDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function _fmtDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('th-TH', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function _calcNights(checkin, checkout) {
  const a = new Date(checkin), b = new Date(checkout);
  return Math.max(1, Math.round((b - a) / 86400000));
}

function _roleLabel(role) {
  return { ADMIN: 'ผู้ดูแลระบบ', STAFF: 'พนักงาน', OWNER: 'เจ้าของ' }[role] ?? role;
}