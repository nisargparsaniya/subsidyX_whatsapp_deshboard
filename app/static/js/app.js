/* ============================================================================
   SubsidyX Command Center — in-house WhatsApp operations console
   Vanilla ES2018 · hash router · skeleton-first rendering · Chart.js analytics
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- constants */

  var MIN_SHIMMER = 350;
  var INR = '\u20B9';

  var SECTORS = ['Textile Industry', 'Information Technology', 'Pharmaceuticals', 'Green Energy'];
  var ENTERPRISE_CLASSES = ['MSME - Small', 'MSME - Medium', 'Large Enterprise', 'Startup'];
  var CATEGORIES = ['Manufacturing', 'Services', 'Trading', 'Agro Processing'];
  var PROJECT_TYPES = ['New', 'Expansion'];
  var TEMPLATE_CATEGORIES = ['WELCOME', 'MARKETING', 'SUBSIDY_ALERT', 'CA_DOCUMENT_REQUEST'];
  var LANGUAGES = [['en_IN', 'English (India)'], ['gu_IN', 'Gujarati'], ['hi_IN', 'Hindi']];
  var TRIGGER_LABELS = {
    KEYWORD_MATCH: 'Keyword match',
    FIRST_INBOUND_WELCOME: 'First inbound welcome',
    BUTTON_PAYLOAD: 'Button payload',
    ANY_UNMATCHED: 'Any unmatched message'
  };
  var RESPONSE_LABELS = {
    TEXT: 'Plain text reply',
    TEMPLATE: 'Approved template',
    INTERACTIVE_MENU: 'Interactive menu'
  };

  var CHART_INK = '#191a47';
  var CHART_ORANGE = '#f26722';
  var CHART_RAMP = ['#f26722', '#191a47', '#0f9d6e', '#6d28d9', '#0e7490', '#b45309', '#64748b'];

  var ROUTES = {
    overview: { title: 'Executive Overview', eyebrow: 'Command center · IST', flush: false },
    inbox: { title: 'Live WhatsApp Inbox', eyebrow: 'Client conversations · human + bot', flush: true },
    contacts: { title: 'HNI Contact Hub', eyebrow: 'Import · segment · export', flush: false },
    marketing: { title: 'Templates & Bulk Marketing', eyebrow: 'Campaign studio', flush: false },
    chatbot: { title: 'Custom Chatbot Builder', eyebrow: 'Rules · triggers · auto-tagging', flush: false },
    security: { title: 'Admin & Security Vault', eyebrow: 'Super Admin only', flush: false }
  };

  var state = {
    user: null,
    isAdmin: false,
    route: '',
    inbox: { threads: [], activeId: null, messages: [], templates: [], filter: '', pendingContact: null, pendingSimulate: null },
    contacts: { rows: [], total: 0, offset: 0, limit: 25, query: '', sector: '' },
    charts: [],
    ledgerTimer: null
  };

  /* -------------------------------------------------------------------- utils */

  function $(sel, scope) {
    return (scope || document).querySelector(sel);
  }

  function $$(sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  }

  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function num(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function fmtInt(value) {
    return num(value).toLocaleString('en-IN');
  }

  function fmtLakhs(value) {
    var lakhs = num(value);
    if (lakhs >= 100) return INR + (lakhs / 100).toFixed(2) + ' Cr';
    var text = lakhs.toLocaleString('en-IN', { maximumFractionDigits: 1 });
    return INR + text + ' L';
  }

  function fmtPct(part, whole) {
    if (!num(whole)) return '0%';
    return ((num(part) / num(whole)) * 100).toFixed(1).replace(/\.0$/, '') + '%';
  }

  function initials(name) {
    var parts = String(name || '?')
      .replace(/^(CA|Mr|Mrs|Ms|Dr)\.?\s+/i, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseIso(iso) {
    if (!iso) return null;
    var match = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;
    return {
      date: match[1] + '-' + match[2] + '-' + match[3],
      year: match[1],
      month: Number(match[2]),
      day: match[3],
      hour: Number(match[4]),
      minute: match[5]
    };
  }

  function clockTime(iso) {
    var parsed = parseIso(iso);
    if (!parsed) return '';
    var suffix = parsed.hour < 12 ? 'AM' : 'PM';
    var hour12 = parsed.hour % 12 || 12;
    return hour12 + ':' + parsed.minute + ' ' + suffix;
  }

  function shortDate(iso) {
    var parsed = parseIso(iso);
    if (!parsed) return '';
    return parsed.day + ' ' + MONTHS[parsed.month - 1];
  }

  function longDate(iso) {
    var parsed = parseIso(iso);
    if (!parsed) return '';
    return parsed.day + ' ' + MONTHS[parsed.month - 1] + ' ' + parsed.year;
  }

  function fullStamp(iso) {
    var parsed = parseIso(iso);
    if (!parsed) return '';
    return parsed.day + ' ' + MONTHS[parsed.month - 1] + ' ' + parsed.year + ', ' + clockTime(iso) + ' IST';
  }

  function todayIst() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
    return parts;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        fn.apply(self, args);
      }, wait);
    };
  }

  function optionList(values, selected) {
    return values
      .map(function (value) {
        var label = Array.isArray(value) ? value[1] : value;
        var val = Array.isArray(value) ? value[0] : value;
        return '<option value="' + esc(val) + '"' + (String(selected || '') === String(val) ? ' selected' : '') + '>' + esc(label) + '</option>';
      })
      .join('');
  }

  function sectorBadge(sector) {
    if (!sector) {
      return '<span class="badge badge-neutral" data-sector="Unassigned">Unassigned</span>';
    }
    return '<span class="badge" data-sector="' + esc(sector) + '">' + esc(sector) + '</span>';
  }

  function statusBadge(status) {
    var map = {
      SUCCESS: 'badge-green',
      INVALID_CREDENTIALS: 'badge-red',
      RATE_LIMITED_BLOCKED: 'badge-amber',
      ACCOUNT_LOCKED: 'badge-amber',
      RUNNING: 'badge-orange',
      COMPLETED: 'badge-green',
      FAILED: 'badge-red'
    };
    return '<span class="audit-status badge ' + (map[status] || 'badge-neutral') + '">' + esc(status.replace(/_/g, ' ')) + '</span>';
  }

  /* ---------------------------------------------------------------------- api */

  function api(path, options) {
    options = options || {};
    var request = {
      method: options.method || 'GET',
      credentials: 'same-origin',
      headers: {}
    };
    if (options.form) {
      request.body = options.form;
    } else if (options.body !== undefined) {
      request.headers['Content-Type'] = 'application/json';
      request.body = JSON.stringify(options.body);
    }

    return fetch(path, request).then(function (response) {
      if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Session expired — please sign in again.');
      }
      return response.text().then(function (text) {
        var payload = null;
        if (text) {
          try {
            payload = JSON.parse(text);
          } catch (error) {
            payload = null;
          }
        }
        if (!response.ok) {
          var detail = payload && payload.detail ? payload.detail : 'Request failed (' + response.status + ')';
          if (Array.isArray(detail)) {
            detail = detail
              .map(function (item) {
                return (item.loc ? item.loc.slice(1).join('.') + ': ' : '') + item.msg;
              })
              .join(' · ');
          } else if (detail && typeof detail === 'object') {
            detail = JSON.stringify(detail);
          }
          throw new Error(detail);
        }
        return payload;
      });
    });
  }

  function apiErrorMessage(label, error) {
    toast('error', label + ' failed', error && error.message ? error.message : 'Unexpected error.');
  }

  /* ------------------------------------------------------------------- toast */

  function toast(kind, title, message) {
    var stack = document.getElementById('toastStack');
    if (!stack) return;
    var glyphs = { success: '\u2714', error: '\u26A0', info: '\u25CF' };
    var node = document.createElement('div');
    node.className = 'toast is-' + (kind || 'info');
    node.innerHTML =
      '<span class="toast-glyph">' +
      (glyphs[kind] || glyphs.info) +
      '</span><span class="toast-text"><strong>' +
      esc(title) +
      '</strong>' +
      (message ? esc(message) : '') +
      '</span>';
    stack.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-out');
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 220);
    }, 4600);
  }

  /* ------------------------------------------------------------------- modal */

  function openModal(config) {
    var root = document.getElementById('modalRoot');
    if (!root) return null;
    root.innerHTML =
      '<div class="modal-backdrop" data-modal-close></div>' +
      '<div class="modal' +
      (config.wide ? ' is-wide' : '') +
      '" role="dialog" aria-modal="true" aria-label="' +
      esc(config.title || 'Dialog') +
      '">' +
      '<div class="modal-head"><div class="modal-head-text"><h3>' +
      esc(config.title || '') +
      '</h3>' +
      (config.subtitle ? '<p>' + esc(config.subtitle) + '</p>' : '') +
      '</div><button class="icon-btn is-plain" type="button" data-modal-close aria-label="Close">\u2715</button></div>' +
      '<div class="modal-body">' +
      (config.body || '') +
      '</div>' +
      (config.footer ? '<div class="modal-foot">' + config.footer + '</div>' : '') +
      '</div>';
    root.classList.add('is-open');

    function close() {
      root.classList.remove('is-open');
      root.innerHTML = '';
      document.removeEventListener('keydown', onKey);
    }

    function onKey(event) {
      if (event.key === 'Escape') close();
    }

    $$('[data-modal-close]', root).forEach(function (node) {
      node.addEventListener('click', close);
    });
    document.addEventListener('keydown', onKey);
    window.setTimeout(function () {
      var focusable = $('.input, .textarea, .select, .btn-primary', root);
      if (focusable) focusable.focus();
    }, 60);

    return { root: root, close: close, el: $('.modal', root), body: $('.modal-body', root), foot: $('.modal-foot', root) };
  }

  function confirmAction(title, message, confirmLabel, onConfirm, danger) {
    var dialog = openModal({
      title: title,
      body: '<p class="field-hint" style="font-size:12.5px;line-height:1.6;color:var(--ink-2)">' + esc(message) + '</p>',
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm ' +
        (danger ? 'btn-danger' : 'btn-primary') +
        '" type="button" data-confirm>' +
        esc(confirmLabel) +
        '</button>'
    });
    if (!dialog) return;
    $('[data-confirm]', dialog.root).addEventListener('click', function () {
      var button = this;
      button.disabled = true;
      Promise.resolve(onConfirm()).then(
        function () {
          dialog.close();
        },
        function () {
          button.disabled = false;
        }
      );
    });
  }

  /* ------------------------------------------------------------------ shimmer */

  function elapsedSince(started) {
    return typeof performance !== 'undefined' && performance.now ? performance.now() - started : 0;
  }

  async function settle(started) {
    var remaining = MIN_SHIMMER - elapsedSince(started);
    if (remaining > 0) await sleep(remaining);
  }

  function skKpis(count) {
    var card =
      '<div class="sk-card"><div class="sk-row" style="padding:0;border:0"><span class="sk-line is-sm skeleton-shimmer" style="width:52%"></span><span class="sk-circle skeleton-shimmer" style="width:26px;height:26px;margin-left:auto"></span></div>' +
      '<span class="sk-line is-title skeleton-shimmer" style="width:64%"></span><span class="sk-line skeleton-shimmer" style="width:82%"></span>' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:100%;margin-top:8px"></span></div>';
    var out = '';
    for (var i = 0; i < (count || 4); i += 1) out += card;
    return '<div class="kpi-grid">' + out + '</div>';
  }

  function skRows(count, columns) {
    var out = '';
    for (var i = 0; i < (count || 6); i += 1) {
      var cells = '';
      for (var c = 0; c < (columns || 4); c += 1) {
        cells += '<span class="sk-line skeleton-shimmer" style="width:' + (c === 0 ? 70 : 84) + '%"></span>';
      }
      out += '<div class="sk-row">' + cells + '</div>';
    }
    return out;
  }

  function skChartBlock() {
    var out = '';
    for (var i = 0; i < 5; i += 1) {
      out +=
        '<div class="fallback-row"><span class="sk-line is-sm skeleton-shimmer" style="width:88%"></span>' +
        '<span class="sk-line skeleton-shimmer" style="height:8px"></span>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:64%"></span></div>';
    }
    return out;
  }

  function skOverview() {
    return (
      skKpis(4) +
      '<div class="quick-bar">' +
      '<div class="sk-block skeleton-shimmer" style="height:52px"></div>'.repeat(4) +
      '</div>' +
      '<div class="chart-grid">' +
      '<div class="sk-card" style="gap:12px"><span class="sk-line is-lg skeleton-shimmer" style="width:38%"></span>' +
      skChartBlock() +
      '</div>' +
      '<div class="sk-card" style="gap:12px"><span class="sk-line is-lg skeleton-shimmer" style="width:42%"></span>' +
      skChartBlock() +
      '</div>' +
      '</div>' +
      '<div class="sk-card"><span class="sk-line is-lg skeleton-shimmer" style="width:30%"></span>' +
      skRows(5, 5) +
      '</div>'
    );
  }

  function skTable(rows) {
    return (
      '<div class="card"><div class="sk-row" style="border:0;padding:16px 18px"><span class="sk-line is-lg skeleton-shimmer" style="width:28%"></span>' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:18%;margin-left:auto"></span></div>' +
      '<div class="sk-row" style="background:#f8fafc">' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:24%"></span>' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:18%"></span>' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:16%"></span>' +
      '<span class="sk-line is-sm skeleton-shimmer" style="width:14%"></span>' +
      '</div>' +
      skRows(rows || 7, 4) +
      '</div>'
    );
  }

  function skInbox() {
    var threads = '';
    for (var i = 0; i < 6; i += 1) {
      threads +=
        '<div class="sk-row"><span class="sk-circle skeleton-shimmer" style="width:32px;height:32px;flex:0 0 auto"></span>' +
        '<span style="flex:1 1 auto;display:flex;flex-direction:column;gap:6px">' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:60%"></span>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:88%"></span></span></div>';
    }
    var bubbles = '';
    var shapes = ['is-in', 'is-out is-short', 'is-in is-mid', 'is-out', 'is-in is-short'];
    for (var b = 0; b < 5; b += 1) bubbles += '<div class="sk-bubble ' + shapes[b] + '"></div>';
    return (
      '<div class="inbox">' +
      '<section class="pane pane-threads"><div class="pane-head"><div class="sk-line is-sm skeleton-shimmer" style="width:40%"></div></div>' + threads + '</section>' +
      '<section class="pane pane-chat chat-pane"><div class="pane-head"><div class="sk-line is-sm skeleton-shimmer" style="width:30%"></div></div>' +
      '<div class="sk-chat">' + bubbles + '</div>' +
      '<div class="composer"><div class="sk-block skeleton-shimmer" style="height:40px"></div></div></section>' +
      '<section class="pane pane-dossier"><div class="pane-head"><div class="sk-line is-sm skeleton-shimmer" style="width:44%"></div></div>' +
      '<div class="sk-chat">' + skChartBlock() + '</div></section>' +
      '</div>'
    );
  }

  function skGrid(count) {
    var out = '';
    for (var i = 0; i < (count || 6); i += 1) {
      out +=
        '<div class="sk-card" style="gap:9px"><span class="sk-line is-lg skeleton-shimmer" style="width:58%"></span>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:36%"></span>' +
        '<div class="sk-block skeleton-shimmer" style="height:74px;margin-top:4px"></div>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:52%"></span></div>';
    }
    return '<div class="template-grid">' + out + '</div>';
  }

  function skCards(columns, count) {
    var out = '';
    for (var i = 0; i < (count || 6); i += 1) {
      out +=
        '<div class="sk-card" style="gap:9px"><span class="sk-line is-lg skeleton-shimmer" style="width:64%"></span>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:40%"></span>' +
        '<div class="sk-block skeleton-shimmer" style="height:56px"></div>' +
        '<span class="sk-line is-sm skeleton-shimmer" style="width:74%"></span></div>';
    }
    return '<div class="' + (columns || 'flow-grid') + '">' + out + '</div>';
  }

  /* ------------------------------------------------------------- print sheet */

  function printClientSummary(contact) {
    var root = document.getElementById('printRoot');
    if (!root) return;
    var rows = [
      ['Inquiry ID', contact.inquiry_id],
      ['Client name', contact.client_name],
      ['Company', contact.company_name || '—'],
      ['WhatsApp', contact.whatsapp_number],
      ['Email', contact.email || '—'],
      ['Sector', contact.sector || 'Unassigned'],
      ['Enterprise class', contact.enterprise_classification || '—'],
      ['Project type', contact.project_type || '—'],
      ['Term loan planned', contact.term_loan_planned || '—'],
      ['Location', [contact.taluka, contact.district, contact.state].filter(Boolean).join(', ') || '—'],
      ['Estimated subsidy', fmtLakhs(contact.estimated_subsidy_lakhs)],
      ['Assigned CA', contact.assigned_ca || 'Unassigned'],
      ['Tags', (contact.tag_list || []).join(', ') || '—'],
      ['Opt-in', contact.opt_in_status ? 'Opted in' : 'Opted out'],
      ['Relationship opened', fullStamp(contact.created_at)]
    ];
    root.innerHTML =
      '<div class="print-sheet"><h1>SubsidyX — HNI Client Summary</h1>' +
      '<p class="print-sub">' +
      esc(contact.client_name) +
      ' · ' +
      esc(contact.inquiry_id) +
      ' · generated ' +
      esc(fullStamp(new Date().toISOString())) +
      '</p>' +
      '<table class="print-table"><tbody>' +
      rows
        .map(function (row) {
          return '<tr><th>' + esc(row[0]) + '</th><td>' + esc(row[1]) + '</td></tr>';
        })
        .join('') +
      '</tbody></table>' +
      '<div class="print-sign"><div>Relationship Manager</div><div>Authorised Signatory</div></div>' +
      '<p class="print-sub" style="margin-top:18px">Internal document — SubsidyX Advisory. HNI clients never access this console.</p></div>';
    window.print();
  }

  /* ------------------------------------------------------------------- shell */

  function canvas() {
    return document.getElementById('canvas');
  }

  function viewNode() {
    return document.getElementById('view');
  }

  function destroyCharts() {
    state.charts.forEach(function (chart) {
      try {
        chart.destroy();
      } catch (error) {
        /* chart already detached */
      }
    });
    state.charts = [];
  }

  function currentRoute() {
    var hash = String(window.location.hash || '')
      .replace(/^#\/?/, '')
      .split('?')[0];
    return ROUTES[hash] ? hash : 'overview';
  }

  function setTopbar(route) {
    var meta = ROUTES[route] || ROUTES.overview;
    var title = document.getElementById('topTitle');
    var eyebrow = document.getElementById('topEyebrow');
    if (title) title.textContent = meta.title;
    if (eyebrow) eyebrow.textContent = meta.eyebrow;
    document.title = meta.title + ' · SubsidyX Command Center';
  }

  function setActiveNav(route) {
    $$('.nav-item').forEach(function (item) {
      item.classList.toggle('is-active', item.getAttribute('data-route') === route);
    });
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('is-open');
  }

  function tickClock() {
    var node = document.getElementById('clock');
    if (!node) return;
    var text = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());
    node.textContent = text.replace(',', ' ·') + ' IST';
  }

  function applyUser() {
    var user = state.user || { full_name: 'Operator', role: 'EMPLOYEE', username: 'operator' };
    var avatar = document.getElementById('userAvatar');
    var topAvatar = document.getElementById('topAvatar');
    var name = document.getElementById('userName');
    var role = document.getElementById('userRole');
    if (avatar) avatar.textContent = initials(user.full_name);
    if (topAvatar) topAvatar.textContent = initials(user.full_name);
    if (name) name.textContent = user.full_name;
    if (role) {
      role.textContent = user.role === 'ADMIN' ? 'Super Admin' : 'Employee';
      role.classList.toggle('is-admin', user.role === 'ADMIN');
    }
    var chip = document.getElementById('userChip');
    if (chip) chip.setAttribute('title', user.full_name + ' · ' + user.username);
    $$('[data-admin-only]').forEach(function (node) {
      node.hidden = !state.isAdmin;
    });
  }

  function setModePill(mode) {
    var pill = document.getElementById('modePill');
    var text = document.getElementById('modePillText');
    if (!pill || !text) return;
    var isLive = String(mode || '').toUpperCase() === 'LIVE';
    pill.classList.toggle('is-live', isLive);
    text.textContent = isLive ? 'Live · Meta Cloud' : 'Mock · Presentation';
    pill.setAttribute('title', isLive ? 'Official Meta WhatsApp Cloud API connected' : 'Presentation mode — seeded demo data');
  }

  function ledgerLoading() {
    $$('.ledger-value[id]').forEach(function (node) {
      node.classList.add('is-loading');
      node.textContent = '';
    });
  }

  function setLedger(id, value, signal) {
    var node = document.getElementById(id);
    if (!node) return;
    node.classList.remove('is-loading');
    node.textContent = value;
    var cell = node.closest('.ledger-cell');
    if (cell) cell.classList.toggle('is-signal', !!signal);
  }

  async function refreshLedger() {
    var requests = [
      api('/api/whatsapp/mode').catch(function () {
        return null;
      }),
      api('/api/contacts/stats').catch(function () {
        return null;
      }),
      api('/api/campaigns').catch(function () {
        return null;
      }),
      api('/api/whatsapp/threads').catch(function () {
        return null;
      }),
      api('/api/chatbot/flows').catch(function () {
        return null;
      })
    ];
    var results = await Promise.all(requests);
    var mode = results[0];
    var stats = results[1];
    var campaigns = results[2];
    var threads = results[3];
    var flows = results[4];

    if (mode) setModePill(mode.whatsapp_mode);
    if (stats) setLedger('lgClients', fmtInt(stats.total_contacts));
    if (stats) setLedger('lgPipeline', INR + num(stats.pipeline_crores).toFixed(2) + ' Cr', true);
    if (campaigns && campaigns.funnel) {
      var funnel = campaigns.funnel;
      setLedger('lgDelivery', fmtPct(funnel.delivered, funnel.targeted || funnel.sent));
    }
    if (threads) {
      setLedger('lgThreads', fmtInt(threads.unread_total));
      var count = document.getElementById('navInboxCount');
      if (count) {
        count.textContent = fmtInt(threads.unread_total);
        count.hidden = !num(threads.unread_total);
      }
    }
    if (flows) setLedger('lgBot', fmtInt(flows.total_hits));

    state.cache = { mode: mode, stats: stats, campaigns: campaigns, threads: threads, flows: flows };
    return state.cache;
  }

  /* ------------------------------------------------------------------ router */

  function errorState(title, message, retry) {
    return (
      '<div class="card"><div class="empty"><span class="glyph">\u26A0</span><strong>' +
      esc(title) +
      '</strong><p>' +
      esc(message) +
      '</p>' +
      (retry ? '<button class="btn btn-sm btn-primary" type="button" data-retry style="margin-top:6px">Retry</button>' : '') +
      '</div></div>'
    );
  }

  function emptyState(glyph, title, message, action) {
    return (
      '<div class="empty"><span class="glyph">' +
      glyph +
      '</span><strong>' +
      esc(title) +
      '</strong><p>' +
      esc(message) +
      '</p>' +
      (action || '') +
      '</div>'
    );
  }

  async function renderRoute() {
    var route = currentRoute();

    if (route === 'security' && !state.isAdmin) {
      toast('error', 'Access denied', 'The Security Vault is restricted to Super Admins.');
      window.location.hash = '#/overview';
      return;
    }

    state.route = route;
    destroyCharts();
    setTopbar(route);
    setActiveNav(route);
    closeSidebar();

    var host = canvas();
    if (host) host.classList.toggle('is-flush', !!ROUTES[route].flush);

    var view = viewNode();
    if (!view) return;
    view.className = 'view';
    view.innerHTML = '';
    var started = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;

    try {
      if (route === 'inbox') await viewInbox(view, started);
      else if (route === 'contacts') await viewContacts(view, started);
      else if (route === 'marketing') await viewMarketing(view, started);
      else if (route === 'chatbot') await viewChatbot(view, started);
      else if (route === 'security') await viewSecurity(view, started);
      else await viewOverview(view, started);

      view.classList.add('view-enter');
      if (host && route !== 'inbox') host.scrollTop = 0;
    } catch (error) {
      view.innerHTML = errorState('Could not load this module', error.message || 'Unexpected error.', true);
      var retry = $('[data-retry]', view);
      if (retry) retry.addEventListener('click', renderRoute);
      view.classList.add('view-enter');
    }
  }

  /* -------------------------------------------------------------------- boot */

  async function boot() {
    tickClock();
    window.setInterval(tickClock, 1000);

    var toggle = document.getElementById('navToggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.toggle('is-open');
      });
    }

    document.addEventListener('click', function (event) {
      var navButton = event.target.closest('[data-route]');
      if (navButton && navButton.classList.contains('nav-item')) {
        window.location.hash = '#/' + navButton.getAttribute('data-route');
        closeSidebar();
      }
      $$('.template-pop-list').forEach(function (list) {
        if (!event.target.closest('.template-pop')) list.hidden = true;
      });
    });

    var logout = document.getElementById('logoutBtn');
    if (logout) {
      logout.addEventListener('click', function () {
        logout.disabled = true;
        api('/api/auth/logout', { method: 'POST' })
          .catch(function () {
            return null;
          })
          .then(function () {
            window.location.href = '/login';
          });
      });
    }

    window.addEventListener('hashchange', function () {
      renderRoute();
    });

    ledgerLoading();
    refreshLedger();

    try {
      var me = await api('/api/auth/me');
      state.user = me.user;
      state.isAdmin = me.user.role === 'ADMIN';
    } catch (error) {
      state.user = null;
      state.isAdmin = false;
    }
    applyUser();

    if (!window.location.hash) {
      window.location.hash = '#/overview';
    }
    await renderRoute();
  }

  /* ----------------------------------------------------------------- charts */

  function mountChart(canvasId, fallbackId, config, fallbackHTML) {
    var canvasEl = document.getElementById(canvasId);
    var fallbackEl = document.getElementById(fallbackId);
    if (!canvasEl || !fallbackEl) return;
    if (typeof window.Chart === 'undefined') {
      canvasEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
      fallbackEl.innerHTML = fallbackHTML;
      return;
    }
    fallbackEl.style.display = 'none';
    try {
      var ctx = typeof canvasEl.getContext === 'function' ? canvasEl.getContext('2d') : null;
      if (!ctx) throw new Error('no context');
      var chart = new window.Chart(ctx, config);
      state.charts.push(chart);
    } catch (error) {
      canvasEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
      fallbackEl.innerHTML = fallbackHTML;
    }
  }

  function fallbackBars(rows) {
    var max = rows.reduce(function (acc, row) {
      return Math.max(acc, num(row.value));
    }, 0);
    return rows
      .map(function (row) {
        var width = max ? Math.max(2, Math.round((num(row.value) / max) * 100)) : 0;
        return (
          '<div class="fallback-row"><span>' +
          esc(row.label) +
          '</span><span class="fallback-track"><span class="fallback-fill" style="width:' +
          width +
          '%;background:' +
          esc(row.color || CHART_ORANGE) +
          '"></span></span><span class="fallback-value">' +
          esc(row.display) +
          '</span></div>'
        );
      })
      .join('');
  }

  function chartShell(title, subtitle, canvasId, footer, action) {
    return (
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>' +
      esc(title) +
      '</h2><p>' +
      esc(subtitle) +
      '</p></div>' +
      (action || '') +
      '</div><div class="card-body"><div class="chart-wrap"><canvas id="' +
      canvasId +
      '" role="img" aria-label="' +
      esc(title) +
      '"></canvas><div class="chart-fallback" id="' +
      canvasId +
      'Fallback"></div></div></div>' +
      (footer || '') +
      '</div>'
    );
  }

  /* --------------------------------------------------------------- overview */

  async function viewOverview(view, started) {
    view.innerHTML = skOverview();
    var results = await Promise.all([
      api('/api/contacts/stats'),
      api('/api/campaigns'),
      api('/api/whatsapp/threads'),
      api('/api/chatbot/flows'),
      api('/api/whatsapp/mode').catch(function () {
        return null;
      }),
      api('/api/admin/employees').catch(function () {
        return null;
      })
    ]);
    await settle(started);

    var stats = results[0];
    var campaigns = results[1];
    var threads = results[2];
    var flows = results[3];
    var mode = results[4];
    var employees = results[5] ? results[5].employees || [] : null;
    state.cache = { stats: stats, campaigns: campaigns, threads: threads, flows: flows, mode: mode };

    var funnel = campaigns.funnel || { targeted: 0, sent: 0, delivered: 0, read: 0, replied: 0 };
    var sectors = (stats.by_sector || []).filter(function (row) {
      return num(row.count) > 0;
    });
    var activeFlows = num(flows.active);
    var totalFlows = num(flows.total);
    var deliveryRate = fmtPct(funnel.delivered, funnel.targeted || funnel.sent);
    var optedIn = num(stats.opted_in);
    var districts = (stats.by_district || []).length;
    var avgLakhs = num(stats.total_contacts) ? num(stats.pipeline_lakhs) / num(stats.total_contacts) : 0;
    var caDesks = (stats.by_ca || []).length;
    var unread = num(threads.unread_total);
    var activeStaff = employees ? employees.filter(function (row) { return row.is_active; }).length : 0;
    var adminCount = employees ? employees.filter(function (row) { return row.role === 'ADMIN'; }).length : 0;
    var revokedStaff = employees ? employees.length - activeStaff : 0;

    var kpis =
      '<div class="kpi-grid">' +
      '<article class="kpi is-primary"><div class="kpi-top"><span class="kpi-label">HNI Clients &amp; Pipeline</span><span class="kpi-glyph">\uD83D\uDC64</span></div>' +
      '<div class="kpi-value">' +
      INR +
      num(stats.pipeline_crores).toFixed(2) +
      '<span class="unit">crore</span></div>' +
      '<p class="kpi-note"><span class="up">' +
      fmtInt(stats.total_contacts) +
      ' clients</span> · ' +
      fmtInt(optedIn) +
      ' opted in · ' +
      fmtInt(districts) +
      ' districts</p>' +
      '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Avg / client</span><span class="kpi-ledger-value">' +
      esc(fmtLakhs(avgLakhs)) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Sectors · CA desks</span><span class="kpi-ledger-value">' +
      fmtInt(sectors.length) +
      ' · ' +
      fmtInt(caDesks) +
      '</span></div></div></article>' +

      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Campaign Delivery</span><span class="kpi-glyph">\uD83D\uDCE4</span></div>' +
      '<div class="kpi-value">' +
      esc(deliveryRate) +
      '<span class="unit">delivered</span></div>' +
      '<p class="kpi-note">' +
      fmtInt(funnel.delivered) +
      ' of ' +
      fmtInt(funnel.targeted) +
      ' targeted <span class="up">+' +
      fmtInt(funnel.replied) +
      ' replies</span></p>' +
      '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Sent</span><span class="kpi-ledger-value">' +
      fmtInt(funnel.sent) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Read</span><span class="kpi-ledger-value">' +
      fmtInt(funnel.read) +
      '</span></div></div></article>' +

      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Chatbot Automation</span><span class="kpi-glyph">\uD83E\uDD16</span></div>' +
      '<div class="kpi-value">' +
      fmtInt(flows.total_hits) +
      '<span class="unit">auto-replies</span></div>' +
      '<p class="kpi-note"><span class="up">' +
      fmtInt(activeFlows) +
      ' of ' +
      fmtInt(totalFlows) +
      ' rules live</span> · ' +
      fmtInt(unread) +
      ' unread</p>' +
      '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Rules</span><span class="kpi-ledger-value">' +
      fmtInt(totalFlows) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Threads</span><span class="kpi-ledger-value">' +
      fmtInt(threads.total) +
      '</span></div></div></article>' +

      (employees
        ? '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Security &amp; Staff</span><span class="kpi-glyph">\uD83D\uDEE1\uFE0F</span></div>' +
          '<div class="kpi-value">' +
          fmtInt(activeStaff) +
          '<span class="unit">active staff</span></div>' +
          '<p class="kpi-note"><span class="up">' +
          fmtInt(adminCount) +
          ' Super Admins</span> seeded · ' +
          fmtInt(revokedStaff) +
          ' revoked</p>' +
          '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Employee IDs</span><span class="kpi-ledger-value">' +
          fmtInt(employees.length) +
          '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Audit</span><span class="kpi-ledger-value">IP logged</span></div></div></article>'
        : '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Security &amp; Staff</span><span class="kpi-glyph">\uD83D\uDEE1\uFE0F</span></div>' +
          '<div class="kpi-value">\u2014<span class="unit">restricted</span></div>' +
          '<p class="kpi-note">Staff credentials, IP audit and the Meta cutover live inside the <span class="up">Security Vault</span> for Super Admins.</p>' +
          '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Access</span><span class="kpi-ledger-value">Admin only</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Audit</span><span class="kpi-ledger-value">IP logged</span></div></div></article>') +
      '</div>';

    var quick =
      '<div class="quick-bar">' +
      '<button class="quick-btn" type="button" data-quick="contacts"><span class="quick-glyph">\uD83D\uDCE5</span><span class="quick-text"><strong>Import mobile contacts</strong><span>Drop a .vcf, .csv or .xlsx file</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="marketing"><span class="quick-glyph">\uD83D\uDE80</span><span class="quick-text"><strong>Launch bulk broadcast</strong><span>Segmented WhatsApp campaign</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="inbox" data-simulate="What subsidy can a textile unit get?"><span class="quick-glyph">\u26A1</span><span class="quick-text"><strong>Simulate client message</strong><span>' +
      fmtInt(unread) +
      ' unread · watch the chatbot reply live</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="security"><span class="quick-glyph">\uD83D\uDD10</span><span class="quick-text"><strong>Connect official Meta API</strong><span>Purge mock data · go 100% live</span></span></button>' +
      '</div>';

    var sectorLegend = sectors
      .map(function (row, index) {
        return (
          '<span class="legend-item"><span class="legend-swatch" style="background:' +
          CHART_RAMP[index % CHART_RAMP.length] +
          '"></span>' +
          esc(row.sector) +
          '</span>'
        );
      })
      .join('');

    var sectorChart = chartShell(
      'Subsidy pipeline by sector',
      'Where the advisory book is concentrated (\u20B9 Lakhs)',
      'ovSector',
      '<div class="chart-ledger"><div class="chart-ledger-item">Total <strong>' +
        esc(fmtLakhs(stats.pipeline_lakhs)) +
        '</strong></div><div class="chart-ledger-item">Clients <strong>' +
        fmtInt(stats.total_contacts) +
        '</strong></div><div class="chart-ledger-item"><span class="legend">' +
        sectorLegend +
        '</span></div></div>'
    );

    var funnelChart = chartShell(
      'Campaign delivery funnel',
      'Cumulative WhatsApp delivery stages across every campaign',
      'ovFunnel',
      '<div class="chart-ledger"><div class="chart-ledger-item">Targeted <strong>' +
        fmtInt(funnel.targeted) +
        '</strong></div><div class="chart-ledger-item">Read <strong>' +
        fmtInt(funnel.read) +
        '</strong></div><div class="chart-ledger-item">Replied <strong>' +
        fmtInt(funnel.replied) +
        '</strong></div></div>'
    );

    var campaignRows = (campaigns.campaigns || []).slice(0, 5);
    var campaignList = campaignRows.length
      ? campaignRows
          .map(function (campaign) {
            var pct = num(campaign.total_targeted) ? Math.min(100, (num(campaign.sent_count) / num(campaign.total_targeted)) * 100) : 0;
            return (
              '<div class="campaign-row"><div class="campaign-top"><div class="campaign-title"><strong>' +
              esc(campaign.campaign_name) +
              '</strong><span>' +
              esc(campaign.segment) +
              ' · ' +
              esc(shortDate(campaign.created_at)) +
              '</span></div>' +
              statusBadge(campaign.status) +
              '</div><div class="progress"><div class="progress-bar" style="width:' +
              pct.toFixed(1) +
              '%"></div></div><div class="campaign-stats"><span class="stat">Sent <strong>' +
              fmtInt(campaign.sent_count) +
              '</strong></span><span class="stat">Delivered <strong>' +
              fmtInt(campaign.delivered_count) +
              '</strong></span><span class="stat">Read <strong>' +
              fmtInt(campaign.read_count) +
              '</strong></span><span class="stat">Replied <strong>' +
              fmtInt(campaign.replied_count) +
              '</strong></span></div></div>'
            );
          })
          .join('')
      : emptyState('\uD83D\uDCE3', 'No campaigns yet', 'Launch your first segmented WhatsApp broadcast from the marketing studio.', '<button class="btn btn-sm btn-primary" type="button" data-quick="marketing">Open studio</button>');

    var priority = (threads.threads || [])
      .filter(function (row) {
        return num(row.unread) > 0;
      })
      .slice(0, 5);
    if (!priority.length) priority = (threads.threads || []).slice(0, 5);

    var threadRows = priority.length
      ? priority
          .map(function (row) {
            var contact = row.contact;
            var last = row.last_message;
            return (
              '<button class="thread" type="button" data-open-thread="' +
              num(contact.id) +
              '"><span class="thread-avatar">' +
              esc(initials(contact.client_name)) +
              '</span><span class="thread-main"><span class="thread-row"><span class="thread-name">' +
              esc(contact.client_name) +
              '</span>' +
              (num(row.unread) ? '<span class="unread-badge">' + fmtInt(row.unread) + '</span>' : '') +
              '</span><span class="thread-preview">' +
              esc(last ? last.body : 'No messages yet') +
              '</span><span class="thread-meta">' +
              sectorBadge(contact.sector) +
              '<span class="thread-time mono">' +
              esc(last ? clockTime(last.created_at) : '') +
              '</span></span></span></button>'
            );
          })
          .join('')
      : emptyState('\uD83D\uDCAC', 'Inbox is clear', 'No client threads yet — import contacts or simulate an inbound message.', '<button class="btn btn-sm btn-primary" type="button" data-quick="inbox">Open inbox</button>');

    view.innerHTML =
      kpis +
      quick +
      '<div class="chart-grid">' +
      sectorChart +
      funnelChart +
      '</div>' +
      '<div class="chart-grid">' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Latest bulk campaigns</h2><p>Live send, delivery and read counters</p></div><button class="btn btn-sm" type="button" data-quick="marketing">Studio</button></div><div class="card-body is-flush">' +
      campaignList +
      '</div></div>' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Threads needing a human</h2><p>Unread client messages sorted by recency</p></div><button class="btn btn-sm" type="button" data-quick="inbox">Inbox</button></div><div class="card-body is-flush">' +
      threadRows +
      '</div></div>' +
      '</div>' +
      '<div class="note-strip" style="margin-top:4px">\uD83D\uDD12 <span><strong>In-house only.</strong> HNI clients never sign in to this command center — every action here is performed by Admins, CAs and Relationship Managers, and logged server-side.</span>' +
      (mode && mode.whatsapp_mode ? '<span class="mono" style="margin-left:auto">' + esc(mode.whatsapp_mode) + '</span>' : '') +
      '</div>';

    var sectorValues = sectors.map(function (row) {
      return num(row.pipeline_lakhs);
    });
    mountChart(
      'ovSector',
      'ovSectorFallback',
      {
        type: 'doughnut',
        data: {
          labels: sectors.map(function (row) {
            return row.sector;
          }),
          datasets: [
            {
              data: sectorValues,
              backgroundColor: sectors.map(function (row, index) {
                return CHART_RAMP[index % CHART_RAMP.length];
              }),
              borderColor: '#ffffff',
              borderWidth: 2,
              hoverOffset: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  var row = sectors[context.dataIndex] || {};
                  return ' ' + context.label + ': ' + fmtLakhs(context.parsed) + ' · ' + fmtInt(row.count) + ' clients';
                }
              }
            }
          }
        }
      },
      fallbackBars(
        sectors.map(function (row, index) {
          return {
            label: row.sector,
            value: row.pipeline_lakhs,
            display: fmtLakhs(row.pipeline_lakhs),
            color: CHART_RAMP[index % CHART_RAMP.length]
          };
        })
      )
    );

    var stages = [
      { label: 'Targeted', value: funnel.targeted },
      { label: 'Sent', value: funnel.sent },
      { label: 'Delivered', value: funnel.delivered },
      { label: 'Read', value: funnel.read },
      { label: 'Replied', value: funnel.replied }
    ];

    mountChart(
      'ovFunnel',
      'ovFunnelFallback',
      {
        type: 'bar',
        data: {
          labels: stages.map(function (stage) {
            return stage.label;
          }),
          datasets: [
            {
              data: stages.map(function (stage) {
                return num(stage.value);
              }),
              backgroundColor: ['#191a47', '#3b3d7a', '#f26722', '#f78a52', '#0f9d6e'],
              borderRadius: 6,
              barThickness: 20
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return ' ' + fmtInt(context.parsed.x) + ' messages';
                }
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: '#eef2f7' },
              border: { display: false },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#334155', font: { size: 11, weight: '600' } }
            }
          }
        }
      },
      fallbackBars(
        stages.map(function (stage) {
          return { label: stage.label, value: stage.value, display: fmtInt(stage.value) };
        })
      )
    );

    $$('[data-quick]', view).forEach(function (button) {
      button.addEventListener('click', function () {
        var simulated = button.getAttribute('data-simulate');
        if (simulated) state.inbox.pendingSimulate = simulated;
        window.location.hash = '#/' + button.getAttribute('data-quick');
      });
    });
    $$('[data-open-thread]', view).forEach(function (button) {
      button.addEventListener('click', function () {
        state.inbox.pendingContact = Number(button.getAttribute('data-open-thread'));
        window.location.hash = '#/inbox';
      });
    });
  }

  /* -------------------------------------------------------------------- inbox */

  function chatSkeleton() {
    return (
      '<div class="sk-chat" style="padding:18px 20px">' +
      '<div class="sk-bubble is-in"></div><div class="sk-bubble is-out is-short"></div>' +
      '<div class="sk-bubble is-mid"></div><div class="sk-bubble is-out"></div>' +
      '<div class="sk-bubble is-in is-short"></div></div>'
    );
  }

  function bubbleHTML(message, index, previous) {
    var out = String(message.direction) === 'OUTBOUND';
    var stamp = clockTime(message.created_at);
    var day = String(message.created_at || '').slice(0, 10);
    var previousDay = previous ? String(previous.created_at || '').slice(0, 10) : '';
    var divider = day !== previousDay ? '<div class="day-divider">' + esc(longDate(message.created_at)) + '</div>' : '';
    var tag = '';
    if (message.message_type === 'TEMPLATE') tag = '<span class="bubble-tag">Template</span>';
    else if (message.message_type === 'INTERACTIVE') tag = '<span class="bubble-tag">Menu</span>';
    else if (message.campaign_id) tag = '<span class="bubble-tag">Campaign</span>';
    else if (message.chatbot_flow_id) tag = '<span class="bubble-tag">Chatbot</span>';

    var tick = '';
    if (out) {
      var read = message.status === 'READ' || message.status === 'REPLIED';
      var double = read || message.status === 'DELIVERED';
      tick = '<span class="tick' + (read ? ' is-read' : '') + '">' + (double ? '\u2713\u2713' : '\u2713') + '</span>';
    }
    var meta = '<div class="bubble-meta"><span>' + esc(stamp) + '</span>' + tick + '</div>';
    var body = String(message.body || '')
      .split('\n')
      .map(function (line) {
        return esc(line);
      })
      .join('<br>');

    return (
      divider +
      '<div class="bubble ' +
      (out ? 'bubble-out' : 'bubble-in') +
      '" data-msg="' +
      num(message.id) +
      '">' +
      tag +
      body +
      meta +
      '</div>'
    );
  }

  function dossierHTML(contact, messages, unread) {
    var fields = function (label, value, mono, wide) {
      return (
        '<div class="dossier-field' +
        (wide ? ' is-wide' : '') +
        '"><dt>' +
        esc(label) +
        '</dt><dd class="' +
        (mono ? 'v is-mono' : '') +
        '">' +
        (value || '\u2014') +
        '</dd></div>'
      );
    };

    var tagList = (contact.tag_list || [])
      .map(function (tag) {
        return '<span class="badge badge-neutral">' + esc(tag) + '</span>';
      })
      .join(' ');

    return (
      '<div class="dossier-hero"><div class="dossier-hero-top">' +
      sectorBadge(contact.sector) +
      (contact.opt_in_status ? '<span class="badge badge-green badge-dot">Opted in</span>' : '<span class="badge badge-amber badge-dot">Opted out</span>') +
      '<span class="badge badge-mono">' +
      esc(contact.inquiry_id) +
      '</span></div><h3>' +
      esc(contact.client_name) +
      '</h3><p>' +
      esc(contact.company_name || 'Individual HNI applicant') +
      '</p></div>' +
      '<div class="dossier-group"><div class="dossier-group-label">Contact</div><div class="dossier-grid">' +
      fields('WhatsApp', esc(contact.whatsapp_number), true) +
      fields('Email', esc(contact.email || ''), false) +
      fields('District', esc(contact.district || ''), false) +
      fields('Taluka', esc(contact.taluka || ''), false) +
      '</div></div>' +
      '<div class="dossier-group"><div class="dossier-group-label">Advisory file</div><div class="dossier-grid">' +
      fields('Sector', sectorBadge(contact.sector), false) +
      fields('Category', esc(contact.category || ''), false) +
      fields('Enterprise', esc(contact.enterprise_classification || ''), false) +
      fields('Project', esc(contact.project_type || ''), false) +
      fields('Term loan', esc(contact.term_loan_planned || ''), false) +
      fields('Assigned CA', esc(contact.assigned_ca || 'Unassigned'), false) +
      '</div></div>' +
      '<div class="dossier-group"><div class="dossier-group-label">Subsidy pipeline</div><div class="dossier-grid">' +
      '<div class="dossier-field is-wide"><dt>Estimated subsidy</dt><dd class="is-money">' +
      esc(fmtLakhs(contact.estimated_subsidy_lakhs)) +
      '</dd></div>' +
      fields('Messages', fmtInt(messages.length), true) +
      fields('Unread', fmtInt(unread), true) +
      (tagList ? '<div class="dossier-field is-wide"><dt>Tags</dt><dd><div class="tag-row">' + tagList + '</div></dd></div>' : '') +
      '</div></div>' +
      '<div class="dossier-group"><div class="dossier-group-label">Timeline</div><div class="dossier-grid">' +
      fields('Opened', esc(longDate(contact.created_at)), true, true) +
      (messages.length
        ? fields('Last message', esc(fullStamp(messages[messages.length - 1].created_at)), true, true)
        : fields('Last message', 'No messages yet', false, true)) +
      '</div></div>'
    );
  }

  async function viewInbox(view, started) {
    view.innerHTML = skInbox();

    var results = await Promise.all([api('/api/whatsapp/threads'), api('/api/templates')]);
    await settle(started);

    var threads = results[0].threads || [];
    var unreadTotal = num(results[0].unread_total);
    var templates = results[1].templates || [];
    var activeId = null;
    var activeContact = null;
    var activeTemplateId = null;
    var filter = '';

    var SIM_CHIPS = [
      'What subsidy can a textile unit get?',
      'I am setting up a battery storage plant',
      'Please share the document checklist',
      'Connect me with my CA'
    ];

    view.innerHTML =
      '<div class="inbox" id="inboxRoot">' +
      '<section class="pane pane-threads"><div class="pane-head"><div><h2>Conversations</h2><div class="pane-sub" id="threadCount">' +
      fmtInt(threads.length) +
      ' threads · ' +
      fmtInt(unreadTotal) +
      ' unread</div></div><div class="pane-head-actions"><button class="icon-btn" type="button" id="threadRefresh" title="Refresh threads">\u21BB</button></div></div>' +
      '<div class="pane-search"><input class="input input-search" type="search" id="threadSearch" placeholder="Search client, company or #inquiry" aria-label="Search conversations"></div>' +
      '<div class="thread-list" id="threadList"></div></section>' +

      '<section class="pane pane-chat chat-pane"><div class="chat-head"><button class="chat-back" type="button" id="chatBack" aria-label="Back to conversations">\u2190</button>' +
      '<span class="thread-avatar" id="chatAvatar">\u2014</span>' +
      '<div class="chat-head-text"><strong id="chatName">Select a conversation</strong><span id="chatMeta">Pick a client thread to read the history</span></div>' +
      '<div class="pane-head-actions"><button class="btn btn-sm" type="button" id="printHead">\uD83D\uDDA8 Summary</button></div></div>' +
      '<div class="sim-tray"><div class="sim-tray-head"><strong>\u26A1 Simulate inbound</strong><span>Drop a client message and watch the chatbot reply</span></div>' +
      '<div class="sim-chips">' +
      SIM_CHIPS.map(function (chip) {
        return '<button class="chip" type="button" data-sim-chip="' + esc(chip) + '">' + esc(chip) + '</button>';
      }).join('') +
      '</div><div class="sim-row"><input class="input" type="text" id="simInput" placeholder="e.g. Need subsidy guidance for a pharma expansion" aria-label="Simulated client message"><button class="btn btn-sm btn-dark" type="button" id="simSend">Simulate</button></div></div>' +
      '<div class="chat-stream" id="chatStream"></div>' +
      '<div class="composer"><div class="composer-tools"><div class="template-pop"><button class="btn btn-sm" type="button" id="templateToggle">\uD83D\uDCCB Insert template</button>' +
      '<div class="template-pop-list" id="templateList" hidden>' +
      (templates.length
        ? templates
            .map(function (template) {
              return (
                '<button class="template-option" type="button" data-template="' +
                num(template.id) +
                '"><strong>' +
                esc(template.template_name) +
                '</strong><span>' +
                esc(String(template.category).replace(/_/g, ' ')) +
                ' · ' +
                esc(template.language) +
                '</span></button>'
              );
            })
            .join('')
        : '<div class="empty" style="padding:16px"><p>No templates yet — build one in the marketing studio.</p></div>') +
      '</div></div><span class="field-hint" id="composerHint">Replies are sent from the official WhatsApp Business number.</span></div>' +
      '<div class="composer-row"><textarea id="composerText" placeholder="Type a reply to the client…" rows="1" aria-label="Message body"></textarea><button class="send-btn" type="button" id="sendBtn" title="Send message">\u27A4</button></div></div></section>' +

      '<section class="pane pane-dossier"><div class="pane-head"><div><h2>Client dossier</h2><div class="pane-sub">Internal advisory file</div></div></div>' +
      '<div class="dossier" id="dossier"></div><div class="dossier-foot"><button class="btn btn-sm btn-block" type="button" id="printDossier">\uD83D\uDDA8 Printable client summary</button></div></section>' +
      '</div>';

    var inboxRoot = $('#inboxRoot', view);
    var threadList = $('#threadList', view);
    var stream = $('#chatStream', view);
    var dossier = $('#dossier', view);

    function threadMatches(row) {
      if (!filter) return true;
      var contact = row.contact || {};
      var haystack = [contact.client_name, contact.company_name, contact.inquiry_id, contact.whatsapp_number, contact.sector]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(filter.toLowerCase()) !== -1;
    }

    function renderThreadList() {
      var visible = threads.filter(threadMatches);
      if (!visible.length) {
        threadList.innerHTML = emptyState('\uD83D\uDD0D', filter ? 'No matching conversation' : 'No conversations yet', filter ? 'Try a different client name, company or inquiry number.' : 'Import HNI contacts to open the first thread.');
        return;
      }
      threadList.innerHTML = visible
        .map(function (row) {
          var contact = row.contact;
          var last = row.last_message;
          return (
            '<button class="thread' +
            (num(contact.id) === num(activeId) ? ' is-active' : '') +
            '" type="button" data-thread="' +
            num(contact.id) +
            '"><span class="thread-avatar">' +
            esc(initials(contact.client_name)) +
            '</span><span class="thread-main"><span class="thread-row"><span class="thread-name">' +
            esc(contact.client_name) +
            '</span><span class="thread-time">' +
            esc(last ? (String(last.created_at).slice(0, 10) === todayIst() ? clockTime(last.created_at) : shortDate(last.created_at)) : '') +
            '</span></span><span class="thread-preview">' +
            esc(last ? last.body : 'No messages yet') +
            '</span><span class="thread-meta">' +
            sectorBadge(contact.sector) +
            (num(row.unread) ? '<span class="unread-badge" style="margin-left:auto">' + fmtInt(row.unread) + '</span>' : '') +
            '</span></span></button>'
          );
        })
        .join('');

      $$('[data-thread]', threadList).forEach(function (button) {
        button.addEventListener('click', function () {
          selectThread(Number(button.getAttribute('data-thread')));
        });
      });
    }

    function renderStream() {
      if (!activeContact) {
        stream.innerHTML = emptyState('\uD83D\uDCAC', 'Select a conversation', 'Choose a client thread on the left to read the full WhatsApp history.');
        dossier.innerHTML = '<div class="empty"><span class="glyph">\uD83D\uDDC2</span><strong>No client selected</strong><p>The dossier shows sector, advisory and pipeline data for the active thread.</p></div>';
        return;
      }
      var messages = state.inbox.messages;
      if (!messages.length) {
        stream.innerHTML =
          '<div class="thread-empty"><span class="glyph">\u2709</span><strong>No messages yet</strong><span>Send the first message or simulate an inbound client message above to open this thread.</span></div>';
      } else {
        stream.innerHTML = messages
          .map(function (message, index) {
            return bubbleHTML(message, index, index ? messages[index - 1] : null);
          })
          .join('');
        stream.scrollTop = stream.scrollHeight;
      }
      dossier.innerHTML = dossierHTML(activeContact, messages, num((threads.find(function (row) {
        return num(row.contact.id) === num(activeContact.id);
      }) || { unread: 0 }).unread));
    }

    async function selectThread(contactId, options) {
      options = options || {};
      var row = threads.find(function (item) {
        return num(item.contact.id) === num(contactId);
      });
      if (!row) return;
      activeId = num(contactId);
      activeContact = row.contact;
      activeTemplateId = null;
      if (inboxRoot) inboxRoot.classList.add('is-chatting');
      renderThreadList();

      $('#chatAvatar', view).textContent = initials(activeContact.client_name);
      $('#chatName', view).textContent = activeContact.client_name;
      $('#chatMeta', view).innerHTML =
        sectorBadge(activeContact.sector) +
        '<span class="mono">' +
        esc(activeContact.inquiry_id) +
        '</span><span>' +
        esc(activeContact.whatsapp_number) +
        '</span>';

      if (!options.silent) stream.innerHTML = chatSkeleton();

      var mark = performance.now ? performance.now() : 0;
      var data = await api('/api/whatsapp/messages/' + contactId);
      if (!options.silent) await settle(mark);

      state.inbox.messages = data.messages || [];
      activeContact = data.contact || activeContact;
      renderStream();

      try {
        if (num(row.unread) > 0) {
          await api('/api/whatsapp/threads/' + contactId + '/read', { method: 'POST' });
          row.unread = 0;
          unreadTotal = threads.reduce(function (acc, item) {
            return acc + num(item.unread);
          }, 0);
          var count = $('#threadCount', view);
          if (count) count.textContent = fmtInt(threads.length) + ' threads · ' + fmtInt(unreadTotal) + ' unread';
          var navCount = document.getElementById('navInboxCount');
          if (navCount) {
            navCount.textContent = fmtInt(unreadTotal);
            navCount.hidden = !unreadTotal;
          }
          setLedger('lgThreads', fmtInt(unreadTotal));
          renderThreadList();
          renderStream();
        }
      } catch (error) {
        /* read receipts are best-effort */
      }
    }

    async function reloadThreads(preferredId) {
      var data = await api('/api/whatsapp/threads');
      threads = data.threads || [];
      unreadTotal = num(data.unread_total);
      var count = $('#threadCount', view);
      if (count) count.textContent = fmtInt(threads.length) + ' threads · ' + fmtInt(unreadTotal) + ' unread';
      renderThreadList();
      if (preferredId) {
        await selectThread(preferredId, { silent: true });
      }
      setLedger('lgThreads', fmtInt(unreadTotal));
      return data;
    }

    function appendLocal(message) {
      state.inbox.messages.push(message);
      renderStream();
      renderThreadList();
    }

    /* ---------------------------------------------------------------- simulate */

    async function simulate(text) {
      if (!activeContact) {
        toast('info', 'Pick a conversation', 'Select a client thread before simulating an inbound message.');
        return;
      }
      var body = String(text || '').trim();
      if (!body) {
        toast('info', 'Message required', 'Type a client message or tap one of the sample chips.');
        return;
      }
      var button = $('#simSend', view);
      if (button) button.disabled = true;
      try {
        var result = await api('/api/chatbot/simulate-inbound', {
          method: 'POST',
          body: { message: body, contact_id: num(activeContact.id) }
        });
        appendLocal(result.inbound);
        if (result.reply) appendLocal(result.reply);
        $('#simInput', view).value = '';
        if (result.matched_flow) {
          toast('success', 'Chatbot replied', result.matched_flow.bot_name + ' matched · auto-tags updated.');
        } else {
          toast('info', 'Message stored', 'No chatbot rule matched — a team member should reply manually.');
        }
        if (result.contact) activeContact = result.contact;
        renderStream();
        await reloadThreads(num(activeContact.id));
        refreshLedger();
      } catch (error) {
        apiErrorMessage('Simulation', error);
      } finally {
        if (button) button.disabled = false;
      }
    }

    /* ------------------------------------------------------------------- send */

    async function send() {
      if (!activeContact) {
        toast('info', 'Pick a conversation', 'Select a client thread first.');
        return;
      }
      var field = $('#composerText', view);
      var body = field ? field.value.trim() : '';
      if (!body && !activeTemplateId) {
        toast('info', 'Nothing to send', 'Type a reply or insert an approved template.');
        return;
      }
      var button = $('#sendBtn', view);
      if (button) button.disabled = true;
      try {
        var payload = { contact_id: num(activeContact.id), body: body };
        if (activeTemplateId) payload.template_id = num(activeTemplateId);
        var result = await api('/api/whatsapp/send', { method: 'POST', body: payload });
        appendLocal(result.chat_message);
        if (field) {
          field.value = '';
          field.style.height = '40px';
        }
        activeTemplateId = null;
        $('#composerHint', view).textContent = 'Replies are sent from the official WhatsApp Business number.';
        await reloadThreads(num(activeContact.id));
      } catch (error) {
        apiErrorMessage('Send', error);
      } finally {
        if (button) button.disabled = false;
      }
    }

    /* ------------------------------------------------------------------ wiring */

    renderThreadList();
    renderStream();

    $('#threadSearch', view).addEventListener(
      'input',
      debounce(function () {
        filter = this.value.trim();
        renderThreadList();
      }, 160)
    );

    $('#threadRefresh', view).addEventListener('click', function () {
      reloadThreads(activeId || null).then(function () {
        toast('success', 'Inbox synced', 'Thread list and unread counters refreshed.');
      }, function (error) {
        apiErrorMessage('Refresh', error);
      });
    });

    $('#chatBack', view).addEventListener('click', function () {
      if (inboxRoot) inboxRoot.classList.remove('is-chatting');
    });

    $$('[data-sim-chip]', view).forEach(function (chip) {
      chip.addEventListener('click', function () {
        $('#simInput', view).value = chip.getAttribute('data-sim-chip');
        simulate(chip.getAttribute('data-sim-chip'));
      });
    });

    $('#simSend', view).addEventListener('click', function () {
      simulate($('#simInput', view).value);
    });
    $('#simInput', view).addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        simulate(this.value);
      }
    });

    $('#sendBtn', view).addEventListener('click', send);
    var composer = $('#composerText', view);
    composer.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });
    composer.addEventListener('input', function () {
      this.style.height = '40px';
      this.style.height = Math.min(132, this.scrollHeight) + 'px';
    });

    var templateList = $('#templateList', view);
    $('#templateToggle', view).addEventListener('click', function (event) {
      event.stopPropagation();
      templateList.hidden = !templateList.hidden;
    });
    templateList.addEventListener('click', function (event) {
      var option = event.target.closest('[data-template]');
      if (!option) return;
      event.stopPropagation();
      var templateId = Number(option.getAttribute('data-template'));
      templateList.hidden = true;
      api('/api/templates/' + templateId + '/preview?contact_id=' + num(activeContact.id)).then(
        function (preview) {
          activeTemplateId = templateId;
          composer.value = String(preview.body_text || '');
          composer.focus();
          composer.style.height = Math.min(132, composer.scrollHeight) + 'px';
          $('#composerHint', view).textContent = 'Template ready · press Enter to send the approved message.';
        },
        function (error) {
          apiErrorMessage('Template preview', error);
        }
      );
    });

    $('#printHead', view).addEventListener('click', function () {
      if (!activeContact) {
        toast('info', 'Nothing to print', 'Select a client thread first.');
        return;
      }
      printClientSummary(activeContact);
    });
    $('#printDossier', view).addEventListener('click', function () {
      if (!activeContact) {
        toast('info', 'Nothing to print', 'Select a client thread first.');
        return;
      }
      printClientSummary(activeContact);
    });

    var preferred = state.inbox.pendingContact;
    state.inbox.pendingContact = null;
    var firstId = preferred || (threads[0] && threads[0].contact.id);
    if (firstId) {
      await selectThread(firstId);
    }

    var pendingSim = state.inbox.pendingSimulate;
    state.inbox.pendingSimulate = null;
    if (pendingSim && activeContact) {
      $('#simInput', view).value = pendingSim;
      await simulate(pendingSim);
    }
  }

  /* ----------------------------------------------------------------- contacts */

  function contactForm(contact) {
    contact = contact || {};
    return (
      '<div class="form-row"><div class="field"><label for="cf-name">Client name</label><input class="input" id="cf-name" value="' +
      esc(contact.client_name || '') +
      '" placeholder="e.g. Rakesh Patel" required></div>' +
      '<div class="field"><label for="cf-company">Company</label><input class="input" id="cf-company" value="' +
      esc(contact.company_name || '') +
      '" placeholder="e.g. Shreeji Textiles Pvt Ltd"></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-phone">WhatsApp number</label><input class="input mono-input" id="cf-phone" value="' +
      esc(contact.whatsapp_number || '') +
      '" placeholder="+91 98250 00000" required></div>' +
      '<div class="field"><label for="cf-email">Email</label><input class="input" id="cf-email" type="email" value="' +
      esc(contact.email || '') +
      '" placeholder="client@company.com"></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-sector">Sector</label><select class="select" id="cf-sector"><option value="">Unassigned</option>' +
      optionList(SECTORS, contact.sector) +
      '</select></div>' +
      '<div class="field"><label for="cf-category">Category</label><select class="select" id="cf-category"><option value="">—</option>' +
      optionList(CATEGORIES, contact.category) +
      '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-enterprise">Enterprise class</label><select class="select" id="cf-enterprise"><option value="">—</option>' +
      optionList(ENTERPRISE_CLASSES, contact.enterprise_classification) +
      '</select></div>' +
      '<div class="field"><label for="cf-project">Project type</label><select class="select" id="cf-project">' +
      optionList(PROJECT_TYPES, contact.project_type || 'New') +
      '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-subsidy">Estimated subsidy (₹ Lakhs)</label><input class="input mono-input" id="cf-subsidy" type="number" min="0" step="0.1" value="' +
      num(contact.estimated_subsidy_lakhs) +
      '"></div>' +
      '<div class="field"><label for="cf-loan">Term loan planned</label><select class="select" id="cf-loan">' +
      optionList(['No', 'Yes'], contact.term_loan_planned || 'No') +
      '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-district">District</label><input class="input" id="cf-district" value="' +
      esc(contact.district || '') +
      '" placeholder="e.g. Surat"></div>' +
      '<div class="field"><label for="cf-taluka">Taluka</label><input class="input" id="cf-taluka" value="' +
      esc(contact.taluka || '') +
      '" placeholder="e.g. Olpad"></div></div>' +
      '<div class="form-row"><div class="field"><label for="cf-ca">Assigned CA</label><input class="input" id="cf-ca" value="' +
      esc(contact.assigned_ca || '') +
      '" placeholder="e.g. CA Abhishek Jain"></div>' +
      '<div class="field"><label for="cf-tags">Tags (comma separated)</label><input class="input" id="cf-tags" value="' +
      esc(contact.tags || '') +
      '" placeholder="Textile Lead, Priority"></div></div>' +
      '<label class="switch"><input type="checkbox" id="cf-optin"' +
      (contact.opt_in_status === false ? '' : ' checked') +
      '><span class="switch-track"></span><span class="switch-label">Opted in for WhatsApp broadcasts</span></label>' +
      '<label class="switch"><input type="checkbox" id="cf-welcome"><span class="switch-track"></span><span class="switch-label">Send the welcome template immediately</span></label>'
    );
  }

  function readContactForm(scope) {
    var read = function (id) {
      var node = $('#' + id, scope);
      return node ? node.value.trim() : '';
    };
    var check = function (id) {
      var node = $('#' + id, scope);
      return !!(node && node.checked);
    };
    return {
      client_name: read('cf-name'),
      company_name: read('cf-company'),
      whatsapp_number: read('cf-phone'),
      email: read('cf-email'),
      sector: read('cf-sector'),
      category: read('cf-category'),
      enterprise_classification: read('cf-enterprise'),
      project_type: read('cf-project') || 'New',
      estimated_subsidy_lakhs: num(read('cf-subsidy')),
      term_loan_planned: read('cf-loan') || 'No',
      district: read('cf-district'),
      taluka: read('cf-taluka'),
      assigned_ca: read('cf-ca'),
      tags: read('cf-tags'),
      opt_in_status: check('cf-optin'),
      auto_welcome: check('cf-welcome')
    };
  }

  async function viewContacts(view, started) {
    view.innerHTML =
      '<div class="io-grid">' +
      '<div class="sk-block skeleton-shimmer" style="height:250px"></div>' +
      '<div class="sk-block skeleton-shimmer" style="height:250px"></div>' +
      '</div>' +
      skTable(9);

    var stats = null;
    try {
      stats = await api('/api/contacts/stats');
    } catch (error) {
      stats = null;
    }
    await settle(started);

    state.contacts.offset = 0;

    view.innerHTML =
      '<div class="io-grid">' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Import HNI contacts</h2><p>Mobile-first intake from a phone contact book or a spreadsheet</p></div><span class="badge badge-mono" id="importCount">' +
      fmtInt(stats ? stats.total_contacts : 0) +
      ' on file</span></div><div class="card-body">' +
      '<div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Choose a contact file to import"><span class="dropzone-glyph">\u2B06</span>' +
      '<strong>Drop a contact file here</strong>' +
      '<span>or click to browse — .vcf, .csv or .xlsx</span>' +
      '<span class="mono" id="dropfileName">vCard · CSV · Excel</span>' +
      '<input type="file" id="fileInput" accept=".vcf,.csv,.xlsx" hidden></div>' +
      '<div class="io-actions" style="margin-top:12px"><label class="switch"><input type="checkbox" id="autoWelcome" checked><span class="switch-track"></span><span class="switch-label">Auto-send the welcome template</span></label>' +
      '<span style="flex:1 1 auto"></span><button class="btn btn-sm" type="button" id="sampleCsv">Sample CSV</button><button class="btn btn-sm btn-primary" type="button" id="importBtn" disabled>Import contacts</button></div>' +
      '<div class="import-result" id="importResult"></div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Export &amp; mobile sync</h2><p>Share the book with CAs or drop it back into a phone</p></div></div><div class="card-body">' +
      '<div class="export-list">' +
      '<a class="export-btn is-accent" href="/api/contacts/export?format=csv"><span class="export-glyph">CSV</span><span class="export-text"><strong>Contact book</strong><span>Excel-ready columns</span></span></a>' +
      '<a class="export-btn" href="/api/contacts/export?format=xlsx"><span class="export-glyph">XLS</span><span class="export-text"><strong>Workbook</strong><span>Formatted .xlsx</span></span></a>' +
      '<a class="export-btn" href="/api/contacts/export?format=vcf"><span class="export-glyph">VCF</span><span class="export-text"><strong>Phone sync</strong><span>vCard 3.0</span></span></a>' +
      '<a class="export-btn" href="/api/contacts/sample-template?format=csv"><span class="export-glyph">TPL</span><span class="export-text"><strong>Sample CSV</strong><span>Import template</span></span></a>' +
      '</div>' +
      '<div class="note-strip" style="margin-top:12px">\uD83D\uDCF1 <span>Export the .vcf and open it on any Android or iOS phone to sync every HNI client instantly.</span></div>' +
      (stats
        ? '<div class="chart-ledger" style="border:0;background:transparent;padding:12px 0 0"><div class="chart-ledger-item">Opted in <strong>' +
          fmtInt(stats.opted_in) +
          '</strong></div><div class="chart-ledger-item">Pipeline <strong>' +
          esc(fmtLakhs(stats.pipeline_lakhs)) +
          '</strong></div></div>'
        : '') +
      '</div></div></div>' +

      '<div class="card"><div class="toolbar">' +
      '<input class="input input-search toolbar-search" type="search" id="contactSearch" placeholder="Search name, company, phone, #inquiry or tag" aria-label="Search contacts">' +
      '<select class="select toolbar-select" id="contactSector" aria-label="Filter by sector"><option value="">All sectors</option>' +
      optionList(SECTORS, '') +
      '</select>' +
      '<select class="select toolbar-select" id="contactEnterprise" aria-label="Filter by enterprise class"><option value="">All classes</option>' +
      optionList(ENTERPRISE_CLASSES, '') +
      '</select>' +
      '<span style="flex:1 1 auto"></span>' +
      '<button class="btn btn-sm" type="button" id="contactsRefresh">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="addContact">+ Add HNI client</button>' +
      '</div><div class="table-wrap" id="contactTableWrap"></div>' +
      '<div class="table-foot" id="contactFoot"></div></div>';

    var tableWrap = $('#contactTableWrap', view);
    var foot = $('#contactFoot', view);
    var fileInput = $('#fileInput', view);
    var file = null;

    /* ------------------------------------------------------------ table load */

    async function loadContacts() {
      var startedAt = performance.now ? performance.now() : 0;
      tableWrap.innerHTML = skRows(7, 5);
      foot.innerHTML = '';
      var params = new URLSearchParams();
      params.set('limit', String(state.contacts.limit));
      params.set('offset', String(state.contacts.offset));
      if (state.contacts.query) params.set('q', state.contacts.query);
      if (state.contacts.sector) params.set('sector', state.contacts.sector);
      if (state.contacts.enterprise) params.set('enterprise_classification', state.contacts.enterprise);

      var data = await api('/api/contacts?' + params.toString());
      await settle(startedAt);
      var rows = data.contacts || [];
      state.contacts.rows = rows;
      state.contacts.total = num(data.total);

      if (!rows.length) {
        tableWrap.innerHTML = emptyState('\uD83D\uDDC2', 'No HNI contacts match', 'Clear the filters or import a contact file to get started.', '<button class="btn btn-sm btn-primary" type="button" data-add>+ Add HNI client</button>');
        var addEmpty = $('[data-add]', tableWrap);
        if (addEmpty) addEmpty.addEventListener('click', function () {
          openContactModal(null);
        });
      } else {
        tableWrap.innerHTML =
          '<table class="table"><thead><tr><th>Client</th><th>Sector</th><th>Enterprise</th><th>Project</th><th>Subsidy</th><th>Assigned CA</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
          rows
            .map(function (contact) {
              return (
                '<tr><td><div class="cell-client"><span class="avatar" style="background:#eef1f8;color:var(--navy)">' +
                esc(initials(contact.client_name)) +
                '</span><span class="cell-client-text"><span class="strong">' +
                esc(contact.client_name) +
                '</span><span>' +
                esc(contact.company_name || 'Individual applicant') +
                ' · <span class="mono">' +
                esc(contact.inquiry_id) +
                '</span></span></span></div></td>' +
                '<td>' +
                sectorBadge(contact.sector) +
                '</td>' +
                '<td>' +
                esc(contact.enterprise_classification || '—') +
                '</td>' +
                '<td>' +
                esc(contact.project_type || '—') +
                '<div class="mono" style="font-size:10px;color:var(--ink-4)">' +
                esc(contact.term_loan_planned === 'Yes' ? 'Term loan' : 'No loan') +
                '</div></td>' +
                '<td class="num">' +
                esc(fmtLakhs(contact.estimated_subsidy_lakhs)) +
                '</td>' +
                '<td>' +
                esc(contact.assigned_ca || 'Unassigned') +
                '</td>' +
                '<td><div class="table-actions">' +
                '<button class="icon-btn" type="button" title="Open WhatsApp thread" data-chat="' +
                num(contact.id) +
                '">\uD83D\uDCAC</button>' +
                '<button class="icon-btn" type="button" title="Edit client" data-edit="' +
                num(contact.id) +
                '">\u270E</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete client" data-delete="' +
                num(contact.id) +
                '">\u2715</button>' +
                '</div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>';
      }

      renderFoot();
      wireRows();

      var count = $('#importCount', view);
      if (count) count.textContent = fmtInt(state.contacts.total) + ' on file';
    }

    function renderFoot() {
      var from = state.contacts.total ? state.contacts.offset + 1 : 0;
      var to = Math.min(state.contacts.offset + state.contacts.limit, state.contacts.total);
      foot.innerHTML =
        '<span>Showing <span class="mono">' +
        fmtInt(from) +
        '–' +
        fmtInt(to) +
        '</span> of <span class="mono">' +
        fmtInt(state.contacts.total) +
        '</span> HNI clients</span>' +
        '<span class="pager"><button class="btn btn-sm" type="button" data-page="prev"' +
        (state.contacts.offset <= 0 ? ' disabled' : '') +
        '>\u2190 Prev</button><button class="btn btn-sm" type="button" data-page="next"' +
        (to >= state.contacts.total ? ' disabled' : '') +
        '>Next \u2192</button></span>';

      $$('[data-page]', foot).forEach(function (button) {
        button.addEventListener('click', function () {
          if (button.getAttribute('data-page') === 'next') {
            state.contacts.offset += state.contacts.limit;
          } else {
            state.contacts.offset = Math.max(0, state.contacts.offset - state.contacts.limit);
          }
          loadContacts().catch(function (error) {
            apiErrorMessage('Contacts', error);
          });
        });
      });
    }

    function wireRows() {
      $$('[data-chat]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          state.inbox.pendingContact = Number(button.getAttribute('data-chat'));
          window.location.hash = '#/inbox';
        });
      });
      $$('[data-edit]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var contact = state.contacts.rows.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-edit'));
          });
          openContactModal(contact || null);
        });
      });
      $$('[data-delete]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var contact = state.contacts.rows.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-delete'));
          });
          if (!contact) return;
          confirmAction(
            'Remove HNI client?',
            contact.client_name + ' (' + contact.inquiry_id + ') and every WhatsApp message in this thread will be deleted permanently.',
            'Delete client',
            async function () {
              try {
                await api('/api/contacts/' + contact.id, { method: 'DELETE' });
                toast('success', 'Client removed', contact.client_name + ' is no longer in the contact book.');
                await loadContacts();
                refreshLedger();
              } catch (error) {
                apiErrorMessage('Delete', error);
                throw error;
              }
            },
            true
          );
        });
      });
    }

    /* ---------------------------------------------------------------- create/edit */

    function openContactModal(contact) {
      var isEdit = !!contact;
      var dialog = openModal({
        title: isEdit ? 'Edit HNI client' : 'Add HNI client',
        subtitle: isEdit ? contact.inquiry_id + ' · ' + contact.client_name : 'Manual intake — the inquiry number is generated server-side',
        wide: true,
        body: contactForm(contact),
        footer:
          '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
          '<button class="btn btn-sm btn-primary" type="button" data-save>' +
          (isEdit ? 'Save changes' : 'Create client') +
          '</button>'
      });
      if (!dialog) return;
      $('[data-save]', dialog.root).addEventListener('click', async function () {
        var button = this;
        var payload = readContactForm(dialog.root);
        if (!payload.client_name || !payload.whatsapp_number) {
          toast('error', 'Missing details', 'Client name and WhatsApp number are required.');
          return;
        }
        button.disabled = true;
        try {
          if (isEdit) {
            await api('/api/contacts/' + contact.id, { method: 'PATCH', body: payload });
            toast('success', 'Client updated', payload.client_name + ' saved.');
          } else {
            var created = await api('/api/contacts', { method: 'POST', body: payload });
            toast('success', 'Client created', created.message);
          }
          dialog.close();
          await loadContacts();
          refreshLedger();
        } catch (error) {
          apiErrorMessage('Save', error);
        } finally {
          button.disabled = false;
        }
      });
    }

    /* -------------------------------------------------------------------- import */

    function pickFile(selected) {
      file = selected || null;
      var zone = $('#dropzone', view);
      var label = $('#dropfileName', view);
      var button = $('#importBtn', view);
      if (!zone || !label || !button) return;
      if (file) {
        zone.classList.add('has-file');
        label.textContent = file.name + ' · ' + (file.size / 1024).toFixed(1) + ' KB';
        button.disabled = false;
      } else {
        zone.classList.remove('has-file');
        label.textContent = 'vCard · CSV · Excel';
        button.disabled = true;
      }
    }

    function renderImportResult(result) {
      $('#importResult', view).innerHTML =
        '<div class="credentials-reveal"><div class="cred-row"><span>Imported</span><strong>' +
        fmtInt(result.created) +
        '</strong></div><div class="cred-row"><span>Duplicates</span><strong>' +
        fmtInt(result.duplicates) +
        '</strong></div><div class="cred-row"><span>Invalid</span><strong>' +
        fmtInt(result.invalid) +
        '</strong></div><div class="cred-row"><span>Welcomed</span><strong>' +
        fmtInt(result.welcome_sent) +
        '</strong></div><p class="field-hint" style="margin:4px 0 0">' +
        esc(result.message) +
        '</p></div>';
    }

    var zone = $('#dropzone', view);
    zone.addEventListener('click', function () {
      fileInput.click();
    });
    zone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
      }
    });
    ['dragenter', 'dragover'].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        zone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        zone.classList.remove('is-dragover');
      });
    });
    zone.addEventListener('drop', function (event) {
      var dropped = event.dataTransfer && event.dataTransfer.files ? event.dataTransfer.files[0] : null;
      if (dropped) pickFile(dropped);
    });
    fileInput.addEventListener('change', function () {
      pickFile(this.files && this.files[0]);
    });

    $('#sampleCsv', view).addEventListener('click', function () {
      window.location.href = '/api/contacts/sample-template?format=csv';
    });

    $('#importBtn', view).addEventListener('click', async function () {
      if (!file) return;
      var button = this;
      button.disabled = true;
      button.textContent = 'Importing…';
      var form = new FormData();
      form.append('file', file);
      form.append('auto_welcome', $('#autoWelcome', view).checked ? 'true' : 'false');
      try {
        var result = await api('/api/contacts/import', { method: 'POST', form: form });
        renderImportResult(result);
        toast('success', 'Import complete', result.created + ' contact(s) added.');
        pickFile(null);
        state.contacts.offset = 0;
        await loadContacts();
        refreshLedger();
      } catch (error) {
        apiErrorMessage('Import', error);
      } finally {
        button.textContent = 'Import contacts';
        button.disabled = !file;
      }
    });

    /* ------------------------------------------------------------------ filters */

    $('#contactSearch', view).addEventListener(
      'input',
      debounce(function () {
        state.contacts.query = this.value.trim();
        state.contacts.offset = 0;
        loadContacts().catch(function (error) {
          apiErrorMessage('Contacts', error);
        });
      }, 260)
    );
    $('#contactSector', view).addEventListener('change', function () {
      state.contacts.sector = this.value;
      state.contacts.offset = 0;
      loadContacts().catch(function (error) {
        apiErrorMessage('Contacts', error);
      });
    });
    $('#contactEnterprise', view).addEventListener('change', function () {
      state.contacts.enterprise = this.value;
      state.contacts.offset = 0;
      loadContacts().catch(function (error) {
        apiErrorMessage('Contacts', error);
      });
    });
    $('#contactsRefresh', view).addEventListener('click', function () {
      loadContacts().then(function () {
        toast('success', 'Contact book synced', 'The latest HNI records are on screen.');
      }, function (error) {
        apiErrorMessage('Refresh', error);
      });
    });
    $('#addContact', view).addEventListener('click', function () {
      openContactModal(null);
    });

    await loadContacts();
  }

  /* ---------------------------------------------------------------- marketing */

  function templateCard(template, onUse) {
    var vars = String(template.body_text || '').match(/\{\{\s*[a-z_]+\s*\}\}/gi) || [];
    var unique = vars.filter(function (value, index, list) {
      return list.indexOf(value) === index;
    });
    return (
      '<article class="template-card" data-template-card="' +
      num(template.id) +
      '"><div class="template-card-head"><div class="template-card-title"><strong>' +
      esc(template.template_name) +
      '</strong><div class="meta"><span>' +
      esc(String(template.category).replace(/_/g, ' ')) +
      '</span><span>·</span><span>' +
      esc(template.language) +
      '</span>' +
      (template.is_welcome_default ? '<span class="badge badge-green badge-dot">Welcome default</span>' : '') +
      '</div></div></div>' +
      '<div class="template-bubble">' +
      (template.header_text ? '<strong>' + esc(template.header_text) + '</strong><br>' : '') +
      esc(template.body_text) +
      (template.footer_text ? '<br><span style="font-size:10.5px;opacity:0.7">' + esc(template.footer_text) + '</span>' : '') +
      '</div>' +
      (unique.length
        ? '<div class="template-vars">' +
          unique
            .map(function (value) {
              return '<span class="var-chip">' + esc(value) + '</span>';
            })
            .join('') +
          '</div>'
        : '') +
      '<div class="template-card-foot"><button class="icon-btn is-plain" type="button" title="Set as welcome default" data-welcome="' +
      num(template.id) +
      '">' +
      (template.is_welcome_default ? '\u2605' : '\u2606') +
      '</button><span class="spacer"></span>' +
      '<button class="btn btn-sm" type="button" data-edit-template="' +
      num(template.id) +
      '">Edit</button>' +
      '<button class="btn btn-sm btn-primary" type="button" data-use-template="' +
      num(template.id) +
      '">Use</button>' +
      '<button class="icon-btn is-danger" type="button" title="Delete template" data-delete-template="' +
      num(template.id) +
      '">\u2715</button></div></article>'
    );
  }

  function templateForm(template) {
    template = template || {};
    var variables = ['client_name', 'company_name', 'sector', 'subsidy_amount', 'inquiry_id', 'district', 'taluka', 'project_type', 'assigned_ca'];
    return (
      '<div class="form-row"><div class="field"><label for="tf-name">Template name</label><input class="input" id="tf-name" value="' +
      esc(template.template_name || '') +
      '" placeholder="e.g. Subsidy eligibility alert"></div>' +
      '<div class="field"><label for="tf-category">Category</label><select class="select" id="tf-category">' +
      optionList(TEMPLATE_CATEGORIES, template.category || 'MARKETING') +
      '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="tf-language">Language</label><select class="select" id="tf-language">' +
      optionList(LANGUAGES, template.language || 'en_IN') +
      '</select></div>' +
      '<div class="field"><label for="tf-header">Header (optional)</label><input class="input" id="tf-header" value="' +
      esc(template.header_text || '') +
      '" placeholder="SubsidyX Advisory"></div></div>' +
      '<div class="field"><label for="tf-body">Message body</label><textarea class="textarea" id="tf-body" rows="5" placeholder="Namaste {{client_name}}, your {{sector}} unit may be eligible for {{subsidy_amount}}…">' +
      esc(template.body_text || '') +
      '</textarea><div class="io-actions" style="margin-top:6px">' +
      variables
        .map(function (name) {
          return '<button class="chip is-mono" type="button" data-var="' + esc(name) + '">{{' + esc(name) + '}}</button>';
        })
        .join('') +
      '</div></div>' +
      '<div class="form-row"><div class="field"><label for="tf-footer">Footer</label><input class="input" id="tf-footer" value="' +
      esc(template.footer_text || '') +
      '" placeholder="Reply STOP to opt out"></div>' +
      '<div class="field"><label for="tf-buttons">Buttons JSON (optional)</label><input class="input mono-input" id="tf-buttons" value="' +
      esc(template.buttons_json || '') +
      '" placeholder=\'[{"type":"QUICK_REPLY","text":"Talk to CA"}]\'></div></div>' +
      '<label class="switch"><input type="checkbox" id="tf-welcome"' +
      (template.is_welcome_default ? ' checked' : '') +
      '><span class="switch-track"></span><span class="switch-label">Use as the auto-welcome template for new contacts</span></label>'
    );
  }

  async function viewMarketing(view, started) {
    view.innerHTML = skGrid(6);
    var results = await Promise.all([api('/api/templates'), api('/api/campaigns'), api('/api/contacts/segments')]);
    await settle(started);

    var templates = results[0].templates || [];
    var campaigns = results[1].campaigns || [];
    var funnel = results[1].funnel || { targeted: 0, sent: 0, delivered: 0, read: 0, replied: 0 };
    var segments = results[2].segments || [];

    function renderTemplates() {
      var grid = $('#templateGrid', view);
      if (!grid) return;
      grid.innerHTML = templates.length
        ? templates.map(templateCard).join('')
        : emptyState('\uD83D\uDCDD', 'No templates yet', 'Build your first approved WhatsApp template to unlock bulk campaigns.', '<button class="btn btn-sm btn-primary" type="button" data-new-template>New template</button>');

      var newEmpty = $('[data-new-template]', grid);
      if (newEmpty) newEmpty.addEventListener('click', function () {
        openTemplateModal(null);
      });

      $$('[data-edit-template]', grid).forEach(function (button) {
        button.addEventListener('click', function () {
          openTemplateModal(
            templates.find(function (template) {
              return num(template.id) === Number(button.getAttribute('data-edit-template'));
            }) || null
          );
        });
      });
      $$('[data-use-template]', grid).forEach(function (button) {
        button.addEventListener('click', function () {
          var select = $('#launchTemplate', view);
          select.value = button.getAttribute('data-use-template');
          select.dispatchEvent(new Event('change'));
          if (typeof select.scrollIntoView === 'function') {
            try {
              select.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) {
              /* jsdom / older browsers */
            }
          }
          toast('info', 'Template staged', 'Pick a segment and launch when ready.');
        });
      });
      $$('[data-delete-template]', grid).forEach(function (button) {
        button.addEventListener('click', function () {
          var template = templates.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-delete-template'));
          });
          if (!template) return;
          confirmAction(
            'Delete template?',
            "'" + template.template_name + "' will be removed from the library. Existing sent messages keep their content.",
            'Delete template',
            async function () {
              try {
                await api('/api/templates/' + template.id, { method: 'DELETE' });
                templates = templates.filter(function (row) {
                  return num(row.id) !== num(template.id);
                });
                renderTemplates();
                renderTemplateSelect();
                toast('success', 'Template deleted', template.template_name + ' removed.');
              } catch (error) {
                apiErrorMessage('Delete', error);
                throw error;
              }
            },
            true
          );
        });
      });
      $$('[data-welcome]', grid).forEach(function (button) {
        button.addEventListener('click', async function () {
          try {
            var response = await api('/api/templates/' + button.getAttribute('data-welcome') + '/set-welcome-default', { method: 'POST' });
            templates = templates.map(function (row) {
              row.is_welcome_default = num(row.id) === num(response.template.id);
              return row;
            });
            renderTemplates();
            toast('success', 'Welcome template set', response.message);
          } catch (error) {
            apiErrorMessage('Welcome default', error);
          }
        });
      });
    }

    function renderTemplateSelect() {
      var select = $('#launchTemplate', view);
      if (!select) return;
      var current = select.value;
      select.innerHTML = templates.length
        ? templates
            .map(function (template) {
              return '<option value="' + num(template.id) + '">' + esc(template.template_name) + ' · ' + esc(String(template.category).replace(/_/g, ' ')) + '</option>';
            })
            .join('')
        : '<option value="">No templates — build one first</option>';
      if (current) select.value = current;
    }

    function renderCampaigns() {
      var host = $('#campaignList', view);
      if (!host) return;
      host.innerHTML = campaigns.length
        ? campaigns
            .map(function (campaign) {
              var pct = num(campaign.total_targeted) ? Math.min(100, (num(campaign.sent_count) / num(campaign.total_targeted)) * 100) : 0;
              var deliveredPct = num(campaign.total_targeted) ? Math.min(100, (num(campaign.delivered_count) / num(campaign.total_targeted)) * 100) : 0;
              return (
                '<div class="campaign-row" data-campaign="' +
                num(campaign.id) +
                '"><div class="campaign-top"><div class="campaign-title"><strong>' +
                esc(campaign.campaign_name) +
                '</strong><span>' +
                esc(campaign.segment) +
                ' · ' +
                esc(campaign.template_name) +
                ' · ' +
                esc(shortDate(campaign.created_at)) +
                '</span></div>' +
                statusBadge(campaign.status) +
                '<button class="btn btn-sm" type="button" data-advance="' +
                num(campaign.id) +
                '">Advance delivery</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete campaign" data-drop-campaign="' +
                num(campaign.id) +
                '">\u2715</button></div>' +
                '<div class="progress"><div class="progress-bar" style="width:' +
                pct.toFixed(1) +
                '%"></div></div>' +
                '<div class="progress"><div class="progress-bar is-green" style="width:' +
                deliveredPct.toFixed(1) +
                '%"></div></div>' +
                '<div class="campaign-stats"><span class="stat">Targeted <strong>' +
                fmtInt(campaign.total_targeted) +
                '</strong></span><span class="stat">Sent <strong>' +
                fmtInt(campaign.sent_count) +
                '</strong></span><span class="stat">Delivered <strong>' +
                fmtInt(campaign.delivered_count) +
                '</strong></span><span class="stat">Read <strong>' +
                fmtInt(campaign.read_count) +
                '</strong></span><span class="stat">Replied <strong>' +
                fmtInt(campaign.replied_count) +
                '</strong></span><span class="stat">Delivery <strong>' +
                esc(num(campaign.delivery_rate).toFixed(1)) +
                '%</strong></span></div></div>'
              );
            })
            .join('')
        : emptyState('\uD83D\uDE80', 'No campaigns launched', 'Pick a template and a segment above to send the first broadcast.');

      $$('[data-advance]', host).forEach(function (button) {
        button.addEventListener('click', async function () {
          button.disabled = true;
          try {
            var response = await api('/api/campaigns/' + button.getAttribute('data-advance') + '/advance-delivery', { method: 'POST' });
            campaigns = campaigns.map(function (row) {
              return num(row.id) === num(response.campaign.id) ? response.campaign : row;
            });
            renderCampaigns();
            refreshLedger();
            toast('success', 'Delivery receipts processed', 'Meta webhook simulation advanced this campaign.');
          } catch (error) {
            apiErrorMessage('Advance delivery', error);
            button.disabled = false;
          }
        });
      });
      $$('[data-drop-campaign]', host).forEach(function (button) {
        button.addEventListener('click', function () {
          var campaign = campaigns.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-drop-campaign'));
          });
          if (!campaign) return;
          confirmAction(
            'Delete campaign?',
            "'" + campaign.campaign_name + "' and its delivery counters will be removed. Sent WhatsApp bubbles stay in the client threads.",
            'Delete campaign',
            async function () {
              try {
                await api('/api/campaigns/' + campaign.id, { method: 'DELETE' });
                campaigns = campaigns.filter(function (row) {
                  return num(row.id) !== num(campaign.id);
                });
                renderCampaigns();
                refreshLedger();
                toast('success', 'Campaign deleted', campaign.campaign_name + ' removed.');
              } catch (error) {
                apiErrorMessage('Delete', error);
                throw error;
              }
            },
            true
          );
        });
      });
    }

    function renderPreview(templateId) {
      var bubble = $('#waBubble', view);
      if (!bubble) return;
      var template = templates.find(function (row) {
        return num(row.id) === num(templateId);
      });
      if (!template) {
        bubble.innerHTML = '<div class="preview-empty">Select a template to preview the exact WhatsApp bubble.</div>';
        return;
      }
      bubble.innerHTML = '<span class="skeleton-shimmer" style="display:block;height:56px;border-radius:6px"></span>';
      api('/api/templates/' + template.id + '/preview')
        .then(function (preview) {
          var buttons = preview.buttons || [];
          bubble.innerHTML =
            '<div class="wa-bubble">' +
            (preview.header_text ? '<strong>' + esc(preview.header_text) + '</strong><br>' : '') +
            esc(preview.body_text) +
            (preview.footer_text ? '<br><span style="font-size:9px;opacity:0.7">' + esc(preview.footer_text) + '</span>' : '') +
            (buttons.length
              ? '<span class="wa-btns">' +
                buttons
                  .map(function (button) {
                    return '<span class="wa-btn">' + esc(button.text || button.type) + '</span>';
                  })
                  .join('') +
                '</span>'
              : '') +
            '<span class="wa-time">' +
            esc(clockTime(new Date().toISOString())) +
            ' \u2713\u2713</span></div>';
        })
        .catch(function () {
          bubble.innerHTML = '<div class="preview-empty">Preview unavailable — the template body is still saved.</div>';
        });
    }

    function openTemplateModal(template) {
      var isEdit = !!template;
      var dialog = openModal({
        title: isEdit ? 'Edit WhatsApp template' : 'New WhatsApp template',
        subtitle: 'Approved template copy — variables are filled per client at send time',
        wide: true,
        body: templateForm(template),
        footer:
          '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
          '<button class="btn btn-sm btn-primary" type="button" data-save-template>' +
          (isEdit ? 'Save template' : 'Create template') +
          '</button>'
      });
      if (!dialog) return;

      $$('[data-var]', dialog.root).forEach(function (chip) {
        chip.addEventListener('click', function () {
          var field = $('#tf-body', dialog.root);
          var token = '{{' + chip.getAttribute('data-var') + '}}';
          var start = field.selectionStart || field.value.length;
          field.value = field.value.slice(0, start) + token + field.value.slice(field.selectionEnd || start);
          field.focus();
          field.selectionStart = field.selectionEnd = start + token.length;
        });
      });

      $('[data-save-template]', dialog.root).addEventListener('click', async function () {
        var button = this;
        var payload = {
          template_name: $('#tf-name', dialog.root).value.trim(),
          category: $('#tf-category', dialog.root).value,
          language: $('#tf-language', dialog.root).value,
          header_text: $('#tf-header', dialog.root).value.trim(),
          body_text: $('#tf-body', dialog.root).value.trim(),
          footer_text: $('#tf-footer', dialog.root).value.trim(),
          buttons_json: $('#tf-buttons', dialog.root).value.trim(),
          is_welcome_default: $('#tf-welcome', dialog.root).checked
        };
        if (!payload.template_name || !payload.body_text) {
          toast('error', 'Missing content', 'A template name and message body are required.');
          return;
        }
        button.disabled = true;
        try {
          var response = isEdit
            ? await api('/api/templates/' + template.id, { method: 'PATCH', body: payload })
            : await api('/api/templates', { method: 'POST', body: payload });
          templates = isEdit
            ? templates.map(function (row) {
                return num(row.id) === num(response.template.id) ? response.template : row;
              })
            : templates.concat([response.template]);
          if (payload.is_welcome_default) {
            templates.forEach(function (row) {
              row.is_welcome_default = num(row.id) === num(response.template.id);
            });
          }
          dialog.close();
          renderTemplates();
          renderTemplateSelect();
          toast('success', isEdit ? 'Template updated' : 'Template created', response.template.template_name + ' is ready to send.');
        } catch (error) {
          apiErrorMessage('Template', error);
        } finally {
          button.disabled = false;
        }
      });
    }

    function renderSegments() {
      var select = $('#launchSegment', view);
      if (!select) return;
      select.innerHTML = segments
        .map(function (segment) {
          return '<option value="' + esc(segment.segment) + '">' + esc(segment.label) + ' · ' + fmtInt(segment.count) + '</option>';
        })
        .join('');
      updateTarget();
    }

    function updateTarget() {
      var select = $('#launchSegment', view);
      var target = $('#targetCount', view);
      if (!select || !target) return;
      var chosen = segments.find(function (segment) {
        return segment.segment === select.value;
      });
      target.textContent = fmtInt(chosen ? chosen.count : 0);
      var label = $('#targetLabel', view);
      if (label) label.textContent = chosen ? chosen.label : 'segment';
    }

    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Template library</h2><p>' +
      fmtInt(templates.length) +
      ' approved messages · ' +
      fmtInt(templates.filter(function (row) {
        return row.is_welcome_default;
      }).length) +
      ' set as auto-welcome</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshTemplates">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="newTemplate">+ New template</button></div></div>' +
      '<div class="template-grid" id="templateGrid"></div>' +

      '<div class="section-head" style="margin-top:22px"><div class="section-head-text"><h2>Campaign launcher</h2><p>Segment the book, preview the bubble, launch a WhatsApp broadcast</p></div></div>' +
      '<div class="card"><div class="card-body"><div class="campaign-launcher"><div class="launch-form">' +
      '<div class="form-row"><div class="field"><label for="launchName">Campaign name</label><input class="input" id="launchName" placeholder="e.g. Diwali subsidy eligibility alert"></div>' +
      '<div class="field"><label for="launchTemplate">Template</label><select class="select" id="launchTemplate"></select></div></div>' +
      '<div class="form-row"><div class="field"><label for="launchSegment">Segment</label><select class="select" id="launchSegment"></select></div>' +
      '<div class="field"><label for="launchTag">Extra tag filter (optional)</label><input class="input" id="launchTag" placeholder="e.g. Textile Lead"></div></div>' +
      '<div class="target-pill">\uD83C\uDFAF <span id="targetLabel">segment</span><strong id="targetCount">0</strong> opted-in HNI clients<span class="spacer"></span><span class="mono">est. ' +
      esc(fmtLakhs(funnel.targeted ? funnel.delivered : 0)) +
      ' delivered historically</span></div>' +
      '<div class="io-actions"><button class="btn btn-primary" type="button" id="launchBtn">\uD83D\uDE80 Launch campaign</button>' +
      '<button class="btn btn-sm" type="button" id="saveDraft">Preview only</button>' +
      '<span class="field-hint" style="margin-left:auto">Mock mode simulates Meta delivery; LIVE mode uses the official Cloud API.</span></div>' +
      '</div>' +
      '<div><div class="phone"><div class="phone-notch"></div><div class="phone-screen"><div class="wa-head"><span class="wa-avatar">SX</span>' +
      '<div class="wa-head-text"><strong>SubsidyX Advisory</strong><span>Official business account</span></div></div>' +
      '<div class="wa-body" id="waBubble"></div></div></div></div></div></div></div></div>' +

      '<div class="section-head" style="margin-top:22px"><div class="section-head-text"><h2>Campaign performance</h2><p>Send, delivery, read and reply counters</p></div>' +
      '<div class="section-head-actions"><span class="badge badge-mono">' +
      fmtInt(funnel.targeted) +
      ' targeted · ' +
      fmtInt(funnel.delivered) +
      ' delivered · ' +
      fmtInt(funnel.replied) +
      ' replied</span></div></div>' +
      '<div class="card"><div class="card-body is-flush" id="campaignList"></div></div>';

    renderTemplates();
    renderTemplateSelect();
    renderSegments();
    renderCampaigns();

    var templateSelect = $('#launchTemplate', view);
    templateSelect.addEventListener('change', function () {
      renderPreview(this.value);
    });
    if (templates.length) renderPreview(templates[0].id);

    $('#launchSegment', view).addEventListener('change', updateTarget);

    $('#newTemplate', view).addEventListener('click', function () {
      openTemplateModal(null);
    });
    $('#refreshTemplates', view).addEventListener('click', function () {
      Promise.all([api('/api/templates'), api('/api/contacts/segments'), api('/api/campaigns')]).then(
        function (refreshed) {
          templates = refreshed[0].templates || [];
          segments = refreshed[1].segments || [];
          campaigns = refreshed[2].campaigns || [];
          funnel = refreshed[2].funnel || funnel;
          renderTemplates();
          renderTemplateSelect();
          renderSegments();
          renderCampaigns();
          toast('success', 'Studio synced', 'Templates, segments and campaigns refreshed.');
        },
        function (error) {
          apiErrorMessage('Refresh', error);
        }
      );
    });

    $('#saveDraft', view).addEventListener('click', function () {
      renderPreview($('#launchTemplate', view).value);
      toast('info', 'Preview refreshed', 'Tune the copy until the phone mockup looks right.');
    });

    $('#launchBtn', view).addEventListener('click', async function () {
      var button = this;
      var name = $('#launchName', view).value.trim();
      var templateId = num($('#launchTemplate', view).value);
      var segment = $('#launchSegment', view).value;
      var tag = $('#launchTag', view).value.trim();
      if (!name) {
        toast('error', 'Campaign name required', 'Give the broadcast a recognisable name.');
        return;
      }
      if (!templateId) {
        toast('error', 'Template required', 'Create a template before launching a campaign.');
        return;
      }
      button.disabled = true;
      button.textContent = 'Launching…';
      try {
        var payload = { campaign_name: name, template_id: templateId, segment: segment };
        if (tag) payload.tag = tag;
        var response = await api('/api/campaigns/launch', { method: 'POST', body: payload });
        campaigns = [response.campaign].concat(campaigns);
        renderCampaigns();
        refreshLedger();
        toast('success', 'Campaign launched', response.message);
        $('#launchName', view).value = '';
      } catch (error) {
        apiErrorMessage('Campaign launch', error);
      } finally {
        button.disabled = false;
        button.innerHTML = '\uD83D\uDE80 Launch campaign';
      }
    });
  }

  /* ------------------------------------------------------------------ chatbot */

  function flowCard(flow) {
    var keywords = (flow.keyword_list || [])
      .map(function (word) {
        return '<span class="chip is-mono">' + esc(word) + '</span>';
      })
      .join(' ');
    return (
      '<article class="flow-card' +
      (flow.is_active ? '' : ' is-paused') +
      '"><div class="flow-head"><div class="flow-head-text"><strong>' +
      esc(flow.bot_name) +
      '</strong><div class="meta">' +
      esc(TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type) +
      ' · ' +
      esc(RESPONSE_LABELS[flow.response_type] || flow.response_type) +
      '</div></div><label class="switch" title="Pause or activate this rule"><input type="checkbox" data-toggle="' +
      num(flow.id) +
      '"' +
      (flow.is_active ? ' checked' : '') +
      '><span class="switch-track"></span></label></div>' +
      '<div class="flow-body">' +
      (keywords
        ? '<div class="flow-block"><span class="flow-block-label">Trigger keywords</span><div class="sim-chips" style="margin:0">' + keywords + '</div></div>'
        : '<div class="flow-block"><span class="flow-block-label">Trigger</span><div class="field-hint">' +
          esc(TRIGGER_LABELS[flow.trigger_type] || flow.trigger_type) +
          ' — no keywords needed.</div></div>') +
      '<div class="flow-block"><span class="flow-block-label">Auto reply</span><div class="flow-reply">' +
      esc(flow.response_content || 'Uses an approved WhatsApp template at send time.') +
      '</div></div>' +
      (flow.auto_assign_sector || flow.auto_assign_ca
        ? '<div class="flow-block"><span class="flow-block-label">Auto tagging</span><div class="tag-row">' +
          (flow.auto_assign_sector ? sectorBadge(flow.auto_assign_sector) : '') +
          (flow.auto_assign_ca ? '<span class="badge badge-navy">CA · ' + esc(flow.auto_assign_ca) + '</span>' : '') +
          '</div></div>'
        : '') +
      '</div><div class="flow-foot"><span class="hit-counter">Hits <strong>' +
      fmtInt(flow.hit_count) +
      '</strong></span><span class="spacer"></span>' +
      '<button class="btn btn-sm" type="button" data-edit-flow="' +
      num(flow.id) +
      '">Edit</button>' +
      '<button class="icon-btn is-danger" type="button" title="Delete rule" data-delete-flow="' +
      num(flow.id) +
      '">\u2715</button></div></article>'
    );
  }

  function flowForm(flowData, templates) {
    flowData = flowData || {};
    return (
      '<div class="form-row"><div class="field"><label for="ff-name">Rule name</label><input class="input" id="ff-name" value="' +
      esc(flowData.bot_name || '') +
      '" placeholder="e.g. Textile subsidy eligibility"></div>' +
      '<div class="field"><label for="ff-trigger">Trigger</label><select class="select" id="ff-trigger">' +
      optionList(
        Object.keys(TRIGGER_LABELS).map(function (key) {
          return [key, TRIGGER_LABELS[key]];
        }),
        flowData.trigger_type || 'KEYWORD_MATCH'
      ) +
      '</select></div></div>' +
      '<div class="field"><label for="ff-keywords">Trigger keywords (comma separated)</label><input class="input" id="ff-keywords" value="' +
      esc(flowData.trigger_keywords || '') +
      '" placeholder="textile, cotton, spinning mill"></div>' +
      '<div class="form-row"><div class="field"><label for="ff-response">Response type</label><select class="select" id="ff-response">' +
      optionList(
        Object.keys(RESPONSE_LABELS).map(function (key) {
          return [key, RESPONSE_LABELS[key]];
        }),
        flowData.response_type || 'TEXT'
      ) +
      '</select></div>' +
      '<div class="field"><label for="ff-template">Approved template (for template replies)</label><select class="select" id="ff-template"><option value="">—</option>' +
      templates
        .map(function (template) {
          return '<option value="' + num(template.id) + '"' + (num(flowData.template_id) === num(template.id) ? ' selected' : '') + '>' + esc(template.template_name) + '</option>';
        })
        .join('') +
      '</select></div></div>' +
      '<div class="field"><label for="ff-content">Reply content</label><textarea class="textarea" id="ff-content" rows="4" placeholder="Namaste! Aapke textile unit ke liye subsidy eligibility check kar sakte hain…">' +
      esc(flowData.response_content || '') +
      '</textarea></div>' +
      '<div class="form-row"><div class="field"><label for="ff-sector">Auto-assign sector</label><select class="select" id="ff-sector"><option value="">—</option>' +
      optionList(SECTORS, flowData.auto_assign_sector) +
      '</select></div>' +
      '<div class="field"><label for="ff-ca">Auto-assign CA</label><input class="input" id="ff-ca" value="' +
      esc(flowData.auto_assign_ca || '') +
      '" placeholder="e.g. CA Abhishek Jain"></div></div>' +
      '<label class="switch"><input type="checkbox" id="ff-active"' +
      (flowData.is_active === false ? '' : ' checked') +
      '><span class="switch-track"></span><span class="switch-label">Rule is live and can auto-reply immediately</span></label>'
    );
  }

  async function viewChatbot(view, started) {
    view.innerHTML = skCards('flow-grid', 6);
    var results = await Promise.all([api('/api/chatbot/flows'), api('/api/templates')]);
    await settle(started);

    var flows = results[0].flows || [];
    var summary = { total: num(results[0].total), active: num(results[0].active), hits: num(results[0].total_hits) };
    var templates = results[1].templates || [];

    function renderFlows() {
      var grid = $('#flowGrid', view);
      if (!grid) return;
      grid.innerHTML = flows.length
        ? flows.map(flowCard).join('')
        : emptyState('\uD83E\uDD16', 'No chatbot rules yet', 'Create a rule so inbound WhatsApp messages get an instant, on-brand reply and the lead is tagged automatically.', '<button class="btn btn-sm btn-primary" type="button" data-new-flow>Create first rule</button>');

      var newEmpty = $('[data-new-flow]', grid);
      if (newEmpty) newEmpty.addEventListener('click', function () {
        openFlowModal(null);
      });

      $$('[data-toggle]', grid).forEach(function (input) {
        input.addEventListener('change', async function () {
          var checkbox = this;
          checkbox.disabled = true;
          try {
            var response = await api('/api/chatbot/flows/' + checkbox.getAttribute('data-toggle') + '/toggle', { method: 'POST' });
            flows = flows.map(function (row) {
              return num(row.id) === num(response.flow.id) ? response.flow : row;
            });
            summary.active = flows.filter(function (row) {
              return row.is_active;
            }).length;
            renderFlows();
            renderSummary();
            toast('success', 'Rule updated', response.message);
          } catch (error) {
            checkbox.checked = !checkbox.checked;
            checkbox.disabled = false;
            apiErrorMessage('Toggle', error);
          }
        });
      });

      $$('[data-edit-flow]', grid).forEach(function (button) {
        button.addEventListener('click', function () {
          openFlowModal(
            flows.find(function (row) {
              return num(row.id) === Number(button.getAttribute('data-edit-flow'));
            }) || null
          );
        });
      });

      $$('[data-delete-flow]', grid).forEach(function (button) {
        button.addEventListener('click', function () {
          var flow = flows.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-delete-flow'));
          });
          if (!flow) return;
          confirmAction(
            'Delete chatbot rule?',
            "'" + flow.bot_name + "' will stop replying immediately. Client threads and history stay intact.",
            'Delete rule',
            async function () {
              try {
                await api('/api/chatbot/flows/' + flow.id, { method: 'DELETE' });
                flows = flows.filter(function (row) {
                  return num(row.id) !== num(flow.id);
                });
                summary.total = flows.length;
                summary.active = flows.filter(function (row) {
                  return row.is_active;
                }).length;
                summary.hits = flows.reduce(function (acc, row) {
                  return acc + num(row.hit_count);
                }, 0);
                renderFlows();
                renderSummary();
                toast('success', 'Rule deleted', flow.bot_name + ' removed.');
              } catch (error) {
                apiErrorMessage('Delete', error);
                throw error;
              }
            },
            true
          );
        });
      });
    }

    function renderSummary() {
      var host = $('#flowSummary', view);
      if (!host) return;
      host.innerHTML =
        '<span class="badge badge-navy badge-mono">' +
        fmtInt(summary.total) +
        ' rules</span><span class="badge badge-green badge-dot">' +
        fmtInt(summary.active) +
        ' live</span><span class="badge badge-orange badge-mono">' +
        fmtInt(summary.hits) +
        ' auto-replies</span>';
    }

    function openFlowModal(flowData) {
      var isEdit = !!flowData;
      var dialog = openModal({
        title: isEdit ? 'Edit chatbot rule' : 'Create chatbot rule',
        subtitle: 'Trigger → auto reply → tag the client so the right CA picks it up',
        wide: true,
        body: flowForm(flowData, templates),
        footer:
          '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
          '<button class="btn btn-sm btn-primary" type="button" data-save-flow>' +
          (isEdit ? 'Save rule' : 'Create rule') +
          '</button>'
      });
      if (!dialog) return;

      var templateSelect = $('#ff-template', dialog.root);
      var responseSelect = $('#ff-response', dialog.root);
      var syncResponse = function () {
        templateSelect.disabled = responseSelect.value !== 'TEMPLATE';
      };
      responseSelect.addEventListener('change', syncResponse);
      syncResponse();

      $('[data-save-flow]', dialog.root).addEventListener('click', async function () {
        var button = this;
        var payload = {
          bot_name: $('#ff-name', dialog.root).value.trim(),
          trigger_type: $('#ff-trigger', dialog.root).value,
          trigger_keywords: $('#ff-keywords', dialog.root).value.trim(),
          response_type: $('#ff-response', dialog.root).value,
          response_content: $('#ff-content', dialog.root).value.trim(),
          template_id: num(templateSelect.value) || null,
          auto_assign_sector: $('#ff-sector', dialog.root).value,
          auto_assign_ca: $('#ff-ca', dialog.root).value.trim(),
          is_active: $('#ff-active', dialog.root).checked
        };
        if (!payload.bot_name) {
          toast('error', 'Rule name required', 'Name the rule so the team can recognise it.');
          return;
        }
        button.disabled = true;
        try {
          var response = isEdit
            ? await api('/api/chatbot/flows/' + flowData.id, { method: 'PATCH', body: payload })
            : await api('/api/chatbot/flows', { method: 'POST', body: payload });
          flows = isEdit
            ? flows.map(function (row) {
                return num(row.id) === num(response.flow.id) ? response.flow : row;
              })
            : flows.concat([response.flow]);
          summary.total = flows.length;
          summary.active = flows.filter(function (row) {
            return row.is_active;
          }).length;
          dialog.close();
          renderFlows();
          renderSummary();
          toast('success', isEdit ? 'Rule updated' : 'Rule created', response.message);
        } catch (error) {
          apiErrorMessage('Chatbot rule', error);
        } finally {
          button.disabled = false;
        }
      });
    }

    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Rule library</h2><p>Deterministic, audit-friendly automation — no black-box AI replies</p></div>' +
      '<div class="section-head-actions"><span id="flowSummary" style="display:flex;gap:6px;align-items:center"></span>' +
      '<button class="btn btn-sm btn-primary" type="button" id="newFlow">+ New rule</button></div></div>' +
      '<div class="note-strip" style="margin-bottom:14px">\u26A1 <span><strong>Try it live:</strong> open the Live WhatsApp Inbox, pick a client and hit <em>Simulate inbound</em> — the highest-scoring keyword rule replies instantly and tags the lead.</span></div>' +
      '<div class="flow-grid" id="flowGrid"></div>';

    renderFlows();
    renderSummary();

    $('#newFlow', view).addEventListener('click', function () {
      openFlowModal(null);
    });
  }

  /* ----------------------------------------------------------------- security */

  async function viewSecurity(view, started) {
    view.innerHTML = skKpis(3) + skTable(6);
    var results = await Promise.all([
      api('/api/admin/employees'),
      api('/api/admin/audit-logs?limit=100'),
      api('/api/whatsapp/mode')
    ]);
    await settle(started);

    var employees = results[0].employees || [];
    var logs = results[1].logs || [];
    var mode = results[2];
    var rows = mode.presentation_rows || { contacts: 0, templates: 0, campaigns: 0, chatbot_flows: 0, messages: 0 };
    var isMock = !!mode.is_mock;

    function employeeTable() {
      if (!employees.length) {
        return emptyState('\uD83D\uDC65', 'No employees yet', 'Generate credentials for a relationship executive or CA to give them console access.');
      }
      return (
        '<div class="table-wrap"><table class="table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Status</th><th>Created by</th><th style="text-align:right">Actions</th></tr></thead><tbody>' +
        employees
          .map(function (employee) {
            return (
              '<tr><td><div class="cell-client"><span class="avatar" style="background:#eef1f8;color:var(--navy)">' +
              esc(initials(employee.full_name)) +
              '</span><span class="cell-client-text"><span class="strong">' +
              esc(employee.full_name) +
              '</span><span>' +
              esc(employee.designation || 'Subsidy Relationship Executive') +
              '</span></span></div></td>' +
              '<td class="num">' +
              esc(employee.username) +
              '</td>' +
              '<td>' +
              (employee.is_active ? '<span class="badge badge-green badge-dot">Active</span>' : '<span class="badge badge-red badge-dot">Revoked</span>') +
              '</td><td class="mono" style="font-size:11px">' +
              esc(employee.created_by) +
              '</td><td><div class="table-actions">' +
              '<button class="btn btn-sm" type="button" data-access="' +
              num(employee.id) +
              '">' +
              (employee.is_active ? 'Revoke' : 'Restore') +
              '</button>' +
              '<button class="icon-btn is-danger" type="button" title="Delete employee" data-drop-employee="' +
              num(employee.id) +
              '">\u2715</button></div></td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>'
      );
    }

    function auditTable() {
      if (!logs.length) {
        return emptyState('\uD83D\uDD0E', 'No login attempts logged', 'Every sign-in attempt is recorded here with IP and device details.');
      }
      return (
        '<div class="table-wrap"><table class="table"><thead><tr><th>Timestamp (IST)</th><th>Who</th><th>Role</th><th>Client IP</th><th>Device / User-Agent</th><th>Status</th></tr></thead><tbody>' +
        logs
          .map(function (log) {
            return (
              '<tr><td class="num" style="font-size:11px">' +
              esc(log.timestamp_display) +
              '</td><td><div class="cell-client"><span class="cell-client-text"><span class="strong">' +
              esc(log.full_name || log.username_attempted) +
              '</span><span class="mono">' +
              esc(log.username_attempted) +
              '</span></span></div></td><td>' +
              esc(log.role_detected || '—') +
              '</td><td class="num">' +
              esc(log.ip_address) +
              '</td><td><div class="ua-cell" title="' +
              esc(log.user_agent) +
              '">' +
              esc(log.user_agent || '—') +
              '</div></td><td>' +
              statusBadge(log.status) +
              '</td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>'
      );
    }

    view.innerHTML =
      '<div class="kpi-grid">' +
      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Super Admins</span><span class="kpi-glyph">\uD83D\uDEE1</span></div><div class="kpi-value">3<span class="unit">seeded</span></div><p class="kpi-note"><span class="up">nisarg · gajendra · abhishek</span></p><div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Employees</span><span class="kpi-ledger-value">' +
      fmtInt(employees.length) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Active</span><span class="kpi-ledger-value">' +
      fmtInt(employees.filter(function (row) {
        return row.is_active;
      }).length) +
      '</span></div></div></article>' +
      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Login Audit</span><span class="kpi-glyph">\uD83D\uDCCB</span></div><div class="kpi-value">' +
      fmtInt(logs.length) +
      '<span class="unit">attempts</span></div><p class="kpi-note">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'INVALID_CREDENTIALS';
      }).length) +
      ' invalid · 5 attempts locks the IP for 15 min</p><div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Blocked</span><span class="kpi-ledger-value">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'RATE_LIMITED_BLOCKED';
      }).length) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Locked</span><span class="kpi-ledger-value">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'ACCOUNT_LOCKED';
      }).length) +
      '</span></div></div></article>' +
      '<article class="kpi is-primary"><div class="kpi-top"><span class="kpi-label">WhatsApp Mode</span><span class="kpi-glyph">\uD83D\uDCF6</span></div><div class="kpi-value" style="font-size:20px">' +
      esc(mode.whatsapp_mode) +
      '<span class="unit">mode</span></div><p class="kpi-note">' +
      (isMock ? 'Presentation data seeded · Meta not connected' : 'Official Cloud API connected · <span class="up">100% live</span>') +
      '</p><div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Mock contacts</span><span class="kpi-ledger-value">' +
      fmtInt(rows.contacts) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Mock messages</span><span class="kpi-ledger-value">' +
      fmtInt(rows.messages) +
      '</span></div></div></article>' +
      '</div>' +

      '<div class="vault-grid">' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Employee credentials</h2><p>Admins issue, revoke and delete console access</p></div>' +
      '<button class="btn btn-sm btn-primary" type="button" id="addEmployee">+ Generate credentials</button></div>' +
      '<div class="card-body is-flush" id="employeeTable">' +
      employeeTable() +
      '</div>' +
      (employees.length
        ? ''
        : '<div class="card-foot"><span class="field-hint">Seeded demo login: <span class="mono">emp_rahul</span> / <span class="mono">Rahul@2026</span></span></div>') +
      '</div>' +

      '<div class="card cutover-panel"><div class="card-head"><div class="card-head-text"><h2>Meta WhatsApp API cutover</h2><p>Official Cloud API credentials</p></div>' +
      '<span class="badge ' +
      (isMock ? 'badge-amber' : 'badge-green') +
      ' badge-dot">' +
      esc(mode.whatsapp_mode) +
      '</span></div><div class="card-body">' +
      '<div class="cutover-warning"><span class="glyph">\u26A0</span><span><strong>One-way cutover.</strong> Submitting real Meta credentials permanently purges every row flagged <span class="mono">is_mock = true</span> — ' +
      fmtInt(rows.contacts) +
      ' contacts, ' +
      fmtInt(rows.templates) +
      ' templates, ' +
      fmtInt(rows.campaigns) +
      ' campaigns and ' +
      fmtInt(rows.messages) +
      ' messages.</span></div>' +
      '<div class="field" style="margin-top:12px"><label for="metaPhone">Phone Number ID</label><input class="input mono-input" id="metaPhone" value="' +
      esc(mode.meta.phone_number_id || '') +
      '" placeholder="102938475610293"></div>' +
      '<div class="field" style="margin-top:12px"><label for="metaWaba">WABA ID</label><input class="input mono-input" id="metaWaba" value="' +
      esc(mode.meta.waba_id || '') +
      '" placeholder="109876543210987"></div>' +
      '<div class="field" style="margin-top:12px"><label for="metaToken">Permanent access token</label><div class="secret-row"><input class="input mono-input" id="metaToken" type="password" placeholder="EAAG…" autocomplete="off">' +
      '<button class="icon-btn" type="button" id="revealMeta" title="Show or hide token">\uD83D\uDC41</button></div></div>' +
      '<div class="field" style="margin-top:12px"><label for="metaVerify">Webhook verify token</label><input class="input mono-input" id="metaVerify" value="' +
      esc(mode.meta.verify_token || '') +
      '" placeholder="subsidyx-verify"></div>' +
      '<div class="io-actions" style="margin-top:14px"><button class="btn btn-primary" type="button" id="cutoverBtn">Connect official Meta API</button></div>' +
      '<div class="note-strip" style="margin-top:12px">\uD83E\uDDEA <span><strong>Rehearsal switch.</strong> Purge mock rows and re-seed the Gujarat HNI showcase without touching live data.</span></div>' +
      '<div class="io-actions" style="margin-top:8px"><button class="btn btn-sm btn-danger" type="button" id="resetDemo">Test mock purge / restore demo</button></div>' +
      '</div></div></div>' +

      '<div class="section-head" style="margin-top:6px"><div class="section-head-text"><h2>Login &amp; IP audit trail</h2><p>Every attempt, role detection, client IP and device — newest first</p></div>' +
      '<div class="section-head-actions"><button class="btn btn-sm" type="button" id="refreshAudit">\u21BB Refresh</button></div></div>' +
      '<div class="card"><div class="card-body is-flush" id="auditTable">' +
      auditTable() +
      '</div></div>';

    function wireEmployees() {
      $$('[data-access]', view).forEach(function (button) {
        button.addEventListener('click', async function () {
          button.disabled = true;
          try {
            var response = await api('/api/admin/employees/' + button.getAttribute('data-access') + '/access', { method: 'PATCH' });
            employees = employees.map(function (row) {
              return num(row.id) === num(response.employee.id) ? response.employee : row;
            });
            $('#employeeTable', view).innerHTML = employeeTable();
            wireEmployees();
            toast('success', 'Access updated', response.message);
          } catch (error) {
            button.disabled = false;
            apiErrorMessage('Access', error);
          }
        });
      });
      $$('[data-drop-employee]', view).forEach(function (button) {
        button.addEventListener('click', function () {
          var employee = employees.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-drop-employee'));
          });
          if (!employee) return;
          confirmAction(
            'Revoke employee permanently?',
            employee.full_name + ' (' + employee.username + ') loses console access immediately and the account is deleted.',
            'Revoke & delete',
            async function () {
              try {
                await api('/api/admin/employees/' + employee.id, { method: 'DELETE' });
                employees = employees.filter(function (row) {
                  return num(row.id) !== num(employee.id);
                });
                $('#employeeTable', view).innerHTML = employeeTable();
                wireEmployees();
                toast('success', 'Employee revoked', employee.username + ' deleted.');
              } catch (error) {
                apiErrorMessage('Delete', error);
                throw error;
              }
            },
            true
          );
        });
      });
    }

    wireEmployees();

    $('#addEmployee', view).addEventListener('click', function () {
      var dialog = openModal({
        title: 'Generate employee credentials',
        subtitle: 'The password is shown once — share it securely with the new team member',
        body:
          '<div class="field"><label for="ef-name">Full name</label><input class="input" id="ef-name" placeholder="e.g. Meera Shah"></div>' +
          '<div class="field"><label for="ef-designation">Designation</label><input class="input" id="ef-designation" placeholder="Subsidy Relationship Executive"></div>' +
          '<div class="form-row"><div class="field"><label for="ef-username">Employee ID (optional)</label><input class="input mono-input" id="ef-username" placeholder="auto-generated"></div>' +
          '<div class="field"><label for="ef-password">Password (optional)</label><input class="input mono-input" id="ef-password" placeholder="auto-generated"></div></div>' +
          '<div class="note-strip">\uD83D\uDD10 <span>Leave fields blank and the server generates a unique <span class="mono">emp_*</span> ID with a strong password.</span></div>',
        footer:
          '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
          '<button class="btn btn-sm btn-primary" type="button" data-create-employee>Generate</button>'
      });
      if (!dialog) return;
      $('[data-create-employee]', dialog.root).addEventListener('click', async function () {
        var button = this;
        var payload = {
          full_name: $('#ef-name', dialog.root).value.trim(),
          designation: $('#ef-designation', dialog.root).value.trim() || 'Subsidy Relationship Executive'
        };
        var username = $('#ef-username', dialog.root).value.trim();
        var password = $('#ef-password', dialog.root).value;
        if (username) payload.username = username;
        if (password) payload.password = password;
        if (!payload.full_name) {
          toast('error', 'Name required', 'Enter the employee full name.');
          return;
        }
        button.disabled = true;
        try {
          var response = await api('/api/admin/employees', { method: 'POST', body: payload });
          employees = [response.employee].concat(employees);
          $('#employeeTable', view).innerHTML = employeeTable();
          wireEmployees();
          dialog.close();
          var reveal = openModal({
            title: 'Credentials generated',
            subtitle: 'Copy these now — the password is never shown again',
            body:
              '<div class="credentials-reveal"><div class="cred-row"><span>Employee</span><strong>' +
              esc(response.employee.full_name) +
              '</strong></div><div class="cred-row"><span>ID</span><strong>' +
              esc(response.credentials.username) +
              '</strong></div><div class="cred-row"><span>Password</span><strong>' +
              esc(response.credentials.password) +
              '</strong></div></div>' +
              '<div class="note-strip">\uD83D\uDCF8 <span>The new employee signs in at <span class="mono">/login</span>. Their first login is recorded in the audit trail with IP and device.</span></div>',
            footer: '<span class="spacer"></span><button class="btn btn-sm btn-primary" type="button" data-modal-close>Done</button>'
          });
          if (reveal) {
            $$('[data-modal-close]', reveal.root).forEach(function (node) {
              node.addEventListener('click', function () {
                reveal.close();
              });
            });
          }
          toast('success', 'Employee added', response.message);
        } catch (error) {
          apiErrorMessage('Generate credentials', error);
        } finally {
          button.disabled = false;
        }
      });
    });

    $('#revealMeta', view).addEventListener('click', function () {
      var input = $('#metaToken', view);
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    $('#cutoverBtn', view).addEventListener('click', function () {
      var payload = {
        meta_phone_number_id: $('#metaPhone', view).value.trim(),
        meta_waba_id: $('#metaWaba', view).value.trim(),
        meta_access_token: $('#metaToken', view).value.trim(),
        meta_verify_token: $('#metaVerify', view).value.trim() || null
      };
      if (!payload.meta_phone_number_id || !payload.meta_waba_id || payload.meta_access_token.length < 20) {
        toast('error', 'Credentials incomplete', 'Phone Number ID, WABA ID and a valid access token (20+ chars) are required.');
        return;
      }
      confirmAction(
        'Purge mock data and go LIVE?',
        'This permanently deletes ' +
          fmtInt(rows.contacts) +
          ' mock contacts, ' +
          fmtInt(rows.messages) +
          ' mock messages, ' +
          fmtInt(rows.templates) +
          ' templates, ' +
          fmtInt(rows.campaigns) +
          ' campaigns and ' +
          fmtInt(rows.chatbot_flows) +
          ' chatbot rules, then switches permanently to LIVE mode using the official Meta Cloud API.',
        'Purge & go LIVE',
        async function () {
          try {
            var response = await api('/api/whatsapp/connect-meta-api', { method: 'POST', body: payload });
            toast('success', 'Meta API connected', response.message);
            await refreshLedger();
            renderRoute();
          } catch (error) {
            apiErrorMessage('Cutover', error);
            throw error;
          }
        },
        true
      );
    });

    $('#resetDemo', view).addEventListener('click', function () {
      confirmAction(
        'Restore the presentation showcase?',
        'Every mock row is wiped and the Gujarat HNI demo (contacts, threads, templates, campaigns, chatbot rules) is re-seeded. Real records are untouched.',
        'Restore demo data',
        async function () {
          try {
            var response = await api('/api/whatsapp/reset-demo-mock', { method: 'POST' });
            toast('success', 'Demo restored', response.message);
            await refreshLedger();
            renderRoute();
          } catch (error) {
            apiErrorMessage('Demo restore', error);
            throw error;
          }
        },
        false
      );
    });

    $('#refreshAudit', view).addEventListener('click', async function () {
      var button = this;
      button.disabled = true;
      try {
        var data = await api('/api/admin/audit-logs?limit=100');
        logs = data.logs || [];
        $('#auditTable', view).innerHTML = auditTable();
        toast('success', 'Audit trail refreshed', fmtInt(logs.length) + ' latest login attempts loaded.');
      } catch (error) {
        apiErrorMessage('Audit log', error);
      } finally {
        button.disabled = false;
      }
    });
  }

  /* -------------------------------------------------------------------- start */

  if (window.Chart && window.Chart.defaults) {
    window.Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
    window.Chart.defaults.font.size = 11;
    window.Chart.defaults.color = '#64748b';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
