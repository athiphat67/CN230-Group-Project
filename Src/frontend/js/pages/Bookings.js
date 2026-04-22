/**
 * Bookings.js — Page logic (เชื่อม API จริง)
 * Purrfect Stay Admin Panel
 *
 * New Booking Flow:
 *   STEP 1 — Customer: ค้นหา (existing) หรือ ลงทะเบียนใหม่ inline
 *   STEP 2 — Pet:      เลือกสัตว์เลี้ยงที่มี หรือ เพิ่มใหม่ inline
 *   STEP 3 — Date + Room availability
 *   STEP 4 — Add-on services (optional)
 */

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let BOOKINGS = [];
let currentFilter = 'all';
let currentSearch = '';
let pendingActionId = null;

// New Booking form state
let nb_customerId   = null;
let nb_petId        = null;
let nb_petSpecies   = '';
let nb_roomId       = null;
let nb_roomRate     = 0;
let _customerSearchTimer = null;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromAPI();
  bindModalBackdrops();
  bindEscapeKey();
});

/* ══════════════════════════════════════════
   LOAD DATA FROM API
══════════════════════════════════════════ */
async function loadFromAPI() {
  try {
    setTableLoading(true);
    const params = {};
    if (currentFilter !== 'all') params.status = currentFilter;

    const res = await window.API.bookings.getAll(params);
    if (res.ok && Array.isArray(res.data.data)) {
      BOOKINGS = res.data.data.map(normalizeBooking);
    } else {
      BOOKINGS = [];
      if (!res.ok) showToast('โหลดข้อมูลการจองไม่สำเร็จ: ' + (res.data?.message || ''), 'warn');
    }
  } catch (e) {
    BOOKINGS = [];
    showToast('ไม่สามารถเชื่อมต่อ Server ได้', 'warn');
  } finally {
    setTableLoading(false);
  }
  renderTable();
  updateCounts();
}

function normalizeBooking(b) {
  const species = (b.pet_species || '').toLowerCase();
  return {
    booking_id:   b.booking_id,
    id:           `BK-${String(b.booking_id).padStart(4, '0')}`,
    pet_id:       b.pet_id,
    pet_name:     b.pet_name || '—',
    pet_emoji:    species === 'cat' ? '🐱' : species === 'dog' ? '🐶' : '🐾',
    breed:        b.breed || '—',
    notes:        b.notes || '',
    owner_id:     b.owner_id,
    owner_name:   b.owner_name || '—',
    owner_phone:  b.owner_phone || '—',
    room_id:      b.room_id,
    room:         b.room_number || '—',
    room_type:    b.room_type || '—',
    checkin:      (b.checkin_date  || '').split(' ')[0],
    checkout:     (b.checkout_date || '').split(' ')[0],
    addons:       Array.isArray(b.addons) ? b.addons.filter(Boolean) : [],
    status:       b.status || 'PENDING',
    price_room:   parseFloat(b.price_room)   || 0,
    price_addons: parseFloat(b.price_addons) || 0,
    booking_detail_id: b.booking_detail_id,
  };
}

