/**
 * ReservationForm.js
 * Location: frontend/js/userpages/ReservationForm.js
 */

'use strict';

// 🟢 เปลี่ยนจาก const เป็น let และให้ค่าเริ่มต้นเป็น Array ว่าง เพื่อรอรับข้อมูลจาก API
let SUITE_CATALOG = [];
let ADDON_CATALOG = [];

let selectedSuiteId = null; // เปลี่ยนค่าเริ่มต้นเป็น null 
let selectedPetIds = new Set();
let selectedAddons = new Set();
let checkinDate = null;
let checkoutDate = null;

document.addEventListener('DOMContentLoaded', async () => {
    const customer = checkCustomerAccess();
    if (!customer) return;

    UserSidebar.render({
        activePage: 'booking',
        user: { name: customer.firstname, role: 'customer' }
    });

    initDatePickers();
    await loadMyPets(customer);
    await loadAddons();

    updateSummary();
    document.getElementById('book-now-btn')?.addEventListener('click', () => submitBooking(customer));
});

/* ── DATE PICKERS ─────────────────────────────────── */
function initDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const checkinEl = document.getElementById('checkin-date');
    const checkoutEl = document.getElementById('checkout-date');

    if (checkinEl) { checkinEl.min = today; checkinEl.value = ''; }
    if (checkoutEl) { checkoutEl.min = today; checkoutEl.value = ''; }

    checkinEl?.addEventListener('change', () => {
        checkinDate = checkinEl.value;
        if (checkoutEl) {
            checkoutEl.min = checkinDate;
            if (checkoutEl.value && checkoutEl.value <= checkinDate) {
                checkoutEl.value = '';
                checkoutDate = null;
            }
        }
        loadAvailableRooms(); // 🟢 เพิ่มตรงนี้
        updateSummary();
    });

    checkoutEl?.addEventListener('change', () => {
        checkoutDate = checkoutEl.value;
        loadAvailableRooms(); // 🟢 เพิ่มตรงนี้
        updateSummary();
    });
}

/* ── LOAD PETS ────────────────────────────────────── */
async function loadMyPets(customer) {
    const container = document.getElementById('pet-select-list');
    if (!container) return;

    const res = await CustomerAPI.pets.getAll({ owner_id: customer.id });

    if (res.ok) {
        const pets = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        if (pets.length === 0) {
            container.innerHTML = `<div style="color:var(--text-3);font-size:13px;">กรุณาเพิ่มสัตว์เลี้ยงในเมนู My Pets ก่อนทำการจอง</div>`;
            return;
        }

        container.innerHTML = pets.map(pet => `
      <label class="pet-select-card">
        <input type="checkbox" value="${pet.pet_id || pet.petid || pet.id}" data-species="${pet.species}" onchange="handlePetSelection(this)">
        <div class="pet-select-card__inner">
          <div style="font-size:24px;margin-bottom:8px;">${speciesEmoji(pet.species)}</div>
          <div style="font-weight:700;font-size:14px;color:var(--text-1);">${pet.name}</div>
        </div>
      </label>
    `).join('');
    }
}
function handlePetSelection(checkbox) {
    const petId = Number(checkbox.value);
    const card = checkbox.closest('.pet-select-card');
    if (checkbox.checked) { selectedPetIds.add(petId); card?.classList.add('selected'); }
    else { selectedPetIds.delete(petId); card?.classList.remove('selected'); }
    loadAvailableRooms();
    updateSummary();
}

window.handlePetSelection = handlePetSelection;

// legacy alias
function togglePet(checkbox) { handlePetSelection(checkbox); }
window.togglePet = togglePet;

/* ── SUITES ───────────────────────────────────────── */
function renderSuites() {
    const container = document.getElementById('suite-options');
    if (!container) return;

    container.innerHTML = SUITE_CATALOG.map(suite => `
    <button type="button"
      class="suite-option ${suite.id === selectedSuiteId ? 'selected' : ''}"
      data-suite-id="${suite.id}"
      onclick="selectSuite('${suite.id}')">
      <div class="suite-option__name">${suite.name}</div>
      <div class="suite-option__sub">${suite.sub}</div>
      <div class="suite-option__price">฿${suite.rate}<span>/night</span></div>
    </button>
  `).join('');
}

function selectSuite(suiteId) {
    selectedSuiteId = suiteId;
    document.querySelectorAll('.suite-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.suiteId === suiteId);
    });
    updateSummary();
}

window.selectSuite = selectSuite;

