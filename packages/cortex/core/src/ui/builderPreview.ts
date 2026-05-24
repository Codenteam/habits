/** CSS + JS injected when compiling UiSpec for the WYSIWYG builder preview iframe. */

export const BUILDER_PREVIEW_CSS = `
body.ha-builder-preview { cursor: default; }
.ha-builder-target { position: relative; }
.ha-builder-target:hover {
  outline: 2px dashed rgba(96, 165, 250, 0.55);
  outline-offset: 2px;
}
.ha-builder-target.ha-builder-target--selected {
  outline: 2px solid rgb(59, 130, 246) !important;
  outline-offset: 2px;
}
`;

export const BUILDER_PREVIEW_JS = `
(function () {
  document.body.classList.add('ha-builder-preview');

  function findBuilderTarget(el) {
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-ha-builder-id')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function escId(id) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(id);
    return String(id).split('\\\\').join('\\\\\\\\').split('"').join('\\\\"');
  }

  function highlight(id) {
    document.querySelectorAll('.ha-builder-target--selected').forEach(function (el) {
      el.classList.remove('ha-builder-target--selected');
    });
    if (!id) return;
    var el = document.querySelector('[data-ha-builder-id="' + escId(id) + '"]');
    if (el) el.classList.add('ha-builder-target--selected');
  }

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'ha-builder-highlight') return;
    highlight(e.data.id || null);
  });

  function notifySelect(id) {
    try {
      var bridge = window.parent && window.parent.__HA_BUILDER_BRIDGE__;
      if (bridge && typeof bridge.select === 'function') {
        bridge.select(id);
        return;
      }
    } catch (err) { /* cross-origin — fall back to postMessage */ }
    window.parent.postMessage({ type: 'ha-builder-select', id: id }, '*');
  }

  function onBuilderPointer(e) {
    var target = findBuilderTarget(e.target);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    var id = target.getAttribute('data-ha-builder-id');
    if (!id) return;
    notifySelect(id);
    highlight(id);
  }

  ['pointerdown', 'mousedown', 'click'].forEach(function (type) {
    document.addEventListener(type, onBuilderPointer, true);
  });

  document.addEventListener('submit', function (e) {
    if (findBuilderTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  document.addEventListener('change', function (e) {
    if (findBuilderTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
`;
