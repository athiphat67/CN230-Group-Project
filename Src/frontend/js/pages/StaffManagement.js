/**
 * StaffManagement.js — Page logic for Staff Management
 * Purrfect Stay Admin Panel
 */

/* ── UTILS: Safe DOM Updater ── */
let currentStaffQuery = '';

function setVal(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/* ── TAB SWITCHING ── */
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (btn) btn.classList.add('active');
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');

  const tools = document.querySelector('.tabs-tools');
  if (tools) {
    tools.style.visibility = (tabName === 'staff') ? 'visible' : 'hidden';
  }
  
  if(tabName === 'staff') document.querySelectorAll('#staff-tbody tr').forEach(r => r.style.display = '');
  if(tabName === 'leave') document.querySelectorAll('#tab-leave tbody tr').forEach(r => r.style.display = '');
  if(tabName === 'attendance') document.querySelectorAll('#tab-attendance tbody tr').forEach(r => r.style.display = '');
}

/* ── MODAL CONTROL ── */
function openModal() {
  const overlay = document.getElementById('modal-add');
  if (!overlay) return;

  document.getElementById('current-staff-id').value = '';
  overlay.querySelector('.modal-title').textContent = 'Add New Staff';
  
  const inputs = overlay.querySelectorAll('.form-input');
  inputs.forEach(input => {
    input.value = '';
    input.disabled = false; 
  });

  overlay.classList.add('open');
  const first = overlay.querySelector('input, select');
  if (first) setTimeout(() => first.focus(), 50);
}

function closeModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) overlay.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

function openEditModal(id, firstName, lastName, role, email, phone) {
  const overlay = document.getElementById('modal-add');
  if (!overlay) return;

  document.getElementById('current-staff-id').value = id;
  overlay.querySelector('.modal-title').textContent = 'Edit Staff';

  const inputs = overlay.querySelectorAll('.form-input');
  const select = overlay.querySelector('.form-select');
  
  inputs[0].value = firstName || '';
  inputs[1].value = lastName || '';
  inputs[2].value = 'ไม่สามารถแก้ Username ได้';
  inputs[2].disabled = true; 
  inputs[3].value = email || '';
  inputs[4].value = phone || '';
  inputs[5].disabled = true; 
  inputs[6].value = '********';
  inputs[6].disabled = true;

  if (select) select.value = role;

  overlay.classList.add('open');
}

/* ── STAFF LIST FILTER ── */
function filterStaff(query) {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;
  currentStaffQuery = query.toLowerCase().trim();
  window.Pagination?.reset('staff-list');
  paginateTableRows(tbody, 'staff-list', 10, row => {
    const name  = row.querySelector('.staff-name')?.textContent.toLowerCase() ?? '';
    const email = row.querySelector('.staff-email')?.textContent.toLowerCase() ?? '';
    return !currentStaffQuery || name.includes(currentStaffQuery) || email.includes(currentStaffQuery);
  });
}

/* ── RENDER STAFF TABLE ── */
async function loadAndRenderStaff() {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  if (!window.API || !window.API.staff) {
    console.error("API ยังไม่พร้อมใช้งาน ตรวจสอบว่าไฟล์ api.js โหลดสำเร็จหรือไม่");
    return;
  }

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-3);">กำลังโหลดข้อมูล...</td></tr>';

  const response = await window.API.staff.getAll();
  
  if (!response.ok) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const staffList = response.data.data || [];
  
  const total = staffList.length;
  const admins = staffList.filter(s => s.role === 'ADMIN').length;
  const staffs = total - admins;
  const onDuty = staffList.filter(s => s.is_on_duty).length;

  setVal('stat-total-staff', total);
  setVal('stat-sub-staff', `${admins} Admin · ${staffs} Staff`);
  setVal('stat-on-duty', onDuty);
  setVal('stat-sub-on-duty', `${total - onDuty} offline today`);
  setVal('tab-count-staff', total);

  tbody.innerHTML = ''; 

  staffList.forEach(staff => {
    const colors = ['blue', 'purple', 'teal', 'rose', 'amber', 'slate'];
    const color = colors[staff.staff_id % colors.length];
    const initial = staff.first_name ? staff.first_name.charAt(0) : '?';
    
    const isOnline = staff.is_on_duty;
    const statusBadge = isOnline 
      ? `<span class="badge online"><span class="badge-dot" style="background:#10b981"></span>Online</span>`
      : `<span class="badge offline"><span class="badge-dot" style="background:#64748b"></span>Offline</span>`;

    const hireDate = staff.hire_date ? new Date(staff.hire_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="staff-cell">
          <div class="avatar ${color}">${initial}</div>
          <div>
            <div class="staff-name">${staff.first_name} ${staff.last_name || ''}</div>
            <div class="staff-email">${staff.staff_email || '-'}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${staff.role.toLowerCase()}">${staff.role}</span></td>
      <td>${statusBadge}</td>
      <td style="color:var(--text-2)">${staff.phone_number || '-'}</td>
      <td style="color:var(--text-2)">${hireDate}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Edit" onclick="openEditModal(${staff.staff_id}, '${staff.first_name}', '${staff.last_name}', '${staff.role}', '${staff.staff_email}', '${staff.phone_number || ''}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn-icon danger" title="Deactivate" onclick="deactivateStaff(${staff.staff_id})">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  paginateTableRows(tbody, 'staff-list', 10, row => {
    const name  = row.querySelector('.staff-name')?.textContent.toLowerCase() ?? '';
    const email = row.querySelector('.staff-email')?.textContent.toLowerCase() ?? '';
    return !currentStaffQuery || name.includes(currentStaffQuery) || email.includes(currentStaffQuery);
  });
}

/* ── SAVE STAFF (Unified Create & Update) ── */
async function saveStaff() {
  const staffId = document.getElementById('current-staff-id').value;
  const modal = document.getElementById('modal-add');
  const inputs = modal.querySelectorAll('.form-input');
  const select = modal.querySelector('.form-select');

  const staffData = {
    first_name: inputs[0].value,
    last_name: inputs[1].value,
    staff_username: inputs[2].value,
    staff_email: inputs[3].value,
    phone_number: inputs[4].value,
    hire_date: inputs[5].value || new Date().toISOString().split('T')[0],
    password: inputs[6].value,
    role: select.value
  };

  let response;

  if (staffId) {
    const updateData = {
      first_name: staffData.first_name,
      last_name: staffData.last_name,
      role: staffData.role,
      staff_email: staffData.staff_email,
      phone_number: staffData.phone_number
    };
    response = await window.API.staff.update(staffId, updateData);
  } else {
    if (!staffData.staff_username || !staffData.password || !staffData.first_name) {
      alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, Username, Password)");
      return;
    }
    response = await window.API.staff.create(staffData);
  }

  if (response.ok) {
    alert("บันทึกข้อมูลสำเร็จ");
    closeModal();
    loadAndRenderStaff(); 
  } else {
    alert("เกิดข้อผิดพลาด: " + (response.data?.message || 'ไม่ทราบสาเหตุ'));
  }
}

