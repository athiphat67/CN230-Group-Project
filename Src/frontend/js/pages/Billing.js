/**
 * Billing.js — Page logic for Billing & Payment Management
 * Purrfect Stay Admin Panel
 *
 * Handles: table render · filter tabs · search · modals ·
 *          invoice detail · record payment · print · export CSV
 */

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let invoicesCache  = [];          // mapped invoices from API
let detailCache    = {};          // { id_raw: detailObject } — avoid re-fetching
let currentFilter  = 'all';
let currentSearch  = '';
let selectedInv    = null;        // currently selected invoice object
const BILLING_PAGE_KEY = 'admin-billing';
const BILLING_PAGE_SIZE = 10;
const BILLING_STATUS_OPTIONS = ['PENDING_PAYMENT', 'PARTIAL', 'PAID', 'CANCELLED'];
const BILLING_METHOD_OPTIONS = ['cash', 'qr_promptpay', 'credit_card', 'bank_transfer'];

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadInvoices();
  bindModalBackdrops();
  bindEscapeKey();
});

/* ══════════════════════════════════════════
   LOAD FROM API
══════════════════════════════════════════ */
async function loadInvoices() {
  setTableLoading(true);
  try {
    const res = await API.billing.getAll();
    if (!res.ok) throw new Error(res.data?.message || 'โหลดข้อมูลไม่สำเร็จ');

    invoicesCache = (res.data.data || []).map(mapInvoice);
    renderTable();
    updateCounts();
    updateStatCards();
  } catch (e) {
    showToast(`❌ ${e.message}`, 'warn');
  } finally {
    setTableLoading(false);
  }
}

/**
 * Map raw API response → local invoice object
 * API fields: invoice_id, invoice_id_raw, booking_id, owner_name, pet_names[],
 *             checkin_date, checkout_date, room_total, service_total, vet_cost,
 *             grand_total, amount_paid, payment_status, payment_method, last_payment_date
 */
function mapInvoice(raw) {
  const status = raw.payment_status === 'UNPAID' ? 'PENDING_PAYMENT' : raw.payment_status;
  return {
    id:              raw.invoice_id,
    id_raw:          raw.invoice_id_raw,
    booking_id:      `BK-${String(raw.booking_id).padStart(4, '0')}`,
    booking_id_raw:  raw.booking_id,
    pet_name:        (raw.pet_names || []).join(', ') || '—',
    pet_emoji:       '🐾',
    owner_name:      raw.owner_name,
    issue_date:      raw.checkout_date || raw.last_payment_date?.slice(0, 10),
    checkin_date:    raw.checkin_date,
    checkout_date:   raw.checkout_date,
    total_amount:    raw.grand_total  || 0,
    amount_paid:     raw.amount_paid || 0,
    remaining_amount: raw.remaining_amount ?? Math.max((raw.grand_total || 0) - (raw.amount_paid || 0), 0),
    room_total:      raw.room_total   || 0,
    service_total:   raw.service_total || 0,
    vet_cost:        raw.vet_cost     || 0,
    discount:        0,
    payment_status:  status,
    payment_method:  raw.payment_method,
    last_payment_date: raw.last_payment_date,
    line_items:      [],   // populated on demand from getById
  };
}

