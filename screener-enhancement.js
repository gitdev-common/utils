window.launchScreenerEnhancement = function () {
  if (window.calculationsApplied) {
    alert('Calculations have already been applied.');
    return;
  }
  window.unavailableRatios = [];

  injectStyles();
  const ROWS_TO_SELECT = [
    'Revenue',
    'Sales',
    'Operating Profit',
    'Financing Profit',
    'Net Profit',
    'EPS in Rs',
  ];
  const ROWS_FOR_GROWTH_TOOLTIP = ['EPS in Rs'];

  const pnlTable = document.getElementById('profit-loss');
  if (!pnlTable) return showAlert('Table with id "profit-loss" not found.');

  const headerCells = pnlTable.querySelectorAll('thead th');

  const selectedRows = getSelectedRows(pnlTable, ROWS_TO_SELECT).reverse();

  const cashFlowTable = document.getElementById('cash-flow');
  if (!cashFlowTable) return showAlert('Table with id "cash-flow" not found.');

  const cashFlowHeaderCells = cashFlowTable.querySelectorAll('thead th');
  const cashFlowHeaders = Array.from(cashFlowHeaderCells).map((cell) =>
    cell.textContent.trim().toLowerCase(),
  );
  const cashFlowBody = cashFlowTable.querySelector('tbody');

  addPATMarginRow('quarters');
  addPATMarginRow('profit-loss');
  transferRowsToCashFlow(selectedRows, headerCells, cashFlowHeaders, cashFlowBody);
  addGrowthPopovers(selectedRows, ROWS_FOR_GROWTH_TOOLTIP);
  addCheckboxesToHeaders(cashFlowHeaderCells);

  addSumButton(cashFlowHeaderCells, cashFlowBody, cashFlowTable);

  const quartyerlyTable = document.getElementById('quarters');
  if (!quartyerlyTable) return showAlert('Table with id "quarters" not found.');
  const selectedQuarterlyRows = getSelectedRows(quartyerlyTable, ROWS_TO_SELECT).reverse();
  const areResultsHalfYearly = quartyerlyTable.textContent?.includes('Half Yearly Results');

  window.growthMode = 'yoy';
  addYoYGrowthPopovers(selectedQuarterlyRows, areResultsHalfYearly, ROWS_FOR_GROWTH_TOOLTIP);

  const { value: pledgedPercentage, notFound: pledgeNotFound } =
    getQuickRatio('Pledged percentage');

  if (pledgeNotFound) {
    window.unavailableRatios.push('Pledged percentage');
  }

  if (document.querySelector('#shareholding')) {
    const totalPromoter = getLatestValueFromTable('#shareholding', 'Promoter') ?? 0;
    const pledgedInfoDiv = createSectionInfoLabel();

    const pledgedValue = totalPromoter ? ((pledgedPercentage / 100) * totalPromoter).toFixed(2) : 0;
    if (!pledgeNotFound) {
      pledgedInfoDiv.textContent = `Pledged: ${pledgedPercentage}% (${pledgedValue}% / ${totalPromoter}%)`;
    } else {
      pledgedInfoDiv.textContent = `Pledged percentage quick ratio not available!`;
    }

    document
      .querySelector('#quarterly-shp')
      ?.parentElement?.insertBefore(pledgedInfoDiv, document.querySelector('#quarterly-shp'));
  }

  const { value: contingentLiabilities, notFound: contingentLiabilitiesNotFound } = getQuickRatio(
    'Cont Liab',
    true,
  );
  if (contingentLiabilitiesNotFound) {
    window.unavailableRatios.push('Contingent Liabilities');
  }

  const contingentLiabilitiesDiv = createSectionInfoLabel();
  contingentLiabilitiesDiv.style.marginRight = '24px';

  if (document.querySelector('#balance-sheet table')) {
    if (!contingentLiabilitiesNotFound) {
      contingentLiabilitiesDiv.textContent = `Contingent liabilities: ${contingentLiabilities}`;
    } else {
      contingentLiabilitiesDiv.textContent = `Contingent liabilities quick ratio not available!`;
    }

    document
      .querySelector('#balance-sheet table')
      ?.parentElement?.insertBefore(
        contingentLiabilitiesDiv,
        document.querySelector('#balance-sheet table'),
      );
  }

  const toggleBtn = getContainerButton(window.growthMode === 'qoq' ? 'Viewing QoQ' : 'Viewing YoY');
  toggleBtn.addEventListener('click', () => {
    window.growthMode = window.growthMode === 'qoq' ? 'yoy' : 'qoq';
    toggleBtn.textContent = window.growthMode === 'qoq' ? 'Viewing QoQ' : 'Viewing YoY';
    if (window.growthMode === 'qoq') {
      addGrowthPopovers(selectedQuarterlyRows, ROWS_FOR_GROWTH_TOOLTIP);
    } else {
      addYoYGrowthPopovers(selectedQuarterlyRows, areResultsHalfYearly, ROWS_FOR_GROWTH_TOOLTIP);
    }
  });
  quartyerlyTable.parentElement.insertBefore(toggleBtn, quartyerlyTable);

  addMoreRatiosToTable();

  createDrawerWithLayoutToggle();

  const latestRevenue = parseFloat(
    getLatestValueFromTable('#profit-loss', 'Sales') ??
      getLatestValueFromTable('#profit-loss', 'Revenue'),
  );
  const latestOpm = parseFloat(
    getLatestValueFromTable('#profit-loss', 'OPM %') ??
      getLatestValueFromTable('#profit-loss', 'Financing Margin %'),
  );

  const latestDepreciation = parseFloat(getLatestValueFromTable('#profit-loss', 'Depreciation'));
  const latestInterestCost = parseFloat(getLatestValueFromTable('#profit-loss', 'Interest'));
  const otherCosts = latestDepreciation + latestInterestCost;

  const shareCapital = getLatestValueFromTable('#balance-sheet', 'Equity Capital');
  const reserves = getLatestValueFromTable('#balance-sheet', 'Reserves');
  const netWorth = parseFloat(shareCapital) + parseFloat(reserves);

  const { value: marketCap } = getQuickRatio('Market Cap');
  const { value: stockPE } = getQuickRatio('Stock P/E');
  const { value: enterpriseValue, notFound: evNotFound } = getQuickRatio('Enterprise Value');
  const { value: evEbitda, notFound: evEbitdaNotFound } = getQuickRatio('EVEBITDA');

  if (evNotFound) {
    window.unavailableRatios.push('Enterprise Value');
  }
  if (evEbitdaNotFound) {
    window.unavailableRatios.push('EV/EBITDA');
  }

  const finModellingBtn = getContainerButton('Financial modelling');
  finModellingBtn.addEventListener('click', () => {
    showFinancialModelModal(
      latestRevenue,
      marketCap,
      latestOpm,
      netWorth,
      enterpriseValue,
      otherCosts,
      stockPE,
      evEbitda,
    );
  });
  pnlTable.parentElement.insertBefore(finModellingBtn, pnlTable);

  window.calculationsApplied = true;
  if (window.unavailableRatios.length) {
    createModal({
      title: 'Missing Quick Ratios',
      content: `<div style="color: #c62828; font-size: 16px; margin-top: 16px;">
        <ul>
          ${window.unavailableRatios.map((ratio) => `<li>${ratio}</li>`).join('')}
        </ul>
        </div>`,
      isHTML: true,
    });
  }
};

