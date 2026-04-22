/**
 * CustomerDashboard.js
 * Location: frontend/js/userpages/CustomerDashboard.js
 */

'use strict';

/* ── PAGE INIT ──────────────────────────────────────
   Auth check MUST be first action on DOMContentLoaded
   ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. RBAC guard — redirects if not a customer
    const customer = checkCustomerAccess();
    if (!customer) return;

    // 2. Inject navbar
    UserSidebar.render({
        activePage: 'dashboard',
        user: { name: customer.firstname, role: 'customer' },
        isSubPage: true // แจ้งว่าอยู่โฟลเดอร์ย่อยเพื่อให้ Path ถูกต้อง
    });

    // จุดที่ต้องเพิ่ม:
    if (window.Navbar) {
        Navbar.render({
            title: 'Customer Dashboard',
            breadcrumb: 'User › Home'
        });
    }

    // 3. Personalize hero
    renderHeroGreeting(customer);

    // 4. Load all dashboard data concurrently
    await Promise.all([
        loadMyPets(customer),
        loadNotifications(),
        loadActiveReservations(customer),
    ]);
});

/* ── HERO GREETING ─────────────────────────────────── */
function renderHeroGreeting(customer) {
    const nameEl = document.getElementById('hero-name');
    if (nameEl) {
        nameEl.textContent = `Hello, ${customer.firstname || 'Friend'}!`;
    }

    // Dynamic subtitle based on time of day
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17) greeting = 'Good evening';

    const subEl = document.getElementById('hero-subtitle');
    if (subEl) {
        subEl.textContent =
            `${greeting}! Your curated pet sanctuary is always ready.`;
    }
}

async function loadMyPets(customer) {
    const container = document.getElementById('family-pet-list');
    if (!container) return;

    const res = await CustomerAPI.pets.getAll({ owner_id: customer.id });

    if (res.ok) {
        const pets = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        if (pets.length === 0) {
            container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--text-3);">ยังไม่มีข้อมูลสัตว์เลี้ยง <br>กด Add New Pet เพื่อเพิ่มสมาชิกได้เลย!</div>`;
            return;
        }

        container.innerHTML = pets.map(pet => `
      <a href="PetProfile.html?petId=${pet.pet_id || pet.petid || pet.id}" class="family-pet-card" style="display:flex; align-items:center; gap:12px; padding:12px; border-bottom:1px solid var(--border); text-decoration:none;">
        <div class="family-pet-photo" style="width:48px; height:48px; border-radius:var(--r); background:var(--primary-light); display:flex; align-items:center; justify-content:center; font-size:24px;">
          ${speciesEmoji(pet.species)}
        </div>
        <div class="family-pet-info" style="flex:1;">
          <div class="family-pet-name" style="font-weight:700; color:var(--text-1); font-size:15px;">
            ${pet.name} <span style="font-size:12px; color:var(--text-3);">${pet.sex === 'M' ? '♂️' : pet.sex === 'F' ? '♀️' : ''}</span>
          </div>
          <div class="family-pet-breed" style="font-size:12px; color:var(--text-3); margin-top:2px;">
            ${pet.breed || pet.species} • ${calcAge(pet.dob) || 'Unknown age'} • ${pet.weight_kg ? pet.weight_kg + ' kg' : '-'}
          </div>
        </div>
      </a>
    `).join('');
    } else {
        container.innerHTML = `<div style="color:var(--danger); padding:10px;">โหลดข้อมูลสัตว์เลี้ยงไม่สำเร็จ</div>`;
    }
}

