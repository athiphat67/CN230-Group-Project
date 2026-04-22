/**
 * CustomerProfile.js
 * Location: frontend/js/userpages/CustomerProfile.js
 */

'use strict';

let editingSection = null;

document.addEventListener('DOMContentLoaded', async () => {
  const customer = checkCustomerAccess();
  if (!customer) return;
    
  // ✅ FIX: UserSidebar (ไม่ใช่ Sidebar ของ Admin), activePage: 'profile'
  UserSidebar.render({
    activePage: 'profile',
    user: { name: customer.firstname, role: 'customer' }
  });

  await loadProfile(customer);
  await loadMyPetsToProfile(); // 🟢 เพิ่มการโหลดข้อมูลสัตว์เลี้ยงมาแสดงในหน้า Profile
});

function renderProfile(c) {
  const initials = ((c.firstname?.[0] || '') + (c.lastname?.[0] || '')).toUpperCase() || 'U';
  setEl('profile-initials', initials);
  setEl('profile-display-name', `${c.firstname || ''} ${c.lastname || ''}`.trim());
  setEl('profile-username', `@${c.customerusername || ''}`);

  setEl('view-firstname', c.firstname || '—');
  setEl('view-lastname', c.lastname || '—');
  setEl('view-email', c.customeremail || '—');
  setEl('view-phone', c.phonenumber || '—');
  setEl('view-address', c.address || '—');
  setEl('view-username', c.customerusername || '—');

  setVal('edit-firstname', c.firstname);
  setVal('edit-lastname',  c.lastname);
  setVal('edit-email',     c.customeremail);
  setVal('edit-phone',     c.phonenumber);
  setVal('edit-address',   c.address);

  localStorage.setItem('customer_info', JSON.stringify(c));
}

function startEdit() {
  editingSection = 'personal';
  document.getElementById('personal-section')?.classList.add('edit-mode');
  document.getElementById('edit-firstname')?.focus();
}

function cancelEdit() {
  editingSection = null;
  document.getElementById('personal-section')?.classList.remove('edit-mode');
}

async function loadProfile(customer) {
  const res = await CustomerAPI.customer.getMe();
  const data = (res.ok && res.data?.data) ? res.data.data : customer;
  const customerId = data.customerid || data.customer_id || data.id || customer.id;
  if (customerId) localStorage.setItem('customer_id', customerId);
  renderProfile(data);
}

async function savePersonal() {
  const customer = checkCustomerAccess();
  if (!customer) return;

  const btn = document.getElementById('save-personal-btn');
  setButtonLoading(btn, true, 'Save Changes');

  const payload = {
    first_name:    document.getElementById('edit-firstname').value.trim(),
    last_name:     document.getElementById('edit-lastname').value.trim(),
    customer_email: document.getElementById('edit-email').value.trim(),
    phone_number:  document.getElementById('edit-phone').value.trim(),
    address:       document.getElementById('edit-address').value.trim()
  };

  const customerId = customer.id || customer.customerid || localStorage.getItem('customer_id');
  const res = await CustomerAPI.customer.update(customerId, payload);

  setButtonLoading(btn, false);

  if (res.ok) {
    showToast('อัปเดตข้อมูลสำเร็จ!', 'success');
    localStorage.setItem('first_name', payload.first_name);
    localStorage.setItem('last_name', payload.last_name);
    setTimeout(() => { window.location.reload(); }, 1000);
  } else {
    showToast(res.data?.message || 'ไม่สามารถอัปเดตข้อมูลได้', 'error');
  }
}

window.startEdit    = startEdit;
window.cancelEdit   = cancelEdit;
window.savePersonal = savePersonal;

function openPasswordModal() {
  document.getElementById('password-modal')?.classList.add('open');
  document.getElementById('current-password')?.focus();
}

function closePasswordModal() {
  document.getElementById('password-modal')?.classList.remove('open');
  ['current-password', 'new-password', 'confirm-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

async function changePassword() {
  const currentPw = document.getElementById('current-password')?.value;
  const newPw     = document.getElementById('new-password')?.value;
  const confirmPw = document.getElementById('confirm-password')?.value;

  if (!currentPw || !newPw || !confirmPw) {
    showToast('Please fill in all password fields.', 'warning'); return;
  }
  if (newPw.length < 8) {
    showToast('New password must be at least 8 characters.', 'warning'); return;
  }
  if (newPw !== confirmPw) {
    showToast('New passwords do not match.', 'warning'); return;
  }

  showToast('Password changed successfully!', 'success');
  closePasswordModal();
}

window.openPasswordModal  = openPasswordModal;
window.closePasswordModal = closePasswordModal;
window.changePassword     = changePassword;

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

/* ── โหลดข้อมูลสัตว์เลี้ยงมาแสดงในหน้า Profile ── */
async function loadMyPetsToProfile() {
  const container = document.getElementById('profile-pet-list');
  if (!container) return;

  const customer = checkCustomerAccess();
  const res = await CustomerAPI.pets.getAll({ owner_id: customer.id });

  if (res.ok) {
      const pets = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (pets.length === 0) {
          container.innerHTML = `<div style="color:var(--text-3); font-size:13px;">No pets registered yet. <a href="AddPet.html" style="color:var(--primary);">Add one now</a>.</div>`;
          return;
      }

      container.innerHTML = pets.map(pet => `
        <a href="PetProfile.html?petId=${pet.pet_id || pet.petid || pet.id}" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--border); border-radius:var(--r); text-decoration:none; color:var(--text-1); background:var(--bg-alt); min-width: 200px;">
          <div style="font-size:24px;">${pet.species?.toLowerCase().includes('dog') ? '🐶' : pet.species?.toLowerCase().includes('cat') ? '🐱' : '🐾'}</div>
          <div>
            <div style="font-weight:700;">${pet.name}</div>
            <div style="font-size:12px; color:var(--text-3);">${pet.breed || pet.species}</div>
          </div>
        </a>
      `).join('');
  }
}

// 🟢 อย่าลืมไปเพิ่มการเรียกใช้งาน loadMyPetsToProfile() ใน DOMContentLoaded ด้วยนะครับ!
// document.addEventListener('DOMContentLoaded', async () => { ... await loadMyPetsToProfile(); ... });
