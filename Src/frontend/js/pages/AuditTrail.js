/**
 * AuditTrail.js — Page logic for Audit Trail (FR1.11)
 * Purrfect Stay Admin Panel
 * เข้าถึงได้เฉพาะ ADMIN / OWNER เท่านั้น
 */

/* ── STATE ── */
// เคลียร์ Mock Data ออก และเปลี่ยนเป็น let เพื่อให้รับค่าจาก API ได้
let AUDIT_LOGS   = [];
let filteredLogs = [];
let currentPage  = 1;
const PAGE_SIZE  = 10;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // เมื่อเปิดหน้ามาปุ๊บ ให้ดึงข้อมูลทั้งหมดจาก API ก่อน
  await applyFilters();
});

/* ── STATS ── */
function renderStats() {
  document.getElementById('stat-total').textContent    = AUDIT_LOGS.length;
  document.getElementById('stat-create').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'CREATE').length;
  document.getElementById('stat-update').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'UPDATE').length;
  document.getElementById('stat-delete').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'DELETE').length;
  document.getElementById('stat-checkin').textContent  = AUDIT_LOGS.filter(l => l.action_type === 'CHECKIN' || l.action_type === 'CHECKOUT').length;
}

/* ── FILTERS & API CALL ── */
async function applyFilters() {
  const staff  = document.getElementById('filter-staff').value;
  const action = document.getElementById('filter-action').value;
  const from   = document.getElementById('filter-from').value;
  const to     = document.getElementById('filter-to').value;
  const q      = document.getElementById('filter-search').value.toLowerCase();

  // 1. เตรียม Params สำหรับยิง API
  const params = {};
  if (staff)  params.staff_id = staff;
  if (action) params.action_type = action;
  if (from)   params.start_date = from;
  if (to)     params.end_date = to;

  try {
    // 2. ดึงข้อมูลจาก API จริง
    const res = await window.API.audit.getAll(params);
    
    if (res.ok) {
      // ตรวจสอบและดึงข้อมูล Array ออกมาให้ถูกต้อง
      const responseData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      AUDIT_LOGS = responseData;
    } else {
      AUDIT_LOGS = [];
      // 💡 ดึง Error จาก Flask (res.data.message) มาแสดง เพื่อให้รู้ข้อผิดพลาดที่แท้จริง
      const backendError = res.data?.message || res.message || "Unknown Error";
      console.error("❌ โหลด Audit Log ไม่สำเร็จ สาเหตุจาก Backend:", backendError);
    }
  } catch (error) {
    AUDIT_LOGS = [];
    console.error("เกิดข้อผิดพลาดในการดึงข้อมูล Audit Log:", error);
  }

  // 3. กรองด้วย Search Text ฝั่ง Client-side (ค้นหาจากคำอธิบาย / ชื่อคน / รหัสรายการ)
  filteredLogs = AUDIT_LOGS.filter(log => {
    // ป้องกันกรณีบางฟิลด์เป็น null แล้ว .toLowerCase() พัง
    const staffName = log.staff_name ? log.staff_name.toLowerCase() : '';
    const desc      = log.description ? log.description.toLowerCase() : '';
    const recordId  = log.record_id ? String(log.record_id).toLowerCase() : '';

    if (q && !staffName.includes(q) && !desc.includes(q) && !recordId.includes(q)) {
      return false;
    }
    return true;
  });

  currentPage = 1;
  renderTable();
  renderStats();
}

/* ── TABLE ── */
function renderTable() {
  const tbody   = document.getElementById('audit-tbody');
  const emptyEl = document.getElementById('at-empty');
  const countEl = document.getElementById('at-count');
  const showEl  = document.getElementById('at-showing');

  countEl.textContent = `${filteredLogs.length} รายการ`;

  const start  = (currentPage - 1) * PAGE_SIZE;
  const page   = filteredLogs.slice(start, start + PAGE_SIZE);

  if (filteredLogs.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showEl.textContent = 'ไม่พบรายการ';
    renderPager(0);
    return;
  }

  emptyEl.style.display = 'none';
  showEl.textContent = `แสดง ${start + 1}–${Math.min(start + PAGE_SIZE, filteredLogs.length)} จาก ${filteredLogs.length} รายการ`;

  tbody.innerHTML = page.map(log => {
    const initial = log.staff_name ? log.staff_name.charAt(0).toUpperCase() : '?';
    return `
      <tr>
        <td style="color:var(--at-text-3);font-size:12px;font-family:monospace">#${log.audit_id}</td>
        <td>
          <div class="at-staff-cell">
            <div class="at-staff-av">${initial}</div>
            <div>
              <div class="at-staff-name">${log.staff_name || 'ไม่ระบุตัวตน'}</div>
              <div class="at-staff-id">ID ${log.staff_id || '-'}</div>
            </div>
          </div>
        </td>
        <td><span class="at-action-badge ${log.action_type}">${actionLabel(log.action_type)}</span></td>
        <td><span class="at-table-chip">${log.table_affected || '-'}</span></td>
        <td style="color:var(--at-text-2);font-size:12px;font-family:monospace">${log.record_id || '-'}</td>
        <td><div class="at-desc" title="${log.description || ''}">${log.description || '-'}</div></td>
        <td><div class="at-time">${formatDateTime(log.timestamp)}</div></td>
      </tr>
    `;
  }).join('');

  renderPager(Math.ceil(filteredLogs.length / PAGE_SIZE));
}

/* ── PAGINATION ── */
function renderPager(totalPages) {
  const pager = document.getElementById('at-pager');
  if (!pager) return;

  let html = `<button class="at-page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="at-page-btn ${p === currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  html += `<button class="at-page-btn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">›</button>`;
  pager.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderTable();
}

/* ── UTILS ── */
function actionLabel(a) {
  if (!a) return '-';
  const mapping = {
    CREATE: '➕ CREATE',
    UPDATE: '✏️ UPDATE',
    DELETE: '🗑 DELETE',
    CHECKIN: '🟢 CHECK-IN',
    CHECKOUT: '🟣 CHECK-OUT',
    APPROVE: '✅ APPROVE'
  };
  return mapping[a.toUpperCase()] ?? a;
}

function formatDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}