/**
 * PetCare.js — Page logic for Pet Care & Daily Monitoring
 * Purrfect Stay Admin Panel
 *
 * Handles: active stays list · care report cards ·
 *          create report modal · view report modal · mood filter
 */

let CARE_REPORTS = []; // เปลี่ยนเป็น let และเริ่มด้วย Array ว่าง

async function loadReports() {
  const res = await window.API.care.getAll();
  if (res.ok) {
    CARE_REPORTS = res.data.data.map(r => ({
      ...r,
      // เพิ่ม Fallback ให้ mood เป็น NEUTRAL ถ้าหาก API ส่งค่า null มา
      mood: r.mood || 'NEUTRAL', 
      pet_emoji: r.species?.toLowerCase() === 'cat' ? '🐱' :
                 r.species?.toLowerCase() === 'dog' ? '🐶' : '🐾'
    }));
    renderReports();
  } else {
    showToast('ไม่สามารถดึงข้อมูลรายงานการดูแลได้', 'warn');
  }
}

/* ── STATE ── */
let currentMoodFilter = 'all';
let currentStaySearch = '';
let pendingBookingId = null;
let editingReportId = null;

/* ══════════════════════════════════════════
   ACTIVE STAYS
══════════════════════════════════════════ */

// 1. เปลี่ยนตัวแปรเป็น Array ว่าง
let ACTIVE_STAYS = [];

// 2. สร้างฟังก์ชันโหลดข้อมูลจริง
async function loadActiveStays() {
  const res = await window.API.care.getActiveStays();
  if (res.ok) {
    // นำข้อมูลมาเติม Emoji ตามประเภทสัตว์เลี้ยง
    ACTIVE_STAYS = res.data.data.map(s => ({
      ...s,
      pet_emoji: s.species?.toLowerCase() === 'cat' ? '🐱' : '🐶'
    }));

    renderActiveStays(); // สั่งให้วาด UI ฝั่งซ้ายใหม่

    // อัปเดตตัวเลขสถิติบนการ์ดใบแรก (กำลังพักอยู่)
    const statActive = document.querySelector('.pc-stat.teal .pc-stat-value');
    if (statActive) statActive.textContent = ACTIVE_STAYS.length;
  } else {
    showToast('ไม่สามารถดึงข้อมูลสัตว์เลี้ยงที่กำลังพักอยู่ได้', 'warn');
  }
}

/* ══════════════════════════════════════════
   INIT (รวบรวมไว้ที่เดียว)
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadActiveStays(); // ดึงข้อมูลฝั่งซ้าย (จาก DB)
  loadReports();     // ดึงข้อมูลฝั่งขวา (จาก DB)
  bindModalBackdrops();
  bindEscapeKey();

  // Set today's date as default for report
  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('report-date');
  if (dateInput) dateInput.value = today;
});

function renderActiveStays() {
  const list = document.getElementById('stays-list');
  const q = currentStaySearch.toLowerCase();

  const filtered = ACTIVE_STAYS.filter(s =>
    !q || 
    s.pet_name.toLowerCase().includes(q) || 
    s.room?.toLowerCase().includes(q) || 
    s.breed?.toLowerCase().includes(q)
  );
  const page = window.Pagination
    ? Pagination.paginate(filtered, { key: 'petcare-stays', pageSize: 5 })
    : { pageItems: filtered, total: filtered.length, start: 0, end: filtered.length, totalPages: 1 };

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--pc-text-3);font-size:13px">ไม่พบรายการ</div>`;
    window.Pagination?.render(page, { key: 'petcare-stays', containerEl: ensurePagerAfter(list, 'pc-stays-pager'), label: 'รายการ', onChange: renderActiveStays });
    return;
  }

  window.Pagination?.render(page, { key: 'petcare-stays', containerEl: ensurePagerAfter(list, 'pc-stays-pager'), label: 'รายการ', onChange: renderActiveStays });

  list.innerHTML = page.pageItems.map((s, i) => {
    const daysLeft = calcDaysLeft(s.checkout);
    const todayReport = findTodayReportForStay(s.booking_id, s.pet_id);
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
        ? `<button class="pc-btn-report done" onclick="openReportModal(${s.booking_id}, ${todayReport?.report_id || 'null'})">✎ แก้ไขวันนี้</button>
               <div class="pc-report-badge">วันนี้</div>`
        : `<button class="pc-btn-report" onclick="openReportModal(${s.booking_id})">+ บันทึก</button>`
      }
        </div>
      </div>
    `;
  }).join('');
}

function filterActiveStays(q) {
  currentStaySearch = q;
  window.Pagination?.reset('petcare-stays');
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
  const page = window.Pagination
    ? Pagination.paginate(filtered, { key: 'petcare-reports', pageSize: 6 })
    : { pageItems: filtered, total: filtered.length, start: 0, end: filtered.length, totalPages: 1 };

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="pc-empty-reports">
        <div class="pc-empty-reports-icon">📋</div>
        <p>ไม่พบรายงานสำหรับตัวกรองนี้</p>
      </div>
    `;
    window.Pagination?.render(page, { key: 'petcare-reports', containerEl: ensurePagerAfter(list, 'pc-reports-pager'), label: 'รายการ', onChange: renderReports });
    return;
  }

  window.Pagination?.render(page, { key: 'petcare-reports', containerEl: ensurePagerAfter(list, 'pc-reports-pager'), label: 'รายการ', onChange: renderReports });

  list.innerHTML = page.pageItems.map((r, i) => `
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
          <div class="pc-report-stat-val">${formatFoodStatus(r.food_intake)}</div>
        </div>
        <div class="pc-report-stat">
          <div class="pc-report-stat-label">ขับถ่าย</div>
          <div class="pc-report-stat-val">${formatPottyStatus(r.bowel_activity)}</div>
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
  window.Pagination?.reset('petcare-reports');
  document.querySelectorAll('.pc-mood-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReports();
}

function ensurePagerAfter(anchor, id) {
  let pager = document.getElementById(id);
  if (!pager) {
    pager = document.createElement('div');
    pager.id = id;
    pager.className = 'pg-pagination';
    pager.style.marginTop = '12px';
    anchor.insertAdjacentElement('afterend', pager);
  }
  return pager;
}

/* ══════════════════════════════════════════
   CREATE REPORT MODAL
══════════════════════════════════════════ */
function openReportModal(bookingId, reportId = null) {
  const bid = Number(bookingId);
  const stay = ACTIVE_STAYS.find(s => Number(s.booking_id) === bid);
  if (!stay) return;
  pendingBookingId = bid;
  editingReportId = reportId ? Number(reportId) : null;

  document.getElementById('report-booking-id').value = bid;
  document.getElementById('report-subtitle').textContent = `${stay.pet_name} (${stay.breed}) — ห้อง ${stay.room}`;

  // Reset form fields
  document.getElementById('report-behavior').value = '';
  document.getElementById('report-food-detail').value = '';
  document.getElementById('report-notes').value = '';
  document.getElementById('report-food-intake').value = 'ALL';
  document.getElementById('report-bowel').value = 'NORMAL';
  document.querySelector('input[name="mood"][value="NEUTRAL"]').checked = true;
  document.getElementById('photo-preview').innerHTML = '';

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('report-date').value = today;
  const submitBtn = document.getElementById('report-submit-btn');

  if (editingReportId) {
    const existing = CARE_REPORTS.find(r => Number(r.report_id) === editingReportId);
    if (existing) {
      document.getElementById('report-food-intake').value = existing.food_intake || 'ALL';
      document.getElementById('report-bowel').value = existing.bowel_activity || 'NORMAL';
      const moodRadio = document.querySelector(`input[name="mood"][value="${existing.mood || 'NEUTRAL'}"]`);
      if (moodRadio) moodRadio.checked = true;
      document.getElementById('report-behavior').value = existing.behavior_notes || '';
      document.getElementById('report-notes').value = existing.notes || '';
      if (existing.report_date) {
        document.getElementById('report-date').value = new Date(existing.report_date).toISOString().split('T')[0];
      }
    }
    if (submitBtn) submitBtn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> อัปเดตรายงาน`;
  } else {
    if (submitBtn) submitBtn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> บันทึกรายงาน`;
  }

  openModal('modal-report');
}

