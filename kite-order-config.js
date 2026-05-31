function getSessionStorageItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

const ALLOWED_URL_PREFIX = 'https://kite.zerodha.com/';

function setSessionStorageItem(key, value) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch (error) {
    console.error('Failed to save sessionStorage key:', key, error);
  }
}

function getPrefilledValues() {
  const rawOrderType = (getSessionStorageItem('ORDER_TYPE') || 'SELL').toUpperCase();
  const orderType = rawOrderType === 'BUY' || rawOrderType === 'SELL' ? rawOrderType : 'SELL';

  return {
    DEFAULT_INSTRUMENT_ID: getSessionStorageItem('DEFAULT_INSTRUMENT_ID') || '',
    PREV_LOWER_CIRCUIT_LIMIT: getSessionStorageItem('PREV_LOWER_CIRCUIT_LIMIT'),
    PREV_UPPER_CIRCUIT_LIMIT: getSessionStorageItem('PREV_UPPER_CIRCUIT_LIMIT'),
    ORDER_QUANTITY: getSessionStorageItem('ORDER_QUANTITY') || 1,
    ORDER_TYPE: orderType,
    DEFAULT_INTERVAL_MS: getSessionStorageItem('DEFAULT_INTERVAL_MS') || '300',
  };
}

function createField(label, id, value, type) {
  const wrapper = document.createElement('label');
  wrapper.style.display = 'block';
  wrapper.style.marginBottom = '8px';

  const title = document.createElement('div');
  title.textContent = label;
  title.style.marginBottom = '4px';
  title.style.fontWeight = '600';

  const input = document.createElement('input');
  input.id = id;
  input.type = type;
  input.value = String(value);
  input.style.width = '100%';
  input.style.boxSizing = 'border-box';
  input.style.padding = '8px';
  input.style.border = '1px solid #9ca3af';
  input.style.borderRadius = '6px';

  wrapper.appendChild(title);
  wrapper.appendChild(input);
  return wrapper;
}

function createOrderTypeDropdownField(id, value) {
  const wrapper = document.createElement('label');
  wrapper.style.display = 'block';
  wrapper.style.marginBottom = '8px';

  const title = document.createElement('div');
  title.textContent = 'ORDER_TYPE';
  title.style.marginBottom = '4px';
  title.style.fontWeight = '600';

  const select = document.createElement('select');
  select.id = id;
  select.style.width = '100%';
  select.style.boxSizing = 'border-box';
  select.style.padding = '8px';
  select.style.border = '1px solid #9ca3af';
  select.style.borderRadius = '6px';

  const buyOption = document.createElement('option');
  buyOption.value = 'BUY';
  buyOption.textContent = 'BUY';

  const sellOption = document.createElement('option');
  sellOption.value = 'SELL';
  sellOption.textContent = 'SELL';

  select.appendChild(buyOption);
  select.appendChild(sellOption);
  select.value = value === 'BUY' ? 'BUY' : 'SELL';

  wrapper.appendChild(title);
  wrapper.appendChild(select);
  return wrapper;
}

