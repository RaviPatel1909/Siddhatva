// Async font loading, CSP-safe. The font <link>s are shipped as media="print"
// (so they don't block first paint); this swaps them to media="all" once loaded,
// applying the fonts. Replaces the old inline onload="this.media='all'" handler,
// which a strict Content-Security-Policy (script-src without 'unsafe-inline')
// would block. Served from /public as an external script → allowed by 'self'.
(function () {
  function apply(link) {
    link.media = 'all';
  }
  var links = document.querySelectorAll('link[data-async-style]');
  for (var i = 0; i < links.length; i++) {
    var link = links[i];
    if (link.sheet) {
      apply(link); // already loaded
    } else {
      link.addEventListener('load', (function (l) {
        return function () {
          apply(l);
        };
      })(link));
    }
  }
})();
