const GENDER_THEMES = {
  boy: {
    label: "นักเรียนชาย",
    color: "#4FC3F7",
    color2: "#8AD9FF",
    gradient: "linear-gradient(160deg, #8AD9FF, #4FC3F7)",
    levels: [
      { level: 1, minXp: 0, badge: "🌟", name: "นักเรียนตัวน้อย", img: "/characters/boy-lv1.jpg" },
      { level: 2, minXp: 150, badge: "⭐", name: "นักเรียนดาวรุ่ง", img: "/characters/boy-lv2.jpg" },
      { level: 3, minXp: 400, badge: "💫", name: "นักเรียนดาวเด่น", img: "/characters/boy-lv3.jpg" },
      { level: 4, minXp: 900, badge: "🦸", name: "ฮีโร่ผู้กล้า", img: "/characters/boy-lv4.jpg" },
      { level: 5, minXp: 1800, badge: "👑", name: "ฮีโร่มงกุฎทอง", img: "/characters/boy-lv5.jpg" },
    ],
  },
  girl: {
    label: "นักเรียนหญิง",
    color: "#FF8FA3",
    color2: "#FFB3C1",
    gradient: "linear-gradient(160deg, #FFB3C1, #FF8FA3)",
    levels: [
      { level: 1, minXp: 0, badge: "🌟", name: "นักเรียนตัวน้อย", img: "/characters/girl-lv1.jpg" },
      { level: 2, minXp: 150, badge: "⭐", name: "นักเรียนดาวรุ่ง", img: "/characters/girl-lv2.jpg" },
      { level: 3, minXp: 400, badge: "💫", name: "นักเรียนดาวเด่น", img: "/characters/girl-lv3.jpg" },
      { level: 4, minXp: 900, badge: "🦸", name: "ฮีโร่ผู้กล้า", img: "/characters/girl-lv4.jpg" },
      { level: 5, minXp: 1800, badge: "👑", name: "ฮีโร่มงกุฎทอง", img: "/characters/girl-lv5.jpg" },
    ],
  },
};

export function getCharacterInfo(xp, gender) {
  const theme = GENDER_THEMES[gender] || GENDER_THEMES.boy;
  const levels = theme.levels;
  let current = levels[0];
  let next = levels[1] || null;
  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i].minXp) {
      current = levels[i];
      next = levels[i + 1] || null;
    }
  }
  const progress = next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)), theme };
}

export { GENDER_THEMES };
