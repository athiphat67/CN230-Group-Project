/**
 * StaffManagement.js — Page logic for Staff Management
 * Purrfect Stay Admin Panel
 *
 * Handles: tab switching · modal open/close · staff filtering · leave approval
 */

/* ── TAB SWITCHING ── */
function switchTab(tabName, btn) {
  // Deactivate all tabs and buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  // Activate selected
  btn.classList.add('active');
  const target = document.getElementById('tab-' + tabName);
  if (target) target.classList.add('active');

  // Show/hide search+filter tools (only relevant for staff list)
  const tools = document.querySelector('.tabs-tools');
  if (tools) {
    tools.style.visibility = (tabName === 'staff') ? 'visible' : 'hidden';
  }
  
  if(tabName === 'staff') document.querySelectorAll('#staff-tbody tr').forEach(r => r.style.display = '');
  if(tabName === 'leave') document.querySelectorAll('#tab-leave tbody tr').forEach(r => r.style.display = '');
  if(tabName === 'attendance') document.querySelectorAll('#tab-attendance tbody tr').forEach(r => r.style.display = '');
}

/* ── MODAL: Add New Staff ── */
function openModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    // 🟢 เคลียร์ค่า ID และรีเซ็ตฟอร์ม เผื่อว่าเพิ่งกดปิดโหมด Edit มา
    document.getElementById('current-staff-id').value = '';
    overlay.querySelector('.modal-title').textContent = 'Add New Staff';
    
    // ปลดล็อกช่อง Username และ Password ให้กรอกได้
    const inputs = overlay.querySelectorAll('.form-input');
    inputs.forEach(input => {
      input.value = '';
      input.disabled = false; 
    });

    overlay.classList.add('open');
    const first = overlay.querySelector('input, select');
    if (first) setTimeout(() => first.focus(), 50);
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) overlay.classList.remove('open');
}

// Close modal on overlay background click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/* ── MODAL: Edit Staff ── */
// 🟢 เพิ่มพารามิเตอร์ id เข้ามาด้วย
function openEditModal(id, firstName, lastName, role, email, phone) {
  const overlay = document.getElementById('modal-add');
  if (!overlay) return;

  // 🟢 เก็บ ID ไว้ใน input ที่ซ่อนไว้
  document.getElementById('current-staff-id').value = id;
  overlay.querySelector('.modal-title').textContent = 'Edit Staff';

  const inputs = overlay.querySelectorAll('.form-input');
  const select = overlay.querySelector('.form-select');
  
  // 🟢 อิงตามลำดับ input ที่อยู่ใน HTML
  inputs[0].value = firstName;
  inputs[1].value = lastName;
  inputs[2].value = 'ไม่สามารถแก้ Username ได้'; // สมมติ inputs[2] คือ Username
  inputs[2].disabled = true; // ล็อกไม่ให้แก้ Username
  inputs[3].value = email;
  inputs[4].value = phone;
  inputs[5].disabled = true; // ล็อกช่องวันที่เริ่มงาน
  inputs[6].disabled = true; // ล็อกช่อง Password
  inputs[6].value = '********';

  select.value = role;

  overlay.classList.add('open');
}

/* ── STAFF LIST FILTER ── */
function filterStaff(query) {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const q = query.toLowerCase().trim();

  rows.forEach(row => {
    const name  = row.querySelector('.staff-name')?.textContent.toLowerCase() ?? '';
    const email = row.querySelector('.staff-email')?.textContent.toLowerCase() ?? '';
    row.style.display = (!q || name.includes(q) || email.includes(q)) ? '' : 'none';
  });
}

/* ── LEAVE: Approve / Reject ── */
function approveLeave(btn) {
  const row = btn.closest('tr');
  if (!row) return;

  const statusCell = row.querySelector('.badge.pending');
  if (!statusCell) return;

  // Optimistic UI update — replace Pending badge with Approved
  statusCell.className = 'badge approved';
  statusCell.textContent = 'Approved';

  // Replace action buttons cell with approver name
  const actionCell = btn.closest('td');
  if (actionCell) actionCell.innerHTML = '<span style="color:var(--text-3)">สมชาย มั่นคง</span>';

  // Update leave count badge
  const leaveCountEl = document.getElementById('leave-count');
  if (leaveCountEl) {
    const current = parseInt(leaveCountEl.textContent, 10);
    if (!isNaN(current) && current > 0) leaveCountEl.textContent = current - 1;
  }

  // TODO: PATCH /api/leave/{leave_id} — replace with real API call from api.js
}

