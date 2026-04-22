/**
 * Analytics.js — FR6 Analytics Dashboard
 * Purrfect Stay Admin Panel
 *
 * แก้ไขจาก version เดิม:
 *   - Revenue split: เปลี่ยนจาก hardcode ใน HTML → ใช้ข้อมูลจาก API จริง
 *   - เพิ่ม renderSpeciesChart()   — pet_ratio จาก API
 *   - เพิ่ม renderLowStockAlert()  — low_stock_alert จาก API
 *   - เพิ่ม pending count ในกราฟ Booking donut
 *   - เพิ่ม revenue growth trend ใน KPI card
 *   - เพิ่ม loading/skeleton state
 */

/* ─── MODULE-LEVEL STATE ───────────────────────────────────── */
let _revenueChart     = null;
let _bookingChart     = null;
let _revenueSplit     = null;
let _speciesChart     = null;

/* ─── FALLBACK (ถ้า API ล้มเหลว แสดงค่าว่าง) ─────────────── */
const EMPTY_DATA = {
  period:         { start: '', end: '' },
  revenue:        { total: 0, room: 0, addons: 0, avg_bill: 0, growth_pct: null, prev_total: 0 },
  bookings:       { total: 0, checked_in: 0, checked_out: 0, cancelled: 0, pending: 0 },
  occupancy_rate: 0,
  low_stock_alert: 0,
  low_stock_items: [],
  pet_ratio:      {},
  top_addons:     [],
  daily_revenue:  [],
};

