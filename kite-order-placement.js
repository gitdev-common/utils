function getSessionStorageItem(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

const HARDCODED_DEFAULTS = {
  DEFAULT_INSTRUMENT_ID: null,
  PREV_LOWER_CIRCUIT_LIMIT: 0,
  PREV_UPPER_CIRCUIT_LIMIT: 0,
  ORDER_QUANTITY: '',
  ORDER_TYPE: 'SELL',
  DEFAULT_INTERVAL_MS: 300,
};

const DEFAULT_INSTRUMENT_ID =
  getSessionStorageItem('DEFAULT_INSTRUMENT_ID') || HARDCODED_DEFAULTS.DEFAULT_INSTRUMENT_ID;
const PREV_LOWER_CIRCUIT_LIMIT =
  Number(getSessionStorageItem('PREV_LOWER_CIRCUIT_LIMIT')) ||
  Number(HARDCODED_DEFAULTS.PREV_LOWER_CIRCUIT_LIMIT);
const PREV_UPPER_CIRCUIT_LIMIT =
  Number(getSessionStorageItem('PREV_UPPER_CIRCUIT_LIMIT')) ||
  Number(HARDCODED_DEFAULTS.PREV_UPPER_CIRCUIT_LIMIT);
const ORDER_QUANTITY = getSessionStorageItem('ORDER_QUANTITY') || HARDCODED_DEFAULTS.ORDER_QUANTITY;
const ORDER_TYPE = (
  getSessionStorageItem('ORDER_TYPE') || HARDCODED_DEFAULTS.ORDER_TYPE
).toUpperCase(); // BUY or SELL
const DEFAULT_INTERVAL_MS =
  Number(getSessionStorageItem('DEFAULT_INTERVAL_MS')) ||
  Number(HARDCODED_DEFAULTS.DEFAULT_INTERVAL_MS);

const NUDGE_CHECK_INTERVAL_MS = 100;
const NUDGE_MAX_ATTEMPTS = 20;
const HOVER_OPTION_CHECK_INTERVAL_MS = 100;
const HOVER_OPTION_MAX_ATTEMPTS = 10;
const MAX_MISSING_LIMITS_TICKS = 10;

const ORDER_WINDOW_CHECK_INTERVAL_MS = 100;
const ORDER_WINDOW_MAX_ATTEMPTS = 10;
const ROW_ACTION_LABELS = {
  BUY: 'Buy',
  SELL: 'Sell',
  MARKET_DEPTH: 'Market depth',
};
// Add action labels to click after hovering the instrument row.
const HOVER_OPTION_LABELS_TO_CLICK = [
  ROW_ACTION_LABELS.MARKET_DEPTH,
  ORDER_TYPE === 'BUY' ? ROW_ACTION_LABELS.BUY : ROW_ACTION_LABELS.SELL,
];

function sanitizePrice(value) {
  return String(value)
    .replace(/[^0-9.]/g, '')
    .trim();
}

function sanitizeQuantity(value) {
  return String(value)
    .replace(/[^0-9]/g, '')
    .trim();
}

function normalizePriceForCompare(value) {
  const cleaned = sanitizePrice(value);
  if (!cleaned) return String(value || '').trim();

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return String(value || '').trim();

  // Canonical numeric form: 100.20 and 100.2 both become "100.2".
  return parsed.toString();
}

function normalizeOrderType(orderType) {
  return String(orderType || '')
    .trim()
    .toUpperCase();
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getOrderWindow() {
  return document.querySelector('form.order-window[role="dialog"]');
}

function getInputByLabel(container, labelText) {
  const labels = [...container.querySelectorAll('label')];
  const label = labels.find(
    (node) => node.textContent.trim().toLowerCase() === labelText.toLowerCase(),
  );
  if (!label) return null;

  const inputId = label.getAttribute('for');
  if (!inputId) return null;

  return container.querySelector(`#${CSS.escape(inputId)}`);
}

function setInputValue(input, value) {
  if (!input) return;

  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.blur();
}

function ensureLimitOrderType(orderWindow) {
  if (!orderWindow) return false;

  const limitRadio = orderWindow.querySelector('input[name="orderType"][value="LIMIT"]');
  if (!limitRadio) return false;

  if (!limitRadio.checked) {
    const limitLabel = orderWindow.querySelector(`label[for="${limitRadio.id}"]`);
    if (limitLabel) {
      limitLabel.click();
    } else {
      limitRadio.click();
    }
  }

  limitRadio.dispatchEvent(new Event('input', { bubbles: true }));
  limitRadio.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function getWindowSide(orderWindow) {
  if (orderWindow.classList.contains('buy')) return 'BUY';
  if (orderWindow.classList.contains('sell')) return 'SELL';

  const submitText = orderWindow.querySelector('button.submit span')?.textContent?.trim();
  return normalizeOrderType(submitText);
}

function ensureWindowSide(orderWindow, targetSide) {
  const currentSide = getWindowSide(orderWindow);
  if (currentSide === targetSide) return true;

  const sideToggle = orderWindow.querySelector('.tx-toggle .su-switch-control');
  if (!sideToggle) return false;

  sideToggle.click();
  return getWindowSide(orderWindow) === targetSide;
}

function getNudgePlaceOrderButton() {
  const dialogs = document.querySelectorAll('.su-modal-mask.nudge-info-modal[role="dialog"]');
  for (const dialog of dialogs) {
    const buttons = dialog.querySelectorAll('button');
    for (const button of buttons) {
      const label = normalizeText(button.textContent);
      if (label === 'place order') {
        return button;
      }
    }
  }

  return null;
}

function confirmNudgeIfPresent({
  instrumentId,
  checkEveryMs = NUDGE_CHECK_INTERVAL_MS,
  maxAttempts = NUDGE_MAX_ATTEMPTS,
}) {
  let attempts = 0;
  let checkerId = null;
  let isConfirmed = false;

  const stopChecker = () => {
    if (!checkerId) return;
    clearInterval(checkerId);
    checkerId = null;
  };

  const checkAndConfirm = () => {
    attempts += 1;
    const placeOrderButton = getNudgePlaceOrderButton();

    if (placeOrderButton) {
      // Stop first so we do not run duplicate clicks.
      stopChecker();
      placeOrderButton.click();
      isConfirmed = true;
      console.info(`[${instrumentId}] Nudge detected. Clicked Place order.`);
      return;
    }

    if (attempts >= maxAttempts) {
      stopChecker();
    }
  };

  checkAndConfirm();
  if (!isConfirmed && attempts < maxAttempts) {
    checkerId = setInterval(checkAndConfirm, checkEveryMs);
  }
}

function placeOrderFromWindow({
  orderType,
  uc,
  lc,
  instrumentId,
  checkEveryMs = ORDER_WINDOW_CHECK_INTERVAL_MS,
  maxAttempts = ORDER_WINDOW_MAX_ATTEMPTS,
}) {
  const targetSide = normalizeOrderType(orderType);
  if (targetSide !== 'BUY' && targetSide !== 'SELL') {
    console.error(`[${instrumentId}] Invalid ORDER_TYPE: ${orderType}. Use BUY or SELL.`);
    return;
  }

  const priceToUse = targetSide === 'BUY' ? sanitizePrice(uc) : sanitizePrice(lc);
  if (!priceToUse) {
    console.error(`[${instrumentId}] ${targetSide} price could not be derived from limits.`);
    return;
  }

  let attempts = 0;
  let intervalId = null;
  let completed = false;

  const stop = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  const tryPlace = () => {
    attempts += 1;

    const orderWindow = getOrderWindow();
    if (!orderWindow) {
      if (attempts >= maxAttempts) {
        console.error(
          `[${instrumentId}] Order window not found after retries. Cannot place order.`,
        );
        stop();
      }
      return;
    }

    const sideReady = ensureWindowSide(orderWindow, targetSide);
    if (!sideReady) {
      if (attempts >= maxAttempts) {
        console.error(`[${instrumentId}] Could not switch order window to ${targetSide}.`);
        stop();
      }
      return;
    }

    let priceInput = getInputByLabel(orderWindow, 'Price');
    // If price is disabled, switch to LIMIT order type before submit.
    if (!priceInput) {
      ensureLimitOrderType(orderWindow);

      priceInput = getInputByLabel(orderWindow, 'Price');
      console.info(`[${instrumentId}] Price input disabled. Switched to LIMIT order type.`);
    }

    if (priceInput) {
      setInputValue(priceInput, priceToUse);
    }

    if (!priceInput) {
      if (attempts >= maxAttempts) {
        console.error(`[${instrumentId}] Price input not found in order window after retries.`);
        stop();
      }
      return;
    }

    const submitButton = orderWindow.querySelector('button.submit');
    if (!submitButton) {
      if (attempts >= maxAttempts) {
        console.error(`[${instrumentId}] Submit button not found in order window after retries.`);
        stop();
      }
      return;
    }

    const submitLabel = normalizeOrderType(submitButton.textContent);
    if (submitLabel && submitLabel !== targetSide) {
      if (attempts >= maxAttempts) {
        console.error(
          `[${instrumentId}] Submit button side mismatch. Expected ${targetSide}, got ${submitLabel}.`,
        );
        stop();
      }
      return;
    }

    const quantityInput =
      getInputByLabel(orderWindow, 'Qty.') || getInputByLabel(orderWindow, 'Qty');
    const quantityToUse = sanitizeQuantity(ORDER_QUANTITY);
    if (quantityInput && quantityToUse && Number(quantityToUse) > 0) {
      setInputValue(quantityInput, quantityToUse);
    }

    submitButton.click();
    console.info(`[${instrumentId}] ${targetSide} order submitted at price ${priceToUse}.`);
    confirmNudgeIfPresent({ instrumentId });
    completed = true;
    stop();
  };

  tryPlace();
  if (!completed && !intervalId && attempts < maxAttempts) {
    intervalId = setInterval(tryPlace, checkEveryMs);
  }
}

function flash(element, color = '#ffff66') {
  if (!element) return;

  const oldBg = element.style.backgroundColor;
  const oldTransition = element.style.transition;

  element.style.transition = 'background-color 150ms ease';
  element.style.backgroundColor = color;

  setTimeout(() => {
    element.style.backgroundColor = oldBg;
    element.style.transition = oldTransition;
  }, 250);
}

function getValueElementByLabel(identifierRow, labelText) {
  if (!identifierRow) return null;

  const expected = normalizeText(labelText);

  const labels = [...identifierRow.querySelectorAll('label')];
  let labelNode = labels.find((node) => normalizeText(node.textContent) === expected);

  // Some tables render text labels in spans/divs instead of label tags.
  if (!labelNode) {
    const textNodes = [...identifierRow.querySelectorAll('span, div, p')];
    labelNode = textNodes.find((node) => normalizeText(node.textContent) === expected);
  }

  if (!labelNode) return null;

  let valueElement = labelNode.nextElementSibling;
  if (!valueElement && labelNode.parentElement && labelNode.parentElement.children.length > 1) {
    valueElement = [...labelNode.parentElement.children].find((child) => child !== labelNode);
  }

  return valueElement;
}

function getInstrumentRow(instrumentId) {
  return document.querySelector(`[data-id="${instrumentId}"]`);
}

function dispatchHoverEvents(element) {
  if (!element) return;

  const hoverEvents = ['mouseenter', 'mouseover', 'mousemove'];
  for (const eventName of hoverEvents) {
    element.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
  }
}

function findClickableByText(root, targetText) {
  const expected = normalizeText(targetText);
  if (!expected) return null;

  // Best match for your row action buttons.
  const ariaButtons = root.querySelectorAll('button[aria-label]');
  for (const button of ariaButtons) {
    const ariaLabel = normalizeText(button.getAttribute('aria-label'));
    if (ariaLabel === expected || ariaLabel.includes(expected)) {
      return button;
    }
  }

  // Tooltip is on parent span in this DOM structure.
  const tooltipHolders = root.querySelectorAll('[data-tooltip-content]');
  for (const holder of tooltipHolders) {
    const tooltipText = normalizeText(holder.getAttribute('data-tooltip-content'));
    if (tooltipText === expected || tooltipText.includes(expected)) {
      const nestedButton = holder.querySelector('button');
      if (nestedButton) return nestedButton;
    }
  }

  const candidates = root.querySelectorAll('button, a, [role="button"], .icon, .action, .option');
  for (const node of candidates) {
    const label = normalizeText(node.textContent);
    if (label === expected || label.includes(expected)) {
      return node;
    }
  }

  return null;
}

function getRowActionButtonByLabel(row, labelText) {
  if (!row || !labelText) return null;

  const expected = normalizeText(labelText);
  const buttons = row.querySelectorAll('button[aria-label]');
  for (const button of buttons) {
    const ariaLabel = normalizeText(button.getAttribute('aria-label'));
    if (ariaLabel === expected || ariaLabel.includes(expected)) {
      return button;
    }
  }

  return null;
}

function isVisibleElement(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function areRowActionsVisible(row) {
  if (!row) return false;

  const actionsWrap = row.querySelector('.actions');
  if (!actionsWrap || !isVisibleElement(actionsWrap)) {
    return false;
  }

  const actionButtons = actionsWrap.querySelectorAll('button, a, [role="button"]');
  if (actionButtons.length === 0) {
    return false;
  }

  return [...actionButtons].some(isVisibleElement);
}

function isMarketDepthTicksPresent() {
  // Keep selectors depth-scoped to avoid matching unrelated tick icons.
  const depthTickSelectors = [
    '.market-depth .depth-table tr',
    '.market-depth .depth-table li',
    '.market-depth .five-levels li',
    '.depth-table .buy tr',
    '.depth-table .sell tr',
    '.depth-table tr',
  ];

  for (const selector of depthTickSelectors) {
    const visibleNodes = [...document.querySelectorAll(selector)].filter(isVisibleElement);
    if (visibleNodes.length >= 3) {
      return true;
    }
  }

  return false;
}

function handleHoverOptionLabel({ row, label, instrumentId }) {
  const normalizedLabel = normalizeText(label);

  const marketDepthLabel = normalizeText(ROW_ACTION_LABELS.MARKET_DEPTH);
  if (normalizedLabel === marketDepthLabel && isMarketDepthTicksPresent()) {
    console.info(`[${instrumentId}] Market depth ticks already present. Skipping click.`);
    return true;
  }

  // Prefer direct row action button click by aria-label, even if hover styling hides it.
  const directRowButton = getRowActionButtonByLabel(row, label);
  if (directRowButton && !directRowButton.disabled) {
    directRowButton.click();
    console.info(`[${instrumentId}] Clicked row action directly: ${label}`);
    return true;
  }

  const target = findClickableByText(row, label) || findClickableByText(document, label);
  if (!target) return false;

  target.click();
  console.info(`[${instrumentId}] Clicked hover option: ${label}`);
  return true;
}

function toggleRowAction(row, label, instrumentId, checkEveryMs = 50, maxAttempts = 5) {
  if (!row || !label) return false;

  let attempts = 0;

  const tryToggle = () => {
    attempts += 1;

    // Ensure row actions are visible and ready
    if (!areRowActionsVisible(row)) {
      dispatchHoverEvents(row);
    }

    // Try multiple search strategies
    let target = getRowActionButtonByLabel(row, label);
    if (!target) {
      target = findClickableByText(row, label);
    }
    if (!target) {
      target = findClickableByText(document, label);
    }

    if (!target || target.disabled) {
      if (attempts >= maxAttempts) {
        console.warn(`[${instrumentId}] Could not find row action after retries: ${label}`);
        return false;
      }
      // Retry with slight delay
      setTimeout(tryToggle, checkEveryMs);
      return false;
    }

    target.click();
    console.info(`[${instrumentId}] Toggled row action: ${label}`);
    return true;
  };

  return tryToggle();
}

function refreshMarketDepth(row, instrumentId) {
  const marketDepthLabel = ROW_ACTION_LABELS.MARKET_DEPTH;

  if (!areRowActionsVisible(row)) {
    dispatchHoverEvents(row);
  }

  // Close market depth if it's open
  if (isMarketDepthTicksPresent()) {
    toggleRowAction(row, marketDepthLabel, instrumentId);
    // Wait little less than Default time interval, then open it again to force a refresh
    setTimeout(() => {
      toggleRowAction(row, marketDepthLabel, instrumentId);
    }, DEFAULT_INTERVAL_MS - 100);
  } else {
    // If closed, just open it
    toggleRowAction(row, marketDepthLabel, instrumentId);
  }
}

function clickRowHoverOptions({
  row,
  optionLabels,
  instrumentId,
  checkEveryMs = HOVER_OPTION_CHECK_INTERVAL_MS,
  maxAttempts = HOVER_OPTION_MAX_ATTEMPTS,
}) {
  if (!row || !Array.isArray(optionLabels) || optionLabels.length === 0) {
    return;
  }

  let attempts = 0;
  let intervalId = null;
  const pendingLabels = new Set(optionLabels.filter(Boolean).map((label) => String(label).trim()));

  if (pendingLabels.size === 0) {
    return;
  }

  const stop = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  const tryClickPending = () => {
    attempts += 1;
    if (!areRowActionsVisible(row)) {
      dispatchHoverEvents(row);
    }

    for (const label of [...pendingLabels]) {
      const handled = handleHoverOptionLabel({ row, label, instrumentId });
      if (handled) {
        pendingLabels.delete(label);
      }
    }

    if (pendingLabels.size === 0 || attempts >= maxAttempts) {
      if (pendingLabels.size > 0) {
        console.warn(
          `[${instrumentId}] Could not find hover options: ${[...pendingLabels].join(', ')}`,
        );
      }
      stop();
    }
  };

  tryClickPending();
  if (pendingLabels.size > 0 && attempts < maxAttempts) {
    intervalId = setInterval(tryClickPending, checkEveryMs);
  }
}

function highlightRow(row) {
  row.style.outline = '2px solid cyan';
  row.style.backgroundColor = 'rgba(0,255,255,0.08)';
}

function readCurrentLimits(row) {
  const upperCircuitElement = getValueElementByLabel(row, 'Upper circuit');
  const lowerCircuitElement = getValueElementByLabel(row, 'Lower circuit');

  if (!upperCircuitElement || !lowerCircuitElement) {
    return null;
  }

  const uc = upperCircuitElement.textContent.trim();
  const lc = lowerCircuitElement.textContent.trim();

  return {
    uc,
    lc,
    upperCircuitElement,
    lowerCircuitElement,
  };
}

function createCircuitLimitPoller({
  instrumentId = DEFAULT_INSTRUMENT_ID,
  intervalMs = DEFAULT_INTERVAL_MS,
  baselineLimits = {},
  hoverOptionLabels = HOVER_OPTION_LABELS_TO_CLICK,
  maxMissingLimitsTicks = MAX_MISSING_LIMITS_TICKS,
  onLimitsChange = () => {},
} = {}) {
  let previousLimits = null;
  let intervalId = null;
  let hoverOptionsClicked = false;
  let missingLimitsStreak = 0;
  let hasReadLimitsOnce = false;

  function hasValue(value) {
    return value !== null && value !== undefined && String(value).trim() !== '';
  }

  function normalizeLimits(limits) {
    return {
      uc: hasValue(limits.uc) ? String(limits.uc).trim() : undefined,
      lc: hasValue(limits.lc) ? String(limits.lc).trim() : undefined,
    };
  }

  function stop(reason, isError = false) {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    const log = isError ? console.error : console.info;
    log(`[${instrumentId}] ${reason}`);
  }

  function handleTick() {
    const row = getInstrumentRow(instrumentId);
    if (!row) {
      stop('Instrument row not found. Polling stopped.', true);
      return;
    }

    highlightRow(row);

    // Click required action-bar options first (Market depth + Buy/Sell).
    if (!hoverOptionsClicked) {
      clickRowHoverOptions({
        row,
        optionLabels: hoverOptionLabels,
        instrumentId,
      });
      hoverOptionsClicked = true;
      return;
    }

    // Keep market depth refreshed on each cycle, then read limits in the same tick.
    refreshMarketDepth(row, instrumentId);

    const limits = readCurrentLimits(row);
    if (!limits) {
      missingLimitsStreak += 1;
      if (!hasReadLimitsOnce && missingLimitsStreak >= maxMissingLimitsTicks) {
        stop(
          'Upper circuit or Lower circuit not found repeatedly on initial reads. Polling stopped.',
          true,
        );
      } else {
        if (!areRowActionsVisible(row)) {
          dispatchHoverEvents(row);
        }
        console.warn(
          `[${instrumentId}] Limits temporarily unavailable (${missingLimitsStreak}/${maxMissingLimitsTicks}). Retrying...`,
        );
      }
      return;
    }

    hasReadLimitsOnce = true;
    missingLimitsStreak = 0;

    const { uc, lc, upperCircuitElement, lowerCircuitElement } = limits;

    flash(upperCircuitElement, '#90ee90');
    flash(lowerCircuitElement, '#FFC7C7');
    console.log(`[${instrumentId}] UC=${uc} | LC=${lc}`);

    if (!previousLimits) {
      const normalizedBaseline = normalizeLimits(baselineLimits);
      previousLimits = {
        uc: normalizedBaseline.uc ?? uc,
        lc: normalizedBaseline.lc ?? lc,
      };
    }

    const ucChanged = normalizePriceForCompare(previousLimits.uc) !== normalizePriceForCompare(uc);
    const lcChanged = normalizePriceForCompare(previousLimits.lc) !== normalizePriceForCompare(lc);

    if (!ucChanged && !lcChanged) {
      return;
    }

    if (ucChanged) {
      flash(upperCircuitElement, '#ff9800');
      console.warn(`[${instrumentId}] UC changed: ${previousLimits.uc} -> ${uc}`);
    }

    if (lcChanged) {
      flash(lowerCircuitElement, '#ff5722');
      console.warn(`[${instrumentId}] LC changed: ${previousLimits.lc} -> ${lc}`);
    }

    onLimitsChange({
      instrumentId,
      previous: previousLimits,
      current: { uc, lc },
      changed: { ucChanged, lcChanged },
    });

    stop('UC/LC changed. Polling stopped.');
  }

  function start() {
    if (intervalId) return;

    intervalId = setInterval(handleTick, intervalMs);
    handleTick();
  }

  return {
    start,
    stop,
  };
}

let activeUcLcPoller = null;

function createDefaultPoller() {
  return createCircuitLimitPoller({
    instrumentId: DEFAULT_INSTRUMENT_ID,
    intervalMs: DEFAULT_INTERVAL_MS,
    baselineLimits: {
      uc: PREV_UPPER_CIRCUIT_LIMIT,
      lc: PREV_LOWER_CIRCUIT_LIMIT,
    },
    hoverOptionLabels: HOVER_OPTION_LABELS_TO_CLICK,
    onLimitsChange: ({ instrumentId, previous, current, changed }) => {
      console.log(`[${instrumentId}] Limits changed callback fired.`, {
        previous,
        current,
        changed,
      });

      placeOrderFromWindow({
        orderType: ORDER_TYPE,
        uc: current.uc,
        lc: current.lc,
        instrumentId,
      });

      activeUcLcPoller = null;
    },
  });
}

const ALLOWED_KITE_URL_PREFIX = 'https://kite.zerodha.com/';

function launchUcLcPoll() {
  if (!window.location.href.startsWith(ALLOWED_KITE_URL_PREFIX)) {
    console.info(`uc_lc_polling skipped. URL must start with ${ALLOWED_KITE_URL_PREFIX}`);
    return false;
  }

  if (activeUcLcPoller) {
    console.info('UC/LC poller is already running.');
    return activeUcLcPoller;
  }

  activeUcLcPoller = createDefaultPoller();
  activeUcLcPoller.start();
  return activeUcLcPoller;
}

function stopUcLcPoll() {
  if (!activeUcLcPoller) {
    console.info('UC/LC poller is not running.');
    return false;
  }

  activeUcLcPoller.stop('Stopped manually via window.stopUcLcPoll().');
  activeUcLcPoller = null;
  return true;
}

window.launchUcLcPoll = launchUcLcPoll;
window.stopUcLcPoll = stopUcLcPoll;
