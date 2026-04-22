/**
 * Inventory.js — Page logic for Inventory Management (FR6)
 * Purrfect Stay Admin Panel
 *
 * เชื่อม API จริง: GET / POST /api/inventory  |  PATCH /api/inventory/{item_id}
 * หมายเหตุ: DELETE endpoint ยังไม่มีใน backend — ปุ่มลบถูก disable ไว้ก่อน
 */

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const API_BASE = window.__ENV__?.API_BASE ?? 'http://127.0.0.1:5000/api';

/* ══════════════════════════════════════════
   CATEGORY MAPPING
   DB เก็บ uppercase  →  frontend ใช้ lowercase
   ปรับ mapping นี้ให้ตรงกับค่าจริงใน DB
══════════════════════════════════════════ */
const CAT_TO_DISPLAY = {
  FOOD:      'food',
  MEDICINE:  'medicine',
  SUPPLIES:  'supplies',
  SUPPLY:    'supplies',
  TOY:       'supplies',
  SERVICE:   'medicine',
};
const CAT_TO_DB = {
  food:      'FOOD',
  medicine:  'MEDICINE',
  supplies:  'SUPPLIES',
};

function normCat(raw = '') {
  return CAT_TO_DISPLAY[raw.toUpperCase()] ?? raw.toLowerCase();
}
function dbCat(display = '') {
  return CAT_TO_DB[display] ?? display.toUpperCase();
}

/* ══════════════════════════════════════════
   AUTH  (token จาก localStorage / sessionStorage)
══════════════════════════════════════════ */
function getToken() {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || '';
}
function authHeaders() {
  const token = getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/* ══════════════════════════════════════════
   STATE
══════════════════════════════════════════ */
let INVENTORY     = [];   // populated จาก API
let currentFilter = 'all';
let currentSearch = '';
let editingId     = null;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  setLoadingState(true);
  await loadFromAPI();
  setLoadingState(false);
  bindModalBackdrops();
  bindEscapeKey();
});

