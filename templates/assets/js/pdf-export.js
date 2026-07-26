(function () {
  function injectButton() {
    const btn = document.createElement('button');
    btn.id = 'doc-pdf-export-btn';
    btn.textContent = 'PDF';
    btn.title = 'Export page to PDF';
    btn.style.cssText = [
      'position:fixed',
      'top:54px',
      'right:12px',
      'z-index:99999',
      'background:rgba(255,255,255,0.92)',
      'border:1px solid #ddd',
      'border-radius:6px',
      'padding:4px 10px',
      'box-shadow:0 2px 6px rgba(0,0,0,0.12)',
      'font-family:sans-serif',
      'font-size:13px',
      'font-weight:bold',
      'line-height:1.4',
      'color:#555',
      'cursor:pointer',
    ].join(';');
    btn.addEventListener('mouseover', function () { btn.style.background = '#f0f0f0'; });
    btn.addEventListener('mouseout', function () { btn.style.background = 'rgba(255,255,255,0.92)'; });
    btn.addEventListener('click', function () { window.print(); });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }
})();