/* ── DEACTIVATE STAFF ── */
async function deactivateStaff(id) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการระงับการใช้งานพนักงานคนนี้?")) return;
  const response = await window.API.staff.deactivate(id);
  if (response.ok) {
    alert("ปิดการใช้งานพนักงานเรียบร้อยแล้ว");
    loadAndRenderStaff(); 
  } else {
    alert("เกิดข้อผิดพลาด: " + (response.data?.message || 'ไม่ทราบสาเหตุ'));
  }
}

/* ── ATTENDANCE ── */
async function loadAndRenderAttendance() {
  const tbody = document.querySelector('#tab-attendance tbody');
  if (!tbody) return;

  if (!window.API || !window.API.attendance) return;

  const dateInputs = document.querySelectorAll('.att-toolbar .date-input');
  const fromDate = dateInputs[0]?.value;
  const toDate = dateInputs[1]?.value;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';

  const response = await window.API.attendance.getAll({ start_date: fromDate, end_date: toDate });
  
  if (!response.ok) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const records = response.data.data || [];
  const absentCount = records.filter(r => r.status && r.status.toUpperCase() === 'ABSENT').length;
  
  setVal('stat-absent', absentCount);
  setVal('tab-count-att', records.length);

  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-3);">ไม่พบข้อมูลการลงเวลาในวันที่เลือก</td></tr>';
    return;
  }

  records.forEach(rec => {
    const initial = rec.first_name ? rec.first_name.charAt(0) : '?';
    let badgeClass = 'ontime';
    let statusText = 'On Time';
    if (rec.status.toLowerCase() === 'late') { badgeClass = 'late'; statusText = 'Late'; }
    else if (rec.status.toLowerCase() === 'absent') { badgeClass = 'absent'; statusText = 'Absent'; }

    const workDate = new Date(rec.work_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="staff-cell">
          <div class="avatar teal">${initial}</div>
          <div><div class="staff-name">${rec.first_name} ${rec.last_name || ''}</div></div>
        </div>
      </td>
      <td style="color:var(--text-2)">${workDate}</td>
      <td style="color:var(--text-2)">${rec.clock_in || '—'}</td>
      <td style="color:var(--text-2)">${rec.clock_out || '—'}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      <td style="color:var(--text-3)">${rec.note || '—'}</td>
    `;
    tbody.appendChild(tr);
  });
  paginateTableRows(tbody, 'attendance-list', 10);
}

/* ── LEAVE REQUESTS ── */
async function loadAndRenderLeave() {
  const tbody = document.querySelector('#tab-leave tbody');
  if (!tbody) return;

  if (!window.API || !window.API.leave) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';
  const response = await window.API.leave.getAll();
  
  if (!response.ok) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const records = response.data.data || [];
  tbody.innerHTML = '';
  
  const pendingCount = records.filter(r => r.status === 'PENDING').length;
  setVal('leave-count', pendingCount);
  setVal('stat-leave-pending', pendingCount);

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-3);">ไม่มีรายการคำขอลา</td></tr>';
    return;
  }

  records.forEach(rec => {
    const initial = rec.first_name ? rec.first_name.charAt(0) : '?';
    let badgeClass = 'pending';
    let statusText = 'Pending';
    if (rec.status === 'APPROVED') { badgeClass = 'approved'; statusText = 'Approved'; }
    if (rec.status === 'REJECTED') { badgeClass = 'rejected'; statusText = 'Rejected'; }

    const startDate = new Date(rec.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const endDate = new Date(rec.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    
    let leaveTypeTh = rec.leave_type;
    if(rec.leave_type === 'SICK_LEAVE') leaveTypeTh = 'ลาป่วย';
    if(rec.leave_type === 'PERSONAL_LEAVE') leaveTypeTh = 'ลากิจ';
    if(rec.leave_type === 'ANNUAL_LEAVE') leaveTypeTh = 'ลาพักร้อน';

    let actionHTML = `<td style="color:var(--text-3)">${rec.approver_name || '-'}</td>`;
    if (rec.status === 'PENDING') {
      actionHTML = `
        <td><div class="action-btns">
          <button class="btn-primary" style="padding:5px 12px;font-size:12px;box-shadow:none" onclick="handleLeaveAction(${rec.leave_id}, 'APPROVED')">Approve</button>
          <button class="btn-cancel" style="padding:5px 12px;font-size:12px" onclick="handleLeaveAction(${rec.leave_id}, 'REJECTED')">Reject</button>
        </div></td>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="staff-cell">
          <div class="avatar purple">${initial}</div>
          <div><div class="staff-name">${rec.first_name} ${rec.last_name || ''}</div></div>
        </div>
      </td>
      <td style="color:var(--text-2)">${leaveTypeTh}</td>
      <td style="color:var(--text-2)">${startDate} – ${endDate}</td>
      <td style="color:var(--text-2)">${rec.reason || '-'}</td>
      <td><span class="badge ${badgeClass}">${statusText}</span></td>
      ${actionHTML}
    `;
    tbody.appendChild(tr);
  });
  paginateTableRows(tbody, 'leave-list', 10);
}

function paginateTableRows(tbody, key, pageSize, predicate = () => true) {
  if (!tbody || !window.Pagination) return;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const matchingRows = rows.filter(predicate);
  const page = Pagination.paginate(matchingRows, { key, pageSize });

  rows.forEach(row => { row.style.display = 'none'; });
  page.pageItems.forEach(row => { row.style.display = ''; });

  const anchor = tbody.closest('.table-container') || tbody.closest('.tab-content') || tbody.parentElement;
  Pagination.render(page, {
    key,
    containerEl: ensureStaffPager(anchor, `${key}-pager`),
    label: 'รายการ',
    onChange: () => paginateTableRows(tbody, key, pageSize, predicate),
  });
}

function ensureStaffPager(anchor, id) {
  let pager = document.getElementById(id);
  if (!pager) {
    pager = document.createElement('div');
    pager.id = id;
    pager.className = 'pg-pagination';
    pager.style.marginTop = '12px';
    anchor?.appendChild(pager);
  }
  return pager;
}

async function handleLeaveAction(leaveId, newStatus) {
  if (!confirm(`คุณต้องการ ${newStatus} คำขอลานี้ใช่หรือไม่?`)) return;
  const approvedByAdminId = 1; 
  const response = await window.API.leave.approve(leaveId, approvedByAdminId, newStatus);
  if (response.ok) {
    alert("อัปเดตสถานะการลาสำเร็จ");
    loadAndRenderLeave(); 
  } else {
    alert("เกิดข้อผิดพลาด: " + (response.data?.message || ''));
  }
}

/* ── STAT CARD CLICK HANDLER ── */
function clickStatCard(type) {
  const triggerTab = (tabName) => {
     const btn = document.querySelector(`.tab-btn[onclick*="'${tabName}'"]`);
     if (btn) switchTab(tabName, btn);
  };

  if (type === 'total') {
    triggerTab('staff');
    document.querySelectorAll('#staff-tbody tr').forEach(r => r.style.display = '');
  } 
  else if (type === 'onduty') {
    triggerTab('staff');
    document.querySelectorAll('#staff-tbody tr').forEach(r => {
      const isOnline = r.querySelector('.badge.online');
      r.style.display = isOnline ? '' : 'none';
    });
  } 
  else if (type === 'leave') {
    triggerTab('leave');
    document.querySelectorAll('#tab-leave tbody tr').forEach(r => {
      const isPending = r.querySelector('.badge.pending');
      r.style.display = isPending ? '' : 'none';
    });
  } 
  else if (type === 'absent') {
    triggerTab('attendance');
    document.querySelectorAll('#tab-attendance tbody tr').forEach(r => {
      const isAbsent = r.querySelector('.badge.absent');
      r.style.display = isAbsent ? '' : 'none';
    });
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  loadAndRenderStaff();
  loadAndRenderLeave();
  
  const searchBtn = document.getElementById('btn-search-attendance');
  if (searchBtn) {
    searchBtn.addEventListener('click', loadAndRenderAttendance);
  }
});
