/**
 * Inventory.js — Page logic for Inventory Management (FR6)
 * Purrfect Stay Admin Panel
 */

/* ── MOCK DATA ── */
const INVENTORY = [
  { item_id: 1, name: 'Royal Canin Kitten',   category: 'food',     unit: 'กก.',  quantity_remaining: 8.5,  quantity_total: 20, reorder_threshold: 4,  expiry_date: '2026-06-30', icon: '🐱' },
  { item_id: 2, name: 'Pro Plan Large Breed',  category: 'food',     unit: 'กก.',  quantity_remaining: 3.0,  quantity_total: 15, reorder_threshold: 5,  expiry_date: '2026-05-15', icon: '🐶' },
  { item_id: 3, name: 'Cat Litter (Clumping)', category: 'supplies', unit: 'ลิตร', quantity_remaining: 2.0,  quantity_total: 30, reorder_threshold: 8,  expiry_date: null,         icon: '🪣' },
  { item_id: 4, name: 'Flea & Tick Treatment', category: 'medicine', unit: 'หลอด', quantity_remaining: 12,   quantity_total: 24, reorder_threshold: 6,  expiry_date: '2026-05-01', icon: '💊' },
  { item_id: 5, name: 'Pet Shampoo (Sensitive)',category: 'supplies', unit: 'ขวด', quantity_remaining: 7,    quantity_total: 12, reorder_threshold: 3,  expiry_date: '2026-12-01', icon: '🛁' },
  { item_id: 6, name: 'Deworming Tablet',      category: 'medicine', unit: 'เม็ด', quantity_remaining: 45,   quantity_total: 100,reorder_threshold: 20, expiry_date: '2026-04-30', icon: '💊' },
  { item_id: 7, name: 'Stainless Food Bowl',   category: 'supplies', unit: 'ใบ',   quantity_remaining: 18,   quantity_total: 30, reorder_threshold: 5,  expiry_date: null,         icon: '🥣' },
  { item_id: 8, name: 'Puppy Milk Replacer',   category: 'food',     unit: 'กก.',  quantity_remaining: 1.5,  quantity_total: 5,  reorder_threshold: 2,  expiry_date: '2026-04-25', icon: '🍼' },
];

/* ── STATE ── */
let currentFilter = 'all';
let currentSearch = '';
let editingId = null;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  renderAlerts();
  renderStats();
  renderTable();
  bindModalBackdrops();
  bindEscapeKey();

  // TODO: เชื่อม API จริง — uncomment บรรทัดด้านล่าง
  // await loadFromAPI();
});

/* ══════════════════════════════════════════
   LOAD FROM API (uncomment เมื่อ backend พร้อม)
══════════════════════════════════════════ */
async function loadFromAPI() {
  const [itemsRes, alertsRes] = await Promise.all([
    window.API.inventory.getAll(),
    window.API.inventory.getAlerts(),
  ]);

  if (itemsRes.ok) {
    INVENTORY.length = 0;
    itemsRes.data.forEach(item => INVENTORY.push(item));
  }

  renderAlerts();
  renderStats();
  renderTable();
}

/* ══════════════════════════════════════════
   ALERTS & STATS
══════════════════════════════════════════ */
function getAlerts() {
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 30);
  return {
    lowStock:   INVENTORY.filter(i => i.quantity_remaining <= i.reorder_threshold),
    nearExpiry: INVENTORY.filter(i => i.expiry_date && new Date(i.expiry_date) <= soon),
  };
}

function renderAlerts() {
  const { lowStock, nearExpiry } = getAlerts();
  const row = document.getElementById('alerts-row');
  if (!row) return;

  row.style.display = (lowStock.length + nearExpiry.length) === 0 ? 'none' : 'flex';

  if (lowStock.length > 0) {
    document.getElementById('alert-low-count').textContent = lowStock.length;
    document.getElementById('alert-low-items').textContent =
      lowStock.map(i => i.name).slice(0, 3).join(', ') + (lowStock.length > 3 ? '...' : '');
  } else {
    const el = document.getElementById('alert-low');
    if (el) el.style.display = 'none';
  }

  if (nearExpiry.length > 0) {
    document.getElementById('alert-exp-count').textContent = nearExpiry.length;
    document.getElementById('alert-exp-items').textContent =
      nearExpiry.map(i => i.name).slice(0, 3).join(', ') + (nearExpiry.length > 3 ? '...' : '');
  } else {
    const el = document.getElementById('alert-exp');
    if (el) el.style.display = 'none';
  }
}

