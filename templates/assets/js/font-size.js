(function () {
  const STORAGE_KEY = 'doc-server:fontSize';
  const MIN = 10;
  const MAX = 32;
  const STEP = 2;

  function getCurrentSize() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n)) return n;
    }
    const cssVal = getComputedStyle(document.documentElement)
      .getPropertyValue('--doc-font-size')
      .trim();
    return parseInt(cssVal, 10) || 16;
  }

  function applySize(size) {
    const clamped = Math.min(MAX, Math.max(MIN, size));
    document.documentElement.style.setProperty('--doc-font-size', clamped + 'px');
    localStorage.setItem(STORAGE_KEY, String(clamped));
    return clamped;
  }

  // Restore persisted value immediately to avoid flash
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const n = parseInt(stored, 10);
    if (!isNaN(n)) {
      document.documentElement.style.setProperty('--doc-font-size', Math.min(MAX, Math.max(MIN, n)) + 'px');
    }
  }

  function injectControls() {
    const bar = document.createElement('div');
    bar.id = 'doc-font-size-controls';
    bar.style.cssText = [
      'position:fixed',
      'top:12px',
      'right:12px',
      'z-index:99999',
      'display:flex',
      'gap:4px',
      'background:rgba(255,255,255,0.92)',
      'border:1px solid #ddd',
      'border-radius:6px',
      'padding:4px 6px',
      'box-shadow:0 2px 6px rgba(0,0,0,0.12)',
      'font-family:sans-serif',
      'font-size:13px',
      'line-height:1',
    ].join(';');

    function makeBtn(label, delta) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.title = delta > 0 ? 'Increase font size' : 'Decrease font size';
      btn.style.cssText = [
        'background:none',
        'border:none',
        'cursor:pointer',
        'padding:2px 6px',
        'font-size:14px',
        'font-weight:bold',
        'color:#555',
        'border-radius:4px',
      ].join(';');
      btn.addEventListener('mouseover', function () { btn.style.background = '#f0f0f0'; });
      btn.addEventListener('mouseout', function () { btn.style.background = 'none'; });
      btn.addEventListener('click', function () {
        applySize(getCurrentSize() + delta);
      });
      return btn;
    }

    bar.appendChild(makeBtn('A\u2212', -STEP));
    bar.appendChild(makeBtn('A+', STEP));
    document.body.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectControls);
  } else {
    injectControls();
  }
})();
