// Theme Switcher Logic
function setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem('df-theme', themeName);
}

// Initialize theme from localStorage
const savedTheme = localStorage.getItem('df-theme');
if (savedTheme) {
    document.body.className = savedTheme;
}

document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const form = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    
    // View Switchers
    const uploadSection = document.getElementById('uploadSection');
    const resultsSection = document.getElementById('resultsSection');
    const graphsSection = document.getElementById('graphsSection');
    const viewGraphsBtn = document.getElementById('viewGraphsBtn');
    const backToResultsBtn = document.getElementById('backToResultsBtn');

    viewGraphsBtn.addEventListener('click', () => {
        resultsSection.style.display = 'none';
        graphsSection.style.display = 'block';
    });

    backToResultsBtn.addEventListener('click', () => {
        graphsSection.style.display = 'none';
        resultsSection.style.display = 'block';
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault(); dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; updateFileName(); }
    });
    fileInput.addEventListener('change', updateFileName);

    function updateFileName() {
        const fileMsg = dropZone.querySelector('p');
        if (fileInput.files.length > 0) fileMsg.innerHTML = `Selected: <strong>${fileInput.files[0].name}</strong>`;
        else fileMsg.innerHTML = `Drag & drop your CSV file here or <span class="browse">browse</span>`;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files.length) return;

        errorMsg.style.display = 'none';
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        if (document.getElementById('targetCol').value) formData.append('target_col', document.getElementById('targetCol').value);

        try {
            const response = await fetch('/preprocess', { method: 'POST', body: formData });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Processing failed');
            }
            const data = await response.json();
            displayResults(data);
        } catch (err) {
            errorMsg.textContent = err.message;
            errorMsg.style.display = 'block';
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    });

    function displayResults(data) {
        uploadSection.style.display = 'none';
        resultsSection.style.display = 'block';
        
        // Metrics
        document.getElementById('metricScore').textContent = data.quality_score;
        document.getElementById('metricCompleteness').textContent = data.metrics.completeness + '%';
        document.getElementById('metricShape').textContent = data.shape_change;
        document.getElementById('metricMemory').textContent = data.metrics.memory_reduction_pct + '%';

        // 1. Data Info & Missing Counts
        renderDataInfo(data.data_info, data.missing_counts);
        renderTable('tableRaw', 'tbodyRaw', data.previews.raw);

        // 2. Logs
        renderAuditLog(data.audit_log, data.warnings);

        // 3. Sequential Tables
        renderTable('tableImputed', 'tbodyImputed', data.previews.imputed);
        renderTable('tableEncoded', 'tbodyEncoded', data.previews.encoded);
        renderTable('tableNormalized', 'tbodyNormalized', data.previews.normalized);

        // 4. Graphs
        if(data.graphs) {
            if(data.graphs.heatmap) document.getElementById('imgHeatmap').src = data.graphs.heatmap;
            if(data.graphs.scatter) document.getElementById('imgScatter').src = data.graphs.scatter;
            if(data.graphs.histogram) document.getElementById('imgHistogram').src = data.graphs.histogram;
            if(data.graphs.bar) document.getElementById('imgBar').src = data.graphs.bar;
        }
    }

    function renderDataInfo(info, missingCounts) {
        let html = `<div><strong>Rows:</strong> ${info.rows}</div><div><strong>Columns:</strong> ${info.columns}</div>`;
        html += `<div style="width:100%;"><br/><strong style="color:var(--primary);">Missing Values Breakdown:</strong><br/>`;
        
        const missingLines = [];
        for (const [col, count] of Object.entries(missingCounts)) {
            missingLines.push(`<span>[${col}]: ${count} nulls</span>`);
        }
        html += `<div style="display:flex; gap:15px; flex-wrap:wrap; font-family:monospace; margin-top:10px;">` + missingLines.join('') + `</div></div>`;
        
        document.getElementById('dataInfoBox').innerHTML = html;
    }

    function renderTable(tableId, tbodyId, rowsData) {
        const table = document.getElementById(tableId);
        const tbody = document.getElementById(tbodyId);
        // Clear prior headers inside the table, except the title row
        const existingHeaders = table.querySelectorAll('.dynamic-header');
        existingHeaders.forEach(h => h.remove());
        tbody.innerHTML = '';

        if (!rowsData || rowsData.length === 0) return;

        const cols = Object.keys(rowsData[0]);
        const theadRow = document.createElement('tr');
        theadRow.className = 'dynamic-header';
        cols.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            theadRow.appendChild(th);
        });
        table.querySelector('thead').appendChild(theadRow);

        rowsData.forEach(r => {
            const tr = document.createElement('tr');
            cols.forEach(c => {
                const td = document.createElement('td');
                td.textContent = r[c] === null ? 'null' : r[c];
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    function renderAuditLog(logs, warnings) {
        const fullList = document.getElementById('auditLogList');
        const impList = document.getElementById('imputationLogList');
        fullList.innerHTML = ''; impList.innerHTML = '';

        warnings.forEach(w => {
            const li = `<li style="color:var(--warning)">[WARN] ${w}</li>`;
            fullList.innerHTML += li;
        });

        logs.forEach(log => {
            const isAi = log.includes('AI ANOMALY');
            const isImp = log.includes('Imputation:');
            
            const li = `<li class="${isAi ? 'ai-log' : ''}">${log}</li>`;
            
            if(isImp) impList.innerHTML += li;
            fullList.innerHTML += li;
        });
    }
});
