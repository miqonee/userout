// Shared, dependency-free visual system for every Route page.
export { formatNum } from "../format.js";
export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

export function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  key: '<circle cx="8" cy="15" r="5"/><path d="m11.5 11.5 9-9M16 7l3 3M19 4l2 2"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  plug: '<path d="m12 5 7 7M15 2l-4 4M22 9l-4 4M8 8l8 8-3 3a5.66 5.66 0 0 1-8-8l3-3ZM5 19l-3 3"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 17.9 17"/>',
  logout: '<path d="M9 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5M16 17l5-5-5-5M9 12h12"/>',
  book: '<path d="M12 5v16M12 5C9 2 5 2 2 3v16c3-1 7-1 10 2 3-3 7-3 10-2V3c-3-1-7-1-10 2Z"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  terminal: '<path d="m5 7 5 5-5 5M13 17h6"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5" rx="1"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
};

export function icon(name, className = "") {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

export function brand() {
  return `<span class="brand"><svg class="brand-mark" width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><path d="M9 23V9h8a4 4 0 0 1 0 8h-3m3 0 6 6" stroke="#212622" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>route<span class="brand-period">.</span></span></span>`;
}

export function sidebar({ portal = false, clientName = "", active = "overview", adminPath = "/manage-console" } = {}) {
  const items = portal
    ? [["overview", "grid", "Обзор", "#overview"], ["connection", "key", "Подключение", "#connection"], ["models", "layers", "Модели", "#models"], ["guide", "book", "Быстрый старт", "#guide"]]
    : [["overview", "grid", "Обзор", "#overview"], ["clients", "key", "Клиенты и ключи", "#clients"], ["models", "layers", "Модели", "modelsDialog"], ["connection", "plug", "Подключение", "connectionDialog"]];
  return `<aside class="sidebar">
    <a class="brand-link" href="${portal ? "#overview" : escapeHtml(adminPath)}" aria-label="Route — ${portal ? "личный кабинет" : "панель управления"}">${brand()}</a>
    <div class="workspace-label">${portal ? "ЛИЧНЫЙ КАБИНЕТ" : "РАБОЧЕЕ ПРОСТРАНСТВО"}</div>
    <nav aria-label="Основная навигация">${items.map(([id, glyph, label, target]) => target.startsWith("#")
      ? `<a class="nav-item ${active === id ? "is-active" : ""}" href="${target}" aria-label="${label}" title="${label}" ${active === id ? 'aria-current="location"' : ""}>${icon(glyph)}<span>${label}</span>${active === id ? '<span class="nav-dot"></span>' : ""}</a>`
      : `<button class="nav-item" data-open="${target}" aria-label="${label}" title="${label}">${icon(glyph)}<span>${label}</span></button>`).join("")}</nav>
    <div class="sidebar-bottom"><div class="workspace-user"><span class="user-avatar">${portal ? escapeHtml((clientName.trim()[0] || "К").toUpperCase()) : "A"}</span><span><strong>${portal ? escapeHtml(clientName) : "Администратор"}</strong><small>${portal ? "Персональный доступ" : "Управление шлюзом"}</small></span>${!portal ? `<a class="logout" href="${escapeHtml(adminPath)}/logout" aria-label="Выйти из аккаунта" title="Выйти">${icon("logout")}</a>` : ""}</div></div>
  </aside>`;
}

export const faviconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="9" fill="#c1e998"/><path d="M9 23V9h8a4 4 0 0 1 0 8h-3m3 0 6 6" stroke="#212622" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const faviconDataUri = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

export function head(title, { privatePage = false } = {}) {
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><meta name="referrer" content="no-referrer">${privatePage ? '<meta name="robots" content="noindex, nofollow, noarchive">' : ""}<title>${escapeHtml(title)} — Route</title><link rel="icon" type="image/svg+xml" href="${faviconDataUri}"><style>${styles}</style></head>`;
}

export function toast() {
  return '<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>';
}

export const sharedScript = `
  const toastElement = document.getElementById('toast');
  let toastTimer;
  function notify(message, error = false) {
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.toggle('is-error', error);
    toastElement.hidden = false;
    toastTimer = setTimeout(() => { toastElement.hidden = true; }, 4000);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Скопировано в буфер обмена');
    } catch {
      notify('Не удалось скопировать. Выделите и скопируйте текст вручную.', true);
    }
  }
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (opener) document.getElementById(opener.dataset.open).showModal();
    const closer = event.target.closest('[data-close]');
    if (closer) closer.closest('dialog').close();
    const copier = event.target.closest('[data-copy]');
    if (copier) {
      const source = document.getElementById(copier.dataset.copy);
      copyText(source.value ?? source.textContent);
    }
  });
  document.querySelectorAll('.nav-item[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.remove('is-active');
        item.removeAttribute('aria-current');
      });
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'location');
    });
  });
