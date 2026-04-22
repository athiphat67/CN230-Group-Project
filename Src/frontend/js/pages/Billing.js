/**
 * Billing.js — Page logic for Billing & Payment Management
 * Purrfect Stay Admin Panel
 *
 * Handles: table render · filter tabs · search · modals ·
 *          invoice detail · record payment · export
 */

/* ── MOCK DATA (replace with API calls) ── */
const INVOICES = [
  {
    id: 'INV-0001',
    booking_id: 'BK-0001',
    pet_name: 'มะม่วง',
    pet_emoji: '🐱',
    owner_name: 'อาพิญา ศ.',
    issue_date: '2025-04-06',
    line_items: [
      { description: 'ค่าห้อง A01 (Standard AC) × 4 คืน', amount: 2000 },
      { description: 'อาบน้ำ', amount: 200 },
      { description: 'ถ่ายรูป', amount: 150 },
    ],
    subtotal: 2350, discount: 0, total_amount: 2350,
    payment_status: 'PAID',
    payment_method: 'cash',
    paid_at: '2025-04-06T12:30:00',
  },
  {
    id: 'INV-0002',
    booking_id: 'BK-0002',
    pet_name: 'โดนัท',
    pet_emoji: '🐶',
    owner_name: 'ชัญญา ด.',
    issue_date: '2025-04-06',
    line_items: [
      { description: 'ค่าห้อง A03 (Standard AC) × 3 คืน', amount: 1500 },
      { description: 'ตัดขน', amount: 350 },
    ],
    subtotal: 1850, discount: 0, total_amount: 1850,
    payment_status: 'PAID',
    payment_method: 'qr_promptpay',
    paid_at: '2025-04-06T14:00:00',
  },
  {
    id: 'INV-0003',
    booking_id: 'BK-0003',
    pet_name: 'บิ๊กบอย',
    pet_emoji: '🐕',
    owner_name: 'สมศักดิ์ ท.',
    issue_date: '2025-04-10',
    line_items: [
      { description: 'ค่าห้อง V-02 (VIP Penthouse) × 5 คืน', amount: 6000 },
      { description: 'นวด', amount: 250 },
      { description: 'ตรวจสุขภาพ', amount: 400 },
    ],
    subtotal: 6650, discount: 0, total_amount: 6650,
    payment_status: 'PENDING_PAYMENT',
    payment_method: null,
    paid_at: null,
  },
  {
    id: 'INV-0004',
    booking_id: 'BK-0004',
    pet_name: 'ซาชิ',
    pet_emoji: '🐕',
    owner_name: 'ปณิตา ก.',
    issue_date: '2025-04-04',
    line_items: [
      { description: 'ค่าห้อง B02 (Standard Fan) × 3 คืน', amount: 1050 },
    ],
    subtotal: 1050, discount: 0, total_amount: 1050,
    payment_status: 'PAID',
    payment_method: 'credit_card',
    paid_at: '2025-04-04T11:00:00',
  },
  {
    id: 'INV-0005',
    booking_id: 'BK-0005',
    pet_name: 'มูมู่',
    pet_emoji: '🐱',
    owner_name: 'วิภาวี ส.',
    issue_date: '2025-04-09',
    line_items: [
      { description: 'ค่าห้อง C01 (Deluxe Suite) × 3 คืน', amount: 2400 },
      { description: 'อาบน้ำ', amount: 200 },
      { description: 'นวด', amount: 250 },
    ],
    subtotal: 2850, discount: 0, total_amount: 2850,
    payment_status: 'PENDING_PAYMENT',
    payment_method: null,
    paid_at: null,
  },
  {
    id: 'INV-0006',
    booking_id: 'BK-0006',
    pet_name: 'ทาโร่',
    pet_emoji: '🐶',
    owner_name: 'ณิชา ร.',
    issue_date: '2025-04-08',
    line_items: [
      { description: 'ค่าห้อง B04 (Standard AC) × 4 คืน', amount: 2000 },
      { description: 'ตัดขน', amount: 350 },
      { description: 'อาบน้ำ', amount: 200 },
    ],
    subtotal: 2550, discount: 0, total_amount: 2550,
    payment_status: 'PENDING_PAYMENT',
    payment_method: null,
    paid_at: null,
  },
  {
    id: 'INV-0007',
    booking_id: 'BK-0007',
    pet_name: 'ลูน่า',
    pet_emoji: '🐱',
    owner_name: 'กัลยา ม.',
    issue_date: '2025-04-12',
    line_items: [
      { description: 'ค่าห้อง A05 (Standard Fan) × 5 คืน', amount: 1750 },
    ],
    subtotal: 1750, discount: 0, total_amount: 1750,
    payment_status: 'PAID',
    payment_method: 'qr_promptpay',
    paid_at: '2025-04-12T10:00:00',
  },
  {
    id: 'INV-0008',
    booking_id: 'BK-0010',
    pet_name: 'ช็อกโก้',
    pet_emoji: '🐶',
    owner_name: 'ธนาภร ว.',
    issue_date: '2025-04-15',
    line_items: [
      { description: 'ค่าห้อง B03 (Standard Fan) × 4 คืน', amount: 1400 },
      { description: 'ตรวจสุขภาพ', amount: 400 },
    ],
    subtotal: 1800, discount: 0, total_amount: 1800,
    payment_status: 'PAID',
    payment_method: 'cash',
    paid_at: '2025-04-15T16:00:00',
  },
];

