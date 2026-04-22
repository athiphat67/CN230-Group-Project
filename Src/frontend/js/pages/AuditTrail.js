/**
 * AuditTrail.js — Page logic for Audit Trail (FR1.11)
 * Purrfect Stay Admin Panel
 * เข้าถึงได้เฉพาะ ADMIN / OWNER เท่านั้น
 */

/* ── MOCK DATA ── */
const AUDIT_LOGS = [
  { audit_id: 1,  staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'CREATE',   table_affected: 'Booking',     record_id: 'BK-0001', description: 'สร้างการจองใหม่ สำหรับ น้องมะม่วง ห้อง A01',          timestamp: '2026-04-21T09:05:00' },
  { audit_id: 2,  staff_id: 3, staff_name: 'นริน พรหมดี',   action_type: 'CHECKIN',  table_affected: 'Booking',     record_id: 'BK-0001', description: 'Check-in น้องมะม่วง เข้าห้อง A01',                     timestamp: '2026-04-21T09:15:00' },
  { audit_id: 3,  staff_id: 2, staff_name: 'มาลี สุขสันต์', action_type: 'CREATE',   table_affected: 'CareReport',  record_id: 'RPT-001', description: 'บันทึกรายงานดูแลรายวัน น้องมะม่วง — อารมณ์: HAPPY',    timestamp: '2026-04-21T10:30:00' },
  { audit_id: 4,  staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'APPROVE',  table_affected: 'Leave',       record_id: 'LV-004',  description: 'อนุมัติคำขอลา ปอร์น ใจดี วันที่ 5-6 เม.ย.',           timestamp: '2026-04-21T11:00:00' },
  { audit_id: 5,  staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'DELETE',   table_affected: 'Invoice',     record_id: 'INV-0023',description: 'ลบ Invoice #INV-0023 ของการจอง BK-0004 (ยกเลิก)',     timestamp: '2026-04-21T14:30:00' },
  { audit_id: 6,  staff_id: 3, staff_name: 'นริน พรหมดี',   action_type: 'CHECKOUT', table_affected: 'Booking',     record_id: 'BK-0004', description: 'Check-out น้องซาชิ ออกห้อง B02',                       timestamp: '2026-04-21T12:10:00' },
  { audit_id: 7,  staff_id: 2, staff_name: 'มาลี สุขสันต์', action_type: 'UPDATE',   table_affected: 'Staff',       record_id: 'STF-005', description: 'แก้ไขข้อมูลพนักงาน — เปลี่ยนเบอร์โทร ปัทมา ดอกไม้', timestamp: '2026-04-20T15:20:00' },
  { audit_id: 8,  staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'CREATE',   table_affected: 'Staff',       record_id: 'STF-010', description: 'เพิ่มพนักงานใหม่: กฤต ทองดี (STAFF)',                  timestamp: '2026-04-20T09:00:00' },
  { audit_id: 9,  staff_id: 3, staff_name: 'นริน พรหมดี',   action_type: 'CHECKIN',  table_affected: 'Booking',     record_id: 'BK-0006', description: 'Check-in น้องทาโร่ เข้าห้อง B04',                      timestamp: '2026-04-19T10:00:00' },
  { audit_id: 10, staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'UPDATE',   table_affected: 'Inventory',   record_id: 'INV-003', description: 'อัปเดตสต็อก Cat Litter เพิ่ม 20 ลิตร',                 timestamp: '2026-04-19T08:30:00' },
  { audit_id: 11, staff_id: 2, staff_name: 'มาลี สุขสันต์', action_type: 'CREATE',   table_affected: 'Booking',     record_id: 'BK-0009', description: 'สร้างการจองใหม่ สำหรับ น้องพีช ห้อง C02',              timestamp: '2026-04-18T14:00:00' },
  { audit_id: 12, staff_id: 1, staff_name: 'สมชาย มั่นคง', action_type: 'APPROVE',  table_affected: 'Leave',       record_id: 'LV-002',  description: 'อนุมัติคำขอลาพักร้อน กฤต ทองดี 1-5 พ.ค.',             timestamp: '2026-04-18T11:30:00' },
];

