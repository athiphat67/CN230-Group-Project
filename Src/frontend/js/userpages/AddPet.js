/**
 * AddPet.js
 * Location: frontend/js/userpages/AddPet.js
 */

'use strict';

let selectedSex    = '';
let vaccineEntries = [];
let photoBase64    = null;

document.addEventListener('DOMContentLoaded', () => {
  const customer = checkCustomerAccess();
  if (!customer) return;

  // ✅ FIX: UserSidebar (ไม่ใช่ Sidebar ของ Admin), activePage: 'addpet'
  UserSidebar.render({
    activePage: 'addpet',
    user: { name: customer.firstname, role: 'customer' }
  });

  initPhotoUpload();
  initSexToggle();
  initVaccineTable();
  initFormSubmit(customer);
});

/* ── PHOTO UPLOAD ─────────────────────────────────── */
function initPhotoUpload() {
  const dropzone  = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('pet-photo-input');
  const preview   = document.getElementById('photo-preview');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('hover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('hover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('hover');
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoFile(file, preview);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handlePhotoFile(file, preview);
  });
}

function handlePhotoFile(file, previewEl) {
  if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'warning'); return; }
  if (file.size > 5 * 1024 * 1024)    { showToast('Image must be smaller than 5 MB', 'warning'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    photoBase64 = e.target.result;
    if (previewEl) { previewEl.src = photoBase64; previewEl.style.display = 'block'; }
    const icon = document.querySelector('.photo-dropzone__icon');
    const text = document.querySelector('.photo-dropzone__text');
    if (icon) icon.style.display = 'none';
    if (text) text.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ── SEX TOGGLE ───────────────────────────────────── */
function initSexToggle() {
  document.querySelectorAll('.sex-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sex-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSex = btn.dataset.sex;
      document.getElementById('pet-sex-input').value = selectedSex;
    });
  });
}

/* ── VACCINATION TABLE ────────────────────────────── */
function initVaccineTable() {
  const addBtn = document.getElementById('vaccine-add-btn');
  if (addBtn) addBtn.addEventListener('click', addVaccineEntry);
}

function addVaccineEntry() {
  const modal = document.getElementById('vaccine-modal');
  if (modal) {
    modal.classList.add('open');
    document.getElementById('v-name').value   = '';
    document.getElementById('v-date').value   = '';
    document.getElementById('v-expiry').value = '';
    document.getElementById('v-clinic').value = '';
    setTimeout(() => document.getElementById('v-name').focus(), 50);
  }
}

function closeVaccineModal() {
  document.getElementById('vaccine-modal')?.classList.remove('open');
}

function saveVaccineEntry() {
  const name   = document.getElementById('v-name').value.trim();
  const date   = document.getElementById('v-date').value;
  const expiry = document.getElementById('v-expiry').value;
  const clinic = document.getElementById('v-clinic').value.trim();

  if (!name || !date || !expiry) {
    showToast('Please fill in vaccine name, date, and expiry.', 'warning'); return;
  }

  vaccineEntries.push({ vaccine_name: name, administered_date: date, expiry_date: expiry, vet_clinic: clinic });
  renderVaccineTable();
  updateVaccineRecord();
  closeVaccineModal();
  showToast(`${name} vaccination added.`, 'success');
}

function removeVaccineEntry(index) {
  vaccineEntries.splice(index, 1);
  renderVaccineTable();
  updateVaccineRecord();
}

function renderVaccineTable() {
  const tbody = document.getElementById('vaccine-tbody');
  if (!tbody) return;

  if (vaccineEntries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:16px;font-size:13px">No vaccinations added yet</td></tr>`;
    return;
  }

  tbody.innerHTML = vaccineEntries.map((v, i) => `
    <tr>
      <td style="font-weight:600;color:var(--text-1)">${escHtml(v.vaccine_name)}</td>
      <td>${formatDate(v.administered_date)}</td>
      <td>${formatDate(v.expiry_date)}</td>
      <td>
        <button class="btn-icon" title="Remove" style="width:28px;height:28px" onclick="removeVaccineEntry(${i})">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function updateVaccineRecord() {
  const recordField = document.getElementById('vaccine-record-text');
  if (recordField) {
    recordField.value = vaccineEntries.length > 0
      ? vaccineEntries.map(v => `${v.vaccine_name} (${formatDate(v.administered_date)})`).join(', ')
      : '';
  }
  const vaccCheck = document.getElementById('is-vaccinated');
  if (vaccCheck) vaccCheck.value = vaccineEntries.length > 0 ? 'true' : 'false';
}

window.closeVaccineModal  = closeVaccineModal;
window.saveVaccineEntry   = saveVaccineEntry;
window.removeVaccineEntry = removeVaccineEntry;

/* ── FORM SUBMIT ──────────────────────────────────── */
function initFormSubmit(customer) {
  const form = document.getElementById('add-pet-form');
  if (form) form.addEventListener('submit', (e) => submitPetForm(e, customer));
}

async function submitPetForm(e, customer) {
  e.preventDefault();

  const payload = {
    customerid:       customer.id,
    name:             document.getElementById('pet-name').value.trim(),
    species:          document.getElementById('pet-species').value,
    breed:            document.getElementById('pet-breed').value.trim(),
    weight:           parseFloat(document.getElementById('pet-weight').value) || 0,
    sex:              selectedSex || 'M',
    dob:              document.getElementById('pet-dob').value || null,
    coat_color:       document.getElementById('pet-coat-color').value.trim(),
    medicalcondition: document.getElementById('pet-medical').value.trim()  || 'ไม่มี',
    allergy:          document.getElementById('pet-allergy').value.trim()  || 'ไม่มี',
    isvaccinated:     vaccineEntries.length > 0,
    vaccinerecord:    document.getElementById('vaccine-record-text').value || 'ไม่มี',
    behavior_notes:   document.getElementById('pet-behavior').value.trim()
  };

  const btn = document.getElementById('save-pet-btn');
  setButtonLoading(btn, true, 'Saving...');

  const res = await CustomerAPI.pets.create(payload);
  setButtonLoading(btn, false);

  if (res.ok) {
    const petId = res.data?.pet_id || res.data?.data?.pet_id;
    if (petId && vaccineEntries.length > 0) {
      await Promise.all(vaccineEntries.map(v => CustomerAPI.pets.addVaccine(petId, {
        vaccine_name: v.vaccine_name,
        administered_date: v.administered_date,
        expiry_date: v.expiry_date,
      })));
    }
    showToast('เพิ่มสัตว์เลี้ยงสำเร็จ! 🐾', 'success');
    setTimeout(() => { window.location.href = petId ? `PetProfile.html?petId=${petId}` : 'CustomerDashboard.html'; }, 1500);
  } else {
    showToast(res.data?.message || 'ไม่สามารถเพิ่มสัตว์เลี้ยงได้', 'error');
  }
}

function discardForm() {
  if (confirm('ยกเลิกการเพิ่มสัตว์เลี้ยง?')) window.location.href = 'CustomerDashboard.html';
}

window.discardForm = discardForm;

/* ── HELPERS ────────────────────────────────────────── */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', options);
}
