/**
 * AETHERIS - Modular Entry Point
 * 
 * Body-centric visualization: central body model with nodes clustered around the
 * organs they influence most (higher vitality = closer + larger). Each node shows
 * centered vitality score + short name + warnings. Works for both Supplements and Habits.
 */

import { supplements, categories, organMeta } from "./data/supplements.js";
import { habits, habitCategories } from "./data/habits.js";
import { exercises, exerciseCategories } from "./data/exercises.js";
import { foods, foodCategories } from "./data/foods.js";
import { environment, environmentCategories } from "./data/environment.js";
import { biomarkers, biomarkerCategories, specimenTypes } from "./data/biomarkers.js";
import { searchCatalog, STARTER_STACKS, CATALOG } from "./data/catalog.js";
import { SupplementTree } from "./trees/SupplementTree.js";
import { HabitsTree } from "./trees/HabitsTree.js";
import { ExerciseTree } from "./trees/ExerciseTree.js";
import { FoodsTree } from "./trees/FoodsTree.js";
import { EnvironmentTree } from "./trees/EnvironmentTree.js";
import { BiomarkerTree } from "./trees/BiomarkerTree.js";
import { AllTree, allCategories } from "./trees/AllTree.js";
import { buildUniverse } from "./data/universe.js";
import { HoverPopup } from "./components/HoverPopup.js";
import { ExplorerModal } from "./components/ExplorerModal.js";
import { BottomSheet } from "./components/BottomSheet.js";
import { personalizedScore } from "./core/ScoringEngine.js";
import { myStack } from "./core/MyStack.js";
import { globalOrganSystem } from "./core/OrganSystem.js";
import {
  APP_VERSION,
  FREE_STACK_LIMIT,
  isPro,
  setProKey,
  isOverFreeStackLimit,
  softProGate,
  CHECKOUT_URL,
  PRICING_CHECKOUT_URL,
  pricingPageUrl,
  FEEDBACK_FORM_URL
} from "./core/FeatureFlags.js";
import { track, trackPageView, trackConstellation, initAnalytics } from "./core/Analytics.js";
import { downloadStackShareCard } from "./core/ShareCard.js";
import { PRODUCT_NAME, PUBLIC_HOST_LABEL } from "./core/Brand.js";
import { readStorage, writeStorage } from "./core/persist.js";
import { bootRun } from "./run/boot.js";

// Import Tailwind + custom styles (processed by Vite)
import './style.css';

// Expose organ meta globally for components that need it
window.AETHERIS_ORGAN_META = organMeta;

// Lightweight runtime validation (no Zod, keeps deps zero). Warns on missing/inconsistent fields.
function validateTreeData(data, label = 'data') {
  if (!Array.isArray(data)) {
    console.warn(`[AETHERIS] ${label} is not an array`);
    return;
  }
  const seen = new Set();
  let missing = 0;
  data.forEach((n, i) => {
    if (!n || !n.id || !n.name || !n.cat) {
      missing++;
      if (missing < 4) console.warn(`[AETHERIS] ${label}[${i}] missing id/name/cat`, n);
    }
    if (n && n.id) {
      if (seen.has(n.id)) console.warn(`[AETHERIS] ${label} duplicate id: ${n.id}`);
      seen.add(n.id);
    }
    if (n && typeof n.vitality !== 'number' && typeof n.longevity !== 'number') {
      if (missing < 3) console.warn(`[AETHERIS] ${label} ${n.id || i} lacks vitality/longevity score`);
    }
  });
  if (missing) console.warn(`[AETHERIS] ${label}: ${missing} entries with basic field issues (of ${data.length})`);
}

let treeInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  if (bootRun()) return;

  console.log("%c[AETHERIS Modular] Bootstrapping Supplements tree...", "color:#64748b");

  const canvas = document.getElementById("tree-canvas");
  if (!canvas) {
    console.error("Tree canvas not found");
    return;
  }

  const detailPanel = document.getElementById("detail-panel");

  function isMobileViewport() {
    // Used to decide: left inspector panel (desktop) vs smart bottom sheet (mobile, Issue #1)
    return window.innerWidth < 768 || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  function isEventOverElement(e, el) {
    if (!e || e.clientX == null || e.clientY == null || !el) return false;
    if (el.classList.contains('hidden')) return false;
    const rect = el.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  function isEventOverBottomSheet(e) {
    // Prevent global tap-to-select / close logic from firing when user interacts with the mobile inspector sheet.
    // Fixes collapse on tap inside content (Issues #15, #18).
    return isEventOverElement(e, document.getElementById('mobile-bottom-sheet'));
  }

  function isEventOverAnatomyPanel(e) {
    // Mobile anatomy bottom sheet (z-100) — ignore map select when tapping presets/sliders
    return isEventOverElement(e, document.getElementById('anatomy-panel'));
  }

  // === Initialize Components ===
  const hoverPopup = new HoverPopup().init();
  const explorerModal = new ExplorerModal().init();
  const bottomSheet = new BottomSheet().init();

  // Expose globally for inline onclick handlers in the HTML
  myStack.load();
  window.AETHERIS = {
    popup: hoverPopup,
    modal: explorerModal,
    bottomSheet: bottomSheet,
    tree: treeInstance,
    ORGAN_META: organMeta,
    currentConstellation: 'supplements',
    categories: categories,
    myStack,
    organSystem: globalOrganSystem
  };

  // === Constellation switching (modular) ===
  let currentTreeType = 'supplements';
  const VALID_CONSTELLATIONS = ['all', 'supplements', 'habits', 'exercises', 'foods', 'environment', 'biomarkers'];

  function syncConstellationQuery(type) {
    try {
      const url = new URL(window.location.href);
      const c = String(type || 'supplements').toLowerCase();
      if (!VALID_CONSTELLATIONS.includes(c) || c === 'supplements') {
        url.searchParams.delete('c');
      } else {
        url.searchParams.set('c', c);
      }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (e) {
      console.warn('[AETHERIS] syncConstellationQuery failed', e);
    }
  }

  function parseConstellationDeepLink() {
    try {
      const raw = new URLSearchParams(window.location.search).get('c');
      if (!raw) return null;
      const c = String(raw).trim().toLowerCase();
      return VALID_CONSTELLATIONS.includes(c) ? c : null;
    } catch {
      return null;
    }
  }

  function switchConstellation(type, opts = {}) {
    const next = String(type || '').toLowerCase();
    if (!VALID_CONSTELLATIONS.includes(next)) return;
    if (next === currentTreeType) {
      if (!opts.fromDeepLink) syncConstellationQuery(next);
      return;
    }

    currentTreeType = next;
    type = next; // keep existing body using `type`
    stopInertia();
    hoverPopup.hide();
    if (window.AETHERIS?.bottomSheet) window.AETHERIS.bottomSheet.close(true);
    // Reset multi-touch/pinch state on tree switch
    activePointers.clear();
    prevPinchDist = 0;
    isPinching = false;
    pointerDown = false;
    isPanning = false;
    activePointerId = null;

    if (treeInstance) {
      treeInstance._isPanning = false;
      treeInstance.dispose();
    }

    const isAll = type === 'all';
    const isSupplements = type === 'supplements';
    const isExercises = type === 'exercises';
    const isFoods = type === 'foods';
    const isEnvironment = type === 'environment';
    const isBiomarkers = type === 'biomarkers';

    const allHint = document.getElementById('all-nodes-hint');
    if (allHint) allHint.classList.toggle('hidden', type !== 'all');

    // Create the right tree class
    if (isAll) {
      treeInstance = new AllTree(canvas);
      bindTreeViewport(treeInstance);
      const universe = buildUniverse([
        ['supplements', supplements],
        ['habits', habits],
        ['exercises', exercises],
        ['foods', foods],
        ['environment', environment],
        ['biomarkers', biomarkers]
      ]);
      treeInstance.loadData(universe);
      validateTreeData(universe, 'all');
      window.AETHERIS.categories = allCategories;
    } else if (isSupplements) {
      treeInstance = new SupplementTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(supplements);
      validateTreeData(supplements, 'supplements');
      window.AETHERIS.categories = categories;
    } else if (isExercises) {
      treeInstance = new ExerciseTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(exercises);
      validateTreeData(exercises, 'exercises');
      window.AETHERIS.categories = exerciseCategories;
    } else if (isFoods) {
      treeInstance = new FoodsTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(foods);
      validateTreeData(foods, 'foods');
      window.AETHERIS.categories = foodCategories;
    } else if (isEnvironment) {
      treeInstance = new EnvironmentTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(environment);
      validateTreeData(environment, 'environment');
      window.AETHERIS.categories = environmentCategories;
    } else if (isBiomarkers) {
      treeInstance = new BiomarkerTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(biomarkers);
      validateTreeData(biomarkers, 'biomarkers');
      window.AETHERIS.categories = biomarkerCategories;
      window.AETHERIS.specimenTypes = specimenTypes;
    } else {
      treeInstance = new HabitsTree(canvas);
      bindTreeViewport(treeInstance);
      treeInstance.loadData(habits);
      validateTreeData(habits, 'habits');
      window.AETHERIS.categories = habitCategories;
    }

    // Re-render and center body in the middle
    treeInstance.draw();
    if (typeof treeInstance.recenter === "function") {
      treeInstance.recenter();
    }

    // Update global reference
    window.AETHERIS.tree = treeInstance;
    window.AETHERIS.currentConstellation = type;
    trackConstellation(type);

    // Update button active states
    updateConstellationButtons(type);
    syncConstellationQuery(type);

    // Clear detail panel
    if (detailPanel) {
      const label = isAll ? 'full' : (isBiomarkers ? 'biomarkers' : (isEnvironment ? 'environment' : (isFoods ? 'foods' : (isExercises ? 'exercises' : (isSupplements ? 'supplements' : 'habits')))));
      detailPanel.innerHTML = `<div class="text-white/60">Select a node on the ${label} map</div>`;
    }

    rewireMapControls();
    renderGroupFilters();
    renderNodeLimitControl();
    wireAnatomyControls();
    recomputeOrganSystem();
    renderOrganImpactUI();
    if (treeInstance && typeof treeInstance.draw === 'function') treeInstance.draw();
    // Empty state depends on which map is showing.
    syncMyStackActiveEmpty();
  }

  function updateConstellationButtons(activeType) {
    const allMapBtn = document.getElementById('btn-constellation-all');
    const supBtn = document.getElementById('btn-constellation-supplements');
    const habBtn = document.getElementById('btn-constellation-habits');
    const exBtn = document.getElementById('btn-constellation-exercises');
    const foodBtn = document.getElementById('btn-constellation-foods');
    const envBtn = document.getElementById('btn-constellation-environment');
    const biomarkersBtn = document.getElementById('btn-constellation-biomarkers');
    if (allMapBtn) allMapBtn.classList.toggle('active', activeType === 'all');
    if (supBtn) supBtn.classList.toggle('active', activeType === 'supplements');
    if (habBtn) habBtn.classList.toggle('active', activeType === 'habits');
    if (exBtn) exBtn.classList.toggle('active', activeType === 'exercises');
    if (foodBtn) foodBtn.classList.toggle('active', activeType === 'foods');
    if (envBtn) envBtn.classList.toggle('active', activeType === 'environment');
    if (biomarkersBtn) biomarkersBtn.classList.toggle('active', activeType === 'biomarkers');

    const currentIcon = document.getElementById('constellation-picker-icon');
    const currentName = document.getElementById('constellation-picker-name');
    const activeBtn = document.querySelector(`#constellation-picker .constellation-btn[data-type="${activeType}"]`);
    if (activeBtn && currentIcon && currentName) {
      const srcIcon = activeBtn.querySelector('i');
      const srcLabel = activeBtn.querySelector('span');
      if (srcIcon) currentIcon.className = srcIcon.className;
      if (srcLabel) currentName.textContent = srcLabel.textContent;
    }
  }

  function setMobileConstellationListOpen(open) {
    const list = document.getElementById('constellation-picker-list');
    const chevron = document.getElementById('constellation-picker-chevron');
    const toggle = document.getElementById('constellation-picker-toggle');
    if (list) list.classList.toggle('is-collapsed', !open);
    if (chevron) {
      chevron.classList.toggle('fa-chevron-down', !open);
      chevron.classList.toggle('fa-chevron-up', open);
    }
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function collapseMobileConstellationPicker() {
    setMobileConstellationListOpen(false);
  }

  function renderGroupFilters() {
    const mobile = isMobileViewport();
    const container = mobile
      ? document.getElementById('mobile-group-filters')
      : document.getElementById('group-filters');
    if (!container || !treeInstance) return;

    const cats = (window.AETHERIS.categories || []).filter(c => c.key !== 'all');
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    if (mobile) {
      allBtn.className = 'group-chip w-full text-left px-2 py-1 text-xs rounded-lg border border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 transition font-semibold tracking-wide';
    } else {
      allBtn.className = 'group-chip px-2.5 py-1 text-[10px] rounded-xl border border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 transition font-semibold tracking-wide';
    }
    allBtn.textContent = 'ALL';
    allBtn.onclick = () => {
      // #4: toggleAllGroups (implemented in SupplementTree) turns ALL off when everything is already on.
      // This gives the expected "click All again to clear" quick-reset UX. Falls back only for older tree classes.
      if (typeof treeInstance.toggleAllGroups === 'function') {
        treeInstance.toggleAllGroups();
      } else {
        treeInstance.enableAllGroups();
      }
      syncGroupFilterChips();
      // Sync detail in case the ALL toggle (combined with active limit) culled the selection
      const currentSel = treeInstance.selectedId ? treeInstance.nodes.find(n => n.id === treeInstance.selectedId) : null;
      updateDetail(currentSel);
    };
    container.appendChild(allBtn);

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.key = cat.key;
      if (mobile) {
        btn.className = 'group-chip w-full flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition font-medium tracking-wide';
      } else {
        btn.className = 'group-chip px-2.5 py-1 text-[10px] rounded-xl border transition flex items-center gap-1 font-medium tracking-wide';
      }
      btn.innerHTML = `<i class="fa-solid ${cat.icon} opacity-80"></i><span>${cat.label}</span>`;
      btn.onclick = () => {
        treeInstance.toggleGroup(cat.key);
        syncGroupFilterChips();
        // Always sync detail: _afterGroupChange (or maxNodes) may have nulled selectedId if it fell outside visible set
        const currentSel = treeInstance.selectedId ? treeInstance.nodes.find(n => n.id === treeInstance.selectedId) : null;
        updateDetail(currentSel);
      };
      container.appendChild(btn);
    });

    // Specimen chips (biomarkers constellation only — Issue #14)
    if (currentTreeType === 'biomarkers' && typeof treeInstance.setSpecimenFilter === 'function') {
      const specs = (window.AETHERIS.specimenTypes || []).filter(s => s.key !== 'all');
      if (specs.length) {
        const sep = document.createElement('span');
        sep.className = mobile
          ? 'block w-full text-[9px] uppercase tracking-widest text-violet-300/70 mt-2 mb-1 px-1'
          : 'inline-flex items-center px-1 text-[9px] uppercase tracking-widest text-violet-300/70';
        sep.textContent = 'Specimen';
        container.appendChild(sep);

        specs.forEach(spec => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.specimen = spec.key;
          if (mobile) {
            btn.className = 'specimen-chip w-full flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition font-medium tracking-wide';
          } else {
            btn.className = 'specimen-chip px-2.5 py-1 text-[10px] rounded-xl border transition flex items-center gap-1 font-medium tracking-wide';
          }
          btn.innerHTML = `<i class="fa-solid ${spec.icon} opacity-80"></i><span>${spec.label}</span>`;
          btn.onclick = () => {
            const on = treeInstance.enabledSpecimens?.has(spec.key);
            const next = new Set(treeInstance.enabledSpecimens || []);
            if (on) next.delete(spec.key);
            else next.add(spec.key);
            // Never allow empty — fall back to all
            if (next.size === 0) {
              treeInstance.setSpecimenFilter(['all']);
            } else {
              treeInstance.setSpecimenFilter([...next]);
            }
            syncSpecimenFilterChips();
            const currentSel = treeInstance.selectedId
              ? treeInstance.nodes.find(n => n.id === treeInstance.selectedId)
              : null;
            updateDetail(currentSel);
          };
          container.appendChild(btn);
        });
        syncSpecimenFilterChips();
      }
    }

    syncGroupFilterChips();
  }

  function syncSpecimenFilterChips() {
    if (!treeInstance || !treeInstance.enabledSpecimens) return;
    const containers = [
      document.getElementById('group-filters'),
      document.getElementById('mobile-group-filters')
    ].filter(Boolean);
    containers.forEach(container => {
      container.querySelectorAll('.specimen-chip[data-specimen]').forEach(btn => {
        const on = treeInstance.enabledSpecimens.has(btn.dataset.specimen);
        btn.classList.toggle('border-violet-400/50', on);
        btn.classList.toggle('bg-violet-400/15', on);
        btn.classList.toggle('text-violet-200', on);
        btn.classList.toggle('border-white/10', !on);
        btn.classList.toggle('bg-[#0a0d1a]/60', !on);
        btn.classList.toggle('text-white/35', !on);
        btn.classList.toggle('line-through', !on);
      });
    });
  }

  function syncGroupFilterChips() {
    const containers = [
      document.getElementById('group-filters'),
      document.getElementById('mobile-group-filters')
    ].filter(Boolean);

    containers.forEach(container => {
      if (!treeInstance) return;
      container.querySelectorAll('.group-chip[data-key]').forEach(btn => {
        const on = treeInstance.isGroupEnabled(btn.dataset.key);
        btn.classList.toggle('border-white/25', on);
        btn.classList.toggle('bg-white/10', on);
        btn.classList.toggle('text-white/90', on);
        btn.classList.toggle('border-white/10', !on);
        btn.classList.toggle('bg-[#0a0d1a]/60', !on);
        btn.classList.toggle('text-white/35', !on);
        btn.classList.toggle('line-through', !on);
      });

      // Sync ALL chip state. Use mobile-appropriate base classes when targeting the vertical container.
      const allBtn = container.querySelector('.group-chip:not([data-key])');
      if (allBtn) {
        const isMob = container.id === 'mobile-group-filters';
        const base = isMob
          ? 'group-chip w-full text-left px-2 py-1 text-xs rounded-lg border transition font-semibold tracking-wide'
          : 'group-chip px-2.5 py-1 text-[10px] rounded-xl border transition font-semibold tracking-wide';
        const cats = (window.AETHERIS.categories || []).filter(c => c.key !== 'all');
        const total = cats.length;
        const onCount = cats.filter(c => treeInstance.isGroupEnabled(c.key)).length;
        const allOn = total > 0 && onCount === total;
        const noneOn = (treeInstance.enabledGroups?.size || 0) === 0;
        if (allOn) {
          allBtn.className = base + ' border-amber-400/50 bg-amber-400/15 text-amber-200 hover:bg-amber-400/25';
        } else if (noneOn) {
          allBtn.className = base + ' border-white/10 bg-[#0a0d1a]/60 text-white/35 hover:bg-white/10 line-through';
        } else {
          // partial selection
          allBtn.className = base + ' border-amber-400/30 bg-amber-400/5 text-amber-200/70 hover:bg-amber-400/15';
        }
      }
    });
  }

  function rewireMapControls() {
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnRecenter = document.getElementById('btn-recenter');

    if (btnZoomIn) btnZoomIn.onclick = () => { stopInertia && stopInertia(); treeInstance && treeInstance.zoom(1); };
    if (btnZoomOut) btnZoomOut.onclick = () => { stopInertia && stopInertia(); treeInstance && treeInstance.zoom(-1); };
    if (btnRecenter) btnRecenter.onclick = () => { stopInertia && stopInertia(); treeInstance && treeInstance.recenter(); };
  }

  // Node Limit slider (UPGRADE 2.1): top N by vitality (desktop bottom bar; compact on mobile under right controls).
  // 0 = unlimited (shows all after group filters). Slider lets focus on most impactful without overload.
  function renderNodeLimitControl() {
    const mobile = isMobileViewport();
    const mount = mobile
      ? document.getElementById('mobile-node-limit-control')
      : document.getElementById('node-limit-control');
    if (!mount || !treeInstance) return;
    // Clean any legacy absolute wrap from previous layout
    const legacy = document.getElementById('node-limit-wrap');
    if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy);

    const current = treeInstance.maxNodes || 0;
    const totalNodes = (treeInstance.nodes || []).length || 80;
    const sliderMax = Math.min(400, Math.max(40, Math.ceil(totalNodes / 5) * 5));
    const val = current > 0 ? Math.min(current, sliderMax) : Math.min(80, sliderMax);

    if (mobile) {
      // Vertical layout for max slider width: header row (TOP + value + ALL) above the full-width slider.
      mount.innerHTML = `
        <div class="flex flex-col gap-1 w-full">
          <div class="flex items-center justify-between w-full">
            <span class="uppercase tracking-[1px] text-white/50 text-xs">TOP</span>
            <div class="flex items-center gap-x-1.5">
              <span id="node-limit-val" class="font-mono text-amber-300 text-sm">${current > 0 ? current : 'ALL'}</span>
              <button id="node-limit-all" class="px-2 py-0.5 rounded-lg border text-[9px] border-amber-400/40 hover:bg-amber-400/10 text-amber-300/80">ALL</button>
            </div>
          </div>
          <input id="node-limit-range" type="range" min="5" max="${sliderMax}" step="5" value="${val}" aria-label="Top nodes shown" class="w-full accent-amber-400">
        </div>
      `;
    } else {
      mount.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="uppercase tracking-[1px] text-white/50">TOP</span>
          <input id="node-limit-range" type="range" min="5" max="${sliderMax}" step="5" value="${val}" aria-label="Top nodes shown" class="w-28 accent-amber-400">
          <span id="node-limit-val" class="font-mono w-8 text-amber-300">${current > 0 ? current : 'ALL'}</span>
          <button id="node-limit-all" class="px-2 py-0.5 rounded-xl border text-[9px] border-amber-400/40 hover:bg-amber-400/10 text-amber-300/80">ALL</button>
        </div>
      `;
    }

    const range = mount.querySelector('#node-limit-range');
    const valEl = mount.querySelector('#node-limit-val');
    const allBtn = mount.querySelector('#node-limit-all');
    if (range) {
      range.oninput = () => {
        const n = parseInt(range.value, 10);
        if (treeInstance) {
          treeInstance.setMaxNodes(n);
          valEl.textContent = n;
          // Sync inspector: if the limit culled the selected node, clear the detail panel
          if (!treeInstance.selectedId) {
            updateDetail(null);
          } else {
            const vis = (typeof treeInstance._getVisibleNodes === 'function') ? treeInstance._getVisibleNodes() : treeInstance.nodes;
            const sel = vis.find(n => n.id === treeInstance.selectedId);
            if (sel) updateDetail(sel);
          }
        }
      };
    }
    if (allBtn) {
      allBtn.onclick = () => {
        if (treeInstance) {
          treeInstance.setMaxNodes(0);
          if (typeof treeInstance.fitToNodes === 'function') treeInstance.fitToNodes();
          valEl.textContent = 'ALL';
          if (range) range.value = Math.min(80, sliderMax);
          // Sync inspector after expanding back to all
          if (!treeInstance.selectedId) {
            updateDetail(null);
          } else {
            const vis = (typeof treeInstance._getVisibleNodes === 'function') ? treeInstance._getVisibleNodes() : treeInstance.nodes;
            const sel = vis.find(n => n.id === treeInstance.selectedId);
            if (sel) updateDetail(sel);
          }
        }
      };
    }
    // If currently unlimited, show ALL
    if (current === 0 && valEl) valEl.textContent = 'ALL';
  }

  function bindTreeViewport(tree) {
    if (!tree) return;
    tree.bindViewport(() => {
      if (typeof tree.computeLayout === 'function') tree.computeLayout();
      tree.draw();
    });
  }

  function canvasPointer(e) {
    if (treeInstance?.viewport) return treeInstance.viewport.pointerFromEvent(e);
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Create and load the initial Supplements tree
  treeInstance = new SupplementTree(canvas);
  bindTreeViewport(treeInstance);
  treeInstance.loadData(supplements);
  validateTreeData(supplements, 'supplements');
  window.AETHERIS.categories = categories;
  window.AETHERIS.currentConstellation = 'supplements';

  // Initial render
  treeInstance.draw();

  // Force viewport to measure the actual fullscreen container size
  // (important after removing fixed 720px + outer wrappers for full map+sidebar focus)
  requestAnimationFrame(() => {
    if (treeInstance?.viewport) {
      treeInstance.viewport.resize();
      if (typeof treeInstance.computeLayout === 'function') treeInstance.computeLayout();
      if (typeof treeInstance.fitToNodes === 'function') treeInstance.fitToNodes();
      else treeInstance.draw();
    }

    // Hide loading overlay now that first render + resize is done (Issue #17)
    hideLoadingOverlay();
  });

  function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 320);
  }

  // === Map Interaction (Pan + Zoom) - unified pointer events + RAF + inertia (GitHub #12) ===
  const DRAG_THRESHOLD_MOUSE = 5;
  const DRAG_THRESHOLD_TOUCH = 3;
  let pointerDown = false;
  let isPanning = false;
  let suppressNextClick = false;
  let downX = 0, downY = 0;
  let lastX = 0, lastY = 0;
  let activePointerId = null;
  let activePointerType = 'mouse';

  // Multi-touch state for pinch-to-zoom on phones/tablets
  let activePointers = new Map(); // pointerId -> {x, y}
  let prevPinchDist = 0;
  let isPinching = false;

  // Inertia + velocity (issue #12) — startInertia was previously unused on release
  let lastPanDx = 0;
  let lastPanDy = 0;
  let lastMoveTs = 0;
  let velX = 0;
  let velY = 0;
  let inertiaId = null;
  let inertiaActive = false;

  // Coalesce pan deltas to one RAF for smoother one-finger drag
  let pendingPanDx = 0;
  let pendingPanDy = 0;
  let panRafId = null;

  function isEventOverMapChrome(e) {
    // Don't let map gestures steal bottom sheet / anatomy / footer / mystack / modal touches
    if (isEventOverBottomSheet(e) || isEventOverAnatomyPanel(e)) return true;
    if (isEventOverElement(e, document.getElementById('mystack-panel'))) return true;
    if (isEventOverElement(e, document.getElementById('app-footer'))) return true;
    if (isEventOverElement(e, document.getElementById('pricing-modal'))) return true;
    if (isEventOverElement(e, document.getElementById('first-run-tip'))) return true;
    if (isEventOverElement(e, document.getElementById('gorkipedia-explorer-modal'))) return true;
    if (isEventOverElement(e, document.getElementById('right-map-controls'))) return true;
    if (isEventOverElement(e, document.getElementById('node-search'))) return true;
    if (isEventOverElement(e, document.getElementById('bottom-controls'))) return true;
    return false;
  }

  function flushQueuedPan() {
    panRafId = null;
    if (!treeInstance) {
      pendingPanDx = 0;
      pendingPanDy = 0;
      return;
    }
    if (Math.abs(pendingPanDx) > 0.01 || Math.abs(pendingPanDy) > 0.01) {
      treeInstance.pan(pendingPanDx, pendingPanDy);
    }
    pendingPanDx = 0;
    pendingPanDy = 0;
  }

  function queuePan(dx, dy) {
    pendingPanDx += dx;
    pendingPanDy += dy;
    if (!panRafId) panRafId = requestAnimationFrame(flushQueuedPan);
  }

  function stopInertia() {
    if (inertiaId) {
      cancelAnimationFrame(inertiaId);
      inertiaId = null;
    }
    inertiaActive = false;
    if (panRafId) {
      cancelAnimationFrame(panRafId);
      panRafId = null;
      pendingPanDx = 0;
      pendingPanDy = 0;
    }
    if (treeInstance) treeInstance._isPanning = false;
    lastPanDx = 0;
    lastPanDy = 0;
    velX = 0;
    velY = 0;
    if (isPinching) {
      isPinching = false;
      prevPinchDist = 0;
    }
  }

  function startInertia(vx, vy) {
    // Cancel prior RAF without wiping velocity args
    if (inertiaId) {
      cancelAnimationFrame(inertiaId);
      inertiaId = null;
    }
    if (panRafId) {
      cancelAnimationFrame(panRafId);
      panRafId = null;
      flushQueuedPan();
    }
    const speed = Math.hypot(vx, vy);
    if (!treeInstance || speed < 1.2) {
      inertiaActive = false;
      if (treeInstance) treeInstance._isPanning = false;
      return;
    }
    inertiaActive = true;
    if (treeInstance) treeInstance._isPanning = true;
    // Soft boost + clamp so flicks feel lively without runaway slides
    let curVx = Math.max(-48, Math.min(48, vx * 1.15));
    let curVy = Math.max(-48, Math.min(48, vy * 1.15));
    const friction = 0.92;
    const minVel = 0.35;
    const step = () => {
      if (!inertiaActive || (Math.abs(curVx) < minVel && Math.abs(curVy) < minVel)) {
        inertiaActive = false;
        inertiaId = null;
        if (treeInstance) {
          treeInstance._isPanning = false;
          if (typeof treeInstance.draw === 'function') treeInstance.draw();
        }
        return;
      }
      if (treeInstance) treeInstance.pan(curVx, curVy);
      curVx *= friction;
      curVy *= friction;
      inertiaId = requestAnimationFrame(step);
    };
    inertiaId = requestAnimationFrame(step);
  }

  // Pointer Events (unifies mouse + touch, addresses perf #12)
  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    if (!treeInstance) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    // UI chrome sits above the canvas; if a hit slips through, ignore
    if (isEventOverMapChrome(e)) return;

    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch { /* capture may already be gone */ }
    stopInertia();
    // New gesture: keep selection stable (inertia must not fake a click later)
    suppressNextClick = false;

    if (activePointers.size >= 2) {
      isPinching = true;
      if (treeInstance) treeInstance._isPanning = true;
      const pts = Array.from(activePointers.values());
      prevPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pointerDown = false;
      isPanning = false;
      activePointerId = null;
      hoverPopup.hide();
      return;
    }

    activePointerId = e.pointerId;
    activePointerType = e.pointerType || 'mouse';
    pointerDown = true;
    isPanning = false;
    if (treeInstance) treeInstance._isPanning = false;
    downX = lastX = e.clientX;
    downY = lastY = e.clientY;
    lastPanDx = 0;
    lastPanDy = 0;
    lastMoveTs = performance.now();
    velX = 0;
    velY = 0;
    if (e.pointerType !== 'mouse') hoverPopup.hide();
  });

  window.addEventListener('pointermove', (e) => {
    if (!treeInstance) return;
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointers.size >= 2) {
      const pts = Array.from(activePointers.values());
      const currDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (prevPinchDist > 5 && currDist > 5) {
        const scaleFactor = currDist / prevPinchDist;
        const midClientX = (pts[0].x + pts[1].x) / 2;
        const midClientY = (pts[0].y + pts[1].y) / 2;
        const rect = canvas.getBoundingClientRect();
        treeInstance.zoomFactor(scaleFactor, midClientX - rect.left, midClientY - rect.top);
        prevPinchDist = currDist;
      }
      return;
    }

    // Drag / pan only while this pointer is down
    if (pointerDown && (activePointerId === null || e.pointerId === activePointerId)) {
      const threshold = (activePointerType === 'touch' || activePointerType === 'pen')
        ? DRAG_THRESHOLD_TOUCH
        : DRAG_THRESHOLD_MOUSE;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (!isPanning && moved > threshold) {
        isPanning = true;
        if (treeInstance) treeInstance._isPanning = true;
        hoverPopup.hide();
        canvas.style.cursor = 'grabbing';
      }
      if (isPanning) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        const now = performance.now();
        const dt = Math.max(8, Math.min(48, now - (lastMoveTs || now)));
        // EMA velocity in px/frame (~16ms) for stable inertia on release
        const frameScale = 16 / dt;
        const sampleVx = dx * frameScale;
        const sampleVy = dy * frameScale;
        velX = velX * 0.65 + sampleVx * 0.35;
        velY = velY * 0.65 + sampleVy * 0.35;
        lastMoveTs = now;
        lastPanDx = dx;
        lastPanDy = dy;
        lastX = e.clientX;
        lastY = e.clientY;
        queuePan(dx, dy);
        return;
      }
    } else if (pointerDown) {
      return; // other pointer id while down
    }

    // Hover logic (mouse, not panning) — also drives organ explode on body hover
    if (isPanning || isPinching) return;
    if (e.pointerType && e.pointerType !== 'mouse') return;

    const { x: mx, y: my } = canvasPointer(e);

    if (typeof treeInstance.handleBodyHover === 'function') {
      treeInstance.handleBodyHover(mx, my);
    }

    // Prefer organ cursor when exploded organs are under pointer
    let organHit = null;
    if (treeInstance.organExplode && treeInstance.organExplode.progress > 0.35
        && typeof treeInstance.hitTestOrgan === 'function') {
      const w = treeInstance.screenToWorld(mx, my);
      organHit = treeInstance.hitTestOrgan(w.x, w.y, { requireExploded: false });
    }

    if (organHit) {
      treeInstance.setHover(null);
      canvas.style.cursor = 'pointer';
      hoverPopup.hide();
      return;
    }

    const hit = treeInstance.getNodeAt(mx, my);
    treeInstance.setHover(hit ? hit.id : null);
    if (hit) {
      canvas.style.cursor = 'pointer';
      if (!isMobileViewport()) hoverPopup.show(hit, e.clientX, e.clientY);
    } else {
      const overBody = typeof treeInstance.hitTestBody === 'function'
        && (() => { const w = treeInstance.screenToWorld(mx, my); return treeInstance.hitTestBody(w.x, w.y); })();
      canvas.style.cursor = overBody ? 'pointer' : 'crosshair';
      hoverPopup.hide();
    }
  });

  function endPointer(e) {
    if (e && e.pointerId != null) {
      activePointers.delete(e.pointerId);
    }
    const wasPinching = isPinching;
    const wasPanning = isPanning;
    if (wasPinching || wasPanning || inertiaActive) suppressNextClick = true;

    // Pinch → one finger: hand off to pan without treating as tap
    if (activePointers.size === 1 && wasPinching) {
      isPinching = false;
      prevPinchDist = 0;
      const [pid, pt] = activePointers.entries().next().value;
      activePointerId = pid;
      pointerDown = true;
      isPanning = false;
      downX = lastX = pt.x;
      downY = lastY = pt.y;
      lastPanDx = 0;
      lastPanDy = 0;
      velX = 0;
      velY = 0;
      lastMoveTs = performance.now();
      suppressNextClick = true;
      if (treeInstance) treeInstance._isPanning = false;
      return;
    }

    if (activePointers.size < 2) {
      isPinching = false;
      prevPinchDist = 0;
    }

    if (activePointers.size === 0) {
      const releaseVx = velX || lastPanDx;
      const releaseVy = velY || lastPanDy;
      const shouldInertia = wasPanning && !wasPinching;

      pointerDown = false;
      isPanning = false;
      activePointerId = null;
      lastPanDx = 0;
      lastPanDy = 0;
      try { if (e && e.pointerId != null) canvas.releasePointerCapture(e.pointerId); } catch { /* capture may already be gone */ }
      canvas.style.cursor = 'grab';

      if (shouldInertia) {
        // Flush coalesced pan, then fling — keep suppress so inertia never selects
        if (panRafId) {
          cancelAnimationFrame(panRafId);
          panRafId = null;
          flushQueuedPan();
        }
        suppressNextClick = true;
        startInertia(releaseVx, releaseVy);
        if (!inertiaActive && treeInstance && typeof treeInstance.draw === 'function') {
          treeInstance.draw();
        }
      } else if (wasPinching || wasPanning) {
        if (treeInstance) {
          treeInstance._isPanning = false;
          if (typeof treeInstance.draw === 'function') treeInstance.draw();
        }
      }

      // Tap-to-select for touch/pen when not panned / pinched / flinging
      if (
        !wasPanning &&
        !wasPinching &&
        !inertiaActive &&
        e &&
        (e.pointerType === 'touch' || e.pointerType === 'pen') &&
        e.clientX != null
      ) {
        if (isEventOverMapChrome(e)) return;
        // Prevent the synthetic mouse click from double-firing body explode / selection
        suppressNextClick = true;
        const fake = { clientX: e.clientX, clientY: e.clientY };
        const { x: mx, y: my } = canvasPointer(fake);

        // Same priority as click: organ → node → body → empty
        if (treeInstance && typeof treeInstance.trySelectOrganAt === 'function') {
          const org = treeInstance.trySelectOrganAt(mx, my);
          if (org) {
            hoverPopup.hide();
            return;
          }
        }
        const hit = treeInstance.getNodeAt(mx, my);
        if (hit) {
          handleNodeSelection(hit);
          return;
        }
        if (treeInstance && typeof treeInstance.tryToggleBodyExplode === 'function') {
          if (treeInstance.tryToggleBodyExplode(mx, my)) {
            hoverPopup.hide();
            return;
          }
        }
        if (treeInstance && typeof treeInstance.collapseOrganExplodeIfOpen === 'function') {
          treeInstance.collapseOrganExplodeIfOpen();
        }
        handleNodeSelection(null);
        hoverPopup.hide();
      }

      velX = 0;
      velY = 0;
    }
  }

  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopInertia();
    if (!treeInstance || typeof treeInstance.zoomFactor !== 'function') return;
    // Invert deltaY so wheel "down" zooms out, wheel "up" zooms in (standard map behavior).
    // Zoom toward pointer (canvas-local coords); buttons/keyboard stay center via zoom(±1).
    const factor = (-e.deltaY) > 0 ? 1.18 : 0.82;
    const { x: localX, y: localY } = canvasPointer(e);
    treeInstance.zoomFactor(factor, localX, localY);
  }, { passive: false });

  // Legacy mouseup for safety (some edge cases)
  window.addEventListener('mouseup', () => {
    if (!pointerDown && activePointers.size === 0 && !inertiaActive) return;
    if (isPanning || inertiaActive) suppressNextClick = true;
    stopInertia();
    pointerDown = false;
    isPanning = false;
    if (treeInstance) treeInstance._isPanning = false;
    activePointers.clear();
    prevPinchDist = 0;
    isPinching = false;
    canvas.style.cursor = 'grab';
  });

  rewireMapControls();
  renderGroupFilters();
  renderNodeLimitControl();


  // === Anatomy layer controls (Issue #16 Phase 1) ===
  function syncAnatomySliders() {
    const anatomy = treeInstance?.anatomy;
    if (!anatomy) return;
    const snap = anatomy.snapshot();
    for (const layer of ['base', 'organs', 'skeleton', 'muscles']) {
      const el = document.getElementById(`anatomy-op-${layer}`);
      if (el) el.value = Math.round((snap.opacity[layer] ?? 0) * 100);
    }
    document.querySelectorAll('.anatomy-preset').forEach(btn => {
      const on = btn.dataset.preset === snap.preset;
      btn.classList.toggle('active', on);
      btn.classList.toggle('border-cyan-400/40', on);
      btn.classList.toggle('bg-cyan-400/10', on);
      btn.classList.toggle('text-cyan-100', on);
      btn.classList.toggle('border-white/10', !on);
      btn.classList.toggle('text-white/60', !on);
    });
  }

  function setAnatomyPanelOpen(open) {
    const toggle = document.getElementById('anatomy-toggle');
    const panel = document.getElementById('anatomy-panel');
    const icon = document.getElementById('anatomy-toggle-icon');
    if (!panel) return;
    panel.classList.toggle('hidden', !open);
    if (icon) {
      icon.classList.toggle('fa-chevron-down', !open);
      icon.classList.toggle('fa-chevron-up', open);
    }
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

    if (open && isMobileViewport()) {
      // Free vertical space: collapse My Stack rail panel when anatomy sheet opens
      const msPanel = document.getElementById('mystack-panel');
      const msIcon = document.getElementById('mystack-panel-icon');
      if (msPanel && !msPanel.classList.contains('hidden')) {
        msPanel.classList.add('hidden');
        if (msIcon) msIcon.className = 'fa-solid fa-chevron-down text-[9px]';
      }
    }
  }

  function fillBodyStatus() {
    const line = document.getElementById('body-status-line');
    const organs = document.getElementById('body-status-organs');
    if (line) {
      const p = personalData || {};
      const bits = [];
      if (p.age) bits.push(`${p.age} years`);
      if (p.weight && p.height) {
        const bmi = p.weight / ((p.height / 100) ** 2);
        bits.push(`BMI ${bmi.toFixed(1)}`);
      }
      line.textContent = bits.length
        ? bits.join(' · ')
        : 'Add your stats with You. The glow on the body is what your stack touches.';
    }
    if (organs) organs.innerHTML = organImpactStripHtml(8);
  }

  function applyViewMode(next) {
    const body = next === 'body';
    document.body.classList.toggle('mode-body', body);
    const status = document.getElementById('body-status');
    if (status) status.classList.toggle('hidden', !body);
    if (!treeInstance) return;
    treeInstance.bodyFocus = body;
    if (body) {
      treeInstance.view.panX = 0;
      treeInstance.view.panY = 10;
      treeInstance.view.scale = 1.05;
      fillBodyStatus();
    } else if (typeof treeInstance.fitToNodes === 'function') {
      treeInstance.fitToNodes();
    }
    treeInstance.draw();
  }

  function setRailMode(mode) {
    const root = document.getElementById('right-map-controls');
    if (!root) return;
    const next = mode === 'body' ? 'body' : 'map';
    root.dataset.rail = next;
    root.querySelectorAll('[data-rail-btn]').forEach((btn) => {
      const on = btn.dataset.railBtn === next;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    applyViewMode(next);
  }

  function wireRailModes() {
    const root = document.getElementById('right-map-controls');
    if (!root || root._railWired) return;
    root._railWired = true;
    if (!root.dataset.rail) root.dataset.rail = 'map';
    root.querySelectorAll('[data-rail-btn]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setRailMode(btn.dataset.railBtn);
      });
    });
  }

  function wireAnatomyControls() {
    wireRailModes();
    const toggle = document.getElementById('anatomy-toggle');
    const panel = document.getElementById('anatomy-panel');
    const closeBtn = document.getElementById('anatomy-sheet-close');
    const controls = document.getElementById('anatomy-controls');

    // Bubble-phase only (same class as My Stack / BottomSheet #31) — do not use capture
    const stopBubble = (e) => e.stopPropagation();
    if (panel && !panel._stopWired) {
      panel._stopWired = true;
      panel.addEventListener('click', stopBubble);
      panel.addEventListener('pointerdown', stopBubble, { passive: true });
    }
    if (controls && !controls._stopWired) {
      controls._stopWired = true;
      controls.addEventListener('click', stopBubble);
      controls.addEventListener('pointerdown', stopBubble, { passive: true });
    }

    if (toggle && panel && !toggle._wired) {
      toggle._wired = true;
      toggle.onclick = (e) => {
        e.stopPropagation();
        const willOpen = panel.classList.contains('hidden');
        setAnatomyPanelOpen(willOpen);
      };
    }
    if (closeBtn && !closeBtn._wired) {
      closeBtn._wired = true;
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        setAnatomyPanelOpen(false);
      };
    }

    document.querySelectorAll('.anatomy-preset').forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (treeInstance?.setAnatomyPreset) {
          treeInstance.setAnatomyPreset(btn.dataset.preset);
          syncAnatomySliders();
        }
      };
    });
    for (const layer of ['base', 'organs', 'skeleton', 'muscles']) {
      const el = document.getElementById(`anatomy-op-${layer}`);
      if (!el || el._wired) continue;
      el._wired = true;
      el.oninput = () => {
        if (treeInstance?.setAnatomyOpacity) {
          treeInstance.setAnatomyOpacity(layer, Number(el.value) / 100);
          syncAnatomySliders();
        }
      };
      // Keep range drags from bubbling into map pan handlers
      el.addEventListener('pointerdown', (e) => e.stopPropagation(), { passive: true });
    }
    syncAnatomySliders();
  }

  // Wire constellation switcher buttons (inside the map frame)
  const allBtn = document.getElementById('btn-constellation-all');
  const supBtn = document.getElementById('btn-constellation-supplements');
  const habBtn = document.getElementById('btn-constellation-habits');
  const exBtn = document.getElementById('btn-constellation-exercises');
  const foodBtn = document.getElementById('btn-constellation-foods');
  const envBtn = document.getElementById('btn-constellation-environment');
  const biomarkersBtn = document.getElementById('btn-constellation-biomarkers');

  const pickConstellation = (type) => {
    switchConstellation(type);
    collapseMobileConstellationPicker();
  };
  if (allBtn) allBtn.onclick = () => pickConstellation('all');
  if (supBtn) supBtn.onclick = () => pickConstellation('supplements');
  if (habBtn) habBtn.onclick = () => pickConstellation('habits');
  if (exBtn) exBtn.onclick = () => pickConstellation('exercises');
  if (foodBtn) foodBtn.onclick = () => pickConstellation('foods');
  if (envBtn) envBtn.onclick = () => pickConstellation('environment');
  if (biomarkersBtn) biomarkersBtn.onclick = () => pickConstellation('biomarkers');

  const closeInspector = document.getElementById('inspector-close');
  if (closeInspector && !closeInspector._wired) {
    closeInspector._wired = true;
    closeInspector.onclick = () => {
      const side = document.getElementById('left-sidebar');
      if (side) side.dataset.pin = '';
      handleNodeSelection(null);
    };
  }

  const youBtn = document.getElementById('open-you');
  if (youBtn && !youBtn._wired) {
    youBtn._wired = true;
    youBtn.onclick = () => {
      const side = document.getElementById('left-sidebar');
      const panel = document.getElementById('personal-panel');
      if (!side) return;
      const open = side.classList.contains('is-open') && side.dataset.pin === 'you';
      if (open) {
        side.dataset.pin = '';
        setInspectorOpen(false);
        return;
      }
      side.dataset.pin = 'you';
      if (panel) panel.classList.remove('hidden');
      setInspectorOpen(true);
    };
  }

  const pickerToggle = document.getElementById('constellation-picker-toggle');
  if (pickerToggle && !pickerToggle._wired) {
    pickerToggle._wired = true;
    pickerToggle.onclick = (e) => {
      e.stopPropagation();
      const list = document.getElementById('constellation-picker-list');
      const open = !!(list && list.classList.contains('is-collapsed'));
      setMobileConstellationListOpen(open);
    };
  }

  // Mark initial active state
  updateConstellationButtons('supplements');

  // Shareable constellation deep-link: ?c=supplements|habits|exercises|foods|environment|biomarkers
  const deepLinkConstellation = parseConstellationDeepLink();
  if (deepLinkConstellation && deepLinkConstellation !== 'all') {
    switchConstellation(deepLinkConstellation, { fromDeepLink: true });
  } else {
    switchConstellation('all');
  }

  // Wire mobile-only expandable vertical filters toggle (right column under selector)
  const mobileFiltersToggle = document.getElementById('mobile-filters-toggle');
  const mobileFiltersPanel = document.getElementById('mobile-group-filters');
  const mobileFiltersIcon = document.getElementById('mobile-filters-icon');
  const rightControls = document.getElementById('right-map-controls');
  if (mobileFiltersToggle && mobileFiltersPanel) {
    mobileFiltersToggle.onclick = () => {
      const nowHidden = mobileFiltersPanel.classList.toggle('hidden');
      if (!nowHidden) {
        // Expand the vertical filter list almost full screen height, leaving ~5-10% bottom spacing.
        // Compute from actual viewport so the list reaches near the bottom from the top-right position.
        const vh = Math.max(document.documentElement.clientHeight || window.innerHeight, 480);
        const target = Math.round(vh * 0.82); // ~82% leaves comfortable  ~8-18% bottom + top chrome
        mobileFiltersPanel.style.maxHeight = `${target}px`;
        mobileFiltersPanel.classList.add('mobile-expanded-filters');
        if (rightControls) rightControls.style.zIndex = '80';
      } else {
        mobileFiltersPanel.style.maxHeight = '';
        mobileFiltersPanel.classList.remove('mobile-expanded-filters');
        if (rightControls) rightControls.style.zIndex = '';
      }
      if (mobileFiltersIcon) {
        mobileFiltersIcon.classList.toggle('fa-chevron-down', nowHidden);
        mobileFiltersIcon.classList.toggle('fa-chevron-up', !nowHidden);
      }
    };
  }

  // Biomarkers constellation button (Issue #14)
  // Keep DOM id for now to minimize HTML changes; text can be updated in HTML separately if desired.

  // Shared inspector renderer used by BOTH the desktop left panel AND the mobile bottom sheet (Issue #1).
  // Keeps all the rich content (mechanisms, personal impact, clickable organs, share, risks, "Read full", etc.) in one place.
  function populateInspector(container, node) {
    if (!container || !node) return;

    const isNegative = (node.impact === 'negative' || node._isNegative);
    const scoreLabel = isNegative ? 'Harm / Damage' : 'Longevity';
    const scoreColor = isNegative ? 'text-red-400' : 'text-cyan-300';
    const overallColor = isNegative ? 'text-red-300' : 'text-amber-300';
    const supportsLabel = isNegative ? 'Associated with higher risk for' : 'Supports';

    let extraInfo = '';
    const mechs = (node.mechanisms || []).slice(0, 3);
    if (mechs.length) {
      extraInfo += `
        <div class="mt-3">
          <div class="text-[10px] uppercase tracking-widest ${isNegative ? 'text-red-400/70' : 'text-white/50'} mb-1">MECHANISMS ${isNegative ? '(RISK NOTES)' : '(STUDIED)'}</div>
          <div class="text-[11px] text-white/80 leading-snug">${mechs.join(' • ')}</div>
        </div>`;
    }
    if (node.studies && node.studies.length) {
      const s = node.studies[0];
      extraInfo += `
        <div class="mt-2 text-[10px] text-white/70">
          <span class="font-mono text-amber-300/90">${s.year}</span> ${s.finding}
          ${s.source ? `<span class="text-white/50"> — ${s.source}</span>` : ''}
        </div>`;
    }
    if (node.dosage || node.timing || node.bestForms) {
      extraInfo += `
        <div class="mt-2">
          <div class="text-[10px] uppercase tracking-widest ${isNegative ? 'text-red-400/70' : 'text-white/50'} mb-0.5">SERVING / PROTOCOL</div>
          ${node.dosage ? `<div class="text-[11px] text-white/85">${node.dosage}</div>` : ''}
          ${node.timing ? `<div class="text-[10px] text-white/60 mt-0.5"><span class="uppercase tracking-widest text-[9px] text-white/45">TIMING:</span> ${node.timing}</div>` : ''}
          ${node.bestForms ? `<div class="text-[10px] text-white/60 mt-0.5"><span class="uppercase tracking-widest text-[9px] text-white/45">BEST FORMS:</span> ${node.bestForms}</div>` : ''}
          ${node.dosage && !isNegative ? `<div class="mt-1.5">
            <div class="h-1.5 w-full rounded bg-white/10 overflow-hidden flex"><span class="h-1.5 w-[18%] bg-emerald-400/60" title="Lower common range"></span><span class="h-1.5 w-[45%] bg-emerald-300" title="Often-cited range"></span><span class="h-1.5 w-[20%] bg-amber-400/70" title="Higher range"></span><span class="h-1.5 flex-1 bg-red-500/50" title="Caution"></span></div>
            <div class="flex text-[8px] text-white/50 mt-0.5 justify-between"><span>low</span><span class="text-emerald-300">mid</span><span>high</span><span class="text-red-300/70">caution</span></div>
          </div>` : ''}
        </div>`;
    }
    if (node.highDoseRisks || (isNegative && node.risks)) {
      const riskText = node.highDoseRisks || node.risks;
      extraInfo += `
        <div class="mt-2 p-1.5 rounded-lg bg-orange-950/30 border border-orange-500/30">
          <div class="text-[9px] uppercase tracking-widest text-orange-400 mb-0.5 flex items-center gap-1"><i class="fa-solid fa-exclamation-triangle"></i> ${isNegative ? 'RISKS' : 'HIGH DOSE / CAUTION'}</div>
          <div class="text-[10px] text-orange-200/90">${riskText}</div>
        </div>`;
    }

    const organChips = (node.organs || []).map(key => {
      const meta = organMeta[key];
      if (!meta) return '';
      const col = isNegative ? '#ef4444' : meta.color;
      return `<button data-organ="${key}" class="organ-chip px-2 py-0.5 text-[10px] rounded-full border hover:scale-[1.02] active:scale-[0.98] transition" style="border-color:${col}44; background:${col}11; color:${col}">${meta.label}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="text-left w-full">
        <div class="text-2xl font-semibold title-font tracking-tight ${isNegative ? 'text-red-300' : ''}">${node.name}</div>
        <div class="text-xs uppercase tracking-widest ${isNegative ? 'text-red-400' : 'text-amber-400'} mt-1">${(node._constellation ? node._constellation + (node._topic ? ' · ' + node._topic : '') : node.cat).toUpperCase()} • ${node.short}${(node._isBiomarker || node._isBlood) && node.specimen_type ? ' • ' + String(node.specimen_type).toUpperCase() : ''}${isNegative ? ' • RISK NODE' : ''}</div>
        
        <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div class="bg-[#0a0d1a] p-2 rounded-xl" title="App rating, not a health outcome">${scoreLabel} <span class="font-mono ${scoreColor}">${node.longevity ?? node.vitality ?? '—'}</span></div>
          <div class="bg-[#0a0d1a] p-2 rounded-xl" title="App rating, not a health outcome">QoL <span class="font-mono text-violet-300">${node.qol ?? '—'}</span></div>
          <div class="bg-[#0a0d1a] p-2 rounded-xl" title="App rating, not a health outcome">Overall <span class="font-mono ${overallColor}">${node.vitality}</span></div>
        </div>
        <div class="mt-1 text-[9px] text-white/35 leading-snug">App scores (0-100), not health outcomes</div>

        ${(() => {
          const p = personalData || {};
          const hasAny = Object.keys(p).some(k => p[k] !== '' && p[k] != null);
          if (isNegative || node.impact === 'negative' || (node._isBiomarker || node._isBlood) || !hasAny) return '';
          try {
            const ps = typeof personalizedScore === 'function' ? personalizedScore(node, p) : 0;
            if (ps) {
              const barColor = ps >= 70 ? 'bg-emerald-400' : (ps >= 50 ? 'bg-yellow-400' : 'bg-slate-400');
              return `<div class="mt-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-400/40 text-sm flex items-center gap-2" title="App match rating from your profile, not a health outcome.">
                <span class="font-mono text-lg text-emerald-300">${ps}</span>
                <span class="uppercase tracking-widest text-emerald-300/80 text-xs">personal score</span>
                <div class="flex-1 h-2 bg-white/10 rounded overflow-hidden"><div class="${barColor} h-full" style="width:${ps}%"></div></div>
              </div>`;
            }
          } catch { /* personal score is optional */ }
          return '';
        })()}

        <div class="mt-3 text-xs text-white/80 leading-snug">${node.blurb}</div>

        ${(node._isBiomarker || node._isBlood) ? `
          <div class="mt-2 grid grid-cols-2 gap-1 text-[10px]">
            <div class="bg-[#0a0d1a] p-1 rounded">Specimen: <span class="font-mono text-violet-300 uppercase">${node.specimen_type || 'blood'}</span></div>
            <div class="bg-[#0a0d1a] p-1 rounded">Status: <span class="font-mono ${node.status==='optimal'?'text-emerald-300':(node.status==='high'?'text-red-300':'text-amber-300')}">${(node.status||'—').toUpperCase()}</span></div>
            <div class="bg-[#0a0d1a] p-1 rounded">Example: <span class="font-mono text-sky-300">${node.current ?? '?'} ${node.unit || ''}</span></div>
            <div class="bg-[#0a0d1a] p-1 rounded">Look up: <span class="font-mono text-emerald-300">${node.optimal || node.blueprint || '—'}</span></div>
            ${node.age_impact != null ? `<div class="bg-[#0a0d1a] p-1 rounded col-span-2">Map weight: <span class="font-mono text-white/70">${node.age_impact}</span> <span class="text-white/40">layout only, not years of life</span></div>` : ''}
            ${Array.isArray(node.risks) ? `<div class="col-span-2 text-white/50">${node.risks.map((r) => String(r).replace(/_/g, ' ')).join(' · ')}</div>` : ''}
          </div>` : ''}

        ${isNegative && (node.avoidance || node.mitigation) ? `
          <div class="mt-2">
            ${node.avoidance ? `<div class="text-[10px] uppercase tracking-widest text-red-400/70 mb-0.5">AVOID / REDUCE</div><div class="text-[10px] text-red-200/90">${node.avoidance}</div>` : ''}
            ${node.mitigation ? `<div class="mt-1 text-[10px] uppercase tracking-widest text-amber-400/70 mb-0.5">MITIGATION SUPPORT</div><div class="text-[10px] text-amber-200/90">${node.mitigation}</div>` : ''}
          </div>` : ''}

        ${(() => {
          const p = personalData || {};
          const hasAny = Object.keys(p).some(k => p[k] !== '' && p[k] != null);
          if (isNegative || node.impact === 'negative' || (node._isBiomarker || node._isBlood)) return '';
          try {
            const ps = typeof personalizedScore === 'function' ? personalizedScore(node, p) : null;
            if (hasAny && ps) {
              const reasons = [];
              const age = parseInt(p.age,10)||0;
              const sys = parseInt(p.systolic,10)||0;
              const dia = parseInt(p.diastolic,10)||0;
              const slp = (p.sleep||'').toLowerCase();
              const mood = (p.mood||'').toLowerCase();
              const dig = (p.digestion||'').toLowerCase();
              const orgs = (node.organs||[]).map(o=>o.toLowerCase());
              if ((sys>130||dia>85) && (orgs.includes('heart')||orgs.includes('mito'))) reasons.push('your BP profile');
              if ((slp==='poor'||slp==='fair') && (orgs.includes('brain')||/magnes|taurine/.test((node.name||'').toLowerCase()))) reasons.push('sleep quality');
              if (age>50 && (orgs.includes('muscle')||orgs.includes('bones')||/creat|vit d/i.test(node.name||''))) reasons.push('age + muscle support');
              if (mood==='low' && orgs.includes('brain')) reasons.push('mood/energy markers');
              if (dig==='poor' && orgs.includes('gut')) reasons.push('digestion notes');
              const why = reasons.length ? reasons.join(' + ') : 'profile alignment';
              return `<div class="mt-2 p-2 rounded-xl bg-emerald-950/30 border border-emerald-400/30 text-[10px]">
                <div class="text-white/80">App match via ${why}. ${node.short || ''} lines up with your entered metrics.</div>
              </div>`;
            } else if (!hasAny) {
              return `<div class="mt-2 text-[10px] px-2 py-1 rounded-xl border border-emerald-400/30 bg-emerald-400/5 text-emerald-300/90 popup-blink">Enter your stats in Personal Corner for a personalized match score &amp; impact notes on this node.</div>`;
            }
          } catch { /* personal score is optional */ }
          return '';
        })()}

        ${isNegative && node.risks && !node.highDoseRisks ? `
        <div class="mt-3 p-2 rounded-xl bg-red-950/40 border border-red-500/30">
          <div class="text-[10px] uppercase tracking-widest text-red-400 mb-1">NEGATIVE EFFECTS / RISKS</div>
          <div class="text-[11px] text-red-200/90">${node.risks}</div>
        </div>` : ''}

        <div class="mt-3">
          <div class="text-[10px] uppercase tracking-widest ${isNegative ? 'text-red-400/70' : 'text-white/50'} mb-1">${supportsLabel}</div>
          <div class="flex flex-wrap gap-1" id="inspector-organs">${organChips || '<span class="text-white/40 text-[10px]">—</span>'}</div>
          <div id="inspector-organ-benefit" class="hidden mt-2 p-2 text-[10px] bg-white/5 border border-white/10 rounded-xl text-white/80"></div>
        </div>

        ${extraInfo}

        <div class="mt-3" id="organ-impact-inspector"></div>

        <div class="mt-3" id="mystack-inspector-row">
          <button id="mystack-toggle-node-btn" type="button"
                  class="w-full text-xs py-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200">
            Add to My Stack
          </button>
        </div>

        <div class="mt-3 flex gap-2">
          <button id="open-explorer-btn" 
                  class="flex-1 text-xs py-2 rounded-2xl border ${isNegative ? 'border-red-400/40 bg-red-400/10 hover:bg-red-400/15 text-red-300' : 'border-violet-400/40 bg-violet-400/10 hover:bg-violet-400/15 text-violet-300'}">
            Read full monograph
          </button>
          <button id="share-btn" class="px-3 text-xs py-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white/80 flex items-center gap-1" title="Share to X + copy">
            <i class="fa-brands fa-x-twitter"></i>
          </button>
          <button id="ext-link-btn" class="px-3 text-xs py-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white/80" title="External sources">↗</button>
        </div>
        <p class="mt-3 text-[10px] text-white/45 leading-snug">Educational, not medical advice</p>
      </div>
    `;

    // Organ benefit explanations (6.2)
    const organsWrap = container.querySelector('#inspector-organs');
    const benefitBox = container.querySelector('#inspector-organ-benefit');
    const organHintMap = {
      brain: 'Studied for cognition, mood, and inflammation pathways (BDNF, membranes, neurotransmitters).',
      heart: 'Studied for endothelial function, lipid profiles, and cardiac energy use.',
      immune: 'Studied for inflammation balance, immune surveillance, and barrier integrity.',
      mito: 'Studied for mitochondrial biogenesis, ATP production, and oxidative stress.',
      muscle: 'Studied for protein synthesis, recovery, and age-related muscle maintenance.',
      metabolic: 'Studied for insulin sensitivity, AMPK, and glucose/lipid handling.',
      gut: 'Studied for microbiome, barrier strength, SCFA/butyrate, and endotoxin load.',
      joints: 'Studied for cartilage matrix, connective-tissue inflammation, and collagen.',
      eyes: 'Studied for macular pigment, retinal oxidative stress, and visual processing.',
      liver: 'Studied for phase II pathways, NF-κB/Nrf2, fat metabolism, and liver cells.'
    };
    if (organsWrap && benefitBox) {
      organsWrap.querySelectorAll('.organ-chip').forEach(chip => {
        chip.onclick = () => {
          const key = chip.dataset.organ;
          const meta = organMeta[key];
          const hint = organHintMap[key] || 'Organ system tagged on this entry.';
          const relMechs = (node.mechanisms || []).filter(m => {
            const low = m.toLowerCase();
            return low.includes(key) || (key==='brain' && (low.includes('neuro')||low.includes('bdnf')||low.includes('cog'))) ||
                   (key==='heart' && (low.includes('cardio')||low.includes('endoth')||low.includes('vascular'))) || true;
          }).slice(0,2);
          benefitBox.innerHTML = `<span class="font-semibold text-[10px] text-white/60">${meta ? meta.label : key.toUpperCase()}:</span> ${hint} ${relMechs.length ? '<div class="mt-1 text-white/60">Via: ' + relMechs.join(' • ') + '</div>' : ''}`;
          benefitBox.classList.remove('hidden');
          benefitBox.onclick = () => benefitBox.classList.add('hidden');
        };
      });
    }

    const explorerBtn = container.querySelector('#open-explorer-btn');
    if (explorerBtn) {
      explorerBtn.onclick = () => {
        if (window.AETHERIS?.modal) {
          window.AETHERIS.modal.open(node, {
            onHighlight: (ids) => treeInstance.draw(ids, true),
            onStack: (ids) => treeInstance.draw(ids, true)
          });
        }
      };
    }

    const shareBtn = container.querySelector('#share-btn');
    if (shareBtn) {
      shareBtn.onclick = () => {
        const isEnv = node._isEnvironment || node.cat && ['air-pollution','heavy-metals'].includes(node.cat);
        const isLab = !!(node._isBiomarker || node._isBlood);
        const score = isLab ? (node.current || '') : (node.vitality || node.longevity || '');
        const scoreBit = score ? (isLab ? ` — ${score}` : ` — app rating ${score}`) : '';
        const lead = isLab
          ? `Track biomarker ${node.name}${scoreBit}`
          : (isEnv ? `Exposure note: ${node.name}${scoreBit}` : `${node.name}${scoreBit}`);
        const txt = `${lead} on ${PRODUCT_NAME}. ${node.blurb ? node.blurb.slice(0,120) : ''} ${PUBLIC_HOST_LABEL} 🧬`;
        navigator.clipboard?.writeText(txt).catch(()=>{});
        const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(txt)}`;
        window.open(xUrl, '_blank', 'width=560,height=420');
      };
    }

    const extBtn = container.querySelector('#ext-link-btn');
    if (extBtn) {
      extBtn.onclick = () => {
        // #10: Deep links to actual Gorkipedia or best authoritative fallback
        let url = node.grokipediaUrl || node.url;
        if (!url) {
          if (node.gorkipedia) {
            url = `https://grokipedia.com/${encodeURIComponent(node._sourceId || node.id)}`;
          } else {
            // Fallbacks per #10
            url = `https://examine.com/search/?q=${encodeURIComponent(node.name)}`;
          }
        }
        window.open(url, '_blank');
      };
      extBtn.innerHTML = 'Read full monograph ↗';
      extBtn.title = 'Open Gorkipedia (or Examine fallback) for full details';
    }

    // My Stack: add/remove current node (desktop left inspector + bottom-sheet full)
    const stackBtn = container.querySelector('#mystack-toggle-node-btn');
    if (stackBtn) {
      const ident = stackIdentity(node);
      const inStack = myStack.has(ident.id, ident.constellation);
      stackBtn.textContent = inStack ? 'Remove from My Stack' : 'Add to My Stack';
      stackBtn.className = inStack
        ? 'w-full text-xs py-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white/80'
        : 'w-full text-xs py-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200';
      stackBtn.onclick = (e) => {
        e.stopPropagation();
        const toggle = window.AETHERIS && window.AETHERIS.toggleMyStackNode;
        if (typeof toggle === 'function') toggle(node, stackBtn);
      };
    }
    try { renderOrganImpactUI(); } catch { /* panel may be unmounted */ }
  }

  function setInspectorOpen(open) {
    const side = document.getElementById('left-sidebar');
    if (!side) return;
    if (isMobileViewport() && side.dataset.pin !== 'you') {
      side.classList.remove('is-open');
      return;
    }
    side.classList.toggle('is-open', !!open);
  }

  // Desktop path kept for wide screens. Mobile routes to bottom sheet instead.
  function updateDetail(node) {
    const side = document.getElementById('left-sidebar');
    if (!detailPanel) return;
    if (!node) {
      if (!side || side.dataset.pin !== 'you') setInspectorOpen(false);
      const label = currentTreeType === 'all' ? 'full' : (currentTreeType === 'biomarkers' ? 'biomarkers' : (currentTreeType === 'environment' ? 'environment' : (currentTreeType === 'habits' ? 'habits' : (currentTreeType === 'exercises' ? 'exercises' : (currentTreeType === 'foods' ? 'foods' : 'supplements')))));
      detailPanel.innerHTML = `<div class="text-white/60 mb-3">Select a node on the ${label} map</div><div id="organ-impact-inspector" class="mt-2"></div>`;
      try { renderOrganImpactUI(); } catch { /* panel may be unmounted */ }
      return;
    }
    if (side) side.dataset.pin = '';
    setInspectorOpen(true);
    populateInspector(detailPanel, node);
  }

  // Unified selection handler: routes to bottom sheet (preview → expand) on mobile,
  // or classic left inspector on desktop. Also handles background taps (close + reset).
  function handleNodeSelection(node) {
    const mobile = isMobileViewport();
    const bs = window.AETHERIS && window.AETHERIS.bottomSheet;

    if (node) {
      hoverPopup.hide();
      if (treeInstance) treeInstance.select(node.id);

      if (mobile && bs) {
        const same = bs.getCurrentNodeId() === node.id;
        const currentMode = bs.getMode();

        if (same) {
          // Toggle behavior for repeated taps on same node (fixes double-tap disappear + #15/#18)
          if (currentMode === 'preview') {
            bs.expand();
          } else if (currentMode === 'expanded') {
            bs.close(true);
          } else {
            bs.showPreview(node);
          }
        } else {
          bs.showPreview(node);
        }
      } else {
        updateDetail(node);
      }
    } else {
      if (treeInstance) treeInstance.reset();
      if (bs) bs.close();
      updateDetail(null);
    }
  }

  // Expose the shared renderer so BottomSheet (and future components) can render the exact same rich inspector.
  window.AETHERIS = window.AETHERIS || {};
  window.AETHERIS.populateInspector = populateInspector;
  window.AETHERIS.isMobileViewport = isMobileViewport;

  // =====================================================
  // 3.1 PERSONAL CORNER — Collapsible personalization section under inspector
  // Persisted in localStorage, generates BMI + rule-based supplement recs + risk flags.
  // All logic client-side (no server upload).
  // =====================================================
  let personalData = {};
  const PERSONAL_STORAGE_KEY = 'stackmap-personal-v1';
  const LEGACY_PERSONAL_STORAGE_KEY = 'aetheris-personal-v1';

  function loadPersonalData() {
    try {
      const raw = readStorage(PERSONAL_STORAGE_KEY, [LEGACY_PERSONAL_STORAGE_KEY]);
      personalData = raw ? JSON.parse(raw) : {};
    } catch {
      personalData = {};
    }
    // Ensure global is populated early so trees can read gender for PNG body on first draw
    if (window.AETHERIS) window.AETHERIS.personal = { ...personalData };
  }

  function savePersonalData() {
    writeStorage(PERSONAL_STORAGE_KEY, JSON.stringify(personalData));
  }

  function computeBMI(p = personalData) {
    if (!p.weight || !p.height) return null;
    const h = parseFloat(p.height) / 100;
    if (!h) return null;
    const val = parseFloat(p.weight) / (h * h);
    return isFinite(val) ? val.toFixed(1) : null;
  }

  function getPersonalInsights(p = personalData) {
    const out = { bmi: null, category: '', recs: [], risks: [] };
    const bmi = computeBMI(p);
    if (bmi) {
      out.bmi = bmi;
      const n = parseFloat(bmi);
      if (n < 18.5) out.category = 'Underweight';
      else if (n < 25) out.category = 'Normal';
      else if (n < 30) out.category = 'Overweight';
      else out.category = 'Obese';
      if (n >= 30) out.risks.push('BMI ≥30 associated with higher systemic inflammation & CV risk');
    }

    const age = parseInt(p.age, 10) || 0;
    const sys = parseInt(p.systolic, 10) || 0;
    const dia = parseInt(p.diastolic, 10) || 0;
    const sleep = (p.sleep || '').toLowerCase();
    const push = parseInt(p.pushups, 10) || 0;

    // BP rules (high BP examples)
    if (sys > 130 || dia > 85) {
      out.recs.push({ name: 'L-Citrulline', reason: 'Studied for nitric oxide and blood pressure effects' });
      out.recs.push({ name: 'Coenzyme Q10', reason: 'Studied for mitochondrial and cardio markers when BP is high' });
      out.recs.push({ name: 'Omega-3 EPA/DHA', reason: 'Studied for triglyceride and vascular inflammation effects' });
      out.risks.push('Elevated BP — Omega-3, Citrulline & CoQ10 frequently studied for support');
    }

    // Sleep / recovery
    if (sleep === 'poor' || sleep === 'fair') {
      out.recs.push({ name: 'Magnesium (Glycinate)', reason: 'Profile match for reported sleep and relaxation' });
      out.recs.push({ name: 'Taurine', reason: 'Studied for calming tone and overnight recovery' });
      out.risks.push('Poor sleep reported — magnesium and taurine are commonly discussed for sleep');
    }

    // Age + strength markers (muscle maintenance notes)
    if (age > 50 && push < 25) {
      out.recs.push({ name: 'Creatine Monohydrate', reason: 'Age and lower strength markers — studied for muscle support' });
      out.recs.push({ name: 'Vitamin D3', reason: 'Studied for muscle and bone notes in older adults' });
    }

    // Low mood/energy quick flag (from the Mood/Energy select)
    if ((p.mood || '').toLowerCase() === 'low') {
      out.recs.push({ name: 'Vitamin D3', reason: 'Studied for mood and energy notes' });
      out.recs.push({ name: 'Omega-3 EPA/DHA', reason: 'Studied for brain membrane and mood pathways' });
    }

    // Dedup recs
    const seen = new Set();
    out.recs = out.recs.filter(r => !seen.has(r.name) && seen.add(r.name)).slice(0, 5);

    return out;
  }

  function updatePersonalField(key, value) {
    if (value === '' || value === null) {
      delete personalData[key];
    } else {
      personalData[key] = value;
    }
    savePersonalData();
    // Keep the global exposure fresh (used by trees for gender-aware body etc.)
    if (window.AETHERIS) window.AETHERIS.personal = { ...personalData };
    renderPersonalPanel(); // live update insights

    // Issue #2: gender (or other profile) change should immediately affect the layered body PNG
    if (treeInstance && typeof treeInstance.draw === 'function') {
      treeInstance.draw();
    }
  }

  function renderPersonalPanel() {
    const panel = document.getElementById('personal-panel');
    if (!panel) return;

    const p = personalData;
    const insights = getPersonalInsights(p);
    const hasAnyData = Object.keys(p).some(k => p[k] !== '' && p[k] != null);

    let html = '';

    // Form (compact 2-col grid)
    html += `<div class="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] mb-3">`;

    // Row 1: Age / Gender
    html += `
      <div>
        <div class="text-white/40 mb-0.5">Age</div>
        <input type="number" min="18" max="100" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
               value="${p.age || ''}" placeholder="42" data-key="age" />
      </div>
      <div>
        <div class="text-white/40 mb-0.5">Gender</div>
        <select class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" data-key="gender">
          <option value="">—</option>
          <option value="male" ${p.gender === 'male' ? 'selected' : ''}>Male</option>
          <option value="female" ${p.gender === 'female' ? 'selected' : ''}>Female</option>
          <option value="other" ${p.gender === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>`;

    // Row 2: Weight / Height → BMI live
    html += `
      <div>
        <div class="text-white/40 mb-0.5">Weight (kg)</div>
        <input type="number" step="0.5" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
               value="${p.weight || ''}" placeholder="78" data-key="weight" />
      </div>
      <div>
        <div class="text-white/40 mb-0.5">Height (cm)</div>
        <input type="number" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
               value="${p.height || ''}" placeholder="178" data-key="height" />
      </div>`;

    // Always show a live BMI preview row (updates while typing; saved value + category on change)
    const liveBmi = computeBMI(p);
    html += `<div class="col-span-2 text-[10px] text-amber-300/90 mt-0.5" id="personal-live-bmi">
      BMI: <span class="font-mono">${liveBmi || '—'}</span>
      ${liveBmi ? `<span class="text-white/50">(${insights.category})</span>` : '<span class="text-white/40">(enter weight + height)</span>'}
    </div>`;

    // BP
    html += `
      <div class="col-span-2">
        <div class="text-white/40 mb-0.5">Blood Pressure (mmHg)</div>
        <div class="flex flex-col gap-1">
          <input type="number" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
                 value="${p.systolic || ''}" placeholder="Systolic" data-key="systolic" />
          <input type="number" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
                 value="${p.diastolic || ''}" placeholder="Diastolic" data-key="diastolic" />
        </div>
      </div>`;

    // Exercise metrics
    html += `
      <div>
        <div class="text-white/40 mb-0.5">Push-ups (max reps)</div>
        <input type="number" class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" 
               value="${p.pushups || ''}" placeholder="25" data-key="pushups" />
      </div>
      <div>
        <div class="text-white/40 mb-0.5">Sleep quality</div>
        <select class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" data-key="sleep">
          <option value="">—</option>
          <option value="poor" ${p.sleep === 'poor' ? 'selected' : ''}>Poor</option>
          <option value="fair" ${p.sleep === 'fair' ? 'selected' : ''}>Fair</option>
          <option value="good" ${p.sleep === 'good' ? 'selected' : ''}>Good</option>
        </select>
      </div>`;

    // Lifestyle quick selects
    html += `
      <div>
        <div class="text-white/40 mb-0.5">Mood / Energy</div>
        <select class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" data-key="mood">
          <option value="">—</option>
          <option value="low" ${p.mood === 'low' ? 'selected' : ''}>Low</option>
          <option value="ok" ${p.mood === 'ok' ? 'selected' : ''}>OK</option>
          <option value="good" ${p.mood === 'good' ? 'selected' : ''}>Good</option>
        </select>
      </div>
      <div>
        <div class="text-white/40 mb-0.5">Digestion / Skin</div>
        <select class="w-full bg-[#0a0d1a] border border-white/15 rounded-xl px-2 py-1 text-white/90 text-xs" data-key="digestion">
          <option value="">—</option>
          <option value="poor" ${p.digestion === 'poor' ? 'selected' : ''}>Issues</option>
          <option value="ok" ${p.digestion === 'ok' ? 'selected' : ''}>OK</option>
        </select>
      </div>`;

    html += `</div>`; // end grid

    // Insights / Recs
    if (hasAnyData) {
      html += `<div class="mt-2 pt-2 border-t border-white/10">`;
      if (insights.recs.length) {
        html += `<div class="text-[9px] uppercase tracking-widest text-emerald-400/80 mb-1">PROFILE MATCHES</div>`;
        insights.recs.forEach(r => {
          html += `<div class="text-[10px] text-white/85 mb-0.5">• <span class="text-emerald-300">${r.name}</span> — ${r.reason}</div>`;
        });
      }
      if (insights.risks.length) {
        html += `<div class="mt-2 text-[9px] uppercase tracking-widest text-orange-400/80 mb-0.5">PROFILE NOTES</div>`;
        insights.risks.forEach(msg => {
          html += `<div class="text-[10px] text-orange-200/90 mb-0.5">⚠ ${msg}</div>`;
        });
      }
      html += `</div>`;
    } else {
      html += `<div class="text-[10px] text-white/40 mt-1">Fill in a few fields above to see profile matches and notes.</div>`;
    }

    // Footer actions
    html += `
      <div class="mt-3 pt-2 border-t border-white/10 flex gap-2 text-[9px]">
        <button id="personal-clear-btn" class="px-2 py-0.5 rounded-xl border border-white/15 hover:bg-white/5 text-white/60">Clear</button>
        <div class="flex-1 text-right text-white/30">Data stays in your browser</div>
      </div>`;

    panel.innerHTML = html;

    // Attach listeners (after innerHTML)
    // Use 'change' (not 'input') so we don't re-render + lose focus on every keystroke while typing.
    // User fills the value, then tabs/clicks away or picks select -> it commits, saves, and re-renders with live BMI/insights.
    panel.querySelectorAll('input[data-key], select[data-key]').forEach(el => {
      const key = el.dataset.key;
      el.addEventListener('change', () => updatePersonalField(key, el.value));
    });

    // Live BMI preview while typing weight/height (no full re-render, no focus loss)
    const liveBmiEl = panel.querySelector('#personal-live-bmi');
    const wEl = panel.querySelector('input[data-key="weight"]');
    const hEl = panel.querySelector('input[data-key="height"]');
    function refreshLiveBmi() {
      if (!liveBmiEl || !wEl || !hEl) return;
      const w = parseFloat(wEl.value);
      const h = parseFloat(hEl.value);
      if (w && h) {
        const val = (w / ((h / 100) ** 2)).toFixed(1);
        let cat = '';
        const n = parseFloat(val);
        if (n < 18.5) cat = 'Underweight';
        else if (n < 25) cat = 'Normal';
        else if (n < 30) cat = 'Overweight';
        else cat = 'Obese';
        liveBmiEl.innerHTML = `BMI: <span class="font-mono">${val}</span> <span class="text-white/50">(${cat})</span> <span class="text-[9px] text-white/30">(tab/click away to save)</span>`;
      } else {
        liveBmiEl.innerHTML = `BMI: <span class="font-mono">—</span> <span class="text-white/40">(enter weight + height)</span>`;
      }
    }
    if (wEl) wEl.addEventListener('input', refreshLiveBmi);
    if (hEl) hEl.addEventListener('input', refreshLiveBmi);

    const clearBtn = panel.querySelector('#personal-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        personalData = {};
        savePersonalData();
        renderPersonalPanel();
      };
    }
  }

  function initPersonalCorner() {
    loadPersonalData();

    const panel = document.getElementById('personal-panel');
    const header = document.getElementById('personal-header');
    const collapseBtn = document.getElementById('personal-collapse-btn');
    if (!panel || !header) return;

    // #6 simple first-time onboarding for Personal Corner
    const seen = readStorage('stackmap-personal-onboarded', ['aetheris-personal-onboarded']);
    const hasData = Object.keys(personalData || {}).some(k => personalData[k] !== '' && personalData[k] != null);
    if (!seen && !hasData) {
      const note = document.createElement('div');
      note.className = 'mt-2 p-2 text-[10px] bg-emerald-900/30 border border-emerald-400/30 rounded-xl text-emerald-200/90';
      note.innerHTML = 'Welcome! Enter your stats below for personalized scores &amp; insights across all constellations. All data stays in your browser.';
      panel.insertBefore(note, panel.firstChild);
      writeStorage('stackmap-personal-onboarded', '1');
      // auto clear after interaction
      setTimeout(() => { if (note.parentNode) note.parentNode.removeChild(note); }, 8000);
    }

    // Collapsed until You, or the header, is opened. The node card stays the first thing you see.
    let isCollapsed = true;

    function toggleCollapse(forceOpen = false) {
      isCollapsed = forceOpen ? false : !isCollapsed;
      panel.classList.toggle('hidden', isCollapsed);
      if (collapseBtn) collapseBtn.textContent = isCollapsed ? '▾' : '▴';
      // Always ensure content is rendered when we show it (fixes initial empty panel)
      if (!isCollapsed) {
        renderPersonalPanel();
      }
    }

    header.onclick = () => toggleCollapse();
    if (collapseBtn) collapseBtn.onclick = (e) => { e.stopPropagation(); toggleCollapse(); };

    // Set initial visibility (open)
    panel.classList.toggle('hidden', isCollapsed);
    if (collapseBtn) collapseBtn.textContent = isCollapsed ? '▾' : '▴';

    // Always render the form + insights content (even if collapsed, content is ready to show)
    renderPersonalPanel();

    // If somehow collapsed, make sure we don't show it
    if (isCollapsed) {
      panel.classList.add('hidden');
    }

    // Expose for other modules / future green score (3.4 / 4.x)
    window.AETHERIS = window.AETHERIS || {};
    window.AETHERIS.personal = personalData;
    window.AETHERIS.getPersonalInsights = getPersonalInsights;
    window.AETHERIS.personalizedScore = (n) => (typeof personalizedScore === 'function' ? personalizedScore(n, personalData) : null);
  }


  // =====================================================
  // MY STACK — localStorage + highlight + export/import + list
  // =====================================================
  const STACK_DATA_BY_CONST = {
    supplements,
    habits,
    exercises,
    foods,
    environment,
    biomarkers
  };

  function resolveStackEntryLabel(entry) {
    const list = STACK_DATA_BY_CONST[entry.constellation];
    if (Array.isArray(list)) {
      const hit = list.find((n) => String(n.id) === String(entry.id));
      if (hit && hit.name) return hit.name;
    }
    return null;
  }

  function showMyStackToast(msg) {
    let el = document.getElementById('mystack-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mystack-toast';
      el.className = 'fixed bottom-28 left-1/2 -translate-x-1/2 z-[220] max-w-[90vw] px-3 py-1.5 rounded-full text-[11px] text-amber-100 bg-[#0a0d1a]/95 border border-amber-400/40 shadow-lg pointer-events-none transition-opacity duration-200';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    el.classList.remove('hidden');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.classList.add('hidden'), 200);
    }, 1600);
  }

  function styleStackToggleBtn(btn, inStack) {
    if (!btn) return;
    const isPreview = btn.id === 'sheet-mystack-btn';
    btn.textContent = inStack ? 'Remove from My Stack' : 'Add to My Stack';
    if (isPreview) {
      btn.className = inStack
        ? 'w-full text-[11px] py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white/80'
        : 'w-full text-[11px] py-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200';
    } else {
      btn.className = inStack
        ? 'w-full text-xs py-2 rounded-2xl border border-white/20 hover:bg-white/10 text-white/80'
        : 'w-full text-xs py-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200';
    }
  }

  function stackIdentity(node) {
    return {
      id: String(node?._sourceId || node?.id || ''),
      constellation: String(node?._constellation || currentTreeType || 'supplements')
    };
  }

  function toggleMyStackNode(node, btnEl) {
    if (!node || node.id == null) return;
    const ident = stackIdentity(node);
    const id = ident.id;
    const c = ident.constellation;
    const wasEmpty = myStack.getCount() === 0;
    const result = myStack.toggle(id, c);
    const nowIn = myStack.has(id, c);
    styleStackToggleBtn(btnEl, nowIn);
    // Keep sibling inspector/preview buttons in sync if both exist
    document.querySelectorAll('#mystack-toggle-node-btn, #sheet-mystack-btn').forEach((b) => {
      if (b !== btnEl) styleStackToggleBtn(b, nowIn);
    });
    const label = node.name || id;
    showMyStackToast(nowIn ? `Added ${label}` : `Removed ${label}`);
    if (result.added && result.overSoftLimit) {
      showMyStackToast(`Soft limit (${FREE_STACK_LIMIT}) — still saved. Pro lifts the advisory ceiling.`);
      track('mystack_soft_limit', { count: myStack.getCount() });
    }
    if (result.added && wasEmpty && !myStack.highlightMode) {
      myStack.setHighlightMode(true);
    }
    track(nowIn ? 'mystack_add' : 'mystack_remove', { id, constellation: c });
    refreshMyStackUI();
    if (treeInstance) treeInstance.draw();
  }

  function renderMyStackList() {
    const listEl = document.getElementById('mystack-list');
    const emptyEl = document.getElementById('mystack-empty');
    if (!listEl) return;
    const entries = myStack.getEntries();
    if (emptyEl) emptyEl.classList.toggle('hidden', entries.length > 0);
    if (!entries.length) {
      listEl.innerHTML = '';
      return;
    }
    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    listEl.innerHTML = entries.map((entry) => {
      const name = resolveStackEntryLabel(entry);
      const title = name || `${entry.id} · ${entry.constellation}`;
      const sub = name ? entry.constellation : '';
      const safeId = esc(entry.id);
      const safeC = esc(entry.constellation);
      const noteVal = esc(entry.note || '');
      const slot = entry.slot || '';
      const paused = !!entry.paused;
      const pauseCls = paused
        ? 'shrink-0 px-1 py-0.5 rounded border border-white/10 text-white/40 hover:bg-white/5 text-[9px]'
        : 'shrink-0 px-1 py-0.5 rounded border border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 text-[9px]';
      return `<div class="flex flex-col gap-0.5 px-1.5 py-1 rounded-lg border border-white/10 bg-white/[0.03]${paused ? ' opacity-50' : ''}" data-stack-row="${safeId}" data-stack-const="${safeC}">
        <div class="flex items-center gap-1">
          <div class="flex-1 min-w-0">
            <div class="truncate text-white/85 text-[10px] leading-tight">${esc(title)}</div>
            ${sub ? `<div class="truncate text-white/35 text-[8px]">${esc(sub)}</div>` : ''}
          </div>
          <button type="button" data-stack-pause="${safeId}" data-stack-const="${safeC}"
                  class="${pauseCls}"
                  title="${paused ? 'Paused — click to mark active' : 'Active — click to pause'}">${paused ? 'Paused' : 'Active'}</button>
          <button type="button" data-stack-remove="${safeId}" data-stack-const="${safeC}"
                  class="shrink-0 px-1.5 py-0.5 rounded border border-red-400/25 text-red-300/80 hover:bg-red-950/40 text-[9px]"
                  title="Remove">×</button>
        </div>
        <div class="flex items-center gap-1">
          <select data-stack-slot="${safeId}" data-stack-const="${safeC}"
                  class="shrink-0 max-w-[72px] bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white/70"
                  title="Morning / evening slot">
            <option value="" ${!slot ? 'selected' : ''}>Slot</option>
            <option value="morning" ${slot === 'morning' ? 'selected' : ''}>Morning</option>
            <option value="evening" ${slot === 'evening' ? 'selected' : ''}>Evening</option>
          </select>
          <input type="text" data-stack-note="${safeId}" data-stack-const="${safeC}"
                 value="${noteVal}" maxlength="500" placeholder="Note…"
                 class="flex-1 min-w-0 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white/75 placeholder:text-white/25"
                 title="Personal note (saved locally)" />
        </div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('[data-stack-remove]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = String(btn.getAttribute('data-stack-remove'));
        const c = String(btn.getAttribute('data-stack-const') || 'supplements');
        const label = resolveStackEntryLabel({ id, constellation: c }) || id;
        myStack.remove(id, c);
        showMyStackToast(`Removed ${label}`);
        const sel = treeInstance && treeInstance.selectedId != null ? String(treeInstance.selectedId) : null;
        const curC = String(currentTreeType || 'supplements');
        if (sel === id && curC === c) {
          document.querySelectorAll('#mystack-toggle-node-btn, #sheet-mystack-btn').forEach((b) => styleStackToggleBtn(b, false));
        }
        refreshMyStackUI();
        if (treeInstance) treeInstance.draw();
      };
    });

    listEl.querySelectorAll('[data-stack-pause]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = String(btn.getAttribute('data-stack-pause'));
        const c = String(btn.getAttribute('data-stack-const') || 'supplements');
        const entry = myStack.getEntry(id, c);
        const paused = !(entry && entry.paused);
        myStack.setPaused(id, c, paused);
        track('mystack_set_paused', { id, constellation: c, paused });
        refreshMyStackUI();
        if (treeInstance) treeInstance.draw();
      };
    });

    listEl.querySelectorAll('[data-stack-slot]').forEach((sel) => {
      sel.onchange = (e) => {
        e.stopPropagation();
        const id = String(sel.getAttribute('data-stack-slot'));
        const c = String(sel.getAttribute('data-stack-const') || 'supplements');
        myStack.setSlot(id, c, sel.value || null);
        track('mystack_set_slot', { id, constellation: c, slot: sel.value || null });
      };
    });

    listEl.querySelectorAll('[data-stack-note]').forEach((inp) => {
      let t = null;
      const commit = () => {
        const id = String(inp.getAttribute('data-stack-note'));
        const c = String(inp.getAttribute('data-stack-const') || 'supplements');
        myStack.setNote(id, c, inp.value);
        track('mystack_set_note', { id, constellation: c });
      };
      inp.oninput = () => {
        clearTimeout(t);
        t = setTimeout(commit, 400);
      };
      inp.onchange = commit;
      inp.onclick = (e) => e.stopPropagation();
    });
  }


  function resolveNodeForOrganSystem(id, constellation) {
    const list = STACK_DATA_BY_CONST[String(constellation || '').toLowerCase()];
    if (!Array.isArray(list)) return null;
    return list.find((n) => String(n.id) === String(id)) || null;
  }

  function recomputeOrganSystem() {
    window.AETHERIS = window.AETHERIS || {};
    window.AETHERIS.organSystem = globalOrganSystem;
    globalOrganSystem.recomputeFromStack(myStack.getEntries(), resolveNodeForOrganSystem);
    return globalOrganSystem;
  }

  function formatOrganScore(score) {
    const s = Number(score) || 0;
    const abs = Math.abs(s);
    const body = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
    return (s >= 0 ? '+' : '−') + body;
  }

  function organImpactStripHtml(limit = 8) {
    const ranked = globalOrganSystem.getRanked(limit);
    if (!ranked.length) {
      return `<div class="text-[9px] text-white/35 leading-snug">Add stack items to see tagged systems coverage.</div>`;
    }
    const chips = ranked.map((row) => {
      const meta = organMeta[row.organ] || {};
      const label = meta.label || row.organ;
      const pos = row.score >= 0;
      const color = meta.color || (pos ? '#4ade80' : '#f87171');
      const cls = pos
        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
        : 'border-red-400/30 bg-red-400/10 text-red-100';
      return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border ${cls} text-[9px] leading-none" title="Stack coverage (tagged systems) · ${row.count} item(s)" style="box-shadow: inset 0 0 0 1px ${color}22">
        <span class="opacity-90">${label}</span>
        <span class="font-mono opacity-80">${formatOrganScore(row.score)}</span>
      </span>`;
    }).join('');
    return `<div class="text-[9px] uppercase tracking-widest text-white/45 mb-1">Organ impact <span class="normal-case tracking-normal text-white/30">(stack coverage)</span></div>
      <div class="flex flex-wrap gap-1">${chips}</div>
      <div class="mt-1 text-[8px] text-white/30 leading-snug">Educational tags from your stack — not medical advice.</div>`;
  }

  function renderOrganImpactUI() {
    // Lightweight mount inside My Stack panel (avoid heavy HTML edits)
    const panel = document.getElementById('mystack-panel');
    if (panel) {
      let mount = document.getElementById('organ-impact-mystack');
      if (!mount) {
        mount = document.createElement('div');
        mount.id = 'organ-impact-mystack';
        mount.className = 'px-1.5 py-1 rounded-xl border border-white/10 bg-white/[0.03]';
        const list = document.getElementById('mystack-list');
        if (list && list.parentNode === panel) {
          list.insertAdjacentElement('afterend', mount);
        } else {
          panel.insertBefore(mount, panel.firstChild);
        }
      }
      mount.innerHTML = organImpactStripHtml(6);
    }

    // Inspector mount (desktop detail + any #organ-impact-inspector hosts)
    document.querySelectorAll('#organ-impact-inspector').forEach((el) => {
      el.innerHTML = organImpactStripHtml(8);
      el.classList.remove('hidden');
    });
  }

  function syncMyStackActiveEmpty() {
    const el = document.getElementById('mystack-active-empty');
    if (!el) return;
    // Ask the tree what it really draws, so group filters / node caps count too.
    const shown = treeInstance && typeof treeInstance._getShownNodes === 'function'
      ? treeInstance._getShownNodes().length
      : myStack.getActiveCount();
    const show = myStack.viewMode === 'active' && shown === 0;
    el.classList.toggle('hidden', !show);
  }

  function refreshMyStackUI() {
    window.AETHERIS = window.AETHERIS || {};
    window.AETHERIS.myStack = myStack;
    const count = myStack.getCount();
    const badge = document.getElementById('mystack-count-badge');
    if (badge) {
      badge.textContent = String(count);
      badge.title = isPro() ? 'Pro · unlimited' : `Free soft limit ${FREE_STACK_LIMIT}`;
    }
    const hlBtn = document.getElementById('mystack-highlight-btn');
    const hlLabel = document.getElementById('mystack-highlight-label');
    if (hlLabel) hlLabel.textContent = myStack.highlightMode ? 'Highlight on' : 'Highlight off';
    if (hlBtn) {
      hlBtn.classList.toggle('border-amber-400/50', myStack.highlightMode);
      hlBtn.classList.toggle('bg-amber-400/10', myStack.highlightMode);
      hlBtn.classList.toggle('text-amber-100', myStack.highlightMode);
    }
    const viewActiveOn = myStack.viewMode === 'active';
    const styleViewBtn = (btn, on) => {
      if (!btn) return;
      btn.classList.toggle('border-amber-400/50', on);
      btn.classList.toggle('bg-amber-400/10', on);
      btn.classList.toggle('text-amber-100', on);
    };
    styleViewBtn(document.getElementById('mystack-view-all'), !viewActiveOn);
    styleViewBtn(document.getElementById('mystack-view-active'), viewActiveOn);
    syncMyStackActiveEmpty();
    const warn = document.getElementById('mystack-soft-limit-warn');
    const limitN = document.getElementById('mystack-limit-n');
    if (limitN) limitN.textContent = String(FREE_STACK_LIMIT);
    if (warn) warn.classList.toggle('hidden', !isOverFreeStackLimit(count));
    renderMyStackList();
    recomputeOrganSystem();
    renderOrganImpactUI();
    window.AETHERIS.organSystem = globalOrganSystem;
    if (treeInstance && typeof treeInstance.draw === 'function' && !treeInstance.selectedId) treeInstance.draw();
  }

  function buildStackEntriesForShare() {
    return myStack.getEntries().map((e) => ({
      ...e,
      name: resolveStackEntryLabel(e) || e.id
    }));
  }

  function populatePrintSheet() {
    // Ensure organ scores are current before rendering the clean print view
    recomputeOrganSystem();
    const entries = buildStackEntriesForShare();
    const meta = document.getElementById('mystack-print-meta');
    const tbody = document.querySelector('#mystack-print-table tbody');
    const organsEl = document.getElementById('mystack-print-organs');
    const organsEmpty = document.getElementById('mystack-print-organs-empty');
    const wm = document.getElementById('mystack-print-watermark');
    const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    if (meta) {
      const when = new Date().toLocaleString();
      meta.textContent = `${entries.length} item(s) · ${when} · Educational only · not medical advice`;
    }
    if (tbody) {
      tbody.innerHTML = entries.map((e) => {
        const slot = e.slot === 'morning' ? 'Morning' : e.slot === 'evening' ? 'Evening' : '—';
        return `<tr>
          <td>${esc(e.name)}</td>
          <td>${esc(e.constellation)}</td>
          <td>${esc(slot)}</td>
          <td>${esc(e.note || '—')}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="4">Empty stack</td></tr>';
    }
    const ranked = globalOrganSystem.getRanked(16);
    if (organsEl) {
      organsEl.innerHTML = ranked.map((row) => {
        const metaO = organMeta[row.organ] || {};
        const label = metaO.label || row.organ;
        return `<li><strong>${esc(label)}</strong> ${esc(formatOrganScore(row.score))} · ${row.count} tag(s)</li>`;
      }).join('');
    }
    if (organsEmpty) {
      organsEmpty.style.display = ranked.length ? 'none' : 'block';
    }
    if (wm) wm.textContent = isPro() ? `${PRODUCT_NAME} Pro` : `${PRODUCT_NAME} Free`;
  }

  function openPricingModal() {
    const modal = document.getElementById('pricing-modal');
    if (!modal) return;
    const checkout = CHECKOUT_URL || PRICING_CHECKOUT_URL || '#';
    const link = document.getElementById('pricing-checkout-link');
    if (link) {
      link.href = checkout.startsWith('#') ? checkout : checkout;
      link.textContent = checkout && !String(checkout).startsWith('#')
        ? 'Checkout — Founding Pro $29'
        : 'Checkout — Coming soon ($29)';
      if (checkout && !String(checkout).startsWith('#')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
    const pageLink = document.getElementById('pricing-page-link');
    if (pageLink) pageLink.href = pricingPageUrl();
    modal.classList.remove('hidden');
    track('pricing_open');
  }

  function closePricingModal() {
    const modal = document.getElementById('pricing-modal');
    if (modal) modal.classList.add('hidden');
  }

  const FIRST_RUN_TIP_KEY = 'stackmap-first-run-tip-v1';
  const LEGACY_FIRST_RUN_TIP_KEY = 'aetheris-first-run-tip-v1';

  function dismissFirstRunTip() {
    const tip = document.getElementById('first-run-tip');
    if (tip) tip.classList.add('hidden');
    writeStorage(FIRST_RUN_TIP_KEY, '1');
    track('first_run_tip_dismiss');
  }

  function initFirstRunTip() {
    if (readStorage(FIRST_RUN_TIP_KEY, [LEGACY_FIRST_RUN_TIP_KEY]) === '1') return;
    const tip = document.getElementById('first-run-tip');
    if (!tip) return;
    // Show after loading overlay settles
    setTimeout(() => {
      if (readStorage(FIRST_RUN_TIP_KEY, [LEGACY_FIRST_RUN_TIP_KEY]) === '1') return;
      tip.classList.remove('hidden');
      track('first_run_tip_show');
    }, 900);
    const dismissBtn = document.getElementById('first-run-tip-dismiss');
    const gotIt = document.getElementById('first-run-tip-got-it');
    if (dismissBtn && !dismissBtn._wired) {
      dismissBtn._wired = true;
      dismissBtn.onclick = (e) => { e.stopPropagation(); dismissFirstRunTip(); };
    }
    if (gotIt && !gotIt._wired) {
      gotIt._wired = true;
      gotIt.onclick = (e) => { e.stopPropagation(); dismissFirstRunTip(); };
    }
  }

  function initFeedbackAndPricing() {
    const ver = document.getElementById('app-version');
    if (ver) ver.textContent = `v${APP_VERSION}`;
    const fb = document.getElementById('feedback-btn');
    if (fb) {
      fb.onclick = () => {
        track('feedback_click');
        window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
      };
    }
    const pricingBtn = document.getElementById('pricing-btn');
    if (pricingBtn) pricingBtn.onclick = () => openPricingModal();
    const hint = document.getElementById('mystack-pricing-hint');
    if (hint) hint.onclick = () => openPricingModal();
    const footerPricingPage = document.getElementById('footer-pricing-page');
    if (footerPricingPage) footerPricingPage.href = pricingPageUrl();
    // Same BASE_URL prefix as Pricing, so the links resolve under the configured base.
    const siteBase = pricingPageUrl().replace(/pricing\.html$/, '');
    const footerMedical = document.getElementById('footer-medical');
    const footerPrivacy = document.getElementById('footer-privacy');
    const footerTerms = document.getElementById('footer-terms');
    if (footerMedical) footerMedical.href = `${siteBase}terms.html#medical`;
    if (footerPrivacy) footerPrivacy.href = `${siteBase}privacy.html`;
    if (footerTerms) footerTerms.href = `${siteBase}terms.html`;
    const closeBtn = document.getElementById('pricing-modal-close');
    if (closeBtn) closeBtn.onclick = () => closePricingModal();
    const modal = document.getElementById('pricing-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closePricingModal();
      });
    }
    const apply = document.getElementById('pricing-apply-key');
    const input = document.getElementById('pricing-license-input');
    if (apply && input) {
      apply.onclick = () => {
        setProKey(input.value);
        showMyStackToast(isPro() ? 'Pro unlocked (local key)' : 'Pro key cleared');
        track('pro_key_apply', { pro: isPro() });
        refreshMyStackUI();
        closePricingModal();
      };
    }
    window.AETHERIS = window.AETHERIS || {};
    window.AETHERIS.isPro = isPro;
    window.AETHERIS.openPricingModal = openPricingModal;
  }

  function initMyStack() {
    window.AETHERIS = window.AETHERIS || {};
    window.AETHERIS.myStack = myStack;
    window.AETHERIS.toggleMyStackNode = toggleMyStackNode;
    window.AETHERIS.refreshMyStackUI = refreshMyStackUI;
    renderStarterStacks();
    initNodeSearch();

    const panelBtn = document.getElementById('mystack-toggle-panel');
    const panel = document.getElementById('mystack-panel');
    const panelIcon = document.getElementById('mystack-panel-icon');
    if (panelBtn && panel) {
      panelBtn.onclick = () => {
        const open = panel.classList.toggle('hidden') === false;
        if (panelIcon) panelIcon.className = open ? 'fa-solid fa-chevron-up text-[9px]' : 'fa-solid fa-chevron-down text-[9px]';
      };
    }
    const hlBtn = document.getElementById('mystack-highlight-btn');
    if (hlBtn) {
      hlBtn.onclick = () => {
        myStack.toggleHighlightMode();
        refreshMyStackUI();
        if (treeInstance) treeInstance.draw();
      };
    }
    const setStackView = (mode) => {
      myStack.setViewMode(mode);
      track('mystack_view_mode', { mode });
      refreshMyStackUI();
      if (treeInstance) treeInstance.draw();
    };
    const viewAllBtn = document.getElementById('mystack-view-all');
    const viewActiveBtn = document.getElementById('mystack-view-active');
    if (viewAllBtn) viewAllBtn.onclick = () => setStackView('all');
    if (viewActiveBtn) viewActiveBtn.onclick = () => setStackView('active');
    const exportBtn = document.getElementById('mystack-export-btn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const blob = new Blob([myStack.exportJSON()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stackmap-my-stack.json';
        a.click();
        URL.revokeObjectURL(url);
        track('mystack_export');
      };
    }
    const importBtn = document.getElementById('mystack-import-btn');
    const importInput = document.getElementById('mystack-import-input');
    if (importBtn && importInput) {
      importBtn.onclick = () => importInput.click();
    }
    if (importInput) {
      importInput.onchange = async () => {
        const file = importInput.files && importInput.files[0];
        importInput.value = '';
        if (!file) return;
        const modeEl = document.querySelector('input[name="mystack-import-mode"]:checked');
        const merge = modeEl && modeEl.value === 'merge';
        try {
          const textIn = await file.text();
          myStack.importJSON(textIn, { merge });
          showMyStackToast(`${merge ? 'Merged' : 'Imported'} · ${myStack.getCount()} item(s)`);
          track('mystack_import', { merge, count: myStack.getCount() });
          refreshMyStackUI();
          if (treeInstance) treeInstance.draw();
        } catch (err) {
          console.warn('[AETHERIS] My Stack import failed', err);
          showMyStackToast('Import failed — invalid JSON');
        }
      };
    }
    const shareBtn = document.getElementById('mystack-share-btn');
    if (shareBtn) {
      shareBtn.onclick = async () => {
        const entries = buildStackEntriesForShare();
        if (!entries.length) {
          showMyStackToast('Stack is empty — add nodes first');
          return;
        }
        const gate = softProGate('Share card');
        if (!gate.pro) showMyStackToast(gate.hint);
        const result = await downloadStackShareCard(entries, { isPro: isPro() });
        if (result.ok) {
          showMyStackToast('Share card downloaded');
          track('mystack_share_png', { count: entries.length, pro: isPro() });
        } else {
          showMyStackToast('Share card failed');
        }
      };
    }
    const printBtn = document.getElementById('mystack-print-btn');
    if (printBtn) {
      printBtn.onclick = () => {
        const gate = softProGate('Print protocol');
        if (!gate.pro) showMyStackToast(gate.hint || 'Free print includes a watermark');
        populatePrintSheet();
        track('mystack_print', { count: myStack.getCount(), pro: isPro() });
        // Clean print view: @media print hides app chrome and shows #mystack-print-sheet only
        window.print();
      };
    }
    const clearBtn = document.getElementById('mystack-clear-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        if (!myStack.getCount()) return;
        if (!confirm('Clear your entire My Stack?')) return;
        myStack.clear();
        showMyStackToast('Stack cleared');
        track('mystack_clear');
        refreshMyStackUI();
        if (treeInstance) treeInstance.draw();
      };
    }
    myStack.subscribe(() => refreshMyStackUI());
    refreshMyStackUI();
  }

  // Call init after other UI setup
  initPersonalCorner();
  initMyStack();
  initFeedbackAndPricing();
  initFirstRunTip();
  initAnalytics(); // GoatCounter counts the pageview itself
  trackPageView();

  window.AETHERIS.tree = treeInstance;

  canvas.addEventListener("mouseleave", () => {
    hoverPopup.hide();
    // Collapse organs on leave unless an organ filter is pinning the explode state
    if (treeInstance?.organExplode && !treeInstance.organExplode.activeOrganFilter && !treeInstance.organExplode.pinned) {
      if (treeInstance.organExplode.setExpanded(false)) treeInstance._scheduleDraw();
    }
    if (treeInstance?.organExplode) treeInstance.organExplode.hoveredOrgan = null;
  });

  canvas.addEventListener("click", (e) => {
    if (suppressNextClick || inertiaActive) {
      suppressNextClick = false;
      return;
    }

    // Ignore clicks that hit the bottom sheet or anatomy overlay / chrome
    if (isEventOverMapChrome(e)) return;

    const { x: mx, y: my } = canvasPointer(e);

    // 1) Exploded organ → filter (does not steal node clicks when collapsed)
    if (treeInstance && typeof treeInstance.trySelectOrganAt === 'function') {
      const org = treeInstance.trySelectOrganAt(mx, my);
      if (org) {
        hoverPopup.hide();
        return;
      }
    }

    // 2) Constellation node
    const hit = treeInstance.getNodeAt(mx, my);
    if (hit) {
      handleNodeSelection(hit);
      return;
    }

    // 3) Body silhouette → explode / collapse
    if (treeInstance && typeof treeInstance.tryToggleBodyExplode === 'function') {
      if (treeInstance.tryToggleBodyExplode(mx, my)) {
        hoverPopup.hide();
        return;
      }
    }

    // 4) Empty map → collapse organ explode + clear selection
    if (treeInstance && typeof treeInstance.collapseOrganExplodeIfOpen === 'function') {
      treeInstance.collapseOrganExplodeIfOpen();
    }
    handleNodeSelection(null);
    hoverPopup.hide();
  });

  // === Keyboard shortcuts (polish + power user delight) ===
  function openCatalogNode(constellation, id) {
    if (currentTreeType === 'all') {
      const composite = `${constellation}::${id}`;
      const node = (treeInstance?.nodes || []).find((n) => n.id === composite);
      if (!node) return;
      if (node.cat && typeof treeInstance.setGroupEnabled === 'function') {
        treeInstance.setGroupEnabled(node.cat, true);
      }
      treeInstance.select(node.id);
      if (typeof treeInstance.centerOn === 'function') treeInstance.centerOn(node);
      handleNodeSelection(node);
      syncGroupFilterChips();
      return;
    }
    if (currentTreeType !== constellation) switchConstellation(constellation);
    if (!treeInstance) return;
    const node = (treeInstance.nodes || []).find((n) => n.id === id);
    if (!node) return;
    if (node.cat && typeof treeInstance.setGroupEnabled === 'function') {
      treeInstance.setGroupEnabled(node.cat, true);
    }
    const visible = typeof treeInstance._getVisibleNodes === 'function'
      ? treeInstance._getVisibleNodes()
      : treeInstance.nodes;
    if (treeInstance.maxNodes > 0 && !visible.some((n) => n.id === id)) {
      treeInstance.setMaxNodes(0);
      renderNodeLimitControl();
    }
    const placed = (typeof treeInstance._getVisibleNodes === 'function'
      ? treeInstance._getVisibleNodes()
      : treeInstance.nodes
    ).find((n) => n.id === id) || node;
    treeInstance.select(placed.id);
    if (typeof treeInstance.centerOn === 'function') treeInstance.centerOn(placed);
    handleNodeSelection(placed);
    syncGroupFilterChips();
  }

  function initNodeSearch() {
    const input = document.getElementById('node-search-input');
    const results = document.getElementById('node-search-results');
    if (!input || !results || input._wired) return;
    input._wired = true;

    const close = () => {
      results.classList.add('hidden');
      results.innerHTML = '';
    };

    const render = () => {
      const hits = searchCatalog(input.value, 8);
      if (!input.value.trim() || !hits.length) {
        close();
        return;
      }
      results.classList.remove('hidden');
      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      results.innerHTML = hits.map((hit) => `
        <button type="button" data-constellation="${esc(hit.constellation)}" data-id="${esc(hit.id)}"
                class="w-full text-left px-3 py-1.5 hover:bg-white/10 border-b border-white/5 last:border-0">
          <div class="text-xs text-white/90">${esc(hit.name)}</div>
          <div class="text-[9px] uppercase tracking-wider text-white/40">${esc(hit.constellation)}${hit.cat ? ' · ' + esc(hit.cat) : ''}</div>
        </button>
      `).join('');
      results.querySelectorAll('button').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          openCatalogNode(btn.dataset.constellation, btn.dataset.id);
          close();
          input.blur();
          track('node_search_open', { constellation: btn.dataset.constellation, id: btn.dataset.id });
        };
      });
    };

    input.addEventListener('input', render);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        input.blur();
      } else if (e.key === 'Enter') {
        const first = results.querySelector('button');
        if (first) first.click();
      }
    });
    input.addEventListener('focus', render);
    document.addEventListener('pointerdown', (e) => {
      if (!document.getElementById('node-search')?.contains(e.target)) close();
    });
  }

  function renderStarterStacks() {
    const mount = document.getElementById('starter-stack-list');
    if (!mount || mount._wired) return;
    mount._wired = true;
    const known = new Set(CATALOG.map((n) => `${n.constellation}::${n.id}`));
    mount.innerHTML = STARTER_STACKS.map((stack) => {
      const count = stack.items.filter((item) => known.has(`${item.constellation}::${item.id}`)).length;
      return `
        <button type="button" data-starter="${stack.id}"
                class="text-left px-1.5 py-1 rounded-lg border border-white/10 hover:bg-white/5">
          <div class="text-[10px] text-amber-100/90">${stack.name} <span class="text-white/35 font-mono">${count}</span></div>
          <div class="text-[8px] text-white/40 leading-snug">${stack.blurb}</div>
        </button>`;
    }).join('');
    mount.querySelectorAll('[data-starter]').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const stack = STARTER_STACKS.find((s) => s.id === btn.dataset.starter);
        if (!stack) return;
        let added = 0;
        for (const item of stack.items) {
          if (!known.has(`${item.constellation}::${item.id}`)) continue;
          const res = myStack.add(item.id, item.constellation, item.slot ? { slot: item.slot } : {});
          if (res.ok && !res.already) added += 1;
        }
        refreshMyStackUI();
        if (treeInstance) treeInstance.draw();
        showMyStackToast(added ? `Added ${added} from ${stack.name}` : `${stack.name} already in your stack`);
        track('starter_stack_apply', { id: stack.id, added });
        if (!isMobileViewport()) setRailMode('stack');
      };
    });
  }

  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (typing) return;
    if (!treeInstance) return;
    if (e.key === '/') {
      const input = document.getElementById('node-search-input');
      if (input) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      return;
    }
    if (e.key === 'Escape') {
      hoverPopup.hide();
      if (treeInstance && typeof treeInstance.clearOrganExplode === 'function') {
        treeInstance.clearOrganExplode();
      }
      handleNodeSelection(null);
    } else if (e.key === '+' || e.key === '=') {
      stopInertia && stopInertia();
      treeInstance.zoom(1);
    } else if (e.key === '-' || e.key === '_') {
      stopInertia && stopInertia();
      treeInstance.zoom(-1);
    } else if (e.key.toLowerCase() === 'r') {
      treeInstance.recenter();
    } else if (e.key.toLowerCase() === 'f') {
      if (typeof treeInstance.toggleAllGroups === 'function') {
        treeInstance.toggleAllGroups();
      } else {
        treeInstance.enableAllGroups();
      }
      syncGroupFilterChips();
    }
  });

  setTimeout(() => {
    // Phone: the sheet would open under the Quick start tip.
    if (isMobileViewport()) return;
    if (currentTreeType !== 'supplements' || !treeInstance) return;
    const omega = treeInstance.nodes.find(n => n.id === 'omega3');
    if (!omega) return;
    handleNodeSelection(omega);
  }, 400);

  // On resize, if we cross from mobile to desktop, close any open bottom sheet so the left inspector becomes visible.
  // Also re-render node limit + group filters so they move to the correct container (mobile column vs desktop bottom bar).
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const bs = window.AETHERIS && window.AETHERIS.bottomSheet;
      if (bs && bs.getMode() !== 'closed' && !isMobileViewport()) {
        bs.close(true);
      }
      // Move slider + filters between mobile right-column and desktop bottom on breakpoint cross
      renderNodeLimitControl();
      renderGroupFilters();
    }, 140);
  });

  console.log("%c[AETHERIS Modular] Supplements tree + components initialized successfully.", "color:#4ade80");
});
