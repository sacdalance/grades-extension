/**
 * UPB AMIS GWA Calculator - Content Script
 * Robustly detects grades and computes Cumulative GWA with full subject-level editing.
 */

const CONFIG = {
    gradeRegex: /\b(1\.00|1\.25|1\.50|1\.75|2\.00|2\.25|2\.50|2\.75|3\.00|4\.00|5\.00)\b/,
    unitsRegex: /\b\d+(\.\d+)?\b/,
    debounceDelay: 300
};

let currentData = { units: 0, gwa: 0, term: 'Unknown Term', subjects: [] };

function initDashboard() {
    if (document.getElementById('gwa-dashboard-container')) return;

    const container = document.createElement('div');
    container.id = 'gwa-dashboard-container';
    container.innerHTML = `
        <div class="gwa-card">
            <button id="gwa-close" class="gwa-close-btn">&times;</button>
            <div class="gwa-header">
                <h3>AMIS GWA Calculator</h3>
            </div>
            
            <div class="gwa-section-label">Current Term</div>
            <div class="gwa-stat-grid">
                <div class="gwa-stat-item">
                    <div class="gwa-stat-label">Units</div>
                    <div id="gwa-units" class="gwa-stat-value">0.0</div>
                </div>
                <div class="gwa-stat-item">
                    <div class="gwa-stat-label">GWA</div>
                    <div id="gwa-value" class="gwa-stat-value highlight">0.000</div>
                </div>
            </div>
            
            <div class="gwa-section-label">Cumulative (Saved)</div>
            <div class="gwa-stat-grid">
                <div class="gwa-stat-item">
                    <div class="gwa-stat-label">Total Units</div>
                    <div id="cum-units" class="gwa-stat-value">0.0</div>
                </div>
                <div class="gwa-stat-item">
                    <div class="gwa-stat-label">Total GWA</div>
                    <div id="cum-value" class="gwa-stat-value highlight">0.000</div>
                </div>
            </div>

            <div class="gwa-footer">
                <div id="gwa-status" style="margin-bottom: 8px;">Scanning...</div>
                <div class="gwa-actions">
                    <button id="gwa-save" class="gwa-btn primary">Save This Term</button>
                    <button id="gwa-manage" class="gwa-btn secondary">Manage All Data</button>
                </div>
            </div>
        </div>

        <div id="gwa-modal" class="gwa-modal-overlay" style="display:none;">
            <div class="gwa-modal-content">
                <button id="gwa-modal-close-top" class="gwa-close-btn-lg">&times;</button>
                <div class="gwa-modal-header">
                    <h2>Manage Saved Grades</h2>
                </div>
                <div class="gwa-modal-body">
                    <div id="gwa-manage-container">
                        <!-- Terms list injected here -->
                    </div>
                    
                    <div class="gwa-manual-add-section">
                        <h3>Add New Term</h3>
                        <div class="gwa-add-row">
                            <input type="text" id="add-term" placeholder="e.g. 1st Sem 2023">
                            <button id="gwa-add-term-btn" class="gwa-btn primary">Create Term</button>
                        </div>
                    </div>
                </div>
                <div class="gwa-modal-footer">
                    <button id="gwa-modal-close-btn" class="gwa-btn secondary">Done & Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(container);

    document.getElementById('gwa-save').addEventListener('click', saveCurrentTerm);
    document.getElementById('gwa-manage').addEventListener('click', openModal);
    document.getElementById('gwa-modal-close-top').addEventListener('click', closeModal);
    document.getElementById('gwa-modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('gwa-add-term-btn').addEventListener('click', createNewTerm);
    document.getElementById('gwa-close').addEventListener('click', () => container.style.display = 'none');
    
    loadCumulativeData();
}

function openModal() {
    document.getElementById('gwa-modal').style.display = 'flex';
    renderManageList();
}

function closeModal() {
    document.getElementById('gwa-modal').style.display = 'none';
}

async function renderManageList() {
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    const container = document.getElementById('gwa-manage-container');
    container.innerHTML = '';

    Object.keys(savedTerms).sort().forEach(termKey => {
        const term = savedTerms[termKey];
        const termEl = document.createElement('div');
        termEl.className = 'gwa-term-group';
        termEl.innerHTML = `
            <div class="gwa-term-header">
                <span class="gwa-term-title">${termKey}</span>
                <div class="gwa-term-summary">
                    <span>${term.units.toFixed(1)} Units</span>
                    <span class="gwa-badge">${term.gwa.toFixed(3)} GWA</span>
                </div>
                <button class="gwa-icon-btn delete-term" data-term="${termKey}">🗑️</button>
            </div>
            <div class="gwa-subject-list">
                <table class="gwa-subject-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Units</th>
                            <th>Grade</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${term.subjects.map((s, idx) => `
                            <tr>
                                <td><input type="text" value="${s.code || 'Subject'}" class="edit-subject" data-term="${termKey}" data-idx="${idx}" data-field="code"></td>
                                <td><input type="number" value="${s.units}" class="edit-subject" data-term="${termKey}" data-idx="${idx}" data-field="units" step="0.5"></td>
                                <td><input type="number" value="${s.grade}" class="edit-subject" data-term="${termKey}" data-idx="${idx}" data-field="grade" step="0.001"></td>
                                <td><button class="gwa-icon-btn delete-subject" data-term="${termKey}" data-idx="${idx}">×</button></td>
                            </tr>
                        `).join('')}
                        <tr class="add-subject-row">
                            <td colspan="4"><button class="gwa-btn-sm add-subject" data-term="${termKey}">+ Add Subject</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
        container.appendChild(termEl);
    });

    // Add Listeners
    document.querySelectorAll('.edit-subject').forEach(input => {
        input.addEventListener('change', updateSubjectField);
    });
    document.querySelectorAll('.delete-subject').forEach(btn => {
        btn.addEventListener('click', (e) => deleteSubject(e.currentTarget.dataset.term, e.currentTarget.dataset.idx));
    });
    document.querySelectorAll('.add-subject').forEach(btn => {
        btn.addEventListener('click', (e) => addSubjectToTerm(e.currentTarget.dataset.term));
    });
    document.querySelectorAll('.delete-term').forEach(btn => {
        btn.addEventListener('click', (e) => deleteTerm(e.currentTarget.dataset.term));
    });
}