function renderStats() {
  const { lowStock, nearExpiry } = getAlerts();
  document.getElementById('stat-total').textContent    = INVENTORY.length;
  document.getElementById('stat-food').textContent     = INVENTORY.filter(i => i.category === 'food').length;
  document.getElementById('stat-low').textContent      = lowStock.length;
  document.getElementById('stat-expiring').textContent = nearExpiry.length;
}

/* ══════════════════════════════════════════
   TABLE
══════════════════════════════════════════ */
function renderTable() {
  const tbody   = document.getElementById('inv-tbody');
  const emptyEl = document.getElementById('iv-empty');
  const showEl  = document.getElementById('iv-showing');

  const filtered = getFiltered();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showEl.textContent = 'ไม่พบรายการ';
    return;
  }

  emptyEl.style.display = 'none';
  showEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(item => {
    const pct   = Math.round((item.quantity_remaining / item.quantity_total) * 100);
    const level = pct <= 20 ? 'danger' : pct <= 40 ? 'low' : 'good';
    const status = getItemStatus(item);
    const catIcon = { food: '🌾', supplies: '📦', medicine: '💊' }[item.category] || '📦';

    return `
      <tr>
        <td>
          <div class="iv-item-cell">
            <div class="iv-item-icon ${item.category}">${item.icon || catIcon}</div>
            <div>
              <div class="iv-item-name">${item.name}</div>
              <div class="iv-item-unit">หน่วย: ${item.unit}</div>
            </div>
          </div>
        </td>
        <td><span class="iv-cat-badge ${item.category}">${catLabel(item.category)}</span></td>
        <td>
          <div class="iv-qty-bar-wrap">
            <div class="iv-qty-bar"><div class="iv-qty-fill ${level}" style="width:${pct}%"></div></div>
            <div class="iv-qty-text">${item.quantity_remaining} / ${item.quantity_total} ${item.unit} (${pct}%)</div>
          </div>
        </td>
        <td style="color:var(--iv-text-2);font-size:13px">${item.reorder_threshold} ${item.unit}</td>
        <td style="color:var(--iv-text-2);font-size:13px">${item.expiry_date ? formatDate(item.expiry_date) : '—'}</td>
        <td><span class="iv-status-badge ${status.cls}">${status.label}</span></td>
        <td>
          <div class="iv-action-btns">
            <button class="iv-btn-icon" title="แก้ไข / เติมสต็อก" onclick="openEditModal(${item.item_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="iv-btn-icon danger" title="ลบรายการ" onclick="deleteItem(${item.item_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getItemStatus(item) {
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 30);
  const pct   = item.quantity_remaining / item.quantity_total;
  if (item.quantity_remaining <= item.reorder_threshold) return { cls: 'danger', label: '⚠ สต็อกต่ำ' };
  if (item.expiry_date && new Date(item.expiry_date) <= soon) return { cls: 'expiring', label: '⏰ ใกล้หมดอายุ' };
  if (pct <= 0.4) return { cls: 'low', label: 'สต็อกน้อย' };
  return { cls: 'good', label: 'ปกติ' };
}

function getFiltered() {
  return INVENTORY.filter(item => {
    const matchCat = currentFilter === 'all' || item.category === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.category.includes(q);
    return matchCat && matchSearch;
  });
}

function filterItems(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.iv-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchItems(q) {
  currentSearch = q;
  renderTable();
}

/* ══════════════════════════════════════════
   ADD / EDIT MODAL
══════════════════════════════════════════ */
function openAddModal() {
  editingId = null;
  document.getElementById('modal-inv-title').textContent = 'เพิ่มรายการใหม่';
  clearForm();
  openModal('modal-inv');
}

function openEditModal(id) {
  editingId = id;
  const item = INVENTORY.find(i => i.item_id === id);
  if (!item) return;

  document.getElementById('modal-inv-title').textContent = 'แก้ไข / เติมสต็อก';
  document.getElementById('iv-name').value      = item.name;
  document.getElementById('iv-category').value  = item.category;
  document.getElementById('iv-unit').value       = item.unit;
  document.getElementById('iv-qty-rem').value    = item.quantity_remaining;
  document.getElementById('iv-qty-total').value  = item.quantity_total;
  document.getElementById('iv-threshold').value  = item.reorder_threshold;
  document.getElementById('iv-expiry').value     = item.expiry_date || '';

  openModal('modal-inv');
}

function saveInventory() {
  const name      = document.getElementById('iv-name').value.trim();
  const category  = document.getElementById('iv-category').value;
  const unit      = document.getElementById('iv-unit').value.trim();
  const qtyRem    = parseFloat(document.getElementById('iv-qty-rem').value);
  const qtyTotal  = parseFloat(document.getElementById('iv-qty-total').value);
  const threshold = parseFloat(document.getElementById('iv-threshold').value);
  const expiry    = document.getElementById('iv-expiry').value || null;

  if (!name || !unit || isNaN(qtyRem) || isNaN(qtyTotal)) {
    showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'warn');
    return;
  }

  if (editingId) {
    // UPDATE
    const idx = INVENTORY.findIndex(i => i.item_id === editingId);
    if (idx !== -1) {
      Object.assign(INVENTORY[idx], { name, category, unit, quantity_remaining: qtyRem, quantity_total: qtyTotal, reorder_threshold: threshold, expiry_date: expiry });
    }
    // TODO: PATCH /api/inventory/{item_id}
    // await window.API.inventory.update(editingId, { quantity_remaining: qtyRem, expiry_date: expiry });
    showToast(`✅ อัปเดต ${name} สำเร็จ!`);
  } else {
    // CREATE
    const newItem = {
      item_id: INVENTORY.length + 1,
      name, category, unit,
      quantity_remaining: qtyRem, quantity_total: qtyTotal,
      reorder_threshold: threshold, expiry_date: expiry,
      icon: { food: '🌾', supplies: '📦', medicine: '💊' }[category],
    };
    INVENTORY.unshift(newItem);
    // TODO: POST /api/inventory
    // await window.API.inventory.create(newItem);
    showToast(`✅ เพิ่ม ${name} สำเร็จ!`);
  }

  renderAlerts();
  renderStats();
  renderTable();
  closeModal('modal-inv');
}

async function deleteItem(id) {
  const item = INVENTORY.find(i => i.item_id === id);
  if (!item || !confirm(`ยืนยันลบ "${item.name}"?`)) return;

  const idx = INVENTORY.findIndex(i => i.item_id === id);
  INVENTORY.splice(idx, 1);

  // TODO: DELETE /api/inventory/{item_id}
  // await window.API.inventory.delete(id);

  renderAlerts();
  renderStats();
  renderTable();
  showToast(`🗑️ ลบ ${item.name} แล้ว`, 'warn');
}

function clearForm() {
  ['iv-name','iv-unit','iv-qty-rem','iv-qty-total','iv-threshold','iv-expiry']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const cat = document.getElementById('iv-category');
  if (cat) cat.value = 'food';
}

/* ── MODAL HELPERS ── */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function bindModalBackdrops() {
  document.querySelectorAll('.iv-modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
}
function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.iv-modal-overlay.open').forEach(m => m.classList.remove('open'));
  });
}

/* ── TOAST ── */
function showToast(msg, type = 'success') {
  document.getElementById('iv-toast')?.remove();
  const c = type === 'warn'
    ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
    : { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
  const t = document.createElement('div');
  t.id = 'iv-toast';
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${c.bg};color:${c.color};border:1.5px solid ${c.border};padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;max-width:380px;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ── UTILS ── */
function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
function catLabel(c) {
  return { food: '🌾 อาหาร', supplies: '📦 อุปกรณ์', medicine: '💊 ยา' }[c] ?? c;
}
