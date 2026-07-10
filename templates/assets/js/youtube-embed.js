// Plugin para renderizar links do YouTube como vídeo embutido no Docsify
(function() {
  const YOUTUBE_URL_RE = /^(?:https?:)?\/\/(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)([\w-]{11})|youtu\.be\/([\w-]{11}))/i;

  function extractVideoId(href) {
    const match = href.match(YOUTUBE_URL_RE);
    if (!match) return null;
    return match[1] || match[2];
  }

  function renderYoutubeEmbeds() {
    // Só converte links que estão sozinhos em seu parágrafo (uma linha própria no markdown)
    const paragraphs = document.querySelectorAll('.markdown-section p');

    paragraphs.forEach(function(p) {
      if (p.children.length !== 1 || p.children[0].tagName !== 'A') return;

      const link = p.children[0];
      // Guard against a link that merely shares the paragraph with surrounding
      // text nodes — children.length only counts elements, not text.
      if (p.textContent.trim() !== link.textContent.trim()) return;

      const videoId = extractVideoId(link.getAttribute('href') || '');
      if (!videoId) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'youtube-embed';

      const iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + videoId;
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');

      wrapper.appendChild(iframe);
      p.replaceWith(wrapper);
    });
  }

  function youtubeEmbedPlugin(hook) {
    hook.doneEach(renderYoutubeEmbeds);
  }

  if (window.$docsify) {
    window.$docsify.plugins = [].concat(youtubeEmbedPlugin, window.$docsify.plugins || []);
  }
})();
