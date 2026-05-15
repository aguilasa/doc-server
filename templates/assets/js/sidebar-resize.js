(function () {
  const STORAGE_KEY = 'doc-server:sidebarWidth';
  const MIN_WIDTH = 180;
  const MAX_WIDTH = 600;

  // Dynamic <style> tag used to set content left position.
  // Using a CSS rule (not inline style) so that Docsify's
  // "body.close .content { left: 0 }" can still win when the
  // sidebar toggle closes the sidebar on mobile.
  let contentStyleEl = null;

  function setContentLeft(width) {
    if (!contentStyleEl) {
      contentStyleEl = document.createElement('style');
      document.head.appendChild(contentStyleEl);
    }
    // Only apply when sidebar is open (body:not(.close)).
    // Docsify Vue theme uses position:absolute + left:300px for .content.
    contentStyleEl.textContent =
      'body:not(.close) .content { left: ' + width + 'px !important; }';
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = [
      '.sidebar { position: relative; }',
      '.sidebar-resize-handle {',
      '  position: absolute;',
      '  top: 0;',
      '  right: 0;',
      '  width: 6px;',
      '  height: 100%;',
      '  cursor: col-resize;',
      '  z-index: 100;',
      '}',
      '.sidebar-resize-handle:hover,',
      '.sidebar-resize-handle.dragging {',
      '  background: rgba(0,0,0,0.08);',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function applyWidth(sidebar, width) {
    sidebar.style.width = width + 'px';
    setContentLeft(width);
  }

  function restoreWidth(sidebar) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (!isNaN(w)) {
        applyWidth(sidebar, clamp(w, MIN_WIDTH, MAX_WIDTH));
      }
    }
  }

  function attachHandle(sidebar) {
    if (sidebar.querySelector('.sidebar-resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'sidebar-resize-handle';
    sidebar.appendChild(handle);

    let dragging = false;

    handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      dragging = true;
      handle.classList.add('dragging');
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      applyWidth(sidebar, clamp(e.clientX, MIN_WIDTH, MAX_WIDTH));
    });

    document.addEventListener('mouseup', function () {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      const currentWidth = parseInt(sidebar.style.width, 10);
      if (!isNaN(currentWidth)) {
        localStorage.setItem(STORAGE_KEY, String(currentWidth));
      }
    });
  }

  function init() {
    injectStyles();

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      restoreWidth(sidebar);
      attachHandle(sidebar);
      return;
    }

    // Docsify renders sidebar asynchronously — wait for it
    const observer = new MutationObserver(function () {
      const el = document.querySelector('.sidebar');
      if (el) {
        observer.disconnect();
        restoreWidth(el);
        attachHandle(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
