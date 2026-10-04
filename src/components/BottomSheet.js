/**
 * BottomSheet
 *
 * Mobile-first progressive disclosure for the node map (GitHub Issue #1).
 * - Preview: modest bottom rise (~34vh) with compact info (hover analog + personal match).
 * - Expanded: ~88vh with full rich inspector (re-uses populateInspector for mechanisms, organs, actions, etc.).
 * - Drag handle or header to snap between states / dismiss.
 * - Tap exposed map area or close button dismisses.
 * - Re-tap same node while in preview → expand.
 *
 * Designed to sit on top of the canvas map without fighting NativeControls-style bars (uses safe-area).
 * On md+ viewports the desktop left inspector is used instead (see index.html + main.js routing).
 */
export class BottomSheet {
  constructor() {
    this.sheetEl = null;
    this.handleEl = null;
    this.nameEl = null;
    this.vitEl = null;
    this.previewEl = null;
    this.fullEl = null;
    this.expandBtn = null;
    this.closeBtn = null;

    this.currentNode = null;
    this.mode = 'closed'; // 'closed' | 'preview' | 'expanded'
    this._dragState = null;
  }

  init() {
    this.sheetEl = document.getElementById('mobile-bottom-sheet');
    this.handleEl = document.getElementById('sheet-handle');
    this.nameEl = document.getElementById('sheet-name');
    this.vitEl = document.getElementById('sheet-vitality');
    this.previewEl = document.getElementById('sheet-preview-content');
    this.fullEl = document.getElementById('sheet-full-content');
    this.expandBtn = document.getElementById('sheet-expand-btn');
    this.closeBtn = document.getElementById('sheet-close-btn');

    if (!this.sheetEl) {
      console.warn('[BottomSheet] #mobile-bottom-sheet not found in DOM');
      return this;
    }

    // Static button wiring
    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.close(true);
    }
    if (this.expandBtn) {
      this.expandBtn.onclick = () => this.expand();
    }

    // Tap the header (name area) to toggle expand when in preview
    const header = this.sheetEl.querySelector('.border-b');
    if (header) {
      header.addEventListener('click', (e) => {
        // Ignore clicks on the buttons themselves
        if (e.target.closest('#sheet-expand-btn') || e.target.closest('#sheet-close-btn')) return;
        if (this.mode === 'preview') this.expand();
        else if (this.mode === 'expanded') this._snapToPreview();
      });
    }

    this._attachDrag();

    // Stop bubble AFTER children handle the event (no capture — #31 buttons must fire first).
    // Whole-sheet click/pointerdown so map chrome doesn't fight; do NOT stop move/up (sheet drag uses window listeners).
    const stopBubble = (e) => e.stopPropagation();
    this.sheetEl.addEventListener('click', stopBubble);
    this.sheetEl.addEventListener('pointerdown', stopBubble, { passive: true });

    // Start fully closed
    this._setHeight(0, true);
    this.sheetEl.classList.add('hidden');

