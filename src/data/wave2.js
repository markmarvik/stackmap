/**
 * v0.3.9 additions. Educational framing only.
 * Studies here are orientation notes, not citations of a specific trial.
 */

const note = (finding) => [{ year: 2024, finding, source: 'Educational summary' }];

export function withEducationalStudy(node) {
  if (!node || (node.studies && node.studies.length)) return node;
  const mech = (node.mechanisms || [])
    .slice(0, 2)
    .map((m) => String(m).replace(/_/g, ' '))
    .filter(Boolean);
  if (!mech.length) return node;
  return {
    ...node,
    studies: note(`${mech.join('; ')}. A map note, not a personal prescription.`)
  };
}

export const SUPPLEMENT_WAVE = [
  {
    id: 'potassium-citrate', name: 'Potassium (citrate)', short: 'POTASSIUM', cat: 'foundational',
    longevity: 80, qol: 78, vitality: 80, diseases: 6, organs: ['heart', 'muscle', 'kidney'], evidence: '4/5',
    blurb: 'Most people are short on dietary potassium relative to sodium. Citrate is a common supplemental form used when food intake stays low.',
    mechanisms: ['Supports normal blood pressure alongside sodium balance', 'Muscle and nerve signaling', 'Citrate alkali load'],
    studies: note('Blood pressure findings are clearest from food potassium. Supplements are a gap-fill, and kidney disease changes the safety math.'),
    dosage: 'Often 200–400 mg elemental from a supplement, on top of food. Do not chase gram doses without a clinician if kidneys or pressure meds are in play.',
    timing: 'With meals, split if the dose is large.',
    bestForms: 'Citrate or bicarbonate for the alkali effect. Food (beans, potatoes, fruit) still does more of the work.',
    risks: 'High supplemental potassium can be dangerous when kidneys do not clear it, or with certain blood-pressure drugs.',
    highDoseRisks: 'Hyperkalemia is the real ceiling: weakness, palpitations, and worse. This is not a “more is better” mineral.',
    synergies: ['magnesium', 'omega3'],
    gorkipedia: 'Potassium is a diet story first. A modest citrate supplement is a tool when intake is low, not a substitute for food or a blood-pressure prescription.',
    url: 'https://ods.od.nih.gov/factsheets/Potassium-HealthProfessional/'
  },
  {
    id: 'methylfolate', name: 'Methylfolate (5-MTHF)', short: 'FOLATE', cat: 'foundational',
    longevity: 74, qol: 72, vitality: 74, diseases: 4, organs: ['brain', 'heart', 'blood'], evidence: '4/5',
    blurb: 'The circulating form of folate. Useful when diet is low, or when someone already knows they do poorly with folic acid.',
    mechanisms: ['One-carbon metabolism', 'Homocysteine handling with B12', 'Nucleotide synthesis'],
    studies: note('Folate status matters for red cells and for homocysteine. Dose should follow a level, not a forum protocol.'),
    dosage: '400 mcg DFE is the usual adult reference intake. Supplemental methylfolate is often 400–1000 mcg.',
    timing: 'Morning with food.',
    bestForms: 'L-5-MTHF (as calcium or glucosamine salt). Pair with B12 so folate does not mask a B12 problem.',
    risks: 'High folate with untreated B12 deficiency can hide the blood picture while nerves still suffer.',
    highDoseRisks: 'Multi-milligram doses are a medical tool, not a daily longevity default.',
    synergies: ['bcomplex', 'tmg'],
    gorkipedia: 'Methylfolate skips a conversion step. It is still a B vitamin: replete the gap, then stop escalating.',
    url: 'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/'
  },
  {
    id: 'methylb12', name: 'Methylcobalamin (B12)', short: 'B12', cat: 'foundational',
    longevity: 78, qol: 76, vitality: 78, diseases: 5, organs: ['brain', 'nerves', 'blood'], evidence: '5/5',
    blurb: 'The vitamin most likely to run low in people who eat little or no animal food, or who take acid-suppressing drugs long term.',
    mechanisms: ['Myelin and red-cell production', 'Cofactor with folate', 'Homocysteine remethylation'],
    studies: note('Deficiency is common enough to test. Nerve symptoms can show up before anemia does.'),
    dosage: '250–1000 mcg oral is a typical repletion range. Injections are a clinical decision when absorption is the problem.',
    timing: 'Morning. Sublingual if swallowing a large tablet is the only option you tolerate.',
    bestForms: 'Methylcobalamin or hydroxocobalamin. Cyanocobalamin also works for many people and is stable.',
    risks: 'Very safe at usual doses. Treating B12 without checking folate, or the reverse, leaves half the pathway untouched.',
    synergies: ['methylfolate', 'bcomplex'],
    gorkipedia: 'If you are vegan, older, or on a PPI or metformin, a B12 level (or methylmalonic acid) tells you more than another capsule.',
    url: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/'
  },
  {
    id: 'psyllium', name: 'Psyllium husk', short: 'PSYLLIUM', cat: 'gut',
    longevity: 79, qol: 77, vitality: 79, diseases: 5, organs: ['gut', 'heart', 'metabolic'], evidence: '4/5',
    blurb: 'A gel-forming fiber. The practical version of “eat more fiber” when meals are not getting there.',
    mechanisms: ['Soluble fiber binds bile acids', 'Slows carbohydrate absorption', 'Stool bulk'],
    studies: note('Viscous fiber has relatively consistent LDL and regularity data among fiber supplements. Water is part of the dose.'),
    dosage: '5 g once daily, building toward 10 g split, each dose in a full glass of water.',
    timing: 'Away from medicines by a couple of hours so it does not carry them through.',
    bestForms: 'Plain husk or powder. Flavored versions often add sugar or sweeteners you may not want.',
    risks: 'Taken dry, or without water, it can swell and obstruct. Start low if you bloat easily.',
    highDoseRisks: 'Large sudden jumps cause gas and cramping. People with swallowing trouble should skip bulk fiber.',
    synergies: ['magnesium', 'prebiotic'],
    gorkipedia: 'Psyllium is closer to a food than a drug. The failure mode is technique: not enough water.',
    url: 'https://ods.od.nih.gov/factsheets/Fiber-HealthProfessional/'
  },
  {
    id: 'saffron', name: 'Saffron extract (affron and similar)', short: 'SAFFRON', cat: 'neuro',
    longevity: 70, qol: 80, vitality: 73, diseases: 3, organs: ['brain'], evidence: '3/5',
    blurb: 'A culinary stigma used as a standardized extract in mood and sleep studies. Effects, when present, are modest.',
    mechanisms: ['Serotonin reuptake influence in preclinical work', 'Antioxidant crocins', 'Subjective mood and sleep scores in small trials'],
    studies: note('Human trials are small and mostly industry-adjacent. Treat it as an experiment with a defined stop date, not a replacement for care.'),
    dosage: '28–30 mg standardized extract is the dose used in several mood trials.',
    timing: 'Morning, or evening if you are using it for sleep quality.',
    bestForms: 'Extract standardized for crocins / safranal (affron is one studied brand). Kitchen saffron threads are a different, smaller dose.',
    risks: 'Culinary amounts are food. Concentrated extracts can interact with serotonergic drugs.',
    highDoseRisks: 'Gram doses of the spice are toxic. Stay at extract-label doses.',
    synergies: ['ltheanine', 'magnesium'],
    gorkipedia: 'Saffron is one of the better-studied spice extracts for mood, and still a small evidence base. Stop if it does nothing after a month.',
    url: 'https://examine.com/supplements/saffron/'
  },
  {
    id: 'pea', name: 'Palmitoylethanolamide (PEA)', short: 'PEA', cat: 'joints',
    longevity: 68, qol: 76, vitality: 71, diseases: 3, organs: ['nerves', 'joints', 'brain'], evidence: '3/5',
    blurb: 'A fatty acid amide your tissues already make. Supplemental PEA is used for stubborn pain and mast-cell style reactivity, with mixed trial quality.',
    mechanisms: ['PPAR-alpha signaling', 'Endocannabinoid-adjacent tone', 'Microglia calming in preclinical models'],
    studies: note('Some pain trials are positive and some are small. It is not an anti-inflammatory drug and should not delay a diagnosis.'),
    dosage: '300–600 mg twice daily of micronized or ultramicronized PEA in the trials people quote.',
    timing: 'With food, split morning and evening.',
    bestForms: 'Micronized (m-PEA) or Levagen-style forms absorb better than coarse powder.',
    risks: 'Generally well tolerated. “Natural painkiller” marketing oversells the effect size.',
    synergies: ['omega3', 'curcumin'],
    gorkipedia: 'PEA is worth a time-boxed trial for nerve or joint discomfort after the obvious causes are checked. Track a number (pain days, sleep) so you know if it worked.',
    url: 'https://examine.com/supplements/palmitoylethanolamide/'
  },
  {
    id: 'tudca', name: 'TUDCA', short: 'TUDCA', cat: 'foundational',
    longevity: 66, qol: 70, vitality: 67, diseases: 3, organs: ['liver', 'gut'], evidence: '3/5',
    blurb: 'A bile acid used clinically in some cholestatic diseases. Over-the-counter use for “liver support” is a much thinner evidence story.',
    mechanisms: ['Bile flow', 'Endoplasmic reticulum stress in cell studies', 'Cell-stress signaling studied at pharmacological doses'],
    studies: note('Prescription bile acids have real indications. A healthy person taking TUDCA “for longevity” is extrapolating.'),
    dosage: '250–500 mg daily is the common supplement range. Clinical doses for disease are a different conversation.',
    timing: 'With a meal that contains fat.',
    bestForms: 'Tauroursodeoxycholic acid, not a vague “ox bile” blend, if TUDCA is actually what you want.',
    risks: 'Diarrhea and GI upset. People with bile-duct obstruction need a clinician, not a capsule.',
    highDoseRisks: 'Do not stack it with oral steroids or untested “research” compounds and call the combination liver protection.',
    synergies: ['glycine'],
    gorkipedia: 'If your reason is an elevated liver enzyme, the next step is a cause, not a bile-acid supplement.',
    url: 'https://examine.com/supplements/tudca/'
  },
  {
    id: 's-boulardii', name: 'Saccharomyces boulardii', short: 'BOULARDII', cat: 'gut',
    longevity: 72, qol: 74, vitality: 73, diseases: 4, organs: ['gut', 'immune'], evidence: '4/5',
    blurb: 'A yeast probiotic with the clearest use around antibiotic courses and some infectious diarrheas. It is not a permanent microbiome transplant.',
    mechanisms: ['Competes in the gut lumen', 'Secretory diarrhea pathways', 'Does not colonize long term'],
    studies: note('Evidence is indication-specific. Daily use “for immunity” is weaker than short use alongside an antibiotic.'),
    dosage: '5–10 billion CFU daily for the days you are on an antibiotic, continued a few days after.',
    timing: 'Separated from the antibiotic dose by a couple of hours. Yeast is not killed by antibacterial drugs, but timing still helps.',
    bestForms: 'CNCM I-745 is the strain behind much of the clinical work. Refrigeration depends on the brand.',
    risks: 'Fungemia is rare and serious in people with central lines or deep immunosuppression. Skip it in that setting unless a team says otherwise.',
    synergies: ['probiotic'],
    gorkipedia: 'Use it like a tool with a start and a stop. If bowels are fine, you do not need a permanent yeast.',
    url: 'https://examine.com/supplements/saccharomyces-boulardii/'
  },
  {
    id: 'mixed-toco', name: 'Mixed tocopherols (low dose)', short: 'VITAMIN E', cat: 'foundational',
    longevity: 64, qol: 66, vitality: 64, diseases: 3, organs: ['heart', 'cell_membranes'], evidence: '3/5',
    blurb: 'A small mixed-tocopherol dose is a different product from the high-dose alpha-tocopherol trials that disappointed. Food still covers most people.',
    mechanisms: ['Lipid-phase antioxidant', 'Gamma and delta tocopherols are not the same molecule as high-dose alpha', 'Works with vitamin C in the antioxidant network'],
    studies: note('High-dose alpha-tocopherol did not show a heart-disease benefit and sometimes looked worse. This card is the low-dose mixed form, not that trial.'),
    dosage: '15 mg (about 22 IU) of mixed tocopherols is in the neighborhood of the adult requirement. Do not copy 400 IU alpha protocols.',
    timing: 'With a fat-containing meal.',
    bestForms: 'Mixed tocopherols and tocotrienols from food (nuts, seeds, olive oil) or a low-dose mixed supplement.',
    risks: 'High-dose alpha can interfere with vitamin K and with the mixed forms. Bleeding risk rises if you already take anticoagulants.',
    highDoseRisks: 'See the separate high-dose vitamin E warning node. This entry is specifically not that dose.',
    synergies: ['vitc', 'omega3'],
    gorkipedia: 'Vitamin E is a family. The pill that made headlines was one member at a high dose. Nuts and oil are the default.',
    url: 'https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/'
  },
  {
    id: 'iodine-low', name: 'Iodine (low dose)', short: 'IODINE', cat: 'foundational',
    longevity: 70, qol: 68, vitality: 70, diseases: 4, organs: ['thyroid'], evidence: '4/5',
    blurb: 'Essential, and easy to overshoot. This card is the microgram range from iodized salt or a modest supplement, not kelp megadoses.',
    mechanisms: ['Thyroid hormone synthesis', 'Both deficiency and excess disturb the gland'],
    studies: note('The adult requirement is 150 mcg. People with autoimmune thyroid disease are the group most likely to feel an excess.'),
    dosage: '150 mcg/day total from salt, dairy, seafood, and supplements combined is the reference point for most adults.',
    timing: 'With food. Count what is already in your multivitamin before adding a second iodine pill.',
    bestForms: 'Iodized salt or potassium iodide at labeled microgram doses. Kelp is an unpredictable dose.',
    risks: 'Excess can trigger or worsen thyroid dysfunction. Pregnancy has a specific higher need that should be planned, not guessed from a forum.',
    highDoseRisks: 'Milligram Lugol’s protocols are the failure mode. See the high-iodine warning node.',
    synergies: ['selenium'],
    gorkipedia: 'Iodine has a U-shaped curve. Hit the requirement. Do not “support the thyroid” with drops.',
    url: 'https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/'
  },
  {
    id: 'lactoferrin', name: 'Lactoferrin', short: 'LACTOFERRIN', cat: 'immune',
    longevity: 67, qol: 72, vitality: 69, diseases: 3, organs: ['immune', 'gut', 'iron'], evidence: '3/5',
    blurb: 'An iron-binding milk protein. Studied for iron handling and gut barrier more than for general “immunity.”',
    mechanisms: ['Binds iron and limits bacterial access to it', 'Innate immune signaling', 'May improve iron studies without as much gut upset as some iron salts'],
    studies: note('Trials exist for iron deficiency and for infant formula. Healthy-adult immune claims are ahead of the data.'),
    dosage: '200–400 mg daily in the studies people usually cite.',
    timing: 'Away from calcium-heavy meals if the goal is iron-related. Otherwise with food is fine.',
    bestForms: 'Apolactoferrin (less iron-saturated) versus native. Say which one the label is.',
    risks: 'Dairy allergy applies. It is not a treatment for diagnosed iron deficiency on its own.',
    synergies: ['colostrum'],
    gorkipedia: 'Interesting protein, narrow evidence. If ferritin is the question, measure it before and after rather than stacking iron plus lactoferrin by feel.',
    url: 'https://examine.com/supplements/lactoferrin/'
  },
  {
    id: 'tart-cherry', name: 'Tart cherry', short: 'TART CHERRY', cat: 'mito',
    longevity: 69, qol: 77, vitality: 72, diseases: 3, organs: ['muscle', 'sleep', 'joints'], evidence: '3/5',
    blurb: 'Montmorency cherry juice or extract. The interesting human data is sleep quality and next-day soreness, not a longevity multiplier.',
    mechanisms: ['Melatonin and polyphenols in the fruit', 'Urate handling in some gout-adjacent work', 'Perceived recovery after hard training'],
    studies: note('Juice trials are small. Sugar load in juice is part of the product. Extract avoids some of that.'),
    dosage: 'About 240–480 ml of tart cherry juice, or an extract that states cherry equivalents. Not “cherry flavored.”',
    timing: 'Evening if sleep is the target. Around hard sessions if soreness is the target.',
    bestForms: 'Montmorency juice or a standardized powder. Sweet eating cherries are a different food.',
    risks: 'Juice is a sugar hit. People watching glucose should prefer a capsule or a small serving.',
    synergies: ['magnesium', 'glycine'],
    gorkipedia: 'A food-first sleep and recovery aid. If it does not change your sleep diary in two weeks, it is just calories.',
    url: 'https://examine.com/supplements/tart-cherry/'
  }
];