/* ── STATE ── */
let currentFilter = 'all';
let currentSearch = '';
let selectedInvoiceId = null;

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
  const tbody = document.getElementById('invoices-tbody');
  const emptyEl = document.getElementById('bl-empty');
  const showingEl = document.getElementById('bl-showing');

  const filtered = getFiltered();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showingEl.textContent = 'ไม่พบรายการ';
    return;
  }

  emptyEl.style.display = 'none';
  showingEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(inv => `
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
      <td><div class="bl-amount">฿${inv.total_amount.toLocaleString()}</div></td>
      <td><div class="bl-pay-method">${paymentIcon(inv.payment_method)} ${paymentLabel(inv.payment_method)}</div></td>
      <td><span class="bl-status ${inv.payment_status}"><span class="bl-status-dot"></span>${statusLabel(inv.payment_status)}</span></td>
      <td>
        <div class="bl-action-btns">
          <button class="bl-btn-view" title="ดูรายละเอียด" onclick="openDetail('${inv.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          ${inv.payment_status === 'PENDING_PAYMENT' ? `<button class="bl-btn-pay" onclick="quickPay('${inv.id}')">รับชำระ</button>` : ''}
          <button class="bl-btn-print" title="พิมพ์ใบเสร็จ" onclick="printInvoice('${inv.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

/* ══════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════ */
function getFiltered() {
  return INVOICES.filter(inv => {
    const matchStatus = currentFilter === 'all' || inv.payment_status === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q ||
      inv.id.toLowerCase().includes(q) ||
      inv.pet_name.toLowerCase().includes(q) ||
      inv.owner_name.toLowerCase().includes(q) ||
      inv.booking_id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });
}

function filterInvoices(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.bl-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchInvoices(q) {
  currentSearch = q;
  renderTable();
}

function updateCounts() {
  document.getElementById('count-all').textContent = INVOICES.length;
  document.getElementById('count-PENDING_PAYMENT').textContent = INVOICES.filter(i => i.payment_status === 'PENDING_PAYMENT').length;
  document.getElementById('count-PAID').textContent = INVOICES.filter(i => i.payment_status === 'PAID').length;
}

/* ══════════════════════════════════════════
   INVOICE DETAIL MODAL
══════════════════════════════════════════ */
function openDetail(id) {
  const inv = INVOICES.find(x => x.id === id);
  if (!inv) return;
  selectedInvoiceId = id;

  document.getElementById('det-subtitle').textContent = `${inv.id} · ${inv.pet_name} (${inv.booking_id})`;

  document.getElementById('det-body').innerHTML = `
    <div class="bl-detail-meta">
      <div class="bl-detail-box">
        <div class="bl-detail-box-label">🐾 ข้อมูลการจอง</div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">สัตว์เลี้ยง</span><span class="bl-detail-row-val">${inv.pet_emoji} ${inv.pet_name}</span></div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">เจ้าของ</span><span class="bl-detail-row-val">${inv.owner_name}</span></div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">Booking ID</span><span class="bl-detail-row-val">${inv.booking_id}</span></div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">วันที่ออกบิล</span><span class="bl-detail-row-val">${formatDate(inv.issue_date)}</span></div>
      </div>
      <div class="bl-detail-box">
        <div class="bl-detail-box-label">💳 ข้อมูลการชำระ</div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">สถานะ</span><span class="bl-detail-row-val"><span class="bl-status ${inv.payment_status}" style="font-size:11px">${statusLabel(inv.payment_status)}</span></span></div>
        <div class="bl-detail-row"><span class="bl-detail-row-label">วิธีชำระ</span><span class="bl-detail-row-val">${paymentIcon(inv.payment_method)} ${paymentLabel(inv.payment_method)}</span></div>
        ${inv.paid_at ? `<div class="bl-detail-row"><span class="bl-detail-row-label">เวลาชำระ</span><span class="bl-detail-row-val">${formatDateTime(inv.paid_at)}</span></div>` : ''}
        <div class="bl-detail-row"><span class="bl-detail-row-label">ส่วนลด</span><span class="bl-detail-row-val">฿${inv.discount.toLocaleString()}</span></div>
      </div>
    </div>

    <p class="bl-section-title">รายการสินค้า / บริการ</p>
    <div class="bl-line-items">
      <div class="bl-line-items-header">รายการ</div>
      ${inv.line_items.map(item => `
        <div class="bl-line-item">
          <span class="bl-line-item-desc">${item.description}</span>
          <span class="bl-line-item-amount">฿${item.amount.toLocaleString()}</span>
        </div>
      `).join('')}
      ${inv.discount > 0 ? `
        <div class="bl-line-item" style="color:var(--bl-coral)">
          <span>ส่วนลด</span>
          <span>-฿${inv.discount.toLocaleString()}</span>
        </div>
      ` : ''}
      <div class="bl-total-row">
        <span>ยอดรวมทั้งหมด</span>
        <span>฿${inv.total_amount.toLocaleString()}</span>
      </div>
    </div>
  `;

  const payBtn = document.getElementById('det-pay-btn');
  if (inv.payment_status === 'PENDING_PAYMENT') {
    payBtn.style.display = '';
  } else {
    payBtn.style.display = 'none';
  }

  openModal('modal-detail');
}

/* ══════════════════════════════════════════
   PAY MODAL
══════════════════════════════════════════ */
function openPayModal() {
  const inv = INVOICES.find(x => x.id === selectedInvoiceId);
  if (!inv) return;

  document.getElementById('pay-subtitle').textContent = `${inv.id} · ${inv.pet_name}`;
  document.getElementById('pay-amount-val').textContent = `฿${inv.total_amount.toLocaleString()}`;
  document.getElementById('pay-note').value = '';
  document.querySelector('input[name="pay-method"][value="cash"]').checked = true;

  closeModal('modal-detail');
  openModal('modal-pay');
}

function quickPay(id) {
  selectedInvoiceId = id;
  openPayModal();
}

function confirmPayment() {
  const inv = INVOICES.find(x => x.id === selectedInvoiceId);
  if (!inv) return;
  const method = document.querySelector('input[name="pay-method"]:checked')?.value ?? 'cash';

  // TODO: PATCH /api/billing/{invoice_id}/pay
  inv.payment_status = 'PAID';
  inv.payment_method = method;
  inv.paid_at = new Date().toISOString();

  updateCounts();
  renderTable();
  closeModal('modal-pay');
  showToast(`✅ บันทึกการชำระเงิน ${inv.id} สำเร็จ! ฿${inv.total_amount.toLocaleString()} (${paymentLabel(method)})`);
}

/* ══════════════════════════════════════════
   PRINT / EXPORT
══════════════════════════════════════════ */
function printInvoice(id) {
  showToast(`🖨️ กำลังเตรียมพิมพ์ ${id}...`, 'info');
  // TODO: Generate PDF / print view
}

function exportReport() {
  showToast('📊 กำลัง export รายงาน...', 'info');
  // TODO: GET /api/billing?export=csv
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
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
      document.querySelectorAll('.bl-modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  const existing = document.getElementById('bl-toast');
  if (existing) existing.remove();

  const colors = {
    success: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
    warn:    { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
    info:    { bg: '#EEF2FF', color: '#3730A3', border: '#A5B4FC' },
  };
  const c = colors[type] || colors.success;

  const toast = document.createElement('div');
  toast.id = 'bl-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${c.bg}; color:${c.color}; border:1.5px solid ${c.border};
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
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dtStr) {
  if (!dtStr) return '—';
  return new Date(dtStr).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s) {
  return { PAID: 'ชำระแล้ว', PENDING_PAYMENT: 'รอชำระ' }[s] ?? s ?? '—';
}

function paymentLabel(s) {
  return { cash: 'เงินสด', qr_promptpay: 'QR PromptPay', credit_card: 'บัตรเครดิต' }[s] ?? '—';
}

function paymentIcon(s) {
  return { cash: '💵', qr_promptpay: '📱', credit_card: '💳' }[s] ?? '';
}