async function updateSubjectField(e) {
    const { term, idx, field } = e.target.dataset;
    const value = field === 'code' ? e.target.value : parseFloat(e.target.value);
    
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    savedTerms[term].subjects[idx][field] = value;
    
    await saveAndRecalculate(savedTerms);
}

async function addSubjectToTerm(term) {
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    savedTerms[term].subjects.push({ code: 'New Subject', units: 3, grade: 1.0 });
    await saveAndRecalculate(savedTerms);
}

async function deleteSubject(term, idx) {
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    savedTerms[term].subjects.splice(idx, 1);
    await saveAndRecalculate(savedTerms);
}

async function createNewTerm() {
    const termName = document.getElementById('add-term').value.trim();
    if (!termName) return;
    
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    if (savedTerms[termName]) { alert('Term already exists'); return; }
    
    savedTerms[termName] = { term: termName, units: 0, gwa: 0, subjects: [] };
    await chrome.storage.local.set({ savedTerms });
    document.getElementById('add-term').value = '';
    renderManageList();
}

async function deleteTerm(term) {
    if (confirm(`Delete all data for ${term}?`)) {
        const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
        delete savedTerms[term];
        await saveAndRecalculate(savedTerms);
    }
}

async function saveAndRecalculate(savedTerms) {
    // Recalculate each term's summary
    Object.values(savedTerms).forEach(term => {
        let tUnits = 0, tWeighted = 0;
        term.subjects.forEach(s => {
            if (!isNaN(s.units) && !isNaN(s.grade)) {
                tUnits += s.units;
                tWeighted += (s.grade * s.units);
            }
        });
        term.units = tUnits;
        term.gwa = tUnits > 0 ? tWeighted / tUnits : 0;
    });
    
    await chrome.storage.local.set({ savedTerms });
    renderManageList();
    loadCumulativeData();
}

