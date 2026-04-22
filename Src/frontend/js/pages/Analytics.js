/**
 * Analytics.js — Page logic for Analytics Dashboard (FR6)
 * Purrfect Stay Admin Panel
 * ใช้ Chart.js สำหรับกราฟ
 */

/* ── MOCK DATA (ใช้เป็น Fallback กรณี API พังเท่านั้น) ── */
const MOCK_ANALYTICS = {
  period: { start: '2026-04-01', end: '2026-04-30' },
  revenue: { total: 0, room: 0, addons: 0 },
  bookings: { total: 0, checked_in: 0, checked_out: 0, cancelled: 0 },
  occupancy_rate: 0,
  low_stock_alert: 0,
  top_addons: [],
  daily_revenue: [],
};

let revenueChart = null;
let bookingChart = null;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  // ตั้งค่าวันที่ Default ให้เป็นต้นเดือนถึงวันนี้ (ถ้า input ว่าง)
  const fromInput = document.getElementById('an-from');
  const toInput   = document.getElementById('an-to');
  
  if (!fromInput.value || !toInput.value) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // แปลงเป็น YYYY-MM-DD แบบ Local time (ไทย)
    toInput.value   = today.toLocaleDateString('en-CA'); 
    fromInput.value = firstDay.toLocaleDateString('en-CA');
  }

  // โหลดข้อมูลจริงทันทีที่เปิดหน้า
  await refreshData();
});

/* ── FETCH & REFRESH DATA ── */
async function refreshData() {
  const from = document.getElementById('an-from').value;
  const to   = document.getElementById('an-to').value;

  try {
    // ยิง API ไปที่ /api/analytics/dashboard
    const res = await window.API.analytics.getDashboard({ start_date: from, end_date: to });
    
    if (res.ok) {
      // ดึงก้อนข้อมูล (รองรับทั้งเคสที่ api.js ห่อ data มา 1 หรือ 2 ชั้น)
      const data = res.data.data || res.data;
      
      renderAll(data);
      showToast('🔄 โหลดข้อมูลล่าสุดเรียบร้อยแล้ว');
    } else {
      console.error('โหลดข้อมูล Analytics ไม่สำเร็จ:', res.message);
      renderAll(MOCK_ANALYTICS);
      showToast('⚠️ ไม่สามารถดึงข้อมูลได้ แสดงข้อมูลว่างเปล่า');
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ API:', error);
    renderAll(MOCK_ANALYTICS);
    showToast('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

/* ── MASTER RENDERER ── */
function renderAll(data) {
  if (!data) return;
  renderKPIs(data);
  renderRevenueChart(data);
  renderBookingChart(data);
  renderTopAddons(data);
  renderStatusSummary(data);
}

/* ── KPI CARDS ── */
function renderKPIs(data) {
  // จัดการตัวเลขให้เป็น Format ที่ถูกต้องและป้องกันค่า NaN
  const revTotal = data.revenue?.total || 0;
  const bookTotal = data.bookings?.total || 0;
  const occRate = data.occupancy_rate || 0;
  
  // คำนวณค่าเฉลี่ยต่อบิล (ป้องกันหารด้วย 0)
  const avgBill = bookTotal > 0 ? Math.round(revTotal / bookTotal) : 0;

  const revEl = document.getElementById('kpi-revenue');
  if (revEl) revEl.textContent = `฿${(revTotal / 1000).toLocaleString(undefined, {minimumFractionDigits: 1, maximumFractionDigits: 1})}K`;
  
  const bookEl = document.getElementById('kpi-bookings');
  if (bookEl) bookEl.textContent = bookTotal;
  
  const occEl = document.getElementById('kpi-occupancy');
  if (occEl) occEl.textContent = `${Math.round(occRate * 100)}%`;
  
  const avgEl = document.getElementById('kpi-avg-bill');
  if (avgEl) avgEl.textContent = `฿${avgBill.toLocaleString()}`;
}

/* ── REVENUE CHART (Line) ── */
function renderRevenueChart(data) {
  const ctx = document.getElementById('chart-revenue')?.getContext('2d');
  if (!ctx) return;

  if (revenueChart) revenueChart.destroy();

  const daily = data.daily_revenue || [];
  const labels  = daily.map(d => formatShortDate(d.date));
  const amounts = daily.map(d => d.amount);

  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'รายรับ (฿)',
        data: amounts,
        fill: true,
        backgroundColor: 'rgba(79,70,229,.1)',
        borderColor: '#4F46E5',
        borderWidth: 2.5,
        tension: 0.4,
        pointBackgroundColor: '#4F46E5',
        pointRadius: 3,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => `฿${ctx.raw.toLocaleString()}` }
      }},
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#9CA3AF', maxTicksLimit: 10 } },
        y: { grid: { color: '#F3F4F6' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#9CA3AF', callback: v => `฿${(v/1000).toFixed(0)}K` } },
      },
    },
  });
}

