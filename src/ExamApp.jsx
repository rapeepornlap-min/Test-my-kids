import { useState, useEffect, useRef, useMemo } from "react";
import { PROGRAMS, SUBJECTS } from "./data/subjects";
import { QUIZ_DATA } from "./data/quizData";
import { CARD_DATA } from "./data/cardData";
import { STORY_DATA } from "./data/storyData";
import { GENDER_THEMES, getCharacterInfo } from "./data/characterThemes";
import { shuffle } from "./lib/shuffle";
import { prepareQuiz, buildUnitMenu, unitDisplayName, starsForPct, renderWithUnderline } from "./lib/quizUtils";
import StarRow from "./components/StarRow";
import Confetti from "./components/Confetti";

const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];
const DEFAULT_QUIZ_SECONDS = 20;
const MASCOT_LINES = [
  "สวัสดีจ้า! วันนี้อยากติวเรื่องอะไรดีนะ?",
  "พร้อมลุยข้อสอบหรือยัง เลือกวิชาได้เลย!",
  "ฝึกทุกวัน เก่งขึ้นทุกวันแน่นอน สู้ ๆ นะ!",
];

async function fetchLeaderboardApi() {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("โหลดกระดานเพื่อนไม่สำเร็จ");
  return res.json();
}

async function pushLeaderboardApi(nickname, xp, gender, level) {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, xp, gender, level }),
  });
  if (!res.ok) throw new Error("อัปเดตกระดานเพื่อนไม่สำเร็จ");
  return res.json();
}

