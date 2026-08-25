// Resolve caminho relativo em HTML cru contra o arquivo que o contém — o que o
// `relativePath: true` já faz na sintaxe Markdown, e só nela.
//
// O docsify reescreve `![](img.png)` e `[x](y.md)` porque passa pelo compilador
// dele. HTML escrito à mão dentro do .md não passa: `<img src="imagens/x.jpg">`
// chega ao DOM exatamente como foi escrito. E como o docsify é SPA de hash, a
// URL do documento é sempre a raiz do site — o navegador resolve aquele caminho
// contra `/`, não contra `/pasta/do/arquivo/`, e o resultado é 404.
//
// No GitHub o mesmo HTML funciona, porque lá cada arquivo tem URL própria. Este
// plugin fecha essa diferença, que é a única coisa que sobrava entre os dois
// lados depois do `relativePath`.
//
// Por que isso importa na prática: HTML cru é a única forma de escrever galeria
// com `loading="lazy"`, `width` e `target="_blank"` — atributos que a sintaxe
// Markdown de imagem não expressa, e sem os quais uma página com centenas de
// fotos em resolução original é impraticável.
//
// Escopo deliberado: só `src` de `<img>` e `href` de `<a>`, e só dentro de
// `.markdown-section`. Fica de fora `srcset`, `<source>`, `<video>` e CSS
// inline — nenhum deles apareceu em uso real, e cada um exige regra própria.
(function () {
  // Só o que é relativo de verdade: descarta esquema (http:, data:, mailto:),
  // protocol-relative (//cdn), âncora pura (#secao) e absoluto (/a/b).
  var ABSOLUTO = /^([a-z][a-z0-9+.-]*:|\/\/|[#/])/i;

  function ehRelativo(valor) {
    return !!valor && !ABSOLUTO.test(valor);
  }

  // Junta base + relativo resolvendo `.` e `..`, como o navegador faria se o
  // documento tivesse URL própria.
  function resolve(base, relativo) {
    var partes = (base + relativo).split('/');
    var pilha = [];
    for (var i = 0; i < partes.length; i++) {
      var p = partes[i];
      if (p === '' && i > 0 && i < partes.length - 1) continue;
      if (p === '.') continue;
      if (p === '..') {
        if (pilha.length > 1) pilha.pop();
        continue;
      }
      pilha.push(p);
    }
    return pilha.join('/');
  }

  // A pasta do arquivo em exibição, com barra final. Vem do router do docsify
  // (`vm.route.file`), não do hash: o router já resolveu homepage, índice de
  // pasta e alias, e o hash sozinho não dá nenhum dos três.
  function pastaAtual(vm) {
    var arquivo = vm && vm.route && vm.route.file;
    if (!arquivo) return null;
    if (arquivo.charAt(0) !== '/') arquivo = '/' + arquivo;
    return arquivo.slice(0, arquivo.lastIndexOf('/') + 1);
  }

  function corrige(vm) {
    var base = pastaAtual(vm);
    if (!base || base === '/') return;

    var secao = document.querySelector('.markdown-section');
    if (!secao) return;

    secao.querySelectorAll('img[src]').forEach(function (img) {
      var src = img.getAttribute('src');
      if (ehRelativo(src)) img.setAttribute('src', resolve(base, src));
    });

    secao.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!ehRelativo(href)) return;
      var alvo = resolve(base, href);
      // Link para outro markdown volta como rota do router (`#/...`); qualquer
      // outro alvo é arquivo servido direto. Sem essa distinção, clicar num
      // .md recarregaria a página inteira em vez de navegar na SPA.
      var caminho = alvo.split(/[?#]/)[0];
      a.setAttribute('href', /\.md$/i.test(caminho) ? '#' + alvo : alvo);
    });
  }

  // Idempotente de propósito: `doneEach` roda de novo a cada troca de rota e a
  // cada re-render, e depois da primeira passada todo valor já começa com '/',
  // então `ehRelativo` devolve false e nada é tocado duas vezes.
  function relativeHtmlAssetsPlugin(hook, vm) {
    hook.doneEach(function () {
      corrige(vm);
    });
  }

  if (window.$docsify) {
    window.$docsify.plugins = [].concat(
      relativeHtmlAssetsPlugin,
      window.$docsify.plugins || []
    );
  }
})();