/* ─── INIT ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  _setDefaultDates();
  _setLoading(true);
  await refreshData();
});

function _setDefaultDates() {
  const fromEl = document.getElementById('an-from');
  const toEl   = document.getElementById('an-to');
  if (fromEl && !fromEl.value) {
    const today    = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    toEl.value   = today.toLocaleDateString('en-CA');
    fromEl.value = firstDay.toLocaleDateString('en-CA');
  }
}

/* ─── FETCH & REFRESH ──────────────────────────────────────── */
async function refreshData() {
  const from = document.getElementById('an-from')?.value;
  const to   = document.getElementById('an-to')?.value;

  _setLoading(true);

  try {
    const res  = await window.API.analytics.getDashboard({ start_date: from, end_date: to });

    if (res.ok) {
      // api.js ห่อ data มา 1 ชั้น → res.data; backend ห่ออีก 1 ชั้น → res.data.data
      const data = res.data?.data ?? res.data;
      renderAll(data);
      _showToast('🔄 โหลดข้อมูลล่าสุดเรียบร้อย');
    } else {
      console.warn('[Analytics] API returned error:', res);
      renderAll(EMPTY_DATA);
      _showToast('⚠️ ดึงข้อมูลไม่สำเร็จ — แสดงข้อมูลว่าง');
    }
  } catch (err) {
    console.error('[Analytics] Network error:', err);
    renderAll(EMPTY_DATA);
    _showToast('❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
  } finally {
    _setLoading(false);
  }
}

/* ─── MASTER RENDERER ──────────────────────────────────────── */
function renderAll(data) {
  if (!data) return;
  renderKPIs(data);
  renderLowStockAlert(data);
  renderRevenueChart(data);
  renderBookingChart(data);
  renderStatusSummary(data);
  renderTopAddons(data);
  renderRevenueSplit(data);
  renderSpeciesChart(data);
}

/* ─── 1. KPI CARDS ─────────────────────────────────────────── */
function renderKPIs(data) {
  const rev      = data.revenue   || {};
  const bk       = data.bookings  || {};
  const occRate  = data.occupancy_rate ?? 0;
  const total    = rev.total    ?? 0;
  const avgBill  = rev.avg_bill ?? (bk.total > 0 ? Math.round(total / bk.total) : 0);
  const growth   = rev.growth_pct; // null = ไม่มีข้อมูลเปรียบเทียบ

  // รายรับรวม
  _setText('kpi-revenue', `฿${_fmt(total / 1000, 1)}K`);

  // Revenue trend (growth_pct จาก backend)
  const trendEl = document.getElementById('kpi-revenue-trend');
  if (trendEl) {
    if (growth === null || growth === undefined) {
      trendEl.className = 'an-kpi-trend neutral';
      trendEl.textContent = 'ไม่มีข้อมูลช่วงก่อน';
    } else if (growth >= 0) {
      trendEl.className = 'an-kpi-trend up';
      trendEl.textContent = `↑ +${growth}% จากช่วงก่อน`;
    } else {
      trendEl.className = 'an-kpi-trend down';
      trendEl.textContent = `↓ ${growth}% จากช่วงก่อน`;
    }
  }

  // การจองทั้งหมด
  _setText('kpi-bookings', bk.total ?? 0);
  const bkSub = document.getElementById('kpi-bookings-sub');
  if (bkSub) {
    const activeCount = bk.checked_in ?? 0;
    bkSub.textContent = activeCount > 0 ? `กำลังเข้าพัก ${activeCount} รายการ` : 'ในช่วงที่เลือก';
  }

  // Occupancy Rate
  _setText('kpi-occupancy', `${Math.round(occRate * 100)}%`);
  const occSub = document.getElementById('kpi-occ-sub');
  if (occSub) {
    const total_rooms = _getRoomHint(occRate);
    occSub.textContent = total_rooms;
  }

  // รายรับเฉลี่ย/บิล
  _setText('kpi-avg-bill', `฿${Math.round(avgBill).toLocaleString()}`);
}

function _getRoomHint(rate) {
  if (rate === 1) return 'เต็มทุกห้อง!';
  if (rate >= 0.8) return 'ใกล้เต็มแล้ว';
  if (rate === 0) return 'ไม่มีการเข้าพัก';
  return 'เฉลี่ยทั้งเดือน';
}

/* ─── 2. LOW STOCK ALERT ───────────────────────────────────── */
function renderLowStockAlert(data) {
  const count = data.low_stock_alert ?? 0;
  const items = data.low_stock_items ?? [];

  // Badge ใน toolbar
  const badge = document.getElementById('an-stock-badge');
  const countEl = document.getElementById('an-stock-count');
  if (badge) {
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
    if (countEl) countEl.textContent = count;
  }

  // Alert bar
  const bar = document.getElementById('an-alert-bar');
  if (!bar) return;

  if (count === 0) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  const bodyEl = document.getElementById('an-alert-items');
  if (bodyEl && items.length > 0) {
    const names = items.map(i => `<strong>${i.name}</strong> (เหลือ ${i.in_stock})`).join(', ');
    bodyEl.innerHTML = `&nbsp;— ${names}`;
  } else if (bodyEl) {
    bodyEl.textContent = `&nbsp;— ${count} รายการต้องสั่งซื้อเพิ่ม`;
  }
}

/* ─── 3. REVENUE CHART (Line) ──────────────────────────────── */
function renderRevenueChart(data) {
  const ctx = document.getElementById('chart-revenue')?.getContext('2d');
  if (!ctx) return;
  if (_revenueChart) _revenueChart.destroy();

  const daily   = data.daily_revenue ?? [];
  const labels  = daily.map(d => _fmtShortDate(d.date));
  const amounts = daily.map(d => d.amount);

  if (daily.length === 0) {
    _drawEmptyChart(ctx, 'ไม่มีรายการชำระเงินในช่วงนี้');
    return;
  }

  _revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'รายรับ (฿)',
        data: amounts,
        fill: true,
        backgroundColor: 'rgba(79,70,229,.08)',
        borderColor: '#4F46E5',
        borderWidth: 2.5,
        tension: 0.4,
        pointBackgroundColor: '#4F46E5',
        pointRadius: 4,
        pointHoverRadius: 7,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => `฿${c.raw.toLocaleString()}` },
          backgroundColor: '#1E1B4B',
          titleFont: { family: 'DM Sans', size: 12 },
          bodyFont:  { family: 'DM Sans', size: 13 },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'DM Sans', size: 11 }, color: '#9CA3AF', maxTicksLimit: 12 },
        },
        y: {
          grid: { color: '#F3F4F6' },
          ticks: {
            font: { family: 'DM Sans', size: 11 },
            color: '#9CA3AF',
            callback: v => `฿${(v / 1000).toFixed(0)}K`,
          },
        },
      },
    },
  });
}

