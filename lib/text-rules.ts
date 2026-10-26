// Ascend's text rules as plain regexes, free of the catalog so client code
// (plan links) can use them too. The verifiers (lib/verify*.ts) apply them to
// every AI answer; lib/plan-store re-checks tailored text that arrives in a
// link before it is shown as the AI's.

const NUM_WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|half an?|a couple of|a few";
const TIME_UNIT = "minutes?|mins?|hours?|hrs?|weeks?|months?|days?|years?|yrs?|stars?";
export const NUMBER_UNIT_SRC = [
  // a time or a rating: "20 minutes", "a 6-week course", "three weeks", "half an hour", "4.8 stars"
  String.raw`(?:\d[\d,.]*|\b(?:${NUM_WORDS}))[\s-]*(?:${TIME_UNIT})\b`,
  String.raw`\ban\s+hour\b`,
  // a share
  String.raw`\d\s*(?:%|percent\b)`,
  // money: "₹499", "$49", "Rs 499", "INR 4,000", "100 rs"
  String.raw`[₹$€£]\s?\d|\b(?:rs\.?|inr|usd|eur|gbp)\s?\d|\d\s?(?:rs|inr|usd)\b`,
  // ratings and counts: "rated 4.7", "4.8/5", "4 of your 5 gaps"
  String.raw`\brat(?:ed|ings?)\b[^.]{0,20}\d|\b\d+(?:\.\d+)?\s*(?:\/|out of)\s*\d|\b\d+\s+of\s+(?:your|the|its)\s+\d`,
].join("|");

/**
 * A number the page should own: a time ("20 minutes", "a 6-week course",
 * "three weeks", "half an hour"), a price ("₹499", "Rs 499", "USD 49"), a share
 * ("50%"), a rating ("rated 4.7", "4.8 stars") or a count of gaps ("4 of your 5
 * gaps"). Bare years ("Updated in 2025") and phrases like "once a week" or
 * "three sentences" don't match.
 */
export const NUMBER_UNIT_RE = new RegExp(NUMBER_UNIT_SRC, "i");

/** An em or en dash, or an exclamation mark: both break Ascend's quiet voice. */
export const HAS_DASH = /[\u2014\u2013!]/;

/**
 * Hype and flattery. Words that collide with real catalog text ("User
 * journeys", "Amazing Meetings", "Empowered", "ideally") are deliberately not
 * here; the verifiers use hasHype() (lib/verify), which also ignores catalog
 * strings that do match.
 */
export const HYPE_RE =
  /unlock|supercharge|game-chang|\b(?:perfect|excellent|incredible|fantastic|transformative|invaluable|seamless(?:ly)?|next level|elevate|paralysis)\b/i;

/** A link or web address. */
export const URL_RE = /https?:|www\.|\.[a-z]{2,}\//i;