function addPATMarginRow(tableId) {
  const pnlTable = document.getElementById(tableId);
  if (!pnlTable) return showAlert(`Table with id "${tableId}" not found.`);

  const tableBody = pnlTable.querySelector('tbody');
  const rows = Array.from(tableBody.querySelectorAll('tr'));

  const salesRow = rows.find((row) =>
    ['sales', 'revenue'].some((keyword) =>
      row.cells[0]?.textContent.trim().toLowerCase().startsWith(keyword),
    ),
  );
  const netProfitRow = rows.find((row) =>
    row.cells[0]?.textContent.trim().toLowerCase().startsWith('net profit'),
  );

  if (!salesRow || !netProfitRow) {
    return showAlert('Sales/Revenue or Net Profit row not found.');
  }

  const salesValues = Array.from(salesRow.cells)
    .slice(1)
    .map((cell) => parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0);
  const netProfitValues = Array.from(netProfitRow.cells)
    .slice(1)
    .map((cell) => parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')) || 0);

  const patMarginValues = netProfitValues.map((pat, index) => {
    const sales = salesValues[index];
    return sales ? ((pat / sales) * 100).toFixed(2) + '%' : '-';
  });

  const patMarginRow = document.createElement('tr');
  const labelCell = document.createElement('td');
  labelCell.textContent = 'PAT Margin %';
  labelCell.className = 'text';
  patMarginRow.appendChild(labelCell);

  patMarginValues.forEach((value) => {
    const cell = document.createElement('td');
    cell.textContent = value;
    patMarginRow.appendChild(cell);
  });

  netProfitRow.parentNode.insertBefore(patMarginRow, netProfitRow.nextSibling);
}

function createSectionInfoLabel() {
  return Object.assign(document.createElement('div'), {
    textContent: '',
    style: 'text-align: right; font-weight: 500; font-size: 15px; color: #c62828;',
  });
}

function getLatestValueFromTable(tableId, rowLabel, asIs = false) {
  const value = Array.from(document.querySelectorAll(`${tableId} table.data-table tbody tr`))
    .find((r) => r.cells[0].innerText.includes(rowLabel))
    ?.querySelectorAll('td:last-child')?.[0]
    ?.innerText?.split('\n')?.[0];

  return asIs ? value : value?.replaceAll(/[,|%]/g, '');
}

function getQuickRatio(ratioLabel, asIs = false) {
  const allRatios = document.querySelectorAll('#top-ratios li');
  let ratioValue = null;
  let notFound = true;

  for (let indx = 0; indx < allRatios.length; ++indx) {
    const elem = allRatios[indx];
    if (elem?.getElementsByClassName('name')?.[0]?.innerText === ratioLabel) {
      ratioValue = asIs
        ? elem?.getElementsByClassName('value')?.[0]?.innerText
        : elem
            ?.getElementsByClassName('value')?.[0]
            ?.innerText?.match(/[\d,.]+/)?.[0]
            ?.replace(/,/g, '');
      notFound = false;
      break;
    }
  }

  return {
    notFound,
    value: asIs ? ratioValue : parseFloat(ratioValue) || 0,
  };
}

function injectStyles() {
  if (document.getElementById('growth-popover-style')) return;

  const style = document.createElement('style');
  style.id = 'growth-popover-style';
  style.textContent = `
      .highlight-popover {
        outline: 1px solid #ffc107;
        background: #333 !important;
        z-index: 10;
        opacity: 1 !important;
      }
    `;
  document.head.appendChild(style);
}

function showAlert(message) {
  alert(message);
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

function getFormattedHeaderCellText(headerCell) {
  return Array.from(headerCell.childNodes)
    ?.filter((node) => node.nodeType === Node.TEXT_NODE)
    ?.map((node) => node.textContent.trim())
    ?.join(' ')
    ?.trim()
    ?.toLowerCase();
}

function transferRowsToCashFlow(selectedRows, headerCells, cashFlowHeaders, cashFlowBody) {
  selectedRows.forEach((row) => {
    const newRow = cashFlowBody.insertRow(0);
    const firstCellText = row.cells[0]?.textContent.trim();
    newRow.insertCell().textContent = firstCellText;

    row.querySelectorAll('td').forEach((cell, index) => {
      if (index > 0) {
        const headerText = getFormattedHeaderCellText(headerCells[index]);
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
    background: growth > 0 ? '#2e7d32' : '#c62828',
    color: '#fff',
    fontSize: '12px',
    padding: '2px 4px',
    borderRadius: '4px',
    top: '-10px',
    right: '2px',
    pointerEvents: 'auto',
  });
  return popover;
}

function removeExistingPopover(cell) {
  const existing = cell.querySelector('.growth-popover');
  if (existing) existing.remove();
}

function addCheckboxesToHeaders(headers) {
  headers.forEach((cell, index) => {
    const isLastIndex = index === headers?.length - 1;
    if (index > 0 && !cell.querySelector('input[type="checkbox"]')) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      if (isLastIndex) {
        checkbox.checked = true;
      }
      checkbox.style.marginRight = '5px';
      checkbox.style.cursor = 'pointer';
      checkbox.style.transform = 'scale(1.25)';
      cell.prepend(checkbox);
    }
  });
}

function addSumButton(headerCells, tableBody, tableContainer) {
  const button = getContainerButton('Cash Flow Insights');

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

function waitForChild(parentElement, conditionFn, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (!parentElement) {
      return reject(new Error('Parent element not found'));
    }

    const existingChild = conditionFn(parentElement);
    if (existingChild) return resolve(existingChild);

    const observer = new MutationObserver(() => {
      const child = conditionFn(parentElement);
      if (child) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(child);
      }
    });

    observer.observe(parentElement, {
      childList: true,
      subtree: true,
    });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error('Element not found within timeout'));
    }, timeout);
  });
}

const getTableCellWithText = (parent, cellSelector, text) => {
  const cells = Array.from(parent.querySelectorAll(cellSelector));
  return cells.find((cell) => cell.textContent.includes(text));
};

const expandCellAndWaitForContent = async (
  tableContainerSelector,
  parentCellText,
  childCellText,
) => {
  const cellSelector = 'td:nth-child(1)';
  const tableContainer = document.querySelector(tableContainerSelector);
  const childCell = getTableCellWithText(tableContainer, cellSelector, childCellText);

  if (!childCell) {
    const operatingActivityCell = getTableCellWithText(
      tableContainer,
      cellSelector,
      parentCellText,
    );
    operatingActivityCell?.querySelector('button').click();

    await waitForChild(
      tableContainer,
      (parent) => getTableCellWithText(parent, cellSelector, childCellText),
      2000,
    ).catch(console.error);
  }
};