/* ── BOOKING STATUS CHART (Doughnut) ── */
function renderBookingChart(data) {
  const ctx = document.getElementById('chart-booking')?.getContext('2d');
  if (!ctx) return;

  if (bookingChart) bookingChart.destroy();

  const checked_in  = data.bookings?.checked_in || 0;
  const checked_out = data.bookings?.checked_out || 0;
  const cancelled   = data.bookings?.cancelled || 0;
  const total       = data.bookings?.total || 0;
  
  // Pending คือรายการที่สร้างแล้วแต่ยังไม่ได้ Check-in หรือยกเลิก
  const pending = Math.max(0, total - checked_in - checked_out - cancelled);

  // ถ้าไม่มีข้อมูลเลย ให้แสดงกราฟว่างๆ สีเทา
  if (total === 0) {
    bookingChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ไม่มีข้อมูล'],
        datasets: [{ data: [1], backgroundColor: ['#E5E7EB'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { tooltip: { enabled: false } } }
    });
    return;
  }

  bookingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['กำลังเข้าพัก', 'Checked Out', 'ยกเลิก', 'รอยืนยัน'],
      datasets: [{
        data: [checked_in, checked_out, cancelled, pending],
        backgroundColor: ['#16A34A', '#4F46E5', '#DC2626', '#D97706'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw} รายการ` } },
      },
    },
  });
}

function renderStatusSummary(data) {
  const container = document.getElementById('status-list');
  if (!container) return;

  const checked_in  = data.bookings?.checked_in || 0;
  const checked_out = data.bookings?.checked_out || 0;
  const cancelled   = data.bookings?.cancelled || 0;
  const total       = data.bookings?.total || 1; // กันหาร 0
  const pending     = Math.max(0, data.bookings?.total - checked_in - checked_out - cancelled);

  const items = [
    { label: 'กำลังเข้าพัก', val: checked_in, color: '#16A34A' },
    { label: 'Checked Out',  val: checked_out, color: '#4F46E5' },
    { label: 'รอยืนยัน',    val: pending,     color: '#D97706' },
    { label: 'ยกเลิก',      val: cancelled,   color: '#DC2626' },
  ];
  
  container.innerHTML = items.map(item => `
    <div class="an-status-row">
      <div class="an-status-dot" style="background:${item.color}"></div>
      <div class="an-status-label">${item.label}</div>
      <div class="an-status-val">${item.val}</div>
      <div class="an-status-pct">${Math.round((item.val/total)*100)}%</div>
    </div>
  `).join('');
}

/* ── TOP ADDONS ── */
function renderTopAddons(data) {
  const container = document.getElementById('top-addons');
  if (!container) return;

  const addons = data.top_addons || [];
  if (addons.length === 0) {
    container.innerHTML = '<div style="color:var(--text-3); text-align:center; padding: 20px 0;">ไม่พบข้อมูลบริการเสริมในช่วงเวลานี้</div>';
    return;
  }

  const maxCount = Math.max(...addons.map(a => a.count));
  container.innerHTML = addons
    .sort((a, b) => b.count - a.count)
    .map((addon, i) => `
      <div class="an-addon-row">
        <div class="an-addon-rank">${i + 1}</div>
        <div class="an-addon-label">${addon.service}</div>
        <div class="an-addon-bar-wrap">
          <div class="an-addon-bar">
            <div class="an-addon-fill" style="width:${maxCount > 0 ? Math.round((addon.count/maxCount)*100) : 0}%"></div>
          </div>
        </div>
        <div class="an-addon-count">${addon.count} ครั้ง</div>
        <div class="an-addon-rev">฿${addon.revenue.toLocaleString()}</div>
      </div>
    `).join('');
}

/* ── UTILS ── */
function formatShortDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function showToast(msg) {
  document.getElementById('an-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'an-toast'; t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:#EEF2FF;color:#3730A3;border:1.5px solid #A5B4FC;padding:12px 20px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.12);animation:slideUp .3s ease;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}