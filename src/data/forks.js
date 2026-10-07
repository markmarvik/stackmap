/**
 * One run of 12 forks. Later forks are rows here, not new systems.
 * Choice A is the filmed path. A scene plays only when `beats` is present.
 * Forks 5–12 are the paid branch. Fork 12 is a report, not a new organ.
 */

export const RUN_PRICE_LABEL = 'See the other body — $7';
export const RUN_UNLOCK_KEY = 'stackmap-run-unlock';

export const FORKS = [
  {
    id: 1,
    title: 'First night out',
    organ: 'liver',
    organLabel: 'Liver',
    paid: false,
    claim: 'What happens when a first heavy night puts an alcohol load on the liver.',
    choices: [
      { id: 'A', label: 'A drink', film: true },
      { id: 'B', label: 'One sip', skip: 'One sip. The heavy night does not happen, so that alcohol load does not land.' },
      { id: 'C', label: 'Leave', skip: 'You leave. The heavy night does not happen, so that alcohol load does not land.' }
    ],
    beats: [
      {
        id: 'pov',
        kicker: 'POV',
        frame: 'pov',
        line: 'The glass goes back. The night does not stop at one.'
      },
      {
        id: 'body',
        kicker: 'Body',
        frame: 'body',
        line: 'Same person, later. The drink is still in the body.'
      },
      {
        id: 'organ',
        kicker: 'Liver',
        frame: 'liver',
        line: 'The liver processes that first heavy load. Not an injury label. Not a diagnosis.'
      },
      {
        id: 'after',
        kicker: 'After',
        frame: 'after',
        line: 'The next day can feel dull. That is the after-effect of the load.'
      }
    ]
  },
  {
    id: 2,
    title: 'Food week',
    organ: 'gut',
    organLabel: 'Gut',
    paid: false,
    claim: 'What happens when cheap meals repeat: a modest load on the gut. Not a disease label.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Cheap meals', film: true },
      { id: 'B', label: 'Mix', skip: 'A mix. The straight week of cheap meals does not happen.' },
      { id: 'C', label: 'Cooked', skip: 'Cooked food. The straight week of cheap meals does not happen.' }
    ]
  },
  {
    id: 3,
    title: 'Deadline',
    organ: 'brain',
    organLabel: 'Brain',
    paid: false,
    claim: 'What happens when one night is missed: next-day fog. Not brain damage.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'All-nighter', film: true },
      { id: 'B', label: 'Late', skip: 'A late night. The all-nighter does not happen.' },
      { id: 'C', label: 'Sleep', skip: 'You sleep. The missed night does not happen.' }
    ]
  },
  {
    id: 4,
    title: 'Cans',
    organ: 'heart',
    organLabel: 'Heart',
    paid: false,
    claim: 'What happens when energy drinks stack: stimulant load and a faster rate. Not a cardiac event.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Energy drinks', film: true },
      { id: 'B', label: 'Coffee', skip: 'Coffee. The energy-drink stack does not happen.' },
      { id: 'C', label: 'Water', skip: 'Water. The stimulant stack does not happen.' }
    ]
  },
  {
    id: 5,
    title: 'Offered smoke',
    organ: 'lungs',
    organLabel: 'Lungs / vessels',
    paid: true,
    claim: 'What happens when a cigarette is smoked: smoke meets the lungs and the vessels answer. Not a disease label.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Cigarette', film: true },
      { id: 'B', label: 'Hold it', skip: 'You hold it. The smoke does not get inhaled.' },
      { id: 'C', label: 'Refuse', skip: 'You refuse. The cigarette does not happen.' }
    ]
  },
  {
    id: 6,
    title: 'Stairs or seat',
    organ: 'muscle',
    organLabel: 'Muscle',
    paid: true,
    claim: 'What happens when the stairs are skipped. Not a transformation.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Skip', film: true },
      { id: 'B', label: 'Short walk', skip: 'A short walk. The skipped stairs do not happen.' },
      { id: 'C', label: 'Train', skip: 'You train. The skipped effort does not happen.' }
    ]
  },
  {
    id: 7,
    title: 'Creatine week',
    organ: 'muscle',
    organLabel: 'Muscle water',
    paid: true,
    claim: 'What happens across a creatine week: muscle water only. Not a strength promise.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Skip', film: true },
      { id: 'B', label: 'Random scoop', skip: 'A random scoop. The skipped week does not run clean.' },
      { id: 'C', label: 'Daily with training', skip: 'Daily, with training. The skip does not happen.' }
    ]
  },
  {
    id: 8,
    title: 'Hot dogs and cola streak',
    organ: 'liver',
    organLabel: 'Liver fat / glucose',
    paid: true,
    claim: 'What happens when hot dogs and cola keep going: a modest liver-fat and glucose spike. Not a disease label.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Keep', film: true },
      { id: 'B', label: 'Once', skip: 'Once. The streak does not keep going.' },
      { id: 'C', label: 'Stop', skip: 'You stop. The streak does not happen.' }
    ]
  },
  {
    id: 9,
    title: 'Chest feels off',
    organ: 'heart',
    organLabel: 'Heart',
    paid: true,
    claim: 'What happens when a chest feeling is ignored, rested, or taken to a doctor. Not a diagnosis.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Ignore', film: true },
      { id: 'B', label: 'Rest', skip: 'You rest. Ignoring it does not happen.' },
      { id: 'C', label: 'Doctor', skip: 'You see a doctor. Ignoring it does not happen.' }
    ]
  },
  {
    id: 10,
    title: 'Second shift',
    organ: 'brain',
    organLabel: 'Brain / sleep debt',
    paid: true,
    claim: 'What happens when night shifts stack: sleep debt. Not brain damage.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Nights', film: true },
      { id: 'B', label: 'A few', skip: 'A few nights. The full second shift does not stack.' },
      { id: 'C', label: 'Refuse', skip: 'You refuse. The night shift does not happen.' }
    ]
  },
  {
    id: 11,
    title: 'Pull',
    organ: 'liver',
    organLabel: 'Liver',
    paid: true,
    claim: 'What happens when a pull turns into a binge. Habit is a label, not a moral.',
    stubLine: 'Not filmed in this cut.',
    choices: [
      { id: 'A', label: 'Binge', film: true },
      { id: 'B', label: 'Less', skip: 'Less. The binge does not happen.' },
      { id: 'C', label: 'Stop', skip: 'You stop. The binge does not happen.' }
    ]
  },
  {
    id: 12,
    title: 'Report',
    organ: null,
    organLabel: null,
    paid: true,
    kind: 'report',
    claim: 'Side-by-side of the forks already shown. No new organ.',
    choices: [
      { id: 'A', label: 'Worse body' },
      { id: 'B', label: 'Other body' }
    ]
  }
];

