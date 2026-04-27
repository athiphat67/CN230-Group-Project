/**
 * PetProfile.js — Page logic for Pet Profile Management (FR2)
 * Purrfect Stay Admin Panel
 *
 * Handles: table render · filter tabs · search · modals ·
 *          add/edit pet · vaccination records · meal plans
 */

/* ── MOCK DATA ── */
let PETS = []


/* ── STATE ── */
let currentFilter = 'all';
let currentSearch = '';
let selectedPetId = null;
let editingPetId = null;
let activeModalTab = 'basic';
const PETS_PAGE_KEY = 'admin-pets';
const PETS_PAGE_SIZE = 10;

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadPetsData(); // เปลี่ยนจาก renderStats/renderTable เฉยๆ เป็นตัวนี้
  bindModalBackdrops();
  bindEscapeKey();
});

/* ══════════════════════════════════════════
   STATS
══════════════════════════════════════════ */
function renderStats() {
  const cats  = PETS.filter(p => p.species?.toLowerCase() === 'cat').length;
  const dogs  = PETS.filter(p => p.species?.toLowerCase() === 'dog').length;
  
  // ปรับการนับ alert ให้แม่นยำขึ้น
  const alert = PETS.filter(p => {
    const hasAllergy = p.allergies && p.allergies !== 'ไม่มี' && p.allergies !== '-';
    const hasMedical = p.medical_notes && p.medical_notes !== 'ไม่มี' && p.medical_notes !== '-';
    return hasAllergy || hasMedical;
  }).length;
  
  document.getElementById('stat-total').textContent  = PETS.length;
  document.getElementById('stat-cats').textContent   = cats;
  document.getElementById('stat-dogs').textContent   = dogs;
  document.getElementById('stat-alert').textContent  = alert;
}