// ริชทำ -- เอาข้อมูล mock ออกแล้วเรียก API จริงแทน
/* ── RENDER STAFF TABLE ── */
/* ── RENDER STAFF TABLE ── */
async function loadAndRenderStaff() {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  const response = await window.staffAPI.getAllStaff();
  const currentUser = {
    name: localStorage.getItem('first_name') || 'ไม่ระบุตัวตน',
    role: localStorage.getItem('role') || 'STAFF',
  };

  Sidebar.render({ activePage: 'staff', user: currentUser });
  
  if (response.status !== 'success') {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const staffList = response.data.data || [];
  
  // 🟢 1. อัปเดตการ์ดสถิติพนักงาน
  const total = staffList.length;
  const admins = staffList.filter(s => s.role === 'ADMIN').length;
  const staffs = total - admins;
  const onDuty = staffList.filter(s => s.is_on_duty).length;

  document.getElementById('stat-total-staff').textContent = total;
  document.getElementById('stat-sub-staff').textContent = `${admins} Admin · ${staffs} Staff`;
  document.getElementById('stat-on-duty').textContent = onDuty;
  
  // 🟢 แก้ไข ID ให้ตรงกับใน HTML ตรงนี้ครับ
  document.getElementById('stat-sub-on-duty').textContent = `${total - onDuty} offline today`;
  document.getElementById('tab-count-staff').textContent = total;

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
            <div class="staff-name">${staff.first_name} ${staff.last_name}</div>
            <div class="staff-email">${staff.staff_email}</div>
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
}

// โหลดข้อมูลทันทีเมื่อหน้าเว็บพร้อม
document.addEventListener('DOMContentLoaded', loadAndRenderStaff);

/**
 * SUBMIT NEW STAFF
 * ริชทำ — ดึงข้อมูลจากฟอร์มใน Modal แล้วส่งไปยัง API จริง
 * 1. ดึงค่าจากช่อง Input ต่างๆ ใน Modal
 * 2. เรียกใช้ API เพื่อบันทึกข้อมูล
 * 3. ตรวจสอบผลลัพธ์ และรีเฟรชตารางพนักงานใหม่ทันที!
 */
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
    role: select.value,
    staff_email: inputs[3].value,
    phone_number: inputs[4].value,
    hire_date: inputs[5].value || new Date().toISOString().split('T')[0],
    password: inputs[6].value
  };

  let response;

  if (staffId) {
    // 🟢 ถ้ามี ID = โหมด Edit (Update)
    // ส่งไปเฉพาะค่าที่อัปเดตได้
    const updateData = {
      first_name: staffData.first_name,
      last_name: staffData.last_name,
      role: staffData.role,
      staff_email: staffData.staff_email,
      phone_number: staffData.phone_number
    };
    response = await window.API.staff.update(staffId, updateData);
  } else {
    // 🟢 ถ้าไม่มี ID = โหมด Add (Create)
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
    loadAndRenderStaff(); // โหลดตารางใหม่เพื่อให้พนักงานคนนี้หายไป (เพราะ query backend จับเฉพาะ "isActive"=TRUE)
  } else {
    alert("เกิดข้อผิดพลาด: " + (response.data?.message || 'ไม่ทราบสาเหตุ'));
  }
}