function buildConfigForm() {
  const existing = document.getElementById('uc-lc-config-form');
  if (existing) existing.remove();

  const values = getPrefilledValues();

  const root = document.createElement('div');
  root.id = 'uc-lc-config-form';
  root.style.position = 'fixed';
  root.style.right = '16px';
  root.style.bottom = '16px';
  root.style.width = '340px';
  root.style.zIndex = '999999';
  root.style.padding = '12px';
  root.style.border = '1px solid #d1d5db';
  root.style.borderRadius = '10px';
  root.style.background = '#ffffff';
  root.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)';
  root.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  root.style.fontSize = '12px';

  const header = document.createElement('div');
  header.textContent = 'UC/LC Session Config';
  header.style.fontSize = '14px';
  header.style.fontWeight = '700';
  header.style.marginBottom = '10px';

  const instrumentField = createField(
    'DEFAULT_INSTRUMENT_ID',
    'cfg-default-instrument-id',
    values.DEFAULT_INSTRUMENT_ID,
    'text',
  );
  const prevLcField = createField(
    'PREV_LOWER_CIRCUIT_LIMIT',
    'cfg-prev-lower-circuit-limit',
    values.PREV_LOWER_CIRCUIT_LIMIT,
    'number',
  );
  const prevUcField = createField(
    'PREV_UPPER_CIRCUIT_LIMIT',
    'cfg-prev-upper-circuit-limit',
    values.PREV_UPPER_CIRCUIT_LIMIT,
    'number',
  );
  const orderQuantityField = createField(
    'ORDER_QUANTITY',
    'cfg-order-quantity',
    values.ORDER_QUANTITY,
    'number',
  );
  const orderTypeField = createOrderTypeDropdownField('cfg-order-type', values.ORDER_TYPE);
  const intervalField = createField(
    'DEFAULT_INTERVAL_MS',
    'cfg-default-interval-ms',
    values.DEFAULT_INTERVAL_MS,
    'number',
  );

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '10px';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  saveButton.style.flex = '1';
  saveButton.style.padding = '8px';
  saveButton.style.border = 'none';
  saveButton.style.borderRadius = '6px';
  saveButton.style.background = '#2563eb';
  saveButton.style.color = '#ffffff';
  saveButton.style.cursor = 'pointer';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'Close';
  closeButton.style.flex = '1';
  closeButton.style.padding = '8px';
  closeButton.style.border = '1px solid #9ca3af';
  closeButton.style.borderRadius = '6px';
  closeButton.style.background = '#ffffff';
  closeButton.style.color = '#000000';
  closeButton.style.cursor = 'pointer';

  const note = document.createElement('div');
  note.textContent = 'Prefilled from sessionStorage; Save updates all 6 keys.';
  note.style.marginTop = '8px';
  note.style.color = '#4b5563';

  saveButton.addEventListener('click', () => {
    const instrumentValue = document.getElementById('cfg-default-instrument-id').value;
    const prevLcValue = document.getElementById('cfg-prev-lower-circuit-limit').value;
    const prevUcValue = document.getElementById('cfg-prev-upper-circuit-limit').value;
    const orderQuantityValue = document.getElementById('cfg-order-quantity').value;
    const orderTypeValue = document.getElementById('cfg-order-type').value;
    const intervalValue = document.getElementById('cfg-default-interval-ms').value;

    setSessionStorageItem('DEFAULT_INSTRUMENT_ID', instrumentValue || '');
    setSessionStorageItem('PREV_LOWER_CIRCUIT_LIMIT', prevLcValue || '');
    setSessionStorageItem('PREV_UPPER_CIRCUIT_LIMIT', prevUcValue || '');
    setSessionStorageItem('ORDER_QUANTITY', orderQuantityValue || '');
    setSessionStorageItem('ORDER_TYPE', (orderTypeValue || 'SELL').toUpperCase());
    setSessionStorageItem('DEFAULT_INTERVAL_MS', intervalValue || 300);

    console.info('Saved 5 config keys to sessionStorage.');
    root.remove();
  });

  closeButton.addEventListener('click', () => {
    root.remove();
  });

  actions.appendChild(saveButton);
  actions.appendChild(closeButton);

  root.appendChild(header);
  root.appendChild(instrumentField);
  root.appendChild(prevLcField);
  root.appendChild(prevUcField);
  root.appendChild(orderQuantityField);
  root.appendChild(orderTypeField);
  root.appendChild(intervalField);
  root.appendChild(actions);
  root.appendChild(note);

  document.body.appendChild(root);
}

function launchUcLcConfigSetter() {
  if (!window.location.href.startsWith(ALLOWED_URL_PREFIX)) {
    console.info(`uc_lc_config_setter skipped. URL must start with ${ALLOWED_URL_PREFIX}`);
    return false;
  }

  buildConfigForm();
  return true;
}

window.launchUcLcConfigSetter = launchUcLcConfigSetter;
