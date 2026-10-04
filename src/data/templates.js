/**
 * Pro stack templates. Same shape as STARTER_STACKS.
 * Every id is a real node in src/data (constellation arrays, including wave2
 * rows those arrays concat). Neutral labels — not protocols or health claims.
 */

export const PRO_TEMPLATES = [
  {
    id: 'desk-day',
    name: 'Desk day',
    blurb: 'Light, posture, and short movement breaks for a seated day.',
    items: [
      { id: 'morninglight', constellation: 'habits', slot: 'morning' },
      { id: 'midday-sun', constellation: 'habits' },
      { id: 'posture', constellation: 'habits' },
      { id: 'standing', constellation: 'habits' },
      { id: 'walkingmeet', constellation: 'habits' },
      { id: 'postmeal-walk', constellation: 'habits' },
      { id: '10ksteps', constellation: 'habits' }
    ]
  },
  {
    id: 'training-day',
    name: 'Training day',
    blurb: 'Lift, easy cardio, mobility, and a protein anchor.',
    items: [
      { id: 'lift3x', constellation: 'exercises' },
      { id: 'farmer-carry', constellation: 'exercises' },
      { id: 'zone2_base', constellation: 'exercises' },
      { id: 'mobility_15', constellation: 'exercises', slot: 'evening' },
      { id: 'protein150', constellation: 'habits' },
      { id: 'creatine', constellation: 'supplements', slot: 'morning' },
      { id: 'sleep8', constellation: 'habits', slot: 'evening' }
    ]
  },
  {
    id: 'rest-day',
    name: 'Rest day',
    blurb: 'Sleep, easy movement, and a quieter day.',
    items: [
      { id: 'deload', constellation: 'exercises' },
      { id: 'active_recov', constellation: 'exercises' },
      { id: 'yoga_mobility', constellation: 'exercises' },
      { id: 'breathwork', constellation: 'habits' },
      { id: 'meditate20', constellation: 'habits' },
      { id: 'sleep8', constellation: 'habits', slot: 'evening' },
      { id: 'eveningwind', constellation: 'habits', slot: 'evening' },
      { id: 'magnesium', constellation: 'supplements', slot: 'evening' }
    ]
  },
  {
    id: 'travel-week',
    name: 'Travel week',
    blurb: 'Light, steps, and sleep timing while your schedule moves.',
    items: [
      { id: 'morninglight', constellation: 'habits', slot: 'morning' },
      { id: 'phone-delay-am', constellation: 'habits', slot: 'morning' },
      { id: '10ksteps', constellation: 'habits' },
      { id: 'zone2_ruck', constellation: 'exercises' },
      { id: 'mobility_15', constellation: 'exercises' },
      { id: 'nasal-breathe', constellation: 'habits' },
      { id: 'dehydration', constellation: 'habits' },
      { id: 'sleep8', constellation: 'habits', slot: 'evening' }
    ]
  },
  {
    id: 'plate-basics',
    name: 'Plate basics',
    blurb: 'A small set of foods to cook from.',
    items: [
      { id: 'eggs', constellation: 'foods', slot: 'morning' },
      { id: 'oats', constellation: 'foods', slot: 'morning' },
      { id: 'yogurt', constellation: 'foods' },
      { id: 'broccoli', constellation: 'foods' },
      { id: 'lentils', constellation: 'foods' },
      { id: 'olive-oil', constellation: 'foods' },
      { id: 'salmon', constellation: 'foods' },
      { id: 'blueberries', constellation: 'foods' }
    ]
  },
  {
    id: 'annual-labs',
    name: 'Annual labs',
    blurb: 'Markers to look up once a year. Not a diagnosis.',
    items: [
      { id: 'apob', constellation: 'biomarkers' },
      { id: 'ldl_c', constellation: 'biomarkers' },
      { id: 'hba1c', constellation: 'biomarkers' },
      { id: 'fasting_glucose', constellation: 'biomarkers' },
      { id: 'hs_crp', constellation: 'biomarkers' },
      { id: 'vit_d', constellation: 'biomarkers' },
      { id: 'ferritin', constellation: 'biomarkers' },
      { id: 'tsh', constellation: 'biomarkers' },
      { id: 'omega3_index', constellation: 'biomarkers' },
      { id: 'creatinine_egfr', constellation: 'biomarkers' },
      { id: 'alt', constellation: 'biomarkers' },
      { id: 'hemoglobin', constellation: 'biomarkers' }
    ]
  }
];
