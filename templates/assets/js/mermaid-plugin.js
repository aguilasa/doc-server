// Plugin docsify-mermaid local
//
// O SVG é gerado no afterEach, ANTES de o docsify inserir o HTML na página.
// Renderizar só no doneEach (mermaid.run) deixava o diagrama entrar como texto
// cru e crescer depois, de forma assíncrona: o docsify já tinha calculado o
// destino da âncora (?id=...) com a altura errada, e a página parava no meio
// do diagrama em vez de na seção pedida.
const MERMAID_READY_TIMEOUT = 5000;
let mermaidSvgCounter = 0;

// mermaid-init.js é type="module" (diferido): no primeiro render ele pode
// ainda não ter rodado.
function whenMermaidReady() {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(window.mermaid || null), MERMAID_READY_TIMEOUT);
    window.addEventListener('mermaid:ready', () => {
      clearTimeout(timer);
      resolve(window.mermaid);
    }, { once: true });
  });
}

async function renderMermaidBlock(mermaid, code) {
  const id = 'mermaid-svg-' + mermaidSvgCounter++;
  try {
    const { svg } = await mermaid.render(id, code);
    return svg;
  } catch (err) {
    // Em erro o mermaid pode deixar o container temporário no body.
    document.getElementById('d' + id)?.remove();
    document.getElementById(id)?.remove();
    return null;
  }
}

const mermaidPlugin = (mermaidConf) => (hook) => {
  hook.afterEach((html, next) => {
    (async () => {
      const htmlElement = document.createElement('div');
      htmlElement.innerHTML = html;

      const blocks = htmlElement.querySelectorAll('pre[data-lang=mermaid]');
      if (blocks.length === 0) return html;

      const mermaid = await whenMermaidReady();
      const svgs = [];

      // Em sequência: o mermaid não é reentrante.
      for (const element of blocks) {
        const code = element.textContent;
        const replacement = document.createElement('div');
        replacement.classList.add('mermaid');

        const svg = mermaid ? await renderMermaidBlock(mermaid, code) : null;
        if (svg) {
          // data-processed faz o mermaid.run do doneEach pular este bloco. O
          // SVG entra por marcador para não passar duas vezes pelo parser HTML.
          replacement.setAttribute('data-processed', 'true');
          replacement.textContent = '@@MERMAID_SVG_' + svgs.length + '@@';
          svgs.push(svg);
        } else {
          // Sem SVG (sintaxe inválida, mermaid indisponível): o mermaid.run do
          // doneEach tenta de novo e mostra o erro, como antes.
          replacement.textContent = code;
        }
        element.parentNode.replaceChild(replacement, element);
      }

      return htmlElement.innerHTML.replace(/@@MERMAID_SVG_(\d+)@@/g, (_, i) => svgs[i]);
    })()
      .then(next)
      .catch((err) => {
        console.warn('[doc-server:mermaid]', err);
        next(html);
      });
  });

  hook.doneEach(() => {
    if (window.mermaid) window.mermaid.run(mermaidConf);
  });
};

// Registrar o plugin
const props = window.$docsify.mermaidConfig || { querySelector: ".mermaid" };
window.$docsify.plugins = (window.$docsify.plugins || []).concat(mermaidPlugin(props));
