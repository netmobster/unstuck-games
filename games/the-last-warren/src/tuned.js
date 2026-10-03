// The tuned rules, v5 (spend people, free movement, the Nursery kind), 54-tick nights.
// Strict refinement from v4, 2 Oct 2026: 50 configs x 24 policies x 150 seeds + twins =
// 183,600 games, miss score 3.77 -> 0.33. Earlier versions' rules are in git history.
export const TUNED = {"hunterBase":7.731,"hunterNightScale":0.287,"hunterStart":2,"hunterPerNight":1,"reinforceEvery":11,"aggression":1.014,"fortify":1.041,"ambush":0.989,"attackRange":2,"lossK":0.304,"transitSpeed":3,"hearK":1.268,"remnant":0.328,"carryDecay":0.88,"diffusion":0.172,"respawnDelay":12,"transit":"tracks","combatNoise":1.439,"defenseDepart":2,"watchReact":0.079,"watchCap":7,"growth":1,"nurseryNoise":1.607,"nurseryGrowth":1,"nightLen":54};
export const TUNED_NOTE = 'v5 strict refinement, 2026-10-02';