function setLoadingState(loading) {
  const tbody = document.getElementById('inv-tbody');
  if (!tbody) return;
  if (loading) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:32px;color:var(--iv-text-2,#888)">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="animation:spin 1s linear infinite;display:inline-block">⏳</span>
          กำลังโหลดข้อมูล...
        </div>
      </td></tr>`;
  }
}

/* ══════════════════════════════════════════
   LOAD FROM API
══════════════════════════════════════════ */
async function loadFromAPI() {
  try {

    if (!getToken()) {
    showToast('🔒 กรุณาเข้าสู่ระบบก่อน', 'warn');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

    const [itemsRes, alertsRes] = await Promise.all([
      fetch(`${API_BASE}/inventory`,        { headers: authHeaders() }),
      fetch(`${API_BASE}/inventory/alerts`, { headers: authHeaders() }),
    ]);

    // ── Items ──
    if (!itemsRes.ok) {
      if (itemsRes.status === 401) {
        showToast('🔒 Session หมดอายุ กรุณาเข้าสู่ระบบใหม่', 'warn');
        return;
      }
      throw new Error(`GET /inventory → HTTP ${itemsRes.status}`);
    }
    const itemsJson = await itemsRes.json();
    INVENTORY = (itemsJson.data || []).map(normalizeItem);

    // ── Alerts (optional — ถ้า fail ก็ compute เองจาก INVENTORY) ──
    if (alertsRes.ok) {
      // API คำนวณให้แล้ว ไม่ต้องทำอะไรเพิ่ม
    }

    renderAlerts();
    renderStats();
    renderTable();
    updateTabCounts();

  } catch (err) {
    console.error('[Inventory] loadFromAPI error:', err);
    showToast('⚠️ โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'warn');
    // render empty state
    INVENTORY = [];
    renderAlerts();
    renderStats();
    renderTable();
    updateTabCounts();
  }
}

/**
 * Normalize API response → format ที่ frontend ใช้
 *
 * จุดสำคัญ:
 *  - `unit`           ไม่มีใน DB schema → ใช้ '' (ซ่อนใน UI)
 *  - `quantity_total` ไม่มีใน DB schema → estimate = reorder_threshold * 4
 *    (ใช้แค่คำนวณ % bar; ไม่ใช่ข้อมูล business จริง)
 *  - `stock_status`   API คำนวณมาให้แล้ว → ใช้ตรงๆ
 */
function normalizeItem(it) {
  const cat        = normCat(it.category || '');
  const qRem       = Number(it.quantity_remaining ?? 0);
  const qThreshold = Number(it.reorder_threshold  ?? 0);

  return {
    item_id:           it.item_id,
    name:              it.name || '(ไม่มีชื่อ)',
    category:          cat,
    unit:              it.unit        || '',        // DB ไม่มี field นี้
    quantity_remaining: qRem,
    quantity_total:    it.quantity_total            // ถ้า DB ส่งมา → ใช้เลย
                        ?? (qThreshold > 0 ? qThreshold * 4 : qRem * 2 || 1),
    reorder_threshold: qThreshold,
    expiry_date:       it.expiry_date  || null,
    unit_price:        Number(it.unit_price ?? 0),
    is_chargeable:     it.is_chargeable ?? true,
    stock_status:      it.stock_status  || 'IN_STOCK',
    low_stock:         it.low_stock     ?? (qRem <= qThreshold),
    near_expiry:       it.near_expiry   ?? false,
    icon: { food: '🌾', supplies: '📦', medicine: '💊' }[cat] || '📦',
  };
}

/* ══════════════════════════════════════════
   ALERTS & STATS
══════════════════════════════════════════ */
function getAlerts() {
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 30);
  return {
    lowStock:   INVENTORY.filter(i => i.low_stock),
    nearExpiry: INVENTORY.filter(i => i.near_expiry ||
      (i.expiry_date && new Date(i.expiry_date) <= soon && new Date(i.expiry_date) >= today)),
  };
}

function renderAlerts() {
  const { lowStock, nearExpiry } = getAlerts();
  const row = document.getElementById('alerts-row');
  if (!row) return;

  row.style.display = (lowStock.length + nearExpiry.length) === 0 ? 'none' : 'flex';

  const lowEl = document.getElementById('alert-low');
  if (lowStock.length > 0) {
    document.getElementById('alert-low-count').textContent = lowStock.length;
    document.getElementById('alert-low-items').textContent =
      lowStock.map(i => i.name).slice(0, 3).join(', ') + (lowStock.length > 3 ? '...' : '');
    if (lowEl) lowEl.style.display = '';
  } else {
    if (lowEl) lowEl.style.display = 'none';
  }

  const expEl = document.getElementById('alert-exp');
  if (nearExpiry.length > 0) {
    document.getElementById('alert-exp-count').textContent = nearExpiry.length;
    document.getElementById('alert-exp-items').textContent =
      nearExpiry.map(i => i.name).slice(0, 3).join(', ') + (nearExpiry.length > 3 ? '...' : '');
    if (expEl) expEl.style.display = '';
  } else {
    if (expEl) expEl.style.display = 'none';
  }
}

function renderStats() {
  const { lowStock, nearExpiry } = getAlerts();
  document.getElementById('stat-total').textContent    = INVENTORY.length;
  document.getElementById('stat-food').textContent     = INVENTORY.filter(i => i.category === 'food').length;
  document.getElementById('stat-low').textContent      = lowStock.length;
  document.getElementById('stat-expiring').textContent = nearExpiry.length;
}

function updateTabCounts() {
  document.getElementById('count-all')?.setAttribute('data-count', INVENTORY.length);
  document.getElementById('count-food')?.setAttribute('data-count', INVENTORY.filter(i=>i.category==='food').length);
  document.getElementById('count-supplies')?.setAttribute('data-count', INVENTORY.filter(i=>i.category==='supplies').length);
  document.getElementById('count-medicine')?.setAttribute('data-count', INVENTORY.filter(i=>i.category==='medicine').length);
  document.getElementById('count-all').textContent      = INVENTORY.length;
  document.getElementById('count-food').textContent     = INVENTORY.filter(i=>i.category==='food').length;
  document.getElementById('count-supplies').textContent = INVENTORY.filter(i=>i.category==='supplies').length;
  document.getElementById('count-medicine').textContent = INVENTORY.filter(i=>i.category==='medicine').length;
}

/* ══════════════════════════════════════════
   TABLE
══════════════════════════════════════════ */
function renderTable() {
  const tbody   = document.getElementById('inv-tbody');
  const emptyEl = document.getElementById('iv-empty');
  const showEl  = document.getElementById('iv-showing');
  if (!tbody) return;

  const filtered = getFiltered();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    if (showEl)  showEl.textContent = 'ไม่พบรายการ';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';
  if (showEl)  showEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(item => {
    const pct      = Math.min(100, Math.round((item.quantity_remaining / item.quantity_total) * 100));
    const barLevel = item.stock_status === 'OUT_OF_STOCK' ? 'danger'
                   : item.stock_status === 'LOW_STOCK'    ? 'low' : 'good';
    const status   = getItemStatus(item);
    const catIcon  = { food: '🌾', supplies: '📦', medicine: '💊' }[item.category] || '📦';
    const unitText = item.unit ? `หน่วย: ${item.unit}` : `฿${item.unit_price.toLocaleString()}`;

    // ⚠️ DELETE endpoint ยังไม่มีใน backend → ปุ่มลบ disabled พร้อม tooltip
    return `
      <tr>
        <td>
          <div class="iv-item-cell">
            <div class="iv-item-icon ${item.category}">${item.icon || catIcon}</div>
            <div>
              <div class="iv-item-name">${item.name}</div>
              <div class="iv-item-unit">${unitText}</div>
            </div>
          </div>
        </td>
        <td><span class="iv-cat-badge ${item.category}">${catLabel(item.category)}</span></td>
        <td>
          <div class="iv-qty-bar-wrap">
            <div class="iv-qty-bar">
              <div class="iv-qty-fill ${barLevel}" style="width:${pct}%"></div>
            </div>
            <div class="iv-qty-text">
              ${item.quantity_remaining}${item.unit ? ' ' + item.unit : ''} · ${pct}%
            </div>
          </div>
        </td>
        <td style="color:var(--iv-text-2,#888);font-size:13px">
          ${item.reorder_threshold}${item.unit ? ' ' + item.unit : ''}
        </td>
        <td style="color:var(--iv-text-2,#888);font-size:13px">
          ${item.expiry_date ? formatDate(item.expiry_date) : '—'}
        </td>
        <td><span class="iv-status-badge ${status.cls}">${status.label}</span></td>
        <td>
          <div class="iv-action-btns">
            <button class="iv-btn-icon" title="แก้ไข / เติมสต็อก"
              onclick="openEditModal(${item.item_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="iv-btn-icon danger" title="DELETE endpoint ยังไม่พร้อม"
              onclick="deleteItem(${item.item_id})" disabled style="opacity:.35;cursor:not-allowed">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getItemStatus(item) {
  // ใช้ stock_status จาก API ก่อน fallback compute เอง
  if (item.stock_status === 'OUT_OF_STOCK') return { cls: 'danger',   label: '🚫 หมดสต็อก' };
  if (item.stock_status === 'LOW_STOCK')    return { cls: 'danger',   label: '⚠ สต็อกต่ำ' };
  if (item.near_expiry)                     return { cls: 'expiring', label: '⏰ ใกล้หมดอายุ' };
  const pct = item.quantity_remaining / item.quantity_total;
  if (pct <= 0.4) return { cls: 'low', label: 'สต็อกน้อย' };
  return { cls: 'good', label: 'ปกติ' };
}

function getFiltered() {
  return INVENTORY.filter(item => {
    const matchCat    = currentFilter === 'all' || item.category === currentFilter;
    const q           = currentSearch.toLowerCase();
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
   ADD MODAL
══════════════════════════════════════════ */
function openAddModal() {
  editingId = null;
  document.getElementById('modal-inv-title').textContent = 'เพิ่มรายการใหม่';
  clearForm();
  openModal('modal-inv');
}

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
function openEditModal(id) {
  editingId = id;
  const item = INVENTORY.find(i => i.item_id === id);
  if (!item) return;

  document.getElementById('modal-inv-title').textContent = 'แก้ไข / เติมสต็อก';
  document.getElementById('iv-name').value      = item.name;
  document.getElementById('iv-category').value  = item.category;           // lowercase → <select> value
  document.getElementById('iv-unit').value       = item.unit || '';
  document.getElementById('iv-qty-rem').value    = item.quantity_remaining;
  document.getElementById('iv-qty-total').value  = item.quantity_total;
  document.getElementById('iv-threshold').value  = item.reorder_threshold;
  document.getElementById('iv-expiry').value     = item.expiry_date || '';

  openModal('modal-inv');
}

/* ══════════════════════════════════════════
   SAVE (CREATE / UPDATE)
══════════════════════════════════════════ */
async function saveInventory() {
  const name      = document.getElementById('iv-name').value.trim();
  const category  = document.getElementById('iv-category').value;   // lowercase
  const unit      = document.getElementById('iv-unit').value.trim();
  const qtyRem    = parseFloat(document.getElementById('iv-qty-rem').value);
  const qtyTotal  = parseFloat(document.getElementById('iv-qty-total').value);
  const threshold = parseFloat(document.getElementById('iv-threshold').value) || 0;
  const expiry    = document.getElementById('iv-expiry').value || null;

  if (!name || isNaN(qtyRem) || isNaN(qtyTotal)) {
    showToast('⚠️ กรุณากรอกชื่อสินค้าและปริมาณให้ครบ', 'warn');
    return;
  }

  const saveBtn = document.querySelector('#modal-inv .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'กำลังบันทึก...'; }

  try {
    if (editingId) {
      await patchItem(editingId, { name, category: dbCat(category), quantity_remaining: qtyRem,
                                   reorder_threshold: threshold, expiry_date: expiry });
      showToast(`✅ อัปเดต ${name} สำเร็จ!`);
    } else {
      await postItem({ name, category: dbCat(category), quantity_remaining: qtyRem,
                       reorder_threshold: threshold, expiry_date: expiry,
                       unit_price: 0, is_chargeable: true });
      showToast(`✅ เพิ่ม ${name} สำเร็จ!`);
    }
    closeModal('modal-inv');
    await loadFromAPI();   // re-fetch เพื่อให้ข้อมูล sync กับ DB
  } catch (err) {
    showToast('❌ บันทึกไม่สำเร็จ: ' + err.message, 'warn');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML =
      `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path d="M5 13l4 4L19 7"/></svg> บันทึก`; }
  }
}

/* ── POST /api/inventory ── */
async function postItem(payload) {
  const res = await fetch(`${API_BASE}/inventory`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── PATCH /api/inventory/{item_id} ── */
async function patchItem(id, payload) {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ══════════════════════════════════════════
   DELETE  (⚠️ endpoint ยังไม่มีใน backend)
   เปิดใช้เมื่อ Purich เพิ่ม DELETE /api/inventory/{item_id} แล้ว
══════════════════════════════════════════ */
async function deleteItem(id) {
  const item = INVENTORY.find(i => i.item_id === id);
  if (!item) return;

  // TODO: uncomment เมื่อ backend พร้อม
  // if (!confirm(`ยืนยันลบ "${item.name}"?`)) return;
  // try {
  //   const res = await fetch(`${API_BASE}/inventory/${id}`, {
  //     method: 'DELETE', headers: authHeaders(),
  //   });
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   showToast(`🗑️ ลบ ${item.name} แล้ว`, 'warn');
  //   await loadFromAPI();
  // } catch (err) {
  //   showToast('❌ ลบไม่สำเร็จ: ' + err.message, 'warn');
  // }

  showToast('⚠️ ฟีเจอร์ลบยังรอ DELETE endpoint จาก backend', 'warn');
}

/* ══════════════════════════════════════════
   FORM HELPERS
══════════════════════════════════════════ */
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
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${c.bg};
    color:${c.color};border:1.5px solid ${c.border};padding:12px 20px;border-radius:14px;
    font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;max-width:380px;`;
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