/* ══════════════════════════════════════════
   TABLE
══════════════════════════════════════════ */
function renderTable() {
  const tbody   = document.getElementById('pets-tbody');
  const emptyEl = document.getElementById('pp-empty');
  const showEl  = document.getElementById('pp-showing');

  const filtered = getFiltered();
  const page = window.Pagination
    ? Pagination.paginate(filtered, { key: PETS_PAGE_KEY, pageSize: PETS_PAGE_SIZE })
    : { pageItems: filtered, total: filtered.length, start: 0, end: filtered.length, totalPages: 1 };
  updateCounts();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showEl.textContent = 'ไม่พบรายการ';
    window.Pagination?.render(page, { key: PETS_PAGE_KEY, infoId: 'pp-showing', label: 'รายการ', onChange: renderTable });
    return;
  }
  emptyEl.style.display = 'none';
  window.Pagination?.render(page, { key: PETS_PAGE_KEY, infoId: 'pp-showing', label: 'รายการ', onChange: renderTable });

  tbody.innerHTML = page.pageItems.map(pet => {
    const age = calcAge(pet.dob);
    const vaccStatus = getVaccStatus(pet);
    const alerts = [];
    if (pet.allergies)     alerts.push(`⚠ แพ้ ${pet.allergies}`);
    if (pet.medical_notes) alerts.push('🏥 มีประวัติสุขภาพ');

    return `
      <tr>
        <td>
          <div class="pp-pet-cell">
            <div class="pp-pet-avatar">${pet.emoji}</div>
            <div>
              <div class="pp-pet-name">${pet.name}</div>
              <div class="pp-pet-breed">${pet.breed}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="pp-owner-cell">
            <div class="pp-owner-name">${pet.owner_name}</div>
            <div class="pp-owner-phone">${pet.owner_phone}</div>
          </div>
        </td>
        <td><span class="pp-species-badge ${pet.species?.toLowerCase()}">${speciesLabel(pet.species)}</span></td>
        <td style="color:var(--pp-text-2);font-size:13px">${pet.sex === 'F' ? '♀️ เมีย' : '♂️ ผู้'} · ${age}</td>
        <td style="color:var(--pp-text-2);font-size:13px">${pet.weight_kg} kg</td>
        <td><span class="pp-vacc-badge ${vaccStatus.cls}">${vaccStatus.label}</span></td>
        <td>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${alerts.length ? alerts.map(a => `<span class="pp-alert-tag">${a}</span>`).join('') : '<span style="font-size:12px;color:var(--pp-text-3)">—</span>'}
          </div>
        </td>
        <td>
          <div class="pp-action-btns">
            <button class="pp-btn-icon" title="ดูโปรไฟล์เต็ม" onclick="openViewPet(${pet.pet_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            <button class="pp-btn-icon edit" title="แก้ไข" onclick="openEditPet(${pet.pet_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button class="pp-btn-icon delete" title="ลบ" onclick="deletePet(${pet.pet_id}, '${pet.name}')" style="color: #E11D48">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
            <button class="pp-btn-icon" title="เพิ่มวัคซีน" onclick="openAddVaccine(${pet.pet_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function deletePet(id, name) {
  if (!confirm(`ยืนยันการลบโปรไฟล์ของ "${name}"? \nข้อมูลประวัติวัคซีนและแผนอาหารทั้งหมดจะถูกลบไปด้วยและไม่สามารถเรียกคืนได้`)) {
    return;
  }

  try {
    const res = await window.API.pets.delete(id);
    if (res.ok) {
      showToast('🗑️ ลบข้อมูลเรียบร้อยแล้ว');
      await loadPetsData(); // รีโหลดตารางใหม่
    } else {
      showToast('ไม่สามารถลบข้อมูลได้: ' + res.data.message, 'warn');
    }
  } catch (error) {
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ Server', 'warn');
  }
}

function getFiltered() {
  return PETS.filter(pet => {
    const species = pet.species?.toLowerCase();
    
    let matchSpec = (currentFilter === 'all');
    if (!matchSpec) {
      if (currentFilter === 'other') {
        // ถ้าเลือก Other ให้แสดงตัวที่ไม่ใช่แมวและสุนัข
        matchSpec = (species !== 'cat' && species !== 'dog');
      } else {
        matchSpec = (species === currentFilter.toLowerCase());
      }
    }
    
    const q = currentSearch.toLowerCase();
    const matchSearch = !q || pet.name.toLowerCase().includes(q) ||
      pet.owner_name.toLowerCase().includes(q) ||
      pet.breed.toLowerCase().includes(q);
      
    return matchSpec && matchSearch;
  });
}

function filterPets(filter, btn) {
  currentFilter = filter;
  window.Pagination?.reset(PETS_PAGE_KEY);
  document.querySelectorAll('.pp-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchPets(q) {
  currentSearch = q;
  window.Pagination?.reset(PETS_PAGE_KEY);
  renderTable();
}

function updateCounts() {
  document.getElementById('count-all').textContent = PETS.length;
  document.getElementById('count-cat').textContent = PETS.filter(p => p.species?.toLowerCase() === 'cat').length;
  document.getElementById('count-dog').textContent = PETS.filter(p => p.species?.toLowerCase() === 'dog').length;
  document.getElementById('count-other').textContent = PETS.filter(p => 
    p.species !== 'cat' && p.species !== 'dog'
  ).length;
}

/* ══════════════════════════════════════════
   VIEW PET MODAL
══════════════════════════════════════════ */
async function openViewPet(id) {
  const pet = PETS.find(p => p.pet_id === id);
  if (!pet) return;
  selectedPetId = id;

  // โหลดข้อมูลวัคซีนและแผนอาหารเพิ่มก่อนแสดง Modal
  try {
    const [vaccRes, mealRes] = await Promise.all([
      window.API.pets.getVaccines(id),
      window.API.pets.getMealPlans(id)
    ]);

    if (vaccRes.ok) pet.vaccines = vaccRes.data.data;
    if (mealRes.ok) pet.meal_plans = mealRes.data.data;
    
    // หลังจากได้ข้อมูลครบค่อยวาด UI ใน Modal
    renderViewModalContent(pet); 
    openModal('modal-view-pet');
  } catch (err) {
    showToast('ไม่สามารถโหลดรายละเอียดเพิ่มเติมได้', 'warn');
  }
}

function renderViewModalContent(pet) {
  const body = document.getElementById('view-pet-body');
  document.getElementById('view-pet-subtitle').textContent = `${pet.name} (${pet.breed})`;

  body.innerHTML = `
    <div class="pp-view-grid">
      <div class="pp-view-main">
        <div class="pp-view-section">
          <div class="pp-section-title">📋 ข้อมูลทั่วไป</div>
          <p><strong>เพศ:</strong> ${pet.sex === 'M' ? 'ผู้' : 'เมีย'} | <strong>อายุ:</strong> ${calcAge(pet.dob)}</p>
          <p><strong>น้ำหนัก:</strong> ${pet.weight_kg} kg | <strong>สีขน:</strong> ${pet.coat_color || '-'}</p>
        </div>
        <div class="pp-view-section">
          <div class="pp-section-title">🏥 สุขภาพและแจ้งเตือน</div>
          <p><strong>โรคประจำตัว:</strong> ${pet.medical_notes || 'ไม่มี'}</p>
          <p><strong>สิ่งที่แพ้:</strong> <span class="pp-alert-text">${pet.allergies || 'ไม่มี'}</span></p>
        </div>
      </div>
      
      <div class="pp-view-side">
        <div class="pp-section-title">💉 ประวัติวัคซีนล่าสุด</div>
        <div class="pp-vaccine-list">
          ${pet.vaccines?.length > 0 
            ? pet.vaccines.map(v => `
                <div class="pp-vaccine-item">
                  <div><strong>${v.vaccine_name}</strong></div>
                  <div class="pp-text-sub">${formatDate(v.administered_date)} (หมดอายุ: ${formatDate(v.expiry_date)})</div>
                  <div class="pp-text-sub">${v.vet_clinic ? `คลินิก: ${v.vet_clinic}` : ''}</div>
                  <div style="display:flex;gap:8px;margin-top:8px">
                    <button class="pp-btn-icon edit" title="แก้ไขวัคซีน" onclick="editVaccineRecord(${v.vaccine_id})">
                      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="pp-btn-icon delete" title="ลบวัคซีน" onclick="deleteVaccineRecord(${v.vaccine_id})">
                      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              `).join('')
            : '<div class="pp-empty-sub">ไม่มีประวัติวัคซีน</div>'}
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════
   ADD / EDIT PET MODAL
══════════════════════════════════════════ */
function openAddPet() {
  editingPetId = null;
  document.getElementById('pet-modal-title').textContent = 'เพิ่มสัตว์เลี้ยงใหม่';
  clearPetForm();
  switchModalTab('basic');
  openModal('modal-pet');
}

function openEditPet(id) {
  editingPetId = id;
  const pet = PETS.find(p => p.pet_id === id);
  if (!pet) return;

  document.getElementById('pet-modal-title').textContent = 'แก้ไขโปรไฟล์สัตว์เลี้ยง';

  document.getElementById('pet-name').value        = pet.name;
  document.getElementById('pet-species').value     = pet.species;
  document.getElementById('pet-breed').value       = pet.breed;
  document.getElementById('pet-sex').value         = pet.sex;
  document.getElementById('pet-dob').value         = pet.dob;
  document.getElementById('pet-weight').value      = pet.weight_kg;
  document.getElementById('pet-coat').value        = pet.coat_color || '';
  document.getElementById('pet-owner').value       = pet.owner_name;
  document.getElementById('pet-phone').value       = pet.owner_phone;
  document.getElementById('pet-email').value       = pet.owner_email || '';
  document.getElementById('pet-allergies').value   = pet.allergies || '';
  document.getElementById('pet-medical').value     = pet.medical_notes || '';
  document.getElementById('pet-behavior').value    = pet.behavior_notes || '';

  switchModalTab('basic');
  openModal('modal-pet');
}

function clearPetForm() {
  ['pet-name','pet-breed','pet-dob','pet-weight','pet-coat','pet-owner','pet-phone','pet-email','pet-allergies','pet-medical','pet-behavior']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('pet-species').value = 'cat';
  document.getElementById('pet-sex').value = 'F';
}

async function savePet() {
  // 1. รวบรวมข้อมูล (ให้ชื่อ Key ตรงกับที่ pets.py รอรับ)
  const payload = {
    name: document.getElementById('pet-name').value.trim(),
    species: document.getElementById('pet-species').value, // 'cat', 'dog'
    breed: document.getElementById('pet-breed').value.trim(),
    sex: document.getElementById('pet-sex').value, // 'M' หรือ 'F'
    dob: document.getElementById('pet-dob').value, // YYYY-MM-DD
    weight_kg: parseFloat(document.getElementById('pet-weight').value) || 0,
    coat_color: document.getElementById('pet-coat').value,
    medical_notes: document.getElementById('pet-medical').value,
    allergies: document.getElementById('pet-allergies').value,
    behavior_notes: document.getElementById('pet-behavior').value,
    // หมายเหตุ: ในระบบจริงต้องดึง customerid จากการเลือกเจ้าของ
    // ตอนนี้ Hardcode เป็น 1 ตาม Schema ของคุณที่ห้ามเป็น NULL
    owner_id: 1 
  };

  if (!payload.name || !payload.breed) {
    showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'warn');
    return;
  }

  try {
    let res;
    if (editingPetId) {
      // แก้ไขรายการเดิม (PUT /api/pets/{id})
      res = await window.API.pets.update(editingPetId, payload);
    } else {
      // สร้างรายการใหม่ (POST /api/pets)
      res = await window.API.pets.create(payload);
    }

    if (res.ok) {
      showToast(`✅ ${editingPetId ? 'อัปเดต' : 'เพิ่ม'}ข้อมูลน้อง ${payload.name} สำเร็จ`);
      closeModal('modal-pet');
      await loadPetsData(); // รีโหลดตารางใหม่จาก Database จริง
    } else {
      showToast('ผิดพลาด: ' + res.data.message, 'warn');
    }
  } catch (error) {
    showToast('ไม่สามารถเชื่อมต่อกับ Server ได้', 'warn');
  }
}

async function loadPetsData() {
  // 1. ดึงข้อมูลจาก Backend (ดึงผ่าน Query Params ถ้าต้องการฟิลเตอร์)
  const res = await window.API.pets.getAll();

  if (res.ok) {
    PETS = res.data.data.map(p => ({
      ...p,
      species: p.species?.toLowerCase(),
      emoji: p.species?.toLowerCase() === 'cat' ? '🐱' : 
             p.species?.toLowerCase() === 'dog' ? '🐶' : '🐾',
      vaccines: [], 
      meal_plans: []
    }));

    renderStats();
    renderTable();
  } else {
    showToast('โหลดข้อมูลล้มเหลว: ' + res.data.message, 'warn');
  }
}

/* ══════════════════════════════════════════
   ADD VACCINE MODAL
══════════════════════════════════════════ */
function openAddVaccine(id) {
  const pet = PETS.find(p => p.pet_id === id);
  if (!pet) return;
  selectedPetId = id;

  document.getElementById('vacc-pet-name').textContent = pet.name;
  ['vacc-name','vacc-date','vacc-expiry','vacc-clinic'].forEach(el => {
    const e = document.getElementById(el); if (e) e.value = '';
  });
  openModal('modal-vaccine');
}

async function saveVaccine() {
  const payload = {
    vaccine_name: document.getElementById('vacc-name').value.trim(),
    administered_date: document.getElementById('vacc-date').value,
    expiry_date: document.getElementById('vacc-expiry').value,
    vet_clinic: document.getElementById('vacc-clinic').value.trim()
  };

  if (!payload.vaccine_name || !payload.administered_date || !payload.expiry_date) {
    showToast('⚠️ กรุณากรอกชื่อวัคซีน วันที่ฉีด และวันหมดอายุ', 'warn');
    return;
  }
  if (new Date(payload.expiry_date) < new Date(payload.administered_date)) {
    showToast('⚠️ วันหมดอายุต้องไม่ก่อนวันที่ฉีด', 'warn');
    return;
  }

  const res = await window.API.pets.addVaccine(selectedPetId, payload);
  if (res.ok) {
    showToast('✅ บันทึกประวัติวัคซีนเรียบร้อย');
    closeModal('modal-vaccine');
    await loadPetsData(); // รีโหลดเพื่ออัปเดต Badge สถานะวัคซีนในตาราง
    await openViewPet(selectedPetId);
  } else {
    showToast('เกิดข้อผิดพลาด: ' + res.data.message, 'warn');
  }
}

async function editVaccineRecord(vaccineId) {
  const pet = PETS.find(p => p.pet_id === selectedPetId);
  const vaccine = pet?.vaccines?.find(v => v.vaccine_id === vaccineId);
  if (!vaccine) return;

  const vaccineName = prompt('ชื่อวัคซีน', vaccine.vaccine_name || '');
  if (vaccineName === null) return;
  const administeredDate = prompt('วันที่ฉีด (YYYY-MM-DD)', vaccine.administered_date || '');
  if (administeredDate === null) return;
  const expiryDate = prompt('วันหมดอายุ (YYYY-MM-DD)', vaccine.expiry_date || '');
  if (expiryDate === null) return;
  const vetClinic = prompt('คลินิก / โรงพยาบาล', vaccine.vet_clinic || '') || '';

  if (!vaccineName.trim() || !administeredDate || !expiryDate) {
    showToast('⚠️ กรุณากรอกข้อมูลวัคซีนให้ครบถ้วน', 'warn');
    return;
  }
  if (new Date(expiryDate) < new Date(administeredDate)) {
    showToast('⚠️ วันหมดอายุต้องไม่ก่อนวันที่ฉีด', 'warn');
    return;
  }

  const res = await window.API.pets.updateVaccine(selectedPetId, vaccineId, {
    vaccine_name: vaccineName.trim(),
    administered_date: administeredDate,
    expiry_date: expiryDate,
    vet_clinic: vetClinic.trim(),
  });

  if (res.ok) {
    showToast('✅ อัปเดตประวัติวัคซีนเรียบร้อย');
    await loadPetsData();
    await openViewPet(selectedPetId);
  } else {
    showToast('เกิดข้อผิดพลาด: ' + res.data.message, 'warn');
  }
}

async function deleteVaccineRecord(vaccineId) {
  if (!confirm('ยืนยันการลบประวัติวัคซีนรายการนี้?')) return;
  const res = await window.API.pets.deleteVaccine(selectedPetId, vaccineId);
  if (res.ok) {
    showToast('✅ ลบประวัติวัคซีนเรียบร้อย');
    await loadPetsData();
    await openViewPet(selectedPetId);
  } else {
    showToast('เกิดข้อผิดพลาด: ' + res.data.message, 'warn');
  }
}

/* ══════════════════════════════════════════
   MODAL TAB SWITCH
══════════════════════════════════════════ */
function switchModalTab(tab) {
  activeModalTab = tab;
  document.querySelectorAll('.pp-modal-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.pp-tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `tab-${tab}`);
  });
}

