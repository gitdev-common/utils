window.launchScreenerEnhancement = function () {
  if (window.calculationsApplied) {
    alert('Calculations have already been applied.');
    return;
  }

  const ROWS_TO_SELECT = ['Revenue', 'Sales', 'Operating Profit', 'Financing Profit', 'Net Profit'];

  const table = document.getElementById('profit-loss');
  if (!table) return showAlert('Table with id "profit-loss" not found.');

  const headerCells = table.querySelectorAll('thead th');
  const isTTM = checkIfTTMColumn(headerCells);

  const selectedRows = getSelectedRows(table, ROWS_TO_SELECT).reverse();

  const cashFlowTable = document.getElementById('cash-flow');
  if (!cashFlowTable) return showAlert('Table with id "cash-flow" not found.');

  const cashFlowHeaderCells = cashFlowTable.querySelectorAll('thead th');
  const cashFlowHeaders = Array.from(cashFlowHeaderCells).map((cell) =>
    cell.textContent.trim().toLowerCase(),
  );
  const cashFlowBody = cashFlowTable.querySelector('tbody');

  transferRowsToCashFlow(selectedRows, headerCells, cashFlowHeaders, cashFlowBody);
  addGrowthPopovers(selectedRows, isTTM);
  addCheckboxesToHeaders(cashFlowHeaderCells);

  addSumButton(cashFlowHeaderCells, cashFlowBody, cashFlowTable);

  const quartyerlyTable = document.getElementById('quarters');
  if (!quartyerlyTable) return showAlert('Table with id "quarters" not found.');
  const selectedQuarterlyRows = getSelectedRows(quartyerlyTable, ROWS_TO_SELECT).reverse();
  const areResultsHalfYearly = quartyerlyTable.textContent?.includes('Half Yearly Results');

  window.growthMode = 'qoq';
  addGrowthPopovers(selectedQuarterlyRows, isTTM);

  const toggleBtn = getContainerButton('Viewing QoQ');
  toggleBtn.addEventListener('click', () => {
    window.growthMode = window.growthMode === 'qoq' ? 'yoy' : 'qoq';
    toggleBtn.textContent = window.growthMode === 'qoq' ? 'Viewing QoQ' : 'Viewing YoY';
    if (window.growthMode === 'qoq') {
      addGrowthPopovers(selectedQuarterlyRows, isTTM);
    } else {
      addYoYGrowthPopovers(selectedQuarterlyRows, areResultsHalfYearly);
    }
  });
  quartyerlyTable.parentElement.insertBefore(toggleBtn, quartyerlyTable);

  window.calculationsApplied = true;
};

// Utility Functions

function showAlert(message) {
  alert(message);
}

function checkIfTTMColumn(headerCells) {
  const lastHeader = headerCells[headerCells.length - 1];
  return lastHeader?.textContent.trim().toLowerCase() === 'ttm';
}

function getSelectedRows(table, keywords) {
  return Array.from(table.querySelectorAll('tbody tr')).filter((row) => {
    const firstCellText = row.cells[0]?.textContent.trim();
    return (
      firstCellText &&
      keywords.some((keyword) => firstCellText.toLowerCase().startsWith(keyword.toLowerCase()))
    );
  });
}

function transferRowsToCashFlow(selectedRows, headerCells, cashFlowHeaders, cashFlowBody) {
  selectedRows.forEach((row) => {
    const newRow = cashFlowBody.insertRow(0);
    const firstCellText = row.cells[0]?.textContent.trim();
    newRow.insertCell().textContent = firstCellText;

    row.querySelectorAll('td').forEach((cell, index) => {
      if (index > 0) {
        const headerText = headerCells[index]?.textContent.trim().toLowerCase();
        const headerIndex = cashFlowHeaders.indexOf(headerText);
        if (headerIndex !== -1) {
          const newCell = newRow.insertCell();
          newCell.textContent = cell.textContent.trim();
        }
      }
    });
  });
}

function createPopover(text, growth) {
  const popover = document.createElement('div');
  popover.className = 'growth-popover';
  popover.textContent = text;
  Object.assign(popover.style, {
    position: 'absolute',
    background: growth >= 0 ? '#2e7d32' : '#c62828',
    color: '#fff',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '4px',
    top: '-10px',
    right: '0px',
    pointerEvents: 'none',
  });
  return popover;
}

function removeExistingPopover(cell) {
  const existing = cell.querySelector('.growth-popover');
  if (existing) existing.remove();
}

function addCheckboxesToHeaders(headers) {
  headers.forEach((cell, index) => {
    if (index > 0 && !cell.querySelector('input[type="checkbox"]')) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.style.marginRight = '5px';
      cell.prepend(checkbox);
    }
  });
}

function addSumButton(headerCells, tableBody, tableContainer) {
  const button = getContainerButton('Sum Selected Columns');

  button.addEventListener('click', () => sumSelectedColumns(headerCells, tableBody));
  tableContainer.parentElement.insertBefore(button, tableContainer);
}

function getContainerButton(buttonText) {
  const button = document.createElement('button');
  Object.assign(button, {
    textContent: buttonText,
  });

  Object.assign(button.style, {
    marginBottom: '10px',
    marginTop: '10px',
    padding: '8px 12px',
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    float: 'right',
  });

  return button;
}