/* ── STATE ── */
let filteredLogs = [...AUDIT_LOGS];
let currentPage  = 1;
const PAGE_SIZE  = 10;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // TODO: เชื่อม API จริง — uncomment
  // const res = await window.API.audit.getAll();
  // if (res.ok) { AUDIT_LOGS.length = 0; res.data.forEach(l => AUDIT_LOGS.push(l)); }

  applyFilters();
  renderStats();
});

/* ── STATS ── */
function renderStats() {
  document.getElementById('stat-total').textContent    = AUDIT_LOGS.length;
  document.getElementById('stat-create').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'CREATE').length;
  document.getElementById('stat-update').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'UPDATE').length;
  document.getElementById('stat-delete').textContent   = AUDIT_LOGS.filter(l => l.action_type === 'DELETE').length;
  document.getElementById('stat-checkin').textContent  = AUDIT_LOGS.filter(l => l.action_type === 'CHECKIN' || l.action_type === 'CHECKOUT').length;
}

/* ── FILTERS ── */
async function applyFilters() {
  const staff  = document.getElementById('filter-staff').value;
  const action = document.getElementById('filter-action').value;
  const from   = document.getElementById('filter-from').value;
  const to     = document.getElementById('filter-to').value;
  const q      = document.getElementById('filter-search').value.toLowerCase();

  // 🟢 1. ดึงข้อมูลจาก API แทน Mock Data
  const params = {};
  if (staff) params.staff_id = staff;
  if (action) params.action_type = action;
  if (from) params.start_date = from;
  if (to) params.end_date = to;

  const res = await window.API.audit.getAll(params);
  
  if (res.ok) {
    // 🟢 2. เอาข้อมูลจาก DB มาเก็บไว้เพื่อใช้กรองคำค้นหา (Search Text) ต่อ
    AUDIT_LOGS = res.data.data || []; 
  } else {
    AUDIT_LOGS = [];
    console.error("โหลด Audit Log ไม่สำเร็จ");
  }

  // 🟢 3. กรองด้วย Search Text ฝั่ง Client-side (ค้นหาจากคำอธิบาย / ชื่อคน)
  filteredLogs = AUDIT_LOGS.filter(log => {
    if (q && !log.staff_name.toLowerCase().includes(q) &&
             !log.description.toLowerCase().includes(q) &&
             !log.record_id.toLowerCase().includes(q))  return false;
    return true;
  });

  currentPage = 1;
  renderTable();
  renderStats(); // อัปเดตตัวเลขสถิติบนการ์ดด้านบนด้วย
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // เมื่อเปิดหน้ามาปุ๊บ ให้ดึงข้อมูลทั้งหมดก่อน
  await applyFilters();
});

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
    const initial = log.staff_name.charAt(0);
    return `
      <tr>
        <td style="color:var(--at-text-3);font-size:12px;font-family:monospace">#${log.audit_id}</td>
        <td>
          <div class="at-staff-cell">
            <div class="at-staff-av">${initial}</div>
            <div>
              <div class="at-staff-name">${log.staff_name}</div>
              <div class="at-staff-id">ID ${log.staff_id}</div>
            </div>
          </div>
        </td>
        <td><span class="at-action-badge ${log.action_type}">${actionLabel(log.action_type)}</span></td>
        <td><span class="at-table-chip">${log.table_affected}</span></td>
        <td style="color:var(--at-text-2);font-size:12px;font-family:monospace">${log.record_id}</td>
        <td><div class="at-desc" title="${log.description}">${log.description}</div></td>
        <td><div class="at-time">${formatDateTime(log.timestamp)}</div></td>
      </tr>
    `;
  }).join('');

  renderPager(Math.ceil(filteredLogs.length / PAGE_SIZE));
}

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
  return { CREATE: '➕ CREATE', UPDATE: '✏️ UPDATE', DELETE: '🗑 DELETE', CHECKIN: '🟢 CHECK-IN', CHECKOUT: '🟣 CHECK-OUT', APPROVE: '✅ APPROVE' }[a] ?? a;
}

function formatDateTime(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
