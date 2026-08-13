// Âncora de heading no formato do GitHub, para o mesmo .md funcionar nos dois
// lados. A slugify do docsify faz duas coisas que o GitHub não faz: colapsa
// hifens repetidos e prefixa dígito inicial com '_'. Em vez de trocar o id do
// heading — o que quebraria o índice da sidebar e os links que o próprio
// docsify gera —, este plugin ACRESCENTA um alvo vazio com o id do GitHub logo
// antes do heading, e só quando os dois slugs divergem.
//
// Limitação conhecida e sem conserto configurável: id que começa com dígito.
// O docsify resolve a âncora com find('#' + id), que é querySelector, e
// '#51-o-que-mudou' não é seletor CSS válido — ele lança SyntaxError. É por
// isso que a slugify do docsify prefixa o '_'. Um heading que comece com
// dígito continua sem âncora clicável; os outros na mesma página funcionam.
(function () {
  function githubSlug(text) {
    return String(text)
      .trim()
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
      .replace(/\s/g, '-');
  }

  if (!window.$docsify || !window.$docsify.markdown || !window.$docsify.markdown.renderer) {
    return;
  }

  window.$docsify.markdown.renderer.heading = function (text, level) {
    var html = this.origin.heading.apply(this, arguments);

    try {
      var slug = githubSlug(text);
      if (!slug) return html;

      // O slug do docsify sai do próprio HTML que ele acabou de gerar; assim
      // não é preciso reimplementar a slugify dele só para comparar.
      var docsifySlug = html.match(/data-id="([^"]*)"/);
      if (docsifySlug && docsifySlug[1] === slug) return html;

      return '<span class="github-slug-anchor" id="' + slug + '"></span>' + html;
    } catch (err) {
      console.warn('[doc-server:github-slugs]', err);
      return html;
    }
  };
})();