export function parseRunId(pathname, base = '/') {
  const basePath = String(base || '/').replace(/\/$/, '');
  let path = pathname || '/';
  if (basePath && path.startsWith(basePath)) {
    path = path.slice(basePath.length) || '/';
  }
  if (!path.startsWith('/')) path = `/${path}`;
  const match = path.match(/^\/run\/(\d+)\/?$/);
  if (!match) return null;
  return Number(match[1]);
}

export function runHref(id, base = '/') {
  const basePath = String(base || '/').replace(/\/$/, '');
  return `${basePath}/run/${id}`;
}

export function getFork(id) {
  return FORKS.find((fork) => fork.id === id) || null;
}

export function nextForkId(id) {
  const next = getFork(Number(id) + 1);
  return next ? next.id : null;
}

/**
 * A plays a scene only when beats exist. B and C skip.
 * Unfilmed A is a stub. Fork 12 is the report.
 */
export function resolveChoice(fork, choiceId) {
  if (!fork) return null;
  const choice = fork.choices.find((item) => item.id === choiceId);
  if (!choice) return null;
  if (fork.kind === 'report') return { type: 'report', choice };
  if (choice.id === 'A') {
    if (Array.isArray(fork.beats) && fork.beats.length) {
      return { type: 'scene', choice, beats: fork.beats };
    }
    return { type: 'stub', choice, line: fork.stubLine || 'Not filmed in this cut.' };
  }
  return { type: 'skip', choice, line: choice.skip || '' };
}

/** Forks already shown, as the two endings. No new organ. */
export function reportColumns() {
  return FORKS.filter((fork) => fork.kind !== 'report').map((fork) => {
    const worse = fork.choices.find((choice) => choice.id === 'A');
    const other = fork.choices.find((choice) => choice.id === 'C')
      || fork.choices.find((choice) => choice.id === 'B');
    return {
      id: fork.id,
      title: fork.title,
      worse: worse ? worse.label : '',
      other: other ? other.label : ''
    };
  });
}