async function submitReport() {
  const selectedStay = ACTIVE_STAYS.find(s => Number(s.booking_id) === Number(pendingBookingId));
  if (!selectedStay) {
    showToast('ไม่พบข้อมูลสัตว์เลี้ยงที่กำลังเข้าพัก', 'warn');
    return;
  }

  const payload = {
    booking_id: selectedStay.booking_id,
    pet_id: selectedStay.pet_id, // ส่ง pet_id ไปด้วยเพื่อให้ Backend resolve ID ได้
    food_status: document.getElementById('report-food-intake').value,
    potty_status: document.getElementById('report-bowel').value,
    mood: document.querySelector('input[name="mood"]:checked')?.value || 'NEUTRAL',
    behavior_notes: document.getElementById('report-behavior').value.trim(),
    staff_note: document.getElementById('report-notes').value.trim()
  };

  try {
    const res = editingReportId
      ? await window.API.care.update(editingReportId, payload)
      : await window.API.care.create(payload);
    if (res.ok) {
      showToast(editingReportId ? '✅ อัปเดตรายงานการดูแลสำเร็จ!' : '✅ บันทึกรายงานการดูแลสำเร็จ!');
      closeModal('modal-report');
      await Promise.all([loadReports(), loadActiveStays()]);
      editingReportId = null;
    } else {
      showToast('เกิดข้อผิดพลาด: ' + res.data.message, 'warn');
    }
  } catch (error) {
    showToast('ไม่สามารถเชื่อมต่อกับ Server ได้', 'warn');
  }
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
    <div style="display:flex;justify-content:flex-end;margin-top:10px">
      <button class="pc-btn-report" onclick="openReportModal(${r.booking_id}, ${r.report_id}); closeModal('modal-view-report');">✎ แก้ไขรายงานนี้</button>
    </div>
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
    warn: { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
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

function formatFoodStatus(val) {
  if (val === 'ALL') return 'กินหมด';
  if (val === 'LITTLE') return 'กินน้อย';
  if (val === 'NONE') return 'ไม่กิน';
  return val || '—';
}

function formatPottyStatus(val) {
  if (val === 'NORMAL') return 'ปกติ';
  if (val === 'ABNORMAL') return 'ผิดปกติ';
  return val || '—';
}

function findTodayReportForStay(bookingId, petId) {
  const today = new Date().toISOString().slice(0, 10);
  return CARE_REPORTS.find(r =>
    Number(r.booking_id) === Number(bookingId) &&
    Number(r.pet_id) === Number(petId) &&
    String(r.report_date || '').slice(0, 10) === today
  ) || null;
}