// `profile` = { nickname, gender, xp, attempts, mastery } — persisted to localStorage by the parent (App.jsx)
export default function ExamApp({ profile, onProfileUpdate, onReset }) {
  const [screen, setScreen] = useState("home");
  const [program, setProgram] = useState("tp");
  const [pickerSubject, setPickerSubject] = useState(null);
  const [unitPicker, setUnitPicker] = useState(null);
  const [groupPicker, setGroupPicker] = useState(null);
  const [deckPicker, setDeckPicker] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [storyPicker, setStoryPicker] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [showGenderPrompt, setShowGenderPrompt] = useState(false);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [xpGained, setXpGained] = useState(0);
  const mascotLine = useMemo(() => MASCOT_LINES[Math.floor(Math.random() * MASCOT_LINES.length)], []);

  const nickname = profile.nickname;
  const gender = profile.gender;
  const stats = { attempts: profile.attempts || [], mastery: profile.mastery || {}, xp: profile.xp || 0 };

  // quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [results, setResults] = useState([]);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUIZ_SECONDS);
  const timerRef = useRef(null);

  // flashcard state
  const [deck, setDeck] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownIdx, setUnknownIdx] = useState([]);

  // story reading state
  const [currentStory, setCurrentStory] = useState(null);
  const [storyIndex, setStoryIndex] = useState(0);

  const loadLeaderboard = async () => {
    try {
      const data = await fetchLeaderboardApi();
      setLeaderboard(data);
    } catch (e) {
      setLeaderboard([]);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const updateLeaderboard = async (name, xp, genderOverride) => {
    if (!name) return;
    try {
      const info = getCharacterInfo(xp, genderOverride || gender);
      const board = await pushLeaderboardApi(name, xp, genderOverride || gender || "boy", info.current.level);
      setLeaderboard(board);
    } catch (e) {
      console.error("อัปเดตกระดานผู้เล่นไม่สำเร็จ", e);
    }
  };

  const saveStats = (newStats) => {
    onProfileUpdate({ ...profile, attempts: newStats.attempts, mastery: newStats.mastery, xp: newStats.xp });
  };

  const saveGender = (g) => {
    onProfileUpdate({ ...profile, gender: g });
    setShowGenderPrompt(false);
    if (nickname) updateLeaderboard(nickname, stats.xp || 0, g);
    else setShowNicknamePrompt(true);
  };

  const saveNickname = (name) => {
    onProfileUpdate({ ...profile, nickname: name });
    setShowNicknamePrompt(false);
    updateLeaderboard(name, stats.xp || 0, gender);
  };

  const subject = (id) => SUBJECTS.find((s) => s.id === id);

  const bestPctForSubject = (subjectId) => {
    const attempts = stats.attempts.filter((a) => a.subject === subjectId);
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map((a) => a.score / a.total));
  };

  const startQuiz = (subjectId, unitId) => {
    setPickerSubject(null);
    setUnitPicker(null);
    setGroupPicker(null);
    setSelectedSubject(subjectId);
    const unit = QUIZ_DATA[subjectId].find((u) => u.id === unitId);
    setSelectedUnit(unit);
    setQuizQuestions(prepareQuiz(subjectId, unitId));
    setCurrentIndex(0);
    setScore(0);
    setResults([]);
    setScreen("quiz");
  };

  const startFlashcards = (subjectId, deckId) => {
    setPickerSubject(null);
    setDeckPicker(null);
    setSelectedSubject(subjectId);
    const deckDef = CARD_DATA[subjectId].find((d) => d.id === deckId);
    setSelectedDeck(deckDef);
    setDeck(shuffle(deckDef.cards));
    setCardIndex(0);
    setKnownCount(0);
    setUnknownIdx([]);
    setFlipped(false);
    setScreen("flashcard");
  };

  const startStory = (subjectId, storyId) => {
    setPickerSubject(null);
    setSelectedSubject(subjectId);
    const story = STORY_DATA[subjectId].find((s) => s.id === storyId);
    setCurrentStory(story);
    setStoryIndex(0);
    setScreen("story");
  };

  // quiz timer
  useEffect(() => {
    if (screen !== "quiz" || quizQuestions.length === 0) return;
    const quizSeconds = subject(selectedSubject)?.quizSeconds || DEFAULT_QUIZ_SECONDS;
    setTimeLeft(quizSeconds);
    setSelectedChoice(null);
    setLocked(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, screen]);

  // celebrate on quiz summary
  useEffect(() => {
    if (screen === "quizSummary") {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2200);
      return () => clearTimeout(t);
    }
  }, [screen]);

  const goNext = (finalScore, finalResults) => {
    if (currentIndex + 1 >= quizQuestions.length) {
      finishQuiz(finalScore, finalResults);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleTimeout = () => {
    setLocked(true);
    setResults((prev) => {
      const next = [...prev, false];
      setTimeout(() => goNext(score, next), 1100);
      return next;
    });
  };

  const handleSelectChoice = (idx) => {
    if (locked) return;
    clearInterval(timerRef.current);
    const correct = idx === quizQuestions[currentIndex].correct;
    setSelectedChoice(idx);
    setLocked(true);
    const newScore = correct ? score + 1 : score;
    setScore(newScore);
    setResults((prev) => {
      const next = [...prev, correct];
      setTimeout(() => goNext(newScore, next), 1100);
      return next;
    });
  };

  const finishQuiz = (finalScore, finalResults) => {
    const attempt = {
      subject: selectedSubject,
      score: finalScore,
      total: quizQuestions.length,
      date: new Date().toISOString(),
    };
    const earnedXp = finalScore * 10 + 20;
    const newXp = (stats.xp || 0) + earnedXp;
    const newStats = { ...stats, attempts: [...stats.attempts, attempt].slice(-30), xp: newXp };
    saveStats(newStats);
    setXpGained(earnedXp);
    if (nickname) updateLeaderboard(nickname, newXp, gender);
    setScreen("quizSummary");
  };

  const markCard = (isKnown) => {
    const newKnown = isKnown ? knownCount + 1 : knownCount;
    const newUnknown = isKnown ? unknownIdx : [...unknownIdx, cardIndex];
    setKnownCount(newKnown);
    setUnknownIdx(newUnknown);
    if (cardIndex + 1 >= deck.length) {
      const newStats = {
        ...stats,
        mastery: { ...stats.mastery, [selectedSubject]: (stats.mastery[selectedSubject] || 0) + newKnown },
      };
      saveStats(newStats);
      setScreen("flashcardSummary");
    } else {
      setCardIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const reviewUnknown = () => {
    const reviewDeck = unknownIdx.map((i) => deck[i]);
    setDeck(reviewDeck);
    setCardIndex(0);
    setKnownCount(0);
    setUnknownIdx([]);
    setFlipped(false);
    setScreen("flashcard");
  };

  const goHome = () => {
    clearInterval(timerRef.current);
    setScreen("home");
    setPickerSubject(null);
    setUnitPicker(null);
    setGroupPicker(null);
    setDeckPicker(null);
    setStoryPicker(null);
  };

  const totalAttempts = stats.attempts.length;
  const avgAccuracy =
    totalAttempts > 0
      ? Math.round((stats.attempts.reduce((sum, a) => sum + a.score / a.total, 0) / totalAttempts) * 100)
      : null;
  const totalMastered = Object.values(stats.mastery).reduce((a, b) => a + b, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF6E5 0%, #EAF6FF 40%, #D6EEFF 100%)",
        fontFamily: "'Mali', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative background blobs */}
      <div className="pointer-events-none fixed -top-16 -left-16 w-64 h-64 rounded-full opacity-50" style={{ background: "#FFD93D", filter: "blur(55px)" }} />
      <div className="pointer-events-none fixed top-32 -right-20 w-72 h-72 rounded-full opacity-40" style={{ background: "#4FC3F7", filter: "blur(65px)" }} />
      <div className="pointer-events-none fixed bottom-0 left-1/4 w-80 h-80 rounded-full opacity-30" style={{ background: "#6BCB77", filter: "blur(70px)" }} />
      <div className="pointer-events-none fixed top-6 right-8 text-3xl float-slow">⭐</div>
      <div className="pointer-events-none fixed top-24 left-6 text-2xl float-slow" style={{ animationDelay: "1s" }}>✨</div>

      <Confetti active={showConfetti} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ---------------- HOME ---------------- */}
        {screen === "home" && (
          <div className="max-w-3xl mx-auto px-5 pt-8 pb-16">
            <h1 className="font-display text-3xl sm:text-4xl text-center" style={{ color: "#4A3F35" }}>
              ห้องติวสอบกลางภาค 🎈
            </h1>
            <p className="font-body text-center mt-2" style={{ color: "#7A6E5E" }}>
              ร.ร.สารสาสน์วิเทศร่มเกล้า · ป.2 · ภาคเรียนที่ 1/2569
            </p>
            <p className="font-body text-center text-xs mt-1" style={{ color: "#9C8F7C" }}>
              สอบ 20–24 กรกฎาคม 2569
            </p>

            <div className="text-right">
              <button onClick={onReset} className="font-body text-xs underline" style={{ color: "#9C8F7C" }}>
                ออกจากระบบ (เปลี่ยนผู้เล่น)
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 mt-5">
              <div className="text-5xl mascot-wiggle">🦉</div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-md max-w-xs" style={{ color: "#4A3F35" }}>
                <span className="font-display">ครูฮูก:</span> <span className="font-body">{mascotLine}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setScreen("character");
                loadLeaderboard();
                if (!gender) setShowGenderPrompt(true);
                else if (!nickname) setShowNicknamePrompt(true);
              }}
              className="w-full mt-5 rounded-3xl p-4 flex items-center gap-4 shadow-md transition-transform active:scale-95"
              style={{ background: gender ? getCharacterInfo(0, gender).theme.gradient : "linear-gradient(135deg, #B18CFE, #8AD9FF)" }}
            >
              <div className="relative shrink-0">
                <img
                  src={getCharacterInfo(stats.xp || 0, gender).current.img}
                  alt="ตัวละคร"
                  className="w-16 h-16 rounded-full object-cover shadow-md"
                  style={{ border: "3px solid white" }}
                />
                <div
                  className="absolute -bottom-1 -right-1 text-lg rounded-full flex items-center justify-center shadow"
                  style={{ width: 26, height: 26, backgroundColor: "#FFFFFF" }}
                >
                  {getCharacterInfo(stats.xp || 0, gender).current.badge}
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="font-display text-white text-base">{getCharacterInfo(stats.xp || 0, gender).current.name}</div>
                <div className="font-body text-xs text-white/90 mt-0.5">
                  เลเวล {getCharacterInfo(stats.xp || 0, gender).current.level} · {stats.xp || 0} XP
                </div>
                <div className="h-2 rounded-full bg-white/30 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${getCharacterInfo(stats.xp || 0, gender).progress * 100}%`, backgroundColor: "#FFD93D" }}
                  />
                </div>
              </div>
              <div className="font-display text-white text-2xl">›</div>
            </button>

            <div className="mt-7 rounded-3xl p-4 grid grid-cols-3 gap-3 bg-white shadow-md">
              <div className="text-center">
                <div className="text-2xl">📝</div>
                <div className="font-display text-xl mt-1" style={{ color: "#4A3F35" }}>
                  {totalAttempts}
                </div>
                <div className="font-body text-xs mt-0.5" style={{ color: "#9C8F7C" }}>
                  ครั้งที่ทำโจทย์
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🎯</div>
                <div className="font-display text-xl mt-1" style={{ color: "#4A3F35" }}>
                  {avgAccuracy !== null ? `${avgAccuracy}%` : "-"}
                </div>
                <div className="font-body text-xs mt-0.5" style={{ color: "#9C8F7C" }}>
                  ความแม่นยำเฉลี่ย
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🗂️</div>
                <div className="font-display text-xl mt-1" style={{ color: "#4A3F35" }}>
                  {totalMastered}
                </div>
                <div className="font-body text-xs mt-0.5" style={{ color: "#9C8F7C" }}>
                  การ์ดที่จำได้สะสม
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-7">
              {PROGRAMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProgram(p.id)}
                  className="font-display text-sm px-4 py-2 rounded-full shadow-md transition-transform active:scale-95"
                  style={
                    program === p.id
                      ? { backgroundColor: "#4A3F35", color: "#FFFFFF" }
                      : { backgroundColor: "#FFFFFF", color: "#4A3F35", border: "2px solid #EFE7DA" }
                  }
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
              {SUBJECTS.filter((s) => s.program === program).map((s) => {
                const bestPct = bestPctForSubject(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setPickerSubject(s.id)}
                    className="relative h-44 rounded-[28px] shadow-lg text-left p-4 flex flex-col justify-between transition-transform hover:-translate-y-1 hover:scale-[1.02]"
                    style={{ background: `linear-gradient(160deg, ${s.color2}, ${s.color})`, border: "4px solid white" }}
                  >
                    {bestPct === null ? (
                      <div
                        className="absolute -top-2 -right-2 font-display text-xs px-2 py-1 rounded-full shadow"
                        style={{ backgroundColor: "#FFD93D", color: "#4A3F35" }}
                      >
                        ใหม่!
                      </div>
                    ) : (
                      <div className="absolute -top-2 -right-2 bg-white rounded-full px-2 py-1 shadow text-sm">
                        <StarRow count={starsForPct(bestPct)} size="text-sm" />
                      </div>
                    )}
                    <div className="text-4xl">{s.icon}</div>
                    <div>
                      <div className="font-display text-white text-lg leading-tight" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
                        {s.name}
                      </div>
                      <div className="font-body text-xs mt-1" style={{ color: "rgba(255,255,255,0.9)" }}>
                        ป.2 · แตะเพื่อเริ่ม
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* mode picker modal */}
        {pickerSubject && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setPickerSubject(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                {subject(pickerSubject).icon} {subject(pickerSubject).name}
              </div>
              <button
                onClick={() => {
                  const units = QUIZ_DATA[pickerSubject];
                  if (units.length === 1) {
                    startQuiz(pickerSubject, units[0].id);
                  } else {
                    setUnitPicker(pickerSubject);
                    setPickerSubject(null);
                  }
                }}
                className="w-full py-3 rounded-full font-display text-white mb-3 shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: "#4FC3F7" }}
              >
                📝 ทำแบบทดสอบ (จับเวลา)
              </button>
              <button
                onClick={() => {
                  const decks = CARD_DATA[pickerSubject];
                  if (decks.length === 1) {
                    startFlashcards(pickerSubject, decks[0].id);
                  } else {
                    setDeckPicker(pickerSubject);
                    setPickerSubject(null);
                  }
                }}
                className="w-full py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: "#6BCB77" }}
              >
                🗂️ ทบทวนแฟลชการ์ด
              </button>
              {STORY_DATA[pickerSubject] && (
                <button
                  onClick={() => {
                    const stories = STORY_DATA[pickerSubject];
                    if (stories.length === 1) {
                      startStory(pickerSubject, stories[0].id);
                    } else {
                      setStoryPicker(pickerSubject);
                      setPickerSubject(null);
                    }
                  }}
                  className="w-full py-3 rounded-full font-display text-white mt-3 shadow-md transition-transform active:scale-95"
                  style={{ backgroundColor: "#FFB84C" }}
                >
                  📖 อ่านนิทานทบทวน
                </button>
              )}
              <button onClick={() => setPickerSubject(null)} className="w-full py-2 mt-3 font-body text-sm" style={{ color: "#B0A392" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* unit picker modal */}
        {unitPicker && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setUnitPicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                {subject(unitPicker).icon} {subject(unitPicker).name} · เลือกหน่วยที่จะสอบ
              </div>
              <div className="flex flex-col gap-3">
                {buildUnitMenu(unitPicker).map((entry, i) =>
                  entry.type === "unit" ? (
                    <button
                      key={entry.unit.id}
                      onClick={() => startQuiz(unitPicker, entry.unit.id)}
                      className="w-full py-3 rounded-2xl font-display text-white text-left px-4 shadow-md transition-transform active:scale-95"
                      style={{ backgroundColor: subject(unitPicker).color }}
                    >
                      {entry.unit.name} <span className="font-body text-xs font-normal">({entry.unit.questions.length} ข้อ)</span>
                    </button>
                  ) : (
                    <button
                      key={entry.name + i}
                      onClick={() => {
                        setGroupPicker({ subjectId: unitPicker, name: entry.name, units: entry.units });
                        setUnitPicker(null);
                      }}
                      className="w-full py-3 rounded-2xl font-display text-white text-left px-4 shadow-md transition-transform active:scale-95"
                      style={{ backgroundColor: subject(unitPicker).dark }}
                    >
                      {entry.name} <span className="font-body text-xs font-normal">({entry.units.length} ชุด)</span>
                    </button>
                  )
                )}
              </div>
              <button onClick={() => setUnitPicker(null)} className="w-full py-2 mt-3 font-body text-sm" style={{ color: "#B0A392" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* story picker modal */}
        {storyPicker && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setStoryPicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                {subject(storyPicker).icon} {subject(storyPicker).name} · เลือกนิทานที่จะอ่าน
              </div>
              <div className="flex flex-col gap-3">
                {STORY_DATA[storyPicker].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => startStory(storyPicker, s.id)}
                    className="w-full py-3 rounded-2xl font-display text-white text-left px-4 shadow-md transition-transform active:scale-95"
                    style={{ backgroundColor: "#FFB84C" }}
                  >
                    📖 {s.title} <span className="font-body text-xs font-normal">({s.pages.length} หน้า)</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStoryPicker(null)} className="w-full py-2 mt-3 font-body text-sm" style={{ color: "#B0A392" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* flashcard deck picker modal */}
        {deckPicker && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setDeckPicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                {subject(deckPicker).icon} {subject(deckPicker).name} · เลือกหัวข้อที่จะทบทวน
              </div>
              <div className="flex flex-col gap-3">
                {CARD_DATA[deckPicker].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => startFlashcards(deckPicker, d.id)}
                    className="w-full py-3 rounded-2xl font-display text-white text-left px-4 shadow-md transition-transform active:scale-95"
                    style={{ backgroundColor: subject(deckPicker).color }}
                  >
                    {d.name} <span className="font-body text-xs font-normal">({d.cards.length} คำ)</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setDeckPicker(null)} className="w-full py-2 mt-3 font-body text-sm" style={{ color: "#B0A392" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}


        {groupPicker && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setGroupPicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                {subject(groupPicker.subjectId).icon} {groupPicker.name}
              </div>
              <div className="flex flex-col gap-3">
                {groupPicker.units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => startQuiz(groupPicker.subjectId, unit.id)}
                    className="w-full py-3 rounded-2xl font-display text-white text-left px-4 shadow-md transition-transform active:scale-95"
                    style={{ backgroundColor: subject(groupPicker.subjectId).color }}
                  >
                    {unit.name} <span className="font-body text-xs font-normal">({unit.questions.length} ข้อ)</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setUnitPicker(groupPicker.subjectId);
                  setGroupPicker(null);
                }}
                className="w-full py-2 mt-3 font-body text-sm"
                style={{ color: "#B0A392" }}
              >
                ← ย้อนกลับ
              </button>
            </div>
          </div>
        )}

        {/* ---------------- QUIZ ---------------- */}
        {screen === "quiz" && quizQuestions.length > 0 && (
          <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
            <div className="flex items-center justify-between">
              <button onClick={goHome} className="font-body text-sm" style={{ color: "#7A6E5E" }}>
                ← กลับ
              </button>
              <div className="font-display text-sm text-right" style={{ color: "#4A3F35" }}>
                {subject(selectedSubject).icon} {selectedUnit ? unitDisplayName(selectedUnit) : subject(selectedSubject).name} · ข้อ {currentIndex + 1}/{quizQuestions.length}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="text-xl">⏳</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden bg-white shadow-inner">
                <div
                  className="h-full transition-all rounded-full"
                  style={{
                    width: `${(timeLeft / (subject(selectedSubject).quizSeconds || DEFAULT_QUIZ_SECONDS)) * 100}%`,
                    backgroundColor:
                      timeLeft > (subject(selectedSubject).quizSeconds || DEFAULT_QUIZ_SECONDS) * 0.5
                        ? "#6BCB77"
                        : timeLeft > (subject(selectedSubject).quizSeconds || DEFAULT_QUIZ_SECONDS) * 0.25
                        ? "#FFD93D"
                        : "#FF6B81",
                  }}
                />
              </div>
              <div className="font-display text-lg w-14 text-right" style={{ color: timeLeft > 5 ? "#4A3F35" : "#FF6B81" }}>
                {timeLeft >= 60 ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}` : timeLeft}
              </div>
            </div>

            <div className="mt-6 rounded-[28px] p-5 shadow-lg" style={{ backgroundColor: "#FFFFFF", border: `4px solid ${subject(selectedSubject).color2}` }}>
              <div className="font-body font-semibold text-lg" style={{ color: "#4A3F35" }}>
                {renderWithUnderline(quizQuestions[currentIndex].q)}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {quizQuestions[currentIndex].choices.map((choice, idx) => {
                  let bg = "#FBF9F5";
                  let border = "#EFE7DA";
                  let anim = "";
                  if (locked) {
                    if (idx === quizQuestions[currentIndex].correct) {
                      bg = "#E3F7E5";
                      border = "#6BCB77";
                      anim = "pop";
                    } else if (idx === selectedChoice) {
                      bg = "#FFE6EA";
                      border = "#FF6B81";
                      anim = "shake";
                    }
                  } else if (idx === selectedChoice) {
                    bg = "#E8F6FF";
                    border = "#4FC3F7";
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectChoice(idx)}
                      disabled={locked}
                      className={`flex items-center gap-3 text-left px-4 py-3 rounded-2xl border-2 transition ${anim}`}
                      style={{ backgroundColor: bg, borderColor: border }}
                    >
                      <span
                        className="font-display w-8 h-8 flex items-center justify-center rounded-full text-sm shrink-0 shadow-sm"
                        style={{ backgroundColor: subject(selectedSubject).color, color: "#FFFFFF" }}
                      >
                        {CHOICE_LABELS[idx]}
                      </span>
                      <span className="font-body" style={{ color: "#4A3F35" }}>
                        {choice}
                      </span>
                    </button>
                  );
                })}
              </div>

              {locked && (
                <div className="mt-4 text-center font-display text-lg bounce-in" style={{ color: selectedChoice === quizQuestions[currentIndex].correct ? "#4CAE58" : "#FF6B81" }}>
                  {selectedChoice === quizQuestions[currentIndex].correct ? "🎉 เก่งมาก!" : "💪 ไม่เป็นไร ลองข้อต่อไปนะ"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- QUIZ SUMMARY ---------------- */}
        {screen === "quizSummary" && (
          <div className="max-w-xl mx-auto px-5 pt-10 pb-16 text-center">
            <div className="text-5xl mascot-wiggle">{starsForPct(score / quizQuestions.length) >= 2 ? "🦉🎉" : "🦉"}</div>
            <div className="font-display text-lg mt-2" style={{ color: "#4A3F35" }}>
              {subject(selectedSubject).icon} {selectedUnit ? unitDisplayName(selectedUnit) : subject(selectedSubject).name}
            </div>
            <div className="font-display text-5xl mt-4" style={{ color: "#4A3F35" }}>
              {score}/{quizQuestions.length}
            </div>
            <div className="mt-2">
              <StarRow count={starsForPct(score / quizQuestions.length)} size="text-4xl" />
            </div>
            <div className="font-body mt-2" style={{ color: "#7A6E5E" }}>
              ทำถูก {Math.round((score / quizQuestions.length) * 100)}%
            </div>
            <div
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full font-display bounce-in"
              style={{ backgroundColor: "#FFD93D", color: "#4A3F35" }}
            >
              ✨ ได้รับ {xpGained} XP!
            </div>

            <div className="mt-6 rounded-[28px] p-4 text-left bg-white shadow-md">
              {quizQuestions.map((q, idx) => (
                <div key={idx} className="flex items-start gap-2 py-2" style={{ borderTop: idx > 0 ? "1px solid #F0E9DC" : "none" }}>
                  <span>{results[idx] ? "✅" : "❌"}</span>
                  <span className="font-body text-sm" style={{ color: "#4A3F35" }}>
                    {renderWithUnderline(q.q)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => startQuiz(selectedSubject, selectedUnit.id)}
                className="flex-1 py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: subject(selectedSubject).color }}
              >
                ทำอีกครั้ง
              </button>
              <button onClick={goHome} className="flex-1 py-3 rounded-full font-display shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#FFFFFF", color: "#4A3F35", border: "2px solid #EFE7DA" }}>
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        )}

        {/* ---------------- FLASHCARD ---------------- */}
        {screen === "flashcard" && deck.length > 0 && (
          <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
            <div className="flex items-center justify-between">
              <button onClick={goHome} className="font-body text-sm" style={{ color: "#7A6E5E" }}>
                ← กลับ
              </button>
              <div className="font-display text-sm" style={{ color: "#4A3F35" }}>
                {subject(selectedSubject).icon} {selectedDeck ? selectedDeck.name : subject(selectedSubject).name} · การ์ด {cardIndex + 1}/{deck.length}
              </div>
            </div>

            <div className="mt-6" style={{ perspective: "1000px" }}>
              <div
                onClick={() => setFlipped((f) => !f)}
                className="relative w-full cursor-pointer flip-inner"
                style={{ height: "30rem", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
              >
                <div
                  className="absolute inset-0 rounded-[28px] flex items-center justify-center p-6 flip-face shadow-lg"
                  style={{ backgroundColor: "#FFFFFF", border: `4px solid ${subject(selectedSubject).color2}` }}
                >
                  <div className="font-body font-semibold text-3xl text-center" style={{ color: "#4A3F35" }}>
                    {deck[cardIndex].front}
                  </div>
                </div>
                <div
                  className="absolute inset-0 rounded-[28px] flex items-start justify-center p-6 flip-face flip-back shadow-lg"
                  style={{ background: `linear-gradient(160deg, ${subject(selectedSubject).color2}, ${subject(selectedSubject).color})` }}
                >
                  <div className="text-left overflow-y-auto max-h-full text-white my-auto w-full">
                    <div className="font-body text-lg" style={{ whiteSpace: "pre-line", lineHeight: 1.6 }}>
                      {deck[cardIndex].back}
                    </div>
                    {deck[cardIndex].work && (
                      <div
                        className="mt-3 rounded-lg p-4 inline-block"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.18)",
                          fontFamily: "'Courier New', monospace",
                          whiteSpace: "pre",
                          fontSize: "1.4rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {deck[cardIndex].work}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="font-body text-center text-xs mt-3" style={{ color: "#9C8F7C" }}>
              แตะการ์ดเพื่อพลิกดูคำตอบ 🔄
            </p>

            <div className="flex gap-3 mt-6">
              <button onClick={() => markCard(false)} className="flex-1 py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#FF6B81" }}>
                ยังไม่ค่อยแม่น
              </button>
              <button onClick={() => markCard(true)} className="flex-1 py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#6BCB77" }}>
                จำได้แล้ว ✓
              </button>
            </div>
          </div>
        )}

        {/* ---------------- FLASHCARD SUMMARY ---------------- */}
        {screen === "flashcardSummary" && (
          <div className="max-w-xl mx-auto px-5 pt-10 pb-16 text-center">
            <div className="text-5xl mascot-wiggle">🦉</div>
            <div className="font-display text-lg mt-2" style={{ color: "#4A3F35" }}>
              {subject(selectedSubject).icon} {selectedDeck ? selectedDeck.name : subject(selectedSubject).name}
            </div>
            <div className="font-display text-5xl mt-4" style={{ color: "#4A3F35" }}>
              {knownCount}/{deck.length}
            </div>
            <div className="font-body mt-1" style={{ color: "#7A6E5E" }}>
              การ์ดที่จำได้
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {unknownIdx.length > 0 && (
                <button onClick={reviewUnknown} className="py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#FFB84C" }}>
                  ทบทวนคำที่ยังไม่แม่น ({unknownIdx.length})
                </button>
              )}
              <button
                onClick={() => startFlashcards(selectedSubject, selectedDeck.id)}
                className="py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: subject(selectedSubject).color }}
              >
                เริ่มชุดใหม่
              </button>
              <button onClick={goHome} className="py-3 rounded-full font-display shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#FFFFFF", color: "#4A3F35", border: "2px solid #EFE7DA" }}>
                กลับหน้าหลัก
              </button>
            </div>
          </div>
        )}

        {/* ---------------- CHARACTER / LEADERBOARD ---------------- */}
        {screen === "character" && (
          <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
            <div className="flex items-center justify-between">
              <button onClick={goHome} className="font-body text-sm" style={{ color: "#7A6E5E" }}>
                ← กลับ
              </button>
              <div className="font-display text-sm" style={{ color: "#4A3F35" }}>
                🎮 ตัวละครของฉัน
              </div>
            </div>

            <div className="mt-6 rounded-[28px] p-6 text-center shadow-lg" style={{ background: getCharacterInfo(stats.xp || 0, gender).theme.gradient }}>
              <div className="relative inline-block bounce-in">
                <img
                  src={getCharacterInfo(stats.xp || 0, gender).current.img}
                  alt="ตัวละครของฉัน"
                  className="w-40 h-40 rounded-full object-cover shadow-lg mx-auto"
                  style={{ border: "5px solid white" }}
                />
                <div
                  className="absolute -bottom-1 -right-1 text-3xl rounded-full flex items-center justify-center shadow-lg"
                  style={{ width: 54, height: 54, backgroundColor: "#FFFFFF" }}
                >
                  {getCharacterInfo(stats.xp || 0, gender).current.badge}
                </div>
              </div>
              <div className="font-display text-white text-xl mt-3">{getCharacterInfo(stats.xp || 0, gender).current.name}</div>
              <div className="font-body text-white/90 text-sm mt-1">
                เลเวล {getCharacterInfo(stats.xp || 0, gender).current.level} · {stats.xp || 0} XP
              </div>
              <div className="h-3 rounded-full bg-white/30 mt-4 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${getCharacterInfo(stats.xp || 0, gender).progress * 100}%`, backgroundColor: "#FFD93D" }}
                />
              </div>
              {getCharacterInfo(stats.xp || 0, gender).next && (
                <div className="font-body text-white/80 text-xs mt-2">
                  อีก {getCharacterInfo(stats.xp || 0, gender).next.minXp - (stats.xp || 0)} XP จะอัปเกรดเป็น{" "}
                  {getCharacterInfo(stats.xp || 0, gender).next.badge} {getCharacterInfo(stats.xp || 0, gender).next.name}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl p-4 bg-white shadow-md flex items-center justify-between">
              <div>
                <div className="font-body text-xs" style={{ color: "#9C8F7C" }}>
                  ชื่อผู้เล่น
                </div>
                <div className="font-display text-lg" style={{ color: "#4A3F35" }}>
                  {nickname || "ยังไม่ได้ตั้งชื่อ"}
                </div>
              </div>
              <button
                onClick={() => {
                  setNicknameInput(nickname);
                  setShowNicknamePrompt(true);
                }}
                className="font-body text-sm px-4 py-2 rounded-full"
                style={{ backgroundColor: "#EAF1F7", color: "#2E86AB" }}
              >
                {nickname ? "แก้ไขชื่อ" : "ตั้งชื่อ"}
              </button>
            </div>

            <div className="mt-3 rounded-2xl p-4 bg-white shadow-md flex items-center justify-between">
              <div>
                <div className="font-body text-xs" style={{ color: "#9C8F7C" }}>
                  ตัวละคร
                </div>
                <div className="font-display text-lg" style={{ color: "#4A3F35" }}>
                  {gender ? GENDER_THEMES[gender].label : "ยังไม่ได้เลือก"}
                </div>
              </div>
              <button
                onClick={() => setShowGenderPrompt(true)}
                className="font-body text-sm px-4 py-2 rounded-full"
                style={{ backgroundColor: "#EAF1F7", color: "#2E86AB" }}
              >
                เปลี่ยนตัวละคร
              </button>
            </div>

            <div className="mt-6">
              <div className="font-display text-base mb-3" style={{ color: "#4A3F35" }}>
                🏆 กระดานเพื่อน (แข่งกับเพื่อนที่ใช้แอปนี้)
              </div>
              {leaderboard.length === 0 ? (
                <div className="font-body text-sm text-center py-6 rounded-2xl bg-white shadow-md" style={{ color: "#9C8F7C" }}>
                  ยังไม่มีใครขึ้นกระดานเลย ตั้งชื่อแล้วลองทำแบบฝึกหัดดูสิ!
                </div>
              ) : (
                <div className="rounded-2xl bg-white shadow-md overflow-hidden">
                  {leaderboard.slice(0, 20).map((p, i) => (
                    <div
                      key={p.name + i}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        borderTop: i > 0 ? "1px solid #F0E9DC" : "none",
                        backgroundColor: p.name === nickname ? "#FFF6E0" : "transparent",
                      }}
                    >
                      <div className="font-display w-6 text-center" style={{ color: "#9C8F7C" }}>
                        {i + 1}
                      </div>
                      <div className="relative shrink-0">
                        <img
                          src={GENDER_THEMES[p.gender === "girl" ? "girl" : "boy"].levels[Math.min((p.level || 1) - 1, 4)].img}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover"
                          style={{ border: "2px solid white", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 text-xs rounded-full flex items-center justify-center"
                          style={{ width: 16, height: 16, backgroundColor: "#FFFFFF" }}
                        >
                          {p.badge || GENDER_THEMES[p.gender === "girl" ? "girl" : "boy"].levels[Math.min((p.level || 1) - 1, 4)].badge}
                        </div>
                      </div>
                      <div className="flex-1 font-body text-sm" style={{ color: "#4A3F35" }}>
                        {p.name} {p.name === nickname && "(คุณ)"}
                      </div>
                      <div className="font-display text-sm" style={{ color: "#4A3F35" }}>
                        {p.xp} XP
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="font-body text-xs text-center mt-3" style={{ color: "#9C8F7C" }}>
                💡 กระดานนี้เพื่อน ๆ ที่ใช้แอปเดียวกันจะเห็นชื่อและคะแนนของคุณด้วยนะ
              </p>
            </div>
          </div>
        )}

        {/* gender selection prompt modal */}
        {showGenderPrompt && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => gender && setShowGenderPrompt(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-4" style={{ color: "#4A3F35" }}>
                🎮 เลือกตัวละครของคุณ
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => saveGender("boy")}
                  className="rounded-2xl p-4 text-center shadow-md transition-transform active:scale-95"
                  style={{ background: GENDER_THEMES.boy.gradient, border: gender === "boy" ? "3px solid #4A3F35" : "3px solid transparent" }}
                >
                  <img src={GENDER_THEMES.boy.levels[0].img} alt="นักเรียนชาย" className="w-20 h-20 rounded-full object-cover mx-auto" style={{ border: "3px solid white" }} />
                  <div className="font-display text-white text-sm mt-2">นักเรียนชาย</div>
                </button>
                <button
                  onClick={() => saveGender("girl")}
                  className="rounded-2xl p-4 text-center shadow-md transition-transform active:scale-95"
                  style={{ background: GENDER_THEMES.girl.gradient, border: gender === "girl" ? "3px solid #4A3F35" : "3px solid transparent" }}
                >
                  <img src={GENDER_THEMES.girl.levels[0].img} alt="นักเรียนหญิง" className="w-20 h-20 rounded-full object-cover mx-auto" style={{ border: "3px solid white" }} />
                  <div className="font-display text-white text-sm mt-2">นักเรียนหญิง</div>
                </button>
              </div>
              {gender && (
                <button onClick={() => setShowGenderPrompt(false)} className="w-full py-2 mt-4 font-body text-sm" style={{ color: "#B0A392" }}>
                  ปิด
                </button>
              )}
            </div>
          </div>
        )}

        {/* nickname prompt modal */}
        {showNicknamePrompt && (
          <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-4 z-10"
            style={{ background: "rgba(74,63,53,0.45)" }}
            onClick={() => setShowNicknamePrompt(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] p-5 bounce-in"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <div className="font-display text-lg text-center mb-2" style={{ color: "#4A3F35" }}>
                🎮 ตั้งชื่อผู้เล่นของคุณ
              </div>
              <p className="font-body text-xs text-center mb-4" style={{ color: "#9C8F7C" }}>
                ชื่อนี้จะโชว์บนกระดานเพื่อน ให้เพื่อน ๆ เห็นได้
              </p>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value.slice(0, 20))}
                placeholder="เช่น น้องพีช, มังกรน้อย"
                className="w-full font-body px-4 py-3 rounded-2xl border-2 text-center"
                style={{ borderColor: "#EFE7DA", color: "#4A3F35" }}
              />
              <button
                onClick={() => {
                  if (nicknameInput.trim()) saveNickname(nicknameInput.trim());
                }}
                className="w-full py-3 rounded-full font-display text-white mt-4 shadow-md transition-transform active:scale-95"
                style={{ backgroundColor: "#8AD9FF" }}
              >
                บันทึกชื่อ
              </button>
              <button onClick={() => setShowNicknamePrompt(false)} className="w-full py-2 mt-2 font-body text-sm" style={{ color: "#B0A392" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}


        {screen === "story" && currentStory && (
          <div className="max-w-xl mx-auto px-5 pt-6 pb-16">
            <div className="flex items-center justify-between">
              <button onClick={goHome} className="font-body text-sm" style={{ color: "#7A6E5E" }}>
                ← กลับ
              </button>
              <div className="font-display text-sm" style={{ color: "#4A3F35" }}>
                📖 {currentStory.title} · หน้า {storyIndex + 1}/{currentStory.pages.length}
              </div>
            </div>

            <div className="flex justify-center gap-1.5 mt-4">
              {currentStory.pages.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === storyIndex ? 24 : 8,
                    backgroundColor: i <= storyIndex ? subject(selectedSubject).color : "#EFE7DA",
                  }}
                />
              ))}
            </div>

            {storyIndex < currentStory.pages.length ? (
              <div
                className="mt-5 rounded-[28px] p-6 shadow-lg bounce-in"
                style={{ backgroundColor: "#FFFFFF", border: `4px solid ${subject(selectedSubject).color2}` }}
              >
                <div className="text-6xl text-center">{currentStory.pages[storyIndex].icon}</div>
                <div className="font-display text-xs text-center mt-2" style={{ color: "#9C8F7C" }}>
                  {currentStory.subtitle}
                </div>
                <div className="font-body text-base leading-relaxed mt-4" style={{ color: "#4A3F35" }}>
                  {currentStory.pages[storyIndex].text}
                </div>
                {currentStory.pages[storyIndex].vocab && (
                  <div
                    className="font-body text-sm mt-5 rounded-2xl p-3"
                    style={{ backgroundColor: "#FFF6E0", color: "#8A6D1F", border: "2px dashed #F0D98C" }}
                  >
                    💡 {currentStory.pages[storyIndex].vocab}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex gap-3 mt-6">
              {storyIndex > 0 && (
                <button
                  onClick={() => setStoryIndex((i) => i - 1)}
                  className="flex-1 py-3 rounded-full font-display shadow-md transition-transform active:scale-95"
                  style={{ backgroundColor: "#FFFFFF", color: "#4A3F35", border: "2px solid #EFE7DA" }}
                >
                  ← ก่อนหน้า
                </button>
              )}
              {storyIndex < currentStory.pages.length - 1 && (
                <button
                  onClick={() => setStoryIndex((i) => i + 1)}
                  className="flex-1 py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95"
                  style={{ backgroundColor: subject(selectedSubject).color }}
                >
                  ถัดไป →
                </button>
              )}
            </div>

            {storyIndex === currentStory.pages.length - 1 && (
              <div className="mt-6 text-center bounce-in">
                <div className="text-4xl">🎉</div>
                <div className="font-display text-lg mt-2" style={{ color: "#4A3F35" }}>
                  อ่านจบแล้ว! เก่งมาก
                </div>
                <div className="flex flex-col gap-3 mt-4">
                  {currentStory.linkedGroup && QUIZ_DATA[selectedSubject] && (
                    <button
                      onClick={() => {
                        const units = QUIZ_DATA[selectedSubject].filter((u) => u.group === currentStory.linkedGroup);
                        setGroupPicker({ subjectId: selectedSubject, name: currentStory.linkedGroup, units });
                        setScreen("home");
                      }}
                      className="py-3 rounded-full font-display text-white shadow-md transition-transform active:scale-95"
                      style={{ backgroundColor: subject(selectedSubject).color }}
                    >
                      📝 ไปลองทำข้อสอบ {currentStory.title}
                    </button>
                  )}
                  <button onClick={goHome} className="py-3 rounded-full font-display shadow-md transition-transform active:scale-95" style={{ backgroundColor: "#FFFFFF", color: "#4A3F35", border: "2px solid #EFE7DA" }}>
                    กลับหน้าหลัก
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