export const HABIT_WAVE = [
  {
    id: 'fiber30', name: '30 g fiber most days', short: '30G FIBER', cat: 'nutrition',
    vitality: 84, qol: 80, diseases: 6, organs: ['gut', 'heart', 'metabolic'], evidence: '4/5',
    blurb: 'A concrete fiber target. Beans, oats, fruit, vegetables, and a psyllium top-up if the plate is short.',
    mechanisms: ['Stool bulk and regularity', 'LDL via bile-acid binding', 'Fermentation to short-chain fatty acids'],
    studies: note('Population data links higher fiber intake with lower cardiometabolic risk. The gram target is a habit, not a prescription.'),
    dosage: 'Build from your current intake by about 5 g a week so gas does not win.',
    timing: 'Spread across meals. Water alongside.',
    synergies: ['psyllium', '10ksteps'],
    gorkipedia: 'Fiber is a low-cost habit discussed for both gut and heart patterns. Track one day a week until 30 g is normal.',
    risks: 'A sudden jump feels like food poisoning. Go slower if you have an active GI disease.'
  },
  {
    id: 'postmeal-walk', name: '10-minute walk after meals', short: 'MEAL WALK', cat: 'movement',
    vitality: 82, qol: 84, diseases: 5, organs: ['metabolic', 'heart', 'muscle'], evidence: '4/5',
    blurb: 'A short walk while the meal is landing. Often moves glucose and how you feel more than an extra supplement.',
    mechanisms: ['Muscle uptake of glucose', 'Breaks up sitting', 'Low-friction daily movement'],
    studies: note('Post-meal walking studies are small but directionally consistent for glucose excursions.'),
    dosage: '10 minutes after the largest meal. Two meals is better than a perfect streak you abandon.',
    timing: 'Within 30 minutes of eating.',
    synergies: ['10ksteps', 'zone2'],
    gorkipedia: 'This is zone-easy, not a workout. Shoes by the door beat a plan you start Monday.',
    risks: 'None meaningful. Reflux-prone people may prefer a slower pace.'
  },
  {
    id: 'nasal-breathe', name: 'Nasal breathing by default', short: 'NOSE BREATH', cat: 'recovery',
    vitality: 74, qol: 78, diseases: 3, organs: ['lungs', 'sleep', 'brain'], evidence: '3/5',
    blurb: 'Nose at rest and during easy work. Mouth breathing is a backup for hard efforts, not the all-day setting.',
    mechanisms: ['Humidifies and filters air', 'Slightly slower respiratory rate', 'Night-time mouth tape is optional and not for everyone'],
    studies: note('The physiology of nasal breathing is solid. Consumer mouth-tape claims are ahead of the trials.'),
    dosage: 'Notice three times a day: rest, easy walking, and the start of sleep.',
    timing: 'All day at low intensity. Hard intervals can be oral.',
    synergies: ['sleep8', 'zone2_base'],
    gorkipedia: 'If you cannot nose-breathe while walking, that is a fitness or airway signal, not a willpower failure.',
    risks: 'Do not tape your mouth if you have untreated apnea, a cold, or panic with covered airways.'
  },
  {
    id: 'midday-sun', name: 'Midday outdoor light', short: 'MIDDAY SUN', cat: 'movement',
    vitality: 76, qol: 75, diseases: 4, organs: ['skin', 'bones', 'immune'], evidence: '3/5',
    blurb: 'A separate habit from morning circadian light. Brief midday outdoor time is how many people make vitamin D. Burning is not the goal.',
    mechanisms: ['Skin vitamin D synthesis', 'Bright-light alertness', 'Dose depends on latitude, season, and skin'],
    studies: note('There is no universal minute count. Short, regular outdoor time beats rare burns.'),
    dosage: 'Enough that arms or legs see sky, short of pink skin. Diet and a tested 25(OH)D fill the winter gap.',
    timing: 'Late morning to early afternoon, not instead of morning light.',
    synergies: ['morninglight', 'vitd'],
    gorkipedia: 'Morning light sets the clock. Midday light is the vitamin D opportunity. Sunscreen on the face can stay on while limbs do a short exposure.',
    risks: 'Sunburn and skin cancer risk are cumulative. This is not a tanning protocol.'
  },
  {
    id: 'friends-weekly', name: 'One real social block a week', short: 'WEEKLY PEOPLE', cat: 'social',
    vitality: 83, qol: 88, diseases: 5, organs: ['brain', 'heart'], evidence: '4/5',
    blurb: 'A scheduled meal, walk, or call with someone who knows you. Isolation tracks with health in cohorts, alongside several classic risk factors.',
    mechanisms: ['Stress buffering', 'Behavioral accountability', 'Purpose and mood'],
    studies: note('Social connection shows up in mortality cohorts. The practical step is a calendar event, not a personality change.'),
    dosage: 'One block you would notice if it disappeared. Protect it like a training session.',
    timing: 'Whatever repeats. Weeknights fail less often than “sometime.”',
    synergies: ['socialdeep', 'walkingmeet'],
    gorkipedia: 'Deep conversation is one node. This one is simply showing up on a rhythm so the relationship does not depend on mood.',
    risks: 'Obligatory draining contact is not the same thing. Pick the person on purpose.'
  },
  {
    id: 'kitchen-close', name: 'Kitchen closed after dinner', short: 'KITCHEN CLOSED', cat: 'nutrition',
    vitality: 78, qol: 76, diseases: 4, organs: ['metabolic', 'liver', 'sleep'], evidence: '3/5',
    blurb: 'Stop eating after the evening meal. A gentler cousin of a named fast, aimed at late calories and sleep.',
    mechanisms: ['Fewer late glucose hits', 'Less reflux in bed', 'A longer overnight gap without a rigid fasting brand'],
    studies: note('Time-restricted eating trials are mixed once calories are equal. The sleep and reflux upside is the practical reason to try it.'),
    dosage: 'Last bite 2–3 hours before bed, most nights.',
    timing: 'Evening. Morning coffee can stay.',
    synergies: ['latenighteat', 'sleep8', 'fast14'],
    gorkipedia: 'If you train late or you are pregnant, under-eating, or recovering from disordered eating, this rule does not apply. It is a default for grazing, not a moral code.',
    risks: 'Rigid windows can backfire if they trigger binge nights. Soften the rule before you quit sleep.'
  },
  {
    id: 'phone-delay-am', name: 'No phone for the first 20 minutes', short: 'PHONE DELAY', cat: 'mind',
    vitality: 73, qol: 80, diseases: 2, organs: ['brain', 'sleep'], evidence: '3/5',
    blurb: 'Light, water, and a plan before the inbox. Distinct from keeping the phone out of the bedroom.',
    mechanisms: ['Fewer reactive dopamine hits at wake', 'Room for morning light and movement', 'Less spilled attention'],
    studies: note('This is a behavioral design choice. The outcome to watch is whether the morning still belongs to you at 9am.'),
    dosage: '20 minutes. Phone can charge in another room.',
    timing: 'From eyes-open until after light and a drink.',
    synergies: ['phonebed', 'morninglight'],
    gorkipedia: 'Bedroom rules stop the night scroll. This one stops the morning from starting in someone else’s priority list.',
    risks: 'Caregivers and on-call work need a real exception, not guilt.'
  },
  {
    id: 'protein-breakfast', name: 'Protein at breakfast', short: 'AM PROTEIN', cat: 'nutrition',
    vitality: 80, qol: 79, diseases: 4, organs: ['muscle', 'metabolic', 'brain'], evidence: '4/5',
    blurb: 'Front-load protein so lunch is not the first real meal. Pairs with the daily protein target instead of replacing it.',
    mechanisms: ['Muscle protein synthesis needs a leucine threshold per meal', 'Satiety through the morning', 'Easier to hit a daily gram target'],
    studies: note('Per-meal protein distribution has supportive trials in older adults. The exact gram depends on body size.'),
    dosage: 'About 25–40 g at the first meal. Eggs, dairy, fish, soy, or a shake.',
    timing: 'First meal, whenever that is. Fasting mornings can skip this on purpose.',
    synergies: ['protein150', 'creatine', 'resist3x'],
    gorkipedia: 'A pastry breakfast makes the daily protein goal a night-time project. Moving some of it earlier is the whole intervention.',
    risks: 'Kidney disease with a prescribed protein limit is the exception. Everyone else is usually under, not over.'
  }
];

