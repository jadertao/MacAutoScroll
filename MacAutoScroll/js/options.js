// Options page logic
(function () {
  const enabledCheckbox = document.getElementById('enabled');
  const longPressInput = document.getElementById('longPressMs');
  const domainsTextarea = document.getElementById('domains');
  const patternErrors = document.getElementById('patternErrors');
  const testHostInput = document.getElementById('testHost');
  const testResult = document.getElementById('testResult');
  const statusLine = document.getElementById('status');
  const saveButton = document.getElementById('save');
  const resetButton = document.getElementById('reset');

  let statusTimer = null;

  function showStatus(message, type) {
    statusLine.textContent = message;
    statusLine.className = 'status' + (type ? ' ' + type : '');
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    if (message) {
      statusTimer = setTimeout(function () {
        statusLine.textContent = '';
        statusLine.className = 'status';
      }, 3000);
    }
  }

  function readFormSettings() {
    return {
      enabled: enabledCheckbox.checked,
      longPressMs: clampLongPressMs(longPressInput.value),
      domains: domainsTextarea.value,
    };
  }

  function fillForm(settings) {
    enabledCheckbox.checked = !!settings.enabled;
    longPressInput.value = settings.longPressMs;
    domainsTextarea.value = settings.domains;
  }

  // Show invalid regex lines and refresh the tester
  function renderValidation() {
    const inspected = inspectDomainPatterns(domainsTextarea.value);

    patternErrors.textContent = '';
    if (inspected.invalid.length > 0) {
      patternErrors.hidden = false;
      const intro = document.createElement('div');
      intro.textContent =
        '以下行不是合法的正则表达式，已被忽略（不会影响其他行）：';
      const list = document.createElement('ul');
      inspected.invalid.forEach(function (entry) {
        const item = document.createElement('li');
        item.textContent =
          '第 ' + entry.lineNumber + ' 行：' + entry.line + ' — ' + entry.message;
        list.appendChild(item);
      });
      patternErrors.appendChild(intro);
      patternErrors.appendChild(list);
    } else {
      patternErrors.hidden = true;
    }

    renderTester();
  }

  // Live check of the hostname typed into the tester
  function renderTester() {
    const host = testHostInput.value.trim();
    if (!host) {
      testResult.textContent = '';
      testResult.className = 'test-result';
      return;
    }

    const result = evaluateDomain(host, readFormSettings());
    testResult.textContent =
      (result.allowed ? '✓ 生效：' : '✗ 不生效：') + result.reason;
    testResult.className =
      'test-result ' + (result.allowed ? 'ok' : 'no');
  }

  function save() {
    const settings = readFormSettings();
    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime && chrome.runtime.lastError) {
        showStatus('保存失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }
      showStatus('已保存', 'ok');
    });
  }

  function reset() {
    const defaults = Object.assign({}, DEFAULT_SETTINGS);
    chrome.storage.sync.set(defaults, function () {
      if (chrome.runtime && chrome.runtime.lastError) {
        showStatus('恢复默认失败：' + chrome.runtime.lastError.message, 'error');
        return;
      }
      fillForm(defaults);
      renderValidation();
      showStatus('已恢复默认设置', 'ok');
    });
  }

  // Load the stored settings into the form
  chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
    if (chrome.runtime && chrome.runtime.lastError) {
      showStatus('读取设置失败：' + chrome.runtime.lastError.message, 'error');
      return;
    }
    applyStoredSettings(items);
    fillForm(currentSettings);
    renderValidation();
  });

  domainsTextarea.addEventListener('input', renderValidation);
  enabledCheckbox.addEventListener('change', renderTester);
  testHostInput.addEventListener('input', renderTester);

  saveButton.addEventListener('click', save);
  resetButton.addEventListener('click', reset);
})();