async function sumSelectedColumns(headerCells, tableBody) {
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

  await expandCellAndWaitForContent('#cash-flow', 'Cash from Operating Activity', 'Other WC items');
  await expandCellAndWaitForContent(
    '#cash-flow',
    'Cash from Investing Activity',
    'Fixed assets purchased',
  );

  const keywords = [
    'Sales',
    'Revenue',
    'Operating Profit',
    'Financing Profit',
    'Net Profit',
    'Receivables',
    'Payables',
    'Inventory',
    'Other WC items',
    'Cash from Operating Activity',
    'Fixed assets purchased',
    'Fixed assets sold',
  ];

  const rowSums = [];

  tableBody.querySelectorAll('tr').forEach((row) => {
    const label = row.cells[0]?.textContent.trim()?.replace(/[+-]/g, '');
    if (keywords.some((k) => label.toLowerCase().startsWith(k.toLowerCase()))) {
      const total = selectedIndexes.reduce((sum, index) => {
        const val = parseFloat(row.cells[index]?.textContent.replace(/[^0-9.-]+/g, '') || '0');
        return !isNaN(val) ? sum + val : sum;
      }, 0);
      rowSums.push({ label, total: total.toFixed(2) });
    }
  });

  if (rowSums.length === 0) return showAlert('No matching rows found.');

  rowSums.sort((a, b) => {
    const aIndex = keywords.findIndex((k) => a.label.toLowerCase().startsWith(k.toLowerCase()));
    const bIndex = keywords.findIndex((k) => b.label.toLowerCase().startsWith(k.toLowerCase()));
    return aIndex - bIndex;
  });

  const ebitda =
    rowSums.find((rs) => rs.label.startsWith('Operating Profit')) ||
    rowSums.find((rs) => rs.label.startsWith('Financing Profit'));
  const pat = rowSums.find((rs) => rs.label.startsWith('Net Profit'));
  const cfo = rowSums.find((rs) => rs.label.startsWith('Cash from Operating Activity'));
  const fixedAssetsPurchased = rowSums.find((rs) => rs.label.startsWith('Fixed assets purchased'));
  const fixedAssetsSold = rowSums.find((rs) => rs.label.startsWith('Fixed assets sold'));

  if (fixedAssetsPurchased) {
    rowSums.push({
      label: 'Net Fixed assets purchased',
      total: (
        parseFloat(fixedAssetsPurchased?.total ?? 0) + parseFloat(fixedAssetsSold?.total ?? 0)
      )?.toFixed(2),
    });

    rowSums.push({
      label: 'Free cash flow',
      total: (
        parseFloat(cfo.total) +
        parseFloat(fixedAssetsPurchased?.total ?? 0) +
        parseFloat(fixedAssetsSold?.total ?? 0)
      )?.toFixed(2),
    });
  }
  if (cfo && pat)
    rowSums.push({ label: 'CFO/PAT', total: ((cfo.total / pat.total) * 100)?.toFixed(2) + ' %' });
  if (cfo && ebitda)
    rowSums.push({
      label: 'CFO/EBITDA',
      total: ((cfo.total / ebitda.total) * 100).toFixed(2) + ' %',
    });

  const skippedRows = ['Fixed assets purchased', 'Fixed assets sold'];
  const headerDisplay = `<div style="margin-bottom: 32px">${selectedNames.join(', ')}</div>`;
  const rowsDisplay = rowSums
    ?.filter((row) => !skippedRows.some((r) => row.label.startsWith(r)))
    .map((row, i) => {
      const isLabelBold =
        row.label?.startsWith('Cash from Operating Activity') ||
        row.label?.startsWith('Net Profit');
      return `
          <div style="font-weight: ${isLabelBold ? '600' : ''}; padding: 8px 4px; background: ${
        i % 2 === 0 ? 'rgb(248,248,255)' : ''
      }">${row.label}</div>
          <div style="font-weight: ${
            isLabelBold ? '600' : ''
          }; text-align: right; padding: 8px 4px; background: ${
        i % 2 === 0 ? 'rgb(248,248,255)' : ''
      }">${row.total}</div>
        `;
    })
    .join('');

  createModal({
    title: 'Cash flow insights',
    content:
      headerDisplay +
      `<div style="display: grid; grid-template-columns: 1fr auto;">${rowsDisplay}</div>`,
    isHTML: true,
  });
}

function createModal({ title = 'Modal Title', content = '', isHTML = false, maxWidth = '400px' }) {
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
    maxWidth: maxWidth,
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

  return overlay;
}

function addGrowthPopovers(rows, rowsForTooltipOnly) {
  clearPopovers(rows);

  rows.forEach((row) => {
    const numericValues = Array.from(row.cells).map((cell) =>
      parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')),
    );

    const placeOnlyTooltip = rowsForTooltipOnly.some((r) =>
      row.cells?.[0]?.textContent?.trim()?.startsWith(r),
    );

    for (let i = 2; i < numericValues.length; i++) {
      const prev = numericValues[i - 1],
        curr = numericValues[i];
      if (isNaN(prev) || isNaN(curr)) continue;

      const growth = ((curr - prev) / Math.abs(prev || 1)) * 100;
      const cell = row.cells[i];
      removeExistingPopover(cell);
      cell.style.position = 'relative';

      if (!placeOnlyTooltip) {
        const popover = createPopover(`${growth.toFixed(2)}%`, growth);
        cell.appendChild(popover);
      } else {
        cell.setAttribute('data-tooltip', `${growth.toFixed(2)}%`);
      }
    }
  });
}

function highlightPopover(id, highlight) {
  const popover = document.getElementById(id);
  if (popover) {
    popover.classList.toggle('highlight-popover', highlight);
  }
}

