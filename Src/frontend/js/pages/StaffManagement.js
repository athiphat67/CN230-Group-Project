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
}

/* ── MODAL: Add New Staff ── */
function openModal() {
  const overlay = document.getElementById('modal-add');
  if (overlay) {
    overlay.classList.add('open');
    // Focus first input for accessibility
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
function openEditModal(firstName, lastName, role, email, phone) {
  // Reuse the same modal — populate with existing values
  const overlay = document.getElementById('modal-add');
  if (!overlay) return;

  // Update modal title
  const title = overlay.querySelector('.modal-title');
  if (title) title.textContent = 'Edit Staff';

  // Populate fields
  const fields = overlay.querySelectorAll('input, select');
  const fieldMap = {
    'ชื่อจริง': firstName,
    'นามสกุล': lastName,
    'staff@purrfect.com': email,
    '0XX-XXX-XXXX': phone,
  };
  fields.forEach(field => {
    if (fieldMap[field.placeholder] !== undefined) {
      field.value = fieldMap[field.placeholder];
    }
    if (field.tagName === 'SELECT') {
      field.value = role;
    }
  });

  overlay.classList.add('open');

  // Reset title when modal closes
  overlay.addEventListener('click', function resetTitle(e) {
    if (e.target === overlay) {
      if (title) title.textContent = 'Add New Staff';
      overlay.removeEventListener('click', resetTitle);
    }
  }, { once: true });
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
async function loadAndRenderStaff() {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  // โหลดข้อมูลจาก API
  const response = await window.staffAPI.getAllStaff();
  
  if (response.status !== 'success') {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">โหลดข้อมูลล้มเหลว</td></tr>';
    return;
  }

  const staffList = response.data;
  tbody.innerHTML = ''; // เคลียร์ของเก่า

  staffList.forEach(staff => {
    // 1. กำหนดสี Avatar ตามตัวอักษรแรก (ลูกเล่นเสริม)
    const colors = ['blue', 'purple', 'teal', 'rose', 'amber', 'slate'];
    const color = colors[staff.staff_id % colors.length];
    const initial = staff.first_name ? staff.first_name.charAt(0) : '?';
    
    // 2. กำหนดสถานะ Online/Offline (สมมติชั่วคราว)
    const isOnline = staff.is_on_duty;
    const statusBadge = isOnline 
      ? `<span class="badge online"><span class="badge-dot" style="background:#10b981"></span>Online</span>`
      : `<span class="badge offline"><span class="badge-dot" style="background:#64748b"></span>Offline</span>`;

    // 3. จัดรูปแบบวันที่
    const hireDate = staff.hire_date ? new Date(staff.hire_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

    // 4. สร้าง HTML สำหรับ 1 แถว
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
          <button class="btn-icon" title="Edit" onclick="openEditModal('${staff.first_name}', '${staff.last_name}', '${staff.role}', '${staff.staff_email}', '${staff.phone_number}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn-icon danger" title="Deactivate">
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
/* ── SUBMIT NEW STAFF ── */
async function submitNewStaff() {
  // 1. ดึงค่าจากช่อง Input ต่างๆ ใน Modal
  const modal = document.getElementById('modal-add');
  const inputs = modal.querySelectorAll('.form-input');
  const select = modal.querySelector('.form-select');

  // สมมติว่าเรียงลำดับ input ตามใน HTML
  const staffData = {
    first_name: inputs[0].value,
    last_name: inputs[1].value,
    staff_username: inputs[2].value,
    role: select.value,
    staff_email: inputs[3].value,
    phone_number: inputs[4].value,
    hire_date: inputs[5].value || new Date().toISOString().split('T')[0], // ถ้าไม่ใส่วันที่ ให้ใช้วันนี้
    password: inputs[6].value
  };

  // เช็คว่ากรอกข้อมูลครบไหม (แบบเบื้องต้น)
  if (!staffData.staff_username || !staffData.password || !staffData.first_name) {
    alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (ชื่อ, Username, Password)");
    return;
  }

  // 2. เรียกใช้ API เพื่อบันทึกข้อมูล
  const response = await window.staffAPI.addStaff(staffData);

  // 3. ตรวจสอบผลลัพธ์
  if (response.status === 'success') {
    alert(response.message); // แจ้งเตือนว่าสำเร็จ
    closeModal(); // ปิดหน้าต่าง
    
    // เคลียร์ค่าในฟอร์มให้ว่างสำหรับรอบต่อไป
    inputs.forEach(input => input.value = '');
    
    // รีเฟรชตารางพนักงานใหม่ทันที!
    loadAndRenderStaff(); 
  } else {
    alert("เกิดข้อผิดพลาด: " + response.message);
  }
}