// NativeForms Runtime v4 — Multi-Step + Full Field Support
"use strict";
(function () {

  /* ─── ICONS ─────────────────────────────────────────────────────────────── */
  var ICO = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>',
    star: '<path d="M12 2.5l2.9 6.05 6.6.87-4.85 4.6 1.24 6.53L12 17.9l-5.9 2.65 1.24-6.53-4.85-4.6 6.6-.87z"/>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 0116.92 2.18 2 2 0 0119 4.36v3.09a2 2 0 01-1.44 1.93l-2.34.78a16 16 0 006.72 6.72l.78-2.34A2 2 0 0122 16.92z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6 17l4-4"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  /* ─── HELPERS ────────────────────────────────────────────────────────────── */
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function css(el, styles) { Object.assign(el.style, styles); }

  /* ─── CSS VARIABLES ───────────────────────────────────────────────────────── */
  function applyGlobalStyles(container, gs) {
    var defaults = {
      'bg': '#ffffff', 'radius': '12px', 'padding': '36px 40px',
      'border': '#e8eaf0', 'border-width': '1px',
      'shadow': '0 4px 32px rgba(0,0,0,0.10)', 'max-width': '600px',
      'font-body': "Inter, 'DM Sans', system-ui, sans-serif",
      'input-bg': '#f8fafc', 'input-border': '#cbd5e1', 'input-radius': '8px',
      'input-padding': '11px 14px', 'input-font-size': '14.5px',
      'input-text': '#1e293b', 'input-placeholder': '#94a3b8',
      'input-focus-border': '#6366f1', 'input-focus-ring': 'rgba(99,102,241,0.18)',
      'input-hover-border': '#94a3b8', 'input-error-border': '#ef4444',
      'label-color': '#334155', 'label-size': '13px', 'label-weight': '600',
      'help-color': '#94a3b8', 'help-size': '12px',
      'error-color': '#ef4444', 'required-color': '#ef4444',
      'text': '#1e293b', 'text-secondary': '#64748b',
      'row-gap': '20px', 'col-gap': '16px',
      'choice-border': '#cbd5e1', 'choice-bg': '#ffffff',
      'choice-checked-bg': '#6366f1', 'choice-checkmark': '#ffffff',
      'btn-bg': '#6366f1', 'btn-text': '#ffffff', 'btn-radius': '8px',
      'btn-padding': '13px 32px', 'btn-font-size': '15px', 'btn-weight': '600',
      'btn-shadow': '0 4px 14px rgba(99,102,241,0.35)',
      'btn-hover-bg': '#4f46e5', 'btn-width': 'auto',
      'select-panel-bg': '#ffffff', 'select-panel-radius': '10px',
      'select-panel-shadow': '0 8px 30px rgba(0,0,0,0.12)',
      'select-option-hover-bg': '#f1f5f9',
      'success-bg': '#f0fdf4', 'success-border': '#bbf7d0', 'success-text': '#166534',
      'title-color': '#1e293b', 'title-size': '24px', 'title-weight': '700',
      'title-align': 'center', 'align': 'center', 'margin': '0 auto',
      'step-fill': '#7c3aed', 'step-track': '#e2e8f0',
      'step-counter-color': '#7c3aed', 'step-counter-size': '20px',
      'step-transition': 'fade',
    };
    Object.keys(defaults).forEach(function (k) {
      container.style.setProperty('--nf-' + k, defaults[k]);
    });
    if (!gs) return;
    Object.keys(gs).forEach(function (k) {
      // Map step_* keys from DB to --nf-step-* variables
      var cssKey = k.replace(/_/g, '-');
      container.style.setProperty('--nf-' + cssKey, String(gs[k]));
    });
  }

  /* ─── FIELD RENDERERS ────────────────────────────────────────────────────── */
  function renderInput(f) {
    var typeMap = { email: 'email', number: 'number', url: 'url', phone: 'tel', date: 'date', time: 'time', datetime: 'datetime-local', password: 'password', hidden: 'hidden' };
    var inp = el('input', 'nf-control', { id: 'nf-input-' + f.id, name: f.id, type: typeMap[f.type] || 'text' });
    if (f.placeholder) inp.placeholder = f.placeholder;
    if (f.required) inp.required = true;
    if (f.min !== undefined) inp.setAttribute('min', f.min);
    if (f.max !== undefined) inp.setAttribute('max', f.max);
    if (f.minLength) inp.minLength = f.minLength;
    if (f.maxLength) inp.maxLength = f.maxLength;
    if (f.type === 'email' || f.type === 'phone') {
      var wrap = el('div', 'nf-input-wrap');
      css(wrap, { position: 'relative', display: 'block', width: '100%' });
      var icon = el('span');
      icon.innerHTML = f.type === 'email' ? ICO.email : ICO.phone;
      css(icon, { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', opacity: '0.4', pointerEvents: 'none', display: 'flex', alignItems: 'center' });
      inp.style.paddingLeft = '38px';
      wrap.appendChild(icon); wrap.appendChild(inp);
      return wrap;
    }
    return inp;
  }

  function renderTextarea(f) {
    var ta = el('textarea', 'nf-control', { id: 'nf-input-' + f.id, name: f.id });
    ta.rows = f.rows || 4;
    if (f.placeholder) ta.placeholder = f.placeholder;
    if (f.required) ta.required = true;
    return ta;
  }

  function renderDropdown(f) {
    var opts = f.options || [];
    var wrap = el('div', 'nf-select', { 'data-field-id': f.id, 'data-field-value': '' });
    var trigger = el('button', 'nf-control nf-select-trigger', { type: 'button', id: 'nf-input-' + f.id, 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
    var valSpan = el('span', 'nf-select-value', { 'data-placeholder': 'true' });
    valSpan.textContent = f.placeholder || 'Select an option';
    var arrow = el('span');
    arrow.innerHTML = ICO.chevron;
    css(arrow, { width: '16px', height: '16px', opacity: '0.5', flexShrink: '0', transition: 'transform 0.2s' });
    trigger.appendChild(valSpan); trigger.appendChild(arrow);
    var panel = el('div', 'nf-select-panel', { role: 'listbox' });
    opts.forEach(function (o) {
      var opt = el('div', 'nf-option', { role: 'option', 'data-value': o.value });
      opt.textContent = o.label;
      opt.addEventListener('click', function () {
        valSpan.textContent = o.label; valSpan.removeAttribute('data-placeholder');
        wrap.setAttribute('data-field-value', o.value);
        panel.querySelectorAll('.nf-option').forEach(function (x) { x.removeAttribute('data-selected'); });
        opt.setAttribute('data-selected', 'true'); close2();
      });
      panel.appendChild(opt);
    });
    function open2() { wrap.setAttribute('data-open', 'true'); trigger.setAttribute('aria-expanded', 'true'); arrow.style.transform = 'rotate(180deg)'; document.addEventListener('click', onOut); }
    function close2() { wrap.removeAttribute('data-open'); trigger.setAttribute('aria-expanded', 'false'); arrow.style.transform = ''; document.removeEventListener('click', onOut); }
    function onOut(ev) { if (!wrap.contains(ev.target)) close2(); }
    trigger.addEventListener('click', function () { wrap.getAttribute('data-open') === 'true' ? close2() : open2(); });
    wrap.appendChild(trigger); wrap.appendChild(panel);
    return wrap;
  }

  function renderChoiceGroup(f) {
    var opts = f.options || [];
    var mode = (f.styles && f.styles.displayMode) || f.displayMode || 'default';
    var isRadio = f.type === 'radio';
    var group = el('div', 'nf-choice-group', { role: isRadio ? 'radiogroup' : 'group' });
    
    // Extract field-specific styles if they exist
    var fsStyles = (f.styles && f.styles.default && f.styles.default.default) || {};

    if (mode === 'button') {
      var btnBg = fsStyles.choice_btnBg || 'var(--nf-choice-bg)';
      var btnBorder = fsStyles.choice_btnBorder || 'var(--nf-choice-border)';
      var btnRadius = fsStyles.choice_btnRadius || '4px';
      var btnSelected = fsStyles.choice_btnSelectedColor || 'var(--nf-choice-checked-bg)';
      
      css(group, { display: 'flex', flexWrap: 'wrap', gap: '8px' });
      opts.forEach(function (o) {
        var btn = el('label', 'nf-btn-option');
        css(btn, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '12px 18px', border: '1px solid ' + btnBorder, borderRadius: btnRadius, cursor: 'pointer', fontSize: 'var(--nf-input-font-size)', fontWeight: '500', color: 'var(--nf-text)', background: btnBg, transition: 'all 0.15s', userSelect: 'none' });
        var inp = el('input', null, { type: isRadio ? 'radio' : 'checkbox', name: isRadio ? f.id : f.id + '[]', value: o.value });
        inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
        inp.addEventListener('change', function () {
          if (isRadio) { group.querySelectorAll('.nf-btn-option').forEach(function (b) { css(b, { borderColor: btnBorder, background: btnBg, color: 'var(--nf-text)' }); }); }
          if (inp.checked) css(btn, { borderColor: btnSelected, background: btnSelected, color: '#fff' });
          else css(btn, { borderColor: btnBorder, background: btnBg, color: 'var(--nf-text)' });
        });
        var lbl = el('span'); lbl.textContent = o.label;
        btn.appendChild(inp); btn.appendChild(lbl); group.appendChild(btn);
      });
    } else if (mode === 'image') {
      var imgRatio = fsStyles.choice_imgRatio || '1/1';
      var imgSize = fsStyles.choice_imgSize || '100px';
      var imgFit = fsStyles.choice_imgFit || 'cover';
      var imgGap = fsStyles.choice_imgGap || '8px';
      var imgSelected = fsStyles.choice_imgSelectedColor || 'var(--nf-choice-checked-bg)';
      var imgLabelPos = fsStyles.choice_imgLabelPos || 'below';

      css(group, { display: 'flex', flexWrap: 'wrap', gap: imgGap });
      opts.forEach(function (o) {
        var tile = el('label', 'nf-img-option');
        css(tile, { display: 'flex', flexDirection: 'column', width: imgSize, cursor: 'pointer', position: 'relative', transition: 'all 0.15s', border: '2px solid transparent', borderRadius: '8px', overflow: 'hidden' });
        var inp = el('input', null, { type: isRadio ? 'radio' : 'checkbox', name: isRadio ? f.id : f.id + '[]', value: o.value });
        inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
        
        var imgWrap = el('div');
        css(imgWrap, { width: '100%', aspectRatio: imgRatio, background: '#e2e8f0', backgroundImage: o.imageUrl ? 'url('+o.imageUrl+')' : 'none', backgroundSize: imgFit, backgroundPosition: 'center', position: 'relative' });
        
        var lbl = el('span');
        lbl.textContent = o.label;
        css(lbl, { fontSize: '12px', textAlign: 'center', padding: '6px', fontWeight: '500' });
        
        if (imgLabelPos === 'overlay') {
           css(lbl, { position: 'absolute', bottom: '0', left: '0', right: '0', background: 'rgba(0,0,0,0.6)', color: '#fff' });
           imgWrap.appendChild(lbl);
        } else if (imgLabelPos === 'hidden') {
           css(lbl, { display: 'none' });
        }

        inp.addEventListener('change', function () {
          if (isRadio) { group.querySelectorAll('.nf-img-option').forEach(function (b) { css(b, { borderColor: 'transparent' }); }); }
          if (inp.checked) css(tile, { borderColor: imgSelected });
          else css(tile, { borderColor: 'transparent' });
        });
        
        tile.appendChild(inp);
        tile.appendChild(imgWrap);
        if (imgLabelPos === 'below') {
           tile.appendChild(lbl);
        }
        group.appendChild(tile);
      });
    } else {
      var choiceSize = fsStyles.choice_size || '16px';
      var choiceFill = fsStyles.choice_fillColor || 'var(--nf-choice-checked-bg)';
      var choiceIcon = fsStyles.choice_iconColor || '#ffffff';
      var choiceRing = fsStyles.choice_ringColor || 'var(--nf-choice-border)';
      var choiceGap = fsStyles.choice_gap || '8px';

      css(group, { display: 'flex', flexDirection: f.inline ? 'row' : 'column', flexWrap: 'wrap', gap: f.inline ? '20px' : choiceGap });
      opts.forEach(function (o) {
        var lbl = el('label', 'nf-choice');
        css(lbl, { display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' });
        
        var inp = el('input', null, { type: isRadio ? 'radio' : 'checkbox', name: isRadio ? f.id : f.id + '[]', value: o.value });
        inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
        
        var box = el('span', 'nf-choice-box ' + (isRadio ? 'nf-radio-box' : 'nf-check-box'));
        css(box, { width: choiceSize, height: choiceSize, border: '1px solid ' + choiceRing, borderRadius: isRadio ? '50%' : '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--nf-input-bg)', transition: 'all 0.15s' });
        
        var innerMark = el('span');
        if (isRadio) {
          css(innerMark, { width: '50%', height: '50%', borderRadius: '50%', background: choiceIcon, opacity: '0', transition: 'opacity 0.15s' });
        } else {
          innerMark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="' + choiceIcon + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="width:70%;height:70%;"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          css(innerMark, { opacity: '0', transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' });
        }
        box.appendChild(innerMark);

        inp.addEventListener('change', function () {
          if (isRadio) {
             group.querySelectorAll('.nf-radio-box').forEach(function(b) { css(b, { background: 'var(--nf-input-bg)', borderColor: choiceRing }); b.firstChild.style.opacity = '0'; });
          }
          if (inp.checked) {
             css(box, { background: choiceFill, borderColor: choiceFill });
             innerMark.style.opacity = '1';
          } else {
             css(box, { background: 'var(--nf-input-bg)', borderColor: choiceRing });
             innerMark.style.opacity = '0';
          }
        });
        
        var txt = el('span', 'nf-choice-label'); txt.textContent = o.label;
        lbl.appendChild(inp); lbl.appendChild(box); lbl.appendChild(txt); group.appendChild(lbl);
      });
    }
    return group;
  }

  function renderToggle(f) {
    var wrap = el('div', 'nf-toggle-wrap', { 'data-field-id': f.id, 'data-field-value': 'false' });
    css(wrap, { display: 'inline-flex', alignItems: 'center', gap: '12px' });
    var inp = el('input', null, { type: 'checkbox', name: f.id, id: 'nf-input-' + f.id });
    inp.style.cssText = 'position:absolute;opacity:0;width:1px;height:1px;';
    var track = el('span');
    css(track, { position: 'relative', display: 'inline-flex', alignItems: 'center', width: '46px', height: '26px', borderRadius: '999px', background: 'var(--nf-input-border)', transition: 'background 0.22s', cursor: 'pointer', flexShrink: '0' });
    var thumb = el('span');
    css(thumb, { position: 'absolute', left: '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transition: 'transform 0.22s' });
    track.appendChild(thumb);
    var lblEl = el('span'); css(lblEl, { fontSize: 'var(--nf-input-font-size)', color: 'var(--nf-text)', fontWeight: '500' });
    lblEl.textContent = f.offLabel || 'Off';
    inp.addEventListener('change', function () {
      if (inp.checked) { track.style.background = 'var(--nf-choice-checked-bg)'; thumb.style.transform = 'translateX(20px)'; lblEl.textContent = f.onLabel || 'On'; wrap.setAttribute('data-field-value', 'true'); }
      else { track.style.background = 'var(--nf-input-border)'; thumb.style.transform = ''; lblEl.textContent = f.offLabel || 'Off'; wrap.setAttribute('data-field-value', 'false'); }
    });
    track.addEventListener('click', function () { inp.checked = !inp.checked; inp.dispatchEvent(new Event('change')); });
    wrap.appendChild(inp); wrap.appendChild(track); wrap.appendChild(lblEl);
    return wrap;
  }

  function renderRating(f) {
    var stars = 5;
    var wrap = el('div', 'nf-rating', { 'data-field-id': f.id, 'data-field-value': '0' });
    css(wrap, { display: 'flex', gap: '6px' });
    for (var i = 1; i <= stars; i++) {
      (function (val) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'nf-rating-star');
        svg.setAttribute('data-value', String(val));
        css(svg, { width: '28px', height: '28px', cursor: 'pointer', fill: 'none', stroke: 'var(--nf-choice-border)', strokeWidth: '1.5', transition: 'all 0.15s' });
        svg.innerHTML = ICO.star;
        svg.addEventListener('click', function () {
          wrap.setAttribute('data-field-value', String(val));
          wrap.querySelectorAll('.nf-rating-star').forEach(function (s) {
            var v = Number(s.getAttribute('data-value'));
            s.style.fill = v <= val ? 'var(--nf-choice-checked-bg)' : 'none';
            s.style.stroke = v <= val ? 'var(--nf-choice-checked-bg)' : 'var(--nf-choice-border)';
          });
        });
        svg.addEventListener('mouseenter', function () {
          wrap.querySelectorAll('.nf-rating-star').forEach(function (s) {
            s.style.fill = Number(s.getAttribute('data-value')) <= val ? 'var(--nf-choice-checked-bg)' : 'none';
          });
        });
        wrap.appendChild(svg);
      })(i);
    }
    wrap.addEventListener('mouseleave', function () {
      var cur = parseInt(wrap.getAttribute('data-field-value')) || 0;
      wrap.querySelectorAll('.nf-rating-star').forEach(function (s) {
        var v = Number(s.getAttribute('data-value'));
        s.style.fill = v <= cur ? 'var(--nf-choice-checked-bg)' : 'none';
        s.style.stroke = v <= cur ? 'var(--nf-choice-checked-bg)' : 'var(--nf-choice-border)';
      });
    });
    return wrap;
  }

  function renderRangeSlider(f) {
    var wrap = el('div'); css(wrap, { display: 'flex', flexDirection: 'column', gap: '8px' });
    var row = el('div'); css(row, { display: 'flex', alignItems: 'center', gap: '14px' });
    var inp = el('input', 'nf-range-input', { type: 'range', id: 'nf-input-' + f.id, name: f.id });
    inp.style.cssText = '-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:4px;background:var(--nf-choice-border);outline:none;cursor:pointer;';
    inp.min = f.min !== undefined ? String(f.min) : '0';
    inp.max = f.max !== undefined ? String(f.max) : '100';
    inp.step = f.step !== undefined ? String(f.step) : '1';
    inp.value = f.defaultValue !== undefined ? String(f.defaultValue) : inp.min;
    var valDisplay = el('span');
    css(valDisplay, { minWidth: '40px', textAlign: 'center', fontSize: 'var(--nf-input-font-size)', fontWeight: '700', color: 'var(--nf-choice-checked-bg)', background: 'rgba(99,102,241,0.08)', padding: '3px 8px', borderRadius: '6px' });
    valDisplay.textContent = inp.value;
    inp.addEventListener('input', function () {
      valDisplay.textContent = inp.value;
      var pct = (parseFloat(inp.value) - parseFloat(inp.min)) / (parseFloat(inp.max) - parseFloat(inp.min)) * 100;
      inp.style.background = 'linear-gradient(to right, var(--nf-choice-checked-bg) ' + pct + '%, var(--nf-choice-border) ' + pct + '%)';
    });
    inp.dispatchEvent(new Event('input'));
    row.appendChild(inp); row.appendChild(valDisplay); wrap.appendChild(row);
    return wrap;
  }

  function renderColorPicker(f) {
    var wrap = el('div'); css(wrap, { display: 'flex', alignItems: 'center', gap: '12px' });
    var inp = el('input', null, { type: 'color', id: 'nf-input-' + f.id, name: f.id });
    inp.style.cssText = 'width:48px;height:48px;border:2px solid var(--nf-input-border);border-radius:10px;cursor:pointer;padding:2px;background:var(--nf-input-bg);';
    inp.value = f.defaultColor || '#6366f1';
    var hex = el('span'); css(hex, { fontFamily: 'monospace', fontSize: '14px', color: 'var(--nf-text)', fontWeight: '600', background: 'var(--nf-input-bg)', border: '1px solid var(--nf-input-border)', borderRadius: '8px', padding: '6px 12px' });
    hex.textContent = inp.value.toUpperCase();
    inp.addEventListener('input', function () { hex.textContent = inp.value.toUpperCase(); });
    wrap.appendChild(inp); wrap.appendChild(hex);
    return wrap;
  }

  function renderFileUpload(f) {
    var wrap = el('div');
    var zone = el('div', 'nf-dropzone', { tabindex: '0' });
    zone.innerHTML = ICO.upload + '<div class="nf-dropzone-text"><strong>Click to upload</strong> or drag &amp; drop</div>';
    var input = el('input', null, { type: 'file', id: 'nf-input-' + f.id, name: f.id, style: 'display:none' });
    if (f.acceptedTypes) input.setAttribute('accept', f.acceptedTypes);
    var chips = el('div');
    function showChip(file) {
      chips.innerHTML = '';
      var chip = el('span', 'nf-file-chip');
      var name = el('span'); name.textContent = file.name;
      var rm = el('button', null, { type: 'button' }); rm.innerHTML = ICO.close;
      rm.addEventListener('click', function (e) { e.stopPropagation(); input.value = ''; chips.innerHTML = ''; });
      chip.appendChild(name); chip.appendChild(rm); chips.appendChild(chip);
    }
    zone.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files && input.files[0]) showChip(input.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.setAttribute('data-dragover', 'true'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.removeAttribute('data-dragover'); }); });
    zone.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files[0]) { showChip(e.dataTransfer.files[0]); } });
    wrap.appendChild(zone); wrap.appendChild(input); wrap.appendChild(chips);
    return wrap;
  }

  function renderSignature(f) {
    var wrap = el('div'); css(wrap, { display: 'flex', flexDirection: 'column', gap: '8px' });
    var canvas = el('canvas'); canvas.width = 600; canvas.height = 160;
    css(canvas, { width: '100%', height: '160px', border: '1.5px solid var(--nf-input-border)', borderRadius: 'var(--nf-input-radius)', background: '#fff', cursor: 'crosshair', touchAction: 'none' });
    var hiddenInp = el('input', null, { type: 'hidden', name: f.id, id: 'nf-input-' + f.id });
    var ctx = canvas.getContext('2d');
    var drawing = false;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#1e293b';
    function pos(e) { var r = canvas.getBoundingClientRect(); var s = e.touches ? e.touches[0] : e; return { x: (s.clientX - r.left) * (canvas.width / r.width), y: (s.clientY - r.top) * (canvas.height / r.height) }; }
    canvas.addEventListener('mousedown', function (e) { drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
    canvas.addEventListener('mousemove', function (e) { if (!drawing) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hiddenInp.value = canvas.toDataURL(); });
    canvas.addEventListener('mouseup', function () { drawing = false; });
    canvas.addEventListener('mouseleave', function () { drawing = false; });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); drawing = true; var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); if (!drawing) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hiddenInp.value = canvas.toDataURL(); }, { passive: false });
    canvas.addEventListener('touchend', function () { drawing = false; });
    var clearBtn = el('button', null, { type: 'button' });
    css(clearBtn, { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--nf-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0' });
    clearBtn.innerHTML = ICO.eraser + ' Clear';
    clearBtn.addEventListener('click', function () { ctx.clearRect(0, 0, canvas.width, canvas.height); hiddenInp.value = ''; });
    var row = el('div'); css(row, { display: 'flex', justifyContent: 'flex-end' });
    row.appendChild(clearBtn);
    wrap.appendChild(canvas); wrap.appendChild(row); wrap.appendChild(hiddenInp);
    return wrap;
  }

  function renderQuantity(f) {
    var wrap = el('div');
    css(wrap, { display: 'inline-flex', alignItems: 'center', border: '1.5px solid var(--nf-input-border)', borderRadius: 'var(--nf-input-radius)', overflow: 'hidden', background: 'var(--nf-input-bg)' });
    var dec = el('button', null, { type: 'button' }); dec.textContent = '−';
    css(dec, { width: '38px', height: '42px', border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer' });
    var inp = el('input', null, { type: 'number', id: 'nf-input-' + f.id, name: f.id });
    inp.value = f.defaultValue || '1'; inp.min = f.min !== undefined ? String(f.min) : '1';
    inp.style.cssText = 'width:56px;border:none;text-align:center;font-size:var(--nf-input-font-size);font-weight:600;color:var(--nf-text);background:transparent;outline:none;-moz-appearance:textfield;';
    var inc = el('button', null, { type: 'button' }); inc.textContent = '+';
    css(inc, dec.style);
    dec.addEventListener('click', function () { var v = parseInt(inp.value) || 0; if (v > parseInt(inp.min)) inp.value = v - 1; });
    inc.addEventListener('click', function () { var v = parseInt(inp.value) || 0; inp.value = v + 1; });
    wrap.appendChild(dec); wrap.appendChild(inp); wrap.appendChild(inc);
    return wrap;
  }

  /* ─── FIELD BUILDER ─────────────────────────────────────────────────────── */
  function buildField(f) {
    if (f.type === 'hidden') {
      var h = el('input', null, { type: 'hidden', name: f.id, value: f.defaultValue || '' });
      return h;
    }
    if (f.type === 'pagebreak') return null; // handled by multi-step engine

    var width = (f.styles && f.styles.width) ? String(f.styles.width) : (f.width ? String(f.width) : '100');
    var fieldWrap = el('div', 'nf-field', { 'data-width': width, id: 'nf-field-' + f.id });

    // Label
    if (f.type !== 'legal' && f.type !== 'toggle' && f.type !== 'switch') {
      var labelEl = el('label', 'nf-label', { for: 'nf-input-' + f.id });
      labelEl.textContent = f.label;
      if (f.required) { var req = el('span', 'nf-required'); req.textContent = '*'; labelEl.appendChild(req); }
      fieldWrap.appendChild(labelEl);
    }

    // Control
    var ctrl;
    switch (f.type) {
      case 'textarea': ctrl = renderTextarea(f); break;
      case 'dropdown': ctrl = renderDropdown(f); break;
      case 'radio': case 'checkbox': ctrl = renderChoiceGroup(f); break;
      case 'toggle': case 'switch': ctrl = renderToggle(f); break;
      case 'rating': ctrl = renderRating(f); break;
      case 'rangeslider': case 'scale': ctrl = renderRangeSlider(f); break;
      case 'colorpicker': case 'color': ctrl = renderColorPicker(f); break;
      case 'fileupload': case 'file': case 'imageupload': ctrl = renderFileUpload(f); break;
      case 'signature': ctrl = renderSignature(f); break;
      case 'quantity': ctrl = renderQuantity(f); break;
      case 'legal': {
        var legalLabel = el('label', 'nf-choice');
        var legalInp = el('input', null, { type: 'checkbox', name: f.id, value: 'accepted' });
        if (f.required) legalInp.required = true;
        var legalBox = el('span', 'nf-choice-box nf-check-box');
        legalBox.innerHTML = ICO.check.replace('currentColor', 'var(--nf-choice-checkmark)');
        var legalTxt = el('span', 'nf-choice-label'); legalTxt.textContent = f.label;
        legalLabel.appendChild(legalInp); legalLabel.appendChild(legalBox); legalLabel.appendChild(legalTxt);
        ctrl = legalLabel; break;
      }
      default: ctrl = renderInput(f); break;
    }
    if (ctrl) {
      if (f.required && ctrl.required !== undefined) ctrl.required = true;
      fieldWrap.appendChild(ctrl);
    }

    // Help text
    if (f.helpText && f.type !== 'legal') {
      var help = el('div', 'nf-help'); help.textContent = f.helpText;
      fieldWrap.appendChild(help);
    }
    return fieldWrap;
  }

  /* ─── PROGRESS INDICATOR ─────────────────────────────────────────────────── */
  function buildProgress(container, totalSteps, currentStep, gs) {
    var fillColor = gs.step_fillColor || gs.primary_color || '#7c3aed';
    var trackColor = gs.step_trackColor || '#e2e8f0';
    var style = gs.step_progressStyle || 'dots';

    var wrap = el('div', 'nf-progress');
    css(wrap, { width: '100%', marginBottom: '28px' });

    if (style === 'none' || totalSteps <= 1) return null;

    if (style === 'bar') {
      var pct = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 100;
      var labelRow = el('div');
      css(labelRow, { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '8px' });
      labelRow.innerHTML = '<span>Step ' + (currentStep + 1) + '</span><span>' + totalSteps + ' steps</span>';
      var track = el('div');
      css(track, { width: '100%', height: '6px', background: trackColor, borderRadius: '999px', overflow: 'hidden' });
      var fill = el('div');
      css(fill, { width: pct + '%', height: '100%', background: fillColor, borderRadius: '999px', transition: 'width 0.3s ease' });
      track.appendChild(fill); wrap.appendChild(labelRow); wrap.appendChild(track);
      return wrap;
    }

    if (style === 'numbered') {
      var counterSize = gs.step_counterSize || '22px';
      var counterColor = gs.step_counterColor || fillColor;
      css(wrap, { textAlign: 'center', fontWeight: '700', fontSize: counterSize, color: counterColor, letterSpacing: '0.06em', marginBottom: '24px' });
      wrap.textContent = String(currentStep + 1).padStart(2, '0') + ' \u2014 ' + String(totalSteps).padStart(2, '0');
      return wrap;
    }

    // Default: dots (numbered circles + line) — matches reference image
    css(wrap, { position: 'relative' });
    // Connector line behind the dots
    var lineWrap = el('div');
    css(lineWrap, { position: 'absolute', top: '16px', left: Math.round(100 / totalSteps / 2) + '%', right: Math.round(100 / totalSteps / 2) + '%', height: '2px', background: trackColor, zIndex: '0' });
    var lineFill = el('div');
    var filledPct = currentStep === 0 ? 0 : Math.round((currentStep / (totalSteps - 1)) * 100);
    css(lineFill, { height: '100%', background: fillColor, width: filledPct + '%', transition: 'width 0.35s ease' });
    lineWrap.appendChild(lineFill); wrap.appendChild(lineWrap);
    // Dot circles
    var dotsRow = el('div');
    css(dotsRow, { display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: '1' });
    for (var i = 0; i < totalSteps; i++) {
      var done = i < currentStep;
      var active = i === currentStep;
      var dot = el('div');
      css(dot, {
        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '1',
      });
      var circle = el('div');
      css(circle, {
        width: '32px', height: '32px', borderRadius: '50%',
        background: (done || active) ? fillColor : trackColor,
        color: (done || active) ? '#fff' : '#94a3b8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', fontWeight: '700',
        border: active ? '3px solid ' + fillColor : 'none',
        boxShadow: active ? '0 0 0 4px ' + fillColor + '33' : 'none',
        transition: 'all 0.2s',
      });
      circle.textContent = done ? '\u2713' : String(i + 1);
      dot.appendChild(circle);
      dotsRow.appendChild(dot);
    }
    wrap.appendChild(dotsRow);
    return wrap;
  }

  /* ─── MULTI-STEP ENGINE ──────────────────────────────────────────────────── */
  function buildMultiStepForm(container, canvas, data) {
    var fields = data.fields || [];
    var gs = data.globalStyles || {};

    // Split fields into pages; collect pagebreak meta
    var pages = [[]]; // pages[i] = array of field objects for step i
    var pageBreakMeta = [null]; // pageBreakMeta[0]=null (Step 1 has no preceding break), pageBreakMeta[i]=the pagebreak field before step i
    fields.forEach(function (f) {
      if (f.type === 'pagebreak') {
        pageBreakMeta.push(f);
        pages.push([]);
      } else {
        pages[pages.length - 1].push(f);
      }
    });

    var totalSteps = pages.length;
    var currentStep = 0;
    var formData = {}; // persists values across steps

    // Collect values from current step's inputs into formData
    function collectCurrentStep(stepEl) {
      var fd = new FormData();
      stepEl.querySelectorAll('input,textarea,select').forEach(function (inp) {
        if (inp.type === 'checkbox') { if (inp.checked) fd.append(inp.name, inp.value); }
        else if (inp.type === 'radio') { if (inp.checked) fd.append(inp.name, inp.value); }
        else if (inp.value) fd.append(inp.name, inp.value);
      });
      // Special widgets
      stepEl.querySelectorAll('[data-field-id][data-field-value]').forEach(function (w) {
        var fid = w.getAttribute('data-field-id');
        var fval = w.getAttribute('data-field-value');
        if (fid) fd.set(fid, fval);
      });
      fd.forEach(function (v, k) {
        if (k.endsWith('[]')) { if (!formData[k.replace('[]', '')]) formData[k.replace('[]', '')] = []; formData[k.replace('[]', '')].push(v); }
        else formData[k] = v;
      });
    }

    // Validate required fields on a step element
    function validateStep(stepEl) {
      var valid = true;
      // Clear previous errors
      stepEl.querySelectorAll('.nf-error-msg').forEach(function (e) { e.remove(); });
      stepEl.querySelectorAll('[data-error="true"]').forEach(function (e) { e.removeAttribute('data-error'); });

      var page = pages[currentStep];
      page.forEach(function (f) {
        if (!f.required) return;
        var fieldWrap = stepEl.querySelector('#nf-field-' + f.id);
        if (!fieldWrap) return;
        var inps = fieldWrap.querySelectorAll('input:not([type=hidden]),textarea,select');
        var hasValue = false;
        inps.forEach(function (inp) {
          if (inp.type === 'checkbox' || inp.type === 'radio') { if (inp.checked) hasValue = true; }
          else if (inp.value && inp.value.trim()) hasValue = true;
        });
        // Special widgets
        var widget = fieldWrap.querySelector('[data-field-id][data-field-value]');
        if (widget && widget.getAttribute('data-field-value') && widget.getAttribute('data-field-value') !== '0') hasValue = true;

        if (!hasValue) {
          valid = false;
          fieldWrap.setAttribute('data-error', 'true');
          var errMsg = el('div', 'nf-error-msg');
          errMsg.innerHTML = ICO.error + '<span>This field is required</span>';
          fieldWrap.appendChild(errMsg);
        }
      });
      return valid;
    }

    // Restore saved values into a freshly-rendered step
    function restoreValues(stepEl) {
      Object.keys(formData).forEach(function (key) {
        var val = formData[key];
        var inps = stepEl.querySelectorAll('[name="' + key + '"], [name="' + key + '[]"]');
        inps.forEach(function (inp) {
          if (inp.type === 'checkbox' || inp.type === 'radio') {
            var vals = Array.isArray(val) ? val : [val];
            inp.checked = vals.indexOf(inp.value) !== -1;
          } else {
            inp.value = val || '';
          }
        });
      });
    }

    // Skip logic: should we skip step i?
    function shouldSkip(stepIdx) {
      var meta = pageBreakMeta[stepIdx];
      if (!meta || !meta.skipIfField) return false;
      var sourceVal = formData[meta.skipIfField] || '';
      var op = meta.skipOperator || '==';
      var target = meta.skipValue || '';
      if (op === '==') return sourceVal === target;
      if (op === '!=') return sourceVal !== target;
      if (op === 'contains') return String(sourceVal).indexOf(target) !== -1;
      if (op === 'empty') return !sourceVal;
      return false;
    }

    // Render a single step
    function renderStep(stepIdx, direction) {
      var meta = pageBreakMeta[stepIdx] || {};
      var fillColor = gs.step_fillColor || gs.primary_color || '#7c3aed';
      var trackColor = gs.step_trackColor || '#e2e8f0';
      var globalTransition = gs.step_transition || 'fade';
      var continueLabel = meta.continueLabel || gs.step_continueLabel || 'Continue';
      var backLabel = meta.backLabel || gs.step_backLabel || 'Back';
      var progressStyle = meta.progressStyle || gs.step_progressStyle || 'dots';
      var isLastStep = stepIdx === totalSteps - 1;

      var stepEl = el('form', 'nf-form nf-step');
      stepEl.setAttribute('data-step', String(stepIdx));
      stepEl.setAttribute('novalidate', 'true');

      // Progress indicator
      var prog = buildProgress(container, totalSteps, stepIdx, Object.assign({}, gs, { step_progressStyle: progressStyle }));
      if (prog) stepEl.appendChild(prog);

      // Step title / description
      if (meta.stepTitle) {
        var titleEl = el('h2', 'nf-step-title'); titleEl.textContent = meta.stepTitle;
        stepEl.appendChild(titleEl);
      }
      if (meta.stepDescription) {
        var descEl = el('p', 'nf-step-desc'); descEl.textContent = meta.stepDescription;
        stepEl.appendChild(descEl);
      }

      // Fields grid
      var grid = el('div', 'nf-grid');
      var stepFields = pages[stepIdx] || [];

      // Hidden fields from ALL pages (they should always submit)
      fields.forEach(function (f) {
        if (f.type === 'hidden') {
          var h = el('input', null, { type: 'hidden', name: f.id, value: formData[f.id] || f.defaultValue || '' });
          stepEl.appendChild(h);
        }
      });

      stepFields.forEach(function (f) {
        if (f.type === 'hidden') return; // already added globally
        var fieldEl = buildField(f);
        if (fieldEl) grid.appendChild(fieldEl);
      });
      stepEl.appendChild(grid);

      // Honeypot (only on last step)
      if (isLastStep) {
        var hp = el('input', 'nf-hp', { type: 'text', name: 'a_password', tabindex: '-1', autocomplete: 'off' });
        stepEl.appendChild(hp);
      }

      // Navigation
      var navRow = el('div', 'nf-step-nav');
      css(navRow, { display: 'flex', justifyContent: stepIdx === 0 ? 'flex-end' : 'space-between', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--nf-border)' });

      if (stepIdx > 0) {
        var backBtn = el('button', 'nf-back-btn', { type: 'button' });
        backBtn.textContent = backLabel;
        css(backBtn, { padding: '12px 24px', border: '1.5px solid ' + trackColor, background: '#fff', borderRadius: 'var(--nf-btn-radius)', cursor: 'pointer', fontWeight: '600', fontSize: 'var(--nf-btn-font-size)', color: 'var(--nf-text)', transition: 'all 0.15s' });
        backBtn.addEventListener('click', function () {
          collectCurrentStep(stepEl);
          var prev = currentStep - 1;
          while (prev > 0 && shouldSkip(prev)) prev--;
          currentStep = prev;
          transition(canvas, renderStep(currentStep, 'back'), 'back', globalTransition);
        });
        navRow.appendChild(backBtn);
      }

      if (!isLastStep) {
        var nextBtn = el('button', 'nf-continue-btn', { type: 'button' });
        nextBtn.textContent = continueLabel;
        css(nextBtn, { padding: '12px 32px', border: 'none', background: fillColor, color: '#fff', borderRadius: 'var(--nf-btn-radius)', cursor: 'pointer', fontWeight: '700', fontSize: 'var(--nf-btn-font-size)', boxShadow: '0 4px 14px ' + fillColor + '44', transition: 'all 0.15s' });
        nextBtn.addEventListener('click', function () {
          if (!validateStep(stepEl)) return; // per-step validation
          collectCurrentStep(stepEl);
          var next = currentStep + 1;
          while (next < totalSteps && shouldSkip(next)) next++;
          if (next >= totalSteps) next = totalSteps - 1;
          currentStep = next;
          var nextStepEl = renderStep(currentStep, 'forward');
          restoreValues(nextStepEl);
          transition(canvas, nextStepEl, 'forward', globalTransition);
        });
        navRow.appendChild(nextBtn);
      } else {
        // Submit button
        var submitBtn = el('button', 'nf-submit', { type: 'submit' });
        var submitLbl = el('span'); submitLbl.textContent = data.submitLabel || 'Submit';
        submitBtn.appendChild(submitLbl);
        css(submitBtn, { padding: '12px 40px', border: 'none', background: fillColor, color: '#fff', borderRadius: 'var(--nf-btn-radius)', cursor: 'pointer', fontWeight: '700', fontSize: 'var(--nf-btn-font-size)', boxShadow: '0 4px 14px ' + fillColor + '44' });
        navRow.appendChild(submitBtn);

        stepEl.addEventListener('submit', function (ev) {
          ev.preventDefault();
          if (!validateStep(stepEl)) return;
          collectCurrentStep(stepEl);

          submitLbl.textContent = data.loadingLabel || 'Submitting\u2026';
          submitBtn.disabled = true;

          var formId = container.getAttribute('data-form-id');
          fetch('/apps/forms/' + formId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission: formData })
          })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw d; return d; }); })
            .then(function () {
              var successEl = el('div', 'nf-form');
              var msg = el('div', 'nf-success');
              msg.innerHTML = ICO.success + '<span>' + esc(data.successMessage || 'Thank you! Your submission was received.') + '</span>';
              successEl.appendChild(msg);
              canvas.innerHTML = '';
              canvas.appendChild(successEl);
            })
            .catch(function (err) {
              submitLbl.textContent = data.submitLabel || 'Submit';
              submitBtn.disabled = false;
              if (err && err.errors) {
                Object.keys(err.errors).forEach(function (fid) {
                  var target = stepEl.querySelector(fid === 'form' ? '.nf-step-nav' : '#nf-field-' + fid);
                  if (target) {
                    target.setAttribute('data-error', 'true');
                    var errMsg = el('div', 'nf-error-msg');
                    errMsg.innerHTML = ICO.error + '<span>' + esc(String(err.errors[fid])) + '</span>';
                    target.appendChild(errMsg);
                  }
                });
              }
            });
        });
      }

      stepEl.appendChild(navRow);
      return stepEl;
    }

    // Animated transition between steps
    function transition(canvas, newStepEl, direction, transitionType) {
      var old = canvas.querySelector('.nf-step');
      if (!old || transitionType === 'none') {
        canvas.innerHTML = '';
        canvas.appendChild(newStepEl);
        return;
      }
      if (transitionType === 'slide') {
        var enterFrom = direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)';
        newStepEl.style.cssText += ';position:absolute;width:100%;top:0;left:0;transform:' + enterFrom + ';transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);opacity:1;';
        canvas.style.position = 'relative'; canvas.style.overflow = 'hidden';
        canvas.appendChild(newStepEl);
        requestAnimationFrame(function () {
          old.style.cssText += ';position:absolute;width:100%;top:0;left:0;transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);';
          old.style.transform = direction === 'forward' ? 'translateX(-100%)' : 'translateX(100%)';
          newStepEl.style.transform = 'translateX(0)';
          setTimeout(function () { old.remove(); newStepEl.style.position = ''; canvas.style.position = ''; canvas.style.overflow = ''; }, 370);
        });
      } else {
        // Fade
        old.style.transition = 'opacity 0.25s';
        old.style.opacity = '0';
        setTimeout(function () {
          canvas.innerHTML = '';
          newStepEl.style.opacity = '0';
          newStepEl.style.transition = 'opacity 0.25s';
          canvas.appendChild(newStepEl);
          requestAnimationFrame(function () { newStepEl.style.opacity = '1'; });
        }, 260);
      }
    }

    // Initial render
    var firstStep = renderStep(0, 'forward');
    canvas.innerHTML = '';
    canvas.appendChild(firstStep);
  }

  /* ─── SINGLE-PAGE FORM (no step breaks) ─────────────────────────────────── */
  function buildSinglePageForm(container, canvas, data) {
    canvas.innerHTML = '';
    var fields = data.fields || [];

    var form = el('form', 'nf-form');
    form.setAttribute('novalidate', 'true');

    // Header
    if (data.icon || data.title) {
      var header = el('div', 'nf-header');
      if (data.icon) {
        var iconWrap = el('div', 'nf-form-icon'); css(iconWrap, { display: 'flex', justifyContent: 'center', marginBottom: '14px' });
        var iconImg = el('img'); iconImg.src = data.icon; iconImg.alt = ''; iconImg.style.cssText = 'width:64px;height:64px;object-fit:contain;';
        iconWrap.appendChild(iconImg); header.appendChild(iconWrap);
      }
      if (data.title) { var titleEl2 = el('h2', 'nf-title'); titleEl2.textContent = data.title; header.appendChild(titleEl2); }
      if (data.subtitle) { var subEl = el('p', 'nf-subtitle'); subEl.textContent = data.subtitle; header.appendChild(subEl); }
      form.appendChild(header);
    }

    var grid = el('div', 'nf-grid');
    fields.forEach(function (f) {
      if (f.type === 'hidden') { var h2 = el('input', null, { type: 'hidden', name: f.id, value: f.defaultValue || '' }); form.appendChild(h2); return; }
      if (f.type === 'pagebreak') return;
      var fieldEl = buildField(f);
      if (fieldEl) grid.appendChild(fieldEl);
    });
    form.appendChild(grid);

    var hp = el('input', 'nf-hp', { type: 'text', name: 'a_password', tabindex: '-1', autocomplete: 'off' });
    form.appendChild(hp);

    var actions = el('div', 'nf-actions');
    var submitBtn2 = el('button', 'nf-submit', { type: 'submit' });
    var submitLbl2 = el('span'); submitLbl2.textContent = data.submitLabel || 'Submit';
    submitBtn2.appendChild(submitLbl2);
    actions.appendChild(submitBtn2);
    form.appendChild(actions);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      submitLbl2.textContent = data.loadingLabel || 'Submitting\u2026'; submitBtn2.disabled = true;
      form.querySelectorAll('.nf-error-msg').forEach(function (e) { e.remove(); });
      form.querySelectorAll('[data-error="true"]').forEach(function (e) { e.removeAttribute('data-error'); });
      var body = {};
      new FormData(form).forEach(function (v, k) { if (k.endsWith('[]')) { var rk = k.replace('[]', ''); if (!body[rk]) body[rk] = []; body[rk].push(v); } else { body[k] = v; } });
      form.querySelectorAll('[data-field-id][data-field-value]').forEach(function (w) { var fid = w.getAttribute('data-field-id'); var fval = w.getAttribute('data-field-value'); if (fid) body[fid] = fval; });
      var formId = container.getAttribute('data-form-id');
      fetch('/apps/forms/' + formId, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submission: body }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw d; return d; }); })
        .then(function () {
          var successEl2 = el('div', 'nf-form');
          successEl2.innerHTML = '<div class="nf-success">' + ICO.success + '<span>' + esc(data.successMessage || 'Thank you! Your submission was received.') + '</span></div>';
          canvas.innerHTML = ''; canvas.appendChild(successEl2);
        })
        .catch(function (err) {
          submitLbl2.textContent = data.submitLabel || 'Submit'; submitBtn2.disabled = false;
          if (err && err.errors) {
            Object.keys(err.errors).forEach(function (fid) {
              var target = form.querySelector(fid === 'form' ? '.nf-actions' : '#nf-field-' + fid);
              if (target) { target.setAttribute('data-error', 'true'); var errMsg2 = el('div', 'nf-error-msg'); errMsg2.innerHTML = ICO.error + '<span>' + esc(String(err.errors[fid])) + '</span>'; target.appendChild(errMsg2); }
            });
          }
        });
    });
    canvas.appendChild(form);
  }

  /* ─── MAIN INIT ──────────────────────────────────────────────────────────── */
  function initBlock(blockEl) {
    if (blockEl.getAttribute('data-runtime-initialized') === 'true') return;
    if (blockEl.getAttribute('data-design-mode') === 'true') return;
    var formId = blockEl.getAttribute('data-form-id');
    var canvas = blockEl.querySelector('.nativeforms-canvas-container');
    if (!formId || !canvas) return;
    blockEl.setAttribute('data-runtime-initialized', 'true');

    canvas.innerHTML = '<div class="nf-form" style="text-align:center;padding:48px 20px;"><div class="nf-spin"></div><p style="margin:14px 0 0;color:var(--nf-text-secondary,#64748b);font-size:14px;">Loading form\u2026</p></div>';

    fetch('/apps/forms/' + formId)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) { canvas.innerHTML = '<div class="nf-form" style="text-align:center;color:#ef4444;padding:40px;">Form not found.</div>'; return; }
        applyGlobalStyles(blockEl, data.globalStyles);

        // Decide: single-page or multi-step?
        var hasStepBreak = (data.fields || []).some(function (f) { return f.type === 'pagebreak'; });
        if (hasStepBreak) {
          buildMultiStepForm(blockEl, canvas, data);
        } else {
          buildSinglePageForm(blockEl, canvas, data);
        }
      })
      .catch(function (err) {
        console.error('[NativeForms] load error', err);
        canvas.innerHTML = '<div class="nf-form" style="text-align:center;color:#ef4444;padding:40px;">Unable to load this form.</div>';
      });
  }

  function initAll() { document.querySelectorAll('.nativeforms-app-block').forEach(initBlock); }
  initAll();
  document.addEventListener('DOMContentLoaded', initAll);
  document.addEventListener('shopify:section:load', initAll);
  document.addEventListener('shopify:block:load', initAll);
})();
