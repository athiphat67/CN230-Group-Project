/**
 * Bookings.js — Page logic for Booking & Front Desk Management
 * Purrfect Stay Admin Panel
 *
 * Handles: table render · filter tabs · search · modals ·
 *          check-in / check-out · cancel · new booking form
 */

/* ── MOCK DATA (replace with API calls from api.js) ── */
const BOOKINGS = [
  {
    id: 'BK-0001',
    pet_name: 'มะม่วง',
    pet_emoji: '🐱',
    breed: 'Scottish Fold',
    owner_name: 'อาพิญา ศ.',
    owner_phone: '081-234-5678',
    room: 'A01',
    room_type: 'Standard (AC)',
    checkin: '2025-04-02',
    checkout: '2025-04-06',
    addons: ['อาบน้ำ', 'ถ่ายรูป'],
    status: 'CHECKED_IN',
    notes: 'แพ้ไก่ ห้ามให้อาหารที่มีส่วนผสมของไก่',
    price_room: 2000,
    price_addons: 350,
  },
  {
    id: 'BK-0002',
    pet_name: 'โดนัท',
    pet_emoji: '🐶',
    breed: 'Labrador Retriever',
    owner_name: 'ชัญญา ด.',
    owner_phone: '082-345-6789',
    room: 'A03',
    room_type: 'Standard (AC)',
    checkin: '2025-04-03',
    checkout: '2025-04-06',
    addons: ['ตัดขน'],
    status: 'CHECKED_IN',
    notes: '',
    price_room: 1500,
    price_addons: 350,
  },
  {
    id: 'BK-0003',
    pet_name: 'บิ๊กบอย',
    pet_emoji: '🐕',
    breed: 'Golden Retriever',
    owner_name: 'สมศักดิ์ ท.',
    owner_phone: '089-456-7890',
    room: 'V-02',
    room_type: 'VIP Penthouse',
    checkin: '2025-04-05',
    checkout: '2025-04-10',
    addons: ['นวด', 'ตรวจสุขภาพ'],
    status: 'CONFIRMED',
    notes: 'กำลังจะมาถึงใน 15 นาที — ห้อง VIP C02',
    price_room: 6000,
    price_addons: 650,
  },
  {
    id: 'BK-0004',
    pet_name: 'ซาชิ',
    pet_emoji: '🐕',
    breed: 'Shiba Inu',
    owner_name: 'ปณิตา ก.',
    owner_phone: '083-567-8901',
    room: 'B02',
    room_type: 'Standard (Fan)',
    checkin: '2025-04-01',
    checkout: '2025-04-04',
    addons: [],
    status: 'CHECKED_OUT',
    notes: '',
    price_room: 1050,
    price_addons: 0,
  },
  {
    id: 'BK-0005',
    pet_name: 'มูมู่',
    pet_emoji: '🐱',
    breed: 'Persian',
    owner_name: 'วิภาวี ส.',
    owner_phone: '084-678-9012',
    room: 'C01',
    room_type: 'Deluxe Suite',
    checkin: '2025-04-06',
    checkout: '2025-04-09',
    addons: ['อาบน้ำ', 'นวด'],
    status: 'PENDING',
    notes: 'ต้องการห้องที่เงียบสงบ กลัวเสียงดัง',
    price_room: 2400,
    price_addons: 450,
  },
  {
    id: 'BK-0006',
    pet_name: 'ทาโร่',
    pet_emoji: '🐶',
    breed: 'Pomeranian',
    owner_name: 'ณิชา ร.',
    owner_phone: '085-789-0123',
    room: 'B04',
    room_type: 'Standard (AC)',
    checkin: '2025-04-04',
    checkout: '2025-04-08',
    addons: ['ตัดขน', 'อาบน้ำ'],
    status: 'CHECKED_IN',
    notes: '',
    price_room: 2000,
    price_addons: 550,
  },
  {
    id: 'BK-0007',
    pet_name: 'ลูน่า',
    pet_emoji: '🐱',
    breed: 'British Shorthair',
    owner_name: 'กัลยา ม.',
    owner_phone: '086-890-1234',
    room: 'A05',
    room_type: 'Standard (Fan)',
    checkin: '2025-04-07',
    checkout: '2025-04-12',
    addons: [],
    status: 'PENDING',
    notes: '',
    price_room: 1750,
    price_addons: 0,
  },
  {
    id: 'BK-0008',
    pet_name: 'โคโค่',
    pet_emoji: '🐶',
    breed: 'Beagle',
    owner_name: 'ธนพล ย.',
    owner_phone: '087-901-2345',
    room: 'B01',
    room_type: 'Standard (Fan)',
    checkin: '2025-04-03',
    checkout: '2025-04-05',
    addons: [],
    status: 'CANCELLED',
    notes: 'ยกเลิกเนื่องจากเจ้าของป่วย',
    price_room: 700,
    price_addons: 0,
  },
];