/* ══════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function bindModalBackdrops() {
  document.querySelectorAll('.pp-modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
  });
}
function bindEscapeKey() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.pp-modal-overlay.open').forEach(m => m.classList.remove('open'));
  });
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function showToast(msg, type = 'success') {
  document.getElementById('pp-toast')?.remove();
  const c = type === 'warn'
    ? { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
    : { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' };
  const t = document.createElement('div');
  t.id = 'pp-toast'; t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:${c.bg};color:${c.color};border:1.5px solid ${c.border};padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;max-width:380px;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function calcAge(dob) {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return years < 1 ? 'น้อยกว่า 1 ปี' : `${years} ปี`;
}

function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function speciesLabel(s) {
  if (!s) return '—';
  const labels = { cat: '🐱 แมว', dog: '🐶 สุนัข', other: '🐾 อื่นๆ' };
  return labels[s.toLowerCase()] ?? s;
}

// แก้ไขใน PetProfile.js
function getVaccStatus(pet) {
  // 1. ถ้ามีข้อมูลใน Array รายละเอียด (โหลดมาแล้ว) ให้ใช้ข้อมูลนั้นก่อน
  if (pet.vaccines && pet.vaccines.length > 0) {
    const today = new Date();
    const soon = new Date(); soon.setDate(soon.getDate() + 60);
    const expired = pet.vaccines.some(v => new Date(v.expiry_date) < today);
    const expiring = pet.vaccines.some(v => { 
      const d = new Date(v.expiry_date); 
      return d >= today && d <= soon; 
    });
    if (expired) return { cls: 'expired', label: '⚠ หมดอายุ' };
    if (expiring) return { cls: 'expiring', label: '⏰ ใกล้หมดอายุ' };
    return { cls: 'valid', label: '✓ ครบถ้วน' };
  }

  // 2. ถ้ายังไม่มี Array (กรณีแสดงในตารางครั้งแรก) ให้เช็คจาก is_vaccinated ในตาราง pet
  if (pet.is_vaccinated) {
    return { cls: 'valid', label: '✓ มีประวัติ' };
  }

  return { cls: 'none', label: '— ไม่มีข้อมูล' };
}

function getVaccExpiry(expiryDate) {
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 60);
  const d = new Date(expiryDate);
  if (d < today) return { cls: 'expired', label: 'หมดอายุแล้ว' };
  if (d <= soon) return { cls: 'expiring', label: 'ใกล้หมดอายุ' };
  return { cls: 'valid', label: 'ยังใช้ได้' };
}

function clickStatCard(type) {
  // เอาสถานะ active ออกจาก Tab Filter ตรงหัวตารางก่อน
  document.querySelectorAll('.pp-tab').forEach(t => t.classList.remove('active'));

  // ตั้งค่า currentFilter ตามการ์ดที่กด
  currentFilter = type;

  // ถ้ากดการ์ดที่ตรงกับ Tab ก็ให้ Tab นั้น active ด้วย (ยกเว้น alert ที่ไม่มี Tab)
  if (type === 'total' || type === 'all') {
    currentFilter = 'all';
    document.querySelector('.pp-tab[onclick*="all"]')?.classList.add('active');
  } else if (type === 'cat') {
    document.querySelector('.pp-tab[onclick*="cat"]')?.classList.add('active');
  } else if (type === 'dog') {
    document.querySelector('.pp-tab[onclick*="dog"]')?.classList.add('active');
  }

  // สั่งวาดตารางใหม่
  renderTable();
}