export const EXERCISE_WAVE = [
  {
    id: 'farmer-carry', name: 'Farmer carries', short: 'CARRIES', cat: 'strength',
    longevity: 84, qol: 82, diseases: 5, organs: ['muscle', 'grip', 'spine', 'core'], evidence: '4/5',
    blurb: 'Walk with heavy loads at your sides. Grip, trunk, and gait in one pattern that life actually uses.',
    mechanisms: ['Grip strength', 'Trunk stiffness under load', 'Gait with fatigue'],
    studies: note('Grip strength is a consistent observational marker of later-life function. Carries train the thing the marker measures.'),
    dosage: '2 sessions a week. 4–6 walks of 20–40 meters. Load that keeps your posture honest.',
    timing: 'End of a strength day, or as the whole session when time is short.',
    synergies: ['lift3x', 'dead-hang'],
    gorkipedia: 'If you can deadlift but cannot carry the groceries evenly, this is the missing piece.',
    risks: 'Soft handles tear skin. Do not go so heavy that you lean and twist.'
  },
  {
    id: 'dead-hang', name: 'Dead hangs', short: 'DEAD HANG', cat: 'strength',
    longevity: 78, qol: 80, diseases: 3, organs: ['shoulders', 'spine', 'grip'], evidence: '3/5',
    blurb: 'Hang from a bar with shoulders active enough that you are not just dangling on ligaments.',
    mechanisms: ['Grip endurance', 'Shoulder decompression for some people', 'Scapular control'],
    studies: note('This is a capacity builder. It is not a proven treatment for shoulder pain.'),
    dosage: '3 days a week. Accumulate 60–90 seconds. Bend the knees or use a band if the full hang is not there yet.',
    timing: 'Before or after training. Never to failure if the shoulder already complains.',
    synergies: ['farmer-carry', 'mobility_15'],
    gorkipedia: 'A quiet test of whether your hands and shoulders still belong to you. Add time before you add drama.',
    risks: 'Unstable shoulders, recent repairs, and elbow tendinopathy need a regression, not a longer hang.'
  },
  {
    id: 'kb-swing', name: 'Kettlebell swings', short: 'KB SWING', cat: 'power',
    longevity: 80, qol: 78, diseases: 4, organs: ['muscle', 'hips', 'heart'], evidence: '4/5',
    blurb: 'A hip hinge that becomes power. Conditioning without turning every session into a run.',
    mechanisms: ['Posterior-chain power', 'Heart rate in short sets', 'Hinge practice'],
    studies: note('Swings have decent small-trial data for power and conditioning when the hinge is real.'),
    dosage: '1–2 days a week. 10–15 swings, rest, repeat for 10 minutes. Russian (eye-level) before American (overhead).',
    timing: 'Fresh, not after a heavy deadlift day.',
    synergies: ['heavy2x', 'zone2_base'],
    gorkipedia: 'The swing is a hike of the hips, not a squat and not a shoulder raise. Film one set before you add load.',
    risks: 'Low-back flexion under speed is the injury. Stop the set when the hinge collapses.'
  },
  {
    id: 'row-erg', name: 'Rowing erg, easy', short: 'ROW EASY', cat: 'zone2',
    longevity: 81, qol: 79, diseases: 4, organs: ['heart', 'lungs', 'muscle', 'spine'], evidence: '4/5',
    blurb: 'Easy rowing as zone 2 for people who dislike cycling or whose joints dislike running.',
    mechanisms: ['Large muscle mass at low impact', 'Aerobic base', 'Posture if the finish is not a shrug'],
    studies: note('Modality matters less than easy-duration consistency. The erg is one way to get that duration.'),
    dosage: '20–40 minutes, conversational, damper low enough that you are not doing a deadlift each stroke.',
    timing: 'Separate from heavy hinge days if your back is the limiter.',
    synergies: ['zone2_base', 'lift3x'],
    gorkipedia: 'Legs push, body swings, arms finish. Most people reverse that and call it cardio.',
    risks: 'Pre-existing low-back pain: shorten the stroke and keep the damper down.'
  },
  {
    id: 'calf-raises', name: 'Straight-knee and bent-knee calf raises', short: 'CALVES', cat: 'strength',
    longevity: 76, qol: 77, diseases: 3, organs: ['muscle', 'tendons', 'vascular'], evidence: '4/5',
    blurb: 'Soleus and gastrocnemius. Small muscles with a real role in walking, glucose uptake, and the Achilles.',
    mechanisms: ['Soleus is a glucose sink when used often', 'Achilles loading', 'Push-off for gait'],
    studies: note('The “soleus push-up” paper is interesting and easy to overread. Ordinary calf work still belongs in the week.'),
    dosage: '2–3 days. 2–3 sets of 8–15 straight-knee and bent-knee raises. Slow lower.',
    timing: 'End of a session or during the workday.',
    synergies: ['zone2_base', '10ksteps'],
    gorkipedia: 'Bent knee hits soleus harder. Straight knee shares the work with the gastrocnemius. Do both.',
    risks: 'Achilles tendinopathy wants isometrics first, not aggressive bouncing.'
  },
  {
    id: 'turkish-getup', name: 'Turkish get-up', short: 'GET-UP', cat: 'mixed',
    longevity: 77, qol: 76, diseases: 3, organs: ['shoulders', 'core', 'hips'], evidence: '3/5',
    blurb: 'From the floor to standing with a weight overhead, then back down. A movement screen you can train.',
    mechanisms: ['Shoulder stability under load', 'Floor transfer', 'Cross-body coordination'],
    studies: note('This is a skill. The health case is the ability to get off the floor, which predicts function in older adults.'),
    dosage: '1–2 days. 3–5 reps each side with a light kettlebell. Quality over load for a long time.',
    timing: 'Early in the session while you are fresh.',
    synergies: ['mobility_15', 'stability_core'],
    gorkipedia: 'Learn it with a shoe balanced on your fist before you own a kettlebell. The pattern is the point.',
    risks: 'Rushing the load is how shoulders and wrists get angry. Stay humble.'
  },
  {
    id: 'stair-climb', name: 'Stair repeats', short: 'STAIRS', cat: 'zone2',
    longevity: 80, qol: 78, diseases: 4, organs: ['heart', 'legs', 'lungs'], evidence: '4/5',
    blurb: 'Stairs you already have. Easy repeats for base, or one harder bout if joints allow.',
    mechanisms: ['Concentric-heavy leg work', 'Cardiorespiratory load without a machine', 'Power if you bound, base if you do not'],
    studies: note('Stair climbing shows up in cohort data as a simple activity marker. Pace decides whether it is easy or hard.'),
    dosage: 'Two or three days. 10–20 minutes of steady climbing, or 6–10 controlled flights with rest.',
    timing: 'Whenever the building is empty enough to be safe.',
    synergies: ['zone2_base', 'calf-raises'],
    gorkipedia: 'Hold the rail if balance is the limiter. The workout still counts.',
    risks: 'Downstairs is where knees and falls happen. Walk down, or take the elevator down, until that is easy.'
  },
  {
    id: 'jump-rope', name: 'Jump rope, short', short: 'JUMP ROPE', cat: 'hiit',
    longevity: 74, qol: 76, diseases: 3, organs: ['heart', 'bones', 'calves'], evidence: '3/5',
    blurb: 'Brief rhythmic jumping. Bone and calf stimulus for people whose landing mechanics are already decent.',
    mechanisms: ['Impact loading for bone', 'Coordination', 'High heart rate in little time'],
    studies: note('Impact is useful for bone until it is too much for the Achilles or the pelvic floor. Dose is the whole question.'),
    dosage: '1–2 days. 6–10 rounds of 30–60 seconds, easy bounce, soft surface if you need it.',
    timing: 'Not the day after a heavy eccentric session.',
    synergies: ['calf-raises', 'hiit_short'],
    gorkipedia: 'If you cannot hop in place quietly, you are not ready for a rope. Practice the bounce first.',
    risks: 'Stress fractures, pelvic-floor symptoms, and angry Achilles are stop signs, not things to rope through.'
  }
];