/* ── STATE ── */
let currentFilter = 'all';
let currentSearch = '';
let pendingActionId = null;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  updateCounts();
  bindModalBackdrops();
  bindEscapeKey();
});

/* ══════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════ */
function renderTable() {
  const tbody = document.getElementById('bookings-tbody');
  const emptyEl = document.getElementById('bk-empty');
  const showingEl = document.getElementById('bk-showing');

  const filtered = getFiltered();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showingEl.textContent = 'ไม่พบรายการ';
    return;
  }

  emptyEl.style.display = 'none';
  showingEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(b => {
    const nights = calcNights(b.checkin, b.checkout);
    const addonsHtml = b.addons.length
      ? b.addons.map(a => `<span class="bk-addon-tag">${a}</span>`).join('')
      : `<span class="bk-no-addon">—</span>`;

    const actionsHtml = buildActions(b);

    return `
      <tr data-id="${b.id}">
        <td>
          <div class="bk-pet-cell">
            <div class="bk-pet-emoji">${b.pet_emoji}</div>
            <div>
              <div class="bk-pet-name">${b.pet_name}</div>
              <div class="bk-pet-owner">${b.breed} · ${b.owner_name}</div>
            </div>
          </div>
        </td>
        <td><span class="bk-room-badge">${b.room}</span></td>
        <td>
          <div class="bk-date-cell">${formatDate(b.checkin)}</div>
        </td>
        <td>
          <div class="bk-date-cell">${formatDate(b.checkout)}</div>
          <div class="bk-date-nights">${nights} คืน</div>
        </td>
        <td><div class="bk-addon-tags">${addonsHtml}</div></td>
        <td><span class="bk-status ${b.status}"><span class="bk-status-dot"></span>${statusLabel(b.status)}</span></td>
        <td><div class="bk-action-btns">${actionsHtml}</div></td>
      </tr>
    `;
  }).join('');
}

function buildActions(b) {
  let html = `
    <button class="bk-btn-view" title="ดูรายละเอียด" onclick="openDetail('${b.id}')">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    </button>
  `;

  if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
    html += `<button class="bk-btn-checkin" onclick="openCheckin('${b.id}')">Check-in</button>`;
    html += `<button class="bk-btn-cancel" onclick="cancelBooking('${b.id}')">ยกเลิก</button>`;
  }
  if (b.status === 'CHECKED_IN') {
    html += `<button class="bk-btn-checkout" onclick="openCheckout('${b.id}')">Check-out</button>`;
  }

  return html;
}

