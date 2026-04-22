/**
 * PetProfile.js
 * Location: frontend/js/userpages/PetProfile.js
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const customer = checkCustomerAccess();
  if (!customer) return;

  UserSidebar.render({
    activePage: 'pets',
    user: { name: customer.firstname, role: 'customer' }
  });

  const params = new URLSearchParams(window.location.search);
  const petId  = params.get('petId');

  // 🟢 ถัาไม่มี petId ให้โชว์หน้ารวมสัตว์เลี้ยงทั้งหมด
  if (!petId) {
    await renderAllPetsList(customer);
    return;
  }

  await loadPetProfile(petId, customer);
});

// 🟢 ฟังก์ชันใหม่: สร้างหน้ารายการสัตว์เลี้ยงพร้อมปุ่ม Add Pet
async function renderAllPetsList(customer) {
  document.getElementById('breadcrumb-petname').textContent = 'All Pets';
  document.getElementById('pet-name-heading').textContent = 'Your Furry Family';
  document.getElementById('pet-subtitle').textContent = 'Select a pet to view their details or add a new one.';
  
  // ซ่อนรูปภาพและสถานะของหน้าโปรไฟล์เดี่ยว
  document.querySelector('.pet-photo-col')?.style.setProperty('display', 'none', 'important');
  document.querySelector('.profile-sections')?.style.setProperty('display', 'none', 'important');
  document.querySelectorAll('section:not(.pet-hero)').forEach(sec => sec.style.display = 'none');

  const statsGrid = document.getElementById('pet-stats-grid');
  statsGrid.style.display = 'grid';
  statsGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
  statsGrid.style.gap = '16px';
  statsGrid.innerHTML = '<div class="spinner"></div>';

  const res = await CustomerAPI.pets.getAll({ owner_id: customer.id });
  
  if (res.ok) {
    const pets = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    
    const page = window.Pagination
      ? Pagination.paginate(pets, { key: 'user-all-pets', pageSize: 8 })
      : { pageItems: pets, total: pets.length, start: 0, end: pets.length, totalPages: 1 };
    window.Pagination?.render(page, {
      key: 'user-all-pets',
      containerEl: ensurePetProfilePager(statsGrid),
      label: 'pets',
      onChange: () => renderAllPetsList(customer),
    });
    
    let html = page.pageItems.map(pet => `
      <a href="PetProfile.html?petId=${pet.pet_id || pet.petid || pet.id}" style="background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:20px; text-align:center; text-decoration:none; color:var(--text-1); transition:all 0.2s; box-shadow:var(--shadow-sm); display:block;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-size:40px; margin-bottom:12px;">${speciesEmoji(pet.species)}</div>
        <div style="font-weight:700; font-size:16px;">${pet.name}</div>
        <div style="font-size:12px; color:var(--text-3); margin-top:4px;">${pet.breed || pet.species}</div>
      </a>
    `).join('');

    // เพิ่มปุ่ม Add New Pet ต่อท้าย
    html += `
      <a href="AddPet.html" style="background:transparent; border:2px dashed var(--border-dark); border-radius:var(--r-md); padding:20px; text-align:center; text-decoration:none; color:var(--text-2); display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:140px; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseout="this.style.borderColor='var(--border-dark)'; this.style.color='var(--text-2)';">
        <div style="font-size:32px; margin-bottom:8px;">+</div>
        <div style="font-weight:600; font-size:14px;">Add New Pet</div>
      </a>
    `;
    
    statsGrid.innerHTML = html;
  }
}

function ensurePetProfilePager(anchor) {
  let pager = document.getElementById('all-pets-pager');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'all-pets-pager';
    pager.className = 'pg-pagination';
    pager.style.marginTop = '12px';
    anchor.insertAdjacentElement('afterend', pager);
  }
  return pager;
}
// ... (ฟังก์ชัน loadPetProfile เดิมปล่อยไว้เหมือนเดิมได้เลยครับ)

async function loadPetProfile(petId, customer) {
  document.getElementById('pet-name-heading').textContent = 'Loading…';

  // 🟢 ยิง API 2 ตัวพร้อมกัน: ดึงข้อมูลสัตว์เลี้ยง และ ดึงประวัติวัคซีน
  const [petRes, vacRes] = await Promise.all([
    CustomerAPI.pets.getById(petId),
    CustomerAPI.pets.getVaccines(petId)
  ]);

  if (petRes.ok) {
    const pet = petRes.data?.data || petRes.data;
    
    // 🟢 ดึงข้อมูลวัคซีนจาก API (ถ้าไม่มีให้เป็น Array ว่าง)
    const vaccines = (vacRes.ok && vacRes.data?.data) ? vacRes.data.data : [];

    document.getElementById('pet-name-heading').textContent = pet.name;
    document.getElementById('pet-subtitle').textContent = `${pet.breed || ''} • ${calcAge(pet.dob)}`;
    document.getElementById('breadcrumb-petname').textContent = pet.name;

    // 🟢 ส่งวัคซีนของจริงเข้าไปในฟังก์ชันวาดหน้าจอ (ลบ [] ของเก่าทิ้ง)
    renderPetProfile(pet, vaccines);
    wirePetActions(pet);
  } else {
    renderError('ไม่พบข้อมูลสัตว์เลี้ยง หรือคุณไม่มีสิทธิ์เข้าถึง');
  }
}

function renderPetProfile(pet, vaccines) {
  document.getElementById('pet-name-heading').textContent = pet.name || '—';

  const age = calcAge(pet.dob);
  document.getElementById('pet-subtitle').textContent =
    [pet.breed, age].filter(Boolean).join(' • ') || pet.species;

  const photoWrap = document.getElementById('pet-photo-wrap');
  if (photoWrap) {
    photoWrap.innerHTML = `<div class="pet-photo-frame__placeholder">${speciesEmoji(pet.species)}</div>`;
  }

  const statsMap = [
    { label: 'Species',       value: pet.species || '—' },
    { label: 'Sex',           value: pet.sex === 'M' ? 'Male' : pet.sex === 'F' ? 'Female' : '—' },
    { label: 'Weight',        value: pet.weight_kg ? `${pet.weight_kg} kg` : '—' },
    { label: 'Date of Birth', value: formatDate(pet.dob) },
    { label: 'Coat Color',    value: pet.coat_color || '—' },
    { label: 'Breed',         value: pet.breed || '—' },
  ];

  const statsGrid = document.getElementById('pet-stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = statsMap.map(s => `
      <div class="pet-stat">
        <div class="pet-stat__label">${s.label}</div>
        <div class="pet-stat__value">${s.value}</div>
      </div>
    `).join('');
  }

  renderVaccinations(vaccines, pet.is_vaccinated);
  renderAllergies(pet.allergies);
  renderMedical(pet.medical_notes, pet.behavior_notes);

  const bc = document.getElementById('breadcrumb-petname');
  if (bc) bc.textContent = pet.name;

  const mealBtn = document.getElementById('meal-plan-btn');
  if (mealBtn) mealBtn.href = '#';
}

function wirePetActions(pet) {
  const actions = document.querySelector('.pet-actions');
  if (actions) {
    actions.innerHTML = `
      <button type="button" id="meal-plan-btn" class="btn btn-primary">Configure Meal Plan</button>
      <button type="button" id="edit-pet-btn" class="btn btn-secondary">Edit</button>
      <button type="button" id="delete-pet-btn" class="btn btn-secondary">Delete</button>
    `;
  }

  document.getElementById('meal-plan-btn')?.addEventListener('click', () => saveMealPlanPrompt(pet.pet_id));
  document.getElementById('edit-pet-btn')?.addEventListener('click', () => editPetPrompt(pet));
  document.getElementById('delete-pet-btn')?.addEventListener('click', () => deletePet(pet.pet_id));

  document.querySelector('[title="Add Record"]')?.addEventListener('click', () => addVaccinePrompt(pet.pet_id));
}

async function editPetPrompt(pet) {
  const name = prompt('Pet name', pet.name || '');
  if (name === null) return;
  const weight = prompt('Weight in kg', pet.weight_kg || '');
  if (weight === null) return;

  const res = await CustomerAPI.pets.update(pet.pet_id, {
    name: name.trim(),
    weight_kg: parseFloat(weight) || null,
  });

  if (res.ok) {
    showToast('Pet profile updated.', 'success');
    await loadPetProfile(pet.pet_id, checkCustomerAccess());
  } else {
    showToast(res.data?.message || 'Unable to update pet profile.', 'error');
  }
}

async function deletePet(petId) {
  if (!confirm('Delete this pet profile?')) return;
  const res = await CustomerAPI.pets.delete(petId);
  if (res.ok) {
    showToast('Pet profile deleted.', 'success');
    setTimeout(() => { window.location.href = 'PetProfile.html'; }, 800);
  } else {
    showToast(res.data?.message || 'Unable to delete pet profile.', 'error');
  }
}

async function addVaccinePrompt(petId) {
  const vaccineName = prompt('Vaccine name');
  if (!vaccineName) return;
  const administeredDate = prompt('Administered date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
  if (!administeredDate) return;
  const expiryDate = prompt('Expiry date (YYYY-MM-DD)');
  if (!expiryDate) return;

  const res = await CustomerAPI.pets.addVaccine(petId, {
    vaccine_name: vaccineName.trim(),
    administered_date: administeredDate,
    expiry_date: expiryDate,
  });
  if (res.ok) {
    showToast('Vaccination record added.', 'success');
    await loadPetProfile(petId, checkCustomerAccess());
  } else {
    showToast(res.data?.message || 'Unable to add vaccination.', 'error');
  }
}

async function saveMealPlanPrompt(petId) {
  const foodType = prompt('Food type for morning meal');
  if (!foodType) return;
  const quantity = prompt('Quantity in grams', '100');
  if (quantity === null) return;
  const notes = prompt('Notes', '') || '';

  const res = await CustomerAPI.pets.saveMealPlans(petId, [{
    meal_period: 'MORNING',
    food_type: foodType.trim(),
    quantity_grams: parseFloat(quantity) || 0,
    notes,
  }]);

  if (res.ok) showToast('Meal plan saved.', 'success');
  else showToast(res.data?.message || 'Unable to save meal plan.', 'error');
}

function renderVaccinations(vaccines, isVaccinated) {
  const container = document.getElementById('vaccine-list');
  if (!container) return;

  if (!vaccines || vaccines.length === 0) {
    container.innerHTML = `
      <p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">
        ${isVaccinated ? 'Vaccination records not digitized yet.' : 'No vaccination records on file.'}
      </p>`;
    window.Pagination?.render(
      { pageItems: [], total: 0, start: 0, end: 0, totalPages: 1, page: 1 },
      { key: 'user-pet-vaccines', containerEl: ensurePetProfilePager(container), label: 'vaccines', onChange: () => renderVaccinations(vaccines, isVaccinated) }
    );
    return;
  }

  const page = window.Pagination
    ? Pagination.paginate(vaccines, { key: 'user-pet-vaccines', pageSize: 5 })
    : { pageItems: vaccines, total: vaccines.length, start: 0, end: vaccines.length, totalPages: 1 };
  window.Pagination?.render(page, {
    key: 'user-pet-vaccines',
    containerEl: ensurePetProfilePager(container),
    label: 'vaccines',
    onChange: () => renderVaccinations(vaccines, isVaccinated),
  });

  container.innerHTML = page.pageItems.map(v => {
    const expiry   = new Date(v.expiry_date);
    const now      = new Date();
    const daysLeft = Math.ceil((expiry - now) / 86400000);
    let statusClass = 'vaccine-entry__icon--utd';
    let statusLabel = 'UP TO DATE';
    if (daysLeft < 0)       { statusClass = 'vaccine-entry__icon--exp'; statusLabel = 'EXPIRED'; }
    else if (daysLeft <= 30) { statusClass = 'vaccine-entry__icon--due'; statusLabel = 'DUE SOON'; }

    return `
      <div class="vaccine-entry">
        <div class="vaccine-entry__icon ${statusClass}">💉</div>
        <div style="flex:1">
          <div class="vaccine-entry__name">${escHtml(v.vaccine_name)}</div>
          <div class="vaccine-entry__clinic">${v.vet_clinic ? `Administered by ${escHtml(v.vet_clinic)}` : ''}</div>
          <div class="vaccine-entry__date" style="color:${daysLeft < 0 ? 'var(--danger)' : daysLeft <= 30 ? 'var(--warning)' : 'var(--success)'}">
            ${formatDate(v.expiry_date)}
          </div>
        </div>
        <span class="badge" style="font-size:10px;${daysLeft < 0 ? 'background:var(--danger-light);color:#dc2626' : daysLeft <= 30 ? 'background:var(--warning-light);color:#D97706' : 'background:var(--success-light);color:#059669'}">
          ${statusLabel}
        </span>
      </div>`;
  }).join('');
}

function renderAllergies(allergyText) {
  const container = document.getElementById('allergy-tags');
  if (!container) return;

  if (!allergyText || allergyText === 'ไม่มี' || allergyText.toLowerCase() === 'none') {
    container.innerHTML = `<span class="badge badge--success">No Known Allergies</span>`;
    return;
  }

  const allergies = allergyText.split(/[,;]/).map(a => a.trim()).filter(Boolean);
  container.innerHTML = allergies.map(a => `
    <span class="allergy-tag">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      ${escHtml(a)}
    </span>
  `).join('');
}

function renderMedical(condition, behaviorNotes) {
  const container = document.getElementById('conditions-list');
  if (!container) return;

  const parts = [];

  if (condition && condition !== 'ไม่มี' && condition.toLowerCase() !== 'none') {
    condition.split(/[;\n]/).filter(c => c.trim()).forEach(c => {
      parts.push(`
        <div class="condition-card">
          <div class="condition-card__name">${escHtml(c.trim())}</div>
        </div>`);
    });
  }

  if (behaviorNotes && behaviorNotes.trim()) {
    parts.push(`
      <div class="condition-card" style="border-left-color:var(--teal)">
        <div class="condition-card__name" style="color:var(--teal)">Behavior Notes</div>
        <div class="condition-card__text">${escHtml(behaviorNotes)}</div>
      </div>`);
  }

  container.innerHTML = parts.length
    ? parts.join('')
    : `<span class="badge badge--success">No Chronic Conditions</span>`;
}

// Aliases ที่ loadPetProfile เรียกใช้
function renderStats(pet) { renderPetProfile(pet, []); }

function renderAllergiesAndConditions(allergy, condition, notes) {
  renderAllergies(allergy);
  renderMedical(condition, notes);
}

function renderError(msg) {
  const nameEl = document.getElementById('pet-name-heading');
  if (nameEl) nameEl.textContent = 'Error';
  document.getElementById('pet-subtitle').textContent = '';
  const statsGrid = document.getElementById('pet-stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger)">
        <div style="font-size:40px;margin-bottom:12px">⚠️</div>
        <p>${msg}</p>
        <a href="CustomerDashboard.html" class="btn btn-primary" style="margin-top:16px;display:inline-flex">Back to Dashboard</a>
      </div>`;
  }
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function calcAge(dob) {
  if (!dob) return '';
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return years > 0 ? `${years} yr${years !== 1 ? 's' : ''}` : 'Under 1 yr';
}

function speciesEmoji(species) {
  const s = String(species || '').toLowerCase();
  if (s.includes('dog')) return '🐶';
  if (s.includes('cat')) return '🐱';
  if (s.includes('bird')) return '🦜';
  return '🐾';
}

function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', options);
}
