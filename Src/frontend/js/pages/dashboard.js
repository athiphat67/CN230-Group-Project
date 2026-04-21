/**
 * dashboard.js — Page logic for Dashboard
 * Purrfect Stay Admin Panel
 * Refactored: uses window.API, shared sidebar/navbar
 */

/* ── MOCK FALLBACK DATA ── */
const MOCK_DASHBOARD = {
  stats: {
    pending_checkins: 12,
    pending_checkouts: 8,
    active_stays: 42,
    total_rooms: 50,
    today_revenue: 18500,
  },
  priority_checkin: {
    pet_name: 'บิ๊กบอย',
    breed: 'Golden Retriever',
    emoji: '🐶',
    room: 'V-02',
    eta: 'กำลังจะมาถึงใน 15 นาที',
    booking_id: 'BK-0003',
  },
  recent_checkins: [
    { pet_name: 'มะม่วง', pet_emoji: '🐈', breed: 'Scottish Fold', owner: 'อาพิญา ศ.', room: 'A01', nights: 4, checkout: '05 เม.ย.' },
    { pet_name: 'โดนัท',  pet_emoji: '🐕', breed: 'Labrador',       owner: 'ชัญญา ด.', room: 'A03', nights: 3, checkout: '06 เม.ย.' },
    { pet_name: 'ทาโร่',  pet_emoji: '🐶', breed: 'Pomeranian',     owner: 'ณิชา ร.',  room: 'B04', nights: 4, checkout: '08 เม.ย.' },
  ],
  team_on_duty: [
    { name: 'มาลี สุขสันต์',  role: 'พนักงานดูแล', initial: 'มา', color: 'blue',   online: true },
    { name: 'นริน พรหมดี',    role: 'พนักงานดูแล', initial: 'นร', color: 'teal',   online: true },
    { name: 'ปอร์น ใจดี',     role: 'ช่างซ่อมบำรุง', initial: 'ปอ', color: 'amber', online: false },
  ],
  notifications: [
    { type: 'NEW_BOOKING_ALERT', title: 'การจองใหม่ — น้องมะม่วง', time: '9:05 น.', unread: true },
    { type: 'CHECKIN_REMINDER', title: 'แจ้งเตือน Check-in พรุ่งนี้ — บิ๊กบอย', time: '8:00 น.', unread: true },
    { type: 'CARE_REPORT', title: 'รายงานดูแลรายวัน — น้องทาโร่', time: 'เมื่อวาน', unread: false },
  ],
  room_zones: [
    {
      label: 'โซนสุนัข (Dog Wing)', icon: '🏠',
      rooms: [1,0,1,0,1,0,0,1,1,0], // 1=occupied 0=available
      total: 10,
    },
    {
      label: 'โซนแมว (Cat Suites)', icon: '❄️',
      rooms: [1,1,1,0,1,0,0,1,0,0],
      total: 10,
    },
    {
      label: 'VIP Penthouses', icon: '⭐',
      rooms: [0,1,0,1,1,0,0,1],
      labels: ['V-01','V-02','V-03','V-04','V-05','V-06','V-07','V-08'],
      total: 8,
    },
  ],
};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // Set welcome name from localStorage (set during login)
  const staffName = localStorage.getItem('staff_name') || 'สมชาย';
  const firstName = staffName.split(' ')[0];
  const welcomeEl = document.getElementById('welcome-name');
  if (welcomeEl) welcomeEl.textContent = firstName;

  await loadDashboard();
});

async function loadDashboard() {
  // TODO: เชื่อม API จริง — uncomment เมื่อ backend พร้อม
  // try {
  //   const [bookingsRes, notifRes] = await Promise.all([
  //     window.API.bookings.getAll({ status: 'CHECKED_IN' }),
  //     window.API.notifications.getAll({ is_read: false }),
  //   ]);
  //   // process real data
  // } catch (err) {
  //   console.warn('[Dashboard] API unavailable, using mock data');
  // }

  const data = MOCK_DASHBOARD; // ชั่วคราว ใช้ mock
  renderStats(data.stats);
  renderPriorityCheckin(data.priority_checkin);
  renderRecentCheckins(data.recent_checkins);
  renderTeam(data.team_on_duty);
  renderNotifications(data.notifications);
  renderRoomGrid(data.room_zones);
}

/* ── RENDER STATS ── */
function renderStats(stats) {
  document.getElementById('stat-checkins').textContent   = String(stats.pending_checkins).padStart(2, '0');
  document.getElementById('stat-checkouts').textContent  = String(stats.pending_checkouts).padStart(2, '0');
  document.getElementById('stat-active').textContent     = stats.active_stays;
  document.getElementById('stat-revenue').textContent    = `฿${stats.today_revenue.toLocaleString()}`;
  document.getElementById('stat-checkins-trend').textContent = `↗ +4 จากเมื่อวาน`;

  const occ = stats.total_rooms > 0
    ? Math.round((stats.active_stays / stats.total_rooms) * 100)
    : 0;
  document.getElementById('stat-occupancy').textContent = `Occupancy ${occ}%`;
}

