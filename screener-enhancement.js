window.launchScreenerEnhancement = function () { 
  if (window.calculationsApplied) {
    alert('Calculations have already been applied.');
    return;
  }

  const table = document.getElementById('profit-loss');
  if (!table) {
    alert('Table with id "profit-loss" not found.');
    return;
  }

  const headerCells = table.querySelectorAll('thead th');
  const isTTMColumn =
    headerCells[headerCells.length - 1]?.textContent.trim().toLowerCase() === 'ttm';

  const keywords = ['Revenue', 'Sales', 'Operating Profit', 'Financing Profit', 'Net Profit'];
  const rows = table.querySelectorAll('tbody tr');
  const selectedRows = [];

  rows.forEach((row) => {
    const firstCellText = row.cells[0]?.textContent.trim();
    if (
      firstCellText &&
      keywords.some((keyword) =>
        firstCellText.toLowerCase().startsWith(keyword.toLowerCase())
      )
    ) {
      selectedRows.push(row);
    }
  });

  selectedRows.reverse();

  const cashFlowTable = document.getElementById('cash-flow');
  if (!cashFlowTable) {
    alert('Table with id "cash-flow" not found.');
    return;
  }

  const cashFlowHeaderCells = cashFlowTable.querySelectorAll('thead th');
  const cashFlowHeaders = Array.from(cashFlowHeaderCells).map((cell) =>
    cell.textContent.trim().toLowerCase()
  );
  const cashFlowBody = cashFlowTable.querySelector('tbody');

  selectedRows.forEach((row) => {
    const newRow = cashFlowBody.insertRow(0);
    const firstCellText = row.cells[0]?.textContent.trim();
    const firstCell = newRow.insertCell();
    firstCell.textContent = firstCellText;

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

  selectedRows.forEach((row) => {
    const numericValues = Array.from(row.cells).map((cell) =>
      parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ''))
    );

    for (let i = 2; i < numericValues.length; i++) {
      const prevValue = numericValues[i - 1];
      const currValue = numericValues[i];
      if (isNaN(prevValue) || isNaN(currValue) || prevValue === 0) continue;

      const growth = ((currValue - prevValue) / Math.abs(prevValue)) * 100;
      const text = `${growth.toFixed(2)}%`;

      const cell = row.cells[i];
      const oldPopover = cell.querySelector('.growth-popover');
      if (oldPopover) oldPopover.remove();

      const popover = document.createElement('div');
      popover.className = 'growth-popover';
      popover.textContent = text;
      popover.style.position = 'absolute';
      popover.style.background = growth >= 0 ? '#2e7d32' : '#c62828';
      popover.style.color = '#fff';
      popover.style.fontSize = '12px';
      popover.style.padding = '2px 4px';
      popover.style.borderRadius = '4px';
      popover.style.top = '-10px';
      popover.style.right = '0px';
      popover.style.pointerEvents = 'none';

      cell.style.position = 'relative';
      cell.appendChild(popover);
    }
  });

  const createModal = ({
    title = 'Modal Title',
    content = 'This is the modal content.',
    isHTML = false,
  } = {}) => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';

    const modal = document.createElement('div');
    modal.style.backgroundColor = '#fff';
    modal.style.padding = '20px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    modal.style.maxWidth = '400px';
    modal.style.width = '100%';
    modal.style.position = 'relative';

    const header = document.createElement('h3');
    header.textContent = title;

    const body = document.createElement('div');
    if (isHTML) {
      body.innerHTML = content;
    } else {
      body.textContent = content;
    }

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '32px';
    closeBtn.style.cursor = 'pointer';

    closeBtn.onclick = () => document.body.removeChild(overlay);

    modal.appendChild(closeBtn);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
  };

  const sumSelectedColumns = () => {
    const rowKeywords = [
      'Sales',
      'Revenue',
      'Operating Profit',
      'Financing Profit',
      'Net Profit',
      'Cash from Operating Activity',
    ];

    const selectedHeaderIndexes = [];
    const selectedHeaderNames = [];

    cashFlowHeaderCells.forEach((cell, index) => {
      if (index > 0) {
        const checkbox = cell.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          selectedHeaderIndexes.push(index);
          selectedHeaderNames.push(cell.textContent.trim());
        }
      }
    });

    if (selectedHeaderIndexes.length === 0) {
      alert('No headers selected!');
      return;
    }

    const rows = cashFlowBody.querySelectorAll('tr');
    const rowSums = [];

    rows.forEach((row) => {
      const label = row.cells[0]?.textContent.trim()?.replace("+","");
      if (
        rowKeywords.some((keyword) =>
          label.toLowerCase().startsWith(keyword.toLowerCase())
        )
      ) {
        let rowTotal = 0;
        selectedHeaderIndexes.forEach((index) => {
          const cell = row.cells[index];
          if (cell) {
            const value = parseFloat(cell.textContent.replace(/[^0-9.-]+/g, ''));
            if (!isNaN(value)) {
              rowTotal += value;
            }
          }
        });
        rowSums.push({ label, total: rowTotal.toFixed() });
      }
    });

    if (rowSums.length === 0) {
      alert('No matching rows found.');
      return;
    }
    const ebitda = rowSums?.find((rs)=> rs.label?.startsWith("Operating Profit")) ?? rowSums?.find((rs)=> rs.label?.startsWith("Financing Profit"));
    const pat = rowSums?.find((rs)=> rs.label?.startsWith("Net Profit"));
    const cfo =  rowSums?.find((rs)=> rs.label?.startsWith("Cash from Operating Activity"));

    const cfoToPat = ((cfo?.total/pat?.total)* 100).toFixed(2);
    const cfoToEbitda = ((cfo?.total/ebitda?.total)* 100).toFixed(2);

    if(cfoToPat){
      rowSums.push({label:"CFO/PAT", total: cfoToPat+" %"});
    }
    if(cfoToEbitda){
      rowSums.push({label:"CFO/EBITDA", total: cfoToEbitda+" %"});
    }

    let sumMessage = '<div style="display: grid; grid-template-columns: 1fr auto; row-gap: 12px">';
    rowSums.forEach((row, idx) => {
      sumMessage += `
        <div style="font-weight: 500; padding: 4px 2px; background: ${idx %2 === 0 ? 'rgb(248,248,255)': undefined}">${row.label}</div>
        <div style="text-align: right; padding: 4px 2px; background: ${idx %2 === 0 ? 'rgb(248,248,255)': undefined}">${row.total}</div>
      `;
    });
    sumMessage += '</div>';

    const selectedHeaders = `<div style="margin-bottom: 32px">${selectedHeaderNames?.join(", ")}</div>`

    createModal({ title: "Cash flows", content: selectedHeaders + sumMessage, isHTML: true });
  };

  const addCheckboxesToHeaders = () => {
    cashFlowHeaderCells.forEach((cell, index) => {
      if (index > 0 && !cell.querySelector('input[type="checkbox"]')) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.marginRight = '5px';
        cell.prepend(checkbox);
      }
    });
  };

  addCheckboxesToHeaders();

  const sumButton = document.createElement('button');
  sumButton.id = 'sum-button';
  sumButton.textContent = 'Sum Selected Columns';
  sumButton.style.marginBottom = '10px';
  sumButton.style.marginTop = '10px';
  sumButton.style.padding = '8px 12px';
  sumButton.style.background = '#1976d2';
  sumButton.style.color = '#fff';
  sumButton.style.border = 'none';
  sumButton.style.borderRadius = '4px';
  sumButton.style.cursor = 'pointer';
  sumButton.style.float = 'right';
  sumButton.addEventListener('click', sumSelectedColumns);

  cashFlowTable.parentElement.insertBefore(sumButton, cashFlowTable);

  window.calculationsApplied = true;
}