/* ─── 4. BOOKING STATUS CHART (Doughnut) ──────────────────── */
function renderBookingChart(data) {
  const ctx = document.getElementById('chart-booking')?.getContext('2d');
  if (!ctx) return;
  if (_bookingChart) _bookingChart.destroy();

  const bk          = data.bookings ?? {};
  const checked_in  = bk.checked_in  ?? 0;
  const checked_out = bk.checked_out ?? 0;
  const cancelled   = bk.cancelled   ?? 0;
  const pending     = bk.pending     ?? 0; // มาจาก backend โดยตรงแล้ว ไม่ต้องคำนวณ
  const total       = bk.total       ?? 0;

  if (total === 0) {
    _bookingChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['ไม่มีข้อมูล'],
        datasets: [{ data: [1], backgroundColor: ['#E5E7EB'], borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { tooltip: { enabled: false } } },
    });
    return;
  }

  _bookingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['กำลังเข้าพัก', 'Checked Out', 'รอยืนยัน', 'ยกเลิก'],
      datasets: [{
        data: [checked_in, checked_out, pending, cancelled],
        backgroundColor: ['#16A34A', '#4F46E5', '#D97706', '#DC2626'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} รายการ` } },
      },
    },
  });
}

function renderStatusSummary(data) {
  const container = document.getElementById('status-list');
  if (!container) return;

  const bk      = data.bookings ?? {};
  const total   = Math.max(bk.total ?? 0, 1);
  const items   = [
    { label: 'กำลังเข้าพัก', val: bk.checked_in  ?? 0, color: '#16A34A' },
    { label: 'Checked Out',   val: bk.checked_out ?? 0, color: '#4F46E5' },
    { label: 'รอยืนยัน',     val: bk.pending      ?? 0, color: '#D97706' },
    { label: 'ยกเลิก',        val: bk.cancelled   ?? 0, color: '#DC2626' },
  ];

  container.innerHTML = items.map(item => `
    <div class="an-status-row">
      <div class="an-status-dot" style="background:${item.color}"></div>
      <div class="an-status-label">${item.label}</div>
      <div class="an-status-val">${item.val}</div>
      <div class="an-status-pct">${Math.round((item.val / total) * 100)}%</div>
    </div>
  `).join('');
}

/* ─── 5. TOP ADD-ON SERVICES ───────────────────────────────── */
function renderTopAddons(data) {
  const container = document.getElementById('top-addons');
  if (!container) return;

  const addons = data.top_addons ?? [];
  if (addons.length === 0) {
    container.innerHTML = '<div class="an-empty-state">ไม่พบข้อมูลบริการเสริมในช่วงเวลานี้</div>';
    return;
  }

  const maxCount = Math.max(...addons.map(a => a.count), 1);
  container.innerHTML = addons
    .sort((a, b) => b.revenue - a.revenue)
    .map((addon, i) => `
      <div class="an-addon-row">
        <div class="an-addon-rank">${i + 1}</div>
        <div class="an-addon-info">
          <div class="an-addon-label">${addon.service}</div>
          <div class="an-addon-bar-wrap">
            <div class="an-addon-bar">
              <div class="an-addon-fill" style="width:${Math.round((addon.count / maxCount) * 100)}%"></div>
            </div>
          </div>
        </div>
        <div class="an-addon-stats">
          <div class="an-addon-count">${addon.count} ครั้ง</div>
          <div class="an-addon-rev">฿${addon.revenue.toLocaleString()}</div>
        </div>
      </div>
    `).join('');
}

/* ─── 6. REVENUE SPLIT DONUT ───────────────────────────────── */
//  BUG FIX: version เดิมใช้ข้อมูล hardcode [95000, 33500] ใน HTML
//  แก้ไขให้ใช้ข้อมูลจาก API จริงทุกครั้งที่ refreshData()
function renderRevenueSplit(data) {
  const ctx = document.getElementById('chart-revenue-split')?.getContext('2d');
  if (!ctx) return;
  if (_revenueSplit) _revenueSplit.destroy();

  const room   = data.revenue?.room   ?? 0;
  const addons = data.revenue?.addons ?? 0;

  if (room === 0 && addons === 0) {
    _drawEmptyChart(ctx, 'ไม่มีรายรับในช่วงนี้');
    _renderSplitLegend(0, 0);
    return;
  }

  _revenueSplit = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['ค่าห้องพัก', 'Add-on Services'],
      datasets: [{
        data: [room, addons],
        backgroundColor: ['#4F46E5', '#0D9488'],
        borderWidth: 0,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `${c.label}: ฿${c.raw.toLocaleString()}` } },
      },
    },
  });

  _renderSplitLegend(room, addons);
}

function _renderSplitLegend(room, addons) {
  const el = document.getElementById('split-legend');
  if (!el) return;
  const total = room + addons || 1;
  el.innerHTML = [
    { label: 'ค่าห้องพัก',      val: room,   color: '#4F46E5' },
    { label: 'Add-on Services', val: addons, color: '#0D9488' },
  ].map(item => `
    <div class="an-split-row">
      <span class="an-split-dot" style="background:${item.color}"></span>
      <span class="an-split-label">${item.label}</span>
      <span class="an-split-pct">${Math.round((item.val / total) * 100)}%</span>
      <span class="an-split-val">฿${item.val.toLocaleString()}</span>
    </div>
  `).join('');
}

/* ─── 7. PET SPECIES CHART ─────────────────────────────────── */
function renderSpeciesChart(data) {
  const ctx       = document.getElementById('chart-species')?.getContext('2d');
  const wrapEl    = document.getElementById('an-species-wrap');
  const petRatio  = data.pet_ratio ?? {};
  const entries   = Object.entries(petRatio);

  const SPECIES_CONFIG = {
    DOG:   { label: 'สุนัข 🐶', color: '#4F46E5' },
    CAT:   { label: 'แมว 🐱',   color: '#0D9488' },
    BIRD:  { label: 'นก 🐦',    color: '#D97706' },
    OTHER: { label: 'อื่นๆ',    color: '#9CA3AF' },
  };

  // Pills summary
  if (wrapEl) {
    if (entries.length === 0) {
      wrapEl.innerHTML = '<div class="an-empty-state">ไม่มีข้อมูลในช่วงนี้</div>';
    } else {
      const total = entries.reduce((s, [, v]) => s + v, 0);
      wrapEl.innerHTML = `
        <div class="an-species-pills">
          ${entries.map(([sp, cnt]) => {
            const cfg = SPECIES_CONFIG[sp] ?? SPECIES_CONFIG.OTHER;
            const pct = Math.round((cnt / total) * 100);
            return `<div class="an-species-pill" style="--sp-color:${cfg.color}">
              <span class="an-species-name">${cfg.label}</span>
              <span class="an-species-cnt">${cnt} ตัว</span>
              <span class="an-species-pct">${pct}%</span>
            </div>`;
          }).join('')}
        </div>`;
    }
  }

  // Doughnut
  if (!ctx) return;
  if (_speciesChart) _speciesChart.destroy();

  if (entries.length === 0) {
    _drawEmptyChart(ctx, '');
    return;
  }

  _speciesChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   entries.map(([sp]) => SPECIES_CONFIG[sp]?.label ?? sp),
      datasets: [{
        data:            entries.map(([, v]) => v),
        backgroundColor: entries.map(([sp]) => SPECIES_CONFIG[sp]?.color ?? '#9CA3AF'),
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'DM Sans', size: 12 }, padding: 12 } },
        tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} ตัว` } },
      },
    },
  });
}