/* ── ADD-ONS ──────────────────────────────────────── */
function renderAddons() {
    const container = document.getElementById('addon-list');
    if (!container) return;

    container.innerHTML = ADDON_CATALOG.map(addon => `
    <label class="addon-item" data-addon-id="${addon.id}">
      <input type="checkbox" value="${addon.id}" onchange="toggleAddon(this)">
      <div class="addon-item__info">
        <div class="addon-item__name">${addon.name}</div>
        <div class="addon-item__desc">${addon.desc}</div>
      </div>
      <div class="addon-item__price">+฿${addon.price}</div>
    </label>
  `).join('');
}

function toggleAddon(checkbox) {
    const id = checkbox.value;
    const item = checkbox.closest('.addon-item');
    if (checkbox.checked) { selectedAddons.add(id); item?.classList.add('selected'); }
    else { selectedAddons.delete(id); item?.classList.remove('selected'); }
    updateSummary();
}

window.toggleAddon = toggleAddon;

/* ── BOOKING SUMMARY ──────────────────────────────── */
function updateSummary() {
    const suite = SUITE_CATALOG.find(s => s.id === selectedSuiteId);
    if (!suite) {
        setEl('summary-suite-name', 'Select a suite');
        setEl('summary-suite-price', '—');
        setEl('summary-nights-label', '— (select dates)');
        setEl('summary-nights-cost', '—');
        setEl('summary-total-amount', '฿0');
        setEl('summary-date-range', 'Select dates to see total');
        const bookBtn = document.getElementById('book-now-btn');
        if (bookBtn) bookBtn.disabled = true;
        return;
    }

    let nights = 0;
    if (checkinDate && checkoutDate && checkoutDate > checkinDate) {
        nights = Math.round((new Date(checkoutDate) - new Date(checkinDate)) / 86400000);
    }

    const roomTotal = suite.rate * nights;
    const addonTotal = [...selectedAddons].reduce((acc, id) => {
        const addon = ADDON_CATALOG.find(a => a.id === id);
        return acc + (addon?.price || 0);
    }, 0);
    const subtotal = roomTotal + addonTotal;

    setEl('summary-suite-name', suite.name);
    setEl('summary-suite-price', `฿${suite.rate}/night`);
    setEl('summary-nights-label', nights > 0 ? `${nights} Night${nights !== 1 ? 's' : ''}` : '— (select dates)');
    setEl('summary-nights-cost', nights > 0 ? `฿${formatNumber(roomTotal)}` : '—');

    const addonSummaryEl = document.getElementById('summary-addons');
    if (addonSummaryEl) {
        if (selectedAddons.size === 0) {
            addonSummaryEl.style.display = 'none';
        } else {
            addonSummaryEl.style.display = 'flex';
            const addonNames = [...selectedAddons].map(id => ADDON_CATALOG.find(a => a.id === id)?.name || id).join(', ');
            setEl('summary-addon-label', addonNames);
            setEl('summary-addon-cost', `฿${formatNumber(addonTotal)}`);
        }
    }

    setEl('summary-total-amount', `฿${formatNumber(subtotal)}`);

    if (checkinDate && checkoutDate && nights > 0) {
        setEl('summary-date-range',
            `${formatDate(checkinDate, { month: 'short', day: 'numeric' })} – ${formatDate(checkoutDate, { month: 'short', day: 'numeric' })}`
        );
    } else {
        setEl('summary-date-range', 'Select dates to see total');
    }

    const bookBtn = document.getElementById('book-now-btn');
    if (bookBtn) bookBtn.disabled = !(nights > 0 && selectedPetIds.size > 0);
}

function calculateTotal() {
    const suite = SUITE_CATALOG.find(s => s.id === selectedSuiteId);
    if (!suite || !checkinDate || !checkoutDate) return 0;
    const nights = Math.round((new Date(checkoutDate) - new Date(checkinDate)) / 86400000);
    const addonTotal = [...selectedAddons].reduce((acc, id) => acc + (ADDON_CATALOG.find(a => a.id === id)?.price || 0), 0);
    return suite.rate * nights + addonTotal;
}