export const FOOD_WAVE = [
  {
    id: 'natto', name: 'Natto', short: 'NATTO', cat: 'fermented', impact: 'positive',
    longevity: 84, qol: 70, diseases: 5, organs: ['heart', 'bones', 'gut'], evidence: '4/5',
    blurb: 'Fermented soybeans and the most practical food source of vitamin K2 as MK-7. The texture is the barrier, not the nutrition.',
    mechanisms: ['MK-7 for vitamin K–dependent proteins', 'Soy protein and fiber', 'Nattokinase is a separate, dose-uncertain story'],
    studies: note('Food K2 from natto is the reason this is on the map. Nattokinase capsules are not the same as eating natto.'),
    dosage: 'A small pack, a few times a week, if you tolerate soy.',
    timing: 'With a meal. Mustard and green onion are the usual way through the aroma.',
    synergies: ['vitk2', 'eggs'],
    gorkipedia: 'If you will not eat it, use a K2 supplement and move on. Pretending you will “start next month” does not raise MK-7.',
    risks: 'Soy allergy. Vitamin K changes warfarin management — that is a clinic conversation, not a food hack. Blood-pressure effects of high-dose nattokinase extracts are a different product.'
  },
  {
    id: 'kefir', name: 'Kefir', short: 'KEFIR', cat: 'fermented', impact: 'positive',
    longevity: 80, qol: 82, diseases: 4, organs: ['gut', 'bones', 'immune'], evidence: '3/5',
    blurb: 'A fermented milk with more microbial variety than most yogurts, plus protein, calcium, and live cultures.',
    mechanisms: ['Live microbes', 'Lactose is partly digested already', 'Protein and calcium'],
    studies: note('Fermented dairy is often associated with more favorable patterns than sugar-sweetened dairy. Kefir-specific trials are smaller.'),
    dosage: '150–250 ml most days, plain.',
    timing: 'With a meal or as the protein portion of breakfast.',
    synergies: ['yogurt', 'fiber30'],
    gorkipedia: 'Plain kefir. The dessert versions are a different food wearing the same name.',
    risks: 'Dairy allergy or a true lactose problem. Histamine-sensitive people sometimes do poorly with ferments.'
  },
  {
    id: 'beef-liver', name: 'Beef liver, occasional', short: 'LIVER', cat: 'proteins', impact: 'positive',
    longevity: 78, qol: 74, diseases: 4, organs: ['blood', 'liver', 'brain'], evidence: '4/5',
    blurb: 'Extremely nutrient-dense and extremely easy to overdo. A small serving on a rhythm, not a daily steak of it.',
    mechanisms: ['Preformed vitamin A, B12, folate, copper, and iron in one food', 'Choline'],
    studies: note('Liver is a food, not a multivitamin you can eat without a ceiling. Vitamin A and copper accumulate.'),
    dosage: 'About 100 g once a week, or a smaller amount more often. Not daily.',
    timing: 'A meal, with vegetables. Freeze first if the texture bothers you; pâté counts.',
    synergies: ['eggs', 'methylb12'],
    gorkipedia: 'The “like eating a supplement” line is true, including the part where supplements have upper limits.',
    risks: 'Pregnancy has a specific vitamin A ceiling. Gout and high iron stores are reasons to skip or test, not to push through.'
  },
  {
    id: 'tempeh', name: 'Tempeh', short: 'TEMPEH', cat: 'legumes', impact: 'positive',
    longevity: 80, qol: 78, diseases: 4, organs: ['muscle', 'gut', 'heart'], evidence: '4/5',
    blurb: 'Whole soybeans bound by a ferment. More protein and fiber per bite than most meat substitutes.',
    mechanisms: ['Complete plant protein', 'Fiber', 'Fermentation changes some of the compounds people blame for bloating'],
    studies: note('Soy foods, as food, have a reassuring human record. This is not a hormone protocol.'),
    dosage: '100–150 g in a meal, a few times a week.',
    timing: 'Lunch or dinner. Pan-sear so it is not a wet brick.',
    synergies: ['tofu', 'broccoli'],
    gorkipedia: 'Tempeh is beans that learned to be a steak. Season it like one.',
    risks: 'Soy allergy. Highly processed soy isolates are a different product and not what this node is.'
  },
  {
    id: 'miso', name: 'Miso', short: 'MISO', cat: 'fermented', impact: 'positive',
    longevity: 76, qol: 77, diseases: 3, organs: ['gut', 'heart'], evidence: '3/5',
    blurb: 'Fermented soybean paste. A salty, living seasoning. The sodium is real, so it replaces other salt rather than stacking on it.',
    mechanisms: ['Fermented soy', 'Umami that can lower the need for heavier sauces', 'Sodium load if you add it on top of an already salty diet'],
    studies: note('Traditional miso intake shows up in Japanese cohort work. The useful move is swapping, not adding.'),
    dosage: 'A spoon in soup or a dressing, most days, in place of another salty sauce.',
    timing: 'Off a hard boil if you want the cultures. Cooked miso is still a reasonable food.',
    synergies: ['tofu', 'seaweed'],
    gorkipedia: 'Miso soup is a vehicle. The win is the ferment and the vegetables you put in it, not a giant sodium bolus.',
    risks: 'Blood-pressure diets that already limit sodium should count it.'
  },
  {
    id: 'herring', name: 'Herring', short: 'HERRING', cat: 'fish', impact: 'positive',
    longevity: 86, qol: 78, diseases: 5, organs: ['heart', 'brain', 'eyes'], evidence: '4/5',
    blurb: 'A small oily fish. EPA and DHA with less of the mercury problem that comes with big predators.',
    mechanisms: ['Long-chain omega-3s', 'Protein', 'Vitamin D in some preparations'],
    studies: note('Oily fish as food is more often associated with favorable outcomes than fish-oil capsules for many people. Small fish are the usual default.'),
    dosage: 'A serving once or twice a week, rotating with sardines and salmon.',
    timing: 'A meal. Pickled versions can be very salty.',
    synergies: ['omega3', 'sardines'],
    gorkipedia: 'If you will eat herring or sardines, you need less capsule math.',
    risks: 'Pickled and smoked products carry sodium and, for smoked, the usual smoked-food caveats.'
  },
  {
    id: 'anchovies', name: 'Anchovies', short: 'ANCHOVIES', cat: 'fish', impact: 'positive',
    longevity: 82, qol: 74, diseases: 4, organs: ['heart', 'brain'], evidence: '4/5',
    blurb: 'Tiny fish, usually cured. A way to put omega-3s on vegetables without cooking a fillet.',
    mechanisms: ['Omega-3s', 'Umami', 'Calcium if you eat the bones'],
    studies: note('Same small-fish logic as sardines. Rinse if the salt is the part you do not want.'),
    dosage: 'A few fillets on a salad or in a pan sauce, several times a week.',
    timing: 'With meals. They replace salt and cheese more often than they should add to both.',
    synergies: ['olive-oil', 'broccoli'],
    gorkipedia: 'The tin in the back of the cupboard is a legitimate longevity food. Use it before it becomes a decoration.',
    risks: 'Sodium in oil-packed and salt-cured styles. Fish allergy.'
  },
  {
    id: 'oysters', name: 'Oysters', short: 'OYSTERS', cat: 'proteins', impact: 'positive',
    longevity: 77, qol: 75, diseases: 3, organs: ['immune', 'zinc', 'brain'], evidence: '3/5',
    blurb: 'The food-dose of zinc, plus B12, in a portion you can actually finish. Often contrasted with a high-dose zinc pill.',
    mechanisms: ['Zinc in a food matrix', 'B12', 'A copper-aware way to get zinc versus isolated megadoses'],
    studies: note('Zinc deficiency is real. Chronic high-dose zinc pills are how people create copper deficiency. Oysters sit in the middle.'),
    dosage: 'A serving occasionally, from a source you trust raw, or cooked if you do not.',
    timing: 'A meal. Not a daily zinc protocol.',
    synergies: ['zinc', 'lemon'],
    gorkipedia: 'If your zinc strategy is “50 mg every night forever,” eat oysters sometimes and drop the dose instead.',
    risks: 'Raw shellfish carry a real Vibrio risk for some people and some waters. Cook them when that risk is not acceptable.'
  },
  {
    id: 'cottage-cheese', name: 'Cottage cheese', short: 'COTTAGE', cat: 'proteins', impact: 'positive',
    longevity: 76, qol: 80, diseases: 3, organs: ['muscle', 'bones'], evidence: '4/5',
    blurb: 'Slow-digesting casein, cheap, and easy at night or at breakfast. A protein tool, not a personality.',
    mechanisms: ['High protein per calorie', 'Casein digests slowly', 'Calcium'],
    studies: note('Dairy protein is studied for muscle when training and total protein are in place.'),
    dosage: '150–250 g when you need a protein anchor and do not want to cook.',
    timing: 'Breakfast or evening. Sweetened cups are a dessert.',
    synergies: ['protein-breakfast', 'berries'],
    gorkipedia: 'Plain, full-fat or low-fat by preference. Fruit on top is fine. Candy-aisle mix-ins are not the node.',
    risks: 'Dairy allergy. Sodium varies a lot by brand.'
  },
  {
    id: 'kombucha', name: 'Kombucha, plain', short: 'KOMBUCHA', cat: 'fermented', impact: 'positive',
    longevity: 64, qol: 70, diseases: 2, organs: ['gut'], evidence: '2/5',
    blurb: 'A fermented tea. Fine as a soda replacement. Weak as a microbiome therapy.',
    mechanisms: ['Replaces sugary drinks if the bottle is actually low sugar', 'Acids and a few live cultures', 'Caffeine from the tea'],
    studies: note('Clinical outcome data is thin. The win is what it replaces.'),
    dosage: 'A small bottle, check the sugar grams. Homemade batches vary and can be boozy.',
    timing: 'Afternoon instead of a soft drink.',
    synergies: ['green-tea'],
    gorkipedia: 'If the label looks like juice, it is juice. The ferment is not a free pass.',
    risks: 'Unpasteurized drinks are a poor idea in pregnancy and in deep immunosuppression. Acid is hard on reflux.'
  },
  {
    id: 'tofu', name: 'Tofu', short: 'TOFU', cat: 'proteins', impact: 'positive',
    longevity: 81, qol: 78, diseases: 4, organs: ['muscle', 'heart', 'bones'], evidence: '4/5',
    blurb: 'Soybean curd. A complete protein that takes on the sauce you give it. One of the easiest ways to eat less red meat without losing protein.',
    mechanisms: ['Protein', 'Isoflavones as food, not as a hormone pellet', 'Calcium if it is set with calcium'],
    studies: note('Soy foods are associated with neutral-to-favorable outcomes in humans. Isolated scare claims mostly come from high-dose animal work.'),
    dosage: '100–200 g in a meal, several times a week.',
    timing: 'Any meal. Firm tofu for searing, silken for blending.',
    synergies: ['broccoli', 'tempeh'],
    gorkipedia: 'Press it, salt it, get color on it. Unseasoned cubes are why people think they dislike tofu.',
    risks: 'Soy allergy. Calcium-set versus nigari is on the label if calcium is a goal.'
  },
  {
    id: 'kiwi', name: 'Kiwi fruit', short: 'KIWI', cat: 'fruits', impact: 'positive',
    longevity: 77, qol: 80, diseases: 3, organs: ['gut', 'immune'], evidence: '3/5',
    blurb: 'Two kiwis are a researched snack for regularity, with vitamin C and fiber in a small package.',
    mechanisms: ['Fiber and actinidin', 'Vitamin C', 'Stool frequency in small feeding studies'],
    studies: note('The “two kiwis a day” constipation studies are small and practical. That is the right size of claim.'),
    dosage: 'Two fruits a day when regularity is the goal. One is still a good piece of fruit.',
    timing: 'With breakfast or as the dessert.',
    synergies: ['yogurt', 'kefir'],
    gorkipedia: 'Eat the gold or the green. Chew the seeds. Peeling is optional.',
    risks: 'Latex-fruit allergy is real for some people. Stop if the mouth itches.'
  }
];

