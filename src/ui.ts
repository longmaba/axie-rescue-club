import type { CompanionId, RescueGame, TargetId } from './game/rescue';
import { TALENTS, type TalentId } from './game/traits';
import { readMemories, saveExpedition, getCampSummary, getExpeditionProgress, type Memory } from './game/memories';
import { LEVELS, getLevel, isLevelId, type Cardinal, type LevelId } from './game/levels';

export const ICONS: Record<string, string> = {
  leaf: '<path d="M19 4C9 2 3 7 6 14s15 5 13-10Z"/><path d="m5 20 9-10M9 15l-1-5"/>',
  heart: '<path d="M20 5c-3-3-7-1-8 1C8-1 0 4 3 10c2 4 9 9 9 9s7-5 9-9c1-2 0-4-1-5Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9Z"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  push: '<path d="M4 6v12m3-6h13m-5-5 5 5-5 5"/>',
  drop: '<path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z"/><path d="M9 15c0 2 1 3 3 3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  sound: '<path d="m4 9 4 0 5-4v14l-5-4H4Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m4 9 4 0 5-4v14l-5-4H4Zm13 0 5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  home: '<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>',
  flag: '<path d="M5 21V3c5-5 9 5 15 0v10c-6 5-10-5-15 0"/>',
  flower: '<path d="M12 9C2-2-2 12 9 12-2 22 12 26 12 15c10 11 14-3 3-3C26 2 12-2 12 9Z"/>',
  boat: '<path d="m3 13 3 6h12l3-6H3Zm9 0V3l6 7h-6M3 21l3-1 3 1 3-1 3 1 3-1 3 1"/>',
  bridge: '<path d="M3 19V9m18 10V9M3 12c5-7 13-7 18 0M3 16h18M7 10v6m5-8v8m5-6v6"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
  lantern: '<path d="M9 5V3h6v2M7 8h10l2 12H5L7 8Zm-1 0 3-3h6l3 3M9 20l3-9 3 9"/>',
  berry: '<path d="M8 6c-5 0-5 8 4 15C21 14 21 6 16 6c-2 0-3 1-4 1s-2-1-4-1ZM7 4l5 3 5-3M12 7V2M8 11h.1M15 11h.1M12 15h.1"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  mirror: '<path d="m5 4 14 16M3 11V3h8m10 10v8h-8M4 17l4-4m8-2 4-4"/>',
  undo: '<path d="M7 5 2 10l5 5M2 10h12a6 6 0 1 1 0 12"/>',
};
export const icon = (name: string, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ICONS.star}</svg>`;
export const COMPANIONS = [
  { id: 'kibo' as const, name: 'Kibo', role: 'The brave one', ability: 'Push', icon: 'push', color: '#f5b862', clip: 'Hammer.Skill' },
  { id: 'pomodoro' as const, name: 'Pomodoro', role: 'The gentle one', ability: 'Grow', icon: 'flower', color: '#a9c96b', clip: 'Staff.Skill' },
  { id: 'bing' as const, name: 'Bing', role: 'The bright one', ability: 'Splash', icon: 'drop', color: '#8bcbd5', clip: 'Cannon.Skill' },
];
export type UiActions = {
  start: () => void; select: (id: CompanionId) => void; interact: () => void;
  pause: () => void; resume: () => void; restart: () => void; mute: () => boolean;
  help: () => void; journal: () => void; hint: () => void; resetPaths: () => void;
  inspectTarget: (id: TargetId) => void; setTalent: (id: TalentId) => void;
  expeditions: () => void; chooseLevel: (id: LevelId) => void;
  standSide: (id: TargetId, side: Cardinal) => void; undo: () => void; overview: () => boolean;
};
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const routeName = (route: Memory['route']) => route === 'bridge' ? 'The rooted bridge' : route === 'ferry' ? 'The leaf ferry' : route === 'seedbeds' ? 'The seed-pod puzzle' : route === 'moonbeam' ? 'The borrowed moonbeam' : 'A helping paw';

export class GameUI {
  private host: HTMLElement;
  private cache = '';
  private postcardSaved = false;
  private savedSuccessfully = false;
  private loaded = false;
  private helpOpen = false;
  private journalOpen = false;
  private expeditionsOpen = false;
  private focusedTarget: TargetId | null = null;
  private overviewMode = false;
  private listeners = new AbortController();
  campSummary = getCampSummary();

  constructor(private game: RescueGame, private actions: UiActions) {
    this.host = document.querySelector('#interface')!;
    this.host.innerHTML = `
      <header class="topbar">
        <div class="brand"><span class="brand-seal">${icon('heart')}${icon('leaf', 'seal-leaf')}</span><span>AXIE<span class="brand-name">rescue club</span></span></div>
        <div class="chapter"><span class="eyebrow" id="chapter-label"></span><h1 id="chapter-title"></h1><span class="chapter-sub" id="chapter-subtitle"></span></div>
        <nav class="tools" aria-label="Game settings"><button class="icon-button" data-action="expeditions" title="Choose expedition" aria-label="Choose expedition">${icon('map')}</button><button class="icon-button" data-action="mute" title="Toggle sound" aria-label="Mute sound">${icon('sound')}</button><button class="icon-button" data-action="help" title="Field guide" aria-label="Open field guide">${icon('help')}</button><button class="icon-button" data-action="pause" title="Pause (Esc)" aria-label="Pause game">${icon('pause')}</button></nav>
      </header>
      <aside class="trail-note"><div class="eyebrow">TODAY'S LITTLE MISSION</div><h2>Bring our friend home.</h2><p id="objective"></p>
        <div class="route-notes" aria-label="Explore the island"><button data-explore="bridge">${icon('bridge')}<span>By the log<small id="bridge-note">Something to build?</small></span></button><button data-explore="leaf">${icon('boat')}<span>By the leaf<small id="ferry-note">Something to grow?</small></span></button><button data-explore="camp" hidden>${icon('home')}<span>Club camp<small>Home, together</small></span></button></div>
        <div id="feature-notes" class="feature-notes" hidden></div>
        <div class="trail-steps" aria-label="Rescue progress">${['Find a way across', 'Meet our friend', 'Bring everyone home'].map((label, i) => `<div data-step="${i}"><span>${i + 1}</span><b>${label}</b></div>`).join('')}</div>
        <div class="keepsake-row">${icon('star')}<span>Little keepsakes</span><b id="keepsakes">0 / 3</b></div>
        <button class="lesson-link" data-action="help">${icon('flower')}<span id="lesson-label">Rose Bud field lesson</span></button>
      </aside>
      <div class="expedition-meter"><span class="mini-label">TAKE YOUR TIME</span><strong id="timer">0:00</strong><span id="progress-label">Explore. Try an idea.</span></div>
      <div id="world-labels"></div>
      <section class="intro-note" id="intro"><span class="paper-pin"></span><div class="eyebrow">A NOTE FROM THE CLUB</div><h2 id="intro-title"></h2><p id="intro-text"></p><div class="intro-tips"><span>${icon('push')} Push things into place.</span><span>${icon('flower')} Grow something useful.</span><span>${icon('drop')} Give water a little nudge.</span></div><button class="primary" data-action="start" disabled><span id="start-label">Packing backpacks…</span>${icon('arrow')}</button><div class="intro-links"><button class="intro-lesson" data-action="help">Field lesson ${icon('flower')}</button><button class="intro-lesson" data-action="expeditions">Choose island ${icon('map')}</button></div></section>
      <div class="context-wrap" id="context"><p id="message" role="status" aria-live="polite"></p><div class="context-actions"><button id="interact" class="action-button" data-action="interact"><kbd>E</kbd><span id="interact-label">Use ability</span>${icon('arrow')}</button><button class="hint-button" data-action="hint" aria-label="Get a small hint" title="A small hint">${icon('help')}</button></div></div>
      <nav class="squad" aria-label="Choose your companion">${COMPANIONS.map((c, i) => `<button class="companion ${i === 0 ? 'selected' : ''}" data-companion="${c.id}" style="--companion-color:${c.color}" aria-label="Select ${c.name}" aria-pressed="${i === 0}"><kbd>${i + 1}</kbd><span class="portrait"><img alt="${c.name}" hidden /></span><span class="companion-name">${c.name}</span><span class="ability">${icon(c.icon)}${c.ability}</span></button>`).join('')}</nav>
      <div class="bottom-guide"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><i></i><span>Click to explore</span><i></i><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> switch <kbd>E</kbd> try</span></div>
      <button class="club-motto journal-button" data-action="journal" aria-label="Open club journal">Club journal ${icon('heart')}</button>
      <div id="modal-layer" hidden></div><div class="load-error" id="load-error" hidden role="alert"></div>`;
    this.host.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button || button.disabled) return;
      if (button.dataset.companion) this.actions.select(button.dataset.companion as CompanionId);
      if (button.dataset.explore) this.actions.inspectTarget(button.dataset.explore as TargetId);
      if (button.dataset.stance && button.dataset.pod) this.actions.standSide(button.dataset.pod as TargetId, button.dataset.stance as Cardinal);
      if (button.dataset.talent) { this.actions.setTalent(button.dataset.talent as TalentId); this.cache = ''; }
      if (isLevelId(button.dataset.levelId)) this.actions.chooseLevel(button.dataset.levelId);
      const action = button.dataset.action;
      if (action === 'overview') { this.overviewMode = this.actions.overview(); this.cache = ''; }
      else if (action === 'mute') {
        const muted = this.actions.mute(); button.innerHTML = icon(muted ? 'mute' : 'sound');
        button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      } else if (action && action in this.actions) (this.actions[action as keyof UiActions] as () => void)();
    }, { signal: this.listeners.signal });
  }

  setPortrait(id: string, url: string) {
    const img = this.host.querySelector<HTMLImageElement>(`[data-companion="${id}"] img`);
    if (img) { img.src = url; img.hidden = false; }
  }
  ready() { this.loaded = true; this.cache = ''; this.host.querySelector<HTMLButtonElement>('[data-action="start"]')!.disabled = false; this.host.querySelector('#start-label')!.textContent = "Let's go!"; }
  loading(count: number) { this.host.querySelector('#start-label')!.textContent = `Packing backpacks… ${count}/4`; }
  error(message: string) {
    const el = this.host.querySelector<HTMLElement>('#load-error')!; el.hidden = false;
    el.innerHTML = '<h2>Our backpacks got stuck.</h2><p></p><button class="primary" onclick="location.reload()">Try again</button>';
    el.querySelector('p')!.textContent = message;
  }
  showHelp() { this.helpOpen = true; this.journalOpen = false; this.expeditionsOpen = false; this.game.pause(); this.cache = ''; }
  showJournal() { this.journalOpen = true; this.helpOpen = false; this.expeditionsOpen = false; this.game.pause(); this.cache = ''; }
  showExpeditions() { if (this.game.state.transport) return; this.expeditionsOpen = true; this.helpOpen = false; this.journalOpen = false; this.game.pause(); this.cache = ''; }
  closeHelp() { this.helpOpen = false; this.journalOpen = false; this.expeditionsOpen = false; this.cache = ''; }
  prepareLevel() { this.closeHelp(); this.focusedTarget = null; this.overviewMode = false; this.postcardSaved = false; this.savedSuccessfully = false; }
  focusTarget(id: TargetId | null) { this.focusedTarget = id; this.cache = ''; }

  private contributionList(contributions: Record<CompanionId, string[]>) {
    return `<div class="contribution-list">${COMPANIONS.filter(c => contributions[c.id].length).map(c => `<div><b>${icon(c.icon)} ${c.name}</b><span>${contributions[c.id].map(escape).join(' · ')}</span></div>`).join('')}</div>`;
  }

  private renderPuzzleControls(features: HTMLElement) {
    const s = this.game.state;
    const undo = `<button class="puzzle-undo" data-action="undo" aria-label="Undo last puzzle action" ${!this.game.canUndoPuzzle ? 'disabled' : ''}>${icon('undo')} Undo <kbd>Z</kbd></button>`;
    const tools = `<div class="puzzle-tools"><button class="puzzle-overview" data-action="overview" aria-label="View whole puzzle" aria-pressed="${this.overviewMode}" title="View whole puzzle">${icon('map')}</button>${undo}</div>`;
    if (s.rescued) {
      features.innerHTML = `<button class="puzzle-home" data-explore="camp">${icon('home')} Bring everyone home ${icon('arrow')}</button>`;
      return;
    }
    if (this.game.level.puzzle === 'seed-pods') {
      const pods = [{ id: 'podBerry' as const, name: 'Berry pod', symbol: 'berry' }, { id: 'podSun' as const, name: 'Sun pod', symbol: 'sun' }];
      const focus = this.focusedTarget === 'podBerry' || this.focusedTarget === 'podSun' ? this.focusedTarget : null;
      const index = focus === 'podSun' ? 1 : 0;
      features.innerHTML = `<div class="feature-heading"><span>Matching seed beds</span><b>${s.orchard.grown.filter(Boolean).length} / 2 grown</b></div>
        <div class="pod-buttons">${pods.map((pod, i) => `<button data-explore="${pod.id}" class="pod-choice ${i ? 'sun' : 'berry'} ${focus === pod.id ? 'focused' : ''}">${icon(s.orchard.grown[i] ? 'check' : pod.symbol)}<span>${pod.name}<small>${s.orchard.grown[i] ? 'Growing!' : s.orchard.watered[i] ? 'Watered · ready to Grow' : 'Find its matching bed'}</small></span></button>`).join('')}</div>
        ${focus && !s.orchard.grown[index] ? `<div class="stance-controls"><span>Stand beside the ${index ? 'sun' : 'berry'} pod</span><div>${(['north', 'east', 'south', 'west'] as const).map(side => `<button data-pod="${focus}" data-stance="${side}" aria-label="Stand ${side} of ${index ? 'sun' : 'berry'} pod" ${!this.game.getApproachPoint(focus, side) ? 'disabled' : ''}>${side.charAt(0).toUpperCase() + side.slice(1)}</button>`).join('')}</div></div>` : ''}
        <div class="puzzle-footer"><span>${s.orchard.pushes} ${s.orchard.pushes === 1 ? 'push' : 'pushes'} · one square at a time</span>${tools}</div>`;
    } else {
      const beam = this.game.getMoonbeamView();
      features.innerHTML = `<div class="feature-heading"><span>Follow the moonbeam</span><b>${s.moonbeam.powered ? 'Light is flowing' : 'Moonwell asleep'}</b></div>
        <div class="mirror-buttons"><button data-explore="source">${icon('drop')}<span>Moonwell</span></button>${(['mirrorA', 'mirrorB', 'mirrorC'] as const).map((id, i) => `<button data-explore="${id}" class="${this.focusedTarget === id ? 'focused' : ''}">${icon('mirror')}<span>${String.fromCharCode(65 + i)} <b>${s.moonbeam.mirrors[i] ? '╲' : '╱'}</b></span></button>`).join('')}</div>
        <div class="beam-status"><button data-explore="rootReceiver" class="${beam.rootLit ? 'lit' : ''}">${icon(s.moonbeam.rooted ? 'check' : 'flower')}<span>${s.moonbeam.rooted ? 'Path anchored' : beam.rootLit ? 'Roots lit · Grow now' : 'Roots need light'}</span></button><span class="${beam.exitLit ? 'lit' : ''}">${icon('lantern')}${beam.exitLit ? 'Exit lit' : 'Exit dark'}</span></div>
        <div class="puzzle-footer"><span>${s.moonbeam.rooted ? 'The path stays. Redirect the light.' : 'Light the roots before the exit.'}</span>${tools}</div>`;
    }
  }

  private puzzleGuide() {
    const orchard = this.game.level.puzzle === 'seed-pods';
    return `<section class="modal field-guide puzzle-guide"><span class="eyebrow">${orchard ? 'MAKE ROOM TO GROW' : 'BORROW THE MOONLIGHT'}</span><h2>${orchard ? 'Think one push ahead.' : 'The beam can move. The roots can stay.'}</h2>
      <div class="puzzle-guide-steps">${orchard ? `<p>${icon('push')} <b>Kibo pushes</b> a pod one square away from where the crew stands. Tap a pod, choose a standing side, then use Push. Hedges and the other pod block it.</p><p>${icon('drop')} <b>Bing waters</b> a pod only on its matching bed. Berry goes to berry; sun goes to sun.</p><p>${icon('flower')} <b>Pomodoro grows</b> each watered pod. Both growing beds open the trellis.</p><p>${icon('undo')} A corner is a chance to rethink: <b>Undo or Z</b> restores your last puzzle action. Sometimes a pod needs to move away from its bed first.</p>` : `<p>${icon('drop')} <b>Bing wakes the moonwell.</b> Its beam travels in straight lines.</p><p>${icon('mirror')} <b>Kibo turns the mirrors</b> ninety degrees. Watch the beam change direction. The receiver must be lit now, not just earlier.</p><p>${icon('flower')} <b>Pomodoro grows the lit roots</b> into a permanent path. After that, redirect the light through the far mirror to the exit lantern.</p><p>${icon('undo')} Experiment freely. Turn mirrors again or use <b>Undo / Z</b>. The rooted path survives when its light moves away.</p>`}</div>
      <button class="primary" data-action="resume">Back to the puzzle ${icon('arrow')}</button><button class="text-button" data-action="hint">A small hint</button></section>`;
  }

  private completedLabel(id: LevelId, keepsakes: number, ways: number) {
    return `${keepsakes} / 3 keepsakes · ${id === 'bramblebrook' ? `${ways} / 2 ways home` : 'Puzzle complete'}`;
  }

  private postcardMarkup() {
    const s = this.game.state; const level = this.game.level;
    const brook = level.puzzle === 'brook'; const orchard = level.puzzle === 'seed-pods';
    const count = s.keepsakes.filter(Boolean).length;
    const summary = brook ? `${routeName(s.returnRoute)} brought us home.` : orchard ? 'We made room for both seedlings.' : 'We gave the moonlight two jobs.';
    const stamp = brook ? s.returnRoute === 'ferry' ? 'boat' : 'bridge' : orchard ? 'berry' : 'mirror';
    const stat = brook ? `${Number(s.routesUsed.bridge) + Number(s.routesUsed.ferry)} / 2` : orchard ? String(s.orchard.pushes) : '2';
    return `<section class="modal postcard"><div class="postcard-top"><span class="eyebrow">A MEMORY FROM ${escape(level.name)}</span><span class="postage">${icon(stamp)}<small>LUNACIA</small></span></div><h2>Home. Together.</h2><p class="route-memory" data-return-route="${s.returnRoute}">${summary}</p>${this.contributionList(s.contributions)}
      <div class="memory-stats"><span><b>${count} / 3</b>keepsakes found</span><span><b>${stat}</b>${brook ? 'ways discovered' : orchard ? 'pod pushes' : 'receivers helped'}</span><span><b>${time(s.elapsed)}</b>on the trail</span></div>
      <p class="postcard-note">${orchard ? 'A little space, a little water, and room for everyone to grow.' : brook ? 'There’s another little story waiting along the trail.' : 'The roots kept the path, even when their light moved on.'}</p>
      ${level.nextId ? `<button class="primary" data-level-id="${level.nextId}" data-next-level="${level.nextId}">Next: ${escape(getLevel(level.nextId).name)} ${icon('arrow')}</button>` : `<button class="primary" data-action="expeditions">Visit our three islands ${icon('map')}</button>`}
      <div class="postcard-links"><button class="text-button" data-action="restart">${brook ? 'Try another way home' : 'Try this puzzle again'}</button><button class="text-button" data-action="journal">Companion memories</button></div><small class="saved-note">${this.savedSuccessfully ? 'Your crew’s contributions are saved in this browser.' : 'This browser could not save the postcard. Your rescue is complete.'}</small></section>`;
  }

  update() {
    const s = this.game.state;
    this.host.dataset.phase = s.phase;
    this.host.querySelector('#timer')!.textContent = time(s.elapsed);
    const stamp = [s.levelId, s.phase, s.active, s.logRolled, s.bridge, s.bloom, s.gate, s.leafGrown, s.leafLaunched, JSON.stringify(s.orchard), JSON.stringify(s.moonbeam), this.game.canUndoPuzzle, this.focusedTarget, s.rescued, s.talent, s.routesUsed.bridge, s.routesUsed.ferry, s.position.x > 0, s.transport?.phase, s.transport?.empty, s.ferrySide, ...s.keepsakes, s.message, this.game.getNearbyTarget(), this.helpOpen, this.journalOpen, this.expeditionsOpen].join('|');
    if (stamp === this.cache) return;
    this.cache = stamp;
    const level = this.game.level;
    const brook = level.puzzle === 'brook';
    this.host.dataset.puzzle = level.puzzle;
    this.host.dataset.level = level.id;
    this.host.querySelector('#chapter-label')!.innerHTML = `${escape(level.name)} <i></i> EXPEDITION ${String(level.number).padStart(2, '0')}`;
    this.host.querySelector('#chapter-title')!.textContent = level.title;
    this.host.querySelector('#chapter-subtitle')!.textContent = level.subtitle;
    this.host.querySelector('#intro-title')!.textContent = level.introTitle;
    this.host.querySelector('#intro-text')!.textContent = level.introText;
    this.host.querySelector<HTMLElement>('#intro')!.hidden = s.phase !== 'intro';
    this.host.querySelector('#objective')!.textContent = this.game.getObjective();
    const flags = [brook ? s.routesUsed.bridge || s.routesUsed.ferry : s.gate, s.rescued, s.phase === 'won'];
    flags.forEach((done, i) => {
      const el = this.host.querySelector<HTMLElement>(`[data-step="${i}"]`)!;
      el.classList.toggle('done', done); el.classList.toggle('current', !done && flags.slice(0, i).every(Boolean));
      el.querySelector('span')!.innerHTML = done ? icon('check') : String(i + 1);
      el.querySelector('b')!.textContent = i === 0 ? brook ? 'Find a way across' : level.puzzle === 'seed-pods' ? 'Plant both seed beds' : 'Anchor and redirect the light' : i === 1 ? 'Meet our friend' : 'Bring everyone home';
    });
    this.host.querySelector('#keepsakes')!.textContent = `${s.keepsakes.filter(Boolean).length} / 3`;
    this.host.querySelector('#bridge-note')!.textContent = s.bridge ? 'Rooted & ready' : s.logRolled ? 'It needs steadying…' : 'Something to build?';
    this.host.querySelector('#ferry-note')!.textContent = s.leafLaunched ? 'Ready at the dock' : s.leafGrown ? 'It could float…' : 'Something to grow?';
    const leafButton = this.host.querySelector<HTMLButtonElement>('[data-explore="leaf"], [data-explore="dockWest"], [data-explore="dockEast"]')!;
    leafButton.dataset.explore = s.leafLaunched ? (s.position.x > 0 ? 'dockEast' : 'dockWest') : 'leaf';
    this.host.querySelector<HTMLButtonElement>('[data-explore="camp"]')!.hidden = !s.rescued;
    this.host.querySelector<HTMLElement>('.route-notes')!.hidden = !brook;
    const features = this.host.querySelector<HTMLElement>('#feature-notes')!;
    features.hidden = brook;
    if (!brook) this.renderPuzzleControls(features);
    this.host.querySelector('#lesson-label')!.textContent = brook ? `${TALENTS.find(t => t.id === s.talent)!.partName} field lesson` : 'How this puzzle works';
    this.host.querySelector<HTMLElement>('.intro-lesson[data-action="help"]')!.innerHTML = `${brook ? 'Field lesson' : 'Puzzle guide'} ${icon('help')}`;
    this.host.querySelector<HTMLElement>('.intro-tips')!.hidden = !brook;
    for (const c of COMPANIONS) {
      const el = this.host.querySelector<HTMLButtonElement>(`[data-companion="${c.id}"]`)!;
      el.classList.toggle('selected', c.id === s.active); el.setAttribute('aria-pressed', String(c.id === s.active));
      el.disabled = !!s.transport;
    }
    this.host.querySelector('#message')!.textContent = s.message;
    const nearby = this.game.getNearbyTarget();
    this.host.querySelector<HTMLElement>('#interact')!.hidden = !nearby || s.phase !== 'playing' || !!s.transport;
    this.host.querySelector('#interact-label')!.textContent = nearby === 'camp' ? 'Bring everyone home' : nearby === 'traveler' ? 'Say hello' : nearby?.startsWith('mirror') && s.active === 'kibo' ? 'Turn mirror 90°' : `Try ${COMPANIONS.find(c => c.id === s.active)!.ability}`;
    this.host.querySelector<HTMLElement>('.hint-button')!.hidden = !!s.transport;
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-explore]')) button.disabled = !!s.transport;
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-action="expeditions"]')) button.disabled = !!s.transport;

    const modal = this.host.querySelector<HTMLElement>('#modal-layer')!;
    modal.hidden = s.phase !== 'paused' && s.phase !== 'won' && !this.helpOpen && !this.journalOpen && !this.expeditionsOpen;
    if ((s.phase === 'paused' || this.helpOpen) && !this.journalOpen && !this.expeditionsOpen) {
      const atCamp = s.phase === 'intro' || Math.hypot(s.position.x - this.game.targets.camp.x, s.position.z - this.game.targets.camp.z) <= 1.6;
      modal.innerHTML = this.helpOpen ? `<section class="modal field-guide"><span class="eyebrow">THE RESCUE HANDBOOK</span><h2>Try a little teamwork.</h2><p>Tap an object to walk over and inspect it. Choose an Axie, then tap <b>Try</b> or press <b>E</b>. Push, Grow, and Splash can each do more than one thing.</p><div class="guide-verbs">${COMPANIONS.map(c => `<span>${icon(c.icon)}<b>${c.name}</b>${c.ability}</span>`).join('')}</div><h3>Pomodoro’s field lesson</h3><p class="lesson-intro">Learn a rescue trick inspired by an Axie part. Change lessons at camp.</p><div class="lesson-options">${TALENTS.map(t => `<button data-talent="${t.id}" aria-pressed="${s.talent === t.id}" class="lesson-option ${s.talent === t.id ? 'selected' : ''}" ${!atCamp || s.transport ? 'disabled' : ''}><span>${icon(t.id === 'root' ? 'flower' : 'drop')}<b>${escape(t.partName)}</b>${s.talent === t.id ? icon('check') : ''}</span><small>${escape(t.description)}</small></button>`).join('')}</div><p class="part-note">These are Rescue Club lessons, inspired by real Plant parts—not changes to our mascots’ genes. <a href="${TALENTS.find(t => t.id === s.talent)!.source}" target="_blank" rel="noopener noreferrer">View the part catalogue ${icon('arrow')}</a></p>${!atCamp ? '<p class="camp-reminder">Head back to the tent to change your lesson.</p>' : ''}<button class="primary" data-action="resume">Back to the adventure ${icon('arrow')}</button><button class="text-button" data-action="hint">I’d like a small hint</button></section>`
      : `<section class="modal paper"><span class="eyebrow">A MOMENT TO BREATHE</span><h2>The trail can wait.</h2><p>Your companions are taking a little rest.<br>Everything will be here when you’re ready.</p><button class="primary" data-action="resume">Back to the adventure ${icon('arrow')}</button><button class="text-button" data-action="expeditions" ${s.transport ? 'disabled' : ''}>Choose another island</button><button class="text-button" data-action="resetPaths">${brook ? 'Reset constructions at camp' : 'Reset puzzle at camp'}</button><button class="text-button" data-action="restart">Start this expedition again</button></section>`;
    }
    if (this.helpOpen && !brook && !this.journalOpen && !this.expeditionsOpen) modal.innerHTML = this.puzzleGuide();
    if (s.phase === 'won' && !this.journalOpen && !this.expeditionsOpen) {
      if (!this.postcardSaved) {
        const result = saveExpedition(s); this.savedSuccessfully = result.saved;
        this.campSummary = getCampSummary(result.memories); this.postcardSaved = true;
      }
      modal.innerHTML = this.postcardMarkup();
    } else if (s.phase === 'playing') this.postcardSaved = false;
    if (this.journalOpen) {
      const memories = readMemories().reverse(); const summary = getCampSummary(memories);
      modal.innerHTML = `<section class="modal journal"><span class="eyebrow">THE RESCUE CLUB JOURNAL</span><h2>Every helping paw matters.</h2><div class="crew-history">${COMPANIONS.map(c => `<div>${icon(c.icon)}<b>${c.name}</b><span>${summary.contributionCounts[c.id]} helping ${summary.contributionCounts[c.id] === 1 ? 'moment' : 'moments'}</span></div>`).join('')}</div>${memories.length ? `<div class="journal-entries">${memories.map(m => `<article class="memory-entry"><div class="memory-entry-title"><span class="memory-island">${escape(getLevel(m.levelId).name)}${m.puzzleRevision < getLevel(m.levelId).puzzleRevision ? ' · Earlier adventure' : ''}</span><b>${routeName(m.route)}</b><small>${new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${m.keepsakes}/3 keepsakes</small></div>${this.contributionList(m.contributions)}</article>`).join('')}</div><p>Your latest ${memories.length} ${memories.length === 1 ? 'expedition' : 'expeditions'}, kept in this browser.</p>` : '<p>Your first page is waiting. Bring our friend home to earn a rescue memory.</p>'}<button class="primary" data-action="resume">Back to the adventure ${icon('arrow')}</button></section>`;
    }
    if (this.expeditionsOpen) {
      const progress = getExpeditionProgress();
      const completed = LEVELS.filter(island => progress[island.id].completed).length;
      modal.innerHTML = `<section class="modal expedition-book"><span class="eyebrow">THE RESCUE CLUB ATLAS</span><h2>Small islands.<br>Big little adventures.</h2><p class="atlas-summary">${completed} / 3 islands helped · Nine keepsakes to discover</p><div class="expedition-list">${LEVELS.map(island => {
        const record = progress[island.id];
        return `<button class="expedition-card ${island.theme} ${island.id === s.levelId ? 'current' : ''}" data-level-id="${island.id}" aria-label="Explore ${island.name}" ${!this.loaded ? 'disabled' : ''}><span class="island-emblem">${icon(island.theme === 'brook' ? 'bridge' : island.theme === 'orchard' ? 'flower' : 'lantern')}<small>${String(island.number).padStart(2, '0')}</small></span><span class="expedition-copy"><span class="expedition-name">${escape(island.name)}${record.completed ? icon('check') : ''}</span><span class="expedition-description">${escape(island.description)}</span><span class="expedition-status">${record.completed ? this.completedLabel(island.id, record.bestKeepsakes, record.routes.length) : island.id === s.levelId ? 'Current expedition' : 'A new story awaits'}</span></span>${icon('arrow')}</button>`;
      }).join('')}</div><p class="atlas-note">Choose an island to start a fresh expedition. Your saved postcards stay with the club.</p><button class="text-button atlas-close" data-action="resume">Back to the adventure</button></section>`;
    }
    if (this.loaded) this.host.classList.add('ready');
  }
  dispose() { this.listeners.abort(); this.host.innerHTML = ''; }
}
