// Plugin para renderizar task lists (checkboxes) no Docsify
(function() {
  function renderTaskLists(hook) {
    hook.doneEach(function() {
      // Procurar por listas que começam com [x] ou [ ]
      const listItems = document.querySelectorAll('.markdown-section li > p');

      listItems.forEach(function(p) {
        const text = p.innerHTML;

        // Verificar se começa com [x] ou [ ]
        if (/^\s*\[x\]/i.test(text)) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = true;
          checkbox.disabled = true;

          p.innerHTML = text.replace(/^\s*\[x\]\s*/i, '');
          p.parentNode.insertBefore(checkbox, p);
          p.parentNode.classList.add('task-list-item');
        } else if (/^\s*\[\s*\]/.test(text)) {
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.disabled = true;

          p.innerHTML = text.replace(/^\s*\[\s*\]\s*/, '');
          p.parentNode.insertBefore(checkbox, p);
          p.parentNode.classList.add('task-list-item');
        }
      });
    });
  }

  // Registrar o plugin
  if (window.$docsify) {
    window.$docsify.plugins = [].concat(renderTaskLists, window.$docsify.plugins || []);
  }
})();
