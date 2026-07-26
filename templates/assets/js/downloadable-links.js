// Plugin para impedir que o router do Docsify intercepte links para arquivos
// que não são markdown (PDF, ZIP, imagens usadas como anexo, etc). Sem isso,
// o Docsify tenta buscar esses links como se fossem páginas, acrescentando
// ".md" ao final e resultando em 404.
(function() {
  function isAssetPath(path) {
    const lastSegment = path.split('/').pop() || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex <= 0) return false;
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    return ext !== 'md';
  }

  function fixDownloadableLinks() {
    const links = document.querySelectorAll('.markdown-section a[href^="#/"]');

    links.forEach(function(link) {
      const path = link.getAttribute('href').slice(1).split(/[?#]/)[0];
      if (!isAssetPath(path)) return;

      link.setAttribute('href', path);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    });
  }

  function downloadableLinksPlugin(hook) {
    hook.doneEach(fixDownloadableLinks);
  }

  if (window.$docsify) {
    window.$docsify.plugins = [].concat(downloadableLinksPlugin, window.$docsify.plugins || []);
  }
})();
