import { useEffect, useState } from "react";

async function fetchLeaderboard() {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error("โหลดกระดานเพื่อนไม่สำเร็จ");
  return res.json();
}

async function pushToLeaderboard(profile) {
  const res = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nickname: profile.nickname,
      xp: profile.xp,
      gender: profile.gender,
      level: Math.floor(profile.xp / 150) + 1,
    }),
  });
  if (!res.ok) throw new Error("อัปเดตกระดานเพื่อนไม่สำเร็จ");
  return res.json();
}

export default function Dashboard({ profile, onProfileUpdate, onReset }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const loadBoard = async () => {
    setLoadingBoard(true);
    setBoardError("");
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data);
    } catch (e) {
      setBoardError(e.message);
    }
    setLoadingBoard(false);
  };

  useEffect(() => {
    loadBoard();
  }, []);

  // Demo action — this is where finishing a quiz/practice set would call in
  // the full version. It adds XP locally, saves it, and syncs to the shared
  // leaderboard so friends can see it.
  const earnDemoXp = async () => {
    const updated = { ...profile, xp: profile.xp + 20 };
    onProfileUpdate(updated);
    setSyncing(true);
    try {
      const board = await pushToLeaderboard(updated);
      setLeaderboard(board);
    } catch (e) {
      setBoardError(e.message);
    }
    setSyncing(false);
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "linear-gradient(180deg, #FFF6E5 0%, #EAF6FF 40%, #D6EEFF 100%)" }}
      className="p-5"
    >
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl" style={{ color: "#4A3F35" }}>
            🎈 สวัสดี, {profile.nickname}!
          </h1>
          <button onClick={onReset} className="text-sm" style={{ color: "#7A6E5E" }}>
            ออกจากระบบ
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-md p-6 text-center">
          <div className="text-6xl">{profile.gender === "girl" ? "👧" : "🧒"}</div>
          <div className="font-display text-lg mt-2" style={{ color: "#4A3F35" }}>
            {profile.nickname}
          </div>
          <div className="text-sm mt-1" style={{ color: "#7A6E5E" }}>
            {profile.xp} XP
          </div>
          <button
            onClick={earnDemoXp}
            disabled={syncing}
            className="mt-4 px-5 py-2 rounded-full font-display text-white text-sm shadow disabled:opacity-50"
            style={{ backgroundColor: "#6BCB77" }}
          >
            {syncing ? "กำลังซิงก์..." : "+20 XP (ตัวอย่างทำแบบฝึกหัดเสร็จ)"}
          </button>
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-md p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base" style={{ color: "#4A3F35" }}>
              🏆 กระดานเพื่อน
            </p>
            <button onClick={loadBoard} className="text-xs" style={{ color: "#2E86AB" }}>
              รีเฟรช
            </button>
          </div>
          {loadingBoard ? (
            <p className="text-sm" style={{ color: "#9C8F7C" }}>
              กำลังโหลด...
            </p>
          ) : boardError ? (
            <p className="text-sm text-red-500">{boardError}</p>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm" style={{ color: "#9C8F7C" }}>
              ยังไม่มีใครขึ้นกระดานเลย ลองกดปุ่ม XP ด้านบนดูสิ!
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F0E9DC" }}>
              {leaderboard.map((p, i) => (
                <div key={p.nickname + i} className="flex items-center gap-3 py-2">
                  <div className="w-5 text-center font-display" style={{ color: "#9C8F7C" }}>
                    {i + 1}
                  </div>
                  <div className="text-xl">{p.gender === "girl" ? "👧" : "🧒"}</div>
                  <div className="flex-1 text-sm" style={{ color: "#4A3F35" }}>
                    {p.nickname} {p.nickname === profile.nickname && "(คุณ)"}
                  </div>
                  <div className="font-display text-sm" style={{ color: "#4A3F35" }}>
                    {p.xp} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-3xl shadow-md p-6 text-sm" style={{ color: "#7A6E5E" }}>
          <p className="font-display text-base mb-2" style={{ color: "#4A3F35" }}>
            📋 ขั้นตอนถัดไป
          </p>
          <p>
            รหัสกลุ่ม + กระดานเพื่อนทำงานแล้ว (ผ่าน GitHub เป็นฐานข้อมูล) ขั้นต่อไปคือย้ายฟีเจอร์
            ข้อสอบ/แฟลชการ์ด/ตัวละครจากแอปเดิมเข้ามาแทนปุ่ม "+20 XP" ตัวอย่างนี้
          </p>
        </div>
      </div>
    </div>
  );
}
