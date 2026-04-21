/**
 * PetCare.js — Page logic for Pet Care & Daily Monitoring
 * Purrfect Stay Admin Panel
 *
 * Handles: active stays list · care report cards ·
 *          create report modal · view report modal · mood filter
 */

/* ── MOCK DATA ── */
const ACTIVE_STAYS = [
  { booking_id: 'BK-0001', pet_name: 'มะม่วง', pet_emoji: '🐱', breed: 'Scottish Fold', room: 'A01', checkin: '2025-04-02', checkout: '2025-04-06', reported_today: true },
  { booking_id: 'BK-0002', pet_name: 'โดนัท', pet_emoji: '🐶', breed: 'Labrador', room: 'A03', checkin: '2025-04-03', checkout: '2025-04-06', reported_today: true },
  { booking_id: 'BK-0003', pet_name: 'บิ๊กบอย', pet_emoji: '🐕', breed: 'Golden Retriever', room: 'V-02', checkin: '2025-04-05', checkout: '2025-04-10', reported_today: false },
  { booking_id: 'BK-0006', pet_name: 'ทาโร่', pet_emoji: '🐶', breed: 'Pomeranian', room: 'B04', checkin: '2025-04-04', checkout: '2025-04-08', reported_today: false },
  { booking_id: 'BK-0009', pet_name: 'พีช', pet_emoji: '🐱', breed: 'Ragdoll', room: 'C02', checkin: '2025-04-04', checkout: '2025-04-09', reported_today: true },
  { booking_id: 'BK-0010', pet_name: 'โมจิ', pet_emoji: '🐶', breed: 'Corgi', room: 'B02', checkin: '2025-04-05', checkout: '2025-04-07', reported_today: false },
  { booking_id: 'BK-0011', pet_name: 'โนวา', pet_emoji: '🐱', breed: 'Maine Coon', room: 'C03', checkin: '2025-04-03', checkout: '2025-04-08', reported_today: true },
  { booking_id: 'BK-0012', pet_name: 'ดาวดิน', pet_emoji: '🐶', breed: 'Shih Tzu', room: 'A06', checkin: '2025-04-04', checkout: '2025-04-10', reported_today: false },
];

const CARE_REPORTS = [
  {
    report_id: 1, booking_id: 'BK-0001',
    pet_name: 'มะม่วง', pet_emoji: '🐱', room: 'A01',
    report_date: '2025-04-05',
    food_intake: 'กินหมด', bowel_activity: 'ปกติ',
    mood: 'HAPPY', behavior_notes: 'วิ่งเล่น ร้องขอกอด ดูมีชีวิตชีวามากขึ้น',
    notes: 'วันนี้น้องมะม่วงกินอาหารครบทุกมื้อ',
    reported_by: 'นริน พรหมดี', photo_urls: [],
    created_at: '2025-04-05T18:00:00',
  },
  {
    report_id: 2, booking_id: 'BK-0002',
    pet_name: 'โดนัท', pet_emoji: '🐶', room: 'A03',
    report_date: '2025-04-05',
    food_intake: 'กินบางส่วน', bowel_activity: 'ปกติ',
    mood: 'NEUTRAL', behavior_notes: 'สงบ นอนพักมาก ไม่ค่อยเล่น',
    notes: '',
    reported_by: 'มาลี สุขสันต์', photo_urls: [],
    created_at: '2025-04-05T17:30:00',
  },
  {
    report_id: 3, booking_id: 'BK-0009',
    pet_name: 'พีช', pet_emoji: '🐱', room: 'C02',
    report_date: '2025-04-05',
    food_intake: 'กินน้อย', bowel_activity: 'ถ่ายน้อย',
    mood: 'ANXIOUS', behavior_notes: 'ซ่อนตัวใต้เตียง ไม่ยอมออกมา ร้องเสียงดัง',
    notes: 'แจ้งเจ้าของแล้ว น้องพีชดูเครียด อาจต้องการสิ่งของที่คุ้นเคยจากบ้าน',
    reported_by: 'สมชาย มั่นคง', photo_urls: [],
    created_at: '2025-04-05T16:45:00',
  },
  {
    report_id: 4, booking_id: 'BK-0011',
    pet_name: 'โนวา', pet_emoji: '🐱', room: 'C03',
    report_date: '2025-04-05',
    food_intake: 'กินหมด', bowel_activity: 'ปกติ',
    mood: 'HAPPY', behavior_notes: 'เล่นของเล่น คลุกคลีกับ staff มาก',
    notes: '',
    reported_by: 'มาลี สุขสันต์', photo_urls: [],
    created_at: '2025-04-05T19:00:00',
  },
  {
    report_id: 5, booking_id: 'BK-0003',
    pet_name: 'บิ๊กบอย', pet_emoji: '🐕', room: 'V-02',
    report_date: '2025-04-04',
    food_intake: 'กินหมด', bowel_activity: 'ปกติ',
    mood: 'HAPPY', behavior_notes: 'ชอบเดินรอบห้อง VIP ดูอยากออกไปข้างนอก',
    notes: 'น้องบิ๊กบอยสุขภาพดีมาก ขอบคุณที่ดูแล',
    reported_by: 'นริน พรหมดี', photo_urls: [],
    created_at: '2025-04-04T18:30:00',
  },
  {
    report_id: 6, booking_id: 'BK-0006',
    pet_name: 'ทาโร่', pet_emoji: '🐶', room: 'B04',
    report_date: '2025-04-04',
    food_intake: 'กินบางส่วน', bowel_activity: 'ท้องเสีย',
    mood: 'SICK', behavior_notes: 'ซึมเซา ไม่ค่อยเคลื่อนไหว ท้องเสียเล็กน้อย',
    notes: 'แนะนำให้เจ้าของพาไปพบสัตวแพทย์หลัง check-out',
    reported_by: 'สมชาย มั่นคง', photo_urls: [],
    created_at: '2025-04-04T17:00:00',
  },
];

