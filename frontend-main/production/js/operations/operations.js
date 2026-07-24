(function () {
  const state = {
    items: [],
    summary: {},
    options: { suppliers: [], guides: [], agents: [] },
    activeTab: 'transfer',
    selected: new Set(),
    editingKey: null,
    readOnly: !['admin', 'superadmin'].includes(localStorage.getItem('role')),
  };

  const byId = id => document.getElementById(id);
  const token = localStorage.getItem('token');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function localIsoDate(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function addDays(value, days) {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return localIsoDate(date);
  }

  function formatDate(value) {
    if (!value) return '-';
    const parts = value.slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
  }

  function dayName(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
  }

  function showLoading(message) {
    byId('loadingText').textContent = message || 'Loading operations...';
    byId('loadingPanel').classList.add('active');
  }

  function hideLoading() {
    byId('loadingPanel').classList.remove('active');
  }

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${Endpoint}/api/v1${path}`, { ...options, headers });
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const error = contentType.includes('application/json') ? await response.json() : await response.text();
      throw new Error(error.message || error || `Request failed (${response.status})`);
    }
    return response;
  }

  function queryString() {
    const params = new URLSearchParams({
      from_date: byId('fromDate').value,
      to_date: byId('toDate').value,
      city: byId('cityFilter').value || 'all',
      status: byId('statusFilter').value || 'all',
      search: byId('searchInput').value.trim(),
    });
    if (byId('agentFilter').value) params.set('agent_id', byId('agentFilter').value);
    return params.toString();
  }

  async function loadOptions() {
    const response = await api('/operations/options');
    state.options = await response.json();
    byId('agentFilter').innerHTML = '<option value="">All Agents</option>' +
      state.options.agents.map(agent => `<option value="${agent.id}">${escapeHtml(agent.name)}</option>`).join('');
    byId('guideOptions').innerHTML = state.options.guides
      .map(guide => `<option value="${escapeHtml(guide.name)}" data-mobile="${escapeHtml(guide.mobile || '')}"></option>`).join('');
  }

  async function loadOperations(options = {}) {
    showLoading(options.message || 'Loading confirmed operations...');
    try {
      const response = await api(`/operations?${queryString()}`);
      const data = await response.json();
      state.items = data.items || [];
      state.summary = data.summary || {};
      state.readOnly = Boolean(data.read_only);
      state.selected.clear();
      updateCityFilter();
      render();
      byId('readOnlyNote').style.display = state.readOnly ? 'block' : 'none';
    } catch (error) {
      console.error(error);
      alert(`Failed to load operations: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  function updateCityFilter() {
    const select = byId('cityFilter');
    const current = select.value || 'all';
    const cities = [...new Set(state.items.map(item => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    select.innerHTML = '<option value="all">All Cities</option>' +
      cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`).join('');
    select.value = cities.includes(current) ? current : 'all';
  }

  function renderSummary() {
    const summary = state.summary;
    byId('totalCount').textContent = summary.total || 0;
    byId('unassignedCount').textContent = summary.unassigned || 0;
    byId('assignedCount').textContent = summary.assigned || 0;
    byId('inOperationCount').textContent = summary.in_operation || 0;
    byId('completedCount').textContent = summary.completed || 0;
    byId('changedCount').textContent = summary.changed || 0;
    byId('transferTabCount').textContent = summary.by_type?.transfer || 0;
    byId('excursionTabCount').textContent = summary.by_type?.excursion || 0;
    byId('tourTabCount').textContent = summary.by_type?.tour || 0;
  }

  function tableDefinition() {
    const common = [
      { key: 'select', label: '', width: 42, className: 'select-column' },
      { key: 'date', label: 'Date / Day', width: 105 },
      { key: 'city', label: 'City', width: 105 },
      { key: 'pickup', label: 'Pickup', width: 80 },
      { key: 'svc', label: 'SVC', width: 65 },
    ];
    const typeColumns = {
      transfer: [
        { key: 'service', label: 'Transfer Service', width: 190 },
        { key: 'flight', label: 'Flight / Time', width: 110 },
        { key: 'route', label: 'From / To', width: 170 },
      ],
      excursion: [
        { key: 'service', label: 'Excursion', width: 220 },
        { key: 'hotel', label: 'Hotel', width: 170 },
      ],
      tour: [
        { key: 'service', label: 'Tour / Day', width: 185 },
        { key: 'program', label: 'Program', width: 250 },
        { key: 'hotel', label: 'Hotel', width: 175 },
        { key: 'route', label: 'Route', width: 210 },
      ],
    };
    return common.concat(typeColumns[state.activeTab], [
      { key: 'client', label: 'Client / Pax', width: 150 },
      { key: 'agent', label: 'Agent / File', width: 150 },
      { key: 'supplier', label: 'Supplier / Vehicle', width: 170 },
      { key: 'guide', label: 'Guide / Mobile', width: 145 },
      { key: 'status', label: 'Status', width: 110 },
      { key: 'remarks', label: 'Remarks', width: 175 },
      { key: 'actions', label: 'Actions', width: 70, className: 'row-actions' },
    ]);
  }

  function cellContent(item, key) {
    const secondary = text => text ? `<div class="secondary">${escapeHtml(text)}</div>` : '';
    switch (key) {
      case 'select':
        return state.readOnly ? '' : `<input class="operation-select" type="checkbox" data-key="${escapeHtml(item.key)}" ${state.selected.has(item.key) ? 'checked' : ''} aria-label="Select operation" />`;
      case 'date':
        return `<div class="date-cell">${formatDate(item.operation_date)}</div>${secondary(dayName(item.operation_date))}`;
      case 'city': return escapeHtml(item.city || '-');
      case 'pickup': return escapeHtml(item.pickup_time || '-');
      case 'svc': return escapeHtml(item.service_code || '-');
      case 'service':
        return `<strong>${escapeHtml(item.service_name || '-')}</strong>${item.day_number ? secondary(`Day ${item.day_number}`) : ''}`;
      case 'flight':
        return `${escapeHtml(item.flight_number || '-')}${secondary(item.flight_time || '')}`;
      case 'route':
        return `<div class="route-cell">${escapeHtml(item.route || [item.from_location, item.to_location].filter(Boolean).join(' → ') || '-')}</div>`;
      case 'program': return `<div class="route-cell">${escapeHtml(item.program || '-')}</div>`;
      case 'hotel': return `${escapeHtml(item.hotel || '-')}${secondary(item.room_type || '')}`;
      case 'client':
        return `<strong>${escapeHtml(item.client_name || '-')}</strong>${secondary(`${item.pax || 0} pax${item.client_mobile ? ` · ${item.client_mobile}` : ''}`)}`;
      case 'agent':
        return `${escapeHtml(item.agent_name || '-')}${secondary(item.file_number || '')}`;
      case 'supplier':
        return `${escapeHtml(item.supplier_name || 'Unassigned')}${secondary([item.vehicle_type, item.vehicle_quantity ? `Qty ${item.vehicle_quantity}` : ''].filter(Boolean).join(' · '))}`;
      case 'guide':
        return `${escapeHtml(item.guide_name || '-')}${secondary(item.guide_mobile || '')}`;
      case 'status':
        return `<span class="status status-${escapeHtml(item.status)}">${escapeHtml(item.status.replace('_', ' '))}</span>`;
      case 'remarks': return escapeHtml(item.remarks || '-');
      case 'actions':
        return state.readOnly ? '<i class="fa fa-eye text-muted" title="Read only"></i>' :
          `<button class="btn btn-primary edit-assignment" type="button" data-key="${escapeHtml(item.key)}" title="Edit assignment"><i class="fa fa-pencil"></i></button>`;
      default: return '';
    }
  }

  function renderTable() {
    const columns = tableDefinition();
    byId('tableColumns').innerHTML = columns.map(column => `<col style="width:${column.width}px" />`).join('');
    byId('operationHead').innerHTML = `<tr>${columns.map(column =>
      column.key === 'select' && !state.readOnly
        ? `<th class="${column.className || ''}"><input id="selectAllVisible" type="checkbox" aria-label="Select all visible operations" /></th>`
        : `<th class="${column.className || ''}">${escapeHtml(column.label)}</th>`
    ).join('')}</tr>`;

    const items = state.items.filter(item => item.service_type === state.activeTab);
    let previousDate = null;
    byId('operationRows').innerHTML = items.map(item => {
      const dateStart = previousDate !== item.operation_date;
      previousDate = item.operation_date;
      return `<tr class="${dateStart ? 'date-start' : ''}" data-key="${escapeHtml(item.key)}">${columns.map(column =>
        `<td class="${column.className || ''}">${cellContent(item, column.key)}</td>`
      ).join('')}</tr>`;
    }).join('');
    byId('emptyState').style.display = items.length ? 'none' : 'block';

    byId('operationRows').querySelectorAll('.operation-select').forEach(input => {
      input.addEventListener('change', event => {
        event.target.checked ? state.selected.add(event.target.dataset.key) : state.selected.delete(event.target.dataset.key);
        renderBulkBar();
      });
    });
    byId('operationRows').querySelectorAll('.edit-assignment').forEach(button => {
      button.addEventListener('click', () => openAssignment(button.dataset.key));
    });
    const selectAll = byId('selectAllVisible');
    if (selectAll) selectAll.addEventListener('change', event => {
      items.forEach(item => event.target.checked ? state.selected.add(item.key) : state.selected.delete(item.key));
      renderTable();
      renderBulkBar();
    });
  }

  function renderBulkBar() {
    byId('selectedCount').textContent = state.selected.size;
    byId('bulkBar').classList.toggle('active', !state.readOnly && state.selected.size > 0);
  }

  function render() {
    renderSummary();
    renderTable();
    renderBulkBar();
  }

  function supplierOptions(type, selectedId) {
    return state.options.suppliers
      .filter(supplier => type === 'transfer' ? supplier.offers_transfers : type === 'excursion' ? supplier.offers_excursions : supplier.offers_tours)
      .map(supplier => `<option value="${supplier.id}" ${Number(selectedId) === supplier.id ? 'selected' : ''}>${escapeHtml(supplier.name)}</option>`).join('');
  }

  function openAssignment(key) {
    const item = state.items.find(row => row.key === key);
    if (!item || state.readOnly) return;
    state.editingKey = key;
    byId('sourceSummary').innerHTML = `<strong>${escapeHtml(item.service_name)}</strong> · ${formatDate(item.operation_date)} · ${escapeHtml(item.client_name)}<div class="secondary">${escapeHtml(item.agent_name)} · ${escapeHtml(item.file_number || 'No file number')}</div>`;
    byId('assignmentStatus').value = item.status === 'changed' ? 'assigned' : item.status;
    byId('assignmentPickup').value = /^\d{2}:\d{2}/.test(item.pickup_time || '') ? item.pickup_time.slice(0, 5) : '';
    byId('assignmentSupplier').innerHTML = '<option value="">Select supplier</option>' + supplierOptions(item.service_type, item.supplier_id);
    byId('assignmentVehicle').value = item.vehicle_type || '';
    byId('assignmentVehicleQty').value = item.vehicle_quantity ?? 1;
    byId('assignmentGuide').value = item.guide_name || '';
    byId('assignmentGuideMobile').value = item.guide_mobile || '';
    byId('assignmentRemarks').value = item.remarks || '';
    $('#assignmentModal').modal('show');
  }

  function assignmentPayload(item) {
    const supplierSelect = byId('assignmentSupplier');
    return {
      trip_id: item.trip_id,
      status: byId('assignmentStatus').value,
      supplier_id: supplierSelect.value ? Number(supplierSelect.value) : null,
      supplier_name: supplierSelect.selectedOptions[0]?.textContent === 'Select supplier' ? '' : supplierSelect.selectedOptions[0]?.textContent || '',
      vehicle_type: byId('assignmentVehicle').value.trim(),
      vehicle_quantity: Number(byId('assignmentVehicleQty').value || 1),
      guide_name: byId('assignmentGuide').value.trim(),
      guide_mobile: byId('assignmentGuideMobile').value.trim(),
      pickup_time: byId('assignmentPickup').value,
      remarks: byId('assignmentRemarks').value.trim(),
      source_updated_at: item.source_updated_at,
    };
  }

  async function saveAssignment(event) {
    event.preventDefault();
    const item = state.items.find(row => row.key === state.editingKey);
    if (!item) return;
    showLoading('Saving operation assignment...');
    try {
      await api(`/operations/assignments/${item.service_type}/${item.service_item_id}/${item.operation_date}`, {
        method: 'PUT',
        body: JSON.stringify(assignmentPayload(item)),
      });
      $('#assignmentModal').modal('hide');
      await loadOperations({ message: 'Refreshing operation data...' });
    } catch (error) {
      hideLoading();
      alert(`Unable to save assignment: ${error.message}`);
    }
  }

  async function applyBulk() {
    const status = byId('bulkStatus').value;
    const guide = byId('bulkGuide').value.trim();
    if (!status && !guide) {
      alert('Choose a status or enter a guide name.');
      return;
    }
    const items = state.items.filter(item => state.selected.has(item.key));
    const assignments = items.map(item => ({
      trip_id: item.trip_id,
      service_type: item.service_type,
      service_item_id: item.service_item_id,
      operation_date: item.operation_date,
      status: status || (item.status === 'changed' ? 'assigned' : item.status),
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      vehicle_type: item.vehicle_type,
      vehicle_quantity: item.vehicle_quantity,
      guide_name: guide || item.guide_name,
      guide_mobile: item.guide_mobile,
      pickup_time: item.pickup_time,
      remarks: item.remarks,
      source_updated_at: item.source_updated_at,
    }));
    showLoading(`Updating ${assignments.length} operation(s)...`);
    try {
      await api('/operations/assignments/bulk', { method: 'POST', body: JSON.stringify({ assignments }) });
      byId('bulkStatus').value = '';
      byId('bulkGuide').value = '';
      await loadOperations({ message: 'Refreshing operation data...' });
    } catch (error) {
      hideLoading();
      alert(`Unable to update operations: ${error.message}`);
    }
  }

  async function exportExcel() {
    showLoading('Preparing Excel workbook...');
    try {
      const response = await api(`/operations/export.xlsx?${queryString()}`);
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] || 'operations.xlsx';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Unable to export operations: ${error.message}`);
    } finally {
      hideLoading();
    }
  }

  function setQuickRange(range) {
    const today = localIsoDate(new Date());
    byId('fromDate').value = today;
    byId('toDate').value = range === 'today' ? today : addDays(today, Number(range) - 1);
    document.querySelectorAll('.quick-range button').forEach(button => button.classList.toggle('active', button.dataset.range === String(range)));
    loadOperations();
  }

  function resetFilters() {
    byId('cityFilter').value = 'all';
    byId('agentFilter').value = '';
    byId('statusFilter').value = 'all';
    byId('searchInput').value = '';
    setQuickRange('30');
  }

  function bindEvents() {
    document.querySelectorAll('.operation-tabs button').forEach(button => button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      state.selected.clear();
      document.querySelectorAll('.operation-tabs button').forEach(tab => tab.classList.toggle('active', tab === button));
      renderTable();
      renderBulkBar();
    }));
    document.querySelectorAll('.quick-range button').forEach(button => button.addEventListener('click', () => setQuickRange(button.dataset.range)));
    byId('applyFilters').addEventListener('click', () => loadOperations());
    byId('resetFilters').addEventListener('click', resetFilters);
    byId('refreshButton').addEventListener('click', () => loadOperations());
    byId('exportButton').addEventListener('click', exportExcel);
    byId('printButton').addEventListener('click', () => window.print());
    byId('clearSelection').addEventListener('click', () => { state.selected.clear(); renderTable(); renderBulkBar(); });
    byId('applyBulk').addEventListener('click', applyBulk);
    byId('assignmentForm').addEventListener('submit', saveAssignment);
    byId('assignmentGuide').addEventListener('change', event => {
      const guide = state.options.guides.find(option => option.name === event.target.value);
      if (guide && !byId('assignmentGuideMobile').value) byId('assignmentGuideMobile').value = guide.mobile || '';
    });
    byId('searchInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') loadOperations();
    });
  }

  async function init() {
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
    const today = localIsoDate(new Date());
    byId('fromDate').value = today;
    byId('toDate').value = addDays(today, 29);
    bindEvents();
    showLoading('Preparing Operations...');
    try {
      await loadOptions();
      await loadOperations();
    } catch (error) {
      hideLoading();
      console.error(error);
      alert(`Unable to open Operations: ${error.message}`);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
