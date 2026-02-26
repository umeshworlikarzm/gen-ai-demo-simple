let burndownChart = null;

function addRow(date = '', count = 0) {
    const tbody = document.querySelector('#actualTable tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="date" class="actual-date" value="${date}"></td>
        <td><input type="number" class="actual-count" min="0" value="${count}"></td>
        <td><button class="remove-row" type="button">Remove</button></td>
    `;
    tbody.appendChild(tr);
}

function removeRowHandler(e) {
    if (!e.target.classList.contains('remove-row')) return;
    const tr = e.target.closest('tr');
    if (tr) tr.remove();
}

function loadSampleData() {
    // Populate actual rows for every Thursday between 12 Feb 2026 and 09 Apr 2026
    const start = '2026-02-12';
    const end = '2026-04-09';
    document.getElementById('startDate').value = start;
    document.getElementById('estDate').value = end;
    const total = 15;
    document.getElementById('totalPackages').value = total;
    const dates = getThursdaysBetween(start, end);
    const tbody = document.querySelector('#actualTable tbody');
    tbody.innerHTML = '';
    const n = dates.length;
    for (let i = 0; i < n; i++) {
        // distribute cumulative completed roughly evenly across the Thursdays
        const cum = Math.round(total * (i + 1) / n);
        addRow(dates[i], cum);
    }
}

function getThursdaysBetween(startISO, endISO) {
    const res = [];
    const start = new Date(startISO);
    const end = new Date(endISO);
    const d = new Date(start);
    // advance to the first Thursday on or after start (Thursday === 4)
    while (d <= end && d.getDay() !== 4) {
        d.setDate(d.getDate() + 1);
    }
    for (let cur = new Date(d); cur <= end; cur.setDate(cur.getDate() + 7)) {
        res.push(cur.toISOString().slice(0, 10));
    }
    return res;
}

// Load a user-provided list of dates (day-month short form) as individual completions.
function loadUserProvidedDates() {
    const raw = [
        '12-Mar','12-Mar','26-Feb','19-Feb','19-Mar','26-Mar','26-Feb','26-Mar','26-Mar','2-Apr','5-Mar','2-Apr','5-Mar','9-Apr','12-Mar','19-Mar'
    ];
    const monthMap = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const year = '2026';
    // convert to ISO dates and count occurrences per date
    const counts = {};
    for (const item of raw) {
        const parts = item.split('-');
        if (parts.length !== 2) continue;
        const day = parts[0].padStart(2,'0');
        const mon = parts[1];
        const mm = monthMap[mon] || '01';
        const iso = `${year}-${mm}-${day}`;
        counts[iso] = (counts[iso] || 0) + 1;
    }
    // produce sorted dates and cumulative counts
    const dates = Object.keys(counts).sort();
    const total = Object.values(counts).reduce((s,v) => s+v, 0);
    document.getElementById('startDate').value = '2026-02-12';
    document.getElementById('estDate').value = '2026-04-09';
    document.getElementById('totalPackages').value = total;
    const tbody = document.querySelector('#actualTable tbody');
    tbody.innerHTML = '';
    let cum = 0;
    for (const d of dates) {
        cum += counts[d];
        addRow(d, cum);
    }
}

function getOffsetDateISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0,10);
}

function parseActuals() {
    const rows = Array.from(document.querySelectorAll('#actualTable tbody tr'));
    const items = [];
    for (const row of rows) {
        const dateEl = row.querySelector('.actual-date');
        const countEl = row.querySelector('.actual-count');
        const date = dateEl.value;
        const count = parseInt(countEl.value || '0', 10);
        if (!date) continue; // skip empty dates
        items.push({ date, count });
    }
    // sort by date
    items.sort((a,b) => a.date.localeCompare(b.date));
    return items;
}

function buildDateRange(startISO, endISO) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const labels = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        labels.push(d.toISOString().slice(0,10));
    }
    return labels;
}

function buildIdealSeries(labels, total) {
    const n = labels.length;
    if (n === 0) return [];
    if (n === 1) return [total];
    return labels.map((_, i) => {
        const remaining = Math.round(total * (1 - (i/(n-1))));
        return Math.max(0, remaining);
    });
}

function buildActualSeries(labels, actuals, total) {
    const series = [];
    let idx = 0;
    let lastCum = 0;
    for (const day of labels) {
        while (idx < actuals.length && actuals[idx].date <= day) {
            lastCum = Math.min(total, Math.max(0, actuals[idx].count));
            idx++;
        }
        series.push(Math.max(0, total - lastCum));
    }
    return series;
}

function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = msg || '';
}

function renderBurndown() {
    showError('');
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('estDate').value;
    const total = parseInt(document.getElementById('totalPackages').value || '0', 10);
    if (!start || !end) { showError('Start and estimated completion dates are required.'); return; }
    if (new Date(end) < new Date(start)) { showError('Estimated date must be on or after start date.'); return; }
    if (!total || total <= 0) { showError('Total packages must be a positive number.'); return; }

    const actuals = parseActuals();
    // clamp actual cumulative values to total and ensure non-decreasing
    for (let i = 0; i < actuals.length; i++) {
        if (i>0) actuals[i].count = Math.max(actuals[i-1].count, actuals[i].count);
        actuals[i].count = Math.min(total, actuals[i].count);
    }

    const labels = buildDateRange(start, end);
    const ideal = buildIdealSeries(labels, total);
    const actual = buildActualSeries(labels, actuals, total);

    const ctx = document.getElementById('burndownChart').getContext('2d');
    if (burndownChart) burndownChart.destroy();
    burndownChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ideal',
                    data: ideal,
                    borderColor: 'rgba(200,0,0,0.8)',
                    borderDash: [6,4],
                    fill: false,
                    tension: 0.1,
                },
                {
                    label: 'Actual',
                    data: actual,
                    borderColor: 'rgba(0,100,200,0.9)',
                    backgroundColor: 'rgba(0,100,200,0.2)',
                    fill: false,
                    tension: 0.1,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: false,
                        callback: function(value, index) {
                            const labels = (this && this.chart && this.chart.data && this.chart.data.labels) || [];
                            const label = labels[index] || value;
                            const d = new Date(label);
                            if (isNaN(d)) return '';
                            // Thursday === 4 -> show only Thursdays
                            if (d.getDay() === 4) {
                                // short format like '12 Feb'
                                try {
                                    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                                } catch (e) {
                                    return label;
                                }
                            }
                            return '';
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Remaining packages' }
                }
            },
            plugins: {
                title: { display: true, text: 'Security Remediation - Burndown Chart (UX)' },
                tooltip: { mode: 'index', intersect: false },
                legend: { position: 'top' }
            }
        }
    });
}

function exportChartPNG() {
    if (!burndownChart) { showError('No chart to export.'); return; }
    const url = burndownChart.toBase64Image();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'UX-burndown.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

window.addEventListener('load', function() {
    document.getElementById('addRow').addEventListener('click', () => addRow());
    document.querySelector('#actualTable tbody').addEventListener('click', removeRowHandler);
    document.getElementById('renderBtn').addEventListener('click', renderBurndown);
    document.getElementById('sampleBtn').addEventListener('click', loadSampleData);
    document.getElementById('exportBtn').addEventListener('click', exportChartPNG);
    setupTabs();
    // load a quick sample by default
    loadSampleData();
});

function setupTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    const contents = Array.from(document.querySelectorAll('.tab-content'));
    function showTab(name) {
        buttons.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
        contents.forEach(c => c.style.display = (c.id === `tab-${name}`) ? 'block' : 'none');
        if (name === 'chart') {
            // ensure chart is rendered when opening the chart tab
            setTimeout(() => { try { renderBurndown(); } catch (e) {} }, 10);
        }
    }
    buttons.forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
}
