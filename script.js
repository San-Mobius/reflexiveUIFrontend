"use strict";

const env = window['__APP_ENV__'] || 'dev';

const envs = {
  dev: {
    base: 'http://localhost:8080'
  },
  staging: {
    base: 'https://ui-framework-node-api.gov-cloud.ai'
  }
}

const baseURL = envs[env]?.base || '';

const source = new EventSource(baseURL+'/api/reflexiveUI/sse');

source.addEventListener('HTML', (e) => {
  const { render, target, html } = JSON.parse(e.data);
  const payload = JSON.parse(e.data);
  switch (render) {
    case 'Partial':
      const el = document.querySelector(target);
      el.innerHTML = html;
      htmx.process(el);
      break;
    case 'AddScriptSrcToHeader': {
      const head = document.querySelector('head');
      const scriptTag = document.createElement('script');
      scriptTag.src = html;
      // Check for optional 'defer' property in the payload
      if (typeof e.defer !== 'undefined' ? e.defer : JSON.parse(e.data).defer) {
        scriptTag.defer = true;
      }
      head.appendChild(scriptTag);
      break;
    }
    case 'AddLinkToHeader': {
      const headLink = document.querySelector('head');
      const linkTag = document.createElement('link');
      linkTag.rel = 'stylesheet';
      linkTag.href = html;
      headLink.appendChild(linkTag);
      break;
    }
    case 'Routing': {
      console.log(JSON.parse(html), 'ROUTING DATA');
      const listenerData = JSON.parse(html);
      history.pushState({}, '', listenerData.href);
      const mainEl = document.querySelector(target);
      if (mainEl) {
        mainEl.innerHTML = html;
      }
      break;
    }

    // ------------------------
    // 🎨 Design System Events
    // ------------------------
    case 'AddThemes': {
      const themes = JSON.parse(html); // { root: {...}, dark: {...} }
      const styleTag =
        document.getElementById('dynamic-themes') ||
        (() => {
          const s = document.createElement('style');
          s.id = 'dynamic-themes';
          document.head.appendChild(s);
          return s;
        })();

      let css = '';
      for (const themeName in themes) {
        const vars = Object.entries(themes[themeName])
          .map(([k, v]) => `${k}: ${v};`)
          .join('\n');
        if (themeName === 'root') {
          css += `:root { ${vars} }\n`;
        } else {
          css += `[data-theme="${themeName}"] { ${vars} }\n`;
        }
      }
      styleTag.textContent += '\n' + css;
      break;
    }

    case 'DeleteTheme': {
      const { theme } = JSON.parse(html);
      const styleTag = document.getElementById('dynamic-themes');
      if (styleTag) {
        // crude removal: rebuild without that theme
        styleTag.textContent = styleTag.textContent.replace(
          new RegExp(`\\[data-theme="${theme}"\\][^{]*{[^}]*}`, 'g'),
          ''
        );
      }
      break;
    }

    case 'SwitchTheme': {
      const { theme } = JSON.parse(html);
      document.documentElement.setAttribute('data-theme', theme);
      break;
    }

    case 'UpdateTheme': {
      const { theme, updates } = JSON.parse(html);
      const styleTag = document.getElementById('dynamic-themes');
      if (styleTag) {
        // remove old theme block
        styleTag.textContent = styleTag.textContent.replace(
          new RegExp(`\\[data-theme="${theme}"\\][^{]*{[^}]*}`, 'g'),
          ''
        );

        const vars = Object.entries(updates)
          .map(([k, v]) => `${k}: ${v};`)
          .join('\n');

        styleTag.textContent += `[data-theme="${theme}"] { ${vars} }\n`;
      }
      break;
    }
  }
});