function addYoYGrowthPopovers(rows, halfYearlyResults, rowsForTooltipOnly) {
  clearPopovers(rows);
  const startIndex = halfYearlyResults ? 3 : 5;
  const columnComparisonIndex = halfYearlyResults ? 2 : 4;

  rows.forEach((row, rowIndex) => {
    const numericValues = Array.from(row.cells).map((cell) =>
      parseFloat(cell.textContent.replace(/[^0-9.-]+/g, '')),
    );

    const placeOnlyTooltip = rowsForTooltipOnly.some((r) =>
      row.cells?.[0]?.textContent?.trim()?.startsWith(r),
    );

    for (let i = 1; i < numericValues.length; i++) {
      const prevIndex = i - columnComparisonIndex;
      const curr = numericValues[i];
      const prev = numericValues[prevIndex];
      const currentCell = row.cells[i];

      removeExistingPopover(currentCell);
      currentCell.style.position = 'relative';

      const popoverId = `popover-${rowIndex}-${i}`;
      const prevPopoverId = `popover-${rowIndex}-${prevIndex}`;

      if (placeOnlyTooltip && i >= startIndex && !isNaN(prev) && !isNaN(curr)) {
        const growth = ((curr - prev) / Math.abs(prev || 1)) * 100;
        currentCell.setAttribute('data-tooltip', `${growth.toFixed(2)}%`);
        continue;
      }

      let popover;
      if (i < startIndex || isNaN(prev) || isNaN(curr)) {
        popover = createPopover('', 0);
        popover.style.opacity = '0';
        popover.style.width = '18px';
        popover.style.height = '13px';
        popover.style.pointerEvents = 'none';
      } else {
        const growth = ((curr - prev) / Math.abs(prev || 1)) * 100;
        popover = createPopover(`${growth.toFixed(2)}%`, growth);

        popover.addEventListener('mouseenter', () => {
          highlightPopover(popoverId, true);
          highlightPopover(prevPopoverId, true);
        });

        popover.addEventListener('mouseleave', () => {
          highlightPopover(popoverId, false);
          highlightPopover(prevPopoverId, false);
        });
      }

      popover.id = popoverId;
      currentCell.appendChild(popover);
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

async function addMoreRatiosToTable() {
  await expandCellAndWaitForContent('#balance-sheet', 'Other Assets', 'Cash Equivalents');

  const balanceSheetSection = document.querySelector('#balance-sheet');
  const ratiosSection = document.querySelector('#ratios');
  const pnlSection = document.querySelector('#profit-loss');
  const cashflowSection = document.querySelector('#cash-flow');

  if (!balanceSheetSection || !ratiosSection) {
    console.error('Sections not found!');
    return;
  }

  const bsHeaders = getHeaders(balanceSheetSection);
  const ratioHeaders = getHeaders(ratiosSection);
  const pnlHeaders = getHeaders(pnlSection);
  const cashflowHeaders = getHeaders(cashflowSection);

  const borrowings = getRowValues('Borrowing', balanceSheetSection);
  const equityCapital = getRowValues('Equity Capital', balanceSheetSection);
  const reserves = getRowValues('Reserves', balanceSheetSection);
  const receivables = getRowValues('Trade receivables', balanceSheetSection);
  const salesRows = getRowValues('Sales', pnlSection);
  const netProfit = getRowValues('Net Profit', pnlSection);
  const pbt = getRowValues('Profit before tax', pnlSection);
  const interest = getRowValues('Interest', pnlSection);
  const sales = salesRows?.length ? salesRows : getRowValues('Revenue', pnlSection);
  const operatingProfit = getRowValues('Operating Profit', pnlSection);
  const cashEquivalents = getRowValues('Cash Equivalents', balanceSheetSection);
  const taxRates = getRowValues('Tax %', pnlSection);
  const cfo = getRowValues('Cash from Operating Activity', cashflowSection);

  if (!(borrowings.length && equityCapital.length && reserves.length)) {
    console.error('Required rows not found or empty!');
    return;
  }

  const salesPerYearMap = createSalesPerYearMap(pnlHeaders, sales);
  const receivablesPerYearMap = createSalesPerYearMap(bsHeaders, receivables);
  const debtToEquityMap = createDebtToEquityMap(bsHeaders, borrowings, equityCapital, reserves);
  const receivablesToSalesMap = createReceivablesToSalesMap(
    bsHeaders,
    receivables,
    salesPerYearMap,
  );
  const receivablesGrowthMap = createGrowthMap(bsHeaders, receivablesPerYearMap);
  const salesGrowthMap = createGrowthMap(pnlHeaders, salesPerYearMap);
  const receivablesVsSalesGrowthMap = createReceivablesVsSalesGrowthMap(
    bsHeaders,
    receivablesGrowthMap,
    salesGrowthMap,
  );
  const roicMap = createROICMap(
    bsHeaders,
    equityCapital,
    reserves,
    borrowings,
    cashEquivalents,
    operatingProfit,
    taxRates,
  );
  const roiicMap = createROIICMap(
    bsHeaders,
    equityCapital,
    reserves,
    borrowings,
    cashEquivalents,
    operatingProfit,
    taxRates,
  );
  const interestCoverageMap = createInterestCoverageMap(pnlHeaders, pbt, interest);
  const cfoPatGrowthMap = createCfoRatiosMap(cashflowHeaders, cfo, netProfit);
  const cfoEbitdaGrowthMap = createCfoRatiosMap(cashflowHeaders, cfo, operatingProfit);

  const ratiosTableBody = ratiosSection.querySelector('tbody');
  const roeExists = checkIfRatioExists(ratiosTableBody, 'ROE');
  if (!roeExists) {
    const roeMap = createROEMap(bsHeaders, equityCapital, reserves, netProfit);
    addSimpleRow(ratiosTableBody, ratioHeaders, 'ROE', roeMap);
  }
  if (!checkIfRatioExists(ratiosTableBody, 'ROCE')) {
    const roceMap = createROCEMap(bsHeaders, equityCapital, reserves, borrowings, pbt, interest);
    addSimpleRow(ratiosTableBody, ratioHeaders, 'ROCE', roceMap);
  }
  addRatioRow(ratiosTableBody, ratioHeaders, 'Debt to Equity', debtToEquityMap, 'D/E');
  addRatioRow(ratiosTableBody, ratioHeaders, 'Interest coverage', interestCoverageMap, 'IC');
  addRatioRow(
    ratiosTableBody,
    ratioHeaders,
    'Receivables to Sales',
    receivablesToSalesMap,
    'R/S',
    false,
  );
  addSimpleRow(
    ratiosTableBody,
    ratioHeaders,
    'Receivables / Sales Growth',
    receivablesVsSalesGrowthMap,
    false,
  );

  addRatioRow(ratiosTableBody, ratioHeaders, 'ROIC', roicMap, 'ROIC');
  addRatioRow(ratiosTableBody, ratioHeaders, 'ROIIC', roiicMap, 'ROIIC');
  addRatioRow(ratiosTableBody, ratioHeaders, 'CFO/PAT', cfoPatGrowthMap, 'CFO/PAT %', false);
  addRatioRow(
    ratiosTableBody,
    ratioHeaders,
    'CFO/EBITDA',
    cfoEbitdaGrowthMap,
    'CFO/EBITDA %',
    false,
  );

  function getHeaders(section) {
    return Array.from(section.querySelectorAll('thead th'))
      .map((th) => th.innerText.trim())
      .filter((text) => !text.includes('('));
  }

  function getRowValues(label, section) {
    const rows = section.querySelectorAll('tbody tr');
    for (let row of rows) {
      const text = row.querySelector('td.text')?.innerText?.trim();
      if (text?.startsWith(label)) {
        return Array.from(row.querySelectorAll('td:not(.text)')).map((td) => {
          const num = parseFloat(td.innerText.replace(/[,|%]/g, ''));
          return isNaN(num) ? null : num;
        });
      }
    }
    return [];
  }

  // Helper: Create per year map
  function createSalesPerYearMap(headers, values) {
    const valueMap = {};
    headers.slice(1).forEach((year, i) => {
      valueMap[year] = values?.[i] ?? 0;
    });
    return valueMap;
  }

  function createDebtToEquityMap(headers, borrowings, equityCapital, reserves) {
    const debtToEquityMap = {};
    headers.slice(1).forEach((year, i) => {
      const borrow = borrowings[i];
      const equity = (equityCapital[i] ?? 0) + (reserves[i] ?? 0);
      debtToEquityMap[year] = {
        ratioValue: equity && borrow != null ? (borrow / equity).toFixed(2) : null,
        numerator: borrow,
        denominator: equity,
      };
    });
    return debtToEquityMap;
  }

  function createReceivablesToSalesMap(headers, receivables, salesPerYearMap) {
    const receivablesToSalesMap = {};
    headers.slice(1).forEach((year, i) => {
      const receivable = receivables[i] ?? 0;
      const sales = salesPerYearMap[year] ?? 0;

      receivablesToSalesMap[year] = {
        ratioValue: sales ? (receivable / sales).toFixed(2) : receivable === 0 ? '0.00' : null,
        numerator: receivable,
        denominator: sales,
      };
    });
    return receivablesToSalesMap;
  }

  function createInterestCoverageMap(headers, allPbt, allInterestCost) {
    const interestCoverageMap = {};
    headers.slice(1).forEach((year, i) => {
      const interestCost = allInterestCost[i];
      const ebit = (allPbt[i] ?? 0) + (interestCost ?? 0);

      interestCoverageMap[year] = {
        ratioValue: ebit ? (ebit / interestCost).toFixed(2) : interestCost === 0 ? '0.00' : null,
        numerator: ebit,
        denominator: interestCost,
      };
    });
    return interestCoverageMap;
  }

  function createCfoRatiosMap(headers, cfoValues, earnings) {
    const cfoRatiosMap = {};
    headers.slice(1).forEach((year, i) => {
      const cfo = cfoValues[i] ?? 0;
      const profit = earnings[i] ?? 0;

      const cfoToPat = profit !== 0 ? ((cfo / profit) * 100).toFixed(2) + '%' : '-';

      cfoRatiosMap[year] = {
        ratioValue: cfoToPat,
        numerator: cfo,
        denominator: profit,
      };
    });
    return cfoRatiosMap;
  }

  function createGrowthMap(headers, valueMap) {
    const growthMap = {};
    let prevValue = null;

    headers.slice(1).forEach((year) => {
      const currentValue = valueMap[year];
      if (prevValue != null && currentValue != null && prevValue !== 0) {
        let growth = ((currentValue - prevValue) / Math.abs(prevValue)) * 100;
        if (!isFinite(growth) || isNaN(growth)) {
          growth = 0;
        }
        growthMap[year] = growth;
      } else {
        growthMap[year] = 0;
      }
      prevValue = currentValue;
    });

    return growthMap;
  }

  function createReceivablesVsSalesGrowthMap(headers, receivablesGrowthMap, salesGrowthMap) {
    const map = {};
    headers.slice(1).forEach((year) => {
      const receivablesGrowth = receivablesGrowthMap[year] ?? 0;
      const salesGrowth = salesGrowthMap[year] ?? 0;

      map[year] = `${receivablesGrowth.toFixed(0)}% / ${salesGrowth.toFixed(0)}%`;
    });
    return map;
  }

  function addRatioRow(tableBody, headers, label, ratioMap, toolTipLabel, striped = true) {
    const row = document.createElement('tr');
    row.className = striped ? 'stripe' : '';

    const labelCell = document.createElement('td');
    labelCell.className = 'text';
    labelCell.innerText = label;
    row.appendChild(labelCell);

    headers.slice(1).forEach((year) => {
      const cell = document.createElement('td');
      const ratioData = ratioMap[year];
      const ratioValue = ratioData?.ratioValue;
      const numerator = ratioData?.numerator;
      const denominator = ratioData?.denominator;

      let displayValue = '-';
      let tooltipText = '';

      if (ratioValue !== null) {
        displayValue = ratioValue;

        tooltipText =
          numerator != null && denominator != null
            ? `${toolTipLabel}: ${numerator?.toFixed(2)}/${denominator?.toFixed(2)}`
            : '';
      }

      if (tooltipText) {
        cell.setAttribute('data-tooltip', tooltipText);
      } else {
        cell.removeAttribute('data-tooltip');
      }

      cell.innerText = displayValue;
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  }

  function addSimpleRow(tableBody, headers, label, textMap, striped = true) {
    const row = document.createElement('tr');
    row.className = striped ? 'stripe' : '';

    const labelCell = document.createElement('td');
    labelCell.className = 'text';
    labelCell.innerText = label;
    row.appendChild(labelCell);

    headers.slice(1).forEach((year) => {
      const cell = document.createElement('td');
      cell.innerText = textMap[year] ?? '-';
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  }

  function checkIfRatioExists(tableBody, ratioName) {
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    return rows.some((row) =>
      row.querySelector('td.text')?.innerText.trim()?.startsWith(ratioName),
    );
  }

  function createROEMap(headers, equityCapital, reserves, netProfit) {
    const roeMap = {};
    headers.slice(1).forEach((year, i) => {
      const equity = (equityCapital[i] ?? 0) + (reserves[i] ?? 0);
      const profit = netProfit?.[i] ?? 0;
      const roe = equity !== 0 ? (profit / equity) * 100 : 0;
      roeMap[year] = `${roe.toFixed(1)}%`;
    });
    return roeMap;
  }

  function createROCEMap(headers, equityCapital, reserves, borrowings, pbt, interest) {
    const roceMap = {};

    headers.slice(1).forEach((year, i) => {
      const equity = (equityCapital[i] ?? 0) + (reserves[i] ?? 0);
      const debt = borrowings[i] ?? 0;
      const equityPrev = (equityCapital[i - 1] ?? null) + (reserves[i - 1] ?? null);
      const debtPrev = borrowings[i - 1] ?? null;

      const prevDataExists =
        equityCapital[i - 1] != null || reserves[i - 1] != null || borrowings[i - 1] != null;

      if (!prevDataExists) {
        roceMap[year] = '-';
        return;
      }

      const avgCapitalEmployed = (equity + debt + equityPrev + debtPrev) / 2;

      const pbtValue = pbt[i] ?? 0;
      const interestValue = interest[i] ?? 0;

      const numerator = pbtValue + interestValue;

      const roce = avgCapitalEmployed !== 0 ? (numerator / avgCapitalEmployed) * 100 : 0;

      roceMap[year] = roce.toFixed(1) + '%';
    });

    return roceMap;
  }

  function createROICMap(
    headers,
    equityCapital,
    reserves,
    borrowings,
    cashEquivalents,
    operatingProfit,
    taxRates,
  ) {
    const roicMap = {};

    headers.slice(1).forEach((year, i) => {
      const equity = (equityCapital[i] ?? 0) + (reserves[i] ?? 0);
      const debt = borrowings[i] ?? 0;
      const cash = cashEquivalents[i] ?? 0;
      const opProfit = operatingProfit[i] ?? 0;

      const investedCapital = equity + debt - cash;
      const nopat = opProfit * (1 - (taxRates?.[i] ?? 0) / 100);

      if (investedCapital === 0 || isNaN(investedCapital)) {
        roicMap[year] = {
          ratioValue: '-',
          numerator: null,
          denominator: null,
        };
        return;
      }

      const roic = (nopat / investedCapital) * 100;

      roicMap[year] = {
        ratioValue: roic?.toFixed(1) + '%',
        numerator: parseFloat(nopat?.toFixed(1)),
        denominator: parseFloat(investedCapital?.toFixed(1)),
      };
    });

    return roicMap;
  }

  function createROIICMap(
    headers,
    equityCapital,
    reserves,
    borrowings,
    cashEquivalents,
    operatingProfit,
    taxRates,
  ) {
    const roiicMap = {};

    const nopats = [];
    const investedCapitals = [];

    headers.slice(1).forEach((_, i) => {
      const equity = (equityCapital[i] ?? 0) + (reserves[i] ?? 0);
      const debt = borrowings[i] ?? 0;
      const cash = cashEquivalents[i] ?? 0;
      const opProfit = operatingProfit[i] ?? 0;
      const taxRate = (taxRates?.[i] ?? 0) / 100;

      const ic = equity + debt - cash;
      const nopat = opProfit * (1 - taxRate);

      nopats.push(nopat);
      investedCapitals.push(ic);
    });

    headers.slice(1).forEach((year, i) => {
      if (i === 0 || !isFinite(investedCapitals[i]) || !isFinite(investedCapitals[i - 1])) {
        roiicMap[year] = {
          ratioValue: '-',
          numerator: null,
          denominator: null,
        };
        return;
      }

      const deltaNOPAT = nopats[i] - nopats[i - 1];
      const deltaIC = investedCapitals[i] - investedCapitals[i - 1];

      if (deltaIC === 0 || !isFinite(deltaIC)) {
        roiicMap[year] = {
          ratioValue: '-',
          numerator: null,
          denominator: null,
        };
        return;
      }

      const roiic = (deltaNOPAT / deltaIC) * 100;

      roiicMap[year] = {
        ratioValue: roiic.toFixed(1) + '%',
        numerator: parseFloat(deltaNOPAT.toFixed(1)),
        denominator: parseFloat(deltaIC.toFixed(1)),
      };
    });

    return roiicMap;
  }
}

function createDrawerWithLayoutToggle() {
  window.setDrawerContent = function (htmlOrElement) {
    const content = document.querySelector('#drawer-content');
    if (!content) return;

    if (typeof htmlOrElement === 'string') {
      content.innerHTML += htmlOrElement;
    } else if (htmlOrElement instanceof HTMLElement) {
      content.appendChild(htmlOrElement);
    }
  };

  let drawerScriptLoaded = false;

  function loadDrawerScript(src) {
    return new Promise((resolve, reject) => {
      if (drawerScriptLoaded) return resolve();

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => {
        drawerScriptLoaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const drawer = document.createElement('div');
  drawer.id = 'drawer';

  const handle = document.createElement('div');
  handle.id = 'drawer-handle';
  handle.innerText = '≡';

  const content = document.createElement('div');
  content.id = 'drawer-content';
  content.style.overflowY = 'auto';
  content.style.maxHeight = '100vh';

  const toggleLayoutBtn = document.createElement('button');
  toggleLayoutBtn.id = 'layout-toggle-btn';
  toggleLayoutBtn.textContent = 'Fix';
  toggleLayoutBtn.style.fontWeight = 'normal';
  toggleLayoutBtn.style.height = '32px';
  toggleLayoutBtn.style.padding = '4px';

  toggleLayoutBtn.addEventListener('click', () => {
    const isExpanded = drawer.classList.toggle('expanded');
    pageWrapper.classList.toggle('shifted', isExpanded);
  });

  const headerDiv = document.createElement('div');
  headerDiv.style.display = 'flex';
  headerDiv.style.justifyContent = 'space-between';
  headerDiv.innerHTML = `<h2 style="margin-top: 0;">Financials checklist</h2>`;
  headerDiv.appendChild(toggleLayoutBtn);

  content.innerHTML = '';
  content.appendChild(headerDiv);

  drawer.appendChild(handle);
  drawer.appendChild(content);

  // Create wrapper for existing content
  const pageWrapper = document.createElement('div');
  pageWrapper.id = 'page-wrapper';

  while (document.body.firstChild) {
    pageWrapper.appendChild(document.body.firstChild);
  }

  document.body.appendChild(drawer);
  document.body.appendChild(pageWrapper);

  const styles = `
          body {
            margin: 0;
            padding: 0;
          }
      
          #drawer {
            position: fixed;
            top: 0;
            left: -20%;
            width: 20%;
            height: 100%;
            background: white;
            box-shadow: 2px 0 4px rgba(0,0,0,0.2);
            transition: left 0.3s ease, width 0.3s ease;
            z-index: 9999;
            font-family: sans-serif;
          }
      
          #drawer.open {
            left: 0;
          }
      
          #drawer.expanded {
            width: 20%;
          }
      
          #drawer-handle {
            position: absolute;
            right: -30px;
            top: 50%;
            transform: translateY(-50%);
            width: 30px;
            height: 60px;
            background: white;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0 5px 5px 0;
            box-shadow: 3px 0 4px rgba(0,0,0,0.2);
          }
      
          #drawer-content {
            padding: 20px;
          }
      
          #page-wrapper {
            transition: margin-left 0.3s ease, width 0.3s ease;
          }
      
          #page-wrapper.shifted {
            margin-left: 20%;
            width: 80%;
          }
        `;

  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);

  handle.addEventListener('click', () => {
    const isOpening = !drawer.classList.contains('open');
    drawer.classList.toggle('open');

    if (window.guideInfoLoaded) {
      return;
    }

    if (isOpening) {
      loadDrawerScript('https://cdn.jsdelivr.net/gh/gitdev-common/utils@1.0.11/screener-guide.js')
        .then(() => {
          window.guideInfoLoaded = true;
        })
        .catch((err) => {
          console.error('Failed to load drawer script:', err);
        });
    } else {
      drawer.classList.remove('expanded');
      pageWrapper.classList.remove('shifted');
    }
  });
}

function showFinancialModelModal(
  currentRevenue,
  currentMCap,
  currentEbitdaMargin,
  currentNetWorth,
  currentEnterpriseValue = 0,
  currentOtherCosts = 30,
  currentStockPE = 20,
  currentEvEbitda = 15,
) {
  const content = getFinancialModelHTML(
    currentRevenue,
    currentMCap,
    currentNetWorth,
    currentEnterpriseValue,
  );
  createModal({
    title: 'Financial Modelling (Bull / Base / Bear)',
    content,
    isHTML: true,
    maxWidth: '1200px',
  });

  function calculateGrowthMultiple(cagrPercent, years) {
    const cagr = cagrPercent / 100;
    const growthMultiple = Math.pow(1 + cagr, years);
    return growthMultiple;
  }

  setTimeout(() => {
    const methodSelector = document.getElementById('valuation-method');
    const tableContainer = document.getElementById('scenario-table');

    function renderScenarioTable(method) {
      const rows = ['Bull', 'Base', 'Bear']
        .map((s) => {
          const revGrowth = s === 'Bull' ? 25 : s === 'Base' ? 20 : 15;
          const ebitdaMargin =
            s === 'Base'
              ? currentEbitdaMargin
              : s === 'Bull'
              ? currentEbitdaMargin + 2
              : currentEbitdaMargin - 2;
          const otherCosts =
            s === 'Base'
              ? currentOtherCosts
              : s === 'Bull'
              ? (0.9 * currentOtherCosts).toFixed(1)
              : (1.1 * currentOtherCosts).toFixed(1);
          const stockPE =
            s === 'Base'
              ? parseInt(currentStockPE)
              : s === 'Bull'
              ? parseInt(1.2 * currentStockPE)
              : parseInt(0.8 * currentStockPE);
          const evEbitda =
            s === 'Base'
              ? parseInt(currentEvEbitda)
              : s === 'Bull'
              ? parseInt(1.2 * currentEvEbitda)
              : parseInt(0.8 * currentEvEbitda);

          const calcIcon = `<svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  viewBox="0 0 16 16">
                  <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM4 2.5v2a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5zM4.5 6.5a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5h-1zM7.5 6a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5h-1zM10.5 6.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-1z" />
                </svg>`;

          if (method === 'pe') {
            return `
                  <tr>
                    <td>${s}</td>
                    <td>
                      <div style="display: flex; align-items: center;">
                        <input type="number" id="${s}-rev" value="${revGrowth}">
                        <div style="display: flex; align-items: center; margin-left: 8px; cursor: pointer;" onclick="openCAGRCalculator(
                          '${s}-rev',
                            document.getElementById('rev').value,
                            document.getElementById('years').value
                        )">
                          ${calcIcon}
                        </div>
                      </div>
                    </td>
                    <td><input type="number" id="${s}-ebitda" value="${ebitdaMargin}"></td>
                    <td><input type="number" id="${s}-other" value="${otherCosts}"></td>
                    <td><input type="number" id="${s}-tax" value="26"></td>
                    <td><input type="number" id="${s}-pe" value="${stockPE}"></td>
                  </tr>`;
          }

          if (method === 'ev_ebitda') {
            return `
                  <tr>
                    <td>${s}</td>
                    <td>
                    <div style="display: flex; align-items: center;">
                        <input type="number" id="${s}-rev" value="${revGrowth}">
                        <div style="display: flex; align-items: center; margin-left: 8px; cursor: pointer;" onclick="openCAGRCalculator(
                          '${s}-rev',
                            document.getElementById('rev').value,
                            document.getElementById('years').value
                        )">
                          ${calcIcon}
                        </div>
                      </div>
                      </td>
                    <td><input type="number" id="${s}-ebitda" value="${ebitdaMargin}"></td>
                    <td><input type="number" id="${s}-evEbitda" value="${evEbitda}"></td>
                  </tr>`;
          }

          if (method === 'pb') {
            return `
                  <tr>
                    <td>${s}</td>
                    <td>
                    <div style="display: flex; align-items: center;">
                        <input type="number" id="${s}-networthGrowth" value="${revGrowth}">
                        <div style="display: flex; align-items: center; margin-left: 8px; cursor: pointer;" onclick="openCAGRCalculator(
                          '${s}-networthGrowth',
                            document.getElementById('networth').value,
                            document.getElementById('years').value
                        )">
                          ${calcIcon}
                        </div>
                      </div>
                    </td>
                    <td><input type="number" id="${s}-pb" value="${
              s === 'Bull' ? 6 : s === 'Base' ? 4 : 2
            }"></td>
                  </tr>`;
          }

          return null;
        })
        .join('');

      let thead = '';
      if (method === 'pe') {
        thead = `
              <tr>
                <th>Scenario</th>
                <th>Rev CAGR %</th>
                <th>EBITDA Margin %</th>
                <th>Other Costs</th>
                <th>Tax Rate %</th>
                <th>Exit PE</th>
              </tr>`;
      } else if (method === 'ev_ebitda') {
        thead = `
              <tr>
                <th>Scenario</th>
                <th>Rev CAGR %</th>
                <th>EBITDA Margin %</th>
                <th>Exit EV / EBITDA</th>
              </tr>`;
      } else {
        thead = `
              <tr>
                <th>Scenario</th>
                <th>Net Worth CAGR %</th>
                <th>Exit P/B</th>
              </tr>`;
      }

      tableContainer.innerHTML = `
            <table>
              <thead>${thead}</thead>
              <tbody>${rows}</tbody>
            </table>
          `;
    }

    renderScenarioTable('pe'); // default

    methodSelector.addEventListener('change', () => {
      renderScenarioTable(methodSelector.value);
      document.getElementById('results').innerHTML = '';
    });

    document.getElementById('calculate-btn')?.addEventListener('click', () => {
      const rev = parseFloat(document.getElementById('rev').value);
      const mcapVal = parseFloat(document.getElementById('mcap').value);
      const years = parseInt(document.getElementById('years').value);
      const entValue = parseFloat(document.getElementById('enterpriseValue').value || 0);
      const netWorth = document.getElementById('networth').value;
      const method = document.getElementById('valuation-method').value;
      const qip = parseFloat(document.getElementById('qip').value || 0);
      const mcap = mcapVal + qip;
      const enterpriseValue = entValue + qip;

      const results = [];

      for (const s of ['Bull', 'Base', 'Bear']) {
        let futureMCap = 0;

        if (method === 'pe') {
          const revGrowth = parseFloat(document.getElementById(`${s}-rev`).value) / 100;
          const ebitdaMargin = parseFloat(document.getElementById(`${s}-ebitda`).value) / 100;
          const otherCostVal = parseFloat(document.getElementById(`${s}-other`).value);
          const taxPct = parseFloat(document.getElementById(`${s}-tax`).value) / 100;
          const pe = parseFloat(document.getElementById(`${s}-pe`).value);

          const futureRevenue = rev * Math.pow(1 + revGrowth, years);
          const ebitda = futureRevenue * ebitdaMargin;
          const nopat = (ebitda - otherCostVal) * (1 - taxPct);
          futureMCap = nopat * pe;
          const cagr = (Math.pow(futureMCap / mcap, 1 / years) - 1) * 100;
          const forwardMultiple = (mcap / nopat).toFixed(1);

          results.push({
            scenario: s,
            futureRevenue: futureRevenue.toFixed(0),
            futurePAT: nopat.toFixed(0),
            futureMCap: futureMCap.toFixed(0),
            cagr: `${cagr.toFixed(2)} % (${calculateGrowthMultiple(cagr, years).toFixed(1)}x)`,
            forwardMultiple,
          });
        } else if (method === 'ev_ebitda') {
          const revGrowth = parseFloat(document.getElementById(`${s}-rev`).value) / 100;
          const ebitdaMargin = parseFloat(document.getElementById(`${s}-ebitda`).value) / 100;
          const multiple = parseFloat(document.getElementById(`${s}-evEbitda`).value);

          const futureRevenue = rev * Math.pow(1 + revGrowth, years);
          const ebitda = futureRevenue * ebitdaMargin;
          futureMCap = ebitda * multiple;
          const cagr = (Math.pow(futureMCap / enterpriseValue, 1 / years) - 1) * 100;
          const forwardMultiple = (enterpriseValue / ebitda).toFixed(1);

          results.push({
            scenario: s,
            futureRevenue: futureRevenue.toFixed(0),
            futureEBITDA: ebitda.toFixed(0),
            futureMCap: futureMCap.toFixed(0),
            cagr: `${cagr.toFixed(2)} % (${calculateGrowthMultiple(cagr, years).toFixed(1)}x)`,
            forwardMultiple,
          });
        } else if (method === 'pb') {
          const netWorthGrowthRate =
            parseFloat(document.getElementById(`${s}-networthGrowth`).value) / 100;
          const pb = parseFloat(document.getElementById(`${s}-pb`).value);
          const futureNetWorth = netWorth * Math.pow(1 + netWorthGrowthRate, years) + qip;
          futureMCap = futureNetWorth * pb;
          const cagr = (Math.pow(futureMCap / mcap, 1 / years) - 1) * 100;
          const forwardMultiple = (mcap / futureNetWorth).toFixed(1);

          results.push({
            scenario: s,
            futureNetWorth: futureNetWorth.toFixed(0),
            futureMCap: futureMCap.toFixed(0),
            cagr: `${cagr.toFixed(2)} % (${calculateGrowthMultiple(cagr, years).toFixed(1)}x)`,
            forwardMultiple,
          });
        }
      }

      const headers =
        method === 'pe'
          ? ['Future Revenue', 'Future PAT (Fwd PE)', 'Future MCap']
          : method === 'ev_ebitda'
          ? ['Future Revenue', 'Future EBITDA (Fwd EV/EBITDA)', 'Future EV']
          : ['Future Net Worth (Fwd PB)', 'Future MCap'];

      document.getElementById('results').innerHTML = `
            <h4>Results</h4>
            <table style="width:100%; border-collapse: collapse; font-size: 1.4rem; margin-top: 1rem">
              <thead>
                <tr>
                  <th>Scenario</th>
                  ${headers.map((h) => `<th>${h}</th>`).join('')}
                  <th>Expected CAGR</th>
                </tr>
              </thead>
              <tbody>
                ${results
                  .map((r) => {
                    return `
                    <tr>
                      <td>${r.scenario}</td>
                      ${headers
                        .map((h) => {
                          if (h.includes('Revenue')) return `<td>${r.futureRevenue}</td>`;
                          if (h.includes('PAT'))
                            return `<td>${r.futurePAT} (Fwd: ${r.forwardMultiple})</td>`;
                          if (h.includes('EBITDA'))
                            return `<td>${r.futureEBITDA} (Fwd: ${r.forwardMultiple})</td>`;
                          if (h.includes('Net Worth'))
                            return `<td>${r.futureNetWorth} (Fwd: ${r.forwardMultiple})</td>`;
                          return '';
                        })
                        .join('')}
                      <td>${r.futureMCap}</td>
                      <td>${r.cagr}</td>
                    </tr>`;
                  })
                  .join('')}
              </tbody>
            </table>`;
    });
  }, 0);
}

function getFinancialModelHTML(
  currentRevenue,
  currentMCap,
  currentNetWorth = 0,
  currentEnterpriseValue = 0,
) {
  return `
        <div class="financial-model-content">
          <style>
            .financial-model-content .input-group {
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
              margin-bottom: 2rem;
              margin-top: 3rem;
            }
            .financial-model-content .input-group > div {
              flex: 1;
              min-width: 150px;
            }
            .financial-model-content input,
            .financial-model-content select {
              width: 100%;
              padding: 0.4rem;
              font-size: 1.5rem;
              height: 34px;
            }
            .financial-model-content label {
              font-size: 1.5rem;
              display: block;
              margin-bottom: 0.3rem;
            }
            .financial-model-content table,
            .financial-model-content th,
            .financial-model-content td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: center;
            }
            .financial-model-content th {
              background-color: #f0f0f5;
            }
            .financial-model-content table {
              width: 100%;
              border-collapse: collapse;
            }
            .financial-model-content #calculate-btn {
              margin-top: 1rem;
              padding: 0.6rem 1.2rem;
              background-color: rgb(25, 118, 210);
              color: white;
              border: none;
              font-size: 1.5rem;
              cursor: pointer;
              border-radius: 4px;
            }
          </style>
  
          <div class="input-group">
            <div>
              <label>Current MCap:</label>
              <input type="number" id="mcap" value="${currentMCap}">
            </div>
            <div>
              <label>Current EV:</label>
              <input type="number" id="enterpriseValue" value="${currentEnterpriseValue}">
            </div>
            <div>
              <label>Current Net Worth:</label>
              <input type="number" id="networth" value="${currentNetWorth}">
            </div>
            <div>
              <label>Current Revenue:</label>
              <input type="number" id="rev" value="${currentRevenue}">
            </div>
            <div>
              <label>QIP (If any):</label>
              <input type="number" id="qip" value="0">
            </div>
            <div>
              <label>Years:</label>
              <input type="number" id="years" value="3">
            </div>
            <div>
              <label>Valuation Method:</label>
              <select id="valuation-method">
                <option value="pe">P/E</option>
                <option value="ev_ebitda">EV/EBITDA</option>
                <option value="pb">P/B</option>
              </select>
            </div>
          </div>
  
          <div id="scenario-table"></div>
  
          <div style="text-align:right">
            <button id="calculate-btn">Calculate</button>
          </div>
          <div id="results"></div>
        </div>
      `;
}

function openCAGRCalculator(targetInputId, initialValue, initialYearsValue) {
  const content = `
        <style>
          #cagr-popup-content {
            font-size: 1.4rem;
          }
          #cagr-popup-content label {
            display: block;
            margin-bottom: 1rem;
          }
          #cagr-popup-content input {
            width: 100%;
            padding: 0.5rem;
            font-size: 1.4rem;
            box-sizing: border-box;
          }
          #cagr-popup-content .button-row {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            margin-top: 1rem;
          }
          #cagr-popup-content button {
            padding: 0.6rem 1.2rem;
            font-size: 1.4rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          #calc-cagr-btn {
            background-color: #1976d2;
            color: white;
          }
          #close-cagr-btn {
            background-color: #e0e0e0;
            color: black;
          }
          #cagr-popup-content .error {
            color: red;
            font-size: 1.3rem;
            margin-top: 0.5rem;
          }
          #cagr-popup-content .result {
            margin-top: 1rem;
            font-weight: bold;
            font-size: 1.4rem;
          }
        </style>
        <div id="cagr-popup-content">
          <label>
            Start Value:
            <input type="number" id="cagr-start" value="${initialValue}" />
          </label>
          <label>
            End Value:
            <input type="number" id="cagr-end" />
          </label>
          <label>
            Years:
            <input type="number" id="cagr-years" value="${initialYearsValue}" />
          </label>
  
          <div class="button-row" style="margin-top: 24px;">
            <button id="close-cagr-btn">Close</button>
            <button id="calc-cagr-btn">Calculate</button>
          </div>
  
          <p id="cagr-error" class="error"></p>
          <p id="cagr-result" class="result"> </p>
        </div>
      `;

  const modal = createModal({
    title: 'CAGR Calculator',
    content,
    isHTML: true,
    onClose: () => {},
  });

  setTimeout(() => {
    document.getElementById('calc-cagr-btn').onclick = () => {
      const start = parseFloat(document.getElementById('cagr-start').value);
      const end = parseFloat(document.getElementById('cagr-end').value);
      const years = parseFloat(document.getElementById('cagr-years').value);
      const errorEl = document.getElementById('cagr-error');
      const resultEl = document.getElementById('cagr-result');

      errorEl.textContent = '';
      resultEl.textContent = '';

      if (!start || !end || !years || start <= 0 || years <= 0) {
        errorEl.textContent = 'Please enter valid positive numbers.';
        return;
      }

      const cagr = (Math.pow(end / start, 1 / years) - 1) * 100;
      resultEl.textContent = `CAGR: ${cagr.toFixed(2)}%`;

      const targetInput = document.getElementById(targetInputId);
      if (targetInput) {
        targetInput.value = cagr.toFixed(2);
      }
    };

    document.getElementById('close-cagr-btn').onclick = () => {
      document.body.removeChild(modal);
    };
  }, 0);
}