async function loadActiveReservations(customer) {
    const listEl = document.getElementById('reservations-list');
    if (!listEl) return;

    listEl.innerHTML = '<div style="padding:40px;text-align:center"><div class="spinner"></div></div>';

    try {
        const res = await CustomerAPI.bookings.getAll({ customerid: customer.id });
        
        if (res.ok) {
            const allBookings = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            const activeBookings = allBookings.filter(b => 
                b.status !== 'CANCELLED' && b.status !== 'COMPLETED'
            );

            if (activeBookings.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state" style="padding:40px; text-align:center; color:var(--text-3);">
                        <div class="empty-state__icon" style="font-size:32px; margin-bottom:8px;">🛋️</div>
                        <div class="empty-state__text">You have no active reservations.</div>
                        <a href="ReservationForm.html" class="btn btn-primary" style="margin-top:16px; display:inline-block; text-decoration:none;">Book a Stay</a>
                    </div>`;
                return;
            }

            // 🟢 ดึงรายละเอียดเชิงลึก (เพิ่มความฉลาดในการดึงชื่อ)
            const detailedBookings = await Promise.all(
                activeBookings.map(async (booking) => {
                    try {
                        const detailRes = await CustomerAPI.bookings.getById(booking.bookingid || booking.booking_id);
                        
                        if (detailRes.ok) {
                            const data = detailRes.data?.data || detailRes.data || {};
                            
                            // ดักจับทุกชื่อ Array ที่ Backend อาจจะส่งมา
                            const items = data.pets || data.details || data.booking_details || data.bookingdetail || data.items || [];
                            
                            if (items.length > 0) {
                                let petNames = items.map(i => i.pet_name || i.petname || i.name).filter(Boolean);
                                let roomNos = items.map(i => i.room_number || i.roomnumber || i.room_no).filter(Boolean);
                                let roomTypes = items.map(i => i.room_type || i.roomtype || i.room_size || i.roomsize).filter(Boolean);
                                
                                // 🚨 สำคัญมาก: ถ้าหาชื่อสัตว์เลี้ยงไม่เจอ แต่มี pet_id ให้ไปดึงชื่อมาประกอบร่างเอง!
                                if (petNames.length === 0) {
                                    const petIds = items.map(i => i.pet_id || i.petid || i.pet).filter(Boolean);
                                    for (let pid of petIds) {
                                        const pRes = await CustomerAPI.pets.getById(pid);
                                        if (pRes.ok) {
                                            const pData = pRes.data?.data || pRes.data;
                                            petNames.push(pData.name || `Pet ID ${pid}`);
                                        }
                                    }
                                }

                                // 🚨 ถ้าหาเลขห้องไม่เจอ ให้แสดง Room ID มาก่อน
                                if (roomNos.length === 0) {
                                    const roomIds = items.map(i => i.room_id || i.roomid).filter(Boolean);
                                    roomNos = roomIds.map(id => `ID ${id}`); 
                                }

                                if (petNames.length > 0) booking.pet_name = petNames.join(', ');
                                if (roomNos.length > 0) booking.room_number = roomNos.join(', ');
                                if (roomTypes.length > 0) booking.room_type = roomTypes.join(', ');
                            } else {
                                // เผื่อข้อมูลหลุดมาอยู่ข้างนอก Array
                                booking.pet_name = data.pet_name || data.petname || booking.pet_name;
                                booking.room_number = data.room_number || data.roomnumber || booking.room_number;
                            }
                        }
                    } catch (e) {
                        console.error("Error matching details:", e);
                    }
                    return booking;
                })
            );

            listEl.innerHTML = detailedBookings.map(b => renderReservationCard(b)).join('');
        } else {
            listEl.innerHTML = '<div style="color:var(--danger); padding:20px;">ไม่สามารถโหลดข้อมูลการจองได้</div>';
        }
    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<div style="color:var(--danger); padding:20px;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

/* ── NOTIFICATIONS ─────────────────────────────────── */
async function loadNotifications() {
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    listEl.innerHTML = `<div style="padding:24px;text-align:center"><div class="spinner"></div></div>`;

    // เรียก API จริง (ถ้า Backend ยังไม่มีระบบ Notif มันจะคืนค่าว่างมา ซึ่งถูกต้องแล้ว)
    const res = await CustomerAPI.notifications.getAll({ limit: 5 });
    const notifications = (res.ok && res.data?.data) ? res.data.data : [];

    if (notifications.length === 0) {
        listEl.innerHTML = `
      <div class="empty-state" style="padding:40px; text-align:center; color:var(--text-3);">
        <div class="empty-state__icon" style="font-size:32px; margin-bottom:8px;">📭</div>
        <div class="empty-state__text">No new notifications</div>
      </div>`;
        return;
    }

    listEl.innerHTML = notifications.map(n => renderNotifItem(n)).join('');
}

function renderNotifItem(n) {
    const typeConfig = {
        CARE: { icon: '📋', cls: 'notif-icon--care', color: '#0D9488' },
        VACCINE: { icon: '💉', cls: 'notif-icon--vaccine', color: '#EF4444' },
        BOOKING: { icon: '📅', cls: 'notif-icon--booking', color: '#1557A0' },
        PAYMENT: { icon: '💳', cls: 'notif-icon--payment', color: '#C9943A' },
    };

    const cfg = typeConfig[n.type] || typeConfig.CARE;
    const time = timeAgo(n.sent_at);

    return `
    <div class="notif-item ${!n.is_read ? 'unread' : ''}" data-notif-id="${n.id}">
      <div class="notif-icon ${cfg.cls}">${cfg.icon}</div>
      <div class="notif-body">
        <div class="notif-title">${escHtml(n.title)}</div>
        <div class="notif-text">${escHtml(n.body || '')}</div>
        ${n.action ? `<a href="${n.action.href}" class="notif-link" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:var(--primary)">${n.action.label}</a>` : ''}
        <div class="notif-time">${time}</div>
      </div>
    </div>`;
}

async function markNotifRead(id) {
    if (!id) return;
    await CustomerAPI.notifications.markRead(id).catch(() => { });
}

async function markAllRead() {
    const res = await CustomerAPI.notifications.markAllRead();
    if (res.ok) {
        document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
        document.getElementById('notif-badge')?.style && (document.getElementById('notif-badge').style.display = 'none');
        showToast('All notifications marked as read', 'success');
    }
}

window.markAllRead = markAllRead;

function renderReservationCard(booking) {
    const checkin = new Date(booking.checkindate || booking.checkin_date);
    const checkout = new Date(booking.checkoutdate || booking.checkout_date);

    const checkinFmt = formatDate(booking.checkindate || booking.checkin_date, { month: 'short', day: 'numeric' });
    const checkoutFmt = formatDate(booking.checkoutdate || booking.checkout_date, { month: 'short', day: 'numeric' });

    const today = new Date();
    const totalDays = Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
    const daysDone = Math.max(0, Math.floor((today - checkin) / (1000 * 60 * 60 * 24)));
    let progress = Math.round((daysDone / totalDays) * 100);
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;

    let statusBadge = '';
    const status = (booking.status || '').toUpperCase();
    if (status === 'PENDING') statusBadge = '<span class="badge badge--yellow">Upcoming</span>';
    else if (status === 'CHECKED_IN' || status === 'ACTIVE') statusBadge = '<span class="badge badge--teal">Current Stay</span>';
    else statusBadge = `<span class="badge badge--gray">${status}</span>`;

    // 🟢 ดึงค่าอย่างปลอดภัย ป้องกันคำว่า 'undefined' โผล่ขึ้นมาที่หน้าจอเด็ดขาด
    const roomNo = booking.room_number || 'TBD';
    const roomType = booking.room_type || 'Standard';
    const petName = booking.pet_name || 'N/A';
    const bookingIdStr = String(booking.bookingid || booking.booking_id || '').padStart(4, '0');

    return `
    <div class="reservation-card" style="margin-bottom: 16px;">
      <div class="reservation-card__date-col">
        <div class="res-month">${checkin.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</div>
        <div class="res-day">${checkin.getDate()}</div>
      </div>
      <div class="reservation-card__body">
        <div class="reservation-card__status-row">
          ${statusBadge}
          <span class="reservation-card__id">#PS-${bookingIdStr}</span>
        </div>
        
        <div class="reservation-card__room" style="margin-top: 4px;">
          Room ${roomNo} <span style="font-size: 13px; font-weight: normal; color: var(--text-3);">(${roomType})</span>
        </div>
        
        <div class="reservation-card__meta" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border); display: flex; align-items: center; gap: 12px; font-size: 14px; color: var(--text-2);">
          <span>📅 ${checkinFmt} – ${checkoutFmt}</span>
          <span style="color: var(--primary-dark); font-weight: 600;">🐾 Pet: ${petName}</span>
        </div>
        
        <div class="stay-progress" style="margin-top: 12px;">
          <div class="stay-progress__labels">
            <span>Day ${Math.min(daysDone + 1, totalDays)} of ${totalDays}</span>
            <span>${progress}%</span>
          </div>
          <div class="stay-progress__bar">
            <div class="stay-progress__fill" style="width:${progress}%"></div>
          </div>
        </div>
        
        <div class="reservation-card__actions" style="margin-top: 12px;">
          <button class="btn btn-secondary btn-sm" onclick="viewReservation(${Number(booking.bookingid || booking.booking_id)})">
            View
          </button>
          ${status === 'PENDING' ? `<button class="btn btn-secondary btn-sm" onclick="cancelReservation(${Number(booking.bookingid || booking.booking_id)})">Cancel</button>` : ''}
        </div>
      </div>
    </div>`;
}

async function viewReservation(bookingId) {
    const res = await CustomerAPI.bookings.getById(bookingId);
    if (!res.ok) {
        showToast(res.data?.message || 'Unable to load reservation.', 'error');
        return;
    }
    const b = res.data?.data || res.data;
    showToast(`Reservation #PS-${String(bookingId).padStart(4, '0')}: ${b.pet_name || 'Pet'} in room ${b.room_number || 'TBD'}`, 'info');
}

async function cancelReservation(bookingId) {
    if (!confirm('Cancel this reservation?')) return;
    const res = await CustomerAPI.bookings.cancel(bookingId);
    if (res.ok) {
        showToast('Reservation cancelled.', 'success');
        const customer = checkCustomerAccess();
        if (customer) await loadActiveReservations(customer);
    } else {
        showToast(res.data?.message || 'Unable to cancel reservation.', 'error');
    }
}

window.viewReservation = viewReservation;
window.cancelReservation = cancelReservation;

/* ── HELPERS ─────────────────────────────────────────── */
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatDate(dateStr);
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function calcAge(dob) {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    return years > 0 ? `${years} yr${years !== 1 ? 's' : ''}` : 'Under 1 yr';
}