function sumSelectedColumns(headerCells, tableBody) {
  const keywords = [
    'Sales',
    'Revenue',
    'Operating Profit',
    'Financing Profit',
    'Net Profit',
    'Cash from Operating Activity',
  ];

  const selectedIndexes = [];
  const selectedNames = [];

  headerCells.forEach((cell, index) => {
    if (index > 0) {
      const checkbox = cell.querySelector('input[type="checkbox"]');
      if (checkbox?.checked) {
        selectedIndexes.push(index);
        selectedNames.push(cell.textContent.trim());
      }
    }
  });

  if (selectedIndexes.length === 0) return showAlert('No headers selected!');

  const rowSums = [];

  tableBody.querySelectorAll('tr').forEach((row) => {
    const label = row.cells[0]?.textContent.trim()?.replace('+', '');
    if (keywords.some((k) => label.toLowerCase().startsWith(k.toLowerCase()))) {
      const total = selectedIndexes.reduce((sum, index) => {
        const val = parseFloat(row.cells[index]?.textContent.replace(/[^0-9.-]+/g, '') || '0');
        return !isNaN(val) ? sum + val : sum;
      }, 0);
      rowSums.push({ label, total: total.toFixed() });
    }
  });

  if (rowSums.length === 0) return showAlert('No matching rows found.');

  const ebitda =
    rowSums.find((rs) => rs.label.startsWith('Operating Profit')) ||
    rowSums.find((rs) => rs.label.startsWith('Financing Profit'));
  const pat = rowSums.find((rs) => rs.label.startsWith('Net Profit'));
  const cfo = rowSums.find((rs) => rs.label.startsWith('Cash from Operating Activity'));

  if (cfo && pat)
    rowSums.push({ label: 'CFO/PAT', total: ((cfo.total / pat.total) * 100).toFixed(2) + ' %' });
  if (cfo && ebitda)
    rowSums.push({
      label: 'CFO/EBITDA',
      total: ((cfo.total / ebitda.total) * 100).toFixed(2) + ' %',
    });

  const headerDisplay = `<div style="margin-bottom: 32px">${selectedNames.join(', ')}</div>`;
  const rowsDisplay = rowSums
    .map(
      (row, i) => `
      <div style="font-weight: 500; padding: 4px 2px; background: ${
        i % 2 === 0 ? 'rgb(248,248,255)' : ''
      }">${row.label}</div>
      <div style="text-align: right; padding: 4px 2px; background: ${
        i % 2 === 0 ? 'rgb(248,248,255)' : ''
      }">${row.total}</div>
    `,
    )
    .join('');

  createModal({
    title: 'Cash flows',
    content:
      headerDisplay +
      `<div style="display: grid; grid-template-columns: 1fr auto; row-gap: 12px">${rowsDisplay}</div>`,
    isHTML: true,
  });
}

function createModal({ title = 'Modal Title', content = '', isHTML = false }) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '9999',
  });

  const modal = document.createElement('div');
  Object.assign(modal.style, {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px',
    width: '100%',
    position: 'relative',
  });

  const header = document.createElement('h3');
  header.textContent = title;

  const body = document.createElement('div');
  isHTML ? (body.innerHTML = content) : (body.textContent = content);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    border: 'none',
    background: 'transparent',
    fontSize: '32px',
    cursor: 'pointer',
  });
  closeBtn.onclick = () => document.body.removeChild(overlay);

  modal.append(closeBtn, header, body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function addGrowthPopovers(rows) {
  clearPopovers(rows);

  rows.forEach((row) => {
    const numericValues = Array.from(row.cells).map((cell) =>
      parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')),
    );

    for (let i = 2; i < numericValues.length; i++) {
      const prev = numericValues[i - 1],
        curr = numericValues[i];
      if (isNaN(prev) || isNaN(curr) || prev === 0) continue;

      const growth = ((curr - prev) / Math.abs(prev)) * 100;
      const cell = row.cells[i];
      const popover = createPopover(`${growth.toFixed(2)}%`, growth);
      removeExistingPopover(cell);
      cell.style.position = 'relative';
      cell.appendChild(popover);
    }
  });
}

function addYoYGrowthPopovers(rows, halfYearlyResults) {
  clearPopovers(rows);
  const startIndex = halfYearlyResults ? 3 : 5;
  const columnComparisonIndex = halfYearlyResults ? 2 : 4;

  rows.forEach((row) => {
    const numericValues = Array.from(row.cells).map((cell) =>
      parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')),
    );

    for (let i = startIndex; i < numericValues.length; i++) {
      const prev = numericValues[i - columnComparisonIndex],
        curr = numericValues[i];
      if (isNaN(prev) || isNaN(curr) || prev === 0) continue;

      const growth = ((curr - prev) / Math.abs(prev)) * 100;
      const cell = row.cells[i];
      const popover = createPopover(`${growth.toFixed(2)}%`, growth);
      removeExistingPopover(cell);
      cell.style.position = 'relative';
      cell.appendChild(popover);
    }
  });
}

function clearPopovers(rows) {
  rows.forEach((row) => {
    Array.from(row.cells).forEach((cell) => {
      const popovers = cell.querySelectorAll('.growth-popover');
      popovers.forEach((p) => p.remove());
    });
  });
}