source.addEventListener('CSS', (e) => {
  const payload = JSON.parse(e.data);

  switch (payload.render) {
    case 'AddClasses': {
      const el = document.querySelector(payload.target);
      if (el) {
        payload.classes.forEach((cls) => el.classList.add(cls));
      }
      break;
    }

    case 'RemoveClasses': {
      const el = document.querySelector(payload.target);
      if (el) {
        payload.classes.forEach((cls) => el.classList.remove(cls));
      }
      break;
    }

    case 'ToggleClasses': {
      const el = document.querySelector(payload.target);
      if (el) {
        payload.classes.forEach((cls) => el.classList.toggle(cls));
      }
      break;
    }

    case 'AddDynamicCss': {
      let styleEl = document.querySelector(`style.dynamic-css-block[data-key="${payload.key}"]`);

      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.className = 'dynamic-css-block';
        styleEl.setAttribute('data-key', payload.key);
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = payload.css;
      break;
    }

    case 'RemoveDynamicCss': {
      const styleEl = document.querySelector(`style.dynamic-css-block[data-key="${payload.key}"]`);
      if (styleEl) styleEl.remove();
      break;
    }
  }
});

source.addEventListener('JS', (e) => {
  const { render, target, html } = JSON.parse(e.data);
  switch (render) {
    case 'AttachToComponent': {
      const el = document.querySelector(target);
      // attach js block
      const scriptTag = document.createElement('script');
      scriptTag.className = 'dynamic-js-block';
      scriptTag.innerHTML = html;
      el.appendChild(scriptTag);
      break;
    }
    case 'AttachToDocument': {
      // attach js block to document body
      const scriptTagDoc = document.createElement('script');
      scriptTagDoc.className = 'dynamic-js-block';
      scriptTagDoc.innerHTML = html;
      document.body.appendChild(scriptTagDoc);
      break;
    }
    case 'AddListenerToComponent': {
      // create method
      const listenerData = JSON.parse(html);
      const targetEl = document.querySelector(listenerData.target);
      if (targetEl) {
        targetEl.addEventListener(listenerData.event, function (event) {
          eval(listenerData.code);
        });
      }
      break;
    }
    case 'AddListenerToDocument': {
      // create method
      const listenerDataDoc = JSON.parse(html);
      document.addEventListener(listenerDataDoc.event, function (event) {
        eval(listenerDataDoc.code);
      });
      break;
    }
    case 'RemoveJsFromComponent': {
      const removeData = JSON.parse(html);
      const targetEl = document.querySelector(removeData.target);
      if (targetEl) {
        targetEl.querySelectorAll('script.dynamic-js-block').forEach((s) => s.remove());
      }
      break;
    }
    case 'RemoveJsFromDocument': {
      document.querySelectorAll('body > script.dynamic-js-block').forEach((s) => s.remove());
      break;
    }
    case 'RemoveListenerFromComponent': {
      const listenerRemoveData = JSON.parse(html);
      const compEl = document.querySelector(listenerRemoveData.target);
      if (compEl) {
        compEl.removeEventListener(
          listenerRemoveData.event,
          window[`_${listenerRemoveData.target}_${listenerRemoveData.event}`]
        );
      }
      break;
    }
    case 'RemoveListenerFromDocument': {
      const docListenerRemove = JSON.parse(html);
      document.removeEventListener(
        docListenerRemove.event,
        window[`_document_${docListenerRemove.event}`]
      );
      break;
    }
  }
});

const ROOT_PATH = location.pathname.replace(/\/$/, '');

source.addEventListener('navigation', (e) => {
  const payload = JSON.parse(e.data);
  const container = document.getElementById('reflexive-ui-main');
  if (!container) return;

  const child = String(payload.url || '').replace(/^\/+/, '');

  const nextUrl = ROOT_PATH + (child ? '/' + child : '');

  // Update the URL bar without reload
  history.pushState({ path: nextUrl }, '', nextUrl);

  container.innerHTML = (payload.html || '') + '\n';
  htmx.process(container); // re-scan for hx-* attributes, etc.
});

function showAlert() {
  alert('Button was clicked!');
}