/* ══════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════ */
function getFiltered() {
  return BOOKINGS.filter(b => {
    const matchStatus = currentFilter === 'all' || b.status === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q ||
      b.pet_name.toLowerCase().includes(q) ||
      b.owner_name.toLowerCase().includes(q) ||
      b.room.toLowerCase().includes(q) ||
      b.breed.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

function filterBookings(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.bk-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchBookings(q) {
  currentSearch = q;
  renderTable();
}

function updateCounts() {
  const statuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  document.getElementById('count-all').textContent = BOOKINGS.length;
  statuses.forEach(s => {
    const el = document.getElementById(`count-${s}`);
    if (el) el.textContent = BOOKINGS.filter(b => b.status === s).length;
  });
}

/* ══════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════ */
function openDetail(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;

  document.getElementById('det-subtitle').textContent = `${b.id} · ${b.pet_name}`;

  const nights = calcNights(b.checkin, b.checkout);
  const total = b.price_room + b.price_addons;

  document.getElementById('det-body').innerHTML = `
    <div class="bk-detail-grid">
      <div class="bk-detail-box">
        <div class="bk-detail-box-label">🐾 ข้อมูลสัตว์เลี้ยง</div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">ชื่อ</span><span class="bk-detail-item-val">${b.pet_emoji} ${b.pet_name}</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">สายพันธุ์</span><span class="bk-detail-item-val">${b.breed}</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">เจ้าของ</span><span class="bk-detail-item-val">${b.owner_name}</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">เบอร์โทร</span><span class="bk-detail-item-val">${b.owner_phone}</span></div>
      </div>
      <div class="bk-detail-box">
        <div class="bk-detail-box-label">🏠 ข้อมูลการจอง</div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">ห้อง</span><span class="bk-detail-item-val">${b.room} (${b.room_type})</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">Check-in</span><span class="bk-detail-item-val">${formatDate(b.checkin)}</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">Check-out</span><span class="bk-detail-item-val">${formatDate(b.checkout)}</span></div>
        <div class="bk-detail-item"><span class="bk-detail-item-label">จำนวนคืน</span><span class="bk-detail-item-val">${nights} คืน</span></div>
      </div>
    </div>

    ${b.addons.length ? `
    <div class="bk-detail-box" style="margin-bottom:16px">
      <div class="bk-detail-box-label">✨ Add-on Services</div>
      <div class="bk-addon-tags" style="padding-top:4px">${b.addons.map(a => `<span class="bk-addon-tag">${a}</span>`).join('')}</div>
    </div>` : ''}

    ${b.notes ? `
    <div class="bk-detail-box" style="margin-bottom:16px">
      <div class="bk-detail-box-label">📝 หมายเหตุ</div>
      <p style="font-size:13px;color:var(--bk-text-2);margin-top:4px;line-height:1.6">${b.notes}</p>
    </div>` : ''}

    <div class="bk-price-preview visible">
      <div class="bk-price-row"><span>ค่าห้อง (${nights} คืน × ${b.room_type})</span><span>฿${b.price_room.toLocaleString()}</span></div>
      <div class="bk-price-row"><span>Add-on Services</span><span>฿${b.price_addons.toLocaleString()}</span></div>
      <div class="bk-price-row total"><span>รวมทั้งหมด</span><span>฿${total.toLocaleString()}</span></div>
    </div>
  `;

  // Update action button
  const actionBtn = document.getElementById('det-action-btn');
  if (b.status === 'CONFIRMED' || b.status === 'PENDING') {
    actionBtn.textContent = 'Check-in';
    actionBtn.onclick = () => { closeModal('modal-detail'); openCheckin(id); };
    actionBtn.style.display = '';
  } else if (b.status === 'CHECKED_IN') {
    actionBtn.textContent = 'Check-out';
    actionBtn.onclick = () => { closeModal('modal-detail'); openCheckout(id); };
    actionBtn.style.display = '';
  } else {
    actionBtn.style.display = 'none';
  }

  openModal('modal-detail');
}

/* ══════════════════════════════════════════
   CHECK-IN MODAL
══════════════════════════════════════════ */
function openCheckin(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  pendingActionId = id;

  document.getElementById('ci-subtitle').textContent = `${b.pet_name} (${b.breed}) — ห้อง ${b.room}`;

  document.getElementById('ci-info').innerHTML = `
    <div class="bk-info-row"><span class="bk-info-label">Booking ID</span><span>${b.id}</span></div>
    <div class="bk-info-row"><span class="bk-info-label">เจ้าของ</span><span>${b.owner_name} · ${b.owner_phone}</span></div>
    <div class="bk-info-row"><span class="bk-info-label">ห้องพัก</span><span>${b.room} (${b.room_type})</span></div>
    <div class="bk-info-row"><span class="bk-info-label">Check-out กำหนด</span><span>${formatDate(b.checkout)}</span></div>
    ${b.notes ? `<div class="bk-info-row"><span class="bk-info-label">หมายเหตุ</span><span style="color:var(--bk-coral)">${b.notes}</span></div>` : ''}
  `;

  openModal('modal-checkin');
}

function confirmCheckin() {
  const b = BOOKINGS.find(x => x.id === pendingActionId);
  if (!b) return;

  // TODO: PATCH /api/bookings/{booking_id}/checkin
  b.status = 'CHECKED_IN';
  updateCounts();
  renderTable();
  closeModal('modal-checkin');
  showToast(`✅ Check-in สำเร็จ! ${b.pet_name} เข้าห้อง ${b.room} แล้ว`);
}

/* ══════════════════════════════════════════
   CHECK-OUT MODAL
══════════════════════════════════════════ */
function openCheckout(id) {
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;
  pendingActionId = id;

  document.getElementById('co-subtitle').textContent = `${b.pet_name} — ห้อง ${b.room}`;

  const nights = calcNights(b.checkin, b.checkout);
  const total = b.price_room + b.price_addons;

  document.getElementById('co-summary').innerHTML = `
    <div class="bk-price-row"><span>ค่าห้อง (${nights} คืน)</span><span>฿${b.price_room.toLocaleString()}</span></div>
    <div class="bk-price-row"><span>Add-on Services</span><span>฿${b.price_addons.toLocaleString()}</span></div>
    <div class="bk-price-row total"><span>ยอดชำระ</span><span>฿${total.toLocaleString()}</span></div>
  `;

  openModal('modal-checkout');
}

function confirmCheckout() {
  const b = BOOKINGS.find(x => x.id === pendingActionId);
  if (!b) return;
  const method = document.querySelector('input[name="payment"]:checked')?.value ?? 'cash';

  // TODO: POST /api/billing — create invoice
  // TODO: PATCH /api/bookings/{booking_id}/checkout
  b.status = 'CHECKED_OUT';
  updateCounts();
  renderTable();
  closeModal('modal-checkout');
  showToast(`🧾 Check-out สำเร็จ! ออกใบเสร็จให้ ${b.owner_name} แล้ว (ชำระด้วย ${paymentLabel(method)})`);
}

/* ══════════════════════════════════════════
   NEW BOOKING
══════════════════════════════════════════ */
function openBookingModal() {
  // Reset form
  document.querySelectorAll('#modal-new-booking input, #modal-new-booking select, #modal-new-booking textarea')
    .forEach(el => { el.value = ''; if (el.type === 'checkbox') el.checked = false; });
  document.getElementById('price-preview').style.display = 'none';
  openModal('modal-new-booking');
}

function saveNewBooking() {
  const petName = document.getElementById('nb-pet-name').value.trim();
  const owner   = document.getElementById('nb-owner').value.trim();
  const room    = document.getElementById('nb-room-no').value;
  const checkin = document.getElementById('nb-checkin').value;
  const checkout = document.getElementById('nb-checkout').value;

  if (!petName || !owner || !room || !checkin || !checkout) {
    showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'warn');
    return;
  }

  const addons = Array.from(document.querySelectorAll('#modal-new-booking input[type="checkbox"]:checked'))
    .map(el => el.value);

  const newId = `BK-${String(BOOKINGS.length + 1).padStart(4, '0')}`;
  const petType = document.getElementById('nb-pet-type').value;

  BOOKINGS.unshift({
    id: newId,
    pet_name: petName,
    pet_emoji: petType === 'cat' ? '🐱' : petType === 'dog' ? '🐶' : '🐾',
    breed: document.getElementById('nb-breed').value || 'ไม่ระบุ',
    owner_name: owner,
    owner_phone: document.getElementById('nb-phone').value,
    room,
    room_type: document.getElementById('nb-room-type').options[document.getElementById('nb-room-type').selectedIndex]?.text || '',
    checkin,
    checkout,
    addons,
    status: 'PENDING',
    notes: document.getElementById('nb-notes').value,
    price_room: 0,
    price_addons: 0,
  });

  updateCounts();
  renderTable();
  closeModal('modal-new-booking');
  // TODO: POST /api/bookings
  showToast(`✅ สร้างการจอง ${newId} สำเร็จ! ${petName} จองห้อง ${room}`);
}

/* ══════════════════════════════════════════
   CANCEL
══════════════════════════════════════════ */
function cancelBooking(id) {
  if (!confirm('ยืนยันการยกเลิกการจองนี้?')) return;
  const b = BOOKINGS.find(x => x.id === id);
  if (!b) return;

  // TODO: PATCH /api/bookings/{booking_id}/cancel
  b.status = 'CANCELLED';
  updateCounts();
  renderTable();
  showToast(`❌ ยกเลิกการจอง ${id} แล้ว`, 'warn');
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function bindModalBackdrops() {
  document.querySelectorAll('.bk-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}
function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.bk-modal-overlay.open')
        .forEach(m => m.classList.remove('open'));
    }
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const existing = document.getElementById('bk-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'bk-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${type === 'warn' ? '#FEF3C7' : '#D1FAE5'};
    color:${type === 'warn' ? '#92400E' : '#065F46'};
    border:1.5px solid ${type === 'warn' ? '#FCD34D' : '#6EE7B7'};
    padding:12px 20px; border-radius:14px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);
    animation:slideUp .3s ease; max-width:380px; line-height:1.4;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function calcNights(checkin, checkout) {
  const a = new Date(checkin), b = new Date(checkout);
  return Math.max(1, Math.round((b - a) / 86400000));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(s) {
  return { PENDING: 'รอยืนยัน', CONFIRMED: 'Confirmed', CHECKED_IN: 'กำลังเข้าพัก', CHECKED_OUT: 'เช็กเอาต์แล้ว', CANCELLED: 'ยกเลิก' }[s] ?? s;
}

function paymentLabel(s) {
  return { cash: 'เงินสด', qr: 'QR PromptPay', card: 'บัตรเครดิต' }[s] ?? s;
}
