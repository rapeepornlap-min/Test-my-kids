import { shuffle } from "./shuffle";
import { QUIZ_DATA } from "../data/quizData";

export function prepareQuiz(subjectId, unitId) {
  const unit = QUIZ_DATA[subjectId].find((u) => u.id === unitId);
  return shuffle(unit.questions).map((item) => {
    const correctText = item.choices[item.correct];
    const shuffledChoices = shuffle(item.choices);
    return { q: item.q, choices: shuffledChoices, correct: shuffledChoices.indexOf(correctText) };
  });
}

export function buildUnitMenu(subjectId) {
  const units = QUIZ_DATA[subjectId];
  const menu = [];
  const groupIndex = {};
  units.forEach((u) => {
    if (u.group) {
      if (groupIndex[u.group] === undefined) {
        groupIndex[u.group] = menu.length;
        menu.push({ type: "group", name: u.group, units: [u] });
      } else {
        menu[groupIndex[u.group]].units.push(u);
      }
    } else {
      menu.push({ type: "unit", unit: u });
    }
  });
  return menu;
}

export function unitDisplayName(unit) {
  return unit.group ? `${unit.group} · ${unit.name}` : unit.name;
}

export function starsForPct(pct) {
  if (pct >= 0.9) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.3) return 1;
  return 0;
}

export function renderWithUnderline(text) {
  const parts = text.split(/__(.+?)__/g);
  return parts.map((part, i) => (i % 2 === 1 ? <u key={i}>{part}</u> : part));
}