/* ── SUBMIT ───────────────────────────────────────── */
async function submitBooking(customer) {
    const bookBtn = document.getElementById('book-now-btn');

    if (!checkinDate || !checkoutDate) {
        showToast('Please select check-in and check-out dates.', 'warning'); return;
    }
    if (selectedPetIds.size === 0) {
        showToast('Please select at least one pet.', 'warning'); return;
    }

    const suite = SUITE_CATALOG.find(s => s.id === selectedSuiteId);
    if (!suite) {
        showToast('Please select a room.', 'warning'); return;
    }

    // 🟢 1. แปลงข้อมูลบริการเสริมให้ Key ตรงกับ Backend (item_id, unit_price)
    const addonServices = [...selectedAddons].map(id => {
        const addon = ADDON_CATALOG.find(a => a.id === id);
        return addon ? { item_id: addon.itemid, quantity: 1, unit_price: addon.price } : null;
    }).filter(Boolean);

    // 🟢 2. จัดกลุ่มสัตว์เลี้ยงและห้องพักให้ตรงกับ Backend
    const petsPayload = [...selectedPetIds].map(id => ({
        pet_id: id,
        room_id: Number(selectedSuiteId)
    }));

    // 🟢 3. แก้ไข Key ให้มี Underscore (_) ตรงตามที่ Python คาดหวังเป๊ะๆ
    const payload = {
        customer_id: customer.id,
        checkin_date: `${checkinDate}T14:00:00`,
        checkout_date: `${checkoutDate}T12:00:00`,
        total_rate: calculateTotal(),
        pets: petsPayload,
        services: addonServices,
    };

    setButtonLoading(bookBtn, true);
    const res = await CustomerAPI.bookings.create(payload);
    setButtonLoading(bookBtn, false, 'Book Now →');

    if (res.ok) {
        showToast('Reservation confirmed! 🎉', 'success');
        // จองเสร็จแล้วให้เด้งกลับไปหน้า Dashboard 
        setTimeout(() => { window.location.href = 'CustomerDashboard.html'; }, 2000);
    } else {
        const msg = res.data?.detail || res.data?.message || 'Unable to complete booking. Please try again.';
        showToast(msg, 'error');
    }
}

/* ── HELPERS ────────────────────────────────────────── */
function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function formatDate(dateStr, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', options);
}

function formatNumber(n) {
    return Number(n).toLocaleString();
}

function speciesEmoji(species) {
    const s = String(species || '').toLowerCase();
    if (s.includes('dog')) return '🐶';
    if (s.includes('cat')) return '🐱';
    if (s.includes('bird')) return '🦜';
    return '🐾';
}

/* ── LOAD ADD-ONS FROM API ────────────────────────── */
async function loadAddons() {
    const container = document.getElementById('addon-list');
    if (container) container.innerHTML = '<div class="spinner spinner--sm"></div>';

    const res = await CustomerAPI.bookings.getServices();
    if (res.ok && res.data?.data) {
        // แปลงข้อมูลจาก DB ให้อยู่ใน Format ที่หน้าเว็บต้องการ
        ADDON_CATALOG = res.data.data.map(item => ({
            id: item.item_id.toString(),
            name: item.name,
            desc: item.category || 'Premium Service',
            price: item.unit_price,
            itemid: item.item_id
        }));
        renderAddons();
    } else if (container) {
        container.innerHTML = '<div style="color:var(--text-3);font-size:13px;">No add-ons available.</div>';
    }
}

/* ── LOAD AVAILABLE ROOMS FROM API ────────────────── */
async function loadAvailableRooms() {
  const container = document.getElementById('suite-options');
  if (!container) return;
  
  if (!checkinDate || !checkoutDate) {
    container.innerHTML = '<div style="color:var(--text-3); font-size:13px;">Please select Check-In and Check-Out dates first.</div>';
    SUITE_CATALOG = [];
    return;
  }

  // 🟢 ตรวจจับว่าลูกค้ากำลังเลือกหมา หรือ แมวอยู่
  let searchPetType = 'CAT'; // ค่าเริ่มต้น
  const selectedCheckbox = document.querySelector('.pet-select-card input:checked');
  if (selectedCheckbox) {
    const species = selectedCheckbox.getAttribute('data-species') || '';
    searchPetType = species.toUpperCase().includes('DOG') ? 'DOG' : 'CAT';
  }

  container.innerHTML = '<div class="spinner spinner--sm"></div>';

  // 🟢 ส่ง searchPetType ไปให้ Database แทนการส่ง 'CAT' ตรงๆ
  const res = await CustomerAPI.rooms.getAvailability({
    checkin_date: checkinDate,
    checkout_date: checkoutDate,
    pet_type: searchPetType 
  });

  if (res.ok && res.data?.data) {
    SUITE_CATALOG = res.data.data.map(room => ({
      id: room.room_id.toString(),
      name: `Room ${room.room_number}`,
      sub: room.room_type,
      rate: room.price_per_night,
      roomSize: room.room_type
    }));

    if (SUITE_CATALOG.length > 0) {
      selectedSuiteId = SUITE_CATALOG[0].id;
    } else {
      selectedSuiteId = null;
      container.innerHTML = `<div style="color:var(--danger); font-size:13px;">No rooms available for the selected dates and pet type.</div>`;
      updateSummary();
      return;
    }

    renderSuites();
    updateSummary();
  }
}
