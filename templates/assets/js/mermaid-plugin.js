// Plugin docsify-mermaid local
const mermaidPlugin = (mermaidConf) => (hook) => {
  hook.afterEach((html, next) => {
    const htmlElement = document.createElement('div');
    htmlElement.innerHTML = html;

    htmlElement.querySelectorAll('pre[data-lang=mermaid]').forEach((element) => {
      const replacement = document.createElement('div');
      replacement.textContent = element.textContent;
      replacement.classList.add('mermaid');
      element.parentNode.replaceChild(replacement, element);
    });

    next(htmlElement.innerHTML);
  });

  hook.doneEach(() => mermaid.run(mermaidConf));
};

// Registrar o plugin
const props = window.$docsify.mermaidConfig || { querySelector: ".mermaid" };
window.$docsify.plugins = (window.$docsify.plugins || []).concat(mermaidPlugin(props));
