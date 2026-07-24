(function () {
  'use strict';

  const state = { report: null, loading: false };
  const token = localStorage.getItem('token');

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
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  function formatMoney(value) {
    return `THB ${Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`;
  }

  function syncActionButtons() {
    const rows = state.report?.rows || [];
    const missing = Number(state.report?.totals?.missing_numbers || 0);
    document.getElementById('refreshReport').disabled = state.loading;
    document.getElementById('previousMonth').disabled = state.loading;
    document.getElementById('nextMonth').disabled = state.loading;
    document.getElementById('generateNumbers').disabled =
      state.loading || rows.length === 0 || missing === 0;
    document.getElementById('exportXlsx').disabled = state.loading || rows.length === 0;
    document.getElementById('printReport').disabled = state.loading || rows.length === 0;
  }

  function setLoading(active, message = 'Loading check invoice...') {
    state.loading = active;
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingPanel').classList.toggle('active', active);
    syncActionButtons();
  }

  function period() {
    const value = document.getElementById('periodMonth').value;
    if (!/^\d{4}-\d{2}$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    return { year, month };
  }

  function query() {
    const selected = period();
    const params = new URLSearchParams({ year: selected.year, month: selected.month });
    const agentId = document.getElementById('agentFilter').value;
    if (agentId) params.set('agent_id', agentId);
    return params;
  }

  async function request(path, options = {}) {
    const response = await fetch(`${Endpoint}/api/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      throw new Error('Session expired.');
    }
    if (!response.ok) throw new Error((await response.text()) || 'Request failed.');
    return response;
  }

  async function loadAgents() {
    const role = localStorage.getItem('role');
    if (!['admin', 'superadmin'].includes(role)) {
      document.getElementById('agentFilterGroup').style.display = 'none';
      document.getElementById('generateNumbers').style.display = 'none';
      return;
    }
    try {
      const agents = await (await request('/agents/names')).json();
      document.getElementById('agentFilter').innerHTML = '<option value="">All Agents</option>' +
        agents.map((agent) => `<option value="${agent.id}">${escapeHtml(agent.name)}</option>`).join('');
    } catch (error) {
      console.error('Unable to load agent filter:', error);
    }
  }

  function render(report) {
    state.report = report;
    const totals = report.totals || {};
    document.getElementById('totalBookings').textContent = Number(totals.bookings || 0).toLocaleString('en-US');
    document.getElementById('totalPax').textContent = Number(totals.pax || 0).toLocaleString('en-US');
    document.getElementById('totalAmount').textContent = formatMoney(totals.total);
    document.getElementById('totalReceived').textContent = formatMoney(totals.received);
    document.getElementById('periodLabel').textContent = report.period?.label || '';

    const rows = report.rows || [];
    document.getElementById('checkInvoiceRows').innerHTML = rows.map((row) => `
      <tr>
        <td>${formatDate(row.date)}</td>
        <td class="${row.numbers_generated ? 'generated-number' : 'pending-number'}">${escapeHtml(row.invoice_number || 'Not generated')}</td>
        <td>${escapeHtml(row.year || '-')}</td>
        <td>${escapeHtml(row.agent_name || '-')}</td>
        <td>${escapeHtml(row.client_name || '-')}</td>
        <td class="number-cell">${Number(row.pax || 0).toLocaleString('en-US')}</td>
        <td class="number-cell">${formatMoney(row.total)}</td>
        <td>${escapeHtml(row.month || '-')}</td>
        <td class="${row.numbers_generated ? 'generated-number' : 'pending-number'}">${row.file_number || 'Not generated'}</td>
        <td>${formatMoney(row.received_money)}${row.received_date ? `<br><small>${formatDate(row.received_date)}</small>` : ''}</td>
        <td>${formatDate(row.arrival)}</td>
        <td>${formatDate(row.departure)}</td>
      </tr>
    `).join('');
    document.getElementById('emptyState').style.display = rows.length ? 'none' : 'block';
    syncActionButtons();
  }

  async function loadReport() {
    if (state.loading || !period()) return;
    setLoading(true);
    try {
      render(await (await request(`/analytics/check-invoices?${query()}`)).json());
    } catch (error) {
      console.error(error);
      alert(`Failed to load Check Invoice. ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function generateNumbers() {
    if (state.loading || !state.report?.rows?.length) return;
    const missing = Number(state.report.totals?.missing_numbers || 0);
    if (!missing) return;
    if (!window.confirm(`Generate permanent invoice and monthly file numbers for ${missing} booking(s)?`)) return;
    const selected = period();
    const agentId = document.getElementById('agentFilter').value;
    setLoading(true, 'Generating permanent numbers...');
    try {
      const result = await (await request('/analytics/check-invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ ...selected, ...(agentId ? { agent_id: Number(agentId) } : {}) })
      })).json();
      render(result.report);
      alert(`${result.generated} booking number set(s) generated successfully.`);
    } catch (error) {
      console.error(error);
      alert(`Failed to generate numbers. ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function exportXlsx() {
    if (!state.report?.rows?.length || state.loading) return;
    setLoading(true, 'Preparing Excel file...');
    try {
      const response = await request(`/analytics/check-invoices/export?${query()}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const selected = period();
      link.download = `check-invoice-${selected.year}-${String(selected.month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(`Failed to export Check Invoice. ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function shiftMonth(offset) {
    const selected = period();
    if (!selected) return;
    const next = new Date(Date.UTC(selected.year, selected.month - 1 + offset, 1));
    document.getElementById('periodMonth').value =
      `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
    loadReport();
  }

  function initialize() {
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    const now = new Date();
    document.getElementById('periodMonth').value =
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('refreshReport').addEventListener('click', loadReport);
    document.getElementById('generateNumbers').addEventListener('click', generateNumbers);
    document.getElementById('exportXlsx').addEventListener('click', exportXlsx);
    document.getElementById('printReport').addEventListener('click', () => window.print());
    document.getElementById('previousMonth').addEventListener('click', () => shiftMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => shiftMonth(1));
    document.getElementById('periodMonth').addEventListener('change', loadReport);
    document.getElementById('agentFilter').addEventListener('change', loadReport);
    loadAgents().finally(loadReport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