/* ─── LOADING STATE ────────────────────────────────────────── */
function _setLoading(isLoading) {
  const btn = document.getElementById('an-refresh-btn');
  const ico = document.getElementById('an-refresh-icon');
  if (btn) btn.disabled = isLoading;
  if (ico) ico.style.animation = isLoading ? 'spin 1s linear infinite' : '';
}

/* ─── UTILS ────────────────────────────────────────────────── */
function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function _fmt(n, decimals = 0) {
  return (n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function _fmtShortDate(s) {
  if (!s) return '';
  return new Date(s + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function _drawEmptyChart(ctx, msg) {
  // วาด placeholder สีเทาเมื่อไม่มีข้อมูล
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [msg || 'ไม่มีข้อมูล'],
      datasets: [{ data: [1], backgroundColor: ['#E5E7EB'], borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        tooltip: { enabled: false },
        legend: {
          labels: { color: '#9CA3AF', font: { family: 'DM Sans', size: 12 } },
        },
      },
    },
  });
  return chart;
}

function _showToast(msg) {
  document.getElementById('an-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'an-toast';
  t.textContent = msg;
  t.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    'background:#EEF2FF', 'color:#3730A3',
    'border:1.5px solid #A5B4FC',
    'padding:12px 20px', 'border-radius:14px',
    "font-family:'DM Sans',sans-serif", 'font-size:14px', 'font-weight:500',
    'box-shadow:0 8px 24px rgba(0,0,0,.12)',
    'animation:slideUp .3s ease',
  ].join(';');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}