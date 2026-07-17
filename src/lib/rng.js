export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
export function randWithParity(rng, min, max, wantEven) {
  let n = randInt(rng, min, max);
  if (n % 2 === 0 !== wantEven) n = n + 1 > max ? n - 1 : n + 1;
  return n;
}
export function thaiNumWords(n) {
  const d = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  let s = "";
  if (h > 0) s += d[h] + "ร้อย";
  if (t > 0) s += t === 1 ? "สิบ" : t === 2 ? "ยี่สิบ" : d[t] + "สิบ";
  if (u > 0) s += u === 1 && t > 0 ? "เอ็ด" : d[u];
  return s || "ศูนย์";
}
export function enNumWords(n) {
  const ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const h = Math.floor(n / 100), r = n % 100;
  let s = "";
  if (h > 0) s += ones[h] + " hundred";
  if (r > 0) {
    if (s) s += " ";
    if (r < 20) s += ones[r];
    else s += tens[Math.floor(r / 10)] + (r % 10 > 0 ? "-" + ones[r % 10] : "");
  }
  return s || "zero";
}
