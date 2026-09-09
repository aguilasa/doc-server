// Sidebar em árvore: pastas colapsáveis, com o caminho do arquivo aberto
// expandido sozinho, estado persistido, e uma caixa que filtra a árvore por
// nome. A busca em texto completo do docsify continua sendo outra coisa — esta
// caixa não mexe no conteúdo dos .md, só na navegação.
//
// A sidebar tem duas partes com tempos de vida diferentes, e é isso que decide
// onde cada coisa mora:
//
//   .sidebar      criada uma vez, nunca substituída  → input do filtro, listeners
//   .sidebar-nav  innerHTML trocado a cada rota      → decoração, refeita por rota
//
// Por isso o input é irmão de `.sidebar-nav` e não filho, e o clique é por
// delegação registrada uma única vez: o docsify injeta o índice da página com
// `activeEl.parentNode.innerHTML += ...`, que reparseia e substitui todos os
// nós filhos — qualquer listener preso lá dentro morre na primeira navegação.
(function () {
  const STORAGE_KEY = 'doc-server:sidebarTree';
  const FILTER_PLACEHOLDER = 'Filter files…';
  const EMPTY_TEXT = 'No matching files';

  const settings = window.__docServerSidebarTree || {};
  const collapsedByDefault = settings.collapsedByDefault !== false;

  let query = '';
  let filterInput = null;
  let emptyEl = null;
  // Auto-expandir só quando a rota muda de arquivo. Sem isso, colapsar a pasta
  // em que você está e clicar numa âncora de heading reabriria a pasta: o
  // docsify dispara `doneEach` na mudança de hash também.
  let lastAutoExpandedPath = null;

  // ---------------------------------------------------------------- estrutura

  // O markdown da sidebar tem lista frouxa no nível de cima (sidebar.ts põe uma
  // linha em branco antes de cada seção) e apertada dentro das pastas. O
  // CommonMark embrulha o conteúdo de item em <p> só na frouxa, então o link
  // ora é filho direto do <li>, ora está dentro de um <p>. Olhar os dois é o
  // que faz a detecção não depender de qual das formas caiu ali.
  // O docsify reescreve os hrefs da sidebar para a forma de rota (`#/docs/guia`,
  // sem a extensão), então o caminho tem que ser lido depois de tirar o `#`.
  // Aceita também a forma crua `/docs/guia.md`, que é a do markdown servido.
  function hrefPath(link) {
    return (link.getAttribute('href') || '').replace(/^#/, '').replace(/^\//, '');
  }

  function labelLink(li) {
    return li.querySelector(':scope > a, :scope > p > a');
  }

  function childUl(li) {
    return li.querySelector(':scope > ul:not(.app-sub-sidebar)');
  }

  // Pasta é o item que tem filhos e não tem link próprio. A segunda metade é o
  // que separa uma pasta do arquivo ativo, que ganha um <ul> de headings.
  function isFolder(li) {
    return !labelLink(li) && !!childUl(li);
  }

  function labelEl(li) {
    return li.querySelector(':scope > p, :scope > strong') || li;
  }

  // Aceita tanto um <ul> quanto o container `.sidebar-nav`, que é uma <div>
  // com a lista dentro. Sem isso a varredura a partir da raiz não acha item
  // nenhum e a árvore fica sem decoração.
  function childItems(node) {
    const lists = node.tagName === 'UL'
      ? [node]
      : Array.prototype.slice.call(node.querySelectorAll(':scope > ul'));
    const items = [];
    lists.forEach(function (ul) {
      Array.prototype.forEach.call(ul.children, function (el) {
        if (el.tagName === 'LI') items.push(el);
      });
    });
    return items;
  }

  // Identidade da pasta pelo caminho do primeiro link que ela contém, e não
  // pela cadeia de títulos: título é cosmético e colide (`my-doc` e `my_doc`
  // viram ambos "My doc"), o href é único por construção. Todo `li` de pasta
  // tem pelo menos um link — `buildSection` descarta seção de conteúdo vazio.
  function folderKey(li, depth) {
    const link = li.querySelector('a[href]');
    if (!link) return null;
    const segments = hrefPath(link).split('/');
    if (segments.length < depth) return null;
    return '/' + segments.slice(0, depth).join('/');
  }

  // ------------------------------------------------------------ persistência

  // Mapa de decisões explícitas do usuário, não conjunto de expandidas: um
  // conjunto só saberia expressar um dos dois defaults. Chave ausente cai no
  // `collapsedByDefault`, o que funciona igual com ele ligado ou desligado.
  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // Cota cheia ou storage bloqueado: a árvore continua funcionando, só não
      // lembra do estado na próxima carga.
    }
  }

  function isExpanded(li) {
    return !li.classList.contains('sidebar-tree-collapsed');
  }

  function setExpanded(li, expanded) {
    li.classList.toggle('sidebar-tree-collapsed', !expanded);
    const label = labelEl(li);
    if (label !== li) label.setAttribute('aria-expanded', String(expanded));
  }

  // --------------------------------------------------------------- decoração

  function eachFolder(ul, depth, visit) {
    childItems(ul).forEach(function (li) {
      const sub = childUl(li);
      if (!sub) return;
      if (isFolder(li)) {
        visit(li, depth, sub);
        eachFolder(sub, depth + 1, visit);
      }
    });
  }

  function decorate(root) {
    eachFolder(root, 1, function (li) {
      li.classList.add('sidebar-tree-folder');
      const label = labelEl(li);
      if (label === li) return;
      label.classList.add('sidebar-tree-label');
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
    });
  }

  // Aplica o estado guardado (ou o default) em toda a árvore.
  function applyState(root) {
    const state = readState();
    eachFolder(root, 1, function (li, depth) {
      const key = folderKey(li, depth);
      const stored = key === null ? undefined : state[key];
      setExpanded(li, stored === undefined ? !collapsedByDefault : stored);
    });
  }

  // Grava a decisão de uma pasta, descartando de passagem chaves de pastas que
  // não existem mais — senão o storage acumula fantasma de pasta apagada.
  function persist(root, key, expanded) {
    const live = {};
    eachFolder(root, 1, function (li, depth) {
      const k = folderKey(li, depth);
      if (k !== null) live[k] = true;
    });

    const previous = readState();
    const next = {};
    Object.keys(previous).forEach(function (k) {
      if (live[k]) next[k] = previous[k];
    });
    next[key] = expanded;
    writeState(next);
  }

  // --------------------------------------------------------- rota atual

  function currentPath() {
    const hash = window.location.hash || '';
    return hash.replace(/^#/, '').split(/[?]/)[0];
  }

  // Revela o arquivo aberto. Nunca grava no storage: só visitar um arquivo não
  // deve reescrever a preferência de quem colapsou a pasta de propósito.
  function autoExpandActive(root) {
    const path = currentPath();
    if (path === lastAutoExpandedPath) return;
    lastAutoExpandedPath = path;

    // `.active` e não `li.active`: o docsify marca o `<p>` quando o item é de
    // lista frouxa, e o `<li>` quando é de apertada.
    const active = root.querySelector('.active');
    if (!active) return;

    let li = active.closest('li');
    while (li) {
      if (li.classList.contains('sidebar-tree-folder')) setExpanded(li, true);
      const parent = li.parentElement;
      li = parent ? parent.closest('li') : null;
    }
  }

  // ------------------------------------------------------------------ filtro

  function normalize(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  // Casa contra o rótulo e contra o caminho decodificado, para que "guia
  // rápido" ache `/guia%20r%C3%A1pido.md`. Só o texto de comparação é
  // decodificado; a chave de storage continua percent-encoded.
  function haystack(li) {
    const label = labelEl(li);
    let text = (label === li ? '' : label.textContent) || '';
    const link = labelLink(li);
    if (link) {
      const href = hrefPath(link);
      try {
        text += ' ' + decodeURIComponent(href);
      } catch (err) {
        text += ' ' + href;
      }
    }
    return normalize(text);
  }

  // Devolve true quando este ramo contém alguma coisa que casa. Esconde por
  // classe, nunca removendo o nó: o plugin de busca do docsify reconstrói o
  // índice a partir de `.sidebar-nav a` a cada `doneEach`, e um `li` removido
  // sairia da busca em texto completo junto.
  function filterList(ul, needle, depth, state) {
    let anyVisible = false;

    childItems(ul).forEach(function (li) {
      const folder = isFolder(li);
      const selfMatch = haystack(li).indexOf(needle) !== -1;
      const sub = childUl(li);

      // Pasta que casa pelo próprio nome mostra a subárvore inteira: quem
      // procurou "api" quer navegar dentro de api, não ver a linha sozinha.
      let subMatch = false;
      if (sub) {
        subMatch = filterList(sub, selfMatch ? '' : needle, depth + 1, state);
      }

      const visible = selfMatch || subMatch;
      li.classList.toggle('sidebar-tree-hidden', !visible);

      if (folder && visible) {
        // Casamento no meio da árvore força a expansão dos ancestrais — sem
        // isso o resultado fica escondido dentro de uma pasta fechada.
        if (subMatch || selfMatch) {
          setExpanded(li, true);
        } else {
          const key = folderKey(li, depth);
          const stored = key === null ? undefined : state[key];
          setExpanded(li, stored === undefined ? !collapsedByDefault : stored);
        }
      }

      anyVisible = anyVisible || visible;
    });

    return anyVisible;
  }

  function clearFilter(root) {
    const hidden = root.querySelectorAll('.sidebar-tree-hidden');
    Array.prototype.forEach.call(hidden, function (li) {
      li.classList.remove('sidebar-tree-hidden');
    });
    applyState(root);
    autoExpandActive(root);
  }

  function applyFilter(root) {
    if (!query) {
      clearFilter(root);
      if (emptyEl) emptyEl.hidden = true;
      return;
    }
    const any = filterList(root, normalize(query), 1, readState());
    if (emptyEl) emptyEl.hidden = any;
  }

  // ------------------------------------------------------------------ eventos

  // Clique num item aninhado também sobe até a pasta com `closest`, então só
  // conta quando o `li` mais próximo do alvo é a própria pasta.
  function folderFromEvent(e) {
    const target = e.target;
    if (!target || !target.closest) return null;
    const li = target.closest('li.sidebar-tree-folder');
    if (!li) return null;
    if (target.closest('li') !== li) return null;
    return li;
  }

  function toggleFolder(root, li) {
    const depth = folderDepth(li);
    const expanded = !isExpanded(li);
    setExpanded(li, expanded);
    const key = folderKey(li, depth);
    if (key !== null) persist(root, key, expanded);
  }

  function folderDepth(li) {
    let depth = 0;
    let node = li;
    while (node) {
      if (node.classList.contains('sidebar-tree-folder')) depth++;
      const parent = node.parentElement;
      node = parent ? parent.closest('li') : null;
    }
    return depth;
  }

  function bindEvents(root) {
    root.addEventListener('click', function (e) {
      const li = folderFromEvent(e);
      if (!li) return;
      e.preventDefault();
      toggleFolder(root, li);
    });

    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const li = folderFromEvent(e);
      if (!li) return;
      e.preventDefault();
      toggleFolder(root, li);
    });
  }

  function buildFilter(sidebar, root) {
    const box = document.createElement('div');
    box.className = 'sidebar-tree-filter-box';

    filterInput = document.createElement('input');
    filterInput.type = 'search';
    filterInput.className = 'sidebar-tree-filter';
    filterInput.setAttribute('placeholder', FILTER_PLACEHOLDER);
    filterInput.setAttribute('aria-label', FILTER_PLACEHOLDER);

    emptyEl = document.createElement('p');
    emptyEl.className = 'sidebar-tree-empty';
    emptyEl.textContent = EMPTY_TEXT;
    emptyEl.hidden = true;

    box.appendChild(filterInput);
    box.appendChild(emptyEl);
    sidebar.insertBefore(box, root);

    filterInput.addEventListener('input', function () {
      query = filterInput.value.trim();
      applyFilter(root);
    });

    // Escape limpa, como em qualquer caixa de busca.
    filterInput.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !filterInput.value) return;
      filterInput.value = '';
      query = '';
      applyFilter(root);
    });
  }

  // ------------------------------------------------------------------- plugin

  function sidebarTreePlugin(hook) {
    hook.ready(function () {
      try {
        const sidebar = document.querySelector('.sidebar');
        const root = document.querySelector('.sidebar-nav');
        if (!sidebar || !root) return;
        bindEvents(root);
        buildFilter(sidebar, root);
      } catch (err) {
        console.warn('[doc-server:sidebar-tree]', err);
      }
    });

    hook.doneEach(function () {
      try {
        const root = document.querySelector('.sidebar-nav');
        if (!root) return;
        decorate(root);
        applyState(root);
        autoExpandActive(root);
        // O `.sidebar-nav` foi renderizado de novo sem filtro nenhum, mas a
        // caixa ainda mostra o texto — reaplicar mantém os dois de acordo.
        if (query) applyFilter(root);
      } catch (err) {
        console.warn('[doc-server:sidebar-tree]', err);
      }
    });
  }

  if (window.$docsify) {
    window.$docsify.plugins = [].concat(sidebarTreePlugin, window.$docsify.plugins || []);
  }
})();