    return this;
  }

  _isMobile() {
    // Keep in sync with main.js isMobileViewport
    return window.innerWidth < 768 || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  getCurrentNodeId() {
    return this.currentNode ? this.currentNode.id : null;
  }

  getMode() {
    return this.mode;
  }

  showPreview(node) {
    if (!this.sheetEl || !node) return;

    this.currentNode = node;
    this.mode = 'preview';

    // Header
    if (this.nameEl) this.nameEl.textContent = node.name || '';
    if (this.vitEl) {
      const vit = node.vitality || node.longevity || 0;
      const isNeg = !!(node.impact === 'negative' || node._isNegative);
      this.vitEl.textContent = isNeg ? `${vit} HARM` : `${vit} VS`;
      this.vitEl.title = 'App rating, not a health outcome';
      this.vitEl.className = isNeg
        ? 'font-mono text-[11px] px-2 py-0.5 rounded-xl bg-red-500/10 text-red-300 border border-red-400/30 shrink-0'
        : (vit >= 85
            ? 'font-mono text-[11px] px-2 py-0.5 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20 shrink-0'
            : 'font-mono text-[11px] px-2 py-0.5 rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 shrink-0');
    }

    // Compact preview body (analogous to hover popup + personal match + hint)
    if (this.previewEl) {
      const isNeg = !!(node.impact === 'negative' || node._isNegative);
      const blurb = node.blurb || '';
      const organs = (node.organs || []).slice(0, 5);

      let personalHtml = '';
      try {
        const p = (window.AETHERIS && window.AETHERIS.personal) || {};
        const hasP = Object.keys(p).some(k => p[k] !== '' && p[k] != null);
        const scorer = window.AETHERIS && window.AETHERIS.personalizedScore;
        if (!isNeg && hasP && typeof scorer === 'function') {
          const ps = scorer(node);
          if (ps) {
            personalHtml = `
              <div class="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30" title="App match rating from your profile, not a health outcome.">
                <span class="font-mono">${ps}</span>
                <span class="uppercase tracking-widest text-[9px]">match for you</span>
              </div>`;
          }
        } else if (!isNeg && !hasP) {
          personalHtml = `<div class="mt-1.5 text-[10px] text-emerald-300/80">Enter stats in Personal Corner for your match score.</div>`;
        }
      } catch { /* personal score is optional */ }

      const organPills = organs.map(o => {
        const meta = (window.AETHERIS_ORGAN_META || {})[o];
        const label = meta ? meta.label : o;
        return `<span class="px-1.5 py-px text-[9px] rounded-full border border-white/10 bg-white/5 text-white/60">${label}</span>`;
      }).join('');

      const stack = window.AETHERIS && window.AETHERIS.myStack;
      const c = (window.AETHERIS && window.AETHERIS.currentConstellation) || 'supplements';
      const inStack = !!(stack && typeof stack.has === 'function' && stack.has(String(node.id), c));
      const stackLabel = inStack ? 'Remove from My Stack' : 'Add to My Stack';
      const stackCls = inStack
        ? 'w-full text-[11px] py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white/80'
        : 'w-full text-[11px] py-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200';

      this.previewEl.innerHTML = `
        <div class="text-[9px] text-white/35 leading-snug mb-1.5">App scores (0-100), not health outcomes</div>
        <div class="text-white/80 text-[12px] leading-snug line-clamp-3">${blurb}</div>
        ${personalHtml}
        ${organPills ? `<div class="mt-2 flex flex-wrap gap-1">${organPills}</div>` : ''}
        <div class="mt-2">
          <button id="sheet-mystack-btn" type="button" class="${stackCls}">${stackLabel}</button>
        </div>
        <div class="mt-2 text-[10px] text-white/40">Tap header or <span class="text-amber-300/90">DETAILS</span> • drag up to expand • drag down to close</div>
        <div class="mt-1.5 text-[9px] text-white/45">Educational, not medical advice</div>
      `;
      this.previewEl.classList.remove('hidden');

      const stackBtn = this.previewEl.querySelector('#sheet-mystack-btn');
      if (stackBtn) {
        stackBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const toggle = window.AETHERIS && window.AETHERIS.toggleMyStackNode;
          if (typeof toggle === 'function') toggle(node, stackBtn);
        });
      }
    }

    if (this.fullEl) this.fullEl.classList.add('hidden');

    this.sheetEl.classList.remove('hidden');
    this._setHeight(38); // modest preview rise (room for the app-score caption)
    this._syncSheetChrome();
  }

  expand() {
    if (!this.sheetEl || !this.currentNode) return;

    this.mode = 'expanded';

    // Switch content
    if (this.previewEl) this.previewEl.classList.add('hidden');
    if (this.fullEl) {
      this.fullEl.classList.remove('hidden');
      this.fullEl.innerHTML = '';

      // Re-use the exact same rich inspector builder as desktop left panel (mechanisms, studies, personal impact, organ clicks, share, etc.)
      const pop = window.AETHERIS && window.AETHERIS.populateInspector;
      if (typeof pop === 'function') {
        try { pop(this.fullEl, this.currentNode); } catch (e) { console.warn('[BottomSheet] populateInspector failed', e); }
      } else {
        // Fallback: minimal full content
        this.fullEl.innerHTML = `<div class="text-white/60 text-xs">Full details for ${this.currentNode.name}. (Inspector renderer not available.)</div>`;
      }
    }

    this._setHeight(88);
    this._syncSheetChrome();
  }

  _snapToPreview() {
    if (!this.sheetEl || !this.currentNode) return;
    this.mode = 'preview';
    if (this.fullEl) this.fullEl.classList.add('hidden');
    if (this.previewEl) this.previewEl.classList.remove('hidden');
    this._setHeight(38);
    this._syncSheetChrome();
  }

  /** Fixed footer sits over the sheet hint; body.sheet-open hides it on small screens. */
  _syncSheetChrome() {
    document.body.classList.toggle('sheet-open', this.mode !== 'closed');
  }

  close(animate = true) {
    if (!this.sheetEl) return;
    this.mode = 'closed';
    this.currentNode = null;

    if (this.previewEl) this.previewEl.innerHTML = '';
    if (this.fullEl) {
      this.fullEl.innerHTML = '';
      this.fullEl.classList.add('hidden');
    }

    if (animate) {
      this._setHeight(0);
      // After transition, fully hide to not block clicks. Footer returns with the sheet.
      setTimeout(() => {
        if (this.mode === 'closed' && this.sheetEl) {
          this.sheetEl.classList.add('hidden');
          document.body.classList.remove('sheet-open');
        }
      }, 260);
    } else {
      this._setHeight(0, true);
      this.sheetEl.classList.add('hidden');
      document.body.classList.remove('sheet-open');
    }
  }

  _setHeight(vh, immediate = false) {
    if (!this.sheetEl) return;
    if (immediate) this.sheetEl.style.transition = 'none';
    this.sheetEl.style.height = vh > 0 ? `${vh}vh` : '0px';
    if (immediate) {
      // force reflow then restore transition
      this.sheetEl.offsetHeight;
      this.sheetEl.style.transition = 'height 240ms cubic-bezier(0.22, 1.0, 0.36, 1)';
    }
  }

  _attachDrag() {
    if (!this.handleEl || !this.sheetEl) return;

    // Drag can start from handle OR the header area (per Issue #18) but NOT from content.
    // This keeps content scrollable/draggable only for its own scroll.
    const header = this.sheetEl.querySelector('.border-b');

    const onDown = (e) => {
      // Only primary pointer
      if (e.button != null && e.button !== 0) return;

      // Ensure we only drag when starting on allowed drag zones
      const target = e.target;
      const isHandle = this.handleEl && (target === this.handleEl || this.handleEl.contains(target));
      const isHeader = header && (target === header || header.contains(target));
      if (!isHandle && !isHeader) return;

      e.preventDefault();

      const rect = this.sheetEl.getBoundingClientRect();
      const currentVh = (rect.height / window.innerHeight) * 100;

      this._dragState = {
        startClientY: e.clientY,
        startVh: currentVh,
        lastVh: currentVh,
        pointerId: e.pointerId,
      };

      this.sheetEl.style.transition = 'none';
      try { this.handleEl.setPointerCapture(e.pointerId); } catch { /* already released */ }
    };

    const onMove = (e) => {
      if (!this._dragState || !this.sheetEl) return;
      e.preventDefault();

      const dy = this._dragState.startClientY - e.clientY; // positive = drag up (increase height)
      const dVh = (dy / window.innerHeight) * 100;
      let nextVh = this._dragState.startVh + dVh;

      // Reasonable clamps while dragging
      nextVh = Math.max(18, Math.min(94, nextVh));
      this._dragState.lastVh = nextVh;

      this.sheetEl.style.height = `${nextVh}vh`;
    };

    const onUp = () => {
      if (!this._dragState || !this.sheetEl) return;

      try { this.handleEl.releasePointerCapture(this._dragState.pointerId); } catch { /* already released */ }

      const endVh = this._dragState.lastVh || 0;
      this.sheetEl.style.transition = 'height 220ms cubic-bezier(0.22, 1.0, 0.36, 1)';

      // Snap logic (smart progressive)
      if (endVh < 24) {
        this.close(true);
      } else if (endVh < 58) {
        // Snap to preview
        this._snapToPreview();
      } else {
        // Snap to (or stay in) expanded + ensure full content is populated
        if (this.mode !== 'expanded') {
          this.expand();
        } else {
          this._setHeight(88);
        }
      }

      this._dragState = null;
    };

    // Pointer events (unifies mouse + touch)
    // Attach down to handle + header so drag works from the top bar (Issue #18)
    this.handleEl.addEventListener('pointerdown', onDown, { passive: false });
    if (header) {
      header.addEventListener('pointerdown', onDown, { passive: false });
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { passive: false });
    window.addEventListener('pointercancel', onUp, { passive: false });

    // Fallbacks for pure touch (some browsers)
    const attachTouchStart = (el) => {
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        // We let pointerdown handle most, but ensure we have a starting point
        if (!this._dragState && e.touches && e.touches.length) {
          const fake = { clientY: e.touches[0].clientY, button: 0, pointerId: 1, preventDefault: () => {} };
          onDown(fake);
        }
      }, { passive: false });
    };
    attachTouchStart(this.handleEl);
    attachTouchStart(header);
  }
}