function calculateGWA() {
    const tables = document.querySelectorAll('table');
    let targetTable = null, unitsCol = -1, gradeCol = -1, codeCol = -1;

    tables.forEach(table => {
        const headers = Array.from(table.querySelectorAll('th, td')).map(el => el.innerText.trim().toLowerCase());
        const uIdx = headers.findIndex(h => h.includes('unit'));
        const gIdx = headers.findIndex(h => h.includes('grade'));
        const cIdx = headers.findIndex(h => h.includes('course') || h.includes('subject'));
        if (uIdx !== -1 && gIdx !== -1) { 
            targetTable = table; unitsCol = uIdx; gradeCol = gIdx; codeCol = cIdx;
        }
    });

    if (!targetTable) return;

    const rows = Array.from(targetTable.querySelectorAll('tr')).slice(1);
    let totalWeightedGrades = 0, totalUnits = 0, subjects = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length <= Math.max(unitsCol, gradeCol)) return;
        const grade = parseFloat(cells[gradeCol].innerText.trim());
        const units = parseFloat(cells[unitsCol].innerText.trim());
        const code = codeCol !== -1 ? cells[codeCol].innerText.trim() : 'Subject';
        if (!isNaN(grade) && !isNaN(units) && grade >= 1.0 && grade <= 5.0) {
            totalWeightedGrades += (grade * units);
            totalUnits += units;
            subjects.push({ code, grade, units });
        }
    });

    const term = getCurrentTerm();
    const gwa = totalUnits > 0 ? totalWeightedGrades / totalUnits : 0;
    currentData = { units: totalUnits, gwa, term, subjects };
    updateUI(gwa, totalUnits);
    updateStatus(`Term: ${term}`);
}

async function saveCurrentTerm() {
    if (currentData.units === 0) return;
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    savedTerms[currentData.term] = currentData;
    await chrome.storage.local.set({ savedTerms });
    updateStatus(`Saved ${currentData.term}!`);
    loadCumulativeData();
}

async function loadCumulativeData() {
    const { savedTerms = {} } = await chrome.storage.local.get('savedTerms');
    let totalUnits = 0, totalWeightedGrades = 0;
    Object.values(savedTerms).forEach(term => {
        term.subjects.forEach(s => {
            totalUnits += s.units;
            totalWeightedGrades += (s.grade * s.units);
        });
    });
    const cumGwa = totalUnits > 0 ? totalWeightedGrades / totalUnits : 0;
    document.getElementById('cum-units').innerText = totalUnits.toFixed(1);
    document.getElementById('cum-value').innerText = cumGwa.toFixed(3);
}

function getCurrentTerm() {
    const selected = document.querySelector('.vs__selected');
    if (selected) return selected.innerText.trim();
    const labels = Array.from(document.querySelectorAll('label, span, div'))
        .filter(el => (el.innerText.includes('Semester') || el.innerText.includes('Midyear')) && el.innerText.length < 50);
    return labels.length > 0 ? labels[0].innerText.trim() : 'Unknown Term';
}

function updateUI(gwa, units) {
    if(document.getElementById('gwa-units')) document.getElementById('gwa-units').innerText = units.toFixed(1);
    if(document.getElementById('gwa-value')) document.getElementById('gwa-value').innerText = gwa.toFixed(3);
}

function updateStatus(msg) {
    if(document.getElementById('gwa-status')) document.getElementById('gwa-status').innerText = msg;
}

let debounceTimer = null;
const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calculateGWA, CONFIG.debounceDelay);
});

function init() {
    initDashboard();
    calculateGWA();
    const target = document.querySelector('#app') || document.body;
    observer.observe(target, { childList: true, subtree: true });
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
