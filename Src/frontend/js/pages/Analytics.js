/**
 * Analytics.js — Page logic for Analytics Dashboard (FR6)
 * Purrfect Stay Admin Panel
 * ใช้ Chart.js สำหรับกราฟ
 */

/* ── MOCK DATA ── */
const MOCK_ANALYTICS = {
  period: { start: '2026-04-01', end: '2026-04-30' },
  revenue: { total: 128500, room: 95000, addons: 33500 },
  bookings: { total: 42, checked_in: 12, checked_out: 26, cancelled: 4 },
  occupancy_rate: 0.84,
  top_addons: [
    { service: 'อาบน้ำ',       count: 18, revenue: 3600 },
    { service: 'ตัดขน',        count: 12, revenue: 4200 },
    { service: 'ตรวจสุขภาพ',  count: 8,  revenue: 3200 },
    { service: 'นวด',          count: 7,  revenue: 1750 },
    { service: 'ถ่ายรูป',      count: 14, revenue: 2100 },
  ],
  daily_revenue: [
    { date: '2026-04-01', amount: 3200 }, { date: '2026-04-02', amount: 4500 },
    { date: '2026-04-03', amount: 3800 }, { date: '2026-04-04', amount: 5200 },
    { date: '2026-04-05', amount: 4100 }, { date: '2026-04-06', amount: 6300 },
    { date: '2026-04-07', amount: 4800 }, { date: '2026-04-08', amount: 3600 },
    { date: '2026-04-09', amount: 4200 }, { date: '2026-04-10', amount: 5100 },
    { date: '2026-04-11', amount: 3900 }, { date: '2026-04-12', amount: 4700 },
    { date: '2026-04-13', amount: 5500 }, { date: '2026-04-14', amount: 6100 },
    { date: '2026-04-15', amount: 4300 }, { date: '2026-04-16', amount: 3700 },
    { date: '2026-04-17', amount: 4900 }, { date: '2026-04-18', amount: 5300 },
    { date: '2026-04-19', amount: 4600 }, { date: '2026-04-20', amount: 5800 },
  ],
};

let revenueChart = null;
let bookingChart = null;

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  const data = MOCK_ANALYTICS; // TODO: replace with API call

  // TODO: เชื่อม API จริง — uncomment
  // const res = await window.API.analytics.getDashboard({
  //   start_date: document.getElementById('an-from').value,
  //   end_date:   document.getElementById('an-to').value,
  // });
  // const data = res.ok ? res.data : MOCK_ANALYTICS;

  renderKPIs(data);
  renderRevenueChart(data);
  renderBookingChart(data);
  renderTopAddons(data);
  renderStatusSummary(data);
});

/* ── KPI CARDS ── */
function renderKPIs(data) {
  document.getElementById('kpi-revenue').textContent     = `฿${(data.revenue.total / 1000).toFixed(0)}K`;
  document.getElementById('kpi-bookings').textContent    = data.bookings.total;
  document.getElementById('kpi-occupancy').textContent   = `${Math.round(data.occupancy_rate * 100)}%`;
  document.getElementById('kpi-avg-bill').textContent    = `฿${Math.round(data.revenue.total / data.bookings.total).toLocaleString()}`;
}

/* ── REVENUE CHART (Line) ── */
function renderRevenueChart(data) {
  const ctx = document.getElementById('chart-revenue')?.getContext('2d');
  if (!ctx) return;

  if (revenueChart) revenueChart.destroy();

  const labels  = data.daily_revenue.map(d => formatShortDate(d.date));
  const amounts = data.daily_revenue.map(d => d.amount);

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

  const { checked_in, checked_out, cancelled, total } = data.bookings;
  const pending = total - checked_in - checked_out - cancelled;

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

  // Status list
  renderStatusSummary(data);
}

function renderStatusSummary(data) {
  const { checked_in, checked_out, cancelled, total } = data.bookings;
  const pending = total - checked_in - checked_out - cancelled;
  const items = [
    { label: 'กำลังเข้าพัก', val: checked_in, color: '#16A34A' },
    { label: 'Checked Out',   val: checked_out, color: '#4F46E5' },
    { label: 'รอยืนยัน',    val: pending,     color: '#D97706' },
    { label: 'ยกเลิก',      val: cancelled,   color: '#DC2626' },
  ];
  const container = document.getElementById('status-list');
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="an-status-row">
      <div class="an-status-dot" style="background:${item.color}"></div>
      <div class="an-status-label">${item.label}</div>
      <div class="an-status-val">${item.val}</div>
      <div class="an-status-pct">${Math.round(item.val/total*100)}%</div>
    </div>
  `).join('');
}

/* ── TOP ADDONS ── */
function renderTopAddons(data) {
  const container = document.getElementById('top-addons');
  if (!container) return;

  const maxCount = Math.max(...data.top_addons.map(a => a.count));
  container.innerHTML = data.top_addons
    .sort((a, b) => b.count - a.count)
    .map((addon, i) => `
      <div class="an-addon-row">
        <div class="an-addon-rank">${i + 1}</div>
        <div class="an-addon-label">${addon.service}</div>
        <div class="an-addon-bar-wrap">
          <div class="an-addon-bar">
            <div class="an-addon-fill" style="width:${Math.round(addon.count/maxCount*100)}%"></div>
          </div>
        </div>
        <div class="an-addon-count">${addon.count} ครั้ง</div>
        <div class="an-addon-rev">฿${addon.revenue.toLocaleString()}</div>
      </div>
    `).join('');
}

/* ── REFRESH ── */
async function refreshData() {
  const from = document.getElementById('an-from').value;
  const to   = document.getElementById('an-to').value;

  // TODO: เชื่อม API จริง
  // const res = await window.API.analytics.getDashboard({ start_date: from, end_date: to });
  // const data = res.ok ? res.data : MOCK_ANALYTICS;

  const data = MOCK_ANALYTICS; // ชั่วคราวใช้ mock
  renderKPIs(data);
  renderRevenueChart(data);
  renderBookingChart(data);
  renderTopAddons(data);
  renderStatusSummary(data);

  showToast('🔄 โหลดข้อมูลเรียบร้อยแล้ว');
}

/* ── UTILS ── */
function formatShortDate(s) {
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