/* ── ATTENDANCE: Load and Render ── */
/* ── ATTENDANCE: Load and Render ── */
async function loadAndRenderAttendance() {
  const tbody = document.querySelector('#tab-attendance tbody');
  if (!tbody) return;

  // 🟢 ประกาศตัวแปรดึงวันที่จากหน้าเว็บ
  const dateInputs = document.querySelectorAll('.att-toolbar .date-input');
  const fromDate = dateInputs[0].value;
  const toDate = dateInputs[1].value;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';

  const response = await window.API.attendance.getAll({ start_date: fromDate, end_date: toDate });
  
  if (!response.ok) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const records = response.data.data || [];

  const absentCount = records.filter(r => r.status && r.status.toUpperCase() === 'ABSENT').length;
  const statAbsent = document.getElementById('stat-absent');
  if (statAbsent) statAbsent.textContent = absentCount;
  const tabCountAtt = document.getElementById('tab-count-att');
  if (tabCountAtt) tabCountAtt.textContent = records.length;

  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-3);">ไม่พบข้อมูลการลงเวลาในวันที่เลือก</td></tr>';
    return;
  }

  records.forEach(rec => {
    const initial = rec.first_name ? rec.first_name.charAt(0) : '?';
    
    let badgeClass = 'ontime';
    let statusText = 'On Time';
    if (rec.status.toLowerCase() === 'late') {
      badgeClass = 'late';
      statusText = 'Late';
    } else if (rec.status.toLowerCase() === 'absent') {
      badgeClass = 'absent';
      statusText = 'Absent';
    }

    const workDate = new Date(rec.work_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="staff-cell">
          <div class="avatar teal">${initial}</div>
          <div><div class="staff-name">${rec.first_name} ${rec.last_name}</div></div>
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
}

// ผูกฟังก์ชันเข้ากับปุ่ม "ค้นหา" ในแท็บ Attendance
document.addEventListener('DOMContentLoaded', () => {
  const searchBtn = document.querySelector('.att-toolbar .btn-primary');
  if (searchBtn) {
    searchBtn.addEventListener('click', loadAndRenderAttendance);
  }
});

/* ── LEAVE: Load and Render ── */
async function loadAndRenderLeave() {
  const tbody = document.querySelector('#tab-leave tbody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">กำลังโหลดข้อมูล...</td></tr>';

  // ดึงข้อมูลการลาทั้งหมด
  const response = await window.API.leave.getAll();
  
  if (!response.ok) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const records = response.data.data || [];
  tbody.innerHTML = '';
  
  // อัปเดตตัวเลขแจ้งเตือน (นับเฉพาะที่รออนุมัติ)
  const pendingCount = records.filter(r => r.status === 'PENDING').length;
  document.getElementById('leave-count').textContent = pendingCount; // บนแท็บ
  document.getElementById('stat-leave-pending').textContent = pendingCount; // บนการ์ดด้านบน

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-3);">ไม่มีรายการคำขอลา</td></tr>';
    return;
  }

  records.forEach(rec => {
    const initial = rec.first_name ? rec.first_name.charAt(0) : '?';
    
    // จัดการสีของ Badge
    let badgeClass = 'pending';
    let statusText = 'Pending';
    if (rec.status === 'APPROVED') { badgeClass = 'approved'; statusText = 'Approved'; }
    if (rec.status === 'REJECTED') { badgeClass = 'rejected'; statusText = 'Rejected'; }

    // วันที่ลา
    const startDate = new Date(rec.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const endDate = new Date(rec.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // แปลงประเภทการลา
    let leaveTypeTh = rec.leave_type;
    if(rec.leave_type === 'SICK_LEAVE') leaveTypeTh = 'ลาป่วย';
    if(rec.leave_type === 'PERSONAL_LEAVE') leaveTypeTh = 'ลากิจ';
    if(rec.leave_type === 'ANNUAL_LEAVE') leaveTypeTh = 'ลาพักร้อน';

    // จัดการส่วนปุ่ม Action (ถ้าอนุมัติแล้วให้โชว์ชื่อคนอนุมัติ)
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
          <div><div class="staff-name">${rec.first_name} ${rec.last_name}</div></div>
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
}

/* ── LEAVE: Approve or Reject Action ── */
async function handleLeaveAction(leaveId, newStatus) {
  if (!confirm(`คุณต้องการ ${newStatus} คำขอลานี้ใช่หรือไม่?`)) return;

  // สมมติว่า Admin ที่กดอนุมัติคือ ID: 1 (เดี๋ยวตอนทำ Login เสร็จต้องเปลี่ยนเป็นดึงจาก Token)
  const approvedByAdminId = 1; 

  const response = await window.API.leave.approve(leaveId, approvedByAdminId, newStatus);
  if (response.ok) {
    alert("อัปเดตสถานะการลาสำเร็จ");
    loadAndRenderLeave(); // โหลดตารางใหม่
  } else {
    alert("เกิดข้อผิดพลาด: " + (response.data?.message || ''));
  }
}

// 🟢 เพิ่ม event ให้ดึงข้อมูลเมื่อสลับแท็บ
document.addEventListener('DOMContentLoaded', () => {
  // ดึงข้อมูลเมื่อโหลดหน้าเว็บ
  loadAndRenderLeave(); 
});

/* ── STAT CARD CLICK HANDLER (กรองข้อมูลจากกล่องสถิติ) ── */
function clickStatCard(type) {
  // ฟังก์ชันช่วยสลับแท็บ
  const triggerTab = (tabName) => {
     const btn = document.querySelector(`.tab-btn[onclick*="'${tabName}'"]`);
     if (btn) switchTab(tabName, btn);
  };

  if (type === 'total') {
    triggerTab('staff');
    // โชว์ทุกคน (เคลียร์ฟิลเตอร์)
    document.querySelectorAll('#staff-tbody tr').forEach(r => r.style.display = '');
  } 
  else if (type === 'onduty') {
    triggerTab('staff');
    // กรองโชว์เฉพาะคนที่มี Badge Online
    document.querySelectorAll('#staff-tbody tr').forEach(r => {
      const isOnline = r.querySelector('.badge.online');
      r.style.display = isOnline ? '' : 'none';
    });
  } 
  else if (type === 'leave') {
    triggerTab('leave');
    // กรองโชว์เฉพาะรายการลาที่ยัง Pending
    document.querySelectorAll('#tab-leave tbody tr').forEach(r => {
      const isPending = r.querySelector('.badge.pending');
      r.style.display = isPending ? '' : 'none';
    });
  } 
  else if (type === 'absent') {
    triggerTab('attendance');
    // กรองโชว์เฉพาะคนที่สถานะ Absent
    document.querySelectorAll('#tab-attendance tbody tr').forEach(r => {
      const isAbsent = r.querySelector('.badge.absent');
      r.style.display = isAbsent ? '' : 'none';
    });
  }
}