export const ENV_WAVE = [
  {
    id: 'noise-traffic', name: 'Chronic traffic noise', short: 'NOISE', cat: 'household', impact: 'negative',
    longevity: 42, qol: 36, diseases: 6, organs: ['heart', 'brain', 'sleep'], evidence: '4/5',
    blurb: 'Night noise is associated with stress-hormone changes and fragmented sleep, even when you think you have adapted.',
    mechanisms: ['Sleep fragmentation', 'Sympathetic activation', 'Annoyance that becomes a blood-pressure story in cohorts'],
    studies: note('Transportation noise is a recognized environmental health issue. Less exposure is the practical response, not toughness.'),
    avoidance: 'Bedroom on the quiet side, sealed windows or inserts, earplugs or a fan you control, and a building choice when you can make one.',
    risks: 'Higher cardiometabolic risk in people who live with years of night noise.',
    gorkipedia: 'If you wake tired next to a road, this node is about the room, not about buying another sleep supplement.'
  },
  {
    id: 'secondhand-smoke', name: 'Secondhand smoke', short: 'SECONDHAND', cat: 'air-pollution', impact: 'negative',
    longevity: 28, qol: 30, diseases: 12, organs: ['lungs', 'heart', 'vascular'], evidence: '5/5',
    blurb: 'Smoke from other people is still smoke. Sitting near a door is not a useful way to avoid it.',
    mechanisms: ['Particulate and toxic gas inhalation', 'Studied for endothelial effects', 'Childhood exposure has its own record'],
    studies: note('The outcome data here are consistent. Avoidance is the main approach.'),
    avoidance: 'No smoking indoors or in the car. Leave patios that are actually smoking rooms. Ask, including of guests.',
    risks: 'Heart disease, stroke, lung disease, and harm to children in the same air.',
    gorkipedia: 'This is not a willpower contest with the smoker. It is your air.'
  },
  {
    id: 'gas-stove', name: 'Gas stove without ventilation', short: 'GAS STOVE', cat: 'air-pollution', impact: 'negative',
    longevity: 48, qol: 50, diseases: 5, organs: ['lungs', 'airway', 'heart'], evidence: '3/5',
    blurb: 'Gas burners emit nitrogen dioxide and some benzene. The dose is mostly about ventilation and how long the flame is on.',
    mechanisms: ['NO2 irritates airways', 'Indoor levels can rival a busy road when the hood is off or fake', 'Children with asthma are the sensitive group'],
    studies: note('The hazard is real and the size of the effect depends on the kitchen. A ducted hood changes the story.'),
    avoidance: 'Hood that vents outside, used every time. Open a window. Induction when you replace the range. Boil less in a sealed tiny kitchen.',
    risks: 'Worse asthma control and a chronic low-level pollutant load.',
    gorkipedia: 'Recirculating hoods mostly move the smell around. If the duct does not leave the building, assume it is not solving NO2.'
  },
  {
    id: 'night-shift', name: 'Rotating night shifts', short: 'NIGHT SHIFT', cat: 'household', impact: 'negative',
    longevity: 40, qol: 38, diseases: 8, organs: ['sleep', 'brain', 'metabolic', 'heart'], evidence: '4/5',
    blurb: 'Work that fights the clock. Not a moral failing. A circadian mismatch with a documented health cost.',
    mechanisms: ['Melatonin suppression', 'Meal timing against the clock', 'Short sleep between shifts'],
    studies: note('Shift work is classified as a probable carcinogen by IARC on the circadian evidence, and metabolic risk shows up in cohorts. Mitigation is partial.'),
    avoidance: 'Fixed nights beat chaotic rotation when the job allows. Dark sleep, morning light blocking on the way home, and meals clustered in the wake window.',
    risks: 'Higher metabolic, mood, and some cancer risks with years of rotation. Individual risk is not a verdict.',
    gorkipedia: 'If you work nights, the map’s morning-light and caffeine rules need to be rewritten around your sleep, not around the sun. Do that on purpose.'
  },
  {
    id: 'heat-extreme', name: 'Extreme heat days', short: 'HEAT', cat: 'household', impact: 'negative',
    longevity: 46, qol: 40, diseases: 6, organs: ['heart', 'kidney', 'brain'], evidence: '4/5',
    blurb: 'Extreme heat is associated with heart and kidney strain, especially in older adults and in rooms that do not cool overnight.',
    mechanisms: ['Cardiac strain', 'Dehydration and acute kidney stress', 'Sleep loss when nights stay hot'],
    studies: note('Heat-wave mortality is a well-documented environmental pattern in vital statistics.'),
    avoidance: 'A cool room for sleeping, water, less alcohol, shifted outdoor work, and checking on people who live alone.',
    risks: 'Heat illness, cardiac events, and kidney injury. Medications that alter fluid balance matter here.',
    gorkipedia: 'A fan in a closed hot room is not a plan once the air itself is dangerous. Know where the cool place is before the week arrives.'
  },
  {
    id: 'wood-smoke', name: 'Wood smoke indoors', short: 'WOOD SMOKE', cat: 'air-pollution', impact: 'negative',
    longevity: 36, qol: 40, diseases: 7, organs: ['lungs', 'heart', 'vascular'], evidence: '4/5',
    blurb: 'Fireplaces and leaky stoves are indoor PM2.5 sources. Ambiance does not change the particle size.',
    mechanisms: ['Fine particles', 'Polycyclic aromatic hydrocarbons', 'Same biological pathways as other combustion smoke'],
    studies: note('Household solid-fuel smoke is a major global exposure. A decorative fireplace in a tight house is the smaller, local version.'),
    avoidance: 'EPA-certified stove, a real flue, doors closed, no idling smoke into the room. Skip indoor fires when outdoor air is already bad.',
    risks: 'Respiratory and cardiovascular harm, worse in children.',
    gorkipedia: 'If you can smell the fire from the couch, you are breathing the fire.'
  }
];

