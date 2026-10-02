// The tuned rules, v4 (kinds trade off; growth accelerates while you stay; bolting while
// watched gives the hunters a head start). Strict refinement from v3, 2026-10-01:
// 60 configs x 24 policies x 150 seeds + twins = 219,600 games. v3's rules are in git history.
// nightLen 54 (+20% on 45): Jay, 2 Oct, for playtesting. Checked by scripts/check-lineage.mjs.
export const TUNED = {"hunterBase":7.215,"hunterNightScale":0.287,"hunterStart":2,"hunterPerNight":1,"reinforceEvery":12,"aggression":0.997,"fortify":1.17,"ambush":0.914,"attackRange":2,"lossK":0.3,"transitSpeed":3,"hearK":1.35,"remnant":0.285,"carryDecay":0.92,"diffusion":0.171,"respawnDelay":10,"transit":"exposed","combatNoise":1.4,"defenseDepart":2,"watchReact":0.209,"watchCap":8,"growth":1,"nightLen":54};
export const TUNED_NOTE = 'v4 strict refinement, 2026-10-01';
