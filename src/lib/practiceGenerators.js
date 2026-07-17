import { mulberry32, randInt, randWithParity, thaiNumWords, enNumWords } from "./rng";
import { shuffle } from "./shuffle";

function genAddition(rng, lang) {
  const a = randInt(rng, 100, 500), b = randInt(rng, 100, 400), sum = a + b;
  const opts = shuffle([sum, sum + 10, sum - 10, sum + 1]).map(String);
  const q = lang === "en" ? `${a} + ${b} = ?` : `${a} + ${b} มีค่าเท่ากับเท่าไร`;
  return { q, choices: opts, correct: opts.indexOf(String(sum)) };
}
function genAdditionCarry(rng, lang) {
  let a, b, tries = 0;
  do {
    a = randInt(rng, 100, 799);
    b = randInt(rng, 100, 999 - a);
    tries++;
  } while ((a % 10) + (b % 10) < 10 && tries < 30);
  const sum = a + b;
  const opts = shuffle([sum, sum - 10, sum + 10, sum - 1]).map(String);
  const q = lang === "en" ? `${a} + ${b} = ? (careful — this one needs carrying!)` : `${a} + ${b} มีค่าเท่ากับเท่าไร (ข้อนี้ต้องทด)`;
  return { q, choices: opts, correct: opts.indexOf(String(sum)) };
}
function genSubtraction(rng, lang) {
  const a = randInt(rng, 400, 950), b = randInt(rng, 100, a - 50), diff = a - b;
  const opts = shuffle([diff, diff + 10, diff - 10, diff + 1]).map(String);
  const q = lang === "en" ? `${a} - ${b} = ?` : `${a} - ${b} มีค่าเท่ากับเท่าไร`;
  return { q, choices: opts, correct: opts.indexOf(String(diff)) };
}
function genSubtractionBorrow(rng, lang) {
  let a, b, tries = 0;
  do {
    a = randInt(rng, 300, 950);
    b = randInt(rng, 100, a - 20);
    tries++;
  } while (a % 10 >= b % 10 && tries < 30);
  const diff = a - b;
  const opts = shuffle([diff, diff + 10, diff - 10, diff + 1]).map(String);
  const q = lang === "en" ? `${a} - ${b} = ? (careful — you'll need to borrow!)` : `${a} - ${b} มีค่าเท่ากับเท่าไร (ข้อนี้ต้องขอยืม)`;
  return { q, choices: opts, correct: opts.indexOf(String(diff)) };
}
function genEvenOdd(rng, lang) {
  const askEven = rng() < 0.5;
  const correct = randWithParity(rng, 100, 899, askEven);
  const wrongs = [];
  while (wrongs.length < 3) {
    const n = randWithParity(rng, 100, 899, !askEven);
    if (n !== correct && !wrongs.includes(n)) wrongs.push(n);
  }
  const opts = shuffle([correct, ...wrongs]).map(String);
  const q = lang === "en" ? `Which number is ${askEven ? "even" : "odd"}?` : `ข้อใดคือจำนวน${askEven ? "คู่" : "คี่"}`;
  return { q, choices: opts, correct: opts.indexOf(String(correct)) };
}
function genCompare(rng, lang) {
  const a = randInt(rng, 100, 899);
  let b = randInt(rng, 100, 899);
  while (b === a) b = randInt(rng, 100, 899);
  const askGreater = rng() < 0.5;
  const correctNum = askGreater ? Math.max(a, b) : Math.min(a, b);
  const choices = shuffle([a, b]).map(String);
  const q = lang === "en" ? `Which number is ${askGreater ? "greater" : "less"}: ${a} or ${b}?` : `ข้อใดมีค่า${askGreater ? "มากกว่า" : "น้อยกว่า"} ระหว่าง ${a} กับ ${b}`;
  return { q, choices, correct: choices.indexOf(String(correctNum)) };
}
function genPlaceValue(rng, lang) {
  const n = randInt(rng, 100, 999);
  const digits = String(n).split("");
  const posIdx = randInt(rng, 0, 2);
  const posNameTh = ["หลักร้อย", "หลักสิบ", "หลักหน่วย"][posIdx];
  const posNameEn = ["hundreds place", "tens place", "ones place"][posIdx];
  const correctDigit = digits[posIdx];
  let opts = [...new Set([correctDigit, ...digits.filter((d, i) => i !== posIdx)])];
  while (opts.length < 3) {
    const d = String(randInt(rng, 0, 9));
    if (!opts.includes(d)) opts.push(d);
  }
  opts = shuffle(opts.slice(0, 3));
  const q = lang === "en" ? `In the number ${n}, what digit is in the ${posNameEn}?` : `เลข ${n} หลักใดคือ${posNameTh}`;
  return { q, choices: opts, correct: opts.indexOf(correctDigit) };
}
function genOrdering(rng, lang) {
  const nums = [];
  while (nums.length < 3) {
    const n = randInt(rng, 100, 899);
    if (!nums.includes(n)) nums.push(n);
  }
  const sorted = [...nums].sort((a, b) => a - b);
  const correctStr = sorted.join(", ");
  const variants = new Set([correctStr]);
  const opts = [correctStr];
  let tries = 0;
  while (opts.length < 4 && tries < 20) {
    const s = shuffle([...nums]).join(", ");
    if (!variants.has(s)) {
      variants.add(s);
      opts.push(s);
    }
    tries++;
  }
  const shuffled = shuffle(opts);
  const q = lang === "en" ? "Which order is from least to greatest?" : "ข้อใดเรียงลำดับจากน้อยไปมากถูกต้อง";
  return { q, choices: shuffled, correct: shuffled.indexOf(correctStr) };
}
function genWordAdd(rng, lang) {
  const a = randInt(rng, 50, 400), b = randInt(rng, 50, 400), sum = a + b;
  const opts = shuffle([sum, sum + 10, sum - 10, sum + 5]).map(String);
  const q = lang === "en" ? `A shop sold ${a} apples in the morning and ${b} apples in the afternoon. How many apples in total?` : `ร้านค้าขายแอปเปิ้ลตอนเช้า ${a} ผล ตอนบ่าย ${b} ผล ขายแอปเปิ้ลได้ทั้งหมดกี่ผล`;
  return { q, choices: opts, correct: opts.indexOf(String(sum)) };
}
function genWordSub(rng, lang) {
  const a = randInt(rng, 300, 900), b = randInt(rng, 50, a - 50), diff = a - b;
  const opts = shuffle([diff, diff + 10, diff - 10, diff + 5]).map(String);
  const q = lang === "en" ? `A farmer had ${a} eggs and sold ${b} of them. How many eggs are left?` : `ชาวนามีไข่ ${a} ฟอง ขายไป ${b} ฟอง เหลือไข่กี่ฟอง`;
  return { q, choices: opts, correct: opts.indexOf(String(diff)) };
}
const PRACTICE_GENERATORS = [genAddition, genAdditionCarry, genSubtraction, genSubtractionBorrow, genEvenOdd, genCompare, genPlaceValue, genOrdering, genWordAdd, genWordSub];
function buildPracticeSet(lang, setNum) {
  const rng = mulberry32(setNum * 7919 + (lang === "en" ? 104729 : 0));
  return PRACTICE_GENERATORS.map((fn) => fn(rng, lang));
}

export { buildPracticeSet };