export const BIO_WAVE = [
  {
    id: 'grip_strength', name: 'Grip strength', short: 'GRIP', cat: 'other', specimen_type: 'other',
    current: '38 kg', unit: 'kg', optimal: 'above age-sex median', blueprint: 'train it, do not just test it',
    age_impact: 1.2, status: 'suboptimal', organs: ['muscle', 'nerves'], evidence: '5/5',
    blurb: 'A functional marker. Low grip tracks with later disability and mortality in cohorts. It is trainable.',
    mechanisms: ['Marker of overall strength and nervous system drive', 'Not a disease by itself'],
    risks: 'A low number is a prompt to strength-train and to look for neurologic or joint limits, not a diagnosis.',
    studies: note('Dynamometer grip is one of the better cheap functional tests. Compare with age and sex, and with your own last test.'),
    dosage: 'Measure two or three efforts each hand. Repeat a few times a year if you are training.',
    links: ['farmer-carry', 'lift3x']
  },
  {
    id: 'vo2max', name: 'VO2max', short: 'VO2MAX', cat: 'other', specimen_type: 'other',
    current: '38', unit: 'ml/kg/min', optimal: 'high for your age', blueprint: 'estimate is fine',
    age_impact: 1.4, status: 'suboptimal', organs: ['heart', 'lungs', 'muscle'], evidence: '5/5',
    blurb: 'Cardiorespiratory fitness. Higher values are associated with lower mortality across a very large evidence base. A wearable estimate is good enough to steer training.',
    mechanisms: ['Integrated heart, lung, blood, and muscle capacity'],
    risks: 'Chasing a lab test is optional. Ignoring easy aerobic work because you lift is the common miss.',
    studies: note('Fitness cohorts are among the more consistent areas of lifestyle research. The number moves with months of zone 2 and a little intensity.'),
    dosage: 'Retest every few months with the same method so the trend is real.',
    links: ['zone2_base', 'vo2max_4x4']
  },
  {
    id: 'rhr', name: 'Resting heart rate', short: 'RHR', cat: 'other', specimen_type: 'other',
    current: '64', unit: 'bpm', optimal: 'often lower if you feel well', blueprint: 'morning, seated',
    age_impact: 0.6, status: 'suboptimal', organs: ['heart'], evidence: '4/5',
    blurb: 'A morning resting rate. Trends matter more than one reading. A sudden rise often means poor sleep, illness, or too much hard training.',
    mechanisms: ['Parasympathetic tone', 'Fitness and recovery'],
    risks: 'A very low rate with symptoms is a medical question. A badge that says “athlete” is not.',
    studies: note('Higher resting rates associate with worse outcomes in population data. Context beats a single threshold.'),
    dosage: 'Same time, before caffeine, a few mornings a week.',
    links: ['zone2_base', 'sleep8']
  },
  {
    id: 'hrv_rmssd', name: 'HRV (rMSSD)', short: 'HRV', cat: 'other', specimen_type: 'other',
    current: '42', unit: 'ms', optimal: 'your own baseline', blueprint: 'nightly trend',
    age_impact: 0.4, status: 'suboptimal', organs: ['heart', 'brain'], evidence: '3/5',
    blurb: 'Beat-to-beat variation. Useful as your trend. Nearly useless as a comparison with someone else’s screenshot.',
    mechanisms: ['Autonomic balance', 'Sensitive to alcohol, sleep, and illness'],
    risks: 'Changing your life to chase a nightly score is the failure mode.',
    studies: note('HRV-guided training has some supportive trials. Absolute cutoffs on consumer apps do not.'),
    dosage: 'Same device, same time of night, watch the 7-day line.',
    links: ['sleep8', 'noalcohol']
  },
  {
    id: 'waist_height', name: 'Waist-to-height ratio', short: 'WAIST', cat: 'metabolic', specimen_type: 'other',
    current: '0.52', unit: 'ratio', optimal: 'under about 0.5', blueprint: 'tape, not a scan',
    age_impact: 1.1, status: 'suboptimal', organs: ['metabolic', 'liver', 'heart'], evidence: '4/5',
    blurb: 'Waist divided by height. A blunt look at central fat that a normal BMI can hide.',
    mechanisms: ['Visceral fat proxy', 'Tracks with metabolic risk better than weight alone for many people'],
    risks: 'The tape is not a body-composition lab. It is still worth doing.',
    studies: note('Ratios around 0.5 are a common educational cutoff, not a diagnosis of disease.'),
    dosage: 'Midway between the bottom rib and the top of the hip, exhaled, same spot each time.',
    links: ['zone2_base', 'protein150']
  },
  {
    id: 'igf1', name: 'IGF-1', short: 'IGF-1', cat: 'hormones', specimen_type: 'blood',
    current: '180', unit: 'ng/mL', optimal: 'mid-range for age', blueprint: 'not “as high as possible”',
    age_impact: 0.7, status: 'suboptimal', organs: ['liver', 'muscle', 'brain'], evidence: '3/5',
    blurb: 'A growth-factor signal with a U-shaped story. Very low can mean frailty or poor nutrition. Pushing it high is not a longevity plan.',
    mechanisms: ['GH axis', 'Nutrient and protein sensitive'],
    risks: 'Interpreting one number without age, nutrition, and liver context is how this marker gets abused.',
    studies: note('Both low and high extremes have been linked to problems in different studies. Mid-range is the educational target.'),
    dosage: 'A morning blood draw. Do not “optimize” it with unprescribed growth hormone.',
    links: ['protein150', 'lift3x']
  },
  {
    id: 'folate_serum', name: 'Serum folate', short: 'FOLATE', cat: 'nutrients', specimen_type: 'blood',
    current: '8', unit: 'ng/mL', optimal: 'replete, not mega', blueprint: 'with B12',
    age_impact: 0.5, status: 'suboptimal', organs: ['blood', 'brain'], evidence: '4/5',
    blurb: 'Folate status. Read it next to B12 so a folate pill is not hiding a B12 problem.',
    mechanisms: ['One-carbon metabolism', 'Red-cell production'],
    risks: 'High folate with low B12 is the pattern to avoid.',
    studies: note('Deficiency is worth correcting with food or a modest supplement. There is no prize for a sky-high level.'),
    dosage: 'Ordinary blood draw. Red-cell folate is the slower average if your lab offers it.',
    links: ['methylfolate', 'methylb12']
  },
  {
    id: 'mma', name: 'Methylmalonic acid', short: 'MMA', cat: 'nutrients', specimen_type: 'blood',
    current: '320', unit: 'nmol/L', optimal: 'within lab ref, lower-normal', blueprint: 'functional B12',
    age_impact: 0.6, status: 'suboptimal', organs: ['nerves', 'blood'], evidence: '4/5',
    blurb: 'A functional look at B12. It can be high when the serum B12 still looks “normal.”',
    mechanisms: ['B12-dependent enzyme backup', 'Rises in B12 deficiency'],
    risks: 'Kidney disease also raises MMA. The number needs that context.',
    studies: note('Useful when symptoms and a borderline B12 disagree. Not a test to repeat monthly.'),
    dosage: 'Blood test when B12 is unclear, especially with neuropathy or a vegan diet.',
    links: ['methylb12', 'b12']
  },
  {
    id: 'nt_probnp', name: 'NT-proBNP', short: 'NT-proBNP', cat: 'other', specimen_type: 'blood',
    current: '90', unit: 'pg/mL', optimal: 'low for age', blueprint: 'a heart-strain signal',
    age_impact: 1.3, status: 'optimal', organs: ['heart'], evidence: '4/5',
    blurb: 'A peptide that rises when the heart wall is under strain. Used in clinics for heart-failure questions. A “longevity panel” add-on still needs a clinician if it is high.',
    mechanisms: ['Ventricular wall stress'],
    risks: 'A high value is not a home project. Age shifts the reference range.',
    studies: note('This is a real clinical assay. The map lists it so the name is familiar, not so you treat a number alone.'),
    dosage: 'Only worth drawing with a reason or as part of a workup someone will read.',
    links: ['zone2_base', 'apob']
  },
  {
    id: 'non_hdl', name: 'Non-HDL cholesterol', short: 'NON-HDL', cat: 'lipids', specimen_type: 'blood',
    current: '140', unit: 'mg/dL', optimal: 'lower, alongside apoB', blueprint: 'apoB is the better count',
    age_impact: 0.9, status: 'suboptimal', organs: ['heart', 'vascular'], evidence: '4/5',
    blurb: 'Total cholesterol minus HDL. A decent stand-in for atherogenic particles when you cannot get apoB. ApoB is still the clearer count.',
    mechanisms: ['Includes LDL and remnant cholesterol'],
    risks: 'Treating the calculated number without apoB, when apoB is available, throws away information.',
    studies: note('Guidelines use non-HDL when apoB is not on the panel. If you can order apoB, prefer it.'),
    dosage: 'Standard lipid panel math. Fasting is less critical than it used to be, but be consistent.',
    links: ['apob', 'omega3']
  }
];
