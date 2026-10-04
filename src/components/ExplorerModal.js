/**
 * ExplorerModal
 * 
 * The rich "Gorkipedia Deep Explorer" modal.
 * Ports the full interactive experience from the original.
 */

export class ExplorerModal {
  constructor() {
    this.el = null;
    this.currentId = null;
    this.currentNode = null;
    this.onHighlight = null;
    this.onStack = null;
  }

  init() {
    this.el = document.getElementById('gorkipedia-explorer-modal');
    if (!this.el) {
      console.warn('ExplorerModal: #gorkipedia-explorer-modal not found');
    }
    return this;
  }

  open(node, callbacks = {}) {
    if (!this.el || !node) return;

    this.currentId = node.id;
    this.currentNode = node;
    this.onHighlight = callbacks.onHighlight || (() => {});
    this.onStack = callbacks.onStack || (() => {});

    const isNeg = !!(node.impact === 'negative' || node._isNegative);

    // Header
    document.getElementById('modal-name').textContent = node.name;
    const badge = document.getElementById('modal-vitality-badge');
    const vit = node.vitality || 70;
    badge.textContent = vit + ' VS';
    badge.title = 'App rating, not a health outcome';
    if (isNeg) {
      badge.textContent = vit + ' HARM';
      badge.className = 'font-mono text-sm px-3 py-1 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold';
    } else {
      badge.className = vit >= 85 
        ? 'font-mono text-sm px-3 py-1 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-black font-bold'
        : 'font-mono text-sm px-3 py-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 text-black font-bold';
    }

    // Glance
    const glance = document.getElementById('modal-glance');
    const gLabel = isNeg ? 'Harm Score' : 'Longevity';
    const cLabel = isNeg ? 'Harms' : 'Conditions';
    glance.innerHTML = `
      <div class="bg-[#0a0d1a] px-3 py-1.5 rounded-2xl border border-white/10" title="App rating, not a health outcome">${gLabel} <span class="font-mono ${isNeg ? 'text-red-400' : 'text-emerald-400'}">${node.longevity}</span></div>
      <div class="bg-[#0a0d1a] px-3 py-1.5 rounded-2xl border border-white/10" title="App rating, not a health outcome">QoL <span class="font-mono text-violet-400">${node.qol}</span></div>
      <div class="bg-[#0a0d1a] px-3 py-1.5 rounded-2xl border border-white/10">${cLabel} <span class="font-mono ${isNeg ? 'text-red-400' : 'text-emerald-400'}">${node.diseases}</span></div>
    `;

    // Green personal match badge in modal (consistent with inspector/hover, #7) - prominent
    if (!isNeg && (node.impact !== 'negative')) {
      const p = (window.AETHERIS && window.AETHERIS.personal) || {};
      const hasP = Object.keys(p).some(k => p[k] !== '' && p[k] != null);
      if (hasP && window.AETHERIS && typeof window.AETHERIS.personalizedScore === 'function') {
        try {
          const ps = window.AETHERIS.personalizedScore(node);
          if (ps) {
            const psBadge = document.createElement('div');
            psBadge.className = 'mt-2 text-xs px-2 py-1 rounded-xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 inline-flex items-center gap-2';
            psBadge.title = 'App match rating from your profile, not a health outcome.';
            let barColor = ps >= 70 ? 'bg-emerald-400' : (ps >= 50 ? 'bg-yellow-400' : 'bg-slate-400');
            psBadge.innerHTML = `<span class="font-mono font-semibold text-sm">${ps}</span> <span class="uppercase tracking-[1px] text-[9px]">personal score</span> <div class="w-10 h-1.5 bg-white/20 rounded overflow-hidden"><div class="${barColor} h-full" style="width:${Math.max(5,ps)}%"></div></div>`;
            glance.parentElement.appendChild(psBadge);
          }
        } catch { /* personal score is optional */ }
      }
    }

    // Organs (clickable for benefit explanations, 6.2 + 7.1)
    const orgEl = document.getElementById('modal-organs');
    orgEl.innerHTML = '';
    const organHintMap = {
      brain: 'Studied for cognition, mood, and inflammation pathways.',
      heart: 'Studied for endothelial function, lipid profiles, and cardiac energy use.',
      immune: 'Studied for inflammation balance, immune surveillance, and barrier integrity.',
      mito: 'Studied for mitochondrial biogenesis, ATP, and oxidative stress.',
      muscle: 'Studied for protein synthesis, recovery, and muscle maintenance.',
      metabolic: 'Studied for insulin sensitivity, AMPK, and glucose/lipid handling.',
      gut: 'Studied for microbiome support, barrier strength, and SCFA/butyrate.',
      joints: 'Studied for cartilage matrix and connective-tissue inflammation.',
      eyes: 'Studied for macular pigment and retinal oxidative stress.',
      liver: 'Studied for phase II pathways, NF-κB/Nrf2, and fat metabolism.'
    };
    let organBenefitHost = document.getElementById('modal-organ-benefit');
    if (!organBenefitHost) {
      organBenefitHost = document.createElement('div');
      organBenefitHost.id = 'modal-organ-benefit';
      organBenefitHost.className = 'text-[10px] mt-1 px-1 text-white/75 hidden';
      if (orgEl.parentElement) orgEl.parentElement.appendChild(organBenefitHost);
    }
    (node.organs || []).forEach(key => {
      const meta = window.AETHERIS_ORGAN_META?.[key];
      if (!meta) return;
      const c = document.createElement('div');
      c.className = 'px-2.5 py-1 text-xs rounded-2xl cursor-pointer flex items-center gap-x-1.5 border hover:scale-[1.02] active:scale-[0.98] transition';
      c.style.borderColor = meta.color + '44';
      c.style.background = meta.color + '12';
      c.innerHTML = `<i class="fa-solid ${meta.icon}" style="color:${meta.color}"></i><span style="color:${meta.color}">${meta.label}</span>`;
      c.onclick = () => {
        const hint = organHintMap[key] || 'Organ system tagged on this entry.';
        const rel = (node.mechanisms || []).filter(m => m.toLowerCase().includes(key) || (key==='brain' && /neuro|bdnf|cog/i.test(m)) || (key==='heart' && /cardio|endoth|vascular/i.test(m))).slice(0,1);
        organBenefitHost.innerHTML = `<span class="text-[10px] font-semibold" style="color:${meta.color}">${meta.label}:</span> ${hint} ${rel.length ? ' <span class="text-white/50">Via: ' + rel[0] + '</span>' : ''}`;
        organBenefitHost.classList.remove('hidden');
        organBenefitHost.onclick = () => organBenefitHost.classList.add('hidden');
      };
      orgEl.appendChild(c);
    });

    // Mechanisms
    const mechEl = document.getElementById('modal-mechanisms');
    mechEl.innerHTML = '';
    const mechs = node.mechanisms || (isNeg ? ['Associated with oxidative stress in some studies', 'Studied for effects on normal physiology', 'Associated with higher disease risk in some studies'] : ['Studied for core longevity pathways', 'Studied for effects on chronic inflammation', 'Studied for cellular stress responses']);
    const mechLabel = isNeg ? 'A risk pathway discussed in sources for this entry.' : 'A pathway discussed in sources for this entry.';
    mechs.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = isNeg 
        ? 'p-2.5 bg-[#0a0d1a] rounded-2xl border border-red-500/30 text-xs cursor-pointer hover:border-red-400/50 transition'
        : 'p-2.5 bg-[#0a0d1a] rounded-2xl border border-white/10 text-xs cursor-pointer hover:border-amber-400/30 transition';
      row.innerHTML = `<div class="font-medium">${m}</div><div class="text-[10px] text-white/50 mt-0.5 hidden" id="mech-detail-${idx}">${mechLabel}</div>`;
      row.onclick = () => {
        const d = document.getElementById(`mech-detail-${idx}`);
        if (d) d.classList.toggle('hidden');
      };
      mechEl.appendChild(row);
    });

    // Studies
    const studyEl = document.getElementById('modal-studies');
    studyEl.innerHTML = '';
    const studies = node.studies || (isNeg ? [{ year: 2020, finding: 'Associated with harm in some reports', source: 'RCTs, metas, cohorts' }] : [{ year: 2023, finding: 'Investigated for possible effects in human and mechanistic research', source: 'Meta-analyses & RCTs' }]);
    // study header text is static in HTML; the card content above already signals harm via red styling and negative findings in data
    studies.forEach(s => {
      const card = document.createElement('div');
      card.className = isNeg 
        ? 'p-3 bg-[#0a0d1a] rounded-2xl border border-red-500/30 text-xs flex justify-between items-start gap-3'
        : 'p-3 bg-[#0a0d1a] rounded-2xl border border-white/10 text-xs flex justify-between items-start gap-3';
      card.innerHTML = `
        <div>
          <span class="font-mono ${isNeg ? 'text-red-300' : 'text-amber-300'}">${s.year}</span> — ${s.finding}
          <div class="text-[10px] text-white/50 mt-0.5">${s.source}</div>
        </div>
        <button class="text-[10px] px-2 py-1 border border-white/20 rounded-lg hover:bg-white/5">Cite</button>
      `;
      card.querySelector('button').onclick = (e) => {
        const btn = e.target;
        const citeText = `${s.year} — ${s.finding}. ${s.source || 'Primary literature'}. (AETHERIS monograph)`;
        navigator.clipboard?.writeText(citeText).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { if (btn && btn.isConnected) btn.textContent = 'Cite'; }, 1400);
        }).catch(() => {
          btn.textContent = 'Copy failed';
          setTimeout(() => { if (btn && btn.isConnected) btn.textContent = 'Cite'; }, 900);
        });
      };
      studyEl.appendChild(card);
    });

    // Dosage + Risks (deduped highDoseRisks into unified Safety Profile below)
    const dosageEl = document.getElementById('modal-dosage');
    dosageEl.innerHTML = `<span class="text-white/60">Typical:</span> ${node.dosage || 'No typical range listed'}`;
    if (node.dosage && !(node.impact === 'negative' || node._isNegative)) {
      const bar = document.createElement('div');
      bar.className = 'mt-2';
      bar.innerHTML = `<div class="h-1.5 w-full rounded bg-white/10 overflow-hidden flex"><span class="h-1.5 w-[18%] bg-emerald-400/60" title="Lower common range"></span><span class="h-1.5 w-[45%] bg-emerald-300" title="Often-cited range"></span><span class="h-1.5 w-[20%] bg-amber-400/70" title="Higher range"></span><span class="h-1.5 flex-1 bg-red-500/50" title="Caution"></span></div>
        <div class="flex text-[8px] text-white/50 mt-0.5 justify-between"><span>low</span><span class="text-emerald-300">mid</span><span>high</span><span class="text-red-300/70">caution</span></div>`;
      dosageEl.appendChild(bar);
    }
    let risksHtml = node.risks ? `<i class="fa-solid fa-exclamation-triangle mr-1"></i>${node.risks}` : (isNeg ? '<span class="text-red-300/80">Documented negative effects — see mechanisms.</span>' : '');
    document.getElementById('modal-risks').innerHTML = risksHtml || '<span class="text-white/40">No specific caution listed in this entry.</span>';

    // Synergies
    const synEl = document.getElementById('modal-synergies');
    synEl.innerHTML = '';
    const syns = node.synergies || [];
    if (syns.length) {
      syns.forEach(sid => {
        const pill = document.createElement('button');
        pill.className = 'px-3 py-1 rounded-2xl text-xs border border-white/20 hover:bg-white/5';
        pill.textContent = sid.toUpperCase();
        pill.onclick = () => {
          if (this.onHighlight) this.onHighlight([sid]);
        };
        synEl.appendChild(pill);
      });
    } else {
      synEl.innerHTML = `<span class="text-white/50 text-xs">No related items listed for this entry.</span>`;
    }

    // 7.2 + 7.3 + 8.1: Share monograph + external sources (constructed, no node data changes)
    const actionsRow = document.createElement('div');
    actionsRow.className = 'mt-2 flex items-center gap-2';
    actionsRow.innerHTML = `
      <button id="modal-share-btn" class="text-[10px] px-3 py-1 rounded-2xl border border-white/20 hover:bg-white/10 flex items-center gap-1 text-white/80"><i class="fa-brands fa-x-twitter"></i> <span>Share</span></button>
      <button id="modal-ext-btn" class="text-[10px] px-3 py-1 rounded-2xl border border-white/20 hover:bg-white/10 text-white/80">External sources ↗</button>
      <span class="text-[9px] text-white/40 ml-1">Similar: ${syns.length ? syns.slice(0,3).join(', ').toUpperCase() : 'see organ overlap in map'}</span>
    `;
    // Insert after synergies container's parent section (the synergies card)
    const synContainer = synEl.parentElement;
    if (synContainer && synContainer.parentElement) {
      synContainer.parentElement.insertBefore(actionsRow, synContainer.nextSibling);
    } else if (synContainer) {
      synContainer.appendChild(actionsRow);
    }
    // Wire share
    const shareBtn = actionsRow.querySelector('#modal-share-btn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const txt = `${node.name} — app rating ${node.vitality || node.longevity} on StackMap. ${node.blurb || ''} markmarvik.github.io/stackmap 🧬`;
        navigator.clipboard?.writeText(txt).catch(()=>{});
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(txt)}`, '_blank', 'width=560,height=420');
      };
    }
    const extBtn = actionsRow.querySelector('#modal-ext-btn');
    if (extBtn) {
      extBtn.onclick = () => {
        // Only point to Gorkipedia article (7.3). Prefer explicit node.url on the entry; fallback by id.
        // #10 deep links
        let url = node.grokipediaUrl || node.url;
        if (!url && node.gorkipedia) url = `https://grokipedia.com/${encodeURIComponent(node.id)}`;
        if (!url) url = `https://examine.com/search/?q=${encodeURIComponent(node.name)}`;
        window.open(url, '_blank');
      };
      extBtn.textContent = 'Read full on Gorkipedia ↗';
    }

    // Expanded inspector details (new fields for richer inspector)
    const expEl = document.getElementById('modal-expanded');
    if (expEl) {
      expEl.innerHTML = '';
      const details = [
        { label: 'TIMING', val: node.timing },
        { label: 'BEST FORMS', val: node.bestForms },
        { label: 'DEFICIENCY SIGNS', val: node.deficiencySigns },
        { label: 'ABSORPTION', val: node.absorption }
      ];
      details.forEach(d => {
        if (!d.val) return;
        const card = document.createElement('div');
        card.className = 'p-2.5 bg-[#0a0d1a] rounded-2xl border border-white/10 text-[11px]';
        card.innerHTML = `<div class="uppercase tracking-widest text-[9px] text-white/50 mb-0.5">${d.label}</div><div class="text-white/85">${d.val}</div>`;
        expEl.appendChild(card);
      });
      if (!expEl.children.length) {
        expEl.innerHTML = `<span class="text-white/40 text-xs">Additional practical details available in full codex entries.</span>`;
      }
    }

    // 6.3 Deduped Safety Profile card (single source of truth for risks + highDoseRisks)
    const safetyHost = document.getElementById('modal-risks'); // reuse the risks container area for the unified card
    if (safetyHost && (node.highDoseRisks || node.risks)) {
      // If we already put simple text, upgrade the whole block to a nice collapsible Safety Profile
      const hasHigh = !!node.highDoseRisks;
      const hasRisk = !!node.risks;
      const safety = document.createElement('div');
      safety.className = 'mt-2 p-2.5 rounded-2xl border text-[11px] ' + (isNeg ? 'bg-red-950/30 border-red-500/30' : 'bg-orange-950/30 border-orange-500/30');
      let html = `<div class="uppercase tracking-widest text-[9px] ${isNeg ? 'text-red-400' : 'text-orange-400'} mb-1 flex items-center gap-1"><i class="fa-solid fa-shield-halved"></i> SAFETY PROFILE</div>`;
      if (hasRisk) html += `<div class="text-white/85">${node.risks}</div>`;
      if (hasHigh) {
        html += `<div class="mt-1.5 pt-1.5 border-t border-white/10 text-orange-200/95"><span class="font-semibold text-orange-300">HIGH DOSE / CAUTION:</span> ${node.highDoseRisks}</div>`;
      }
      // Make the safety section collapsible for long content (6.5 spirit)
      safety.innerHTML = html + `<div class="text-[9px] mt-1 text-white/40 cursor-pointer select-none" onclick="this.parentElement.classList.toggle('max-h-12');this.parentElement.classList.toggle('overflow-hidden');this.textContent = this.textContent.includes('more') ? 'less' : 'more…'">more…</div>`;
      // Only inject if not already a full profile (avoid double on re-open edge)
      if (!safetyHost.querySelector('.fa-shield-halved')) {
        safetyHost.innerHTML = '';
        safetyHost.appendChild(safety);
      }
    }

    // Gorkipedia deep text
    const gorkEl = document.getElementById('modal-gorkipedia');
    gorkEl.innerHTML = node.gorkipedia || `<p>${node.blurb}</p><p class="mt-2 text-white/60">Full monograph available in the complete codex.</p>`;

    // Hide any lingering hover popup when modal opens
    if (window.AETHERIS?.popup && typeof window.AETHERIS.popup.hide === 'function') {
      window.AETHERIS.popup.hide();
    }

    this.el.style.display = 'flex';
    this.el.classList.remove('hidden');
  }

  close() {
    if (this.el) {
      this.el.style.display = 'none';
      this.el.classList.add('hidden');
    }
    this.currentId = null;

    // Optional: refresh tree to clear highlights when closing modal
    if (window.AETHERIS?.tree) {
      window.AETHERIS.tree.draw();
    }
  }

  highlightInTree() {
    if (this.onHighlight && this.currentId) {
      this.onHighlight([this.currentId]);
    }
    this.close();
  }

  simulateStack() {
    if (this.onStack && this.currentNode) {
      const ids = this.currentNode.synergies ? [...this.currentNode.synergies] : [];
      ids.unshift(this.currentId);
      this.onStack(ids);
    }
    this.close();
  }
}
