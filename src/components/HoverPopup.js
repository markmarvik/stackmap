/**
 * HoverPopup — minimal floating card on node hover (read-only).
 * Now includes green personalized match score badge when personal data is present (#7 / 4.1).
 */

import { personalizedScore } from "../core/ScoringEngine.js";

export class HoverPopup {
  constructor() {
    this.el = null;
    this.currentId = null;
  }

  init() {
    this.el = document.getElementById('node-hover-popup');
    if (!this.el) {
      console.warn('HoverPopup: #node-hover-popup element not found in DOM');
    }
    return this;
  }

  show(node, clientX, clientY) {
    if (!this.el || !node) return;

    this.currentId = node.id;

    // Always clear any stale high-dose notes and personal score badges before building new content
    // This prevents spam / multiple "XX match for you" badges on repeated mousemove hovers
    const oldNotes = this.el.querySelectorAll('.popup-high-dose-note');
    oldNotes.forEach(n => n.remove());
    const oldScores = this.el.querySelectorAll('.popup-personal-score');
    oldScores.forEach(n => n.remove());

    const pad = 16;
    const cardW = 260;
    const cardH = 140;
    this.el.style.left = Math.min(clientX + 18, window.innerWidth - cardW - pad) + 'px';
    this.el.style.top = Math.max(pad, Math.min(clientY - 16, window.innerHeight - cardH - pad)) + 'px';

    const nameEl = document.getElementById('popup-name');
    if (nameEl) nameEl.textContent = node.name || '';

    const vitEl = document.getElementById('popup-vitality');
    if (vitEl) {
      vitEl.textContent = String(node.vitality ?? '');
      vitEl.title = 'App rating, not a health outcome';
    }

    const catEl = document.getElementById('popup-cat');
    if (catEl) catEl.textContent = (node.cat || '').toUpperCase();

    const scoresEl = document.getElementById('popup-scores');
    if (scoresEl) {
      if (node._isBiomarker || node._isBlood) {
        const spec = node.specimen_type ? ` · ${String(node.specimen_type).toUpperCase()}` : '';
        scoresEl.textContent = node.current != null
          ? `${node.current} ${node.unit || ''}${spec}`
          : `Biomarker${spec}`;
        scoresEl.title = '';
      } else if (node._isEnvironment || node.impact === 'negative') {
        scoresEl.textContent = `Harm: ${node.longevity ?? '—'}`;
        scoresEl.title = 'App rating, not a health outcome';
      } else {
        scoresEl.textContent = `L${node.longevity ?? '—'} · Q${node.qol ?? '—'}`;
        scoresEl.title = 'App rating, not a health outcome';
      }
    }

    const blurbEl = document.getElementById('popup-blurb');
    if (blurbEl) blurbEl.textContent = node.blurb || '';

    const organsEl = document.getElementById('popup-organs');
    if (organsEl) {
      organsEl.innerHTML = '';
      (node.organs || []).slice(0, 4).forEach(key => {
        const meta = window.AETHERIS_ORGAN_META?.[key];
        if (!meta) return;
        const chip = document.createElement('span');
        chip.className = 'px-1.5 py-0.5 rounded-lg text-[10px] border';
        chip.style.borderColor = meta.color + '44';
        chip.style.background = meta.color + '12';
        chip.style.color = meta.color;
        chip.textContent = meta.label;
        organsEl.appendChild(chip);
      });
    }

    // Green personalized match score badge (if we have any personal data) (#7)
    const p = (window.AETHERIS && window.AETHERIS.personal) || {};
    const hasPersonal = Object.keys(p).some(k => p[k] !== '' && p[k] != null);
    if (hasPersonal && !(node.impact === 'negative' || node._isNegative)) {
      try {
        const ps = personalizedScore(node, p);
        if (ps && ps > 0) {
          const scoreBadge = document.createElement('div');
          scoreBadge.className = 'mt-1.5 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 popup-personal-score';
          scoreBadge.title = 'App match rating from your profile, not a health outcome.';
          let barColor = ps >= 70 ? 'bg-emerald-400' : (ps >= 50 ? 'bg-yellow-400' : 'bg-slate-400');
          scoreBadge.innerHTML = `
            <span class="font-mono font-bold">${ps}</span>
            <span class="uppercase tracking-widest text-[9px]">personal score</span>
            <div class="w-8 h-1.5 bg-white/20 rounded ml-1 overflow-hidden"><div class="${barColor} h-full" style="width:${ps}%"></div></div>
          `;
          if (organsEl && organsEl.parentNode) {
            organsEl.parentNode.appendChild(scoreBadge);
          } else if (blurbEl && blurbEl.parentNode) {
            blurbEl.parentNode.appendChild(scoreBadge);
          }
        }
      } catch { /* non-fatal */ }
    }

    // Subtle note for high dose risk supps (referenced on map hover)
    const hasHighDose = !!(node.highDoseRisks);
    const isNegHover = !!(node.impact === 'negative' || node._isNegative);
    if (hasHighDose && !isNegHover) {
      const note = document.createElement('div');
      note.className = 'text-[9px] text-orange-400/80 mt-1 flex items-center gap-1 popup-high-dose-note popup-blink';
      note.innerHTML = '<span class="popup-blink">⚠ High-dose caution noted</span>';
      organsEl.parentNode.appendChild(note);
    }

    // Make visible so we can measure real height (extra badges / content can make it taller than the old 140px assumption)
    this.el.style.display = 'block';
    this.el.classList.remove('hidden');

    // Re-adjust top after content is inserted to avoid extending past the bottom of the screen
    const pad2 = 12;
    const measuredH = this.el.offsetHeight || 160;
    const desiredTop = Math.max(pad2, Math.min(clientY - 16, window.innerHeight - measuredH - pad2));
    this.el.style.top = desiredTop + 'px';
  }

  hide() {
    if (this.el) {
      this.el.style.display = 'none';
      this.el.classList.add('hidden');
      // Clean up dynamic badges so they don't linger if popup is reused
      const oldNotes = this.el.querySelectorAll('.popup-high-dose-note, .popup-personal-score');
      oldNotes.forEach(n => n.remove());
    }
    this.currentId = null;
  }
}