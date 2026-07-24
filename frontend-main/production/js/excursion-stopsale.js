(function () {
  const token = localStorage.getItem('token');
  if (!token) return;

  const citySelect = document.getElementById('excursionStopCity');
  const excursionSelect = document.getElementById('excursionStopItem');
  const section = document.getElementById('excursionCalendarSection');
  const grid = document.getElementById('excursionCalendarGrid');
  const title = document.getElementById('excursionCalendarTitle');
  const fileInput = document.getElementById('excursionStopFile');
  let selectedExcursion = null;
  let records = [];
  let calendarDate = new Date();
  let attachmentUrl = null;
  let attachmentName = null;

  function headers(json = true) {
    return {
      Authorization: `Bearer ${token}`,
      ...(json ? { 'Content-Type': 'application/json' } : {})
    };
  }

  async function api(url, options = {}) {
    const response = await fetch(`${Endpoint}/api/v1${url}`, options);
    if (!response.ok) throw new Error((await response.text()) || 'Request failed');
    return response.json();
  }

  function dateKey(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    title.textContent = calendarDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    for (let index = 0; index < firstDay; index += 1) {
      grid.appendChild(document.createElement('div'));
    }
    for (let day = 1; day <= days; day += 1) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const blocked = records.some((record) => (
        record.stopped && key >= dateKey(record.start_date) && key <= dateKey(record.end_date)
      ));
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `btn btn-sm ${blocked ? 'btn-danger' : 'btn-light'}`;
      cell.style.height = '42px';
      cell.textContent = String(day);
      cell.title = blocked ? 'Stop Sale' : 'Available';
      cell.addEventListener('click', () => {
        const from = document.getElementById('excursionStopFrom');
        const to = document.getElementById('excursionStopTo');
        if (!from.value || (from.value && to.value)) {
          from.value = key;
          to.value = '';
        } else {
          to.value = key >= from.value ? key : from.value;
        }
      });
      grid.appendChild(cell);
    }
  }

  async function loadCities() {
    const data = await api('/cities', { headers: headers() });
    const cities = (Array.isArray(data) ? data : data.cities || [])
      .map((item) => typeof item === 'string' ? item : item.city || item.name || '')
      .filter(Boolean);
    [...new Set(cities)].sort((a, b) => a.localeCompare(b)).forEach((city) => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      citySelect.appendChild(option);
    });
  }

  async function loadExcursions(city) {
    excursionSelect.disabled = true;
    excursionSelect.innerHTML = '<option value="">Loading excursions...</option>';
    const data = await api(`/excursions?city=${encodeURIComponent(city)}`, { headers: headers() });
    const items = Array.isArray(data) ? data : data.data || data.excursions || [];
    excursionSelect.innerHTML = '<option value="">Select excursion</option>';
    items
      .filter((item) => !city || String(item.city || '').toLowerCase() === city.toLowerCase())
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .forEach((item) => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = item.name;
        option.dataset.item = JSON.stringify({ id: item.id, name: item.name, city: item.city });
        excursionSelect.appendChild(option);
      });
    excursionSelect.disabled = false;
  }

  async function loadAvailability() {
    records = await api(`/excursion-stop-sales/${selectedExcursion.id}`, { headers: headers() });
    renderCalendar();
  }

  citySelect.addEventListener('change', async () => {
    selectedExcursion = null;
    section.style.display = 'none';
    if (!citySelect.value) {
      excursionSelect.disabled = true;
      excursionSelect.innerHTML = '<option value="">Select city first</option>';
      return;
    }
    try {
      await loadExcursions(citySelect.value);
    } catch (error) {
      alert(`Failed to load excursions: ${error.message}`);
    }
  });

  excursionSelect.addEventListener('change', async () => {
    const option = excursionSelect.selectedOptions[0];
    selectedExcursion = option?.dataset.item ? JSON.parse(option.dataset.item) : null;
    section.style.display = selectedExcursion ? 'flex' : 'none';
    if (!selectedExcursion) return;
    try {
      await loadAvailability();
    } catch (error) {
      alert(`Failed to load excursion availability: ${error.message}`);
    }
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await api('/files/upload/document', {
        method: 'POST',
        headers: headers(false),
        body: form
      });
      attachmentUrl = data.file_info?.url || null;
      attachmentName = data.file_info?.original_name || file.name;
    } catch (error) {
      fileInput.value = '';
      alert(`File upload failed: ${error.message}`);
    }
  });

  async function save(stopped, button) {
    const startDate = document.getElementById('excursionStopFrom').value;
    const endDate = document.getElementById('excursionStopTo').value;
    if (!selectedExcursion) return alert('Please select an excursion.');
    if (!startDate || !endDate) return alert('Please select the date range.');
    if (endDate < startDate) return alert('To Date must be on or after From Date.');
    const previous = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    try {
      await api('/excursion-stop-sales', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          excursion_id: selectedExcursion.id,
          start_date: startDate,
          end_date: endDate,
          stopped,
          notify_agents: document.getElementById('excursionNotifyAgents').checked,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName
        })
      });
      alert(stopped ? 'Excursion Stop Sale applied successfully.' : 'Excursion Start Sale applied successfully.');
      await loadAvailability();
      document.getElementById('excursionStopFrom').value = '';
      document.getElementById('excursionStopTo').value = '';
    } catch (error) {
      alert(`Failed to save excursion stop sale: ${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = previous;
    }
  }

  document.getElementById('excursionPreviousMonth').addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('excursionNextMonth').addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById('excursionStopClose').addEventListener('click', (event) => save(true, event.currentTarget));
  document.getElementById('excursionStopOpen').addEventListener('click', (event) => save(false, event.currentTarget));

  loadCities().catch((error) => alert(`Failed to load cities: ${error.message}`));
})();
