// The tuned rules: the winning config of the strict refinement (reports/tune-strict-*.json),
// 2026-10-01. 70 configs x 24 policies x 150 seeds + twins = 255,600 games. Met 15 of 16
// targets; the miss was one-tick-late at 21% (target 25%).
export const TUNED = {"hunterBase":6.513,"hunterNightScale":0.351,"hunterStart":2,"hunterPerNight":1,"reinforceEvery":13,"aggression":0.997,"fortify":1.174,"ambush":1.116,"attackRange":2,"lossK":0.3,"transitSpeed":3,"hearK":1.315,"remnant":0.285,"carryDecay":0.92,"diffusion":0.156,"respawnDelay":8,"transit":"exposed"};
export const TUNED_NOTE = 'strict refinement, 2026-10-01: 15/16 targets';
