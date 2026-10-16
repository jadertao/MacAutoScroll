// Settings module
// Loads the user configuration from chrome.storage.sync and answers
// "is auto-scroll allowed on the current page?".
// Also reused by the options page for validation and the live tester.

const DEFAULT_SETTINGS = {
  // Master switch. When false the extension does nothing.
  enabled: true,
  // One regular expression per line, matched against location.hostname.
  // Lines starting with "#" are comments. Empty means "all websites".
  domains: '',
  // How long the middle button has to be held before scrolling starts.
  longPressMs: 1000,
};

const MIN_LONG_PRESS_MS = 100;
const MAX_LONG_PRESS_MS = 5000;

let currentSettings = Object.assign({}, DEFAULT_SETTINGS);
let storageChangeListenerAttached = false;

// Clamp the long press duration into a sane range
function clampLongPressMs(value) {
  const ms = parseInt(value, 10);
  if (isNaN(ms)) {
    return DEFAULT_SETTINGS.longPressMs;
  }
  return Math.min(MAX_LONG_PRESS_MS, Math.max(MIN_LONG_PRESS_MS, ms));
}

// Merge stored values on top of the defaults, ignoring bad types
function applyStoredSettings(items) {
  const next = Object.assign({}, DEFAULT_SETTINGS);

  if (items && typeof items === 'object') {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const value = items[key];
      if (value !== undefined && value !== null) {
        next[key] = value;
      }
    }
  }

  next.enabled = !!next.enabled;
  next.domains = typeof next.domains === 'string' ? next.domains : '';
  next.longPressMs = clampLongPressMs(next.longPressMs);

  currentSettings = next;
}

// Split the domains textarea into compiled patterns, keeping track of
// invalid lines so the options page can report them.
function inspectDomainPatterns(domainsText) {
  const result = { valid: [], invalid: [] };

  if (!domainsText || typeof domainsText !== 'string') {
    return result;
  }

  domainsText.split('\n').forEach(function (rawLine, index) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.charAt(0) === '#') {
      return;
    }

    try {
      result.valid.push({
        line: line,
        lineNumber: index + 1,
        pattern: new RegExp(line, 'i'),
      });
    } catch (error) {
      result.invalid.push({
        line: line,
        lineNumber: index + 1,
        message: error.message,
      });
    }
  });

  return result;
}

function parseDomainPatterns(domainsText) {
  return inspectDomainPatterns(domainsText).valid.map(function (entry) {
    return entry.pattern;
  });
}

// Is auto-scroll allowed on the page this script is running in?
function isAutoScrollAllowedHere() {
  if (!currentSettings.enabled) {
    return false;
  }

  const patterns = parseDomainPatterns(currentSettings.domains);
  if (patterns.length === 0) {
    return true; // No filter configured: every website is allowed
  }

  const hostname = location.hostname;
  return patterns.some(function (pattern) {
    return pattern.test(hostname);
  });
}

function getLongPressDuration() {
  return currentSettings.longPressMs;
}

// Evaluate a hostname against a settings object (used by the options page
// tester and by the content script for its own page).
function evaluateDomain(hostnameText, settings) {
  const effective = settings || currentSettings;

  if (!effective.enabled) {
    return { allowed: false, reason: '扩展已关闭' };
  }

  const inspected = inspectDomainPatterns(effective.domains);
  if (inspected.valid.length === 0) {
    return { allowed: true, reason: '未配置域名，所有网站生效' };
  }

  // Be forgiving: accept full URLs like "https://Example.com:8080/path"
  let host = String(hostnameText || '').trim().toLowerCase();
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  host = host.split('/')[0].split('?')[0].split('#')[0];
  host = host.split(':')[0];

  if (!host) {
    return { allowed: false, reason: '请输入域名' };
  }

  for (let i = 0; i < inspected.valid.length; i++) {
    if (inspected.valid[i].pattern.test(host)) {
      return {
        allowed: true,
        reason: '匹配规则：' + inspected.valid[i].line,
      };
    }
  }

  return { allowed: false, reason: '不在生效域名列表中' };
}

// React to setting changes (e.g. saved in the options page)
function onSettingsChanged(changes, areaName) {
  if (areaName !== 'sync') {
    return;
  }

  const items = {};
  for (const key of Object.keys(changes)) {
    items[key] = changes[key].newValue;
  }
  applyStoredSettings(items);

  // The page may have just been excluded: stop everything that is running
  if (!isAutoScrollAllowedHere()) {
    if (typeof cancelAutoScrollHold === 'function') {
      cancelAutoScrollHold();
    }
    if (typeof stopScrolling === 'function') {
      stopScrolling();
    }
  }
}

// Load the settings and invoke callback once they are available.
// Never throws: on any failure the extension falls back to the defaults.
function initSettings(callback) {
  let finished = false;

  function finish(items) {
    if (finished) {
      return;
    }
    finished = true;
    applyStoredSettings(items);

    if (!storageChangeListenerAttached) {
      storageChangeListenerAttached = true;
      try {
        chrome.storage.onChanged.addListener(onSettingsChanged);
      } catch (error) {
        console.warn('MacAutoScroll: cannot watch settings', error);
      }
    }

    callback();
  }

  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.warn(
          'MacAutoScroll: failed to load settings, using defaults',
          chrome.runtime.lastError
        );
        finish(null);
        return;
      }
      finish(items);
    });
  } catch (error) {
    console.warn(
      'MacAutoScroll: settings unavailable, using defaults',
      error
    );
    finish(null);
  }
}
