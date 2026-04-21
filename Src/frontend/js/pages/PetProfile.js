/**
 * PetProfile.js — Page logic for Pet Profile Management (FR2)
 * Purrfect Stay Admin Panel
 *
 * Handles: table render · filter tabs · search · modals ·
 *          add/edit pet · vaccination records · meal plans
 */

/* ── MOCK DATA ── */
const PETS = [
  {
    pet_id: 1, owner_id: 5,
    owner_name: 'อาพิญา ศ.', owner_phone: '081-234-5678', owner_email: 'apiya@email.com',
    name: 'มะม่วง', emoji: '🐱', species: 'cat', breed: 'Scottish Fold',
    sex: 'F', dob: '2021-03-15', weight_kg: 4.2, coat_color: 'น้ำตาล-ขาว',
    medical_notes: 'แพ้ไก่ ระวังอาหารที่มีส่วนผสมของไก่',
    allergies: 'ไก่',
    behavior_notes: 'ขี้อาย ต้องใช้เวลาทำความรู้จัก ชอบซ่อนตัวช่วงแรก',
    vaccines: [
      { vaccine_id: 1, vaccine_name: 'FVRCP', administered_date: '2025-01-10', expiry_date: '2026-01-10', vet_clinic: 'คลินิกสัตวแพทย์สุขสันต์' },
      { vaccine_id: 2, vaccine_name: 'Rabies', administered_date: '2024-11-05', expiry_date: '2025-11-05', vet_clinic: 'คลินิกสัตวแพทย์สุขสันต์' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Royal Canin Kitten', quantity_grams: 80, notes: 'ผสมน้ำอุ่นนิดหน่อย' },
      { meal_period: 'MIDDAY',  food_type: 'Royal Canin Kitten', quantity_grams: 60, notes: '' },
      { meal_period: 'EVENING', food_type: 'Royal Canin Kitten', quantity_grams: 80, notes: '' },
    ],
  },
  {
    pet_id: 2, owner_id: 6,
    owner_name: 'ชัญญา ด.', owner_phone: '082-345-6789', owner_email: 'chanya@email.com',
    name: 'โดนัท', emoji: '🐶', species: 'dog', breed: 'Labrador Retriever',
    sex: 'M', dob: '2020-07-22', weight_kg: 18.5, coat_color: 'เหลืองทอง',
    medical_notes: '', allergies: '', behavior_notes: 'เป็นมิตร ชอบเล่นน้ำ',
    vaccines: [
      { vaccine_id: 3, vaccine_name: 'DHPPiL', administered_date: '2025-02-14', expiry_date: '2026-02-14', vet_clinic: 'โรงพยาบาลสัตว์จตุจักร' },
      { vaccine_id: 4, vaccine_name: 'Rabies', administered_date: '2025-02-14', expiry_date: '2026-02-14', vet_clinic: 'โรงพยาบาลสัตว์จตุจักร' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Pro Plan Large Breed', quantity_grams: 200, notes: '' },
      { meal_period: 'EVENING', food_type: 'Pro Plan Large Breed', quantity_grams: 200, notes: '' },
    ],
  },
  {
    pet_id: 3, owner_id: 7,
    owner_name: 'สมศักดิ์ ท.', owner_phone: '089-456-7890', owner_email: 'somsak@email.com',
    name: 'บิ๊กบอย', emoji: '🐕', species: 'dog', breed: 'Golden Retriever',
    sex: 'M', dob: '2019-12-01', weight_kg: 28.0, coat_color: 'ทอง',
    medical_notes: 'มีปัญหาข้อสะโพก ห้ามออกกำลังกายหนัก',
    allergies: '',
    behavior_notes: 'รักความสงบ ชอบอยู่กับคน',
    vaccines: [
      { vaccine_id: 5, vaccine_name: 'DHPPiL', administered_date: '2024-12-20', expiry_date: '2025-12-20', vet_clinic: 'คลินิกหมาแมวรัก' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Hill\'s Large Breed', quantity_grams: 250, notes: '' },
      { meal_period: 'EVENING', food_type: 'Hill\'s Large Breed', quantity_grams: 250, notes: '' },
    ],
  },
  {
    pet_id: 4, owner_id: 8,
    owner_name: 'ณิชา ร.', owner_phone: '085-789-0123', owner_email: 'nicha@email.com',
    name: 'ทาโร่', emoji: '🐶', species: 'dog', breed: 'Pomeranian',
    sex: 'M', dob: '2022-05-10', weight_kg: 3.1, coat_color: 'ขาวครีม',
    medical_notes: '', allergies: 'ซีฟู้ด',
    behavior_notes: 'ขี้แง แต่น่ารัก ชอบอยู่ใกล้คน',
    vaccines: [
      { vaccine_id: 6, vaccine_name: 'DHPPiL', administered_date: '2025-03-01', expiry_date: '2026-03-01', vet_clinic: 'โรงพยาบาลสัตว์จตุจักร' },
      { vaccine_id: 7, vaccine_name: 'Rabies', administered_date: '2025-03-01', expiry_date: '2026-03-01', vet_clinic: 'โรงพยาบาลสัตว์จตุจักร' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Royal Canin Toy Breed', quantity_grams: 50, notes: '' },
      { meal_period: 'MIDDAY',  food_type: 'Royal Canin Toy Breed', quantity_grams: 40, notes: '' },
      { meal_period: 'EVENING', food_type: 'Royal Canin Toy Breed', quantity_grams: 50, notes: '' },
    ],
  },
  {
    pet_id: 5, owner_id: 9,
    owner_name: 'วิภาวี ส.', owner_phone: '084-678-9012', owner_email: 'wipawee@email.com',
    name: 'มูมู่', emoji: '🐱', species: 'cat', breed: 'Persian',
    sex: 'F', dob: '2020-11-30', weight_kg: 5.8, coat_color: 'ขาวเทา',
    medical_notes: 'ตาน้ำไหลเรื้อรัง ต้องเช็ดตาทุกวัน',
    allergies: '',
    behavior_notes: 'ชอบความสงบ ไม่ชอบเสียงดัง',
    vaccines: [
      { vaccine_id: 8, vaccine_name: 'FVRCP', administered_date: '2023-08-15', expiry_date: '2024-08-15', vet_clinic: 'คลินิกสัตวแพทย์สุขสันต์' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Whiskas Adult', quantity_grams: 100, notes: '' },
      { meal_period: 'EVENING', food_type: 'Whiskas Adult', quantity_grams: 100, notes: '' },
    ],
  },
  {
    pet_id: 6, owner_id: 10,
    owner_name: 'กัลยา ม.', owner_phone: '086-890-1234', owner_email: 'kallaya@email.com',
    name: 'ลูน่า', emoji: '🐱', species: 'cat', breed: 'British Shorthair',
    sex: 'F', dob: '2023-02-14', weight_kg: 3.5, coat_color: 'เทาเงิน',
    medical_notes: '', allergies: '',
    behavior_notes: 'เงียบ ชอบนอน เป็นมิตร',
    vaccines: [
      { vaccine_id: 9, vaccine_name: 'FVRCP', administered_date: '2025-04-01', expiry_date: '2026-04-01', vet_clinic: 'โรงพยาบาลสัตว์เพื่อนรัก' },
    ],
    meal_plans: [
      { meal_period: 'MORNING', food_type: 'Royal Canin British', quantity_grams: 70, notes: '' },
      { meal_period: 'EVENING', food_type: 'Royal Canin British', quantity_grams: 70, notes: '' },
    ],
  },
];

/* ── STATE ── */
let currentFilter = 'all';
let currentSearch = '';
let selectedPetId = null;
let editingPetId = null;
let activeModalTab = 'basic';

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderStats();
  renderTable();
  bindModalBackdrops();
  bindEscapeKey();

  // TODO: เชื่อม API จริง
  // window.API.pets.getAll().then(res => { if (res.ok) { PETS.length=0; res.data.forEach(p=>PETS.push(p)); } renderStats(); renderTable(); });
});

/* ══════════════════════════════════════════
   STATS
══════════════════════════════════════════ */
function renderStats() {
  const cats  = PETS.filter(p => p.species === 'cat').length;
  const dogs  = PETS.filter(p => p.species === 'dog').length;
  const alert = PETS.filter(p => p.allergies || p.medical_notes).length;
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
  updateCounts();

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    showEl.textContent = 'ไม่พบรายการ';
    return;
  }
  emptyEl.style.display = 'none';
  showEl.textContent = `แสดง ${filtered.length} รายการ`;

  tbody.innerHTML = filtered.map(pet => {
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
        <td><span class="pp-species-badge ${pet.species}">${speciesLabel(pet.species)}</span></td>
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
            <button class="pp-btn-icon" title="เพิ่มวัคซีน" onclick="openAddVaccine(${pet.pet_id})">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getFiltered() {
  return PETS.filter(pet => {
    const matchSpec = currentFilter === 'all' || pet.species === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q || pet.name.toLowerCase().includes(q) ||
      pet.owner_name.toLowerCase().includes(q) ||
      pet.breed.toLowerCase().includes(q);
    return matchSpec && matchSearch;
  });
}

function filterPets(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.pp-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTable();
}

function searchPets(q) {
  currentSearch = q;
  renderTable();
}

function updateCounts() {
  document.getElementById('count-all').textContent = PETS.length;
  document.getElementById('count-cat').textContent = PETS.filter(p => p.species === 'cat').length;
  document.getElementById('count-dog').textContent = PETS.filter(p => p.species === 'dog').length;
}

/* ══════════════════════════════════════════
   VIEW PET MODAL
══════════════════════════════════════════ */
function openViewPet(id) {
  const pet = PETS.find(p => p.pet_id === id);
  if (!pet) return;
  selectedPetId = id;

  document.getElementById('view-pet-subtitle').textContent = `${pet.name} (${pet.breed})`;

  const vaccStatus = getVaccStatus(pet);
  const age = calcAge(pet.dob);

  document.getElementById('view-pet-body').innerHTML = `
    <div class="pp-pet-profile-hero">
      <div class="pp-pet-hero-avatar">${pet.emoji}</div>
      <div>
        <div class="pp-pet-hero-name">${pet.name}</div>
        <div class="pp-pet-hero-sub">${pet.breed} · ${speciesLabel(pet.species)} · ${pet.sex === 'F' ? '♀️ เมีย' : '♂️ ผู้'}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
          <span class="pp-vacc-badge ${vaccStatus.cls}" style="font-size:11px">${vaccStatus.label}</span>
          ${pet.allergies ? `<span class="pp-alert-tag">⚠ แพ้ ${pet.allergies}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="pp-view-grid">
      <div class="pp-view-box">
        <div class="pp-view-box-label">🐾 ข้อมูลพื้นฐาน</div>
        <div class="pp-view-row"><span class="pp-view-label">ชื่อ</span><span class="pp-view-val">${pet.name}</span></div>
        <div class="pp-view-row"><span class="pp-view-label">สายพันธุ์</span><span class="pp-view-val">${pet.breed}</span></div>
        <div class="pp-view-row"><span class="pp-view-label">วันเกิด</span><span class="pp-view-val">${formatDate(pet.dob)} (${age})</span></div>
        <div class="pp-view-row"><span class="pp-view-label">น้ำหนัก</span><span class="pp-view-val">${pet.weight_kg} kg</span></div>
        <div class="pp-view-row"><span class="pp-view-label">สีขน</span><span class="pp-view-val">${pet.coat_color || '—'}</span></div>
      </div>
      <div class="pp-view-box">
        <div class="pp-view-box-label">👤 ข้อมูลเจ้าของ</div>
        <div class="pp-view-row"><span class="pp-view-label">ชื่อ</span><span class="pp-view-val">${pet.owner_name}</span></div>
        <div class="pp-view-row"><span class="pp-view-label">โทรศัพท์</span><span class="pp-view-val">${pet.owner_phone}</span></div>
        <div class="pp-view-row"><span class="pp-view-label">อีเมล</span><span class="pp-view-val" style="font-size:12px">${pet.owner_email || '—'}</span></div>
      </div>
    </div>

    ${(pet.allergies || pet.medical_notes || pet.behavior_notes) ? `
    <div class="pp-view-box" style="margin-bottom:16px">
      <div class="pp-view-box-label">🏥 ข้อมูลสุขภาพ & พฤติกรรม</div>
      ${pet.allergies ? `<div class="pp-view-row"><span class="pp-view-label">แพ้</span><span class="pp-view-val" style="color:#DC2626;font-weight:700">${pet.allergies}</span></div>` : ''}
      ${pet.medical_notes ? `<div class="pp-view-row"><span class="pp-view-label">ประวัติสุขภาพ</span><span class="pp-view-val" style="font-size:12.5px">${pet.medical_notes}</span></div>` : ''}
      ${pet.behavior_notes ? `<div class="pp-view-row"><span class="pp-view-label">พฤติกรรม</span><span class="pp-view-val" style="font-size:12.5px">${pet.behavior_notes}</span></div>` : ''}
    </div>` : ''}

    <div style="margin-bottom:16px">
      <div class="pp-view-box-label" style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--pp-text-3);margin-bottom:10px">💉 ประวัติวัคซีน (${pet.vaccines.length} รายการ)</div>
      ${pet.vaccines.length ? `
        <div class="pp-vacc-list">
          ${pet.vaccines.map(v => {
            const exp = getVaccExpiry(v.expiry_date);
            return `
              <div class="pp-vacc-item">
                <div>
                  <div class="pp-vacc-name">💉 ${v.vaccine_name}</div>
                  <div class="pp-vacc-dates">ฉีด: ${formatDate(v.administered_date)} · หมดอายุ: ${formatDate(v.expiry_date)}</div>
                  <div class="pp-vacc-clinic">${v.vet_clinic}</div>
                </div>
                <span class="pp-vacc-badge ${exp.cls}">${exp.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      ` : `<p style="font-size:13px;color:var(--pp-text-3)">ยังไม่มีบันทึกวัคซีน</p>`}
    </div>

    ${pet.meal_plans.length ? `
    <div>
      <div class="pp-view-box-label" style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--pp-text-3);margin-bottom:10px">🍽 แผนอาหาร</div>
      <div class="pp-meal-grid">
        ${['MORNING','MIDDAY','EVENING'].map(period => {
          const mp = pet.meal_plans.find(m => m.meal_period === period);
          const icons = { MORNING: '🌅 เช้า', MIDDAY: '☀️ กลางวัน', EVENING: '🌙 เย็น' };
          return `
            <div class="pp-meal-card">
              <div class="pp-meal-period">${icons[period]}</div>
              ${mp ? `
                <div class="pp-meal-food">${mp.food_type}</div>
                <div class="pp-meal-qty">${mp.quantity_grams}g${mp.notes ? ' · ' + mp.notes : ''}</div>
              ` : `<div class="pp-meal-qty" style="color:var(--pp-text-3)">—</div>`}
            </div>
          `;
        }).join('')}
      </div>
    </div>` : ''}
  `;

  openModal('modal-view-pet');
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

function savePet() {
  const name    = document.getElementById('pet-name').value.trim();
  const species = document.getElementById('pet-species').value;
  const breed   = document.getElementById('pet-breed').value.trim();
  const sex     = document.getElementById('pet-sex').value;
  const dob     = document.getElementById('pet-dob').value;
  const weight  = parseFloat(document.getElementById('pet-weight').value);
  const owner   = document.getElementById('pet-owner').value.trim();
  const phone   = document.getElementById('pet-phone').value.trim();

  if (!name || !breed || !owner) {
    showToast('⚠️ กรุณากรอกข้อมูลที่จำเป็นให้ครบ', 'warn');
    return;
  }

  const emojiMap = { cat: '🐱', dog: '🐶', other: '🐾' };

  if (editingPetId) {
    const idx = PETS.findIndex(p => p.pet_id === editingPetId);
    if (idx !== -1) Object.assign(PETS[idx], {
      name, species, breed, sex, dob, weight_kg: weight || PETS[idx].weight_kg,
      emoji: emojiMap[species],
      coat_color:      document.getElementById('pet-coat').value,
      owner_name:      owner,
      owner_phone:     phone,
      owner_email:     document.getElementById('pet-email').value,
      allergies:       document.getElementById('pet-allergies').value,
      medical_notes:   document.getElementById('pet-medical').value,
      behavior_notes:  document.getElementById('pet-behavior').value,
    });
    // TODO: PUT /api/pets/{pet_id}
    showToast(`✅ อัปเดตโปรไฟล์ ${name} สำเร็จ!`);
  } else {
    const newPet = {
      pet_id: PETS.length + 1, owner_id: 99,
      name, species, breed, sex, dob,
      weight_kg: weight || 0, emoji: emojiMap[species],
      coat_color:     document.getElementById('pet-coat').value,
      owner_name:     owner, owner_phone: phone,
      owner_email:    document.getElementById('pet-email').value,
      allergies:      document.getElementById('pet-allergies').value,
      medical_notes:  document.getElementById('pet-medical').value,
      behavior_notes: document.getElementById('pet-behavior').value,
      vaccines: [], meal_plans: [],
    };
    PETS.unshift(newPet);
    // TODO: POST /api/pets
    showToast(`✅ เพิ่มโปรไฟล์ ${name} สำเร็จ!`);
  }

  renderStats(); renderTable();
  closeModal('modal-pet');
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

function saveVaccine() {
  const pet = PETS.find(p => p.pet_id === selectedPetId);
  if (!pet) return;

  const name   = document.getElementById('vacc-name').value.trim();
  const date   = document.getElementById('vacc-date').value;
  const expiry = document.getElementById('vacc-expiry').value;
  const clinic = document.getElementById('vacc-clinic').value.trim();

  if (!name || !date || !expiry) {
    showToast('⚠️ กรุณากรอกชื่อวัคซีน วันที่ฉีด และวันหมดอายุ', 'warn');
    return;
  }

  pet.vaccines.push({
    vaccine_id: Date.now(), vaccine_name: name,
    administered_date: date, expiry_date: expiry, vet_clinic: clinic,
  });

  // TODO: POST /api/pets/{pet_id}/vaccines
  renderTable();
  closeModal('modal-vaccine');
  showToast(`✅ บันทึกวัคซีน ${name} ให้น้อง${pet.name} สำเร็จ!`);
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
  return { cat: '🐱 แมว', dog: '🐶 สุนัข', other: '🐾 อื่นๆ' }[s] ?? s;
}

function getVaccStatus(pet) {
  if (!pet.vaccines || pet.vaccines.length === 0) return { cls: 'none', label: '— ไม่มีข้อมูล' };
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 60);
  const expired  = pet.vaccines.some(v => new Date(v.expiry_date) < today);
  const expiring = pet.vaccines.some(v => { const d = new Date(v.expiry_date); return d >= today && d <= soon; });
  if (expired)  return { cls: 'expired',  label: '⚠ หมดอายุ' };
  if (expiring) return { cls: 'expiring', label: '⏰ ใกล้หมดอายุ' };
  return { cls: 'valid', label: '✓ ครบถ้วน' };
}

function getVaccExpiry(expiryDate) {
  const today = new Date();
  const soon  = new Date(); soon.setDate(soon.getDate() + 60);
  const d = new Date(expiryDate);
  if (d < today) return { cls: 'expired', label: 'หมดอายุแล้ว' };
  if (d <= soon) return { cls: 'expiring', label: 'ใกล้หมดอายุ' };
  return { cls: 'valid', label: 'ยังใช้ได้' };
}