function setTableLoading(loading) {
  const tbody = document.getElementById('bookings-tbody');
  if (!tbody) return;
  if (loading) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--bk-text-3)">
      <div style="display:inline-flex;align-items:center;gap:10px">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
          style="animation:spin .8s linear infinite">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        กำลังโหลด...
      </div>
    </td></tr>`;
  }
}

/* ══════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════ */
function renderTable() {
  const tbody     = document.getElementById('bookings-tbody');
  const emptyEl   = document.getElementById('bk-empty');
  const showingEl = document.getElementById('bk-showing');
  if (!tbody) return;

  const filtered = getFiltered();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl)   emptyEl.style.display = 'block';
    if (showingEl) showingEl.textContent = 'ไม่พบรายการ';
    return;
  }

  if (emptyEl)   emptyEl.style.display = 'none';
  if (showingEl) showingEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(b => {
    const nights     = calcNights(b.checkin, b.checkout);
    const addonsHtml = b.addons.length
      ? b.addons.map(a => `<span class="bk-addon-tag">${a}</span>`).join('')
      : `<span class="bk-no-addon">—</span>`;

    return `
      <tr>
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
        <td>
          <span class="bk-status ${b.status}">
            <span class="bk-status-dot"></span>${statusLabel(b.status)}
          </span>
        </td>
        <td>
          <div class="bk-action-btns">
            <button class="bk-btn-view" title="ดูรายละเอียด" onclick="openDetail(${b.booking_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
            ${(b.status === 'CONFIRMED' || b.status === 'PENDING')
              ? `<button class="bk-btn-checkin" onclick="openCheckin(${b.booking_id})">Check-in</button>
                 <button class="bk-btn-cancel"  onclick="cancelBooking(${b.booking_id})">ยกเลิก</button>`
              : ''}
            ${b.status === 'CHECKED_IN'
              ? `<button class="bk-btn-checkout" onclick="openCheckout(${b.booking_id})">Check-out</button>`
              : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ══════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════ */
function getFiltered() {
  return BOOKINGS.filter(b => {
    const matchStatus = currentFilter === 'all' || b.status === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q
      || b.pet_name.toLowerCase().includes(q)
      || b.owner_name.toLowerCase().includes(q)
      || b.room.toLowerCase().includes(q)
      || b.breed.toLowerCase().includes(q)
      || b.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

function filterBookings(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.bk-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  loadFromAPI();
}

function searchBookings(q) {
  currentSearch = q;
  renderTable();
}

function updateCounts() {
  const statusList = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  const countEl = document.getElementById('count-all');
  if (countEl) countEl.textContent = BOOKINGS.length;
  statusList.forEach(s => {
    const el = document.getElementById(`count-${s}`);
    if (el) el.textContent = BOOKINGS.filter(b => b.status === s).length;
  });
}

/* ══════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════ */
function openDetail(bookingId) {
  const b = BOOKINGS.find(x => x.booking_id === bookingId);
  if (!b) return;

  document.getElementById('det-subtitle').textContent = `${b.id} · ${b.pet_name}`;

  const nights = calcNights(b.checkin, b.checkout);
  const total  = b.price_room + b.price_addons;

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
        <div class="bk-detail-item"><span class="bk-detail-item-label">Booking ID</span><span class="bk-detail-item-val">${b.id}</span></div>
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
      <div class="bk-price-row"><span>ค่าห้อง (${nights} คืน)</span><span>฿${b.price_room.toLocaleString()}</span></div>
      <div class="bk-price-row"><span>Add-on Services</span><span>฿${b.price_addons.toLocaleString()}</span></div>
      <div class="bk-price-row total"><span>รวมทั้งหมด</span><span>฿${total.toLocaleString()}</span></div>
    </div>
  `;

  const actionBtn = document.getElementById('det-action-btn');
  if (b.status === 'PENDING' || b.status === 'CONFIRMED') {
    actionBtn.textContent = 'Check-in';
    actionBtn.onclick = () => { closeModal('modal-detail'); openCheckin(bookingId); };
    actionBtn.style.display = '';
  } else if (b.status === 'CHECKED_IN') {
    actionBtn.textContent = 'Check-out';
    actionBtn.onclick = () => { closeModal('modal-detail'); openCheckout(bookingId); };
    actionBtn.style.display = '';
  } else {
    actionBtn.style.display = 'none';
  }

  openModal('modal-detail');
}

/* ══════════════════════════════════════════
   CHECK-IN
══════════════════════════════════════════ */
function openCheckin(bookingId) {
  const b = BOOKINGS.find(x => x.booking_id === bookingId);
  if (!b) return;
  pendingActionId = bookingId;

  document.getElementById('ci-subtitle').textContent = `${b.pet_name} (${b.breed}) — ห้อง ${b.room}`;
  document.getElementById('ci-info').innerHTML = `
    <div class="bk-info-row"><span class="bk-info-label">Booking ID</span><span>${b.id}</span></div>
    <div class="bk-info-row"><span class="bk-info-label">เจ้าของ</span><span>${b.owner_name} · ${b.owner_phone}</span></div>
    <div class="bk-info-row"><span class="bk-info-label">ห้องพัก</span><span>${b.room} (${b.room_type})</span></div>
    <div class="bk-info-row"><span class="bk-info-label">Check-in</span><span>${formatDate(b.checkin)}</span></div>
    <div class="bk-info-row"><span class="bk-info-label">Check-out กำหนด</span><span>${formatDate(b.checkout)}</span></div>
    ${b.notes ? `<div class="bk-info-row"><span class="bk-info-label">หมายเหตุ</span><span style="color:var(--bk-coral)">${b.notes}</span></div>` : ''}
  `;
  openModal('modal-checkin');
}

async function confirmCheckin() {
  const btn = document.getElementById('ci-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลัง Check-in...'; }

  const b = BOOKINGS.find(x => x.booking_id === pendingActionId);
  if (!b) { if (btn) { btn.disabled = false; btn.textContent = 'Check-in ทันที'; } return; }

  const res = await window.API.bookings.checkin(b.booking_id);

  if (res.ok) {
    closeModal('modal-checkin');
    showToast(`✅ Check-in สำเร็จ! ${b.pet_name} เข้าห้อง ${b.room} แล้ว`);
    await loadFromAPI();
  } else {
    showToast('เกิดข้อผิดพลาด: ' + (res.data?.message || 'กรุณาลองใหม่'), 'warn');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg> Check-in ทันที`;
  }
}

/* ══════════════════════════════════════════
   CHECK-OUT
══════════════════════════════════════════ */
function openCheckout(bookingId) {
  const b = BOOKINGS.find(x => x.booking_id === bookingId);
  if (!b) return;
  pendingActionId = bookingId;

  document.getElementById('co-subtitle').textContent = `${b.pet_name} — ห้อง ${b.room}`;

  const nights = calcNights(b.checkin, b.checkout);
  const total  = b.price_room + b.price_addons;

  document.getElementById('co-summary').innerHTML = `
    <div class="bk-price-row"><span>ค่าห้อง (${nights} คืน)</span><span>฿${b.price_room.toLocaleString()}</span></div>
    <div class="bk-price-row"><span>Add-on Services</span><span>฿${b.price_addons.toLocaleString()}</span></div>
    <div class="bk-price-row total"><span>ยอดชำระ</span><span>฿${total.toLocaleString()}</span></div>
  `;
  openModal('modal-checkout');
}

async function confirmCheckout() {
  const btn = document.getElementById('co-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลัง Check-out...'; }

  const b = BOOKINGS.find(x => x.booking_id === pendingActionId);
  if (!b) { if (btn) { btn.disabled = false; btn.textContent = 'Check-out & ออกใบเสร็จ'; } return; }

  const method = document.querySelector('input[name="payment"]:checked')?.value ?? 'cash';
  const res    = await window.API.bookings.checkout(b.booking_id, { payment_method: method });

  if (res.ok) {
    closeModal('modal-checkout');
    const inv = res.data?.invoice_id ? ` · ใบเสร็จ ${res.data.invoice_id}` : '';
    showToast(`🧾 Check-out สำเร็จ!${inv} ชำระด้วย ${paymentLabel(method)}`);
    await loadFromAPI();
  } else {
    showToast('เกิดข้อผิดพลาด: ' + (res.data?.message || 'กรุณาลองใหม่'), 'warn');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg> Check-out & ออกใบเสร็จ`;
  }
}

/* ══════════════════════════════════════════
   CANCEL BOOKING
══════════════════════════════════════════ */
async function cancelBooking(bookingId) {
  const b = BOOKINGS.find(x => x.booking_id === bookingId);
  if (!b || !confirm(`ยืนยันการยกเลิกการจอง ${b.id} ของ ${b.pet_name}?`)) return;

  const res = await window.API.bookings.cancel(b.booking_id);
  if (res.ok) {
    showToast(`❌ ยกเลิกการจอง ${b.id} แล้ว`, 'warn');
    await loadFromAPI();
  } else {
    showToast('ยกเลิกไม่ได้: ' + (res.data?.message || ''), 'warn');
  }
}

/* ══════════════════════════════════════════
   NEW BOOKING MODAL — OPEN / RESET
══════════════════════════════════════════ */
function openBookingModal() {
  // Reset state
  nb_customerId = null;
  nb_petId      = null;
  nb_petSpecies = '';
  nb_roomId     = null;
  nb_roomRate   = 0;

  // Reset STEP 1 — Customer
  el('nb-customer-badge').style.display         = 'none';
  el('nb-customer-input-area').style.display    = '';
  el('nb-customer-search').value                = '';
  el('nb-customer-results').innerHTML           = '';
  el('nb-new-customer-form').style.display      = 'none';
  el('nb-toggle-customer-btn')?.classList.remove('active');
  setVal('nc-firstname', '');
  setVal('nc-lastname', '');
  setVal('nc-phone', '');
  setVal('nc-email', '');
  setVal('nc-address', '');

  // Reset STEP 2 — Pet
  el('nb-pet-step').style.display               = 'none';
  el('nb-pet-badge').style.display              = 'none';
  el('nb-pet-input-area').style.display         = '';
  el('nb-pet-select').innerHTML                 = '<option value="">-- เลือกสัตว์เลี้ยง --</option>';
  el('nb-pet-select-group').style.display       = '';
  el('nb-pet-divider').style.display            = '';
  el('nb-new-pet-form').style.display           = 'none';
  el('nb-toggle-pet-btn')?.classList.remove('active');
  setVal('np-name', '');
  setVal('np-breed', '');
  setVal('np-sex', '');
  setVal('np-dob', '');
  setVal('np-weight', '');
  setVal('np-medical', '');
  setVal('np-allergy', '');
  document.querySelectorAll('input[name="np-species"]').forEach(r => { r.checked = r.value === 'CAT'; });

  // Reset STEP 3 + 4
  el('nb-room-step').style.display              = 'none';
  el('nb-services-step').style.display          = 'none';
  el('nb-price-preview').style.display          = 'none';
  setVal('nb-checkin', '');
  setVal('nb-checkout', '');
  el('nb-room-select').innerHTML                = '<option value="">-- กด "ค้นหาห้องว่าง" ก่อน --</option>';
  document.querySelectorAll('#nb-services-grid input[type="checkbox"]').forEach(cb => { cb.checked = false; });
  setVal('nb-notes', '');

  openModal('modal-new-booking');
  loadServicesGrid();
}

/* ══════════════════════════════════════════
   STEP 1 — CUSTOMER: SEARCH EXISTING
══════════════════════════════════════════ */
function onCustomerSearchInput(q) {
  clearTimeout(_customerSearchTimer);
  el('nb-customer-results').innerHTML = '';
  if (q.length < 2) return;
  _customerSearchTimer = setTimeout(() => searchCustomers(q), 350);
}

async function searchCustomers(q) {
  const resultsDiv = el('nb-customer-results');
  resultsDiv.innerHTML = '<div style="padding:8px 12px;color:var(--bk-text-3);font-size:13px">กำลังค้นหา...</div>';

  const res = await window.API.customers.getAll({ q });

  if (!res.ok || !res.data.data?.length) {
    // No results: show "add new" shortcut
    resultsDiv.innerHTML = `
      <div style="padding:8px 12px;color:var(--bk-text-3);font-size:13px">ไม่พบลูกค้าที่ตรงกัน</div>
      <div class="nb-results-add-new" onclick="jumpToNewCustomerForm()">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
        เพิ่ม "${escHtml(q)}" เป็นลูกค้าใหม่
      </div>`;
    return;
  }

  // Show matching customers + "add new" option at bottom
  resultsDiv.innerHTML =
    res.data.data.slice(0, 8).map(c => `
      <div class="nb-customer-item"
        onclick="selectCustomer(${c.customerid},'${escHtml(c.firstname + ' ' + c.lastname)}','${escHtml(c.phonenumber||'')}')">
        <div class="nb-customer-name">${c.firstname} ${c.lastname}</div>
        <div class="nb-customer-meta">${c.phonenumber || ''} · ${c.customeremail || ''}</div>
      </div>
    `).join('') +
    `<div class="nb-results-add-new" onclick="jumpToNewCustomerForm()">
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
      ไม่ใช่รายการนี้? เพิ่มลูกค้าใหม่
    </div>`;
}

/* Select an existing customer → lock in and move to pet step */
async function selectCustomer(id, name, phone) {
  nb_customerId = id;

  // Show badge, hide search area
  el('nb-customer-badge-text').textContent = `${name} · ${phone}`;
  el('nb-customer-badge').style.display    = 'flex';
  el('nb-customer-input-area').style.display = 'none';

  // Load this customer's pets
  await _loadPetsForCustomer(id);
}

/* Clear customer selection → back to search */
function clearSelectedCustomer() {
  nb_customerId = null;

  el('nb-customer-badge').style.display      = 'none';
  el('nb-customer-input-area').style.display = '';
  setVal('nb-customer-search', '');
  el('nb-customer-results').innerHTML        = '';
  el('nb-new-customer-form').style.display   = 'none';
  el('nb-toggle-customer-btn')?.classList.remove('active');

  // Also reset downstream steps
  _resetPetStep();
  el('nb-pet-step').style.display    = 'none';
  el('nb-room-step').style.display   = 'none';
  el('nb-services-step').style.display = 'none';
  el('nb-price-preview').style.display = 'none';
}

/* ══════════════════════════════════════════
   STEP 1 — CUSTOMER: CREATE NEW
══════════════════════════════════════════ */

/* Toggle inline new-customer form */
function toggleNewCustomerForm() {
  const form = el('nb-new-customer-form');
  const btn  = el('nb-toggle-customer-btn');
  const isOpen = form.style.display !== 'none';

  form.style.display = isOpen ? 'none' : '';
  btn?.classList.toggle('active', !isOpen);

  // If opening: clear search results to avoid confusion
  if (!isOpen) {
    setVal('nb-customer-search', '');
    el('nb-customer-results').innerHTML = '';
  }
}

/* Jump to new-customer form from the results "add new" row */
function jumpToNewCustomerForm() {
  el('nb-customer-results').innerHTML = '';
  if (el('nb-new-customer-form').style.display === 'none') {
    toggleNewCustomerForm();
  }
  // Pre-fill firstname from search text if useful
  const searchVal = el('nb-customer-search')?.value.trim();
  if (searchVal && !el('nc-firstname').value) {
    setVal('nc-firstname', searchVal);
  }
  // Scroll form into view
  el('nb-new-customer-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* Confirm creating a new customer via API */
async function confirmNewCustomer() {
  const firstname = el('nc-firstname')?.value.trim();
  const lastname  = el('nc-lastname')?.value.trim();
  const phone     = el('nc-phone')?.value.trim();

  if (!firstname) { showToast('⚠️ กรุณากรอกชื่อ', 'warn'); return; }
  if (!lastname)  { showToast('⚠️ กรุณากรอกนามสกุล', 'warn'); return; }
  if (!phone)     { showToast('⚠️ กรุณากรอกเบอร์โทรศัพท์', 'warn'); return; }

  const btn = el('nc-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังสร้าง...'; }

  const payload = {
    firstname,
    lastname,
    phonenumber:   phone,
    customeremail: el('nc-email')?.value.trim()   || null,
    address:       el('nc-address')?.value.trim() || null,
  };

  const res = await window.API.customers.create(payload);

  if (btn) { btn.disabled = false; btn.textContent = 'สร้างบัญชีลูกค้า'; }

  if (res.ok) {
    // Backend may return customerid under different keys — handle both
    const customerId = res.data?.customerid ?? res.data?.customer_id ?? res.data?.id;
    const fullName   = `${firstname} ${lastname}`;

    showToast(`✅ สร้างลูกค้าใหม่: ${fullName} เรียบร้อย`);
    await selectCustomer(customerId, fullName, phone);
  } else {
    showToast('สร้างลูกค้าไม่สำเร็จ: ' + (res.data?.message || res.data?.detail || ''), 'warn');
  }
}

/* ══════════════════════════════════════════
   STEP 2 — PET: LOAD + SELECT EXISTING
══════════════════════════════════════════ */
async function _loadPetsForCustomer(customerId) {
  el('nb-pet-step').style.display = '';
  _resetPetStep();

  const petSel = el('nb-pet-select');
  petSel.innerHTML = '<option value="">กำลังโหลดสัตว์เลี้ยง...</option>';

  const res = await window.API.customers.getPets(customerId);
  const pets = res.ok ? (res.data.data || res.data || []) : [];

  if (Array.isArray(pets) && pets.length > 0) {
    petSel.innerHTML = '<option value="">-- เลือกสัตว์เลี้ยง --</option>' +
      pets.map(p =>
        `<option value="${p.petid}" data-species="${(p.species||'').toLowerCase()}">${p.name} (${p.species||'—'}, ${p.breed||'—'})</option>`
      ).join('');
    el('nb-pet-select-group').style.display = '';
    el('nb-pet-divider').style.display      = '';
  } else {
    // No pets: hide dropdown and auto-open new pet form
    el('nb-pet-select-group').style.display = 'none';
    el('nb-pet-divider').style.display      = 'none';
    if (el('nb-new-pet-form').style.display === 'none') {
      toggleNewPetForm();
    }
  }
}

/* User picks an existing pet from the dropdown */
function onPetSelect() {
  const sel = el('nb-pet-select');
  const opt = sel.options[sel.selectedIndex];

  nb_petId      = sel.value ? parseInt(sel.value) : null;
  nb_petSpecies = opt?.dataset?.species || '';

  if (!nb_petId) return;

  // Lock in: show badge, hide input area
  el('nb-pet-badge-text').textContent    = `${opt.text}`;
  el('nb-pet-badge').style.display       = 'flex';
  el('nb-pet-input-area').style.display  = 'none';

  // Proceed to date/room step
  el('nb-room-step').style.display = '';
  updatePricePreview();
}

/* Clear pet selection → back to selection area */
function clearSelectedPet() {
  nb_petId      = null;
  nb_petSpecies = '';

  el('nb-pet-badge').style.display      = 'none';
  el('nb-pet-input-area').style.display = '';
  setVal('nb-pet-select', '');

  // Reset downstream
  el('nb-room-step').style.display    = 'none';
  el('nb-services-step').style.display = 'none';
  el('nb-price-preview').style.display = 'none';
  setVal('nb-checkin', '');
  setVal('nb-checkout', '');
  nb_roomId   = null;
  nb_roomRate = 0;
  el('nb-room-select').innerHTML = '<option value="">-- กด "ค้นหาห้องว่าง" ก่อน --</option>';
}

/* ══════════════════════════════════════════
   STEP 2 — PET: CREATE NEW
══════════════════════════════════════════ */

/* Toggle inline new-pet form */
function toggleNewPetForm() {
  const form = el('nb-new-pet-form');
  const btn  = el('nb-toggle-pet-btn');
  const isOpen = form.style.display !== 'none';

  form.style.display = isOpen ? 'none' : '';
  btn?.classList.toggle('active', !isOpen);

  // If opening: clear dropdown selection
  if (!isOpen) {
    setVal('nb-pet-select', '');
    nb_petId      = null;
    nb_petSpecies = '';
  }
}

/* Confirm creating a new pet via API */
async function confirmNewPet() {
  if (!nb_customerId) {
    showToast('⚠️ กรุณาเลือกลูกค้าก่อน', 'warn');
    return;
  }

  const name    = el('np-name')?.value.trim();
  const species = document.querySelector('input[name="np-species"]:checked')?.value || 'CAT';

  if (!name) { showToast('⚠️ กรุณากรอกชื่อสัตว์เลี้ยง', 'warn'); return; }

  const btn = el('np-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังเพิ่ม...'; }

  const breed   = el('np-breed')?.value.trim() || null;
  const payload = {
    customerid:      nb_customerId,          // matches DB column name
    name,
    species,
    breed,
    sex:              el('np-sex')?.value    || null,
    dob:              el('np-dob')?.value    || null,
    weight:           el('np-weight')?.value ? parseFloat(el('np-weight').value) : null,
    medicalcondition: el('np-medical')?.value.trim() || null,
    allergy:          el('np-allergy')?.value.trim() || null,
    isvaccinated:     false,
  };

  const res = await window.API.pets.create(payload);

  if (btn) { btn.disabled = false; btn.textContent = 'เพิ่มสัตว์เลี้ยงนี้'; }

  if (res.ok) {
    const petId  = res.data?.petid ?? res.data?.pet_id ?? res.data?.id;
    nb_petId      = parseInt(petId);
    nb_petSpecies = species.toLowerCase();

    const emoji       = species === 'CAT' ? '🐱' : species === 'DOG' ? '🐶' : '🐾';
    const displayText = `${emoji} ${name}${breed ? ` (${species}, ${breed})` : ` (${species})`}`;

    // Lock in: badge
    el('nb-pet-badge-text').textContent   = displayText;
    el('nb-pet-badge').style.display      = 'flex';
    el('nb-pet-input-area').style.display = 'none';

    el('nb-room-step').style.display = '';
    showToast(`✅ เพิ่มสัตว์เลี้ยง "${name}" เรียบร้อย`);
    updatePricePreview();
  } else {
    showToast('เพิ่มสัตว์เลี้ยงไม่สำเร็จ: ' + (res.data?.message || res.data?.detail || ''), 'warn');
  }
}

/* Internal: reset pet step UI without hiding the step itself */
function _resetPetStep() {
  nb_petId      = null;
  nb_petSpecies = '';
  el('nb-pet-badge').style.display       = 'none';
  el('nb-pet-input-area').style.display  = '';
  el('nb-new-pet-form').style.display    = 'none';
  el('nb-toggle-pet-btn')?.classList.remove('active');
  setVal('nb-pet-select', '');
  setVal('np-name', '');
  setVal('np-breed', '');
  setVal('np-sex', '');
  setVal('np-dob', '');
  setVal('np-weight', '');
  setVal('np-medical', '');
  setVal('np-allergy', '');
  document.querySelectorAll('input[name="np-species"]').forEach(r => { r.checked = r.value === 'CAT'; });
}

/* ══════════════════════════════════════════
   STEP 3 — ROOM AVAILABILITY
══════════════════════════════════════════ */
async function findAvailableRooms() {
  const checkin  = el('nb-checkin')?.value;
  const checkout = el('nb-checkout')?.value;

  if (!checkin || !checkout) {
    showToast('กรุณาเลือกวันที่ Check-in และ Check-out ก่อน', 'warn'); return;
  }
  if (new Date(checkout) <= new Date(checkin)) {
    showToast('วันที่ Check-out ต้องหลังจาก Check-in', 'warn'); return;
  }

  const petType = nb_petSpecies.toUpperCase() === 'DOG' ? 'DOG' : 'CAT';
  const roomSel = el('nb-room-select');
  roomSel.innerHTML = '<option value="">กำลังค้นหาห้องว่าง...</option>';

  const res = await window.API.rooms.getAvailability({
    checkin_date:  checkin,
    checkout_date: checkout,
    pet_type:      petType,
  });

  if (res.ok && res.data.data?.length) {
    roomSel.innerHTML = '<option value="">-- เลือกห้อง --</option>' +
      res.data.data.map(r =>
        `<option value="${r.room_id}" data-rate="${r.price_per_night}">${r.room_number} · ${r.room_type} · ฿${parseFloat(r.price_per_night).toLocaleString()}/คืน</option>`
      ).join('');
    el('nb-services-step').style.display = '';
    showToast(`✅ พบห้องว่าง ${res.data.data.length} ห้อง`);
  } else {
    roomSel.innerHTML = '<option value="">ไม่มีห้องว่างในช่วงวันที่เลือก</option>';
    showToast('ไม่มีห้องว่างสำหรับสัตว์เลี้ยงประเภทนี้', 'warn');
  }
}

function onRoomSelect() {
  const sel  = el('nb-room-select');
  const opt  = sel.options[sel.selectedIndex];
  nb_roomId   = sel.value ? parseInt(sel.value) : null;
  nb_roomRate = parseFloat(opt?.dataset?.rate || 0);
  updatePricePreview();
}

/* ══════════════════════════════════════════
   STEP 4 — SERVICES GRID
══════════════════════════════════════════ */
async function loadServicesGrid() {
  const grid = el('nb-services-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--bk-text-3);font-size:13px">กำลังโหลด...</div>';

  const res = await window.API.bookings.getServices();
  if (!res.ok || !res.data.data?.length) {
    grid.innerHTML = '<div style="color:var(--bk-text-3);font-size:13px">ไม่มีบริการเสริม</div>';
    return;
  }

  grid.innerHTML = res.data.data.map(s => `
    <label class="bk-addon-item">
      <input type="checkbox" value="${s.item_id}" data-price="${s.unit_price}" onchange="updatePricePreview()">
      <span class="bk-addon-icon">${serviceIcon(s.name)}</span>
      ${s.name} (฿${parseFloat(s.unit_price).toLocaleString()})
    </label>
  `).join('');
}

function serviceIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('อาบ'))                       return '🛁';
  if (n.includes('ตัด') || n.includes('ขน'))   return '✂️';
  if (n.includes('นวด') || n.includes('spa'))  return '💆';
  if (n.includes('ตรวจ') || n.includes('หมอ')) return '🩺';
  if (n.includes('ถ่าย') || n.includes('รูป')) return '📸';
  if (n.includes('ฝึก'))                       return '🎓';
  return '⭐';
}

/* ══════════════════════════════════════════
   PRICE PREVIEW
══════════════════════════════════════════ */
function updatePricePreview() {
  const checkin  = el('nb-checkin')?.value;
  const checkout = el('nb-checkout')?.value;
  if (!checkin || !checkout || !nb_roomId) {
    el('nb-price-preview').style.display = 'none'; return;
  }

  const nights   = calcNights(checkin, checkout);
  const roomCost = nb_roomRate * nights;

  let addonsCost = 0;
  document.querySelectorAll('#nb-services-grid input[type="checkbox"]:checked').forEach(cb => {
    addonsCost += parseFloat(cb.dataset.price || 0);
  });

  el('nb-price-preview').style.display = '';
  el('pp-room').textContent   = `฿${roomCost.toLocaleString()}`;
  el('pp-addons').textContent = `฿${addonsCost.toLocaleString()}`;
  el('pp-total').textContent  = `฿${(roomCost + addonsCost).toLocaleString()}`;
  el('pp-nights').textContent = `(${nights} คืน × ฿${nb_roomRate.toLocaleString()})`;
}

/* ══════════════════════════════════════════
   SAVE NEW BOOKING
══════════════════════════════════════════ */
async function saveNewBooking() {
  const checkin  = el('nb-checkin')?.value;
  const checkout = el('nb-checkout')?.value;
  const notes    = el('nb-notes')?.value || '';

  if (!nb_customerId) { showToast('⚠️ กรุณาเลือกหรือสร้างลูกค้าก่อน', 'warn'); return; }
  if (!nb_petId)       { showToast('⚠️ กรุณาเลือกหรือเพิ่มสัตว์เลี้ยงก่อน', 'warn'); return; }
  if (!checkin || !checkout) { showToast('⚠️ กรุณาเลือกวันที่ Check-in / Check-out', 'warn'); return; }
  if (!nb_roomId)      { showToast('⚠️ กรุณาเลือกห้องพัก', 'warn'); return; }

  const nights    = calcNights(checkin, checkout);
  const totalRate = nb_roomRate * nights;

  const services = [];
  document.querySelectorAll('#nb-services-grid input[type="checkbox"]:checked').forEach(cb => {
    services.push({ item_id: parseInt(cb.value), quantity: 1, unit_price: parseFloat(cb.dataset.price || 0) });
  });

  const payload = {
    customer_id:   nb_customerId,
    checkin_date:  checkin,
    checkout_date: checkout,
    total_rate:    totalRate,
    pets:          [{ pet_id: nb_petId, room_id: nb_roomId }],
    services,
    notes,
  };

  const saveBtn = document.querySelector('#modal-new-booking .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ กำลังสร้าง...'; }

  const res = await window.API.bookings.create(payload);

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg> ยืนยันการจอง`;
  }

  if (res.ok) {
    closeModal('modal-new-booking');
    showToast(`✅ สร้างการจอง BK-${String(res.data.booking_id).padStart(4,'0')} สำเร็จ!`);
    await loadFromAPI();
  } else {
    showToast('สร้างการจองไม่สำเร็จ: ' + (res.data?.detail || res.data?.message || ''), 'warn');
  }
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function bindModalBackdrops() {
  document.querySelectorAll('.bk-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.bk-modal-overlay.open').forEach(m => m.classList.remove('open'));
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const existing = document.getElementById('bk-toast');
  if (existing) existing.remove();

  const c = type === 'warn'
    ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
    : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };

  const t = document.createElement('div');
  t.id = 'bk-toast';
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${c.bg}; color:${c.color}; border:1.5px solid ${c.border};
    padding:12px 20px; border-radius:14px;
    font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);
    animation:slideUp .3s ease; max-width:400px; line-height:1.4;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function el(id)       { return document.getElementById(id); }
function setVal(id, v) { const e = document.getElementById(id); if (e) e.value = v; }

function calcNights(checkin, checkout) {
  const a = new Date(checkin), b = new Date(checkout);
  return Math.max(1, Math.round((b - a) / 86400000));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(s) {
  return {
    PENDING:     'รอยืนยัน',
    CONFIRMED:   'Confirmed',
    CHECKED_IN:  'กำลังเข้าพัก',
    CHECKED_OUT: 'เช็กเอาต์แล้ว',
    CANCELLED:   'ยกเลิก',
  }[s] ?? s;
}

function paymentLabel(s) {
  return {
    cash:         'เงินสด',
    qr:           'QR PromptPay',
    card:         'บัตรเครดิต',
    qr_promptpay: 'QR PromptPay',
    credit_card:  'บัตรเครดิต',
  }[s] ?? s;
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}