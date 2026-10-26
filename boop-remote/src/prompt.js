// Builds a research prompt a person can paste into Gemini, Claude or any web-capable assistant.
// Only non-sensitive preferences go in. Nothing here claims the external answer is verified.

const REGION = { 'CA-ON': 'Ontario, Canada', CA: 'Canada', outside: 'outside Canada' };
const HOURS = { lt10: 'under 10 hours a week', '10to20': '10–20 hours a week', '20to30': '20–30 hours a week', '30plus': '30+ hours a week' };
const INTERACTION = { text: 'mostly written (chat/email) communication', live: 'live calls or video are fine', independent: 'mostly independent work', mix: 'a mix of live and solo work' };
const GOALS = { fast: 'first earnings soon', stable: 'steady, predictable income', flexible: 'flexible side income', career: 'a longer-term career route', explore: 'exploring options' };

export function preferenceLines(p) {
  const lines = [];
  if (p.region) lines.push(`Location: ${REGION[p.region]}`);
  if (p.hours) lines.push(`Time available: ${HOURS[p.hours]}`);
  if (Array.isArray(p.windows) && p.windows.length) lines.push(`Can work: ${p.windows.join(', ')}${p.windowsFirm ? ' (firm)' : ''}`);
  if (p.interaction) lines.push(`Prefers: ${INTERACTION[p.interaction]}`);
  if (p.phone === 'no') lines.push('Phone/voice work: ruled out');
  else if (p.phone === 'prefer_not') lines.push('Phone/voice work: would rather avoid');
  if (Array.isArray(p.goals) && p.goals.length) lines.push(`Goals: ${p.goals.map(g => GOALS[g]).join('; ')}`);
  if (p.minPay > 0) lines.push(`Pay floor: about CAD $${p.minPay}/hour${p.minPayFirm ? ' (firm)' : ' (preference)'}`);
  if (Array.isArray(p.dealbreakers) && p.dealbreakers.length) lines.push(`Firm no: ${p.dealbreakers.join(', ').replace(/_/g, ' ')}`);
  return lines;
}

export function buildPrompt(rec, profile, today) {
  const country = profile.region === 'outside' ? 'my country' : profile.region === 'CA-ON' ? 'Ontario, Canada' : 'Canada';
  const prefs = preferenceLines(profile);
  return [
    `I'm researching whether this is a realistic way for me to earn. Please investigate it using current, primary sources and cite every claim with a link and date.`,
    ``,
    `Opportunity: ${rec.name}`,
    `Organization/platform: ${rec.organization}`,
    rec.officialUrl ? `Official website: ${rec.officialUrl}` : `Official website: not verified. Please find and confirm the official site first, and watch for look-alike domains.`,
    rec.applyUrl ? `Application/sign-up page: ${rec.applyUrl}` : null,
    rec.type === 'category' ? `Note: this is a kind of work, not a specific employer. Suggest 3–5 specific, legitimate places to pursue it in ${country}, with evidence.` : null,
    ``,
    prefs.length ? `My relevant preferences:\n${prefs.map(l => `- ${l}`).join('\n')}` : `I haven't shared preferences; keep the answer general.`,
    ``,
    `Please check and report:`,
    `1. Eligibility: does it currently accept people in ${country}? Quote the official page and give its date.`,
    `2. Availability: are applications or sign-ups open right now? Is there a waitlist, or reports of little or no work after joining? Date the evidence.`,
    `3. Pay: realistic pay and work volume. Separate official figures from self-reported ones. Include currency and whether pay is per hour, task or project.`,
    `4. Terms: employee or contractor? Any fees, commission, equipment costs, unpaid tests or unpaid training?`,
    `5. Worker experiences: recent reports (last 12 months if possible) from forums and review sites, with dates. Separate recurring patterns from one-off stories.`,
    `6. Red flags: common complaints, account deactivations, payment problems, scam impersonation (fake recruiters using this name), and any contradictory evidence.`,
    `7. Next step: the exact official link to apply or sign up, and what the process involves.`,
    ``,
    `Rules: use primary sources where possible. If something can't be verified, say "unknown". Don't guess or fill gaps. Don't present anecdotes as facts.`,
    `(Prepared ${today} with Opportunity Engine. The app's information may be out of date; please verify independently.)`,
  ].filter(x => x !== null).join('\n');
}

export const GEMINI_URL = 'https://gemini.google.com/app';
