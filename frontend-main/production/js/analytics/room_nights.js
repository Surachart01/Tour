(function () {
  'use strict';

  const state = { report: null, loading: false };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '-';
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  }

  function setLoading(active) {
    state.loading = active;
    document.getElementById('loadingPanel').classList.toggle('active', active);
    document.querySelectorAll('#refreshReport, #printReport, #exportCsv, #previousMonth, #nextMonth').forEach((button) => {
      button.disabled = active;
    });
  }

  function selectedPeriod() {
    const value = document.getElementById('periodMonth').value;
    if (!/^\d{4}-\d{2}$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    return { year, month };
  }

  function shiftMonth(offset) {
    const period = selectedPeriod();
    if (!period) return;
    const next = new Date(Date.UTC(period.year, period.month - 1 + offset, 1));
    document.getElementById('periodMonth').value = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    loadReport();
  }

  function populateHotels(hotels) {
    const select = document.getElementById('hotelFilter');
    const selected = select.value;
    select.innerHTML = '<option value="">All Hotels</option>' + hotels.map((hotel) => {
      const city = hotel.city ? ` - ${hotel.city}` : '';
      return `<option value="${hotel.id}">${escapeHtml(hotel.name)}${escapeHtml(city)}</option>`;
    }).join('');
    if ([...select.options].some((option) => option.value === selected)) select.value = selected;
  }

  function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="text-center text-muted" style="padding:28px">${escapeHtml(message)}</td></tr>`;
  }

  function renderReport(report) {
    state.report = report;
    populateHotels(report.hotels || []);
    const totals = report.totals || {};
    document.getElementById('totalRoomNights').textContent = Number(totals.room_nights || 0).toLocaleString('en-US');
    document.getElementById('totalRooms').textContent = Number(totals.rooms || 0).toLocaleString('en-US');
    document.getElementById('totalBookings').textContent = Number(totals.booking_items || 0).toLocaleString('en-US');
    document.getElementById('totalHotels').textContent = Number(totals.hotels || 0).toLocaleString('en-US');
    document.getElementById('periodLabel').textContent = report.period?.label || '';

    const summary = report.hotel_summary || [];
    document.getElementById('hotelSummaryBody').innerHTML = summary.length ? summary.map((hotel) => `
      <tr>
        <td><strong>${escapeHtml(hotel.hotel_name)}</strong></td>
        <td>${escapeHtml(hotel.city || '-')}</td>
        <td class="number-cell">${Number(hotel.booking_items || 0).toLocaleString('en-US')}</td>
        <td class="number-cell">${Number(hotel.rooms || 0).toLocaleString('en-US')}</td>
        <td class="number-cell room-night-value">${Number(hotel.room_nights || 0).toLocaleString('en-US')}</td>
      </tr>`).join('') : emptyRow(5, 'No hotel summary for this period');

    const rows = report.rows || [];
    document.getElementById('detailCount').textContent = `${rows.length.toLocaleString('en-US')} item${rows.length === 1 ? '' : 's'}`;
    document.getElementById('roomNightRows').innerHTML = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.file_number || '-')}</td>
        <td>${escapeHtml(row.client_name || '-')}</td>
        <td>${escapeHtml(row.agent_name || '-')}</td>
        <td><strong>${escapeHtml(row.hotel_name)}</strong>${row.special_package ? '<br><small class="label label-purple">Special Package</small>' : ''}</td>
        <td>${escapeHtml(row.room_type || '-')}</td>
        <td>${formatDate(row.check_in)}${row.early_check_in ? '<br><small class="text-info">Early Check-In</small>' : ''}</td>
        <td>${formatDate(row.check_out)}</td>
        <td class="number-cell">${Number(row.rooms || 0).toLocaleString('en-US')}</td>
        <td class="number-cell">${Number(row.occupied_nights || 0).toLocaleString('en-US')}</td>
        <td class="number-cell room-night-value">${Number(row.room_nights || 0).toLocaleString('en-US')}</td>
      </tr>`).join('');
    document.getElementById('emptyState').style.display = rows.length ? 'none' : 'block';
    document.getElementById('printReport').disabled = rows.length === 0;
    document.getElementById('exportCsv').disabled = rows.length === 0;
  }

  async function loadReport() {
    if (state.loading) return;
    const period = selectedPeriod();
    if (!period) return;
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    const hotelId = document.getElementById('hotelFilter').value;
    const query = new URLSearchParams({ year: period.year, month: period.month });
    if (hotelId) query.set('hotel_id', hotelId);
    setLoading(true);
    try {
      const response = await fetch(`${Endpoint}/api/v1/analytics/room-nights?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
      }
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load room nights.');
      }
      renderReport(await response.json());
    } catch (error) {
      console.error(error);
      alert(`Failed to load room nights. ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const report = state.report;
    if (!report?.rows?.length) return;
    const lines = [[
      'File Number', 'Client', 'Agent', 'Hotel', 'City', 'Room Type', 'Check-In', 'Check-Out', 'Rooms', 'Nights in Month', 'Room Nights'
    ].map(csvCell).join(',')];
    report.rows.forEach((row) => lines.push([
      row.file_number, row.client_name, row.agent_name, row.hotel_name, row.city, row.room_type,
      row.check_in, row.check_out, row.rooms, row.occupied_nights, row.room_nights
    ].map(csvCell).join(',')));
    const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `room-nights-${report.period.year}-${String(report.period.month).padStart(2, '0')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    const report = state.report;
    if (!report?.rows?.length) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) {
      alert('Please allow pop-ups to print the report.');
      return;
    }
    const selectedHotel = document.getElementById('hotelFilter').selectedOptions[0]?.textContent || 'All Hotels';
    popup.document.write(`<!DOCTYPE html><html><head><title>Room Nights - ${escapeHtml(report.period.label)}</title><style>
      body{font-family:Tahoma,Arial,sans-serif;color:#243b53;margin:28px}h1{font-size:22px;margin:0 0 4px}.meta{color:#627d98;margin-bottom:18px}
      .totals{display:flex;gap:22px;margin:14px 0 20px}.totals strong{font-size:20px;display:block}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #9fb3c8;padding:6px;text-align:left}th{background:#243b53;color:#fff}.num{text-align:right}.section{font-size:15px;margin:20px 0 7px}@page{size:A4 landscape;margin:12mm}
    </style></head><body><h1>Room Nights Report</h1><div class="meta">${escapeHtml(report.period.label)} | ${escapeHtml(selectedHotel)}</div>
      <div class="totals"><div><strong>${report.totals.room_nights}</strong>Room Nights</div><div><strong>${report.totals.rooms}</strong>Rooms</div><div><strong>${report.totals.booking_items}</strong>Booking Items</div><div><strong>${report.totals.hotels}</strong>Hotels</div></div>
      <div class="section"><strong>Hotel Summary</strong></div><table><thead><tr><th>Hotel</th><th>City</th><th>Booking Items</th><th>Rooms</th><th>Room Nights</th></tr></thead><tbody>${report.hotel_summary.map((hotel) => `<tr><td>${escapeHtml(hotel.hotel_name)}</td><td>${escapeHtml(hotel.city || '-')}</td><td class="num">${hotel.booking_items}</td><td class="num">${hotel.rooms}</td><td class="num">${hotel.room_nights}</td></tr>`).join('')}</tbody></table>
      <div class="section"><strong>Booking Details</strong></div><table><thead><tr><th>File</th><th>Client</th><th>Agent</th><th>Hotel</th><th>Check-In</th><th>Check-Out</th><th>Rooms</th><th>Nights</th><th>Room Nights</th></tr></thead><tbody>${report.rows.map((row) => `<tr><td>${escapeHtml(row.file_number || '-')}</td><td>${escapeHtml(row.client_name || '-')}</td><td>${escapeHtml(row.agent_name || '-')}</td><td>${escapeHtml(row.hotel_name)}</td><td>${formatDate(row.check_in)}</td><td>${formatDate(row.check_out)}</td><td class="num">${row.rooms}</td><td class="num">${row.occupied_nights}</td><td class="num">${row.room_nights}</td></tr>`).join('')}</tbody></table>
      <script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
    popup.document.close();
  }

  document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    document.getElementById('periodMonth').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('previousMonth').addEventListener('click', () => shiftMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
    document.getElementById('periodMonth').addEventListener('change', loadReport);
    document.getElementById('hotelFilter').addEventListener('change', loadReport);
    document.getElementById('refreshReport').addEventListener('click', loadReport);
    document.getElementById('printReport').addEventListener('click', printReport);
    document.getElementById('exportCsv').addEventListener('click', exportCsv);
    loadReport();
  });
})();
