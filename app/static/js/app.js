/* ============================================================================
   SubsidyX Command Center — in-house WhatsApp operations console
   Vanilla ES2018 · hash router · skeleton-first rendering · Chart.js analytics
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- constants */
  var SVG_ICONS = {
    chart: '<svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    chat: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    users: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    broadcast: '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
    bot: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>',
    shield: '<svg class="icon-svg" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    search: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    mail: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    folder: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    print: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    zap: '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    edit: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    close: '<svg class="icon-svg" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg class="icon-svg" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    warning: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    sparkle: '<svg class="icon-svg" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };

  var MIN_SHIMMER = 350;
  var INR = '\u20B9';

  var SECTORS = ['Textile Industry', 'Information Technology', 'Pharmaceuticals', 'Green Energy'];
  var ENTERPRISE_CLASSES = ['MSME - Small', 'MSME - Medium', 'Large Enterprise', 'Startup'];
  var CATEGORIES = ['Manufacturing', 'Services', 'Trading', 'Agro Processing'];
  var PROJECT_TYPES = ['New', 'Expansion'];
  var TEMPLATE_CATEGORIES = [
    'SUBSIDY_SCHEME_LAUNCH',
    'INDUSTRIAL_POLICY_UPDATE',
    'CA_DOCUMENT_REMINDER',
    'SANCTION_MILESTONE',
    'LEAD_ONBOARDING',
    'EVENT_WEBINAR',
    'SEASONAL_ADVISORY',
    'MARKETING',
    'WELCOME'
  ];
  var CLIENT_LIST_CATEGORIES = [
    ['SECTOR_SEGMENT', 'Sector Segment'],
    ['SUBSIDY_TIER', 'Subsidy Tier'],
    ['GEOGRAPHY', 'Geography'],
    ['LIFECYCLE_STAGE', 'Lifecycle Stage'],
    ['CUSTOM_VIP', 'Custom VIP']
  ];
  var LEAD_PLATFORMS = [
    ['INSTAGRAM', 'Instagram Business'],
    ['FACEBOOK', 'Facebook Lead Ads'],
    ['GOOGLE_FORMS', 'Google Forms Ingestion'],
    ['WHATSAPP', 'WhatsApp Direct'],
    ['MANUAL_ENTRY', 'Direct Intake']
  ];
  var LEAD_STAGES = [
    ['NEW', 'New Inbound Lead'],
    ['CONTACTED', 'Initial Outreach Made'],
    ['QUALIFIED', 'Subsidy Qualified'],
    ['DOCUMENTS_COLLECTED', 'Documents Collected'],
    ['CONVERTED', 'Converted to Client'],
    ['ARCHIVED', 'Archived / Ineligible']
  ];
  var LEAD_PRIORITIES = [
    ['HIGH', 'High Priority'],
    ['MEDIUM', 'Standard Priority'],
    ['LOW', 'Low Priority']
  ];
  var CAMPAIGN_CATEGORIES = [
    ['SUBSIDY_SCHEME_LAUNCH', 'Subsidy Scheme Launch'],
    ['INDUSTRIAL_POLICY_UPDATE', 'Industrial Policy Update'],
    ['CA_DOCUMENT_REMINDER', 'CA Document Reminder'],
    ['SANCTION_MILESTONE', 'Sanction Milestone'],
    ['LEAD_ONBOARDING', 'Lead Onboarding'],
    ['EVENT_WEBINAR', 'Event & Webinar'],
    ['SEASONAL_ADVISORY', 'Seasonal Advisory'],
    ['MARKETING', 'General Marketing'],
    ['WELCOME', 'Welcome & Onboarding']
  ];
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

  var CHART_INK = '#1D1C41';
  var CHART_ORANGE = '#F86030';
  var CHART_STEELBLUE = '#4080E0';
  var CHART_RAMP = ['#F86030', '#1D1C41', '#4080E0', '#198754', '#ED762F', '#055160', '#757786'];

  var ROUTES = {
    overview: { title: 'Executive Overview', eyebrow: 'Command center · IST', flush: false },
    inbox: { title: 'Live WhatsApp Inbox', eyebrow: 'Client conversations · human + bot', flush: true },
    contacts: { title: 'HNI Contact Hub', eyebrow: 'Import · segment · export', flush: false },
    'ca-network': { title: 'CA & Associates Network', eyebrow: 'Chartered Accountants & Partners · referrals', flush: false },
    'client-lists': { title: 'Client Lists', eyebrow: 'Audience categorization · segmentation', flush: false },
    leads: { title: 'Omnichannel Lead CRM', eyebrow: 'Instagram · Facebook · Google Forms', flush: false },
    campaigns: { title: 'Campaigns & Scheduler', eyebrow: 'Bulk & scheduled WhatsApp marketing', flush: false },
    marketing: { title: 'Campaigns & Scheduler', eyebrow: 'Bulk & scheduled WhatsApp marketing', flush: false },
    channels: { title: 'Ad & Form Channels', eyebrow: 'Instagram · Facebook · Google Forms', flush: false },
    integrations: { title: 'Ad & Form Channels', eyebrow: 'Instagram · Facebook · Google Forms', flush: false },
    chatbot: { title: 'Custom Chatbot Builder', eyebrow: 'Rules · triggers · auto-tagging', flush: false },
    admin: { title: 'Admin & Security Vault', eyebrow: 'Super Admin only', flush: false },
    security: { title: 'Admin & Security Vault', eyebrow: 'Super Admin only', flush: false }
  };

  var state = {
    user: null,
    isAdmin: false,
    route: '',
    inbox: { threads: [], activeId: null, messages: [], templates: [], filter: '', pendingContact: null, pendingSimulate: null },
    contacts: { rows: [], total: 0, offset: 0, limit: 10, query: '', sector: '', enterprise: '', tier: '' },
    caNetwork: { rows: [], total: 0, page: 1, pageSize: 10, search: '' },
    clientLists: { rows: [], total: 0, page: 1, pageSize: 10, category: '', query: '' },
    leads: { rows: [], total: 0, page: 1, pageSize: 10, platform: '', stage: '', priority: '', query: '', summary: {} },
    integrations: { channels: [], posts: [], postsPage: 1, postsTotal: 0, activeTab: 'INSTAGRAM' },
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

  function formatStackedDateTime(isoString) {
    if (!isoString) return '<span class="muted">—</span>';
    var parsed = parseIso(isoString);
    if (!parsed) {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return '<span class="muted">' + esc(isoString) + '</span>';
      var timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      var dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return (
        '<div class="sx-datetime-stack">' +
        '<span class="sx-time-top">' + esc(timeStr) + '</span>' +
        '<span class="sx-date-bottom">' + esc(dateStr) + '</span>' +
        '</div>'
      );
    }
    var suffix = parsed.hour < 12 ? 'AM' : 'PM';
    var hour12 = parsed.hour % 12 || 12;
    var t = pad2(hour12) + ':' + pad2(parsed.minute) + ' ' + suffix;
    var dt = parsed.day + ' ' + MONTHS[parsed.month - 1] + ' ' + parsed.year;
    return (
      '<div class="sx-datetime-stack">' +
      '<span class="sx-time-top">' + esc(t) + '</span>' +
      '<span class="sx-date-bottom">' + esc(dt) + '</span>' +
      '</div>'
    );
  }

  function renderPaginationFooter(page, pageSize, total, actionAttr) {
    if (!total) return '';
    actionAttr = actionAttr || 'data-page';
    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    var start = (page - 1) * pageSize + 1;
    var end = Math.min(total, page * pageSize);

    var btns = '';
    btns += '<button class="sx-page-btn" type="button"' + (page <= 1 ? ' disabled' : '') + ' ' + actionAttr + '="' + (page - 1) + '" aria-label="Previous Page">Prev</button>';
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        btns += '<button class="sx-page-btn' + (i === page ? ' is-active' : '') + '" type="button" ' + actionAttr + '="' + i + '">' + i + '</button>';
      } else if (i === page - 2 || i === page + 2) {
        btns += '<span style="padding:0 4px;color:#757786;">…</span>';
      }
    }
    btns += '<button class="sx-page-btn" type="button"' + (page >= totalPages ? ' disabled' : '') + ' ' + actionAttr + '="' + (page + 1) + '" aria-label="Next Page">Next</button>';

    return (
      '<div class="sx-pagination-bar">' +
      '<div class="sx-pagination-info">Showing ' + fmtInt(start) + '–' + fmtInt(end) + ' of ' + fmtInt(total) + ' records</div>' +
      '<div class="sx-pagination-controls">' + btns + '</div>' +
      '</div>'
    );
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

  function tierBadge(tier) {
    if (!tier) return '<span style="color:#757786;font-size:11px;">—</span>';
    var t = String(tier).toUpperCase();
    if (t === 'PLATINUM') return '<span class="badge badge-tier-platinum" style="font-weight:700;">PLATINUM</span>';
    if (t === 'GOLD') return '<span class="badge badge-tier-gold" style="font-weight:700;">GOLD</span>';
    if (t === 'SILVER') return '<span class="badge badge-tier-silver" style="font-weight:700;">SILVER</span>';
    return '<span class="badge badge-neutral">' + esc(tier) + '</span>';
  }

  /* ---------------------------------------------------------------------- api */

  var _clientCache = {};

  function getClientCache(key) {
    if (_clientCache[key] && Date.now() < _clientCache[key].exp) {
      return _clientCache[key].data;
    }
    try {
      var raw = sessionStorage.getItem('sx_c_' + key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Date.now() < parsed.exp) {
          _clientCache[key] = parsed;
          return parsed.data;
        }
      }
    } catch (e) {}
    return null;
  }

  function setClientCache(key, data, ttlMs) {
    var item = { exp: Date.now() + (ttlMs || 25000), data: data };
    _clientCache[key] = item;
    try {
      sessionStorage.setItem('sx_c_' + key, JSON.stringify(item));
    } catch (e) {}
  }

  function invalidateClientCache() {
    _clientCache = {};
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('sx_c_') === 0) sessionStorage.removeItem(k);
      }
    } catch (e) {}
  }

  function api(path, options) {
    options = options || {};
    var method = options.method || 'GET';
    if (method !== 'GET') {
      invalidateClientCache();
    } else if (!options.noCache) {
      var cached = getClientCache(path);
      if (cached !== null) {
        // Fire background revalidation
        fetch(path, { method: 'GET', credentials: 'same-origin' })
          .then(function (r) { if (r.ok) return r.json(); })
          .then(function (fresh) { if (fresh) setClientCache(path, fresh); })
          .catch(function () {});
        return Promise.resolve(cached);
      }
    }

    var request = {
      method: method,
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
        if (method === 'GET' && !options.noCache && payload) {
          setClientCache(path, payload);
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
    var glyphs = { success: SVG_ICONS.check, error: SVG_ICONS.warning, info: SVG_ICONS.info };
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

    var footerHtml = config.footer || config.footerHtml || '';
    if (!footerHtml && config.actionText) {
      footerHtml =
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-modal-action>' +
        esc(config.actionText) +
        '</button>';
    }

    var bodyHtml = config.body !== undefined ? config.body : (config.bodyHtml || '');

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
      '</div><button class="icon-btn is-plain" type="button" data-modal-close aria-label="Close" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button></div>' +
      '<div class="modal-body">' +
      bodyHtml +
      '</div>' +
      (footerHtml ? '<div class="modal-foot">' + footerHtml + '</div>' : '') +
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

    if (config.onAction) {
      var actionBtn = $('[data-modal-action]', root);
      if (actionBtn) {
        actionBtn.addEventListener('click', function () {
          var btn = this;
          btn.disabled = true;
          Promise.resolve(config.onAction(root, close)).finally(function () {
            btn.disabled = false;
          });
        });
      }
    }

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

  function printClientDossier(contact, messages) {
    var root = document.getElementById('printRoot');
    if (!root) return;
    messages = messages || (state.inbox && state.inbox.messages) || [];

    var d = new Date();
    var timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    var dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    var specs = [
      ['Inquiry ID', contact.inquiry_id],
      ['Company Name', contact.company_name || 'Individual Applicant'],
      ['Promoter Name', contact.client_name],
      ['WhatsApp Number', contact.whatsapp_number],
      ['Email Address', contact.email || '—'],
      ['Location', [contact.taluka, contact.district, contact.state].filter(Boolean).join(', ') || 'Gujarat'],
      ['Sector & Category', (contact.sector || 'Unassigned') + ' · ' + (contact.category || 'General')],
      ['Enterprise Class', contact.enterprise_classification || '—'],
      ['Project Type & Loan', (contact.project_type || 'New') + ' · ' + (contact.term_loan_planned === 'Yes' ? 'Term Loan Planned' : 'No Loan')],
      ['Estimated Subsidy', fmtLakhs(contact.estimated_subsidy_lakhs)],
      ['Assigned Advisor', contact.assigned_ca || 'Unassigned'],
      ['Consent / Opt-in', contact.opt_in_status ? 'Verified Opted-In' : 'Opted-Out']
    ];

    var specRows = '';
    for (var i = 0; i < specs.length; i += 2) {
      var item1 = specs[i];
      var item2 = specs[i + 1];
      specRows +=
        '<tr>' +
        '<td class="sx-spec-key" style="background:#F8FAFC;font-weight:600;padding:8px 12px;border:1px solid #E2E8F0;">' + esc(item1[0]) + '</td>' +
        '<td class="sx-spec-val" style="padding:8px 12px;border:1px solid #E2E8F0;">' + esc(item1[1]) + '</td>' +
        (item2
          ? '<td class="sx-spec-key" style="background:#F8FAFC;font-weight:600;padding:8px 12px;border:1px solid #E2E8F0;">' + esc(item2[0]) + '</td>' +
            '<td class="sx-spec-val" style="padding:8px 12px;border:1px solid #E2E8F0;">' + esc(item2[1]) + '</td>'
          : '<td colspan="2" style="border:1px solid #E2E8F0;"></td>') +
        '</tr>';
    }

    var transcriptRows = '';
    var recentMsgs = messages.slice(-10);
    if (recentMsgs.length) {
      transcriptRows =
        '<table class="sx-data-table" style="width:100%;border-collapse:collapse;margin-top:10px;border:1px solid #E2E8F0;">' +
        '<thead><tr style="background:#F8FAFC;"><th style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">Direction</th><th style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">Sender / Type</th><th style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">Message Content</th><th style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">Timestamp (IST)</th></tr></thead>' +
        '<tbody>' +
        recentMsgs
          .map(function (m) {
            return (
              '<tr>' +
              '<td style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">' + esc(m.direction || 'OUTBOUND') + '</td>' +
              '<td style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11px;">' + esc(m.sender || m.sent_by || 'SubsidyX') + '</td>' +
              '<td style="padding:8px 12px;border:1px solid #E2E8F0;font-size:11.5px;">' + esc(m.body || '') + '</td>' +
              '<td style="padding:8px 12px;border:1px solid #E2E8F0;">' + formatStackedDateTime(m.created_at) + '</td>' +
              '</tr>'
            );
          })
          .join('') +
        '</tbody></table>';
    } else {
      transcriptRows = '<p style="font-size:12px;color:#757786;font-style:italic;margin:8px 0;">No prior WhatsApp messages recorded for this contact.</p>';
    }

    root.innerHTML =
      '<div class="print-sheet" style="font-family:Inter,sans-serif;padding:24px;color:#161719;">' +
      '  <div class="print-banner" style="background:#1D1C41;color:#FFFFFF;padding:18px 24px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">' +
      '    <div class="print-banner-logo" style="display:flex;align-items:center;gap:12px;">' +
      '      <img src="/static/img/logo-mark.png" alt="SubsidyX" style="height:36px;width:auto;">' +
      '      <div>' +
      '        <div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.02em;">Subsidy<span style="color:#F86030;">X</span></div>' +
      '        <div class="print-motto" style="font-size:12px;font-weight:500;color:#BACBE6;margin-top:2px;">One-Stop Subsidy Market Place — Confidential HNI Client Dossier</div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="print-meta-box" style="text-align:right;">' +
      '      <div class="print-inquiry-num" style="font-family:\'JetBrains Mono\',monospace;font-size:18px;font-weight:700;color:#F86030;">' + esc(contact.inquiry_id) + '</div>' +
      '      <div style="font-size:11px;color:#BACBE6;margin-top:4px;">Gujarat Industrial Subsidy Dossier</div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="print-section-title" style="font-size:13px;font-weight:700;color:#1D1C41;text-transform:uppercase;letter-spacing:0.05em;margin:16px 0 8px;border-bottom:2px solid #1D1C41;padding-bottom:4px;">Client &amp; Subsidy Specifications</div>' +
      '  <table class="sx-spec-table" style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #E2E8F0;">' +
      '    <tbody>' + specRows + '</tbody>' +
      '  </table>' +
      '  <div class="print-section-title" style="font-size:13px;font-weight:700;color:#1D1C41;text-transform:uppercase;letter-spacing:0.05em;margin:20px 0 8px;border-bottom:2px solid #1D1C41;padding-bottom:4px;">Recent WhatsApp Audit Transcript</div>' +
      transcriptRows +
      '  <div class="print-footer" style="margin-top:28px;padding-top:12px;border-top:1px solid #E2E8F0;text-align:center;font-size:11px;color:#757786;">' +
      '    SubsidyX Internal Operations Console • Strictly Confidential' +
      '  </div>' +
      '</div>';

    window.print();
  }
  var printClientSummary = printClientDossier;

  function openEditProfileModal(targetUser) {
    var user = targetUser || state.user || {};
    var isSelf = !targetUser || (state.user && targetUser.id === state.user.id);
    var phoneDigits = String(user.phone_number || '').replace(/[^0-9]/g, '').slice(-10);
    var currentAvatar = user.avatar_url || '/static/img/logo-mark.png';

    var dialog = openModal({
      title: isSelf ? 'My Profile & Avatar' : 'Edit User Profile & Credentials',
      subtitle: isSelf
        ? 'Update your executive details, gallery avatar upload, WhatsApp picture sync, or credentials.'
        : 'Admin profile management for ' + esc(user.full_name || user.username),
      bodyHtml:
        '<div style="display:flex;flex-direction:column;gap:16px;">' +
        '  <div style="display:flex;align-items:center;gap:16px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;">' +
        '    <img src="' + esc(currentAvatar) + '" id="ep-avatar-preview" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #1D1C41;background:#fff;" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';">' +
        '    <div style="display:flex;flex-direction:column;gap:6px;flex:1 1 auto;">' +
        '      <strong style="font-size:13px;color:#1D1C41;">Profile Picture</strong>' +
        '      <div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        '        <input type="file" id="ep-avatar-file" accept="image/png,image/jpeg,image/webp" style="display:none;">' +
        '        <button class="btn btn-sm btn-primary" type="button" id="btnUploadGallery">Gallery Upload</button>' +
        '        <button class="btn btn-sm" type="button" id="btnSyncWa">Sync WhatsApp</button>' +
        '        <button class="btn btn-sm" type="button" id="btnResetAvatar">Reset to Logo</button>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <form class="form" id="editProfileForm" style="display:flex;flex-direction:column;gap:14px;">' +
        '    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-username">User ID (Username) *</label>' +
        '        <input class="input" id="ep-username" type="text" required value="' + esc(user.username || '') + '" pattern="^[A-Za-z0-9_.-]+$">' +
        '        <span class="field-hint" style="font-size:11px;color:#757786;">Alphanumeric (3–50 chars)</span>' +
        '      </div>' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-fullname">Full Name *</label>' +
        '        <input class="input" id="ep-fullname" type="text" required value="' + esc(user.full_name || '') + '">' +
        '      </div>' +
        '    </div>' +
        '    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-phone">Registered Mobile (+91) *</label>' +
        '        <input class="input mono-input" id="ep-phone" type="tel" inputmode="numeric" maxlength="10" required placeholder="10-digit mobile" value="' + esc(phoneDigits) + '">' +
        '      </div>' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-email">Email Address</label>' +
        '        <input class="input" id="ep-email" type="email" placeholder="staff@subsidyx.internal" value="' + esc(user.email || '') + '">' +
        '      </div>' +
        '    </div>' +
        '    <div class="field">' +
        '      <label class="field-label" for="ep-designation">Designation</label>' +
        '      <input class="input" id="ep-designation" type="text" value="' + esc(user.designation || '') + '">' +
        '    </div>' +
        (isSelf
          ? '    <div class="field">' +
            '      <label class="field-label" for="ep-current-pw">Current Password (only if setting new password)</label>' +
            '      <input class="input" id="ep-current-pw" type="password" placeholder="Verify password if changing password">' +
            '    </div>'
          : '') +
        '    <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-new-pw">New Password (optional)</label>' +
        '        <input class="input" id="ep-new-pw" type="password" placeholder="Leave blank to keep current">' +
        '      </div>' +
        '      <div class="field">' +
        '        <label class="field-label" for="ep-confirm-pw">Confirm New Password</label>' +
        '        <input class="input" id="ep-confirm-pw" type="password" placeholder="Re-type new password">' +
        '      </div>' +
        '    </div>' +
        '    <div id="ep-error" style="display:none;color:#C53030;font-size:12.5px;padding:8px 12px;background:#FFF5F5;border:1px solid #FED7D7;border-radius:6px;"></div>' +
        '  </form>' +
        '</div>',
      actionText: 'Save Profile Changes',
      onAction: async function (dialogRoot, close) {
        var errBox = $('#ep-error', dialogRoot);
        function showErr(msg) {
          errBox.textContent = msg;
          errBox.style.display = 'block';
        }
        var newUsername = $('#ep-username', dialogRoot).value.trim();
        var fullName = $('#ep-fullname', dialogRoot).value.trim();
        var phoneVal = $('#ep-phone', dialogRoot).value.trim();
        var emailVal = $('#ep-email', dialogRoot).value.trim();
        var designation = $('#ep-designation', dialogRoot).value.trim();
        var currentPw = isSelf ? ($('#ep-current-pw', dialogRoot) ? $('#ep-current-pw', dialogRoot).value : '') : '';
        var newPw = $('#ep-new-pw', dialogRoot).value;
        var confirmPw = $('#ep-confirm-pw', dialogRoot).value;

        if (!newUsername || newUsername.length < 3) {
          showErr('User ID must be at least 3 characters.');
          return;
        }
        if (!fullName) {
          showErr('Full name is required.');
          return;
        }
        if (phoneVal.length !== 10 || !/^[6-9]\d{9}$/.test(phoneVal)) {
          showErr('Enter a valid 10-digit Indian mobile number starting with 6-9.');
          return;
        }
        if (newPw && newPw !== confirmPw) {
          showErr('New password and confirm password do not match.');
          return;
        }

        try {
          var result;
          if (isSelf) {
            result = await api('/api/auth/profile', {
              method: 'PUT',
              body: {
                username: newUsername,
                full_name: fullName,
                phone_number: phoneVal,
                email: emailVal || null,
                designation: designation,
                current_password: currentPw || null,
                new_password: newPw || null
              }
            });
            if (result && result.user) {
              state.user = result.user;
              state.isAdmin = result.user.role === 'ADMIN';
              applyUser();
            }
          } else {
            result = await api('/api/admin/employees/' + user.id, {
              method: 'PATCH',
              body: {
                username: newUsername,
                full_name: fullName,
                phone_number: phoneVal,
                email: emailVal || null,
                designation: designation,
                password: newPw || null
              }
            });
          }
          toast('success', 'Profile Saved', 'User ' + newUsername + ' updated successfully.');
          close();
          if (state.route === 'security') renderRoute();
        } catch (err) {
          showErr(err.message || 'Failed to update credentials.');
        }
      }
    });
    if (!dialog) return;

    var previewImg = $('#ep-avatar-preview', dialog.root);
    var fileInput = $('#ep-avatar-file', dialog.root);

    $('#btnUploadGallery', dialog.root).addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
      if (!this.files || !this.files[0]) return;
      var fileObj = this.files[0];
      var formData = new FormData();
      formData.append('file', fileObj);
      try {
        var uploadRes = await api('/api/auth/profile/avatar-upload', { method: 'POST', form: formData });
        if (uploadRes && uploadRes.avatar_url) {
          previewImg.src = uploadRes.avatar_url;
          if (isSelf && state.user) {
            state.user.avatar_url = uploadRes.avatar_url;
            applyUser();
          }
          toast('success', 'Avatar Uploaded', 'Profile picture updated from gallery.');
        }
      } catch (err) {
        apiErrorMessage('Avatar upload', err);
      }
    });

    $('#btnSyncWa', dialog.root).addEventListener('click', async function () {
      try {
        var res = await api('/api/auth/profile/avatar-whatsapp', { method: 'POST' });
        if (res && res.avatar_url) {
          previewImg.src = res.avatar_url;
          if (isSelf && state.user) {
            state.user.avatar_url = res.avatar_url;
            applyUser();
          }
          toast('success', 'WhatsApp Synced', 'Profile avatar synchronized.');
        }
      } catch (err) {
        apiErrorMessage('WhatsApp sync', err);
      }
    });

    $('#btnResetAvatar', dialog.root).addEventListener('click', async function () {
      try {
        await api('/api/auth/profile/avatar', { method: 'DELETE' });
        previewImg.src = '/static/img/logo-mark.png';
        if (isSelf && state.user) {
          state.user.avatar_url = '/static/img/logo-mark.png';
          applyUser();
        }
        toast('success', 'Avatar Reset', 'Profile avatar reset to SubsidyX default.');
      } catch (err) {
        apiErrorMessage('Reset avatar', err);
      }
    });
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
    if (hash === 'marketing') hash = 'campaigns';
    if (hash === 'integrations') hash = 'channels';
    if (hash === 'security') hash = 'admin';
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
    if (route === 'marketing') route = 'campaigns';
    if (route === 'integrations') route = 'channels';
    if (route === 'security') route = 'admin';
    $$('.nav-item').forEach(function (item) {
      var iv = item.getAttribute('data-view') || item.getAttribute('data-section') || item.getAttribute('data-route');
      if (iv === 'marketing') iv = 'campaigns';
      if (iv === 'integrations') iv = 'channels';
      if (iv === 'security') iv = 'admin';
      var match = (iv === route);
      item.classList.toggle('active', match);
      item.classList.toggle('is-active', match);
    });
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('is-open');
    var backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.remove('is-active');
    document.body.classList.remove('sidebar-mobile-open', 'drawer-open');
  }

  function openSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('is-open');
    var backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) backdrop.classList.add('is-active');
    document.body.classList.add('sidebar-mobile-open', 'drawer-open');
    document.body.classList.remove('sidebar-collapsed');
    var shell = document.querySelector('.app-shell');
    if (shell) shell.classList.remove('sidebar-collapsed');
  }

  function toggleSidebar() {
    var shell = document.querySelector('.app-shell');
    var sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 1024) {
      if (sidebar && sidebar.classList.contains('is-open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    } else {
      var isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      if (shell) shell.classList.toggle('sidebar-collapsed', isCollapsed);
    }
  }

  function tickClock() {
    var now = new Date();
    var timeNode = document.getElementById('clockTime');
    var dateNode = document.getElementById('clockDate');
    var legacyNode = document.getElementById('clock');

    var timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(now);

    var dateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(now);

    if (timeNode) timeNode.textContent = timeStr;
    if (dateNode) dateNode.textContent = dateStr;
    if (legacyNode && !timeNode) {
      legacyNode.textContent = timeStr + ' · ' + dateStr;
    }
  }

  function applyUser() {
    var user = state.user || { full_name: 'Executive', role: 'EMPLOYEE', username: 'executive' };
    var avatarImg = document.getElementById('topAvatarImg');
    var sidebarAvatarImg = document.getElementById('sidebarAvatarImg');
    var topUserName = document.getElementById('topUserName');
    var topUserRole = document.getElementById('topUserRole');
    var userName = document.getElementById('userName');
    var userRole = document.getElementById('userRole');
    var dropdownUserFull = document.getElementById('dropdownUserFull');
    var dropdownUserRole = document.getElementById('dropdownUserRole');

    var avatarUrl = user.avatar_url || '/static/img/logo-mark.png';
    if (avatarImg) avatarImg.src = avatarUrl;
    if (sidebarAvatarImg) sidebarAvatarImg.src = avatarUrl;

    var isAdmin = user.role === 'ADMIN';
    var roleLabel = isAdmin ? 'SUPER ADMIN' : (user.designation ? user.designation.toUpperCase() : 'STAFF');
    var roleColor = isAdmin ? '#F86030' : '#9EC5FE';

    if (topUserName) topUserName.textContent = user.full_name || user.username;
    if (topUserRole) {
      topUserRole.textContent = roleLabel;
      topUserRole.style.color = roleColor;
      topUserRole.classList.toggle('is-admin', isAdmin);
    }
    if (userName) userName.textContent = user.full_name || user.username;
    if (userRole) {
      userRole.textContent = isAdmin ? 'Super Admin' : (user.designation || 'Staff');
      userRole.style.color = roleColor;
      userRole.classList.toggle('is-admin', isAdmin);
    }
    if (dropdownUserFull) dropdownUserFull.textContent = user.full_name;
    if (dropdownUserRole) {
      dropdownUserRole.textContent = roleLabel;
      dropdownUserRole.style.color = roleColor;
    }

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
      '<div class="card"><div class="empty"><span class="glyph">' + SVG_ICONS.warning + '</span><strong>' +
      esc(title) +
      '</strong><p>' +
      esc(message) +
      '</p>' +
      (retry ? '<button class="btn btn-sm btn-primary" type="button" data-retry style="margin-top:6px">Retry</button>' : '') +
      '</div></div>'
    );
  }

  function emptyState(glyph, title, message, action) {
    var iconHtml = (glyph && SVG_ICONS[glyph]) ? SVG_ICONS[glyph] : (glyph && String(glyph).indexOf('<svg') !== -1 ? glyph : SVG_ICONS.folder);
    return (
      '<div class="empty"><span class="glyph">' +
      iconHtml +
      '</span><strong>' +
      esc(title) +
      '</strong><p>' +
      esc(message) +
      '</p>' +
      (action || '') +
      '</div>'
    );
  }

  window.switchDashboardModule = function (viewKey, event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (!viewKey) return;

    // Normalize route aliases
    viewKey = String(viewKey).replace(/^#\/?/, '').split('?')[0];
    if (viewKey === 'marketing') viewKey = 'campaigns';
    if (viewKey === 'integrations') viewKey = 'channels';
    if (viewKey === 'security') viewKey = 'admin';
    if (!ROUTES[viewKey]) viewKey = 'overview';

    // Role guard for Super Admin modules
    if ((viewKey === 'admin' || viewKey === 'channels') && !state.isAdmin) {
      toast('error', 'Access denied', 'This module is restricted to Super Admins.');
      viewKey = 'overview';
    }

    state.route = viewKey;
    if (window.location.hash !== '#/' + viewKey) {
      window.location.hash = '#/' + viewKey;
    }

    // 1. Update active state on all sidebar navigation items
    var navItems = document.querySelectorAll('.sidebar [data-view], .sidebar [data-section], .sidebar .nav-item');
    navItems.forEach(function (item) {
      var key = item.getAttribute('data-view') || item.getAttribute('data-section') || item.getAttribute('data-tab') || item.getAttribute('data-route');
      if (key === 'marketing') key = 'campaigns';
      if (key === 'integrations') key = 'channels';
      if (key === 'security') key = 'admin';
      var isMatch = key === viewKey;
      item.classList.toggle('active', isMatch);
      item.classList.toggle('is-active', isMatch);
      if (isMatch) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    // 2. Hide ALL view panels and forcibly show ONLY the target view panel
    var allPanels = document.querySelectorAll('[data-view-panel], .view-panel, .view-section, main > section[id^="view-"], main > div[id^="view-"]');
    var matchedPanel = null;
    allPanels.forEach(function (panel) {
      var panelKey = panel.getAttribute('data-view-panel') || panel.id.replace(/^(view-|section-|panel-)/, '');
      if (panelKey === viewKey) {
        matchedPanel = panel;
        panel.hidden = false;
        panel.classList.remove('hidden', 'd-none');
        panel.classList.add('active', 'is-active');
        panel.style.setProperty('display', 'block', 'important');
      } else {
        panel.hidden = true;
        panel.classList.remove('active', 'is-active');
        panel.classList.add('hidden');
        panel.style.setProperty('display', 'none', 'important');
      }
    });

    // 3. Update Topbar Header Title & Subtitle dynamically
    var activeNav = document.querySelector('.sidebar [data-view="' + viewKey + '"], .sidebar [data-section="' + viewKey + '"]');
    var topTitleEl = document.getElementById('topTitle');
    var topEyebrowEl = document.getElementById('topEyebrow');
    var meta = ROUTES[viewKey] || ROUTES.overview;
    if (topTitleEl && meta) {
      topTitleEl.textContent = meta.title;
    } else if (topTitleEl && activeNav) {
      var labelNode = activeNav.querySelector('.nav-title, strong, span');
      if (labelNode) topTitleEl.textContent = labelNode.textContent.trim();
    }
    if (topEyebrowEl && meta) {
      topEyebrowEl.textContent = meta.eyebrow;
    }
    if (meta) {
      document.title = meta.title + ' · SubsidyX Command Center';
    }

    // 4. Auto-collapse mobile/overlay drawer if open (without breaking desktop clicks)
    document.body.classList.remove('sidebar-mobile-open', 'drawer-open');
    var sidebarEl = document.getElementById('sidebar');
    if (sidebarEl && window.innerWidth <= 1024) sidebarEl.classList.remove('is-open');
    var backdropEl = document.getElementById('drawerBackdrop');
    if (backdropEl && window.innerWidth <= 1024) backdropEl.classList.remove('is-active');

    // 5. Invoke the module's data loader inside an isolated try/catch boundary
    try {
      if (typeof loadModuleData === 'function') {
        loadModuleData(viewKey);
      } else if (typeof activateView === 'function' && activateView !== window.switchDashboardModule) {
        activateView(viewKey);
      }
    } catch (err) {
      console.error('[SubsidyX Router] Error loading data for ' + viewKey + ':', err);
    }
  };

  async function loadModuleData(viewKey) {
    var targetPanel = document.getElementById('view-' + viewKey) || document.querySelector('[data-view-panel="' + viewKey + '"]');
    var host = canvas();
    if (host) host.classList.toggle('is-flush', !!(ROUTES[viewKey] && ROUTES[viewKey].flush));
    var renderHost = targetPanel || viewNode();
    if (!renderHost) return;

    destroyCharts();
    var started = typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
    try {
      if (viewKey === 'inbox') await viewInbox(renderHost, started);
      else if (viewKey === 'contacts') await viewContacts(renderHost, started);
      else if (viewKey === 'ca-network') await viewCaNetwork(renderHost, started);
      else if (viewKey === 'client-lists') await viewClientLists(renderHost, started);
      else if (viewKey === 'leads') await viewLeads(renderHost, started);
      else if (viewKey === 'campaigns') await viewMarketing(renderHost, started);
      else if (viewKey === 'channels') await viewIntegrations(renderHost, started);
      else if (viewKey === 'chatbot') await viewChatbot(renderHost, started);
      else if (viewKey === 'admin') await viewSecurity(renderHost, started);
      else await viewOverview(renderHost, started);

      renderHost.classList.add('view-enter');
      if (host && viewKey !== 'inbox') host.scrollTop = 0;
    } catch (error) {
      console.error('[SubsidyX Router] Error rendering ' + viewKey + ':', error);
      renderHost.innerHTML = errorState('Could not load this module', error.message || 'Unexpected error.', true);
      var retry = $('[data-retry]', renderHost);
      if (retry) {
        retry.addEventListener('click', function () {
          window.switchDashboardModule(viewKey);
        });
      }
      renderHost.classList.add('view-enter');
    }
  }

  window.loadModuleData = loadModuleData;
  window.activateView = loadModuleData;
  window.switchView = window.switchDashboardModule;
  window.state = state;
  window.ROUTES = ROUTES;

  function switchView(targetView, event) {
    return window.switchDashboardModule(targetView, event);
  }

  function renderRoute() {
    return window.switchDashboardModule(currentRoute());
  }

  /* -------------------------------------------------------------------- boot */

  async function boot() {
    tickClock();
    window.setInterval(tickClock, 1000);

    var toggle = document.getElementById('sidebar-toggle') || document.getElementById('navToggle');
    if (toggle) {
      toggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }

    // Bulletproof event delegation on sidebar container
    document.querySelector('.sidebar')?.addEventListener('click', function (e) {
      var navBtn = e.target.closest('[data-view], [data-section]');
      if (!navBtn) return;
      e.preventDefault();
      var targetView = navBtn.getAttribute('data-view') || navBtn.getAttribute('data-section');
      if (targetView) window.switchDashboardModule(targetView, e);
    });

    var topbarBrand = document.querySelector('.topbar-brand');
    if (topbarBrand) {
      topbarBrand.addEventListener('click', function (e) {
        e.preventDefault();
        window.switchDashboardModule('overview', e);
      });
    }

    var backdrop = document.getElementById('drawerBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeSidebar);
    }

    var userMenuTrigger = document.getElementById('userMenuTrigger');
    var userDropdownMenu = document.getElementById('userDropdownMenu');
    if (userMenuTrigger && userDropdownMenu) {
      userMenuTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isHidden = userDropdownMenu.hidden;
        userDropdownMenu.hidden = !isHidden;
        userMenuTrigger.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      });
    }

    var menuEditProfile = document.getElementById('menuEditProfile');
    if (menuEditProfile) {
      menuEditProfile.addEventListener('click', function () {
        if (userDropdownMenu) userDropdownMenu.hidden = true;
        if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
        openEditProfileModal();
      });
    }

    var menuSecurityVault = document.getElementById('menuSecurityVault');
    if (menuSecurityVault) {
      menuSecurityVault.addEventListener('click', function () {
        if (userDropdownMenu) userDropdownMenu.hidden = true;
        if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
        window.location.hash = '#/security';
      });
    }

    var menuSignOut = document.getElementById('menuSignOut');
    if (menuSignOut) {
      menuSignOut.addEventListener('click', function () {
        api('/api/auth/logout', { method: 'POST' }).finally(function () {
          window.location.href = '/login';
        });
      });
    }

    document.addEventListener('pointerdown', function (e) {
      var userMenuWrapper = document.getElementById('userMenuWrapper');
      if (userDropdownMenu && !userDropdownMenu.hidden) {
        if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
          userDropdownMenu.hidden = true;
          if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
        }
      }

      var sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('is-open')) {
        if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
          closeSidebar();
        }
      }

      $$('.template-pop-list').forEach(function (list) {
        if (!e.target.closest('.template-pop')) list.hidden = true;
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (userDropdownMenu) {
          userDropdownMenu.hidden = true;
          if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
        }
        closeSidebar();
        closeModal();
      }
    });

    document.addEventListener('click', function (event) {
      var navButton = event.target.closest('[data-view], [data-section], [data-route]');
      if (navButton && navButton.classList.contains('nav-item')) {
        var viewKey = navButton.getAttribute('data-view') || navButton.getAttribute('data-section') || navButton.getAttribute('data-route');
        if (viewKey) {
          window.switchDashboardModule(viewKey, event);
        }
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

    // Defer non-critical ledger loading so initial screen paints instantly
    setTimeout(function () {
      refreshLedger();
    }, 150);
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
      api('/api/campaigns?page=1&page_size=10'),
      api('/api/whatsapp/threads?page=1&page_size=10'),
      api('/api/chatbot/flows'),
      api('/api/whatsapp/mode').catch(function () {
        return null;
      }),
      api('/api/admin/employees?page=1&page_size=10').catch(function () {
        return null;
      }),
      api('/api/contacts?page=1&page_size=10').catch(function () {
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
    var recentContacts = results[6] ? results[6].contacts || [] : [];
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
      '<article class="kpi is-primary"><div class="kpi-top"><span class="kpi-label">HNI Clients &amp; Pipeline</span><span class="kpi-glyph">' + SVG_ICONS.users + '</span></div>' +
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

      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Campaign Delivery</span><span class="kpi-glyph">' + SVG_ICONS.broadcast + '</span></div>' +
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

      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Chatbot Automation</span><span class="kpi-glyph">' + SVG_ICONS.bot + '</span></div>' +
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
        ? '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Security &amp; Staff</span><span class="kpi-glyph">' + SVG_ICONS.shield + '</span></div>' +
          '<div class="kpi-value">' +
          fmtInt(activeStaff) +
          '<span class="unit">active staff</span></div>' +
          '<p class="kpi-note"><span class="up">' +
          fmtInt(adminCount) +
          ' Super Admins</span> · ' +
          fmtInt(revokedStaff) +
          ' revoked</p>' +
          '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Employee IDs</span><span class="kpi-ledger-value">' +
          fmtInt(employees.length) +
          '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Audit</span><span class="kpi-ledger-value">IP logged</span></div></div></article>'
        : '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Security &amp; Staff</span><span class="kpi-glyph">' + SVG_ICONS.shield + '</span></div>' +
          '<div class="kpi-value">\u2014<span class="unit">restricted</span></div>' +
          '<p class="kpi-note">Staff credentials, IP audit and Meta cutover live inside the <span class="up">Security Vault</span> for Super Admins.</p>' +
          '<div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Access</span><span class="kpi-ledger-value">Admin only</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Audit</span><span class="kpi-ledger-value">IP logged</span></div></div></article>') +
      '</div>';

    var quick =
      '<div class="quick-bar">' +
      '<button class="quick-btn" type="button" data-quick="contacts"><span class="quick-glyph">' + SVG_ICONS.folder + '</span><span class="quick-text"><strong>Import mobile contacts</strong><span>Drop a .vcf, .csv or .xlsx file</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="marketing"><span class="quick-glyph">' + SVG_ICONS.broadcast + '</span><span class="quick-text"><strong>Launch bulk broadcast</strong><span>Segmented WhatsApp campaign</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="inbox" data-simulate="What subsidy can a textile unit get?"><span class="quick-glyph">' + SVG_ICONS.zap + '</span><span class="quick-text"><strong>Simulate client message</strong><span>' +
      fmtInt(unread) +
      ' unread · watch the chatbot reply live</span></span></button>' +
      '<button class="quick-btn" type="button" data-quick="security"><span class="quick-glyph">' + SVG_ICONS.shield + '</span><span class="quick-text"><strong>Connect official Meta API</strong><span>Purge mock data · go 100% live</span></span></button>' +
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
      : emptyState('broadcast', 'No campaigns yet', 'Launch your first segmented WhatsApp broadcast from the marketing studio.', '<button class="btn btn-sm btn-primary" type="button" data-quick="marketing">Open studio</button>');

    var inquiryRowsHtml = recentContacts.length
      ? recentContacts.map(function (c) {
          return (
            '<tr>' +
            '<td class="mono" style="font-weight:700;color:#F86030;">' + esc(c.inquiry_id) + '</td>' +
            '<td><div class="cell-client"><span class="avatar" style="background:#eef1f8;color:var(--navy)">' + esc(initials(c.client_name)) + '</span>' +
            '<span class="cell-client-text"><span class="strong">' + esc(c.company_name || c.client_name) + '</span>' +
            '<span style="font-size:11px;color:#757786;">' + esc(c.client_name) + ' · ' + esc(c.whatsapp_number) + '</span></span></div></td>' +
            '<td>' + sectorBadge(c.sector) + '<div style="font-size:10.5px;color:#757786;margin-top:2px;">' + esc(c.district || c.taluka || 'Gujarat') + '</div></td>' +
            '<td class="num" style="font-weight:700;color:#1D1C41;">' + esc(fmtLakhs(c.estimated_subsidy_lakhs)) + '</td>' +
            '<td><span class="badge badge-neutral" style="font-size:10.5px;">' + esc(c.enterprise_classification || '—') + '</span></td>' +
            '<td><span style="font-size:11.5px;font-weight:600;color:#1D1C41;">' + esc(c.assigned_ca || 'Unassigned') + '</span></td>' +
            '<td>' + formatStackedDateTime(c.created_at) + '</td>' +
            '<td style="text-align:right;"><button class="btn btn-sm" type="button" data-open-thread="' + num(c.id) + '" style="display:inline-flex;align-items:center;gap:4px;">' + SVG_ICONS.chat + ' Inbox</button></td>' +
            '</tr>'
          );
        }).join('')
      : '<tr><td colspan="8" style="text-align:center;padding:24px;color:#757786;">No HNI client inquiries registered yet.</td></tr>';

    var ledgerTableCard =
      '<div class="card" style="margin-top:16px;">' +
      '  <div class="card-head">' +
      '    <div class="card-head-text">' +
      '      <h2>Recent HNI Subsidy Inquiries Ledger</h2>' +
      '      <p>Real-time stream of latest industrial client inquiries, advisory allocations and subsidy values</p>' +
      '    </div>' +
      '    <button class="btn btn-sm btn-primary" type="button" data-quick="contacts">View All Contacts</button>' +
      '  </div>' +
      '  <div class="card-body is-flush">' +
      '    <div class="sx-table-container">' +
      '      <table class="table sx-data-table">' +
      '        <thead>' +
      '          <tr>' +
      '            <th>Inquiry ID</th>' +
      '            <th>Company &amp; Promoter</th>' +
      '            <th>Sector &amp; Location</th>' +
      '            <th>Est. Subsidy</th>' +
      '            <th>Enterprise Class</th>' +
      '            <th>Assigned Advisor</th>' +
      '            <th>Created (IST)</th>' +
      '            <th style="text-align:right">Action</th>' +
      '          </tr>' +
      '        </thead>' +
      '        <tbody>' +
      inquiryRowsHtml +
      '        </tbody>' +
      '      </table>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    view.innerHTML =
      kpis +
      quick +
      '<div class="chart-grid">' +
      sectorChart +
      funnelChart +
      '</div>' +
      ledgerTableCard +
      '<div class="chart-grid" style="margin-top:16px;">' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Latest bulk campaigns</h2><p>Live send, delivery and read counters</p></div><button class="btn btn-sm" type="button" data-quick="marketing">Studio</button></div><div class="card-body is-flush">' +
      campaignList +
      '</div></div>' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Platform Security Architecture</h2><p>Internal controls, encryption and Meta compliance</p></div><button class="btn btn-sm" type="button" data-quick="security">Security Vault</button></div><div class="card-body" style="padding:16px 20px;display:flex;flex-direction:column;gap:12px;">' +
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;"><span style="color:#F86030;">' + SVG_ICONS.shield + '</span><div><strong style="font-size:12.5px;color:#1D1C41;">Institutional Authentication Shield</strong><div style="font-size:11.5px;color:#757786;margin-top:2px;">Rate-limiting active: 5 failed attempts per IP/User locks login for 15 minutes.</div></div></div>' +
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;"><span style="color:#0F9D6E;">' + SVG_ICONS.zap + '</span><div><strong style="font-size:12.5px;color:#1D1C41;">Deterministic Rules First Engine</strong><div style="font-size:11.5px;color:#757786;margin-top:2px;">Automated auto-replies follow strict keyword rules; AI suggestions strictly require staff review.</div></div></div>' +
      '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;"><span style="color:#1D1C41;">' + SVG_ICONS.broadcast + '</span><div><strong style="font-size:12.5px;color:#1D1C41;">Meta Cloud API Compliance Gate</strong><div style="font-size:11.5px;color:#757786;margin-top:2px;">Strict 24-hour customer service window gate; non-destructive cutover architecture.</div></div></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="note-strip" style="margin-top:16px">' + SVG_ICONS.shield + ' <span><strong>In-house only.</strong> HNI clients never sign in to this command center — every action here is performed by Admins, CAs and Relationship Managers, and logged server-side.</span>' +
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
      tick = '<span class="tick' + (read ? ' is-read' : '') + '">' + (double ? 'READ' : 'SENT') + '</span>';
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
    var location = [contact.taluka, contact.district, contact.state].filter(Boolean).join(', ') || 'Gujarat';
    var gstinPan = contact.gstin || contact.pan || '—';
    var sectorCat = (contact.sector || 'Unassigned') + ' · ' + (contact.category || 'General');
    var consent = contact.opt_in_status ? '<span class="badge badge-green badge-dot">Opted-In</span>' : '<span class="badge badge-amber badge-dot">Opted-Out</span>';

    var specs = [
      ['Inquiry ID', '<span class="mono" style="font-weight:700;color:#F86030;">' + esc(contact.inquiry_id) + '</span>'],
      ['Company Name', esc(contact.company_name || 'Individual Applicant')],
      ['Promoter Name', esc(contact.client_name)],
      ['WhatsApp Number', '<span class="mono">' + esc(contact.whatsapp_number) + '</span>'],
      ['GSTIN / PAN', '<span class="mono">' + esc(gstinPan) + '</span>'],
      ['Sector & Category', sectorCat],
      ['Location', esc(location)],
      ['Enterprise Class', esc(contact.enterprise_classification || '—')],
      (state.isAdmin && contact.client_tier ? ['Client Tier', tierBadge(contact.client_tier)] : null),
      ['Term Loan', esc(contact.term_loan_planned === 'Yes' ? 'Term Loan Planned' : 'No Loan')],
      ['Estimated Subsidy', '<span class="is-money" style="font-weight:700;color:#1D1C41;">' + esc(fmtLakhs(contact.estimated_subsidy_lakhs)) + '</span>'],
      ['Consent Status', consent],
      ['Assigned Advisor', esc(contact.assigned_ca || 'Unassigned')]
    ];

    var tableRows = specs.filter(Boolean).map(function (item) {
      return (
        '<tr>' +
        '<td class="sx-spec-key" style="background:#F8FAFC;font-weight:600;padding:8px 12px;border:1px solid #E2E8F0;font-size:11.5px;color:#495057;width:40%;">' + esc(item[0]) + '</td>' +
        '<td class="sx-spec-val" style="padding:8px 12px;border:1px solid #E2E8F0;font-size:12px;color:#1D1C41;">' + item[1] + '</td>' +
        '</tr>'
      );
    }).join('');

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
      '<div class="sx-table-container" style="margin:12px 0;border-radius:8px;">' +
      '<table class="sx-spec-table" style="width:100%;border-collapse:collapse;">' +
      tableRows +
      '</table>' +
      '</div>' +
      '<div class="dossier-group"><div class="dossier-group-label">Communication &amp; Timeline</div><div class="dossier-grid">' +
      '<div class="dossier-field"><dt>Messages</dt><dd class="v is-mono">' + fmtInt(messages.length) + '</dd></div>' +
      '<div class="dossier-field"><dt>Unread</dt><dd class="v is-mono">' + fmtInt(unread) + '</dd></div>' +
      '<div class="dossier-field is-wide"><dt>File Opened</dt><dd>' + formatStackedDateTime(contact.created_at) + '</dd></div>' +
      (messages.length
        ? '<div class="dossier-field is-wide"><dt>Last Message</dt><dd>' + formatStackedDateTime(messages[messages.length - 1].created_at) + '</dd></div>'
        : '<div class="dossier-field is-wide"><dt>Last Message</dt><dd style="color:#757786;">No messages yet</dd></div>') +
      '</div></div>'
    );
  }

  async function viewInbox(view, started) {
    view.innerHTML = skInbox();

    var results = await Promise.all([api('/api/whatsapp/threads?page=1&page_size=10'), api('/api/templates?page=1&page_size=10')]);
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
      '<img src="/static/img/logo-mark.png" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';" class="thread-avatar" id="chatAvatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">' +
      '<div class="chat-head-text"><strong id="chatName">Select a conversation</strong><span id="chatMeta">Pick a client thread to read the history</span></div>' +
      '<div class="pane-head-actions"><button class="btn btn-sm" type="button" id="printHead" style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.print + ' Summary</button></div></div>' +
      '<div class="sim-tray"><div class="sim-tray-head"><strong style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.zap + ' Simulate Inbound</strong><span>Drop a client message and watch the chatbot reply</span></div>' +
      '<div class="sim-chips">' +
      SIM_CHIPS.map(function (chip) {
        return '<button class="chip" type="button" data-sim-chip="' + esc(chip) + '">' + esc(chip) + '</button>';
      }).join('') +
      '</div><div class="sim-row"><input class="input" type="text" id="simInput" placeholder="e.g. Need subsidy guidance for a pharma expansion" aria-label="Simulated client message"><button class="btn btn-sm btn-dark" type="button" id="simSend">Simulate</button></div></div>' +
      '<div class="chat-stream" id="chatStream"></div>' +
      '<div class="composer"><div class="composer-tools"><div class="template-pop"><button class="btn btn-sm" type="button" id="templateToggle" style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.folder + ' Insert template</button> <button class="btn btn-sm" type="button" id="btnAiDraft" style="display:inline-flex;align-items:center;gap:6px;color:var(--blue);border-color:rgba(64,128,224,0.4);">' + SVG_ICONS.sparkle + ' Draft AI Suggestion</button>' +
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
      '<div class="composer-row"><textarea id="composerText" placeholder="Type a reply to the client…" rows="1" aria-label="Message body"></textarea><button class="send-btn" type="button" id="sendBtn" title="Send message" style="display:inline-flex;align-items:center;justify-content:center;"><svg class="icon-svg" style="width:15px;height:15px;stroke:#fff;" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div></div></section>' +

      '<section class="pane pane-dossier"><div class="pane-head"><div><h2>Client dossier</h2><div class="pane-sub">Internal advisory file</div></div></div>' +
      '<div class="dossier" id="dossier"></div><div class="dossier-foot"><button class="btn btn-sm btn-block" type="button" id="printDossier" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;">' + SVG_ICONS.print + ' Printable client summary</button></div></section>' +
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
        threadList.innerHTML = emptyState('search', filter ? 'No matching conversation' : 'No conversations yet', filter ? 'Try a different client name, company or inquiry number.' : 'Import HNI contacts to open the first thread.');
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
            '"><img src="' +
            esc(contact.avatar_url || '/static/img/logo-mark.png') +
            '" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';" class="thread-avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;"><span class="thread-main"><span class="thread-row"><span class="thread-name">' +
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
        stream.innerHTML = emptyState('chat', 'Select a conversation', 'Choose a client thread on the left to read the full WhatsApp history.');
        dossier.innerHTML = '<div class="empty"><span class="glyph">' + SVG_ICONS.folder + '</span><strong>No client selected</strong><p>The dossier shows sector, advisory and pipeline data for the active thread.</p></div>';
        return;
      }
      var messages = state.inbox.messages;
      if (!messages.length) {
        stream.innerHTML =
          '<div class="thread-empty"><span class="glyph">' + SVG_ICONS.mail + '</span><strong>No messages yet</strong><span>Send the first message or simulate an inbound client message above to open this thread.</span></div>';
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

      var cAv = $('#chatAvatar', view);
      if (cAv) cAv.src = activeContact.avatar_url || '/static/img/logo-mark.png';
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
      var data = await api('/api/whatsapp/threads?page=1&page_size=10');
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

    var btnAi = $('#btnAiDraft', view);
    if (btnAi) {
      btnAi.addEventListener('click', function () {
        if (!activeContact) {
          toast('info', 'Pick a conversation', 'Select a client thread first.');
          return;
        }
        var lastInbound = (state.inbox.messages || []).slice().reverse().find(function (m) {
          return m.direction === 'INBOUND';
        });
        var promptText = lastInbound ? lastInbound.body : ('Subsidy inquiry for ' + (activeContact.sector || 'enterprise expansion'));
        btnAi.disabled = true;
        btnAi.textContent = 'Drafting suggestion…';

        api('/api/chatbot/draft-reply', {
          method: 'POST',
          body: { contact_id: num(activeContact.id), inbound_text: promptText }
        })
          .then(function (res) {
            var draft = res.draft || {};
            var draftBody = draft.draft_body || '';
            openModal({
              title: 'AI Advisory Draft (Staff Approval Required)',
              subtitle: 'Tailored for ' + esc(activeContact.client_name) + ' · ' + esc(draft.suggested_ca || 'CA Advisory Desk'),
              wide: true,
              body:
                '<div style="margin-bottom:10px;"><span class="badge" style="background:rgba(64,128,224,0.12);color:var(--blue);font-weight:700;">RULES-FIRST DRAFT</span> <span class="meta-hint" style="font-size:12px;color:var(--ink-3);">Will NOT be sent to client until explicitly approved below.</span></div>' +
                '<div class="field"><label>Draft Message Body (Review or Edit)</label><textarea class="input" id="aiDraftEditField" rows="7" style="font-size:13px;line-height:1.5;resize:vertical;">' +
                esc(draftBody) +
                '</textarea></div>',
              footer:
                '<button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
                '<button class="btn btn-sm" type="button" id="btnInsertDraft" style="margin-left:auto;">Insert into Composer</button>' +
                '<button class="btn btn-sm btn-primary" type="button" id="btnApproveDraftSend" style="background:var(--blue);border-color:var(--blue);">Approve &amp; Send to WhatsApp</button>'
            });

            var modalRoot = document.getElementById('modalRoot');
            if (modalRoot) {
              var btnInsert = $('#btnInsertDraft', modalRoot);
              var btnApprove = $('#btnApproveDraftSend', modalRoot);
              var editField = $('#aiDraftEditField', modalRoot);

              if (btnInsert) {
                btnInsert.addEventListener('click', function () {
                  composer.value = editField.value;
                  composer.focus();
                  composer.style.height = Math.min(132, composer.scrollHeight) + 'px';
                  $('#composerHint', view).textContent = 'AI Draft inserted into composer · edit or press Enter to send.';
                  var closeBtn = $('[data-modal-close]', modalRoot);
                  if (closeBtn) closeBtn.click();
                });
              }

              if (btnApprove) {
                btnApprove.addEventListener('click', async function () {
                  var approvedText = editField.value.trim();
                  if (!approvedText) return;
                  btnApprove.disabled = true;
                  btnApprove.textContent = 'Sending approved message…';
                  try {
                    var sendRes = await api('/api/chatbot/approve-draft', {
                      method: 'POST',
                      body: { contact_id: num(activeContact.id), approved_text: approvedText }
                    });
                    appendLocal(sendRes.chat_message);
                    toast('success', 'Draft Approved & Sent', 'Dispatched to ' + activeContact.client_name + ' via WhatsApp.');
                    var closeBtn = $('[data-modal-close]', modalRoot);
                    if (closeBtn) closeBtn.click();
                    await reloadThreads(num(activeContact.id));
                  } catch (err) {
                    apiErrorMessage('Approve draft', err);
                    btnApprove.disabled = false;
                    btnApprove.textContent = 'Approve & Send to WhatsApp';
                  }
                });
              }
            }
          })
          .catch(function (err) {
            apiErrorMessage('Draft generation', err);
          })
          .finally(function () {
            btnAi.disabled = false;
            btnAi.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.sparkle + ' Draft AI Suggestion</span>';
          });
      });
    }

    var printHeadBtn = $('#printHead', view);
    if (printHeadBtn) {
      printHeadBtn.addEventListener('click', function () {
        if (!activeContact) {
          toast('info', 'Nothing to print', 'Select a client thread first.');
          return;
        }
        printClientSummary(activeContact);
      });
    }

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
      '<div class="note-strip" style="margin-top:12px">' + SVG_ICONS.folder + ' <span>Export the .vcf and open it on any Android or iOS phone to sync every HNI client instantly.</span></div>' +
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
      (state.isAdmin
        ? '<select class="select toolbar-select" id="contactTier" aria-label="Filter by tier"><option value="">All Tiers</option>' +
          '<option value="PLATINUM">Platinum (Medium/Large)</option>' +
          '<option value="GOLD">Gold (Small)</option>' +
          '<option value="SILVER">Silver (Micro)</option></select>'
        : '') +
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
      if (state.isAdmin && state.contacts.tier) params.set('tier', state.contacts.tier);

      var data = await api('/api/contacts?' + params.toString());
      await settle(startedAt);
      var rows = data.contacts || [];
      state.contacts.rows = rows;
      state.contacts.total = num(data.total);

      if (!rows.length) {
        tableWrap.innerHTML = emptyState('folder', 'No HNI contacts match', 'Clear the filters or import a contact file to get started.', '<button class="btn btn-sm btn-primary" type="button" data-add>+ Add HNI client</button>');
        var addEmpty = $('[data-add]', tableWrap);
        if (addEmpty) addEmpty.addEventListener('click', function () {
          openContactModal(null);
        });
      } else {
        tableWrap.innerHTML =
          '<div class="sx-table-container">' +
          '<table class="table sx-data-table"><thead><tr>' +
          '<th>Inquiry ID</th><th>Client &amp; Company</th>' +
          (state.isAdmin ? '<th>Client Tier</th>' : '') +
          '<th>Sector &amp; District</th><th>Enterprise</th><th>Subsidy</th><th>Assigned Advisor</th><th>Created (IST)</th><th style="text-align:right">Actions</th>' +
          '</tr></thead><tbody>' +
          rows
            .map(function (contact) {
              return (
                '<tr>' +
                '<td class="mono" style="font-weight:700;color:#F86030;">' + esc(contact.inquiry_id) + '</td>' +
                '<td><div class="cell-client"><img src="' + esc(contact.avatar_url || '/static/img/logo-mark.png') + '" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';" class="avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">' +
                '<span class="cell-client-text"><span class="strong">' +
                esc(contact.client_name) +
                '</span><span>' +
                esc(contact.company_name || 'Individual applicant') +
                ' · <span class="mono">' + esc(contact.whatsapp_number) + '</span></span></span></div></td>' +
                (state.isAdmin ? '<td>' + tierBadge(contact.client_tier) + '</td>' : '') +
                '<td>' + sectorBadge(contact.sector) + '<div style="font-size:10.5px;color:#757786;margin-top:2px;">' + esc(contact.district || contact.taluka || 'Gujarat') + '</div></td>' +
                '<td><span class="badge badge-neutral" style="font-size:11px;">' + esc(contact.enterprise_classification || '—') + '</span>' +
                '<div class="mono" style="font-size:10px;color:var(--ink-4);margin-top:2px;">' + esc(contact.term_loan_planned === 'Yes' ? 'Term loan' : 'No loan') + '</div></td>' +
                '<td class="num" style="font-weight:700;color:#1D1C41;">' + esc(fmtLakhs(contact.estimated_subsidy_lakhs)) + '</td>' +
                '<td><span style="font-size:11.5px;font-weight:600;color:#1D1C41;">' + esc(contact.assigned_ca || 'Unassigned') + '</span></td>' +
                '<td>' + formatStackedDateTime(contact.created_at) + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="icon-btn" type="button" title="Open WhatsApp thread" data-chat="' + num(contact.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.chat + '</button>' +
                '<button class="icon-btn" type="button" title="Print client dossier" data-print-contact="' + num(contact.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.print + '</button>' +
                '<button class="icon-btn" type="button" title="Edit client" data-edit="' + num(contact.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.edit + '</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete client" data-delete="' + num(contact.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button>' +
                '</div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';
      }

      renderFoot();
      wireRows();

      var count = $('#importCount', view);
      if (count) count.textContent = fmtInt(state.contacts.total) + ' on file';
    }

    function renderFoot() {
      var currentPage = Math.floor(state.contacts.offset / state.contacts.limit) + 1;
      foot.innerHTML = renderPaginationFooter(currentPage, state.contacts.limit, state.contacts.total, 'data-contact-page');

      $$('[data-contact-page]', foot).forEach(function (button) {
        button.addEventListener('click', function () {
          var targetPage = Number(button.getAttribute('data-contact-page'));
          if (!targetPage || button.disabled) return;
          state.contacts.offset = (targetPage - 1) * state.contacts.limit;
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
      $$('[data-print-contact]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var contact = state.contacts.rows.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-print-contact'));
          });
          if (contact) printClientDossier(contact, []);
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
    var contactTier = $('#contactTier', view);
    if (contactTier) {
      contactTier.value = state.contacts.tier || '';
      contactTier.addEventListener('change', function () {
        state.contacts.tier = this.value;
        state.contacts.offset = 0;
        loadContacts().catch(function (error) {
          apiErrorMessage('Contacts', error);
        });
      });
    }
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

  /* ------------------------------------------------------------- ca-network */

  var CA_SPECIALIZATIONS = [
    'Project Finance & Term Loan',
    'Industrial Subsidy Audit',
    'GST & Compliance',
    'Direct Tax & Corporate Law',
    'Customs & Foreign Trade Policy'
  ];

  function openCaProfileModal(ca, onSaved) {
    var isEdit = !!ca;
    ca = ca || {};
    var associatesList = ca.associates || [];

    var dialog = openModal({
      title: isEdit ? 'Edit CA Partner Profile' : 'Register Chartered Accountant Partner',
      subtitle: isEdit ? (ca.ca_code + ' · ' + ca.full_name) : 'Add a CA / financial consultant to the referral & project advisory network',
      wide: true,
      body:
        '<form class="form" id="caProfileForm" style="display:flex;flex-direction:column;gap:14px;">' +
        '  <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-name">Full Name (with CA prefix) *</label>' +
        '      <input class="input" id="ca-name" type="text" required value="' + esc(ca.full_name || '') + '" placeholder="e.g. CA Rakesh Shah">' +
        '    </div>' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-firm">Firm / Practice Name *</label>' +
        '      <input class="input" id="ca-firm" type="text" required value="' + esc(ca.firm_name || '') + '" placeholder="e.g. Shah & Associates">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-icai">ICAI Membership No.</label>' +
        '      <input class="input mono-input" id="ca-icai" type="text" value="' + esc(ca.icai_membership_no || '') + '" placeholder="e.g. 142857">' +
        '    </div>' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-phone">Mobile / WhatsApp (+91) *</label>' +
        '      <input class="input mono-input" id="ca-phone" type="tel" required value="' + esc(ca.phone_number || '') + '" placeholder="10-digit mobile">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-email">Email Address</label>' +
        '      <input class="input" id="ca-email" type="email" value="' + esc(ca.email || '') + '" placeholder="ca.rakesh@example.com">' +
        '    </div>' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-city">City / District *</label>' +
        '      <input class="input" id="ca-city" type="text" required value="' + esc(ca.city_district || 'Ahmedabad') + '" placeholder="e.g. Ahmedabad">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-spec">Primary Specialization</label>' +
        '      <select class="select" id="ca-spec">' +
        optionList(CA_SPECIALIZATIONS, ca.specialization || 'Project Finance & Term Loan') +
        '      </select>' +
        '    </div>' +
        '    <div class="field">' +
        '      <label class="field-label" for="ca-ref-count">Referred Industrialists</label>' +
        '      <input class="input mono-input" id="ca-ref-count" type="number" min="0" value="' + num(ca.referred_industrialists_count) + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="field">' +
        '    <label class="field-label" for="ca-associates">Sub-Associates (JSON array or Name:Phone per line)</label>' +
        '    <textarea class="textarea mono-input" id="ca-associates" rows="3" placeholder="e.g. Jignesh Dave: 9825123456\nPooja Mehta: 9825987654">' +
        (associatesList.length ? associatesList.map(function (a) { return (a.name || '') + (a.phone ? ': ' + a.phone : ''); }).join('\n') : '') +
        '    </textarea>' +
        '  </div>' +
        '  <div id="ca-modal-error" style="display:none;color:#C53030;font-size:12.5px;padding:8px 12px;background:#FFF5F5;border:1px solid #FED7D7;border-radius:6px;"></div>' +
        '</form>',
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-save-ca>' +
        (isEdit ? 'Save Changes' : 'Register CA Partner') +
        '</button>'
    });
    if (!dialog) return;

    $('[data-save-ca]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var errEl = $('#ca-modal-error', dialog.root);
      function showErr(msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }

      var fullName = $('#ca-name', dialog.root).value.trim();
      var firmName = $('#ca-firm', dialog.root).value.trim();
      var icai = $('#ca-icai', dialog.root).value.trim();
      var phone = $('#ca-phone', dialog.root).value.trim();
      var email = $('#ca-email', dialog.root).value.trim();
      var city = $('#ca-city', dialog.root).value.trim();
      var spec = $('#ca-spec', dialog.root).value;
      var refCount = num($('#ca-ref-count', dialog.root).value);
      var rawAssociates = $('#ca-associates', dialog.root).value.trim();

      if (!fullName) { showErr('Full Name is required.'); return; }
      if (!phone) { showErr('Phone number is required.'); return; }

      var parsedAssociates = [];
      if (rawAssociates) {
        if (rawAssociates.startsWith('[')) {
          try { parsedAssociates = JSON.parse(rawAssociates); } catch (e) { parsedAssociates = []; }
        } else {
          parsedAssociates = rawAssociates.split('\n').filter(Boolean).map(function (line) {
            var parts = line.split(':');
            return { name: parts[0].trim(), phone: (parts[1] || '').trim() };
          });
        }
      }

      var payload = {
        full_name: fullName,
        firm_name: firmName,
        icai_membership_no: icai,
        phone_number: phone,
        email: email,
        city_district: city,
        specialization: spec,
        referred_industrialists_count: refCount,
        associates: parsedAssociates,
        is_active: true
      };

      btn.disabled = true;
      try {
        if (isEdit) {
          await api('/api/ca-network/' + ca.id, { method: 'PUT', body: payload });
          toast('success', 'CA Partner Updated', fullName + ' details saved.');
        } else {
          await api('/api/ca-network', { method: 'POST', body: payload });
          toast('success', 'CA Partner Registered', fullName + ' added to network.');
        }
        dialog.close();
        if (onSaved) onSaved();
      } catch (err) {
        btn.disabled = false;
        showErr(err.message || 'Failed to save CA partner.');
      }
    });
  }

  async function viewCaNetwork(view, started) {
    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>CA &amp; Associates Network</h2><p>Chartered Accountants, Financial Advisors &amp; Partner Firms referral ecosystem</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshCaBtn">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="addCaBtn">+ Register CA Partner</button></div></div>' +
      skTable(8);

    await settle(started);

    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>CA &amp; Associates Network</h2><p>Chartered Accountants, Financial Advisors &amp; Partner Firms referral ecosystem</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshCaBtn">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="addCaBtn">+ Register CA Partner</button></div></div>' +
      '<div class="card"><div class="toolbar">' +
      '<input class="input input-search toolbar-search" type="search" id="caSearch" placeholder="Search CA code, name, firm, ICAI no, or city" aria-label="Search CAs">' +
      '<select class="select toolbar-select" id="caSpecFilter" aria-label="Filter by specialization"><option value="">All Specializations</option>' +
      optionList(CA_SPECIALIZATIONS, '') +
      '</select>' +
      '<span style="flex:1 1 auto"></span>' +
      '<button class="btn btn-sm" type="button" id="caRefreshTb">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="addCaTb">+ Add CA Partner</button>' +
      '</div><div class="table-wrap" id="caTableWrap"></div>' +
      '<div class="table-foot" id="caFoot"></div></div>';

    var tableWrap = $('#caTableWrap', view);
    var foot = $('#caFoot', view);

    async function loadCaData() {
      var startedAt = performance.now ? performance.now() : 0;
      tableWrap.innerHTML = skRows(6, 6);
      foot.innerHTML = '';

      var params = new URLSearchParams();
      params.set('page', String(state.caNetwork.page));
      params.set('page_size', String(state.caNetwork.pageSize));
      if (state.caNetwork.search) params.set('search', state.caNetwork.search);
      var specVal = $('#caSpecFilter', view) ? $('#caSpecFilter', view).value : '';
      if (specVal) params.set('specialization', specVal);

      var data = await api('/api/ca-network?' + params.toString());
      await settle(startedAt);

      state.caNetwork.rows = data.items || [];
      state.caNetwork.total = num(data.total);

      if (!state.caNetwork.rows.length) {
        tableWrap.innerHTML = emptyState('users', 'No CA Partners Found', 'Register chartered accountants and partner firms to track referrals and co-advisory files.', '<button class="btn btn-sm btn-primary" type="button" data-add-ca-empty>+ Register CA Partner</button>');
        var addEmpty = $('[data-add-ca-empty]', tableWrap);
        if (addEmpty) addEmpty.addEventListener('click', function () {
          openCaProfileModal(null, loadCaData);
        });
      } else {
        tableWrap.innerHTML =
          '<div class="sx-table-container">' +
          '<table class="table sx-data-table"><thead><tr>' +
          '<th>CA Code</th><th>Chartered Accountant &amp; Firm</th><th>ICAI Membership</th><th>Contact &amp; Location</th><th>Specialization</th><th>Associates</th><th>Referred Clients</th><th>Status</th><th style="text-align:right">Actions</th>' +
          '</tr></thead><tbody>' +
          state.caNetwork.rows
            .map(function (ca) {
              var associates = ca.associates || [];
              var assocText = associates.length ? (associates.length + ' Associate' + (associates.length > 1 ? 's' : '')) : 'Direct';
              return (
                '<tr>' +
                '<td class="mono" style="font-weight:700;color:#1D1C41;">' + esc(ca.ca_code) + '</td>' +
                '<td><div class="cell-client"><img src="' + esc(ca.avatar_url || '/static/img/logo-mark.png') + '" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';" class="avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">' +
                '<span class="cell-client-text"><span class="strong">' +
                esc(ca.full_name) +
                '</span><span style="font-size:11px;color:#757786;">' +
                esc(ca.firm_name || 'Independent Practice') +
                '</span></span></div></td>' +
                '<td class="mono">' + esc(ca.icai_membership_no || '—') + '</td>' +
                '<td><div style="font-size:12px;font-weight:600;color:#1D1C41;" class="mono">' + esc(ca.phone_number) + '</div><div style="font-size:11px;color:#757786;">' + esc(ca.city_district || 'Gujarat') + (ca.email ? ' · ' + esc(ca.email) : '') + '</div></td>' +
                '<td><span class="badge badge-neutral" style="font-size:11px;">' + esc(ca.specialization) + '</span></td>' +
                '<td><span class="badge badge-mono">' + esc(assocText) + '</span></td>' +
                '<td class="num" style="font-weight:700;color:#F86030;">' + fmtInt(ca.referred_industrialists_count) + '</td>' +
                '<td>' + (ca.is_active ? '<span class="badge badge-green badge-dot">Active</span>' : '<span class="badge badge-neutral badge-dot">Inactive</span>') + '</td>' +
                '<td style="text-align:right"><div class="table-actions" style="justify-content:flex-end;">' +
                '<button class="icon-btn" type="button" title="Edit CA profile" data-edit-ca="' + num(ca.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.edit + '</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete CA partner" data-delete-ca="' + num(ca.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button>' +
                '</div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';
      }

      foot.innerHTML = renderPaginationFooter(state.caNetwork.page, state.caNetwork.pageSize, state.caNetwork.total, 'data-ca-page');

      $$('[data-ca-page]', foot).forEach(function (button) {
        button.addEventListener('click', function () {
          var targetPage = Number(button.getAttribute('data-ca-page'));
          if (!targetPage || button.disabled) return;
          state.caNetwork.page = targetPage;
          loadCaData().catch(function (error) {
            apiErrorMessage('CA Network', error);
          });
        });
      });

      $$('[data-edit-ca]', tableWrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-edit-ca'));
          var caItem = state.caNetwork.rows.find(function (r) { return num(r.id) === id; });
          if (caItem) openCaProfileModal(caItem, loadCaData);
        });
      });

      $$('[data-delete-ca]', tableWrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = Number(btn.getAttribute('data-delete-ca'));
          var caItem = state.caNetwork.rows.find(function (r) { return num(r.id) === id; });
          if (!caItem) return;
          confirmAction(
            'Remove CA Partner?',
            caItem.full_name + ' (' + caItem.ca_code + ') will be removed from the network directory.',
            'Remove CA',
            async function () {
              try {
                await api('/api/ca-network/' + caItem.id, { method: 'DELETE' });
                toast('success', 'CA Removed', caItem.full_name + ' has been removed.');
                await loadCaData();
              } catch (err) {
                apiErrorMessage('Delete CA', err);
                throw err;
              }
            },
            true
          );
        });
      });
    }

    var searchInput = $('#caSearch', view);
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        state.caNetwork.search = this.value.trim();
        state.caNetwork.page = 1;
        loadCaData().catch(function (err) { apiErrorMessage('Search', err); });
      }, 260));
    }

    var specFilter = $('#caSpecFilter', view);
    if (specFilter) {
      specFilter.addEventListener('change', function () {
        state.caNetwork.page = 1;
        loadCaData().catch(function (err) { apiErrorMessage('Filter', err); });
      });
    }

    var refreshBtn = $('#refreshCaBtn', view);
    if (refreshBtn) refreshBtn.addEventListener('click', loadCaData);
    var refreshTb = $('#caRefreshTb', view);
    if (refreshTb) refreshTb.addEventListener('click', loadCaData);

    var addBtn = $('#addCaBtn', view);
    if (addBtn) addBtn.addEventListener('click', function () { openCaProfileModal(null, loadCaData); });
    var addTb = $('#addCaTb', view);
    if (addTb) addTb.addEventListener('click', function () { openCaProfileModal(null, loadCaData); });

    await loadCaData();
  }

  /* ----------------------------------------------------------- client-lists */

  function clientListForm(list) {
    list = list || {};
    var rules = {};
    if (list.filter_rules_json) {
      try {
        rules = JSON.parse(list.filter_rules_json);
      } catch (e) {
        rules = {};
      }
    }
    return (
      '<div class="form-row"><div class="field"><label for="clf-name">List Name</label><input class="input" id="clf-name" value="' +
      esc(list.name || '') +
      '" placeholder="e.g. Gujarat Textile Promoters"></div>' +
      '<div class="field"><label for="clf-category">Audience Category</label><select class="select" id="clf-category">' +
      optionList(CLIENT_LIST_CATEGORIES, list.category || 'SECTOR_SEGMENT') +
      '</select></div></div>' +
      '<div class="form-row"><div class="field"><label for="clf-color">Accent Color</label><input class="input" id="clf-color" type="color" value="' +
      esc(list.color_hex || '#4080E0') +
      '" style="height:38px;padding:2px 6px;"></div>' +
      '<div class="field"><label for="clf-desc">Description</label><input class="input" id="clf-desc" value="' +
      esc(list.description || '') +
      '" placeholder="Target audience criteria or campaign rationale"></div></div>' +
      '<div class="section-head" style="margin-top:14px;margin-bottom:8px;"><div class="section-head-text"><h3 style="font-size:13px;font-weight:700;color:#1D1C41;">Auto-Matching Dynamic Rules (Optional)</h3><p style="font-size:11px;color:#5C636A;">Contacts matching these criteria will automatically qualify for this list</p></div></div>' +
      '<div class="form-row"><div class="field"><label for="clf-sector">Target Sector</label><select class="select" id="clf-sector"><option value="">Any sector</option>' +
      optionList(SECTORS, rules.sector || '') +
      '</select></div>' +
      '<div class="field"><label for="clf-district">District / Taluka</label><input class="input" id="clf-district" value="' +
      esc(rules.district || '') +
      '" placeholder="e.g. Surat, Ahmedabad, Rajkot"></div></div>' +
      '<div class="form-row"><div class="field"><label for="clf-class">Enterprise Class</label><select class="select" id="clf-class"><option value="">Any classification</option>' +
      optionList(ENTERPRISE_CLASSES, rules.enterprise_classification || '') +
      '</select></div>' +
      '<div class="field"><label for="clf-subsidy">Min Subsidy (₹ Lakhs)</label><input class="input" id="clf-subsidy" type="number" value="' +
      (rules.min_subsidy_lakhs || '') +
      '" placeholder="e.g. 50"></div></div>'
    );
  }

  function openClientListModal(list, onSaved) {
    var isEdit = !!list;
    var dialog = openModal({
      title: isEdit ? 'Edit Client List' : 'Create Client List',
      subtitle: isEdit ? list.list_code + ' · ' + list.name : 'Group HNI contacts into target audience segments',
      wide: true,
      body: clientListForm(list),
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-save-list>' +
        (isEdit ? 'Save Changes' : 'Create List') +
        '</button>'
    });
    if (!dialog) return;

    $('[data-save-list]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var name = $('#clf-name', dialog.root).value.trim();
      var category = $('#clf-category', dialog.root).value;
      var color = $('#clf-color', dialog.root).value;
      var desc = $('#clf-desc', dialog.root).value.trim();
      var sector = $('#clf-sector', dialog.root).value;
      var district = $('#clf-district', dialog.root).value.trim();
      var enterpriseClass = $('#clf-class', dialog.root).value;
      var minSubsidy = Number($('#clf-subsidy', dialog.root).value) || 0;

      if (!name) {
        toast('error', 'List name required', 'Please provide a descriptive audience list name.');
        return;
      }

      var rules = {};
      if (sector) rules.sector = sector;
      if (district) rules.district = district;
      if (enterpriseClass) rules.enterprise_classification = enterpriseClass;
      if (minSubsidy > 0) rules.min_subsidy_lakhs = minSubsidy;

      var payload = {
        name: name,
        category: category,
        description: desc,
        color_hex: color,
        filter_rules_json: Object.keys(rules).length ? JSON.stringify(rules) : null
      };

      btn.disabled = true;
      try {
        if (isEdit) {
          await api('/api/client-lists/' + list.id, { method: 'PUT', body: payload });
          toast('success', 'List updated', name + ' saved.');
        } else {
          var res = await api('/api/client-lists', { method: 'POST', body: payload });
          toast('success', 'List created', res.message || 'Client list ready.');
        }
        dialog.close();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Client List', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function openManageMembersModal(list, onSaved) {
    var dialog = openModal({
      title: 'Manage List Members',
      subtitle: list.list_code + ' · ' + list.name + ' (' + fmtInt(list.member_count) + ' enrolled)',
      wide: true,
      body:
        '<div style="display:flex;gap:10px;margin-bottom:14px;">' +
        '<input class="input" id="memberAddSearch" placeholder="Search HNI contact to add by name, phone or company" style="flex:1;">' +
        '<button class="btn btn-sm btn-primary" type="button" id="addMemberBtn">+ Add to List</button>' +
        '</div>' +
        '<div id="memberCandidateWrap" style="margin-bottom:14px;display:none;background:#F8FAFC;padding:10px;border-radius:6px;border:1px solid #CBD5E1;"></div>' +
        '<div class="table-wrap" id="membersTableWrap">' + skRows(4, 4) + '</div>',
      footer: '<span class="spacer"></span><button class="btn btn-sm btn-primary" type="button" data-modal-close>Done</button>'
    });
    if (!dialog) return;

    var wrap = $('#membersTableWrap', dialog.root);
    var candWrap = $('#memberCandidateWrap', dialog.root);
    var searchInput = $('#memberAddSearch', dialog.root);
    var addBtn = $('#addMemberBtn', dialog.root);
    var selectedContactId = null;

    async function reloadMembers() {
      wrap.innerHTML = skRows(4, 4);
      try {
        var res = await api('/api/client-lists/' + list.id + '/members?page=1&page_size=100');
        var members = res.members || [];
        if (!members.length) {
          wrap.innerHTML = '<div style="padding:24px;text-align:center;color:#64748B;">No contacts in this list yet. Search above to add contacts.</div>';
        } else {
          wrap.innerHTML =
            '<div class="sx-table-container"><table class="table sx-data-table"><thead><tr>' +
            '<th>Client</th><th>WhatsApp Number</th><th>Sector / District</th><th>Added (IST)</th><th style="text-align:right">Action</th>' +
            '</tr></thead><tbody>' +
            members
              .map(function (m) {
                return (
                  '<tr>' +
                  '<td><span style="font-weight:600;color:#1D1C41;">' + esc(m.client_name) + '</span><div style="font-size:11px;color:#64748B;">' + esc(m.company_name || 'Individual') + '</div></td>' +
                  '<td class="mono">' + esc(m.whatsapp_number) + '</td>' +
                  '<td>' + esc(m.sector || '—') + ' · ' + esc(m.district || '') + '</td>' +
                  '<td>' + formatStackedDateTime(m.added_at) + '</td>' +
                  '<td style="text-align:right"><button class="btn btn-sm is-danger" type="button" data-remove-member="' + num(m.contact_id) + '">Remove</button></td>' +
                  '</tr>'
                );
              })
              .join('') +
            '</tbody></table></div>';

          $$('[data-remove-member]', dialog.root).forEach(function (btn) {
            btn.addEventListener('click', async function () {
              var cid = Number(btn.getAttribute('data-remove-member'));
              btn.disabled = true;
              try {
                await api('/api/client-lists/' + list.id + '/members/' + cid, { method: 'DELETE' });
                toast('success', 'Member removed', 'Contact excluded from this client list.');
                await reloadMembers();
                if (typeof onSaved === 'function') onSaved();
              } catch (e) {
                apiErrorMessage('Remove member', e);
                btn.disabled = false;
              }
            });
          });
        }
      } catch (err) {
        wrap.innerHTML = '<div style="color:#DC2626;padding:16px;">Failed to load members: ' + esc(err.message) + '</div>';
      }
    }

    searchInput.addEventListener('input', debounce(async function () {
      var q = searchInput.value.trim();
      if (q.length < 2) {
        candWrap.style.display = 'none';
        candWrap.innerHTML = '';
        selectedContactId = null;
        return;
      }
      try {
        var res = await api('/api/contacts?limit=5&offset=0&q=' + encodeURIComponent(q));
        var listMatches = res.contacts || [];
        if (!listMatches.length) {
          candWrap.style.display = 'block';
          candWrap.innerHTML = '<div style="font-size:11.5px;color:#64748B;">No matching contacts found.</div>';
          selectedContactId = null;
        } else {
          candWrap.style.display = 'block';
          candWrap.innerHTML =
            '<div style="font-size:11.5px;font-weight:600;margin-bottom:6px;color:#1D1C41;">Select contact to add:</div>' +
            listMatches
              .map(function (c) {
                return (
                  '<div class="candidate-row" data-cand-id="' + num(c.id) + '" style="padding:6px 8px;cursor:pointer;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">' +
                  '<span><strong>' + esc(c.client_name) + '</strong> (' + esc(c.company_name || 'Individual') + ')</span>' +
                  '<span class="mono" style="font-size:11px;">' + esc(c.whatsapp_number) + '</span>' +
                  '</div>'
                );
              })
              .join('');

          $$('[data-cand-id]', candWrap).forEach(function (el) {
            el.addEventListener('click', function () {
              selectedContactId = Number(el.getAttribute('data-cand-id'));
              $$('[data-cand-id]', candWrap).forEach(function (e) { e.style.background = ''; });
              el.style.background = '#E0F2FE';
            });
          });
        }
      } catch (e) {
        /* search error */
      }
    }, 260));

    addBtn.addEventListener('click', async function () {
      if (!selectedContactId) {
        toast('info', 'Choose a contact', 'Search and click a contact candidate to select it.');
        return;
      }
      addBtn.disabled = true;
      try {
        await api('/api/client-lists/' + list.id + '/members', {
          method: 'POST',
          body: { contact_ids: [selectedContactId] }
        });
        toast('success', 'Contact added', 'Member enrolled into ' + list.name);
        candWrap.style.display = 'none';
        candWrap.innerHTML = '';
        searchInput.value = '';
        selectedContactId = null;
        await reloadMembers();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Add member', err);
      } finally {
        addBtn.disabled = false;
      }
    });

    await reloadMembers();
  }

  async function viewClientLists(view, started) {
    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Client Lists &amp; Categorization</h2><p>Curated audience segments for targeted WhatsApp campaigns</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshLists">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="createListBtn">+ Create Client List</button></div></div>' +
      skTable(8);

    await settle(started);

    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Client Lists &amp; Categorization</h2><p>Curated audience segments for targeted WhatsApp campaigns</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshLists">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="createListBtn">+ Create Client List</button></div></div>' +
      '<div class="card"><div class="toolbar">' +
      '<input class="input input-search toolbar-search" type="search" id="listSearch" placeholder="Search list code, name or description" aria-label="Search client lists">' +
      '<select class="select toolbar-select" id="listCategory" aria-label="Filter by category"><option value="">All categories</option>' +
      optionList(CLIENT_LIST_CATEGORIES, state.clientLists.category) +
      '</select>' +
      '<span style="flex:1 1 auto"></span>' +
      '<span class="badge badge-mono" id="listTotalBadge">0 lists</span>' +
      '</div><div class="table-wrap" id="listTableWrap"></div>' +
      '<div class="table-foot" id="listFoot"></div></div>';

    var tableWrap = $('#listTableWrap', view);
    var foot = $('#listFoot', view);

    async function loadLists() {
      var startedAt = performance.now ? performance.now() : 0;
      tableWrap.innerHTML = skRows(6, 6);
      foot.innerHTML = '';

      var params = new URLSearchParams();
      params.set('page', String(state.clientLists.page));
      params.set('page_size', String(state.clientLists.pageSize));
      if (state.clientLists.category) params.set('category', state.clientLists.category);
      if (state.clientLists.query) params.set('q', state.clientLists.query);

      var data = await api('/api/client-lists?' + params.toString());
      await settle(startedAt);

      var rows = data.lists || [];
      state.clientLists.rows = rows;
      state.clientLists.total = num(data.total);

      var badge = $('#listTotalBadge', view);
      if (badge) badge.textContent = fmtInt(state.clientLists.total) + ' lists';

      if (!rows.length) {
        tableWrap.innerHTML = emptyState('folder', 'No client lists found', 'Create your first targeted client list or adjust search filters.', '<button class="btn btn-sm btn-primary" type="button" data-add-list>+ Create Client List</button>');
        var addBtn = $('[data-add-list]', tableWrap);
        if (addBtn) addBtn.addEventListener('click', function () { openClientListModal(null, loadLists); });
      } else {
        tableWrap.innerHTML =
          '<div class="sx-table-container">' +
          '<table class="table sx-data-table"><thead><tr>' +
          '<th>List Code</th><th>List Name &amp; Description</th><th>Category</th><th>Members</th><th>Auto-Match Rules</th><th>Created (IST)</th><th style="text-align:right">Actions</th>' +
          '</tr></thead><tbody>' +
          rows
            .map(function (list) {
              var catLabel = list.category ? String(list.category).replace(/_/g, ' ') : 'GENERAL';
              var rules = '';
              if (list.filter_rules_json) {
                try {
                  var parsed = JSON.parse(list.filter_rules_json);
                  var ruleParts = [];
                  if (parsed.sector) ruleParts.push('Sector: ' + parsed.sector);
                  if (parsed.district) ruleParts.push('Dist: ' + parsed.district);
                  if (parsed.enterprise_classification) ruleParts.push('Class: ' + parsed.enterprise_classification);
                  if (parsed.min_subsidy_lakhs) ruleParts.push('Min ' + fmtLakhs(parsed.min_subsidy_lakhs));
                  rules = ruleParts.join(' · ') || '—';
                } catch (e) {
                  rules = list.filter_rules_json;
                }
              } else {
                rules = '<span class="muted">Manual enrollment</span>';
              }
              return (
                '<tr>' +
                '<td class="mono" style="font-weight:700;color:' + esc(list.color_hex || '#4080E0') + ';">' + esc(list.list_code) + '</td>' +
                '<td><div style="font-weight:600;color:#1D1C41;font-size:13px;">' + esc(list.name) + '</div>' +
                (list.description ? '<div style="font-size:11px;color:#5C636A;margin-top:2px;">' + esc(list.description) + '</div>' : '') + '</td>' +
                '<td><span class="badge badge-primary" style="font-size:11px;">' + esc(catLabel) + '</span></td>' +
                '<td><span class="badge badge-mono" style="font-weight:700;font-size:12px;">' + fmtInt(list.member_count) + ' clients</span></td>' +
                '<td style="font-size:11.5px;color:#333;">' + rules + '</td>' +
                '<td>' + formatStackedDateTime(list.created_at) + '</td>' +
                '<td><div class="table-actions">' +
                '<button class="btn btn-sm" type="button" title="Manage Members" data-members="' + num(list.id) + '">Members</button>' +
                '<button class="icon-btn" type="button" title="Edit List" data-edit-list="' + num(list.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.edit + '</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete List" data-del-list="' + num(list.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button>' +
                '</div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';
      }

      renderListFoot();
      wireListRows();
    }

    function renderListFoot() {
      foot.innerHTML = renderPaginationFooter(state.clientLists.page, state.clientLists.pageSize, state.clientLists.total, 'data-list-page');
      $$('[data-list-page]', foot).forEach(function (button) {
        button.addEventListener('click', function () {
          var targetPage = Number(button.getAttribute('data-list-page'));
          if (!targetPage || button.disabled) return;
          state.clientLists.page = targetPage;
          loadLists().catch(function (error) { apiErrorMessage('Client Lists', error); });
        });
      });
    }

    function wireListRows() {
      $$('[data-members]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var listId = Number(button.getAttribute('data-members'));
          var list = state.clientLists.rows.find(function (r) { return num(r.id) === listId; });
          if (list) openManageMembersModal(list, loadLists);
        });
      });

      $$('[data-edit-list]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var listId = Number(button.getAttribute('data-edit-list'));
          var list = state.clientLists.rows.find(function (r) { return num(r.id) === listId; });
          if (list) openClientListModal(list, loadLists);
        });
      });

      $$('[data-del-list]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var listId = Number(button.getAttribute('data-del-list'));
          var list = state.clientLists.rows.find(function (r) { return num(r.id) === listId; });
          if (!list) return;
          confirmAction(
            'Delete Client List?',
            "'" + list.name + "' will be removed. The underlying HNI contacts will not be deleted.",
            'Delete List',
            async function () {
              try {
                await api('/api/client-lists/' + list.id, { method: 'DELETE' });
                toast('success', 'List deleted', list.name + ' removed.');
                await loadLists();
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

    $('#listSearch', view).addEventListener('input', debounce(function () {
      state.clientLists.query = this.value.trim();
      state.clientLists.page = 1;
      loadLists().catch(function (error) { apiErrorMessage('Search', error); });
    }, 260));

    $('#listCategory', view).addEventListener('change', function () {
      state.clientLists.category = this.value;
      state.clientLists.page = 1;
      loadLists().catch(function (error) { apiErrorMessage('Filter', error); });
    });

    $('#refreshLists', view).addEventListener('click', function () {
      loadLists().then(function () { toast('success', 'Synced', 'Client lists refreshed.'); }, function (err) { apiErrorMessage('Refresh', err); });
    });

    $('#createListBtn', view).addEventListener('click', function () {
      openClientListModal(null, loadLists);
    });

    await loadLists();
  }

  /* ------------------------------------------------------------------ leads */

  function leadPlatformBadge(platform) {
    platform = String(platform || '').toUpperCase();
    var style = 'background:#E2E8F0;color:#1D1C41;';
    var label = platform;
    if (platform === 'INSTAGRAM') {
      style = 'background:#FCE7F3;color:#BE185D;';
      label = 'Instagram';
    } else if (platform === 'FACEBOOK') {
      style = 'background:#DBEAFE;color:#1D4ED8;';
      label = 'Facebook';
    } else if (platform === 'GOOGLE_FORMS') {
      style = 'background:#DCFCE7;color:#15803D;';
      label = 'Google Forms';
    } else if (platform === 'WHATSAPP') {
      style = 'background:#D1FAE5;color:#047857;';
      label = 'WhatsApp';
    }
    return '<span class="badge" style="' + style + 'font-weight:600;font-size:11px;">' + esc(label) + '</span>';
  }

  function leadStageBadge(stage) {
    stage = String(stage || '').toUpperCase();
    var badgeClass = 'badge-neutral';
    var label = stage;
    if (stage === 'NEW') {
      badgeClass = 'badge-primary';
      label = 'New';
    } else if (stage === 'CONTACTED') {
      badgeClass = 'badge-accent';
      label = 'Contacted';
    } else if (stage === 'QUALIFIED') {
      badgeClass = 'badge-blue';
      label = 'Qualified';
    } else if (stage === 'DOCUMENTS_COLLECTED') {
      badgeClass = 'badge-purple';
      label = 'Docs In';
    } else if (stage === 'CONVERTED') {
      badgeClass = 'badge-green';
      label = 'Converted';
    } else if (stage === 'ARCHIVED') {
      badgeClass = 'badge-neutral';
      label = 'Archived';
    }
    return '<span class="badge ' + badgeClass + '" style="font-size:11px;">' + esc(label) + '</span>';
  }

  function leadPriorityBadge(priority) {
    priority = String(priority || '').toUpperCase();
    var color = '#64748B';
    if (priority === 'HIGH') color = '#DC2626';
    else if (priority === 'MEDIUM') color = '#D97706';
    else if (priority === 'LOW') color = '#2563EB';
    return '<span style="font-size:11px;font-weight:700;color:' + color + ';">' + esc(priority) + '</span>';
  }

  function leadForm(lead) {
    lead = lead || {};
    return (
      '<div class="form-row"><div class="field"><label for="lf-name">Full Name</label><input class="input" id="lf-name" value="' +
      esc(lead.full_name || '') +
      '" placeholder="e.g. Ramesh Patel"></div>' +
      '<div class="field"><label for="lf-company">Company Name</label><input class="input" id="lf-company" value="' +
      esc(lead.company_name || '') +
      '" placeholder="e.g. Patel Synthetic Fibres LLP"></div></div>' +
      '<div class="form-row"><div class="field"><label for="lf-phone">Mobile Phone (10 digits)</label><input class="input" id="lf-phone" value="' +
      esc(lead.phone_number ? lead.phone_number.replace(/^\+91/, '') : '') +
      '" placeholder="9876543210" maxlength="10" inputmode="numeric"></div>' +
      '<div class="field"><label for="lf-email">Email (Optional)</label><input class="input" id="lf-email" type="email" value="' +
      esc(lead.email || '') +
      '" placeholder="contact@example.com"></div></div>' +
      '<div class="form-row"><div class="field"><label for="lf-platform">Source Channel</label><select class="select" id="lf-platform">' +
      optionList(LEAD_PLATFORMS, lead.source_platform || 'INSTAGRAM') +
      '</select></div>' +
      '<div class="field"><label for="lf-campaign">Campaign / Ad / Form Reference</label><input class="input" id="lf-campaign" value="' +
      esc(lead.campaign_name || '') +
      '" placeholder="e.g. Textile Capital Subsidy Reel"></div></div>' +
      '<div class="form-row"><div class="field"><label for="lf-sector">Sector</label><select class="select" id="lf-sector">' +
      optionList(SECTORS, lead.sector || SECTORS[0]) +
      '</select></div>' +
      '<div class="field"><label for="lf-district">District</label><input class="input" id="lf-district" value="' +
      esc(lead.district || 'Surat') +
      '" placeholder="e.g. Surat, Ahmedabad"></div></div>' +
      '<div class="form-row"><div class="field"><label for="lf-invest">Estimated Investment (₹ Lakhs)</label><input class="input" id="lf-invest" type="number" value="' +
      (lead.estimated_investment_lakhs || 0) +
      '"></div>' +
      '<div class="field"><label for="lf-subsidy">Estimated Subsidy (₹ Lakhs)</label><input class="input" id="lf-subsidy" type="number" value="' +
      (lead.estimated_subsidy_lakhs || 0) +
      '"></div></div>' +
      '<div class="form-row"><div class="field"><label for="lf-stage">Lead Stage</label><select class="select" id="lf-stage">' +
      optionList(LEAD_STAGES, lead.lead_stage || 'NEW') +
      '</select></div>' +
      '<div class="field"><label for="lf-priority">Priority</label><select class="select" id="lf-priority">' +
      optionList(LEAD_PRIORITIES, lead.priority || 'MEDIUM') +
      '</select></div></div>' +
      '<div class="field"><label for="lf-notes">Notes / Requirements</label><textarea class="textarea" id="lf-notes" rows="3" placeholder="Client subsidy inquiry details or CA discussion points">' +
      esc(lead.notes || '') +
      '</textarea></div>'
    );
  }

  function openLeadModal(lead, onSaved) {
    var isEdit = !!lead;
    var dialog = openModal({
      title: isEdit ? 'Edit Inbound Lead' : 'Add Inbound Lead',
      subtitle: isEdit ? lead.lead_code + ' · ' + lead.full_name : 'Manual capture or simulate external lead intake',
      wide: true,
      body: leadForm(lead),
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-save-lead>' +
        (isEdit ? 'Save Changes' : 'Record Lead') +
        '</button>'
    });
    if (!dialog) return;

    $('[data-save-lead]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var name = $('#lf-name', dialog.root).value.trim();
      var company = $('#lf-company', dialog.root).value.trim();
      var phone = $('#lf-phone', dialog.root).value.trim();
      var email = $('#lf-email', dialog.root).value.trim() || null;
      var platform = $('#lf-platform', dialog.root).value;
      var campaignName = $('#lf-campaign', dialog.root).value.trim() || null;
      var sector = $('#lf-sector', dialog.root).value;
      var district = $('#lf-district', dialog.root).value.trim() || 'Gujarat';
      var invest = Number($('#lf-invest', dialog.root).value) || 0;
      var subsidy = Number($('#lf-subsidy', dialog.root).value) || 0;
      var stage = $('#lf-stage', dialog.root).value;
      var priority = $('#lf-priority', dialog.root).value;
      var notes = $('#lf-notes', dialog.root).value.trim() || null;

      if (!name || !phone) {
        toast('error', 'Name and Phone required', 'Please provide applicant name and mobile number.');
        return;
      }

      var payload = {
        full_name: name,
        company_name: company || name,
        phone_number: phone,
        email: email,
        source_platform: platform,
        campaign_name: campaignName,
        sector: sector,
        district: district,
        estimated_investment_lakhs: invest,
        estimated_subsidy_lakhs: subsidy,
        lead_stage: stage,
        priority: priority,
        notes: notes
      };

      btn.disabled = true;
      try {
        if (isEdit) {
          await api('/api/leads/' + lead.id, { method: 'PUT', body: payload });
          toast('success', 'Lead updated', name + ' updated.');
        } else {
          var res = await api('/api/leads', { method: 'POST', body: payload });
          toast('success', 'Lead recorded', res.message || 'New inbound lead added to CRM.');
        }
        dialog.close();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Lead', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function openConvertLeadModal(lead, onSaved) {
    var lists = [];
    try {
      var lres = await api('/api/client-lists?page=1&page_size=100');
      lists = lres.lists || [];
    } catch (e) {
      lists = [];
    }

    var listOptions = '<option value="">(None - HNI Book Only)</option>' +
      lists.map(function (l) { return '<option value="' + num(l.id) + '">' + esc(l.name) + ' (' + esc(l.list_code) + ')</option>'; }).join('');

    var dialog = openModal({
      title: 'Convert Lead to HNI Client',
      subtitle: lead.lead_code + ' · ' + lead.full_name + ' (' + esc(lead.company_name) + ')',
      body:
        '<div class="note-strip" style="margin-bottom:14px;">' + SVG_ICONS.sparkle + ' <span>Converts this inbound lead into an official HNI Client inquiry with active WhatsApp chat ledger and syncs to audience lists.</span></div>' +
        '<div class="field"><label for="cv-list">Target Audience Client List (Optional)</label><select class="select" id="cv-list">' + listOptions + '</select></div>' +
        '<div class="field" style="margin-top:12px;"><label for="cv-ca">Assign CA / Advisory Lead</label><input class="input" id="cv-ca" value="' + esc(lead.assigned_to_username || (state.user ? state.user.full_name : 'Nisarg Parsaniya')) + '"></div>',
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-do-convert>Convert &amp; Onboard Client</button>'
    });
    if (!dialog) return;

    $('[data-do-convert]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var targetListId = Number($('#cv-list', dialog.root).value) || null;
      var assignedCa = $('#cv-ca', dialog.root).value.trim();

      btn.disabled = true;
      try {
        var res = await api('/api/leads/' + lead.id + '/convert', {
          method: 'POST',
          body: {
            target_list_id: targetListId,
            assigned_ca: assignedCa
          }
        });
        toast('success', 'Client Onboarded', res.message || 'Lead converted successfully!');
        dialog.close();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Convert', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function viewLeads(view, started) {
    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Omnichannel Lead CRM</h2><p>Inbound leads from Instagram, Facebook, Google Forms &amp; WhatsApp</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshLeads">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="createLeadBtn">+ Add Inbound Lead</button></div></div>' +
      skCards('flow-grid', 5) +
      skTable(9);

    await settle(started);

    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Omnichannel Lead CRM</h2><p>Inbound leads from Instagram, Facebook, Google Forms &amp; WhatsApp</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshLeads">\u21BB Refresh</button>' +
      '<button class="btn btn-sm btn-primary" type="button" id="createLeadBtn">+ Add Inbound Lead</button></div></div>' +
      '<div class="kpi-grid" id="leadKpiGrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">' +
      '</div>' +
      '<div class="card"><div class="toolbar">' +
      '<input class="input input-search toolbar-search" type="search" id="leadSearch" placeholder="Search lead code, name, company, phone" aria-label="Search leads">' +
      '<select class="select toolbar-select" id="leadPlatform" aria-label="Filter by channel"><option value="">All channels</option>' +
      optionList(LEAD_PLATFORMS, state.leads.platform) +
      '</select>' +
      '<select class="select toolbar-select" id="leadStage" aria-label="Filter by stage"><option value="">All stages</option>' +
      optionList(LEAD_STAGES, state.leads.stage) +
      '</select>' +
      '<select class="select toolbar-select" id="leadPriority" aria-label="Filter by priority"><option value="">All priorities</option>' +
      optionList(LEAD_PRIORITIES, state.leads.priority) +
      '</select>' +
      '<span style="flex:1 1 auto"></span>' +
      '<span class="badge badge-mono" id="leadTotalBadge">0 leads</span>' +
      '</div><div class="table-wrap" id="leadTableWrap"></div>' +
      '<div class="table-foot" id="leadFoot"></div></div>';

    var kpiGrid = $('#leadKpiGrid', view);
    var tableWrap = $('#leadTableWrap', view);
    var foot = $('#leadFoot', view);

    async function loadLeads() {
      var startedAt = performance.now ? performance.now() : 0;
      tableWrap.innerHTML = skRows(6, 7);
      foot.innerHTML = '';

      var params = new URLSearchParams();
      params.set('page', String(state.leads.page));
      params.set('page_size', String(state.leads.pageSize));
      if (state.leads.platform) params.set('source_platform', state.leads.platform);
      if (state.leads.stage) params.set('lead_stage', state.leads.stage);
      if (state.leads.priority) params.set('priority', state.leads.priority);
      if (state.leads.query) params.set('q', state.leads.query);

      var data = await api('/api/leads?' + params.toString());
      await settle(startedAt);

      var rows = data.leads || [];
      state.leads.rows = rows;
      state.leads.total = num(data.total);
      var counts = data.platform_counts || { total: 0, instagram: 0, facebook: 0, google_forms: 0, converted: 0 };

      kpiGrid.innerHTML =
        '<div class="card" style="padding:14px;"><div style="font-size:11.5px;color:#64748B;font-weight:600;">Total Inbound Leads</div><div style="font-size:22px;font-weight:700;color:#1D1C41;margin-top:4px;">' + fmtInt(counts.total) + '</div></div>' +
        '<div class="card" style="padding:14px;"><div style="font-size:11.5px;color:#BE185D;font-weight:600;">Instagram Leads</div><div style="font-size:22px;font-weight:700;color:#BE185D;margin-top:4px;">' + fmtInt(counts.instagram) + '</div></div>' +
        '<div class="card" style="padding:14px;"><div style="font-size:11.5px;color:#1D4ED8;font-weight:600;">Facebook Lead Ads</div><div style="font-size:22px;font-weight:700;color:#1D4ED8;margin-top:4px;">' + fmtInt(counts.facebook) + '</div></div>' +
        '<div class="card" style="padding:14px;"><div style="font-size:11.5px;color:#15803D;font-weight:600;">Google Forms</div><div style="font-size:22px;font-weight:700;color:#15803D;margin-top:4px;">' + fmtInt(counts.google_forms) + '</div></div>' +
        '<div class="card" style="padding:14px;"><div style="font-size:11.5px;color:#0F766E;font-weight:600;">Converted to HNI</div><div style="font-size:22px;font-weight:700;color:#0F766E;margin-top:4px;">' + fmtInt(counts.converted) + '</div></div>';

      var badge = $('#leadTotalBadge', view);
      if (badge) badge.textContent = fmtInt(state.leads.total) + ' leads';

      if (!rows.length) {
        tableWrap.innerHTML = emptyState('sparkle', 'No leads match filters', 'Inbound leads from ad campaigns and forms will show up here.', '<button class="btn btn-sm btn-primary" type="button" data-add-lead>+ Add Lead</button>');
        var addBtn = $('[data-add-lead]', tableWrap);
        if (addBtn) addBtn.addEventListener('click', function () { openLeadModal(null, loadLeads); });
      } else {
        tableWrap.innerHTML =
          '<div class="sx-table-container">' +
          '<table class="table sx-data-table"><thead><tr>' +
          '<th>Lead Code</th><th>Applicant &amp; Company</th><th>Channel &amp; Phone</th><th>Sector &amp; District</th><th>Est. Subsidy</th><th>Stage</th><th>Priority</th><th>Advisor</th><th>Created (IST)</th><th style="text-align:right">Actions</th>' +
          '</tr></thead><tbody>' +
          rows
            .map(function (lead) {
              var isConverted = lead.lead_stage === 'CONVERTED';
              return (
                '<tr>' +
                '<td class="mono" style="font-weight:700;color:#F86030;">' + esc(lead.lead_code) + '</td>' +
                '<td><div style="font-weight:600;color:#1D1C41;font-size:13px;">' + esc(lead.full_name) + '</div>' +
                '<div style="font-size:11px;color:#5C636A;">' + esc(lead.company_name || 'Individual') + '</div></td>' +
                '<td><div>' + leadPlatformBadge(lead.source_platform) + '</div>' +
                '<div class="mono" style="font-size:11px;color:#1D1C41;margin-top:2px;">' + esc(lead.phone_number) + '</div></td>' +
                '<td><div style="font-weight:500;color:#1D1C41;">' + esc(lead.sector || '—') + '</div>' +
                '<div style="font-size:10.5px;color:#64748B;">' + esc(lead.district || 'Gujarat') + '</div></td>' +
                '<td class="num" style="font-weight:700;color:#1D1C41;">' + esc(fmtLakhs(lead.estimated_subsidy_lakhs)) + '</td>' +
                '<td>' + leadStageBadge(lead.lead_stage) + '</td>' +
                '<td>' + leadPriorityBadge(lead.priority) + '</td>' +
                '<td><span style="font-size:11.5px;font-weight:600;color:#1D1C41;">' + esc(lead.assigned_to_username || 'Unassigned') + '</span></td>' +
                '<td>' + formatStackedDateTime(lead.created_at_ist) + '</td>' +
                '<td><div class="table-actions">' +
                (!isConverted
                  ? '<button class="btn btn-sm btn-primary" type="button" title="Convert to HNI Client" data-convert="' + num(lead.id) + '">Convert</button>'
                  : '<span class="badge badge-green" style="font-size:10.5px;">Client #' + esc(lead.converted_contact_id || 'OK') + '</span>') +
                '<button class="icon-btn" type="button" title="Edit Lead" data-edit-lead="' + num(lead.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.edit + '</button>' +
                '<button class="icon-btn is-danger" type="button" title="Delete Lead" data-del-lead="' + num(lead.id) + '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button>' +
                '</div></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';
      }

      renderLeadFoot();
      wireLeadRows();
    }

    function renderLeadFoot() {
      foot.innerHTML = renderPaginationFooter(state.leads.page, state.leads.pageSize, state.leads.total, 'data-lead-page');
      $$('[data-lead-page]', foot).forEach(function (button) {
        button.addEventListener('click', function () {
          var targetPage = Number(button.getAttribute('data-lead-page'));
          if (!targetPage || button.disabled) return;
          state.leads.page = targetPage;
          loadLeads().catch(function (error) { apiErrorMessage('Leads', error); });
        });
      });
    }

    function wireLeadRows() {
      $$('[data-convert]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var leadId = Number(button.getAttribute('data-convert'));
          var lead = state.leads.rows.find(function (r) { return num(r.id) === leadId; });
          if (lead) openConvertLeadModal(lead, loadLeads);
        });
      });

      $$('[data-edit-lead]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var leadId = Number(button.getAttribute('data-edit-lead'));
          var lead = state.leads.rows.find(function (r) { return num(r.id) === leadId; });
          if (lead) openLeadModal(lead, loadLeads);
        });
      });

      $$('[data-del-lead]', tableWrap).forEach(function (button) {
        button.addEventListener('click', function () {
          var leadId = Number(button.getAttribute('data-del-lead'));
          var lead = state.leads.rows.find(function (r) { return num(r.id) === leadId; });
          if (!lead) return;
          confirmAction(
            'Delete Lead?',
            "'" + lead.full_name + "' (" + lead.lead_code + ") will be removed from CRM.",
            'Delete Lead',
            async function () {
              try {
                await api('/api/leads/' + lead.id, { method: 'DELETE' });
                toast('success', 'Lead deleted', lead.full_name + ' removed.');
                await loadLeads();
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

    $('#leadSearch', view).addEventListener('input', debounce(function () {
      state.leads.query = this.value.trim();
      state.leads.page = 1;
      loadLeads().catch(function (error) { apiErrorMessage('Search', error); });
    }, 260));

    $('#leadPlatform', view).addEventListener('change', function () {
      state.leads.platform = this.value;
      state.leads.page = 1;
      loadLeads().catch(function (error) { apiErrorMessage('Filter', error); });
    });

    $('#leadStage', view).addEventListener('change', function () {
      state.leads.stage = this.value;
      state.leads.page = 1;
      loadLeads().catch(function (error) { apiErrorMessage('Filter', error); });
    });

    $('#leadPriority', view).addEventListener('change', function () {
      state.leads.priority = this.value;
      state.leads.page = 1;
      loadLeads().catch(function (error) { apiErrorMessage('Filter', error); });
    });

    $('#refreshLeads', view).addEventListener('click', function () {
      loadLeads().then(function () { toast('success', 'Synced', 'Inbound leads refreshed.'); }, function (err) { apiErrorMessage('Refresh', err); });
    });

    $('#createLeadBtn', view).addEventListener('click', function () {
      openLeadModal(null, loadLeads);
    });

    await loadLeads();
  }

  /* ----------------------------------------------------------- integrations */

  function channelCard(channel, onSimulate, onConfig) {
    var isConnected = !!channel.is_connected;
    var badgeColor = isConnected ? '#15803D' : '#64748B';
    var webhookUrl = window.location.origin + '/api/integrations/webhooks/' + (channel.platform === 'GOOGLE_FORMS' ? 'google-forms' : channel.platform.toLowerCase());
    return (
      '<div class="card" style="padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
      '<div>' + leadPlatformBadge(channel.platform) + '<strong style="display:block;margin-top:6px;font-size:14px;color:#1D1C41;">' + esc(channel.display_name) + '</strong></div>' +
      '<span class="badge" style="background:' + (isConnected ? '#DCFCE7' : '#F1F5F9') + ';color:' + badgeColor + ';font-size:11px;font-weight:700;">' + (isConnected ? 'Active &amp; Connected' : 'Inactive') + '</span>' +
      '</div>' +
      '<div style="font-size:11.5px;color:#64748B;margin-bottom:6px;"><strong>Endpoint:</strong> <span class="mono" style="font-size:10.5px;color:#1D1C41;">' + esc(webhookUrl) + '</span></div>' +
      '<div style="font-size:11.5px;color:#64748B;margin-bottom:6px;"><strong>Account/Form ID:</strong> <span class="mono">' + esc(channel.account_or_form_id || 'Not set') + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid #E2E8F0;">' +
      '<div><span style="font-size:11px;color:#64748B;">Synced: </span><strong style="font-size:13px;color:#1D1C41;">' + fmtInt(channel.total_leads_synced) + ' leads</strong></div>' +
      '<div style="display:flex;gap:6px;">' +
      '<button class="btn btn-sm" type="button" data-sim-chan="' + esc(channel.platform) + '">Simulate Lead</button>' +
      '<button class="btn btn-sm btn-primary" type="button" data-cfg-chan="' + esc(channel.platform) + '">Configure</button>' +
      '</div></div>' +
      '</div>'
    );
  }

  function openChannelConfigModal(channel, onSaved) {
    var dialog = openModal({
      title: 'Configure ' + channel.display_name,
      subtitle: channel.platform + ' Webhook & Lead Sync Settings',
      body:
        '<div class="field"><label for="ch-name">Display Name</label><input class="input" id="ch-name" value="' + esc(channel.display_name || '') + '"></div>' +
        '<div class="field" style="margin-top:10px;"><label for="ch-acc">Account ID / Form ID / Form URL</label><input class="input" id="ch-acc" value="' + esc(channel.account_or_form_id || '') + '"></div>' +
        '<div class="field" style="margin-top:10px;"><label for="ch-tok">Webhook Verify Token</label><input class="input" id="ch-tok" value="' + esc(channel.webhook_verify_token || '') + '"></div>' +
        '<div style="margin-top:12px;"><label class="switch"><input type="checkbox" id="ch-wel"' + (channel.auto_send_welcome ? ' checked' : '') + '><span class="switch-track"></span><span class="switch-label">Auto-send WhatsApp Welcome message to incoming leads</span></label></div>' +
        '<div style="margin-top:10px;"><label class="switch"><input type="checkbox" id="ch-conn"' + (channel.is_connected ? ' checked' : '') + '><span class="switch-track"></span><span class="switch-label">Channel connection enabled</span></label></div>',
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-save-chan>Save Configuration</button>'
    });
    if (!dialog) return;

    $('[data-save-chan]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var payload = {
        display_name: $('#ch-name', dialog.root).value.trim(),
        account_or_form_id: $('#ch-acc', dialog.root).value.trim(),
        webhook_verify_token: $('#ch-tok', dialog.root).value.trim(),
        auto_send_welcome: $('#ch-wel', dialog.root).checked,
        is_connected: $('#ch-conn', dialog.root).checked
      };

      btn.disabled = true;
      try {
        await api('/api/integrations/channels/' + channel.platform, { method: 'PUT', body: payload });
        toast('success', 'Channel updated', channel.display_name + ' configuration saved.');
        dialog.close();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Channel config', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  function openSocialPostModal(post, onSaved) {
    var dialog = openModal({
      title: 'Register Social Post or Google Form',
      subtitle: 'Track incoming leads by social campaign post or web form',
      wide: true,
      body:
        '<div class="form-row"><div class="field"><label for="sp-platform">Platform</label><select class="select" id="sp-platform">' +
        optionList([['INSTAGRAM', 'Instagram Business'], ['FACEBOOK', 'Facebook Lead Ads'], ['GOOGLE_FORMS', 'Google Forms']], 'INSTAGRAM') +
        '</select></div>' +
        '<div class="field"><label for="sp-title">Campaign Title</label><input class="input" id="sp-title" placeholder="e.g. Viksit Gujarat 2026 Textile Reel"></div></div>' +
        '<div class="form-row"><div class="field"><label for="sp-sector">Target Sector</label><select class="select" id="sp-sector">' +
        optionList(SECTORS, SECTORS[0]) +
        '</select></div>' +
        '<div class="field"><label for="sp-url">Landing or Form URL</label><input class="input" id="sp-url" placeholder="https://forms.gle/... or https://instagram.com/p/..."></div></div>' +
        '<div class="field"><label for="sp-caption">Post Caption or Form Description</label><textarea class="textarea" id="sp-caption" rows="3" placeholder="Promotional caption, subsidy bullet points and call to action"></textarea></div>',
      footer:
        '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
        '<button class="btn btn-sm btn-primary" type="button" data-save-sp>Register Channel Post</button>'
    });
    if (!dialog) return;

    $('[data-save-sp]', dialog.root).addEventListener('click', async function () {
      var btn = this;
      var title = $('#sp-title', dialog.root).value.trim();
      var platform = $('#sp-platform', dialog.root).value;
      var sector = $('#sp-sector', dialog.root).value;
      var url = $('#sp-url', dialog.root).value.trim();
      var caption = $('#sp-caption', dialog.root).value.trim();

      if (!title) {
        toast('error', 'Title required', 'Please provide a campaign post or form title.');
        return;
      }

      btn.disabled = true;
      try {
        await api('/api/integrations/posts', {
          method: 'POST',
          body: {
            title: title,
            platform: platform,
            target_sector: sector,
            landing_or_form_url: url,
            content_caption: caption,
            status: 'PUBLISHED'
          }
        });
        toast('success', 'Post registered', title + ' added to tracker.');
        dialog.close();
        if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        apiErrorMessage('Post registration', err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function viewIntegrations(view, started) {
    view.innerHTML =
      '<div class="section-head"><div class="section-head-text"><h2>Ad &amp; Form Channels</h2><p>Omnichannel lead ingestion with dedicated hubs for Instagram, Facebook and Google Forms</p></div><div class="section-head-actions">' +
      '<button class="btn btn-sm" type="button" id="refreshIntegrations">\u21BB Refresh</button>' +
      '</div></div>' +
      '<div class="channel-tabs" style="display:flex;gap:8px;margin-bottom:18px;border-bottom:1px solid #E2E8F0;padding-bottom:10px;">' +
      '  <button class="btn btn-sm' + (state.integrations.activeTab === 'INSTAGRAM' ? ' btn-primary' : '') + '" type="button" data-chan-tab="INSTAGRAM">Instagram Lead Hub</button>' +
      '  <button class="btn btn-sm' + (state.integrations.activeTab === 'FACEBOOK' ? ' btn-primary' : '') + '" type="button" data-chan-tab="FACEBOOK">Facebook Lead Ads</button>' +
      '  <button class="btn btn-sm' + (state.integrations.activeTab === 'GOOGLE_FORMS' ? ' btn-primary' : '') + '" type="button" data-chan-tab="GOOGLE_FORMS">Google Forms Integration</button>' +
      '</div>' +
      '<div id="activeChannelCardWrap" style="margin-bottom:20px;"></div>' +
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2 id="postsSectionTitle">Registered Campaigns &amp; Forms</h2><p id="postsSectionSubtitle">Attributed creative assets and inbound conversion counter</p></div>' +
      '<button class="btn btn-sm btn-primary" type="button" id="registerPostBtn">+ Register Asset / Form</button></div>' +
      '<div class="table-wrap" id="postsTableWrap"></div>' +
      '<div class="table-foot" id="postsFoot"></div></div>';

    var activeCardWrap = $('#activeChannelCardWrap', view);
    var postsTableWrap = $('#postsTableWrap', view);
    var postsFoot = $('#postsFoot', view);
    var postsTitle = $('#postsSectionTitle', view);
    var postsSubtitle = $('#postsSectionSubtitle', view);

    async function loadData() {
      var startedAt = performance.now ? performance.now() : 0;
      activeCardWrap.innerHTML = '<div class="sk-block skeleton-shimmer" style="height:140px;border-radius:10px;"></div>';
      postsTableWrap.innerHTML = skRows(5, 6);

      var activeTab = state.integrations.activeTab || 'INSTAGRAM';
      var titleMap = {
        INSTAGRAM: ['Instagram Campaign Reels & Posts', 'Track lead generation and comments from Instagram campaigns'],
        FACEBOOK: ['Facebook Lead Ad Campaigns', 'Attributed Meta Instant Forms and lead generation ads'],
        GOOGLE_FORMS: ['Registered Google Forms', 'Form endpoints and Google Apps Script inbound submissions']
      };
      if (postsTitle && titleMap[activeTab]) postsTitle.textContent = titleMap[activeTab][0];
      if (postsSubtitle && titleMap[activeTab]) postsSubtitle.textContent = titleMap[activeTab][1];

      try {
        var [channelsRes, postsData] = await Promise.all([
          api('/api/integrations/channels'),
          api('/api/integrations/posts?platform=' + activeTab + '&page=' + state.integrations.postsPage + '&page_size=10')
        ]);
        await settle(startedAt);

        state.integrations.channels = channelsRes.channels || [];
        state.integrations.posts = postsData.posts || [];
        state.integrations.postsTotal = num(postsData.total);

        var ch = state.integrations.channels.find(function (c) { return c.platform === activeTab; }) || {
          platform: activeTab,
          display_name: activeTab.replace(/_/g, ' '),
          is_connected: false,
          total_leads_synced: 0
        };

        var isConnected = !!ch.is_connected;
        var webhookUrl = window.location.origin + '/api/integrations/webhooks/' + (activeTab === 'GOOGLE_FORMS' ? 'google-forms' : activeTab.toLowerCase());

        activeCardWrap.innerHTML =
          '<div class="card" style="padding:18px;border-radius:10px;background:#FFFFFF;border:1px solid #E2E8F0;">' +
          '  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
          '    <div>' +
          '      <div style="display:flex;align-items:center;gap:8px;">' +
          leadPlatformBadge(ch.platform) +
          '        <strong style="font-size:15px;color:#1D1C41;">' + esc(ch.display_name) + '</strong>' +
          '      </div>' +
          '      <span style="font-size:11.5px;color:#64748B;display:block;margin-top:4px;">Direct channel gateway for inbound investor inquiries</span>' +
          '    </div>' +
          '    <span class="badge" style="background:' + (isConnected ? '#DCFCE7' : '#F1F5F9') + ';color:' + (isConnected ? '#15803D' : '#64748B') + ';font-size:11px;font-weight:700;">' + (isConnected ? 'Connected &amp; Live' : 'Not Connected') + '</span>' +
          '  </div>' +
          '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid #E2E8F0;font-size:12px;">' +
          '    <div><strong style="color:#64748B;font-size:11px;">Webhook / Receiver URL:</strong>' +
          '      <div class="mono" style="color:#1D1C41;word-break:break-all;font-size:11px;margin-top:2px;">' + esc(webhookUrl) + '</div>' +
          '    </div>' +
          '    <div><strong style="color:#64748B;font-size:11px;">Account / Form Identifier:</strong>' +
          '      <div class="mono" style="color:#1D1C41;font-size:11px;margin-top:2px;">' + esc(ch.account_or_form_id || 'Pending Setup') + '</div>' +
          '    </div>' +
          '  </div>' +
          '  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:10px;border-top:1px solid #E2E8F0;">' +
          '    <div><span style="font-size:12px;color:#64748B;">Total Synced Leads: </span><strong style="font-size:14px;color:#1D1C41;">' + fmtInt(ch.total_leads_synced) + ' leads</strong></div>' +
          '    <div style="display:flex;gap:8px;">' +
          (activeTab === 'GOOGLE_FORMS' ? '<button class="btn btn-sm" type="button" id="btnAppsScript">Apps Script Snippet</button>' : '') +
          '      <button class="btn btn-sm" type="button" id="btnSimulateChan">1-Click ' + esc(ch.display_name) + ' Simulator</button>' +
          '      <button class="btn btn-sm btn-primary" type="button" id="btnConfigChan">Configure Channel</button>' +
          '    </div>' +
          '  </div>' +
          '</div>';

        var btnConfig = $('#btnConfigChan', activeCardWrap);
        if (btnConfig) btnConfig.addEventListener('click', function () { openChannelConfigModal(ch, loadData); });

        var btnSim = $('#btnSimulateChan', activeCardWrap);
        if (btnSim) {
          btnSim.addEventListener('click', async function () {
            btnSim.disabled = true;
            try {
              var ep = '/api/integrations/webhooks/' + (activeTab === 'GOOGLE_FORMS' ? 'google-forms' : activeTab.toLowerCase());
              var testPayload = {
                lead_name: 'Simulated ' + activeTab + ' Lead',
                company_name: 'Gujarat Tech Enterprises',
                mobile_number: '9825' + String(Math.floor(100000 + Math.random() * 900000)),
                email: 'lead_' + Date.now() + '@example.com',
                sector: 'Textile Industry',
                district: 'Surat',
                estimated_investment_lakhs: 250,
                estimated_subsidy_lakhs: 75
              };
              var res = await api(ep, { method: 'POST', body: testPayload });
              toast('success', 'Lead Ingested', res.message || 'Simulated lead processed via webhook pipeline.');
              await loadData();
            } catch (err) {
              apiErrorMessage('Simulation', err);
            } finally {
              btnSim.disabled = false;
            }
          });
        }

        var btnApps = $('#btnAppsScript', activeCardWrap);
        if (btnApps) {
          btnApps.addEventListener('click', function () {
            var code = 'function onFormSubmit(e) {\n' +
              '  var responses = e.response.getItemResponses();\n' +
              '  var data = {\n' +
              '    lead_name: responses[0] ? responses[0].getResponse() : "Inbound Lead",\n' +
              '    mobile_number: responses[1] ? responses[1].getResponse() : "",\n' +
              '    email: responses[2] ? responses[2].getResponse() : "",\n' +
              '    company_name: responses[3] ? responses[3].getResponse() : "",\n' +
              '    sector: responses[4] ? responses[4].getResponse() : "Manufacturing"\n' +
              '  };\n' +
              '  var options = {\n' +
              '    method: "post",\n' +
              '    contentType: "application/json",\n' +
              '    payload: JSON.stringify(data)\n' +
              '  };\n' +
              '  UrlFetchApp.fetch("' + webhookUrl + '", options);\n' +
              '}';
            openModal({
              title: 'Google Forms Apps Script Snippet',
              subtitle: 'Paste this snippet in Google Form -> Extensions -> Apps Script -> Triggers (On form submit)',
              wide: true,
              body: '<textarea class="textarea mono-input" rows="12" readonly style="font-size:12px;background:#F8FAFC;">' + esc(code) + '</textarea>',
              footer: '<span class="spacer"></span><button class="btn btn-sm btn-primary" type="button" data-modal-close>Close</button>'
            });
          });
        }

        if (!state.integrations.posts.length) {
          postsTableWrap.innerHTML = emptyState('folder', 'No registered assets for ' + ch.display_name, 'Register your first campaign post or form link to track lead generation.', '<button class="btn btn-sm btn-primary" type="button" data-reg-first>+ Register Asset</button>');
          var regFirst = $('[data-reg-first]', postsTableWrap);
          if (regFirst) regFirst.addEventListener('click', function () { openSocialPostModal(null, loadData); });
        } else {
          postsTableWrap.innerHTML =
            '<div class="sx-table-container">' +
            '<table class="table sx-data-table"><thead><tr>' +
            '<th>Asset Code</th><th>Platform</th><th>Title &amp; Reference</th><th>Target Sector</th><th>Form / Landing URL</th><th>Leads Captured</th><th>Created (IST)</th>' +
            '</tr></thead><tbody>' +
            state.integrations.posts
              .map(function (post) {
                return (
                  '<tr>' +
                  '<td class="mono" style="font-weight:700;color:#F86030;">' + esc(post.post_code) + '</td>' +
                  '<td>' + leadPlatformBadge(post.platform) + '</td>' +
                  '<td><div style="font-weight:600;color:#1D1C41;font-size:13px;">' + esc(post.title) + '</div>' +
                  (post.content_caption ? '<div style="font-size:11px;color:#64748B;">' + esc(post.content_caption) + '</div>' : '') + '</td>' +
                  '<td>' + sectorBadge(post.target_sector) + '</td>' +
                  '<td>' + (post.landing_or_form_url ? '<a href="' + esc(post.landing_or_form_url) + '" target="_blank" rel="noopener" class="mono" style="font-size:11px;color:#2563EB;">' + esc(post.landing_or_form_url) + '</a>' : '<span class="muted">—</span>') + '</td>' +
                  '<td><span class="badge badge-mono" style="font-weight:700;font-size:12px;">' + fmtInt(post.leads_captured_count) + ' leads</span></td>' +
                  '<td>' + formatStackedDateTime(post.created_at) + '</td>' +
                  '</tr>'
                );
              })
              .join('') +
            '</tbody></table></div>';
        }

        postsFoot.innerHTML = renderPaginationFooter(state.integrations.postsPage, 10, state.integrations.postsTotal, 'data-sp-page');
        $$('[data-sp-page]', postsFoot).forEach(function (button) {
          button.addEventListener('click', function () {
            var targetPage = Number(button.getAttribute('data-sp-page'));
            if (!targetPage || button.disabled) return;
            state.integrations.postsPage = targetPage;
            loadData().catch(function (error) { apiErrorMessage('Posts', error); });
          });
        });
      } catch (err) {
        apiErrorMessage('Integrations', err);
      }
    }

    $$('[data-chan-tab]', view).forEach(function (tabBtn) {
      tabBtn.addEventListener('click', function () {
        var t = tabBtn.getAttribute('data-chan-tab');
        state.integrations.activeTab = t;
        state.integrations.postsPage = 1;
        $$('[data-chan-tab]', view).forEach(function (b) { b.classList.remove('btn-primary'); });
        tabBtn.classList.add('btn-primary');
        loadData();
      });
    });

    $('#refreshIntegrations', view).addEventListener('click', function () {
      loadData().then(function () { toast('success', 'Synced', 'Channel and posts refreshed.'); });
    });

    $('#registerPostBtn', view).addEventListener('click', function () {
      openSocialPostModal(null, loadData);
    });

    await loadData();
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
      (template.is_welcome_default ? '<span style="color:var(--orange);font-weight:700;">Default</span>' : '<span style="color:var(--ink-4);">Set Default</span>') +
      '</button><span class="spacer"></span>' +
      '<button class="btn btn-sm" type="button" data-edit-template="' +
      num(template.id) +
      '">Edit</button>' +
      '<button class="btn btn-sm btn-primary" type="button" data-use-template="' +
      num(template.id) +
      '">Use</button>' +
      '<button class="icon-btn is-danger" type="button" title="Delete template" data-delete-template="' +
      num(template.id) +
      '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button></div></article>'
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
    var results = await Promise.all([
      api('/api/templates?page=1&page_size=10'),
      api('/api/campaigns?page=1&page_size=10'),
      api('/api/contacts/segments'),
      api('/api/client-lists?page=1&page_size=100')
    ]);
    await settle(started);

    var templates = results[0].templates || [];
    var campaigns = results[1].campaigns || [];
    var funnel = results[1].funnel || { targeted: 0, sent: 0, delivered: 0, read: 0, replied: 0 };
    var segments = results[2].segments || [];
    var clientLists = results[3].lists || [];

    function renderTemplates() {
      var grid = $('#templateGrid', view);
      if (!grid) return;
      grid.innerHTML = templates.length
        ? templates.map(templateCard).join('')
        : emptyState('folder', 'No templates yet', 'Build your first approved WhatsApp template to unlock bulk campaigns.', '<button class="btn btn-sm btn-primary" type="button" data-new-template>New template</button>');

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
          toast('info', 'Template staged', 'Pick audience lists and launch or schedule when ready.');
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
              var isScheduled = campaign.status === 'SCHEDULED';
              var catBadge = campaign.campaign_category
                ? '<span class="badge badge-accent" style="font-size:10.5px;">' + esc(String(campaign.campaign_category).replace(/_/g, ' ')) + '</span>'
                : '';
              var scheduledInfo = isScheduled && campaign.scheduled_at_ist
                ? '<div style="font-size:11px;color:#2563EB;margin-top:2px;">Scheduled IST: ' + formatStackedDateTime(campaign.scheduled_at_ist) + '</div>'
                : '';
              var scheduleActions = isScheduled
                ? '<button class="btn btn-sm btn-primary" type="button" data-exec-now="' + num(campaign.id) + '">Execute Now</button>' +
                  '<button class="btn btn-sm" type="button" data-reschedule="' + num(campaign.id) + '">Reschedule</button>' +
                  '<button class="btn btn-sm is-danger" type="button" data-cancel-camp="' + num(campaign.id) + '">Cancel</button>'
                : '';
              return (
                '<div class="campaign-row" data-campaign="' +
                num(campaign.id) +
                '"><div class="campaign-top"><div class="campaign-title"><strong>' +
                esc(campaign.campaign_name) +
                '</strong><span>' +
                (catBadge ? catBadge + ' · ' : '') +
                esc(campaign.segment || 'Targeted Lists') +
                ' · ' +
                esc(campaign.template_name) +
                '</span>' +
                scheduledInfo +
                '</div>' +
                '<div>' + formatStackedDateTime(campaign.created_at) + '</div>' +
                statusBadge(campaign.status) +
                scheduleActions +
                (!isScheduled ? '<button class="btn btn-sm" type="button" data-advance="' + num(campaign.id) + '">Advance delivery</button>' : '') +
                '<button class="icon-btn is-danger" type="button" title="Delete campaign" data-drop-campaign="' +
                num(campaign.id) +
                '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button></div>' +
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
        : emptyState('broadcast', 'No campaigns launched', 'Pick a template and an audience list above to send or schedule a broadcast.');

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

      $$('[data-exec-now]', host).forEach(function (button) {
        button.addEventListener('click', async function () {
          var cid = button.getAttribute('data-exec-now');
          button.disabled = true;
          try {
            var res = await api('/api/campaigns/' + cid + '/execute-now', { method: 'POST' });
            toast('success', 'Execution started', res.message || 'Campaign is now sending.');
            var updated = await api('/api/campaigns?page=1&page_size=10');
            campaigns = updated.campaigns || campaigns;
            renderCampaigns();
            refreshLedger();
          } catch (e) {
            apiErrorMessage('Execute now', e);
            button.disabled = false;
          }
        });
      });

      $$('[data-reschedule]', host).forEach(function (button) {
        button.addEventListener('click', function () {
          var cid = Number(button.getAttribute('data-reschedule'));
          var campaign = campaigns.find(function (c) { return num(c.id) === cid; });
          if (!campaign) return;
          var dialog = openModal({
            title: 'Reschedule Campaign',
            subtitle: campaign.campaign_name,
            body: '<div class="field"><label for="resc-time">New Execution Date &amp; Time (IST)</label><input type="datetime-local" class="input" id="resc-time"></div>',
            footer: '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button><button class="btn btn-sm btn-primary" type="button" data-do-resc>Update Schedule</button>'
          });
          if (!dialog) return;
          $('[data-do-resc]', dialog.root).addEventListener('click', async function () {
            var newTime = $('#resc-time', dialog.root).value;
            if (!newTime) {
              toast('error', 'Select date and time', 'Choose a future date and time in IST.');
              return;
            }
            try {
              var res = await api('/api/campaigns/' + cid + '/schedule', { method: 'PATCH', body: { scheduled_at_ist: newTime } });
              toast('success', 'Campaign rescheduled', res.message || 'Scheduled time updated.');
              dialog.close();
              var updated = await api('/api/campaigns?page=1&page_size=10');
              campaigns = updated.campaigns || campaigns;
              renderCampaigns();
            } catch (err) {
              apiErrorMessage('Reschedule', err);
            }
          });
        });
      });

      $$('[data-cancel-camp]', host).forEach(function (button) {
        button.addEventListener('click', function () {
          var cid = Number(button.getAttribute('data-cancel-camp'));
          confirmAction(
            'Cancel Scheduled Campaign?',
            'The campaign will not be dispatched.',
            'Cancel Campaign',
            async function () {
              try {
                await api('/api/campaigns/' + cid + '/status', { method: 'PATCH', body: { status: 'CANCELLED' } });
                toast('success', 'Campaign cancelled', 'Scheduled broadcast has been cancelled.');
                var updated = await api('/api/campaigns?page=1&page_size=10');
                campaigns = updated.campaigns || campaigns;
                renderCampaigns();
              } catch (err) {
                apiErrorMessage('Cancel campaign', err);
                throw err;
              }
            },
            true
          );
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
            ' READ</span></div>';
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

    var listCheckboxesHtml = clientLists.length
      ? clientLists
          .map(function (l) {
            return (
              '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;background:#FFF;padding:5px 9px;border-radius:4px;border:1px solid #CBD5E1;cursor:pointer;">' +
              '<input type="checkbox" name="targetList" value="' + num(l.id) + '"> ' +
              '<span style="font-weight:600;color:#1D1C41;">' + esc(l.name) + '</span> ' +
              '<span class="badge badge-mono" style="font-size:10px;">' + fmtInt(l.member_count) + '</span>' +
              '</label>'
            );
          })
          .join('')
      : '<span class="muted" style="font-size:11.5px;">No client lists created yet. Head to Client Lists tab to create audience segments.</span>';

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

      '<div class="section-head" style="margin-top:22px"><div class="section-head-text"><h2>Campaign launcher &amp; scheduler</h2><p>Multi-list audience targeting, campaign categories, instant or scheduled broadcasts</p></div></div>' +
      '<div class="card"><div class="card-body"><div class="campaign-launcher"><div class="launch-form">' +
      '<div class="form-row"><div class="field"><label for="launchName">Campaign name</label><input class="input" id="launchName" placeholder="e.g. Diwali subsidy eligibility alert"></div>' +
      '<div class="field"><label for="launchTemplate">Template</label><select class="select" id="launchTemplate"></select></div></div>' +
      '<div class="form-row"><div class="field"><label for="launchCategory">Campaign Category</label><select class="select" id="launchCategory">' +
      optionList(CAMPAIGN_CATEGORIES, 'SUBSIDY_SCHEME_LAUNCH') +
      '</select></div>' +
      '<div class="field"><label for="launchSegment">Segment Filter</label><select class="select" id="launchSegment"></select></div></div>' +
      '<div class="field" style="margin-top:4px;"><label style="display:flex;justify-content:space-between;align-items:center;"><span>Target Audience Client Lists (Multi-Selection)</span><span class="muted" style="font-size:11px;">Select multiple lists or leave blank to use Segment Filter</span></label>' +
      '<div class="client-lists-checkboxes" id="launchListsWrap" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;max-height:120px;overflow-y:auto;padding:8px;background:#F8FAFC;border:1px solid #CBD5E1;border-radius:6px;">' +
      listCheckboxesHtml +
      '</div></div>' +
      '<div class="form-row" style="margin-top:8px;align-items:flex-end;"><div class="field"><label>Dispatch Timing</label>' +
      '<div style="display:flex;gap:16px;margin-top:6px;">' +
      '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;"><input type="radio" name="timingType" value="IMMEDIATE" checked> <span>Send Immediately</span></label>' +
      '<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;"><input type="radio" name="timingType" value="SCHEDULED"> <span>Schedule for Later (IST)</span></label>' +
      '</div></div>' +
      '<div class="field" id="schedTimeWrap" style="display:none;"><label for="launchSchedTime">Scheduled Date &amp; Time (IST)</label><input class="input" type="datetime-local" id="launchSchedTime"></div>' +
      '<div class="field"><label for="launchTag">Extra tag filter (optional)</label><input class="input" id="launchTag" placeholder="e.g. Textile Lead"></div></div>' +
      '<div class="target-pill" style="margin-top:10px;"><span style="display:inline-flex;align-items:center;margin-right:4px;">' + SVG_ICONS.broadcast + '</span><span id="targetLabel">segment</span><strong id="targetCount">0</strong> opted-in HNI clients<span class="spacer"></span><span class="mono">est. ' +
      esc(fmtLakhs(funnel.targeted ? funnel.delivered : 0)) +
      ' delivered historically</span></div>' +
      '<div class="io-actions" style="margin-top:12px;"><button class="btn btn-primary" type="button" id="launchBtn" style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.broadcast + ' Launch / Schedule Campaign</button>' +
      '<button class="btn btn-sm" type="button" id="saveDraft">Preview only</button>' +
      '<span class="field-hint" style="margin-left:auto">Mock mode simulates Meta delivery; LIVE mode uses the official Cloud API.</span></div>' +
      '</div>' +
      '<div><div class="phone"><div class="phone-notch"></div><div class="phone-screen"><div class="wa-head"><span class="wa-avatar">SX</span>' +
      '<div class="wa-head-text"><strong>SubsidyX Advisory</strong><span>Official business account</span></div></div>' +
      '<div class="wa-body" id="waBubble"></div></div></div></div></div></div></div></div>' +

      '<div class="section-head" style="margin-top:22px"><div class="section-head-text"><h2>Campaign performance &amp; schedule</h2><p>Send, delivery, read, reply counters and scheduled queue</p></div>' +
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

    $$('input[name="timingType"]', view).forEach(function (radio) {
      radio.addEventListener('change', function () {
        var schedWrap = $('#schedTimeWrap', view);
        if (schedWrap) {
          schedWrap.style.display = this.value === 'SCHEDULED' ? 'block' : 'none';
        }
      });
    });

    $('#newTemplate', view).addEventListener('click', function () {
      openTemplateModal(null);
    });
    $('#refreshTemplates', view).addEventListener('click', function () {
      Promise.all([
        api('/api/templates?page=1&page_size=10'),
        api('/api/contacts/segments'),
        api('/api/campaigns?page=1&page_size=10'),
        api('/api/client-lists?page=1&page_size=100')
      ]).then(
        function (refreshed) {
          templates = refreshed[0].templates || [];
          segments = refreshed[1].segments || [];
          campaigns = refreshed[2].campaigns || [];
          funnel = refreshed[2].funnel || funnel;
          clientLists = refreshed[3].lists || [];
          renderTemplates();
          renderTemplateSelect();
          renderSegments();
          renderCampaigns();
          toast('success', 'Studio synced', 'Templates, segments, audience lists and campaigns refreshed.');
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
      var category = $('#launchCategory', view).value;
      var segment = $('#launchSegment', view).value;
      var tag = $('#launchTag', view).value.trim();
      var timing = $('input[name="timingType"]:checked', view).value;
      var schedTime = $('#launchSchedTime', view) ? $('#launchSchedTime', view).value : null;

      var selectedLists = [];
      $$('input[name="targetList"]:checked', view).forEach(function (cb) {
        selectedLists.push(Number(cb.value));
      });

      if (!name) {
        toast('error', 'Campaign name required', 'Give the broadcast a recognisable name.');
        return;
      }
      if (!templateId) {
        toast('error', 'Template required', 'Create a template before launching a campaign.');
        return;
      }
      if (timing === 'SCHEDULED' && !schedTime) {
        toast('error', 'Scheduled time required', 'Please pick a scheduled date and time in IST.');
        return;
      }

      button.disabled = true;
      button.textContent = timing === 'SCHEDULED' ? 'Scheduling…' : 'Launching…';
      try {
        var payload = {
          campaign_name: name,
          template_id: templateId,
          campaign_category: category,
          segment: segment,
          target_list_ids: selectedLists.length ? selectedLists : null,
          schedule_type: timing
        };
        if (timing === 'SCHEDULED' && schedTime) {
          payload.scheduled_at_ist = schedTime;
        }
        if (tag) payload.tag = tag;

        var response = await api('/api/campaigns/launch', { method: 'POST', body: payload });
        campaigns = [response.campaign].concat(campaigns);
        renderCampaigns();
        refreshLedger();
        toast('success', timing === 'SCHEDULED' ? 'Campaign scheduled' : 'Campaign launched', response.message);
        $('#launchName', view).value = '';
      } catch (error) {
        apiErrorMessage('Campaign launch', error);
      } finally {
        button.disabled = false;
        button.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;">' + SVG_ICONS.broadcast + ' Launch / Schedule Campaign</span>';
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
      '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button></div></article>'
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
        : emptyState('bot', 'No chatbot rules yet', 'Create a rule so inbound WhatsApp messages get an instant, on-brand reply and the lead is tagged automatically.', '<button class="btn btn-sm btn-primary" type="button" data-new-flow>Create first rule</button>');

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
      '<div class="note-strip" style="margin-bottom:14px">' + SVG_ICONS.zap + ' <span><strong>Try it live:</strong> open the Live WhatsApp Inbox, pick a client and hit <em>Simulate inbound</em> — the highest-scoring keyword rule replies instantly and tags the lead.</span></div>' +
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
    var empPage = 1;
    var auditPage = 1;
    var empTotal = 0;
    var auditTotal = 0;

    var results = await Promise.all([
      api('/api/admin/employees?page=1&page_size=10'),
      api('/api/admin/audit-logs?page=1&page_size=10'),
      api('/api/whatsapp/mode')
    ]);
    await settle(started);

    var employees = results[0].employees || [];
    empTotal = num(results[0].total || employees.length);
    var logs = results[1].logs || [];
    auditTotal = num(results[1].total || logs.length);
    var mode = results[2];
    var rows = mode.presentation_rows || { contacts: 0, templates: 0, campaigns: 0, chatbot_flows: 0, messages: 0 };
    var isMock = !!mode.is_mock;
    var adminListStr = employees.filter(function (r) { return r.role === 'ADMIN'; }).map(function (r) { return r.username; }).join(' · ') || 'Configured via .env';

    function employeeTable() {
      if (!employees.length) {
        return emptyState('users', 'No employees yet', 'Generate credentials for a relationship executive or CA to give them console access.');
      }
      return (
        '<div class="sx-table-container">' +
        '<table class="table sx-data-table"><thead><tr>' +
        '<th>Employee</th><th>User ID</th><th>Designation</th><th>Role</th><th>Status</th><th style="text-align:right">Actions</th>' +
        '</tr></thead><tbody>' +
        employees
          .map(function (employee) {
            return (
              '<tr><td><div class="cell-client"><img src="' + esc(employee.avatar_url || '/static/img/logo-mark.png') + '" onerror="this.onerror=null;this.src=\'/static/img/logo-mark.png\';" class="avatar" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #E2E8F0;flex-shrink:0;">' +
              '<span class="cell-client-text"><span class="strong">' +
              esc(employee.full_name) +
              '</span><span class="mono" style="font-size:11px;color:#757786;">' + esc(employee.phone_number || '') + ' · ' + esc(employee.created_by || 'ADMIN') + '</span></span></div></td>' +
              '<td class="mono" style="font-weight:600;color:#1D1C41;">' +
              esc(employee.username) +
              '</td>' +
              '<td>' +
              esc(employee.designation || 'Relationship Executive') +
              '</td>' +
              '<td><span class="badge badge-mono">' + esc(employee.role || 'EMPLOYEE') + '</span></td>' +
              '<td>' +
              (employee.is_active ? '<span class="badge badge-green badge-dot">Active</span>' : '<span class="badge badge-red badge-dot">Revoked</span>') +
              '</td><td style="text-align:right"><div class="table-actions" style="justify-content:flex-end;">' +
              '<button class="btn btn-sm" type="button" data-edit-creds="' + num(employee.id) + '">Edit</button>' +
              (employee.is_active
                ? '<button class="btn btn-sm btn-danger" type="button" data-revoke-creds="' + num(employee.id) + '">Revoke</button>'
                : '<button class="btn btn-sm" type="button" data-access="' + num(employee.id) + '">Restore</button>') +
              '<button class="icon-btn is-danger" type="button" title="Delete employee" data-drop-employee="' +
              num(employee.id) +
              '" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.close + '</button></div></td></tr>'
            );
          })
          .join('') +
        '</tbody></table></div>' +
        renderPaginationFooter(empPage, 10, empTotal, 'data-emp-page')
      );
    }

    function auditTable() {
      if (!logs.length) {
        return emptyState('search', 'No login attempts logged', 'Every sign-in attempt is recorded here with IP and device details.');
      }
      return (
        '<div class="sx-table-container">' +
        '<table class="table sx-data-table"><thead><tr><th>Timestamp (IST)</th><th>User ID / Name</th><th>Role</th><th>Client IP</th><th>Device / User-Agent</th><th>Status</th></tr></thead><tbody>' +
        logs
          .map(function (log) {
            return (
              '<tr><td class="num">' +
              formatStackedDateTime(log.timestamp_ist || log.created_at) +
              '</td><td><div class="cell-client"><span class="cell-client-text"><span class="strong">' +
              esc(log.full_name || log.username_attempted) +
              '</span><span class="mono">' +
              esc(log.username_attempted) +
              '</span></span></div></td><td>' +
              esc(log.role_detected || '—') +
              '</td><td class="mono">' +
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
        '</tbody></table></div>' +
        renderPaginationFooter(auditPage, 10, auditTotal, 'data-audit-page')
      );
    }

    view.innerHTML =
      '<div class="kpi-grid">' +
      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Super Admins</span><span class="kpi-glyph">' + SVG_ICONS.shield + '</span></div><div class="kpi-value">' + fmtInt(employees.filter(function (r) { return r.role === 'ADMIN'; }).length || 1) + '<span class="unit">active</span></div><p class="kpi-note"><span class="up">' + esc(adminListStr) + '</span></p><div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Total Accounts</span><span class="kpi-ledger-value">' +
      fmtInt(empTotal) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Active</span><span class="kpi-ledger-value">' +
      fmtInt(employees.filter(function (row) {
        return row.is_active;
      }).length) +
      '</span></div></div></article>' +
      '<article class="kpi"><div class="kpi-top"><span class="kpi-label">Login Audit</span><span class="kpi-glyph">' + SVG_ICONS.folder + '</span></div><div class="kpi-value">' +
      fmtInt(auditTotal) +
      '<span class="unit">attempts</span></div><p class="kpi-note">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'INVALID_CREDENTIALS';
      }).length) +
      ' invalid in sample · 5 failures locks IP for 15 min</p><div class="kpi-ledger"><div class="kpi-ledger-item"><span class="kpi-ledger-label">Blocked</span><span class="kpi-ledger-value">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'RATE_LIMITED_BLOCKED';
      }).length) +
      '</span></div><div class="kpi-ledger-item"><span class="kpi-ledger-label">Locked</span><span class="kpi-ledger-value">' +
      fmtInt(logs.filter(function (row) {
        return row.status === 'ACCOUNT_LOCKED';
      }).length) +
      '</span></div></div></article>' +
      '<article class="kpi is-primary"><div class="kpi-top"><span class="kpi-label">WhatsApp Mode</span><span class="kpi-glyph">' + SVG_ICONS.broadcast + '</span></div><div class="kpi-value" style="font-size:20px">' +
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
      '<div class="card"><div class="card-head"><div class="card-head-text"><h2>Employee credentials</h2><p>Admins issue, edit, revoke and delete console access</p></div>' +
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
      '<div class="cutover-warning"><span class="glyph">' + SVG_ICONS.warning + '</span><span><strong>One-way cutover.</strong> Submitting real Meta credentials permanently purges every row flagged <span class="mono">is_mock = true</span> — ' +
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
      '<button class="icon-btn" type="button" id="revealMeta" title="Show or hide token" style="display:inline-flex;align-items:center;justify-content:center;">' + SVG_ICONS.search + '</button></div></div>' +
      '<div class="field" style="margin-top:12px"><label for="metaVerify">Webhook verify token</label><input class="input mono-input" id="metaVerify" value="' +
      esc(mode.meta.verify_token || '') +
      '" placeholder="subsidyx-verify"></div>' +
      '<div class="io-actions" style="margin-top:14px"><button class="btn btn-primary" type="button" id="cutoverBtn">Connect official Meta API</button></div>' +
      '<div class="note-strip" style="margin-top:12px">' + SVG_ICONS.sparkle + ' <span><strong>Rehearsal switch.</strong> Purge mock rows and re-seed the Gujarat HNI showcase without touching live data.</span></div>' +
      '<div class="io-actions" style="margin-top:8px"><button class="btn btn-sm btn-danger" type="button" id="resetDemo">Test mock purge / restore demo</button></div>' +
      '</div></div></div>' +

      '<div class="section-head" style="margin-top:6px"><div class="section-head-text"><h2>Login &amp; IP audit trail</h2><p>Every attempt, role detection, client IP and device — newest first</p></div>' +
      '<div class="section-head-actions"><button class="btn btn-sm" type="button" id="refreshAudit">\u21BB Refresh</button></div></div>' +
      '<div class="card"><div class="card-body is-flush" id="auditTable">' +
      auditTable() +
      '</div></div>';

    function wireEmployees() {
      var tableEl = $('#employeeTable', view);
      if (!tableEl) return;
      $$('[data-edit-creds]', tableEl).forEach(function (button) {
        button.addEventListener('click', function () {
          var employee = employees.find(function (row) {
            return num(row.id) === Number(button.getAttribute('data-edit-creds'));
          });
          if (employee) openEditProfileModal(employee);
        });
      });
      $$('[data-revoke-creds]', tableEl).forEach(function (button) {
        button.addEventListener('click', async function () {
          button.disabled = true;
          try {
            var response = await api('/api/admin/employees/' + button.getAttribute('data-revoke-creds') + '/revoke', { method: 'PATCH' });
            employees = employees.map(function (row) {
              return num(row.id) === num(response.employee.id) ? response.employee : row;
            });
            tableEl.innerHTML = employeeTable();
            wireEmployees();
            toast('success', 'Credentials Revoked', response.message);
          } catch (error) {
            button.disabled = false;
            apiErrorMessage('Revoke', error);
          }
        });
      });
      $$('[data-access]', tableEl).forEach(function (button) {
        button.addEventListener('click', async function () {
          button.disabled = true;
          try {
            var response = await api('/api/admin/employees/' + button.getAttribute('data-access') + '/access', { method: 'PATCH' });
            employees = employees.map(function (row) {
              return num(row.id) === num(response.employee.id) ? response.employee : row;
            });
            tableEl.innerHTML = employeeTable();
            wireEmployees();
            toast('success', 'Access updated', response.message);
          } catch (error) {
            button.disabled = false;
            apiErrorMessage('Access', error);
          }
        });
      });
      $$('[data-drop-employee]', tableEl).forEach(function (button) {
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
                empTotal = Math.max(0, empTotal - 1);
                tableEl.innerHTML = employeeTable();
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
      $$('[data-emp-page]', tableEl).forEach(function (button) {
        button.addEventListener('click', async function () {
          var targetPage = Number(button.getAttribute('data-emp-page'));
          if (!targetPage || button.disabled) return;
          empPage = targetPage;
          var res = await api('/api/admin/employees?page=' + empPage + '&page_size=10');
          employees = res.employees || [];
          empTotal = num(res.total || employees.length);
          tableEl.innerHTML = employeeTable();
          wireEmployees();
        });
      });
    }

    function wireAudit() {
      var tableEl = $('#auditTable', view);
      if (!tableEl) return;
      $$('[data-audit-page]', tableEl).forEach(function (button) {
        button.addEventListener('click', async function () {
          var targetPage = Number(button.getAttribute('data-audit-page'));
          if (!targetPage || button.disabled) return;
          auditPage = targetPage;
          var res = await api('/api/admin/audit-logs?page=' + auditPage + '&page_size=10');
          logs = res.logs || [];
          auditTotal = num(res.total || logs.length);
          tableEl.innerHTML = auditTable();
          wireAudit();
        });
      });
    }

    wireEmployees();
    wireAudit();

    $('#addEmployee', view).addEventListener('click', function () {
      var dialog = openModal({
        title: 'Generate Employee Credentials',
        subtitle: 'Super Admins can create staff accounts by phone number with instant OTP access',
        body:
          '<div class="field"><label for="ef-name">Full name *</label><input class="input" id="ef-name" placeholder="e.g. Meera Shah" required></div>' +
          '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">' +
          '  <div class="field"><label for="ef-phone">Mobile number (+91) *</label><input class="input mono-input" id="ef-phone" type="tel" maxlength="10" placeholder="10-digit mobile" required></div>' +
          '  <div class="field"><label for="ef-role">Console Role</label><select class="select" id="ef-role"><option value="EMPLOYEE">Staff (Limited Access)</option><option value="ADMIN">Super Admin</option></select></div>' +
          '</div>' +
          '<div class="field" style="margin-top:10px;"><label for="ef-designation">Designation</label><input class="input" id="ef-designation" placeholder="Subsidy Relationship Executive" value="Subsidy Relationship Executive"></div>' +
          '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px;">' +
          '  <div class="field"><label for="ef-username">User ID (optional)</label><input class="input mono-input" id="ef-username" placeholder="auto-generated slug"></div>' +
          '  <div class="field"><label for="ef-password">Initial Password (optional)</label><input class="input mono-input" id="ef-password" placeholder="auto-generated"></div>' +
          '</div>' +
          '<div class="note-strip" style="margin-top:12px;">' + SVG_ICONS.shield + ' <span>New team members can sign in immediately using their 10-digit mobile number + 2-minute OTP!</span></div>',
        footer:
          '<span class="spacer"></span><button class="btn btn-sm" type="button" data-modal-close>Cancel</button>' +
          '<button class="btn btn-sm btn-primary" type="button" data-create-employee>Generate</button>'
      });
      if (!dialog) return;
      $('[data-create-employee]', dialog.root).addEventListener('click', async function () {
        var button = this;
        var fullName = $('#ef-name', dialog.root).value.trim();
        var phone = $('#ef-phone', dialog.root).value.trim();
        var role = $('#ef-role', dialog.root).value;
        var designation = $('#ef-designation', dialog.root).value.trim() || 'Subsidy Relationship Executive';
        var username = $('#ef-username', dialog.root).value.trim();
        var password = $('#ef-password', dialog.root).value;

        if (!fullName) {
          toast('error', 'Name required', 'Enter the employee full name.');
          return;
        }
        if (!phone || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
          toast('error', 'Mobile number required', 'Enter a valid 10-digit Indian mobile number.');
          return;
        }

        var payload = {
          full_name: fullName,
          phone_number: phone,
          role: role,
          designation: designation
        };
        if (username) payload.username = username;
        if (password) payload.password = password;

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
              '</strong></div><div class="cred-row"><span>Mobile (+91)</span><strong>' +
              esc(response.credentials.phone || phone) +
              '</strong></div><div class="cred-row"><span>User ID</span><strong>' +
              esc(response.credentials.username) +
              '</strong></div><div class="cred-row"><span>Password</span><strong>' +
              esc(response.credentials.password) +
              '</strong></div></div>' +
              '<div class="note-strip">' + SVG_ICONS.users + ' <span>The new employee signs in at <span class="mono">/login</span>. Their first login is recorded in the audit trail with IP and device.</span></div>',
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