/* ══════════════════════════════════════════
   RENDER TABLE
══════════════════════════════════════════ */
function setTableLoading(on) {
  const tbody = document.getElementById('invoices-tbody');
  if (on) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:48px;color:var(--bl-text-2);font-size:14px">
          ⏳ กำลังโหลดข้อมูล...
        </td>
      </tr>`;
    document.getElementById('bl-empty').style.display = 'none';
  }
}

function renderTable() {
  const tbody     = document.getElementById('invoices-tbody');
  const emptyEl   = document.getElementById('bl-empty');
  const showingEl = document.getElementById('bl-showing');
  const filtered  = getFiltered();
  const page = window.Pagination
    ? Pagination.paginate(filtered, { key: BILLING_PAGE_KEY, pageSize: BILLING_PAGE_SIZE })
    : { pageItems: filtered, total: filtered.length, start: 0, end: filtered.length, totalPages: 1 };

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showingEl.textContent = 'ไม่พบรายการ';
    window.Pagination?.render(page, { key: BILLING_PAGE_KEY, containerId: 'bl-pager', infoId: 'bl-showing', label: 'รายการ', onChange: renderTable });
    return;
  }

  emptyEl.style.display = 'none';
  window.Pagination?.render(page, { key: BILLING_PAGE_KEY, containerId: 'bl-pager', infoId: 'bl-showing', label: 'รายการ', onChange: renderTable });

  tbody.innerHTML = page.pageItems.map(inv => `
    <tr data-id="${inv.id}">
      <td>
        <div class="bl-invoice-id">${inv.id}</div>
        <div class="bl-invoice-date">${formatDate(inv.issue_date)}</div>
      </td>
      <td>
        <div class="bl-pet-cell">
          <div class="bl-pet-emoji">${inv.pet_emoji}</div>
          <div>
            <div class="bl-pet-name">${inv.pet_name}</div>
            <div class="bl-pet-owner">${inv.owner_name}</div>
          </div>
        </div>
      </td>
      <td><span class="bl-booking-id">${inv.booking_id}</span></td>
      <td><span style="color:var(--bl-text-2);font-size:13px">${formatDate(inv.issue_date)}</span></td>
      <td>
        <div class="bl-amount">฿${inv.total_amount.toLocaleString()}</div>
        ${inv.payment_status === 'PARTIAL'
          ? `<div class="bl-remaining">คงเหลือ ฿${Math.max(inv.remaining_amount || 0, 0).toLocaleString()}</div>`
          : ''}
      </td>
      <td><div class="bl-pay-method">${paymentIcon(inv.payment_method)} ${paymentLabel(inv.payment_method)}</div></td>
      <td>
        <span class="bl-status ${inv.payment_status}">
          <span class="bl-status-dot"></span>
          ${statusLabel(inv.payment_status)}
        </span>
      </td>
      <td>
        <div class="bl-action-btns">
          <button class="bl-btn-view" title="ดูรายละเอียด" onclick="openDetail('${inv.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <button class="bl-btn-print" title="พิมพ์ใบเสร็จ" onclick="printInvoice('${inv.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
          </button>
          <select class="bl-inline-select" onchange="quickUpdateBilling('${inv.id}','payment_method',this.value)" title="แก้ไขวิธีชำระเงิน">
            ${BILLING_METHOD_OPTIONS.map(method => `<option value="${method}" ${inv.payment_method === method ? 'selected' : ''}>${paymentLabel(method)}</option>`).join('')}
          </select>
          <select class="bl-inline-select" onchange="quickUpdateBilling('${inv.id}','payment_status',this.value)" title="แก้ไขสถานะการชำระเงิน">
            ${BILLING_STATUS_OPTIONS.map(status => `<option value="${status}" ${inv.payment_status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}
          </select>
          ${renderPayAction(inv)}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPayAction(inv) {
  if (inv.payment_status !== 'PAID') {
    return `<button class="bl-btn-pay" onclick="quickPay('${inv.id}')">รับชำระ</button>`;
  }
  return `<span class="bl-btn-pay bl-btn-pay-disabled" aria-disabled="true">รับชำระ</span>`;
}

/* ══════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════ */
function getFiltered() {
  return invoicesCache.filter(inv => {
    const matchStatus = currentFilter === 'all' || inv.payment_status === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch =
      !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.pet_name.toLowerCase().includes(q) ||
      inv.owner_name.toLowerCase().includes(q) ||
      inv.booking_id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

function filterInvoices(filter, btn) {
  currentFilter = filter;
  window.Pagination?.reset(BILLING_PAGE_KEY);
  document.querySelectorAll('.bl-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchInvoices(q) {
  currentSearch = q;
  window.Pagination?.reset(BILLING_PAGE_KEY);
  renderTable();
}

function updateCounts() {
  document.getElementById('count-all').textContent           = invoicesCache.length;
  document.getElementById('count-PENDING_PAYMENT').textContent = invoicesCache.filter(i => i.payment_status === 'PENDING_PAYMENT').length;
  const countPartial = document.getElementById('count-PARTIAL');
  if (countPartial) countPartial.textContent = invoicesCache.filter(i => i.payment_status === 'PARTIAL').length;
  document.getElementById('count-PAID').textContent          = invoicesCache.filter(i => i.payment_status === 'PAID').length;
  const countCancelled = document.getElementById('count-CANCELLED');
  if (countCancelled) countCancelled.textContent = invoicesCache.filter(i => i.payment_status === 'CANCELLED').length;
}

function updateStatCards() {
  const now       = new Date();
  const paidAll   = invoicesCache.filter(i => i.payment_status === 'PAID');
  const pendingAll = invoicesCache.filter(i => i.payment_status === 'PENDING_PAYMENT');

  // Filter paid invoices that belong to this month
  const paidThisMonth = paidAll.filter(i => {
    const d = new Date(i.last_payment_date || i.issue_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const revenue       = paidThisMonth.reduce((s, i) => s + i.total_amount, 0);
  const totalCount    = invoicesCache.filter(i => {
    const d = new Date(i.issue_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const pendingRevenue = pendingAll.reduce((s, i) => s + i.total_amount, 0);
  const avgPerBill    = paidThisMonth.length ? revenue / paidThisMonth.length : 0;

  // Stat cards are in order: green (revenue), blue (total), amber (pending), teal (avg)
  const cards = document.querySelectorAll('.bl-stat');
  cards[0]?.querySelector('.bl-stat-value')?.setAttribute('textContent', `฿${revenue.toLocaleString()}`);
  cards[0]?.querySelector('.bl-stat-value') && (cards[0].querySelector('.bl-stat-value').textContent = `฿${revenue.toLocaleString()}`);
  cards[1]?.querySelector('.bl-stat-value') && (cards[1].querySelector('.bl-stat-value').textContent = totalCount);
  cards[2]?.querySelector('.bl-stat-value') && (cards[2].querySelector('.bl-stat-value').textContent = pendingAll.length);
  cards[2]?.querySelector('.bl-stat-sub')   && (cards[2].querySelector('.bl-stat-sub').textContent   = `รวม ฿${pendingRevenue.toLocaleString()}`);
  cards[3]?.querySelector('.bl-stat-value') && (cards[3].querySelector('.bl-stat-value').textContent = `฿${Math.round(avgPerBill).toLocaleString()}`);
}

/* ══════════════════════════════════════════
   INVOICE DETAIL MODAL
══════════════════════════════════════════ */
async function openDetail(id) {
  const inv = invoicesCache.find(x => x.id === id);
  if (!inv) return;
  selectedInv = inv;

  // Show modal immediately with loading skeleton
  document.getElementById('det-subtitle').textContent = `${inv.id} · ${inv.pet_name} (${inv.booking_id})`;
  document.getElementById('det-body').innerHTML = `
    <div style="text-align:center;padding:48px;color:var(--bl-text-2);font-size:14px">
      ⏳ กำลังโหลดรายละเอียด...
    </div>`;
  document.getElementById('det-pay-btn').style.display = inv.payment_status === 'PAID' ? 'none' : '';
  openModal('modal-detail');

  try {
    // Use cache if available
    let detail = detailCache[inv.id_raw];
    if (!detail) {
      const res = await API.billing.getById(inv.id_raw);
      if (!res.ok) throw new Error(res.data?.message || 'โหลดรายละเอียดไม่สำเร็จ');
      detail = res.data.data;
      detailCache[inv.id_raw] = detail;
    }

    // Merge detail into selectedInv so printInvoice() can use it
    selectedInv = { ...inv, line_items: detail.line_items || [] };

    document.getElementById('det-body').innerHTML = buildDetailHTML(selectedInv, detail);
  } catch (e) {
    document.getElementById('det-body').innerHTML = `
      <div style="text-align:center;padding:48px;color:#dc2626;font-size:14px">
        ❌ ${e.message}
      </div>`;
  }
}

function buildDetailHTML(inv, detail) {
  const d = detail || inv;
  return `
    <div class="bl-detail-meta">
      <div class="bl-detail-box">
        <div class="bl-detail-box-label">🐾 ข้อมูลการจอง</div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">สัตว์เลี้ยง</span>
          <span class="bl-detail-row-val">${inv.pet_emoji} ${inv.pet_name}</span>
        </div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">เจ้าของ</span>
          <span class="bl-detail-row-val">${inv.owner_name}</span>
        </div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">Booking ID</span>
          <span class="bl-detail-row-val">${inv.booking_id}</span>
        </div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">Check-in</span>
          <span class="bl-detail-row-val">${formatDate(d.checkin_date)}</span>
        </div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">Check-out</span>
          <span class="bl-detail-row-val">${formatDate(d.checkout_date)}</span>
        </div>
      </div>
      <div class="bl-detail-box">
        <div class="bl-detail-box-label">💳 ข้อมูลการชำระ</div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">สถานะ</span>
          <span class="bl-detail-row-val">
            <span class="bl-status ${inv.payment_status}" style="font-size:11px">
              ${statusLabel(inv.payment_status)}
            </span>
          </span>
        </div>
        <div class="bl-detail-row">
          <span class="bl-detail-row-label">วิธีชำระ</span>
          <span class="bl-detail-row-val">${paymentIcon(inv.payment_method)} ${paymentLabel(inv.payment_method)}</span>
        </div>
        ${inv.last_payment_date ? `
          <div class="bl-detail-row">
            <span class="bl-detail-row-label">เวลาชำระ</span>
            <span class="bl-detail-row-val">${formatDateTime(inv.last_payment_date)}</span>
          </div>` : ''}
        ${(inv.amount_paid > 0) ? `
          <div class="bl-detail-row">
            <span class="bl-detail-row-label">ยอดที่ชำระแล้ว</span>
            <span class="bl-detail-row-val">฿${(inv.amount_paid || 0).toLocaleString()}</span>
          </div>` : ''}
        ${(inv.remaining_amount > 0) ? `
          <div class="bl-detail-row">
            <span class="bl-detail-row-label">ยอดคงเหลือ</span>
            <span class="bl-detail-row-val" style="color:#DC2626">฿${(inv.remaining_amount || 0).toLocaleString()}</span>
          </div>` : ''}
      </div>
    </div>

    <p class="bl-section-title">รายการสินค้า / บริการ</p>
    <div class="bl-line-items">
      <div class="bl-line-items-header">รายการ</div>

      ${(d.line_items || []).map(item => `
        <div class="bl-line-item">
          <span class="bl-line-item-desc">${item.description}</span>
          <span class="bl-line-item-amount">฿${(item.amount ?? item.subtotal ?? 0).toLocaleString()}</span>
        </div>`).join('')}

      ${(d.vet_cost > 0) ? `
        <div class="bl-line-item">
          <span class="bl-line-item-desc">ค่าสัตวแพทย์ฉุกเฉิน</span>
          <span class="bl-line-item-amount">฿${(d.vet_cost || 0).toLocaleString()}</span>
        </div>` : ''}

      ${(inv.amount_paid > 0) ? `
        <div class="bl-line-item" style="color:var(--bl-green,#059669)">
          <span class="bl-line-item-desc">หักยอดชำระแล้ว</span>
          <span class="bl-line-item-amount">-฿${(inv.amount_paid || 0).toLocaleString()}</span>
        </div>` : ''}

      <div class="bl-total-row">
        <span>ยอดรวมทั้งหมด</span>
        <span>฿${(d.grand_total ?? inv.total_amount).toLocaleString()}</span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   PAY MODAL
══════════════════════════════════════════ */
function openPayModal() {
  if (!selectedInv) return;
  document.getElementById('pay-subtitle').textContent = `${selectedInv.id} · ${selectedInv.pet_name}`;
  document.getElementById('pay-amount-val').textContent = `฿${selectedInv.total_amount.toLocaleString()}`;
  document.getElementById('pay-remaining-val').textContent = `฿${Math.max(selectedInv.remaining_amount || 0, 0).toLocaleString()}`;
  const amountInput = document.getElementById('pay-amount-input');
  if (amountInput) amountInput.value = Math.max(selectedInv.remaining_amount || 0, 0);
  document.getElementById('pay-note').value = '';
  document.querySelector('input[name="pay-method"][value="cash"]').checked = true;
  closeModal('modal-detail');
  openModal('modal-pay');
}

function quickPay(id) {
  selectedInv = invoicesCache.find(x => x.id === id) || null;
  if (!selectedInv) return;
  openPayModal();
}

async function confirmPayment() {
  if (!selectedInv) return;
  const method = document.querySelector('input[name="pay-method"]:checked')?.value ?? 'cash';
  const amountInput = document.getElementById('pay-amount-input');
  const payAmount = Number(amountInput?.value || 0);
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    showToast('❌ กรุณากรอกยอดรับชำระที่มากกว่า 0', 'warn');
    return;
  }
  const btn = document.querySelector('#modal-pay .btn-primary');
  btn.disabled = true;
  btn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4"/></svg> กำลังบันทึก...`;

  try {
    const res = await API.billing.update(selectedInv.id_raw, { payment_method: method, paid_amount: payAmount });
    if (!res.ok) throw new Error(res.data?.message || 'บันทึกการชำระไม่สำเร็จ');

    // Update local cache — no need to re-fetch list
    const cached = invoicesCache.find(x => x.id === selectedInv.id);
    if (cached) {
      cached.payment_status = res.data?.payment_status || cached.payment_status;
      cached.payment_method = res.data?.payment_method || method;
      cached.amount_paid = Number(res.data?.amount_paid ?? cached.amount_paid ?? 0);
      cached.remaining_amount = Number(res.data?.remaining_amount ?? Math.max(cached.total_amount - cached.amount_paid, 0));
      cached.last_payment_date = res.data?.last_payment_date || cached.last_payment_date;
    }
    delete detailCache[selectedInv.id_raw]; // invalidate stale detail

    updateCounts();
    updateStatCards();
    renderTable();
    closeModal('modal-pay');
    const remaining = Number(res.data?.remaining_amount ?? 0);
    showToast(`✅ บันทึกรับชำระ ${selectedInv.id} สำเร็จ · คงเหลือ ฿${remaining.toLocaleString()}`);
  } catch (e) {
    showToast(`❌ ${e.message}`, 'warn');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7"/>
      </svg>
      ยืนยันการชำระเงิน`;
  }
}

async function quickUpdateBilling(id, field, value) {
  const inv = invoicesCache.find(x => x.id === id);
  if (!inv) return;

  const payload = field === 'payment_method'
    ? { payment_method: value }
    : { payment_status: value };
  const oldStatus = inv.payment_status;
  const oldMethod = inv.payment_method;
  const oldPaidAt = inv.last_payment_date;
  const oldPaidAmount = inv.amount_paid;
  const oldRemaining = inv.remaining_amount;

  if (field === 'payment_method' && oldMethod === value) return;
  if (field === 'payment_status' && oldStatus === value) return;

  if (field === 'payment_method') inv.payment_method = value;
  if (field === 'payment_status') {
    inv.payment_status = value;
  }
  renderTable();

  try {
    if (field === 'payment_status' && value !== 'CANCELLED') {
      const paidInput = prompt(
        `กรอกยอดที่ชำระแล้ว (THB) สำหรับ ${inv.id}\nยอดรวม: ฿${inv.total_amount.toLocaleString()}`,
        String(inv.paid_amount ?? 0)
      );
      if (paidInput === null) {
        inv.payment_status = oldStatus;
        inv.payment_method = oldMethod;
        inv.last_payment_date = oldPaidAt;
        inv.amount_paid = oldPaidAmount;
        inv.remaining_amount = oldRemaining;
        renderTable();
        return;
      }
      const paidAmount = Number(paidInput);
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        throw new Error('ยอดที่ชำระแล้วต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
      }
      payload.paid_amount = paidAmount;
    }

    const res = await API.billing.update(inv.id_raw, payload);
    if (!res.ok) throw new Error(res.data?.message || 'อัปเดตข้อมูลไม่สำเร็จ');

    if (res.data?.payment_status) inv.payment_status = res.data.payment_status;
    if (res.data?.payment_method) inv.payment_method = res.data.payment_method;
    if (typeof res.data?.amount_paid === 'number') inv.amount_paid = res.data.amount_paid;
    if (typeof res.data?.remaining_amount === 'number') inv.remaining_amount = res.data.remaining_amount;
    inv.last_payment_date = res.data?.last_payment_date || inv.last_payment_date;

    delete detailCache[inv.id_raw];
    updateCounts();
    updateStatCards();
    renderTable();
    showToast(`✅ อัปเดต ${inv.id} สำเร็จ`);
  } catch (e) {
    inv.payment_status = oldStatus;
    inv.payment_method = oldMethod;
    inv.last_payment_date = oldPaidAt;
    inv.amount_paid = oldPaidAmount;
    inv.remaining_amount = oldRemaining;
    updateCounts();
    updateStatCards();
    renderTable();
    showToast(`❌ ${e.message}`, 'warn');
  }
}

/* ══════════════════════════════════════════
   PRINT INVOICE
══════════════════════════════════════════ */
async function printInvoice(id) {
  const inv = invoicesCache.find(x => x.id === id);
  if (!inv) return;

  showToast(`🖨️ กำลังเตรียมพิมพ์ ${id}...`, 'info');

  try {
    let detail = detailCache[inv.id_raw];
    if (!detail) {
      const res = await API.billing.getById(inv.id_raw);
      if (!res.ok) throw new Error(res.data?.message || 'โหลดรายละเอียดไม่สำเร็จ');
      detail = res.data.data;
      detailCache[inv.id_raw] = detail;
    }

    // Merge everything into one object for the print template
    openPrintWindow({ ...inv, ...detail, line_items: detail.line_items || [] });
  } catch (e) {
    showToast(`❌ ${e.message}`, 'warn');
  }
}

function openPrintWindow(inv) {
  const lineItemsHTML = (inv.line_items || []).map(item => `
    <tr>
      <td class="td-desc">${item.description}</td>
      <td class="td-amount">฿${(item.amount ?? item.subtotal ?? 0).toLocaleString()}</td>
    </tr>`).join('');

  const vetRow = (inv.vet_cost > 0) ? `
    <tr>
      <td class="td-desc">ค่าสัตวแพทย์ฉุกเฉิน</td>
      <td class="td-amount">฿${inv.vet_cost.toLocaleString()}</td>
    </tr>` : '';

  const depositRow = (inv.amount_paid > 0) ? `
    <tr class="row-deposit">
      <td class="td-desc">หักยอดที่ชำระแล้ว</td>
      <td class="td-amount">-฿${(inv.amount_paid || 0).toLocaleString()}</td>
    </tr>` : '';

  const statusBadge = inv.payment_status === 'PAID'
    ? `<span class="badge paid">✓ ชำระแล้ว</span>`
    : (inv.payment_status === 'PARTIAL'
      ? `<span class="badge partial">△ ชำระบางส่วน</span>`
      : `<span class="badge pending">⏳ รอชำระ</span>`);

  const paymentBlock = inv.payment_status === 'PAID' ? `
    <div class="payment-section">
      <div class="payment-col">
        <div class="payment-label">วิธีชำระเงิน</div>
        <div class="payment-val">${paymentIcon(inv.payment_method)} ${paymentLabel(inv.payment_method)}</div>
      </div>
      <div class="payment-col" style="text-align:right">
        <div class="payment-label">ชำระเมื่อ</div>
        <div class="payment-val">${formatDateTime(inv.last_payment_date)}</div>
      </div>
    </div>` : (inv.payment_status === 'PARTIAL' ? `
    <div class="payment-section">
      <div class="payment-col">
        <div class="payment-label">ชำระแล้ว</div>
        <div class="payment-val">฿${(inv.amount_paid || 0).toLocaleString()}</div>
      </div>
      <div class="payment-col" style="text-align:right">
        <div class="payment-label">คงเหลือ</div>
        <div class="payment-val" style="color:#DC2626">฿${(inv.remaining_amount || 0).toLocaleString()}</div>
      </div>
    </div>` : '');

  const printedAt = new Date().toLocaleString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จ ${inv.invoice_id || inv.id} — Purrfect Stay</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', 'Sarabun', sans-serif;
      background: #fff;
      color: #111827;
      font-size: 14px;
      line-height: 1.6;
    }

    .page {
      max-width: 660px;
      margin: 0 auto;
      padding: 56px 56px 72px;
    }

    /* ── Header ── */
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    .shop-logo {
      font-family: 'DM Serif Display', serif;
      font-size: 26px;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .shop-logo .accent { color: #f97316; }

    .shop-info {
      margin-top: 8px;
      font-size: 12px;
      color: #6b7280;
      line-height: 1.8;
    }

    .inv-meta { text-align: right; }

    .inv-number {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.5px;
    }

    .inv-date {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 3px;
    }

    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.paid    { background: #D1FAE5; color: #065F46; }
    .badge.pending { background: #FEF3C7; color: #92400E; }

    /* ── Divider ── */
    hr { border: none; border-top: 1.5px solid #f3f4f6; margin: 28px 0; }
    hr.dashed { border-top-style: dashed; }

    /* ── Info grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    .info-section-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 10px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 13px;
      padding: 3px 0;
      gap: 8px;
    }
    .info-row-label { color: #6b7280; white-space: nowrap; }
    .info-row-val   { font-weight: 500; color: #111827; text-align: right; }

    /* ── Line items ── */
    .items-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 12px;
    }

    table { width: 100%; border-collapse: collapse; }

    thead th {
      background: #f9fafb;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-align: left;
      border-bottom: 1.5px solid #e5e7eb;
    }
    thead th:last-child { text-align: right; }

    .td-desc   { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .td-amount { padding: 10px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; text-align: right; font-weight: 500; }

    .row-deposit .td-desc,
    .row-deposit .td-amount { color: #059669; }

    /* ── Total ── */
    .total-box {
      background: #f9fafb;
      border-radius: 10px;
      padding: 16px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
    }
    .total-box-label { font-size: 14px; font-weight: 600; color: #374151; }
    .total-box-val   { font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.5px; }

    /* ── Payment section ── */
    .payment-section {
      margin-top: 20px;
      border: 1.5px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payment-label { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
    .payment-val   { font-size: 14px; font-weight: 600; color: #111827; }

    /* ── Footer ── */
    .inv-footer {
      margin-top: 56px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      border-top: 1px dashed #e5e7eb;
      padding-top: 24px;
    }
    .inv-footer strong { color: #6b7280; }

    .printed-at {
      margin-top: 28px;
      text-align: right;
      font-size: 11px;
      color: #d1d5db;
    }

    /* ── Print overrides ── */
    @media print {
      body  { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 32px 40px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- ── Header ── -->
  <div class="inv-header">
    <div>
      <div class="shop-logo">🐾 Purrfect<span class="accent"> Stay</span></div>
      <div class="shop-info">
        มหาวิทยาลัยธรรมศาสตร์ ท่าพระจันทร์<br>
        แขวงพระบรมมหาราชวัง เขตพระนคร<br>
        กรุงเทพมหานคร 10200<br>
        โทร: 02-XXX-XXXX
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-number">${inv.invoice_id || inv.id}</div>
      <div class="inv-date">วันที่ออกบิล: ${formatDate(inv.checkout_date || inv.issue_date)}</div>
      ${statusBadge}
    </div>
  </div>

  <hr>

  <!-- ── Customer & Stay Info ── -->
  <div class="info-grid">
    <div>
      <div class="info-section-label">ข้อมูลลูกค้า</div>
      <div class="info-row">
        <span class="info-row-label">ชื่อเจ้าของ</span>
        <span class="info-row-val">${inv.owner_name}</span>
      </div>
      <div class="info-row">
        <span class="info-row-label">สัตว์เลี้ยง</span>
        <span class="info-row-val">${inv.pet_name}</span>
      </div>
      <div class="info-row">
        <span class="info-row-label">Booking ID</span>
        <span class="info-row-val">${inv.booking_id}</span>
      </div>
    </div>
    <div>
      <div class="info-section-label">รายละเอียดการเข้าพัก</div>
      <div class="info-row">
        <span class="info-row-label">Check-in</span>
        <span class="info-row-val">${formatDate(inv.checkin_date)}</span>
      </div>
      <div class="info-row">
        <span class="info-row-label">Check-out</span>
        <span class="info-row-val">${formatDate(inv.checkout_date)}</span>
      </div>
    </div>
  </div>

  <!-- ── Line Items ── -->
  <div class="items-label">รายการสินค้า / บริการ</div>
  <table>
    <thead>
      <tr>
        <th>รายการ</th>
        <th style="text-align:right">จำนวนเงิน</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
      ${vetRow}
      ${depositRow}
    </tbody>
  </table>

  <!-- ── Total ── -->
  <div class="total-box">
    <span class="total-box-label">ยอดรวมทั้งหมด</span>
    <span class="total-box-val">฿${(inv.grand_total ?? inv.total_amount ?? 0).toLocaleString()}</span>
  </div>

  <!-- ── Payment Info ── -->
  ${paymentBlock}

  <!-- ── Footer ── -->
  <div class="inv-footer">
    ขอบคุณที่ไว้วางใจ <strong>Purrfect Stay</strong> 🐾<br>
    หากมีข้อสงสัยเกี่ยวกับใบเสร็จ กรุณาติดต่อเจ้าหน้าที่
  </div>

  <div class="printed-at">พิมพ์เมื่อ: ${printedAt}</div>

</div>
<script>
  window.onload = () => { window.print(); };
<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=720,height=960,menubar=no,toolbar=no');
  if (!win) {
    showToast('❌ ไม่สามารถเปิดหน้าต่างพิมพ์ได้ — กรุณาอนุญาต Pop-up', 'warn');
    return;
  }
  win.document.write(html);
  win.document.close();
}

/* ══════════════════════════════════════════
   EXPORT REPORT (CSV)
══════════════════════════════════════════ */
function exportReport() {
  if (invoicesCache.length === 0) {
    showToast('ไม่มีข้อมูลให้ export', 'warn');
    return;
  }

  const rows = [
    ['Invoice ID', 'Booking ID', 'สัตว์เลี้ยง', 'เจ้าของ', 'Check-in', 'Check-out', 'ยอดรวม (฿)', 'วิธีชำระ', 'สถานะ', 'วันที่ชำระ'],
    ...invoicesCache.map(inv => [
      inv.id,
      inv.booking_id,
      inv.pet_name,
      inv.owner_name,
      inv.checkin_date  || '',
      inv.checkout_date || '',
      inv.total_amount,
      paymentLabel(inv.payment_method),
      statusLabel(inv.payment_status),
      inv.last_payment_date ? formatDateTime(inv.last_payment_date) : '',
    ]),
  ];

  // Wrap each cell in quotes; escape existing quotes by doubling them
  const csv = rows
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // BOM (\uFEFF) ensures Excel on Windows reads Thai characters correctly
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `billing-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`📊 Export CSV สำเร็จ · ${invoicesCache.length} รายการ`);
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function bindModalBackdrops() {
  document.querySelectorAll('.bl-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.bl-modal-overlay.open')
              .forEach(m => m.classList.remove('open'));
    }
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  document.getElementById('bl-toast')?.remove();

  const palette = {
    success: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    warn:    { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
    info:    { bg: '#EEF2FF', color: '#3730A3', border: '#A5B4FC' },
  };
  const c = palette[type] || palette.success;

  const toast = document.createElement('div');
  toast.id = 'bl-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${c.bg};color:${c.color};border:1.5px solid ${c.border};
    padding:12px 20px;border-radius:14px;
    font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);
    animation:slideUp .3s ease;max-width:400px;line-height:1.5;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusLabel(s)  { return { PAID: 'ชำระแล้ว', PARTIAL: 'ชำระบางส่วน', PENDING_PAYMENT: 'รอชำระ', CANCELLED: 'ยกเลิก' }[s] ?? s ?? '—'; }
function paymentLabel(s) { return { cash: 'เงินสด', qr_promptpay: 'QR PromptPay', credit_card: 'บัตรเครดิต', bank_transfer: 'โอนธนาคาร' }[s] ?? '—'; }
function paymentIcon(s)  { return { cash: '💵', qr_promptpay: '📱', credit_card: '💳', bank_transfer: '🏦' }[s] ?? ''; }