/* ── STATE ── */
let currentMoodFilter = 'all';
let currentStaySearch = '';
let pendingBookingId = null;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderActiveStays();
  renderReports();
  bindModalBackdrops();
  bindEscapeKey();

  // Set today's date as default for report
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('report-date');
  if (dateInput) dateInput.value = today;
});

/* ══════════════════════════════════════════
   ACTIVE STAYS
══════════════════════════════════════════ */
function renderActiveStays() {
  const list = document.getElementById('stays-list');
  const q = currentStaySearch.toLowerCase();

  const filtered = ACTIVE_STAYS.filter(s =>
    !q || s.pet_name.toLowerCase().includes(q) || s.room.toLowerCase().includes(q) || s.breed.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--pc-text-3);font-size:13px">ไม่พบรายการ</div>`;
    return;
  }

  list.innerHTML = filtered.map((s, i) => {
    const daysLeft = calcDaysLeft(s.checkout);
    return `
      <div class="pc-stay-item" style="animation-delay:${i * 0.05}s">
        <div class="pc-stay-emoji">${s.pet_emoji}</div>
        <div class="pc-stay-info">
          <div class="pc-stay-name">${s.pet_name}</div>
          <div class="pc-stay-meta">${s.breed} · Check-out ${formatDate(s.checkout)} (${daysLeft})</div>
          <div class="pc-stay-room">${s.room}</div>
        </div>
        <div class="pc-stay-actions">
          ${s.reported_today
            ? `<button class="pc-btn-report done" disabled>✓ บันทึกแล้ว</button>
               <div class="pc-report-badge">วันนี้</div>`
            : `<button class="pc-btn-report" onclick="openReportModal('${s.booking_id}')">+ บันทึก</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function filterActiveStays(q) {
  currentStaySearch = q;
  renderActiveStays();
}

function calcDaysLeft(checkout) {
  const diff = Math.ceil((new Date(checkout) - new Date()) / 86400000);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'อีก 1 วัน';
  if (diff < 0) return 'เกินกำหนด';
  return `อีก ${diff} วัน`;
}

/* ══════════════════════════════════════════
   CARE REPORTS
══════════════════════════════════════════ */
function renderReports() {
  const list = document.getElementById('reports-list');

  const filtered = CARE_REPORTS.filter(r =>
    currentMoodFilter === 'all' || r.mood === currentMoodFilter
  );

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="pc-empty-reports">
        <div class="pc-empty-reports-icon">📋</div>
        <p>ไม่พบรายงานสำหรับตัวกรองนี้</p>
      </div>
    `;
    return;
  }

  list.innerHTML = filtered.map((r, i) => `
    <div class="pc-report-card" style="animation-delay:${i * 0.06}s" onclick="openViewReport(${r.report_id})">
      <div class="pc-report-card-top">
        <div class="pc-report-pet">
          <div class="pc-report-emoji">${r.pet_emoji}</div>
          <div>
            <div class="pc-report-pet-name">${r.pet_name}</div>
            <div class="pc-report-pet-room">ห้อง ${r.room} · ${r.booking_id}</div>
          </div>
        </div>
        <div class="pc-report-mood">${moodEmoji(r.mood)}</div>
      </div>
      <div class="pc-report-date">📅 ${formatDate(r.report_date)} · บันทึกโดย ${r.reported_by}</div>
      <div class="pc-report-stats">
        <div class="pc-report-stat">
          <div class="pc-report-stat-label">อาหาร</div>
          <div class="pc-report-stat-val">${r.food_intake}</div>
        </div>
        <div class="pc-report-stat">
          <div class="pc-report-stat-label">ขับถ่าย</div>
          <div class="pc-report-stat-val">${r.bowel_activity}</div>
        </div>
        <div class="pc-report-stat">
          <div class="pc-report-stat-label">อารมณ์</div>
          <div class="pc-report-stat-val">${moodLabel(r.mood)}</div>
        </div>
      </div>
      ${r.behavior_notes ? `<div class="pc-report-notes">💬 ${r.behavior_notes}</div>` : ''}
      <div class="pc-report-caretaker">
        <svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        ${r.reported_by}
      </div>
    </div>
  `).join('');
}

function filterMood(mood, btn) {
  currentMoodFilter = mood;
  document.querySelectorAll('.pc-mood-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReports();
}

/* ══════════════════════════════════════════
   CREATE REPORT MODAL
══════════════════════════════════════════ */
function openReportModal(bookingId) {
  const stay = ACTIVE_STAYS.find(s => s.booking_id === bookingId);
  if (!stay) return;
  pendingBookingId = bookingId;

  document.getElementById('report-booking-id').value = bookingId;
  document.getElementById('report-subtitle').textContent = `${stay.pet_name} (${stay.breed}) — ห้อง ${stay.room}`;

  // Reset form fields
  document.getElementById('report-behavior').value = '';
  document.getElementById('report-food-detail').value = '';
  document.getElementById('report-notes').value = '';
  document.getElementById('report-food-intake').value = 'กินหมด';
  document.getElementById('report-bowel').value = 'ปกติ';
  document.querySelector('input[name="mood"][value="NEUTRAL"]').checked = true;
  document.getElementById('photo-preview').innerHTML = '';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('report-date').value = today;

  openModal('modal-report');
}

function submitReport() {
  const bookingId = document.getElementById('report-booking-id').value;
  const date = document.getElementById('report-date').value;
  const mood = document.querySelector('input[name="mood"]:checked')?.value ?? 'NEUTRAL';
  const foodIntake = document.getElementById('report-food-intake').value;
  const bowel = document.getElementById('report-bowel').value;
  const behavior = document.getElementById('report-behavior').value.trim();
  const notes = document.getElementById('report-notes').value.trim();

  if (!date) {
    showToast('⚠️ กรุณาเลือกวันที่รายงาน', 'warn');
    return;
  }

  const stay = ACTIVE_STAYS.find(s => s.booking_id === bookingId);
  if (!stay) return;

  // TODO: POST /api/care-reports
  const newReport = {
    report_id: CARE_REPORTS.length + 1,
    booking_id: bookingId,
    pet_name: stay.pet_name,
    pet_emoji: stay.pet_emoji,
    room: stay.room,
    report_date: date,
    food_intake: foodIntake,
    bowel_activity: bowel,
    mood,
    behavior_notes: behavior,
    notes,
    reported_by: 'สมชาย มั่นคง',
    photo_urls: [],
    created_at: new Date().toISOString(),
  };

  CARE_REPORTS.unshift(newReport);
  stay.reported_today = true;

  renderActiveStays();
  renderReports();
  closeModal('modal-report');
  showToast(`✅ บันทึกรายงานการดูแล ${stay.pet_name} สำเร็จ! ${notes ? '📲 แจ้งเจ้าของแล้ว' : ''}`);
}

/* ══════════════════════════════════════════
   VIEW REPORT MODAL
══════════════════════════════════════════ */
function openViewReport(reportId) {
  const r = CARE_REPORTS.find(x => x.report_id === reportId);
  if (!r) return;

  document.getElementById('view-report-subtitle').textContent = `${r.pet_name} — ${formatDate(r.report_date)}`;

  document.getElementById('view-report-body').innerHTML = `
    <div class="pc-mood-big">
      <div class="pc-mood-big-emoji">${moodEmoji(r.mood)}</div>
      <div class="pc-mood-big-label">${moodLabel(r.mood)}</div>
    </div>

    <div class="pc-view-grid">
      <div class="pc-view-box">
        <div class="pc-view-box-label">🐾 ข้อมูลการจอง</div>
        <div class="pc-view-row"><span class="pc-view-row-label">สัตว์เลี้ยง</span><span class="pc-view-row-val">${r.pet_emoji} ${r.pet_name}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">ห้อง</span><span class="pc-view-row-val">${r.room}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">Booking</span><span class="pc-view-row-val">${r.booking_id}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">วันที่</span><span class="pc-view-row-val">${formatDate(r.report_date)}</span></div>
      </div>
      <div class="pc-view-box">
        <div class="pc-view-box-label">📊 สรุปวันนี้</div>
        <div class="pc-view-row"><span class="pc-view-row-label">อาหาร</span><span class="pc-view-row-val">${r.food_intake}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">ขับถ่าย</span><span class="pc-view-row-val">${r.bowel_activity}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">อารมณ์</span><span class="pc-view-row-val">${moodLabel(r.mood)}</span></div>
        <div class="pc-view-row"><span class="pc-view-row-label">บันทึกโดย</span><span class="pc-view-row-val">${r.reported_by}</span></div>
      </div>
    </div>

    ${r.behavior_notes ? `
      <div class="pc-view-box" style="margin-bottom:14px">
        <div class="pc-view-box-label">💬 พฤติกรรม</div>
        <p style="font-size:13px;color:var(--pc-text-2);margin-top:4px;line-height:1.6">${r.behavior_notes}</p>
      </div>
    ` : ''}

    ${r.notes ? `
      <div class="pc-view-box" style="margin-bottom:14px;border-color:#FCD34D;background:#FFFBEB">
        <div class="pc-view-box-label" style="color:var(--pc-amber)">📢 หมายเหตุแจ้งเจ้าของ</div>
        <p style="font-size:13px;color:var(--pc-amber);margin-top:4px;line-height:1.6">${r.notes}</p>
      </div>
    ` : ''}
  `;

  openModal('modal-view-report');
}

/* ══════════════════════════════════════════
   PHOTO UPLOAD (client-side preview)
══════════════════════════════════════════ */
function handlePhotoUpload(input) {
  const preview = document.getElementById('photo-preview');
  const files = Array.from(input.files).slice(0, 5);

  preview.innerHTML = '';
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.className = 'pc-photo-thumb';
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function bindModalBackdrops() {
  document.querySelectorAll('.pc-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.pc-modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const existing = document.getElementById('pc-toast');
  if (existing) existing.remove();

  const colors = {
    success: { bg: '#CCFBF1', color: '#0F766E', border: '#5EEAD4' },
    warn:    { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  };
  const c = colors[type] || colors.success;

  const toast = document.createElement('div');
  toast.id = 'pc-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${c.bg}; color:${c.color}; border:1.5px solid ${c.border};
    padding:12px 20px; border-radius:14px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);
    animation:slideUp .3s ease; max-width:400px; line-height:1.4;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function moodEmoji(mood) {
  return { HAPPY: '😄', NEUTRAL: '😐', ANXIOUS: '😰', SICK: '🤒' }[mood] ?? '😐';
}

function moodLabel(mood) {
  return { HAPPY: 'Happy', NEUTRAL: 'Neutral', ANXIOUS: 'Anxious', SICK: 'Sick' }[mood] ?? mood;
}