`;

const styles = `
  :root{--canvas:#f7f8fa;--paper:#fff;--ink:#202824;--muted:#737c77;--line:#e5e9e6;--green:#27764f;--lime:#c1e998;--sidebar:#222824;--mono:"SFMono-Regular",Consolas,"Liberation Mono",monospace;--radius:12px}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;scroll-padding-top:28px}
  body{margin:0;color:var(--ink);background:var(--canvas);font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}
  button,input,select{font:inherit}
  button,a,input,select{ -webkit-tap-highlight-color:transparent}
  button,a{touch-action:manipulation}
  button{cursor:pointer}
  a{color:inherit;text-decoration:none}
  button{color:inherit}
  button:disabled{cursor:wait;opacity:.55}
  button,input,select{border-radius:7px}
  button{background:none;border:0}
  input,select{min-width:0}
  button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #65a27e;outline-offset:4px}
  input:focus-visible,select:focus-visible{outline-offset:1px}
  svg{flex-shrink:0}
  .icon{vertical-align:middle}
  h1,h2,h3,p{margin:0}
  h1{font-size:32px;line-height:1.2;font-weight:650;letter-spacing:-1.2px}
  h2{font-size:17px;letter-spacing:-.35px;font-weight:650}
  h3{font-size:14px;font-weight:600}
  strong{font-weight:600}
  [hidden]{display:none!important}
  .muted{color:var(--muted)}
  .mono,code,pre{font-family:var(--mono)}
  .eyebrow{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase}
  .subtitle{color:var(--muted);margin-top:9px;font-size:14px}
  .count{display:inline-flex;align-items:center;justify-content:center;background:#edf0ed;font-size:11px;min-width:23px;height:23px;padding:0 7px;border-radius:6px;font-weight:500;letter-spacing:0;vertical-align:middle;margin-left:8px}
  .dot{width:6px;height:6px;border-radius:50%;display:inline-block;background:currentColor;flex-shrink:0}
  .app-shell{min-height:100vh;display:grid;grid-template-columns:232px minmax(0,1fr)}
  .sidebar{position:sticky;top:0;height:100vh;background:var(--sidebar);color:#b7c0b9;padding:36px 19px 22px;display:flex;flex-direction:column}
  .brand-link{display:inline-flex;align-self:flex-start;margin:0 14px 40px}
  .brand{display:inline-flex;align-items:center;gap:10px;color:#fff;font-size:29px;line-height:1;font-weight:650;letter-spacing:-1.6px}
  .brand-mark{color:var(--lime)}
  .brand-period{color:var(--lime)}
  .workspace-label{font-size:9px;font-weight:600;letter-spacing:1.3px;color:#8d9991;margin:0 14px 15px}
  .nav-item{display:flex;align-items:center;gap:13px;width:100%;padding:12px 14px;margin-bottom:5px;border-radius:7px;font-size:13px;text-align:left;transition:background .15s,color .15s}
  .nav-item .icon{width:18px;height:18px;opacity:.85}
  .nav-item:hover{color:#fff;background:#2c342e}
  .nav-item.is-active{background:#354231;color:#d6f3b7}
  .nav-dot{width:5px;height:5px;background:var(--lime);border-radius:50%;margin-left:auto}
  .sidebar-bottom{margin-top:auto}
  .sidebar-note{display:flex;gap:12px;padding:18px 14px 28px;color:#9da99f;line-height:1.7;font-size:12px}
  .sidebar-note .icon{margin-top:3px;color:#a3b59a}
  .workspace-user{display:flex;align-items:center;gap:10px;padding:19px 8px 0;border-top:1px solid #394139;font-size:12px;min-width:0}
  .user-avatar{width:33px;height:33px;border:1px solid #515b50;border-radius:50%;display:grid;place-items:center;color:#dce6d9;font-size:12px;flex-shrink:0}
  .workspace-user>span:nth-child(2){min-width:0}
  .workspace-user strong{color:#e0e5e1;display:block;overflow:hidden;text-overflow:ellipsis;max-width:130px;white-space:nowrap}
  .workspace-user small{display:block;font-size:10px;color:#8f9b92;margin-top:2px}
  .logout{margin-left:auto;padding:6px;color:#9aa69e}
  .logout .icon{width:16px;height:16px}
  .logout:hover{color:#fff}
  .main{min-width:0;padding:0 46px 26px;max-width:1600px;width:100%;margin:0 auto}
  .topbar{height:83px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;color:var(--muted)}
  .breadcrumb{display:flex;align-items:center;gap:12px}
  .breadcrumb .icon{width:15px;height:15px}
  .breadcrumb strong{color:var(--ink);font-weight:500}
  .topbar-meta{display:flex;align-items:center;gap:16px}
  .tag{border:1px solid var(--line);border-radius:5px;font-size:10px;letter-spacing:.6px;padding:3px 8px;color:#66716a;background:#fff}
  .page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:35px 0 29px}
  .heading-actions{display:flex;align-items:center;gap:9px}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;min-height:39px;padding:9px 14px;border:1px solid #dce2dd;border-radius:7px;font-size:12px;font-weight:550;background:var(--paper);transition:background .15s,border-color .15s}
  .btn:hover{background:#f0f3ef;border-color:#becabd}
  .btn .icon{width:15px;height:15px}
  .btn-primary{color:#fff;background:#2b6347;border-color:#2b6347}
  .btn-primary:hover{background:#225339;border-color:#225339}
  .btn-dark{background:#252e27;color:#fff;border-color:#252e27}
  .btn-dark:hover{background:#39463c;border-color:#39463c}
  .btn-danger{background:#ab413a;border-color:#ab413a;color:white}
  .btn-danger:hover{background:#8e302a;border-color:#8e302a}
  .btn-text{background:transparent;border-color:transparent;padding-left:6px;padding-right:6px;color:var(--muted)}
  .icon-button{width:32px;height:32px;display:inline-grid;place-items:center;border:1px solid transparent;border-radius:6px;color:#808a83;flex-shrink:0}
  .icon-button:hover{border-color:var(--line);background:#f3f5f2;color:var(--ink)}
  .icon-button .icon{width:16px;height:16px}
  .icon-button.danger:hover{color:#b1443b;background:#fbefed;border-color:#f1d7d2}
  .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:24px}
  .metric{padding:20px 22px;background:var(--paper);border:1px solid var(--line);border-radius:var(--radius)}
  .metric-label{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#6a746d}
  .metric-label .icon{width:15px;height:15px;color:#969e98}
  .metric-number{display:flex;align-items:baseline;gap:5px;white-space:nowrap;font-size:31px;font-weight:600;letter-spacing:-1.4px;line-height:1.3;margin-top:13px;font-variant-numeric:tabular-nums}
  .metric-unit{font-size:.62em;letter-spacing:-.2px;font-weight:500}
  .metric-foot{font-size:11px;color:#7a847d;margin-top:9px;display:flex;align-items:center;gap:6px}
  .metric-accent{background:#edf3e9;border-color:#e0e9d8}
  .metric-accent .metric-number{color:#38603a}
  .panel{background:var(--paper);border:1px solid var(--line);border-radius:var(--radius);min-width:0}
  .panel-header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:23px 25px 20px}
  .panel-description{color:var(--muted);font-size:12px;margin-top:4px}
  .client-toolbar{padding:0 25px 20px;display:flex;align-items:center;justify-content:space-between;gap:15px}
  .search-field{position:relative;max-width:280px;flex:1}
  .search-field>.icon{position:absolute;left:12px;top:12px;color:#929b95;width:15px;height:15px}
  .search-field input{width:100%;height:38px;padding:8px 12px 8px 36px;border:1px solid var(--line);font-size:12px;background:#fff}
  .filter-tabs{display:flex;gap:3px;padding:3px;background:#f2f4f1;border:1px solid #ecefeb;border-radius:7px}
  .filter-tab{font-size:11px;padding:6px 10px;white-space:nowrap;color:#788178}
  .filter-tab[aria-pressed="true"]{background:#fff;box-shadow:0 1px 3px #243a2814;color:#2f3b30}
  .filter-tab:hover{color:#233d29}
  .table-scroll{overflow-x:auto;border-radius:0 0 12px 12px}
  table{width:100%;border-collapse:collapse;text-align:left;white-space:nowrap}
  th{font-size:10px;font-weight:500;letter-spacing:.7px;text-transform:uppercase;color:#707a6b;background:#fafbf9;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 20px}
  td{font-size:12px;padding:19px 20px;border-bottom:1px solid #edf0ec}
  th:first-child,td:first-child{padding-left:25px}
  th:last-child,td:last-child{padding-right:25px}
  tbody tr:last-child td{border-bottom:0}
  tbody tr:hover{background:#fcfdfb}
  .client-identity{display:flex;gap:11px;align-items:center}
  .client-avatar{width:34px;height:34px;border:1px solid #e2e7dd;background:#f0f3e9;display:grid;place-items:center;border-radius:9px;color:#63714e;font-size:11px;font-weight:600}
  .client-row:nth-child(3n+2) .client-avatar{background:#edf0f6;border-color:#e1e5ec;color:#64708a}
  .client-row:nth-child(3n+3) .client-avatar{background:#f6eee8;border-color:#ebe1d9;color:#8e7057}
  .client-name{font-size:12px;font-weight:550;max-width:180px;overflow:hidden;text-overflow:ellipsis}
  .client-key{font-size:10px;color:#737e70;font-family:var(--mono);margin-top:3px}
  .usage-value{font-size:11px;color:#2f3b31;font-variant-numeric:tabular-nums}
  .usage-value span{color:#717c6d}
  .mini-meter{height:4px;background:#edf0e9;width:126px;border-radius:2px;margin-top:9px;overflow:hidden}
  .mini-meter>span{height:100%;display:block;background:#7c9a67;border-radius:2px}
  .mini-meter.is-warning>span{background:#c69a54}
  .mini-meter.is-depleted>span{background:#c97d72}
  .badge{display:inline-flex;gap:6px;align-items:center;font-size:10px;font-weight:500;color:#427851;padding:3px 8px;background:#eef5eb;border:1px solid #e3eddc;border-radius:5px}
  .badge.is-depleted{color:#a5655b;background:#fbefec;border-color:#f2dfd8}
  .badge.is-warning{color:#9b742b;background:#fbf5e5;border-color:#efe4c6}
  .table-actions{display:flex;gap:4px;align-items:center;justify-content:flex-end}
  .table-link{display:flex;align-items:center;gap:7px;color:#6c786e;font-size:11px}
  .table-link:hover{color:#2b6347}
  .table-link .icon{width:13px;height:13px}
  .table-footer{border-top:1px solid var(--line);padding:13px 25px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:10px;color:#70796f}
  .empty-state{padding:52px 24px;text-align:center;white-space:normal}
  .empty-icon{display:grid;place-items:center;background:#f1f4ed;border:1px solid var(--line);border-radius:12px;width:48px;height:48px;margin:0 auto 15px;color:#819273}
  .empty-state h3{font-size:15px}
  .empty-state p{color:var(--muted);max-width:320px;margin:7px auto 19px;font-size:12px}
  .support-strip{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#f0f2ed;border:1px solid #e4e9df;border-radius:10px;padding:18px 22px;margin-top:20px}
  .support-strip>div{display:flex;align-items:center;gap:13px}
  .support-strip .icon{color:#75836d;width:19px;height:19px}
  .support-strip h3{font-size:12px}
  .support-strip p{font-size:11px;color:#808a7d;margin-top:3px}
  .page-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;color:#969e97;font-size:10px;padding-top:28px}
  .footer-brand{font-weight:650;font-size:13px;letter-spacing:-.5px;color:#798478}
  dialog{width:min(560px,calc(100% - 32px));max-height:calc(100dvh - 40px);padding:0;border:1px solid var(--line);border-radius:14px;color:var(--ink);background:#fff;box-shadow:0 24px 100px #12271926;overflow:auto}
  dialog::backdrop{background:#18201cb3;backdrop-filter:blur(3px)}
  .dialog-heading{display:flex;align-items:flex-start;gap:12px;padding:26px 28px 21px;border-bottom:1px solid var(--line)}
  .dialog-heading>div{flex:1}
  .dialog-heading h2{font-size:21px}
  .dialog-heading p{color:var(--muted);font-size:12px;margin-top:5px}
  .dialog-body{padding:25px 28px}
  .dialog-footer{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:19px 28px;border-top:1px solid var(--line);background:#fafbf8}
  .field{margin-bottom:20px}
  .field:last-child{margin-bottom:0}
  .field label,.field-label{display:block;font-size:12px;font-weight:550;margin-bottom:8px}
  .input{width:100%;height:42px;padding:10px 12px;border:1px solid #dce2da;background:#fff;color:var(--ink);font-size:13px}
  .input::placeholder{color:#a0a89f}
  .input-with-action{display:flex;gap:8px;align-items:center}
  .input-with-action .input{flex:1}
  .btn-random-name{height:42px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;font-size:12px;white-space:nowrap;cursor:pointer}
  .funpay-area{width:100%;height:220px;font-family:var(--mono);font-size:11px;line-height:1.45;padding:12px;border:1px solid #dce2da;border-radius:8px;background:#f9faf7;color:var(--ink);resize:vertical;white-space:pre}
  .bonus-summary{background:#f4f7f1;border:1px solid #e1e8db;border-radius:8px;padding:12px 16px;margin-bottom:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .bonus-summary small{display:block;font-size:10px;color:var(--muted);margin-bottom:2px}
  .bonus-summary strong{font-size:14px;color:var(--ink)}
  .bonus-calc{background:#eff4ea;border:1px solid #d5e0cd;border-radius:8px;padding:10px 14px;font-size:12px;margin-top:14px;color:#35532d}
  .field-help{font-size:11px;color:#8c958b;margin-top:7px}
  .form-row{display:grid;grid-template-columns:1.5fr 1fr;gap:15px}
  .preset-row{display:flex;gap:7px;margin-top:8px}
  .preset{border:1px solid var(--line);background:#f7f9f4;border-radius:5px;padding:4px 12px;color:#74816c;font-size:11px}
  .preset[aria-pressed="true"]{border-color:#7f9c70;color:#42633a;background:#eff5e8}
  .check-label{display:flex!important;align-items:center;gap:9px;font-size:12px;font-weight:400!important;cursor:pointer;margin:0!important}
  .check-label input{accent-color:#477147;width:15px;height:15px;flex-shrink:0}
  .model-selector{border:1px solid var(--line);border-radius:7px;padding:12px;margin-top:12px;max-height:180px;overflow-y:auto;display:grid;gap:10px}
  .model-selector span{font:11px var(--mono);overflow-wrap:anywhere}
  .notice{font-size:12px;padding:12px 14px;background:#f2f6ed;border:1px solid #e0e9d8;border-radius:7px;color:#617251;line-height:1.65}
  .notice-error{background:#fcf1ee;color:#a34c41;border-color:#efd5ce}
  .model-list{display:grid;gap:0}
  .model-item{display:flex;align-items:center;gap:13px;padding:15px 0;border-bottom:1px solid #edf0e9}
  .model-item:last-child{border:0}
  .model-glyph{width:32px;height:32px;background:#f3f5ef;border:1px solid #e9ede3;border-radius:8px;display:grid;place-items:center;font-size:12px;color:#778467;flex-shrink:0}
  .model-item code{font-size:11px;overflow-wrap:anywhere;min-width:0}
  .model-item .badge{margin-left:auto}
  .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#283d2d;color:#f2f6ed;padding:12px 20px;box-shadow:0 4px 24px #10251620;border:1px solid #536a4b;border-radius:9px;z-index:100;font-size:12px;max-width:calc(100% - 32px);width:max-content;text-align:center}
  .toast.is-error{background:#853e33;border-color:#aa6655}
  .portal-columns{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:22px;align-items:start}
  .portal-stack{display:grid;gap:22px}
  .quota-panel{background:#f0f5e9;padding:27px 28px;position:relative;overflow:hidden}
  .quota-top{display:flex;align-items:center;justify-content:space-between;gap:15px}
  .quota-top .eyebrow{color:#7c8873;font-size:10px;letter-spacing:1px}
  .quota-content{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:18px 0 24px}
  .quota-number{font-size:45px;line-height:1.1;letter-spacing:-2px;font-weight:550;font-variant-numeric:tabular-nums}
  .quota-caption{font-size:12px;color:#6b7961;margin-top:8px}
  .quota-ring{width:100px;height:100px;position:relative;flex-shrink:0}
  .quota-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
  .quota-ring circle{fill:none;stroke-width:5}
  .ring-track{stroke:#e6ecde}
  .ring-value{stroke:#8aa776;stroke-linecap:round;transition:stroke-dasharray .4s}
  .ring-label{position:absolute;inset:0;display:grid;place-content:center;text-align:center;font-size:19px;line-height:1.2;font-weight:550;color:#698056;font-variant-numeric:tabular-nums}
  .ring-label small{font-size:9px;font-weight:400;color:#8a9680;margin-top:3px}
  .quota-divider{height:1px;background:#e2e9dc;margin-bottom:17px}
  .quota-details{display:grid;grid-template-columns:1fr 1fr;gap:15px}
  .quota-details>div{font-size:11px;color:#6b7961}
  .quota-details strong{display:block;font-size:15px;color:#46583d;margin-top:3px;font-weight:500}
  .quota-details>div+div{border-left:1px solid #e0e7d9;padding-left:20px}
  .credentials-panel{background:#27302a;color:#e7eee3;border-color:#27302a}
  .credentials-panel .panel-description{color:#9da99b}
  .credentials-body{padding:0 25px 24px}
  .credential-label{font-size:11px;color:#a2aea0;margin-bottom:7px;display:block}
  .credential-row{display:flex;gap:7px;margin-bottom:18px}
  .credential-row:last-child{margin-bottom:0}
  .credential-input{background:#202821;border:1px solid #424d3e;color:#c9d6bf;font:11px var(--mono);width:100%;height:42px;padding:11px 12px;border-radius:6px;min-width:0}
  .credential-row .icon-button{height:42px;width:37px;border:1px solid #424d3e;color:#bac7b0}
  .credential-row .icon-button:hover{background:#384433;border-color:#647557;color:#e5f0db}
  .credential-hint{display:flex;gap:7px;color:#8e9b87;font-size:10px;margin-top:14px}
  .credential-hint .icon{width:12px;height:12px;margin-top:2px}
  .guide-panel{margin-top:22px}
  .tabs{display:flex;gap:23px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line);padding:0 25px}
  .tab{font-size:12px;padding:0 0 13px;border-radius:0;white-space:nowrap;color:#737f6c;position:relative}
  .tab[aria-selected="true"]{color:#34613c;font-weight:550}
  .tab[aria-selected="true"]:after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;background:#648456}
  .guide-content{padding:23px 25px 27px;font-size:12px;color:#65715f}
  .guide-content ol{list-style:none;counter-reset:steps;margin:0;padding:0;display:grid;gap:16px}
  .guide-content li{counter-increment:steps;display:flex;gap:12px;align-items:flex-start}
  .guide-content li:before{content:counter(steps,decimal-leading-zero);color:#9ca993;font:11px var(--mono);padding-top:3px}
  .guide-content strong{color:#364b31}
  .guide-content code{font-size:11px}
  .guide-content p{margin-bottom:13px}
  .code-block{position:relative;border:1px solid #e0e7d9;border-radius:8px;overflow:hidden;background:#f5f7f2;margin-top:13px}
  .code-header{padding:9px 14px;border-bottom:1px solid #e0e7d9;color:#8a9682;font:10px var(--mono);display:flex;justify-content:space-between;align-items:center}
  .code-header .icon-button{height:24px;width:24px}
  .code-block pre{font:11px/1.9 var(--mono);overflow-x:auto;padding:17px;margin:0;color:#52694a;tab-size:2}
  .models-body{padding:0 25px 14px}
  .models-note{font-size:11px;color:#707d65;padding:15px 25px;border-top:1px solid var(--line)}
  .quick-note{padding:22px 24px;background:#eff2ea;border:1px solid #e4e9dd;border-radius:10px;font-size:12px;color:#7f8b76}
  .quick-note .icon{color:#7f916f;width:17px;height:17px;margin-bottom:10px}
  .quick-note h3{font-size:12px;color:#536749;margin-bottom:6px}
  .quick-note p{font-size:11px;line-height:1.75}
  .sync-label{font-size:10px;color:#6b7961;margin-top:16px;display:flex;align-items:center;gap:6px}
  .sync-label .dot{color:#91a47f}
  .spin{animation:spin .7s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .login-page{min-height:100dvh;display:grid;grid-template-columns:1fr 1fr;background:#fafbf8}
  .login-brand-panel{background:var(--sidebar);color:#fff;padding:48px 64px;display:flex;flex-direction:column;min-height:100dvh;overflow:hidden}
  .login-brand-panel .brand{align-self:flex-start}
  .login-editorial{margin:auto 0;max-width:450px;padding:55px 0}
  .login-editorial .eyebrow{color:#a5b599;font-size:10px}
  .login-editorial h1{font-size:55px;font-weight:450;line-height:1.13;letter-spacing:-2.5px;margin-top:23px}
  .login-editorial h1 span{color:#bde197}
  .login-editorial p{font-size:14px;color:#9faa9f;max-width:310px;line-height:1.8;margin-top:25px}
  .route-diagram{margin-top:46px;display:flex;align-items:center;width:100%;max-width:380px}
  .diagram-node{border:1px solid #52604c;color:#bbcbb0;border-radius:9px;display:grid;place-items:center;width:46px;height:46px;flex-shrink:0}
  .diagram-node.hub{background:#c1e998;border-color:#c1e998;color:#30412a;width:54px;height:54px}
  .diagram-line{height:1px;background:#57634f;flex:1;position:relative}
  .diagram-line:after{content:"";position:absolute;right:0;top:-2px;width:5px;height:5px;background:#97ab85;border-radius:50%}
  .login-panel{display:flex;align-items:center;justify-content:center;padding:48px}
  .login-form-wrap{width:100%;max-width:340px}
  .login-form-wrap .eyebrow{color:#8d9986;font-size:10px}
  .login-form-wrap h2{font-size:29px;letter-spacing:-1px;margin-top:14px;font-weight:550}
  .login-form-wrap>p{font-size:13px;color:#88917f;margin:10px 0 32px}
  .login-form-wrap .btn{width:100%;margin-top:20px;height:43px;justify-content:space-between;padding:0 16px}
  .login-form-wrap form{margin-top:28px}
  .login-form-wrap .notice{margin-bottom:22px}
  .login-note{display:flex;justify-content:center;align-items:center;gap:7px;color:#707e63;font-size:10px;margin-top:24px}
  .login-note .icon{width:12px;height:12px}
  .login-footer{font-size:10px;color:#85917f;display:flex;align-items:center;justify-content:space-between;gap:10px}
  .state-page{min-height:100dvh;background:#f6f8f2;display:grid;place-items:center;padding:30px}
  .state-card{width:100%;max-width:440px}
  .state-card>.brand{color:#27352b;margin-bottom:64px}
  .state-card .brand-mark{color:#accc8d}
  .state-icon{width:48px;height:48px;display:grid;place-items:center;border:1px solid #e5d8c4;background:#f5ecdc;color:#ad8754;border-radius:12px;margin-bottom:22px}
  .state-card h1{font-size:31px}
  .state-card>p{color:#8b9681;font-size:13px;margin:15px 0 27px;line-height:1.8}
  .state-card>.notice{margin-top:16px}
  .state-footer{border-top:1px solid #e1e7da;padding-top:22px;font-size:10px;color:#96a08e;margin-top:40px}
  .portal-main{max-width:1040px;margin:0 auto;padding:0 30px 32px}
  .portal-masthead{height:86px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px}
  .portal-masthead .brand{color:#27352b;font-size:27px}
  .portal-masthead .brand-mark{color:#b6d697}
  .portal-masthead>span:last-child{display:flex;align-items:center;gap:8px;color:#7b8776;font-size:11px}
  .portal-masthead .icon{width:14px;height:14px}
  .portal-eyebrow{font-size:9px;letter-spacing:1.5px;margin-bottom:10px}
  .portal-page .page-heading{padding:32px 0 27px}
  .portal-page h1{font-size:32px;letter-spacing:-1.1px}
  .access-summary{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:stretch}
  .portal-page .quota-number{font-size:43px;white-space:nowrap}
  .portal-page .quota-ring{width:86px;height:86px}
  .portal-page .quota-content{margin-top:22px;margin-bottom:26px}
  .portal-page .credential-hint{max-width:340px;line-height:1.7}
  .portal-models{padding:24px 0 3px;display:flex;align-items:flex-start;gap:22px}
  .portal-models h2{font-size:11px;white-space:nowrap;font-weight:500;color:#75816d;padding-top:3px}
  .portal-models .count{min-width:19px;height:19px;font-size:10px;margin-left:4px}
  .model-chips{display:flex;flex-wrap:wrap;gap:7px;font-size:11px}
  .model-chips code{font-size:10px;color:#6a785f;padding:5px 8px;border:1px solid #e2e8db;border-radius:5px;background:#f0f3eb;overflow-wrap:anywhere;min-width:0}
  .setup-title{font-size:16px;font-weight:550;letter-spacing:-.25px;color:#30462a;margin-bottom:8px}
  .setup-parameters{display:grid;gap:0;background:#f7f9f4;border:1px solid #e5eadf;border-radius:9px;padding:4px 18px;margin:18px 0}
  .setup-parameters>div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:14px;align-items:center;min-height:42px;padding:9px 0;border-bottom:1px solid #e8ece2}
  .setup-parameters>div:last-child{border:0}
  .setup-parameters dt{font-size:11px;color:#87927c}
  .setup-parameters dd{margin:0;min-width:0;font-size:12px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;overflow-wrap:anywhere}
  .setup-parameters code{white-space:normal;overflow-wrap:anywhere}
  .setup-parameters .icon-button{width:25px;height:25px;margin:-5px 0}
  .guide-content .setup-caption{font-size:10px;color:#7e8c73;margin:10px 0 0;line-height:1.8}
  .setup-footer{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:10px;margin-top:16px;border-top:1px solid var(--line);padding-top:12px}
  .manual-setup{margin:0;padding:0;min-width:0}
  .manual-setup summary{font-size:12px;color:#526e46;cursor:pointer;width:fit-content;margin:0}
  .manual-setup[open]{grid-column:1/-1}
  .manual-setup[open] summary{margin-bottom:12px}
  .setup-footer .guide-source{margin:0;justify-self:end}
  .portal-page .guide-content{padding-bottom:18px}
  .guide-source{display:inline-flex;align-items:center;gap:6px;color:#7a886f;font-size:10px;margin-top:20px}
  .guide-source:hover{color:#3c6534;text-decoration:underline}
  .guide-source .icon{width:11px;height:11px}
  .shell-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
  @media(max-width:760px){.access-summary{grid-template-columns:minmax(0,1fr)}
  .portal-main{max-width:680px;padding-left:24px;padding-right:24px}
  .portal-models{flex-direction:column;gap:10px}
  .portal-page .quota-number{font-size:43px}
  .portal-page .quota-ring{width:86px;height:86px}}
  @media(max-width:600px){.portal-main{padding-left:18px;padding-right:18px}
  .portal-masthead{height:70px}
  .portal-masthead .brand{font-size:25px}
  .portal-masthead>span:last-child{font-size:10px;gap:5px}
  .portal-page .page-heading{padding:25px 0 22px}
  .portal-page h1{font-size:27px}
  .portal-page .quota-number{font-size:clamp(26px,8.5vw,39px)}
  .portal-page .quota-ring{width:clamp(64px,20vw,85px);height:clamp(64px,20vw,85px)}
  .access-summary{gap:17px}
  .portal-models{padding-top:20px}
  .setup-parameters{padding:4px 13px}
  .setup-parameters>div{grid-template-columns:76px minmax(0,1fr);gap:10px}
  .setup-parameters dd{font-size:11px}
  .setup-parameters dd .muted{font-size:10px}
  .setup-footer{grid-template-columns:1fr;gap:8px}
  .setup-footer .guide-source{justify-self:start}}
  @media(min-width:1500px){.main{padding-left:60px;padding-right:60px}
  .page-heading{padding-top:44px;padding-bottom:35px}
  .metric{padding-top:26px;padding-bottom:26px}
  .metric-number{font-size:37px}
  .client-row td{padding-top:23px;padding-bottom:23px}}
  @media(max-width:1180px){.app-shell{grid-template-columns:205px minmax(0,1fr)}
  .main{padding-left:28px;padding-right:28px}
  .sidebar{padding-left:12px;padding-right:12px}
  .metrics{gap:10px}
  .metric{padding:17px}
  .metric-number{font-size:27px}
  .metric-label{font-size:11px}
  .portal-columns{grid-template-columns:minmax(0,1.3fr) minmax(240px,1fr)}
  .quota-number{font-size:36px}
  .quota-ring{width:80px;height:80px}
  td,th{padding-left:14px;padding-right:14px}
  .client-toolbar{flex-wrap:wrap}
  .login-brand-panel{padding:42px}
  .login-editorial h1{font-size:46px}}
  @media(max-width:900px){.app-shell{grid-template-columns:74px minmax(0,1fr)}
  .sidebar{padding:28px 11px}
  .brand-link{margin:0 auto 36px}
  .sidebar .brand>span,.sidebar .workspace-label,.sidebar .nav-item>span,.sidebar .sidebar-note,.sidebar .workspace-user{display:none}
  .sidebar .brand{gap:0}
  .nav-item{justify-content:center;padding:14px 0}
  .main{padding-left:25px;padding-right:25px}
  .topbar{height:72px}
  .metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .portal-columns{grid-template-columns:minmax(0,1fr)}
  .portal-stack{grid-template-columns:1fr 1fr;align-items:start}
  .portal-columns>.portal-stack:first-child{grid-template-columns:1fr}
  .quota-number{font-size:45px}
  .quota-ring{width:100px;height:100px}
  .login-editorial h1{font-size:39px;letter-spacing:-1.5px}
  .login-brand-panel{padding:35px}
  .login-panel{padding:35px}
  .support-strip{align-items:flex-start}
  .support-strip p{max-width:280px}}
  @media(max-width:600px){h1{font-size:27px}
  .app-shell{display:block}
  .sidebar{height:auto;position:relative;padding:18px 20px 0;display:block}
  .sidebar .brand-link{margin:0 0 18px}
  .sidebar .brand>span{display:inline}
  .sidebar .brand{font-size:25px;gap:8px}
  .sidebar .brand-mark{width:27px;height:27px}
  .sidebar nav{display:flex;gap:7px;overflow-x:auto;margin:0 -5px;scrollbar-width:none}
  .sidebar nav::-webkit-scrollbar{display:none}
  .sidebar .nav-item{width:auto;gap:7px;padding:10px;margin-bottom:10px;flex-shrink:0;font-size:11px}
  .sidebar .nav-item>span{display:inline}
  .sidebar .nav-item>.nav-dot{display:none}
  .sidebar .nav-item>.icon{width:14px;height:14px}
  .sidebar-bottom{display:none}
  .main{padding:0 18px 25px}
  .topbar{height:56px;font-size:10px}
  .topbar-meta{gap:8px}
  .topbar .tag{display:none}
  .breadcrumb{gap:8px}
  .page-heading{align-items:flex-start;flex-wrap:wrap;padding:25px 0 22px;gap:18px}
  .subtitle{font-size:12px;max-width:290px}
  .heading-actions{gap:7px}
  .btn{font-size:11px;min-height:36px;padding:8px 11px}
  .metrics{gap:9px;margin-bottom:18px}
  .metric{padding:17px 15px}
  .metric-label{min-height:34px;align-items:flex-start}
  .metric-number{font-size:clamp(22px,6.5vw,29px);margin-top:11px}
  .metric-foot{font-size:10px}
  .metric-label .icon{width:13px;height:13px}
  .panel-header{padding:20px 17px 17px}
  .panel-description{font-size:11px}
  .client-toolbar{padding:0 17px 17px;gap:12px;align-items:stretch}
  .search-field{max-width:none;flex-basis:100%}
  .filter-tabs{width:100%;justify-content:space-between}
  .filter-tab{flex:1}
  .table-footer{padding:13px 17px}
  .table-footer>span:last-child{display:none}
  .support-strip{padding:17px;gap:13px;flex-direction:column}
  .support-strip>div{align-items:flex-start}
  .support-strip .btn{margin-left:30px}
  .page-footer{font-size:9px;padding-top:22px}
  .page-footer>span:last-child{max-width:160px;text-align:right}
  .portal-stack{grid-template-columns:1fr}
  .quota-panel{padding:22px}
  .quota-content{gap:10px}
  .quota-number{font-size:clamp(26px,8.5vw,39px);white-space:nowrap}
  .quota-ring{width:clamp(64px,20vw,85px);height:clamp(64px,20vw,85px)}
  .quota-top .badge{white-space:nowrap;font-size:9px}
  .ring-label{font-size:17px}
  .portal-columns,.portal-stack{gap:18px}
  .credentials-body{padding:0 17px 21px}
  .guide-panel{margin-top:18px}
  .tabs{padding:0 17px;gap:20px}
  .guide-content{padding:21px 17px}
  .credential-input{font-size:10px}
  .models-body{padding:0 17px 14px}
  .models-note{padding:14px 17px}
  .login-page{grid-template-columns:1fr}
  .login-brand-panel{min-height:auto;padding:25px}
  .login-editorial{padding:42px 0 15px;max-width:100%}
  .login-editorial h1{font-size:36px;margin-top:15px}
  .login-editorial p,.route-diagram,.login-footer{display:none}
  .login-panel{padding:38px 25px}
  .login-form-wrap{max-width:100%}
  .login-form-wrap h2{font-size:27px}
  .dialog-heading{padding:22px 21px 18px}
  .dialog-body{padding:21px}
  .dialog-footer{padding:16px 21px}
  .form-row{grid-template-columns:1fr}
  .form-row .field{margin-bottom:0}
  .form-row{margin-bottom:20px}
  .toast{bottom:16px}
  .state-card>.brand{margin-bottom:44px}
  .state-card h1{font-size:27px}}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}
  *,*:before,*:after{animation:none!important;transition:none!important}}
`;
