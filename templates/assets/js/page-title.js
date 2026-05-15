// Atualizar título da página com base no primeiro H1 encontrado
(function() {
  let observer = null;
  let timeoutId = null;
  
  function updateTitleFromH1() {
    const h1 = document.querySelector('.content h1');
    if (h1 && h1.textContent.trim()) {
      document.title = h1.textContent.trim();
    }
  }
  
  function setupObserver() {
    // Limpar observer anterior se existir
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    
    // Limpar timeout anterior se existir
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    // Docsify carrega o conteúdo dinamicamente, então precisamos observar mudanças
    observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList' && mutation.target.classList.contains('content')) {
          updateTitleFromH1();
        }
      });
    });
    
    // Observar o conteúdo principal
    const content = document.querySelector('.content');
    if (content) {
      observer.observe(content, { childList: true, subtree: true });
    }
    
    // Tentar atualizar imediatamente
    updateTitleFromH1();
    
    // Também tentar após um pequeno delay (para garantir que o Docsify carregou)
    timeoutId = setTimeout(updateTitleFromH1, 100);
  }
  
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }
  
  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
  
  // Cleanup ao descarregar a página
  window.addEventListener('beforeunload', cleanup);
  
  // Expor cleanup global para chamadas manuais se necessário
  window.pageTitleCleanup = cleanup;
})();