/* ── RENDER PRIORITY CHECKIN ── */
function renderPriorityCheckin(p) {
  if (!p) return;
  document.querySelector('.db-priority-avatar').textContent = p.emoji || '🐾';
  document.getElementById('priority-pet-name').textContent = `${p.pet_name} (${p.breed})`;
  document.getElementById('priority-detail').textContent   = `${p.eta} • ต้องการห้อง ${p.room}`;
}

/* ── RENDER RECENT CHECK-INS ── */
function renderRecentCheckins(checkins) {
  const tbody = document.getElementById('recent-checkins-tbody');
  if (!checkins || checkins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-3)">ไม่มีข้อมูล</td></tr>`;
    return;
  }
  tbody.innerHTML = checkins.map(c => `
    <tr>
      <td>
        <div class="db-td-pet">
          <div class="db-td-avatar">${c.pet_emoji}</div>
          <div>
            <p class="db-td-name">${c.pet_name}</p>
            <p class="db-td-meta">${c.breed} · ${c.owner}</p>
          </div>
        </div>
      </td>
      <td style="font-weight:600;color:var(--accent)">${c.room}</td>
      <td style="font-size:13px;color:var(--text-2)">${c.nights} คืน (เช็กเอาต์ ${c.checkout})</td>
      <td><button class="db-btn-more" onclick="window.location.href='Bookings.html'">⋮</button></td>
    </tr>
  `).join('');
}

/* ── RENDER TEAM ── */
function renderTeam(team) {
  const list = document.getElementById('team-list');
  const countEl = document.getElementById('team-count');

  const onlineCount = team.filter(m => m.online).length;
  if (countEl) countEl.textContent = `${onlineCount} Active`;

  list.innerHTML = team.map(member => `
    <div class="db-team-member">
      <div class="db-team-av ${member.color}">${member.initial}</div>
      <div class="db-member-info">
        <p>${member.name}</p>
        <span>${member.role}</span>
      </div>
      <div class="db-status-dot ${member.online ? 'green' : 'orange'}"></div>
    </div>
  `).join('');
}

/* ── RENDER NOTIFICATIONS ── */
function renderNotifications(notifs) {
  const container = document.getElementById('notif-list');
  const icons = {
    NEW_BOOKING_ALERT: '🔔',
    CHECKIN_REMINDER:  '⏰',
    CARE_REPORT:       '📋',
    PAYMENT_CONFIRMED: '💰',
    BOOKING_CONFIRMED: '✅',
    BOOKING_CANCELLED: '❌',
  };
  container.innerHTML = notifs.slice(0, 4).map(n => `
    <div class="db-notif-item ${n.unread ? 'unread' : ''}">
      <div class="db-notif-icon">${icons[n.type] || '🔔'}</div>
      <div class="db-notif-body">
        <div class="db-notif-title">${n.title}</div>
        <div class="db-notif-time">${n.time}</div>
      </div>
      ${n.unread ? '<div class="db-notif-dot"></div>' : ''}
    </div>
  `).join('');
}

/* ── RENDER ROOM GRID ── */
function renderRoomGrid(zones) {
  const grid = document.getElementById('room-grid');
  grid.innerHTML = zones.map(zone => {
    const occupied  = zone.rooms.filter(r => r === 1).length;
    const available = zone.total - occupied;
    const pct = Math.round((occupied / zone.total) * 100);

    const roomsHtml = zone.rooms.map((r, i) => {
      const label = zone.labels ? zone.labels[i] : '';
      return `<div class="db-m-room ${r === 1 ? 'occupied' : 'available'}">${label}</div>`;
    }).join('');

    return `
      <div class="db-room-card">
        <div class="db-room-card-header">
          <span>${zone.icon}</span>
          <h3>${zone.label}</h3>
        </div>
        <div class="db-mini-rooms ${zone.labels ? 'labels' : ''}">
          ${roomsHtml}
        </div>
        <div class="db-room-card-footer">
          <span>${available}/${zone.total} FREE</span>
          <span class="db-room-pct">${pct}% occupied</span>
        </div>
      </div>
    `;
  }).join('');
}

/* ── CLOCK IN ── */
async function handleClockIn() {
  const staffId = localStorage.getItem('staff_id');
  if (!staffId) {
    showToast('⚠️ ไม่พบข้อมูล session กรุณา login ใหม่', 'warn');
    return;
  }
  // TODO: เชื่อม API จริง
  // await window.API.attendance.clock(staffId, 'CLOCK_IN');
  showToast('✅ ลงเวลาเข้างานสำเร็จ!');
}

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  document.getElementById('db-toast')?.remove();
  const c = type === 'warn'
    ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
    : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
  const t = document.createElement('div');
  t.id = 'db-toast';
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${c.bg};color:${c.color};border:1.5px solid ${c.border};padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;max-width:380px;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}
