import { useState } from "react";

const GROUP_CODE = import.meta.env.VITE_GROUP_CODE || "";

export default function EntryScreen({ onDone }) {
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState(null);
  const [error, setError] = useState("");

  const enter = () => {
    setError("");
    if (!GROUP_CODE) {
      setError("แอปยังไม่ได้ตั้งค่ารหัสกลุ่ม (VITE_GROUP_CODE) กรุณาติดต่อผู้ดูแล");
      return;
    }
    if (code.trim().toLowerCase() !== GROUP_CODE.trim().toLowerCase()) {
      setError("รหัสกลุ่มไม่ถูกต้อง ลองใหม่อีกครั้งนะคะ");
      return;
    }
    if (!nickname.trim() || !gender) {
      setError("กรุณากรอกชื่อและเลือกตัวละครก่อนนะคะ");
      return;
    }
    onDone({ nickname: nickname.trim(), gender, xp: 0 });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF6E5 0%, #EAF6FF 40%, #D6EEFF 100%)",
      }}
      className="flex items-center justify-center p-5"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg p-6">
        <h1 className="font-display text-2xl text-center mb-1" style={{ color: "#4A3F35" }}>
          🎈 ห้องติวสอบกลางภาค
        </h1>
        <p className="text-center text-sm mb-5" style={{ color: "#7A6E5E" }}>
          ใส่รหัสกลุ่มเพื่อน + ตั้งชื่อของคุณ
        </p>

        <label className="text-xs" style={{ color: "#9C8F7C" }}>
          รหัสกลุ่ม
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ถามเพื่อนหรือผู้ปกครองถ้ายังไม่มี"
          className="w-full mt-1 mb-3 px-4 py-3 rounded-xl border-2 text-center"
          style={{ borderColor: "#EFE7DA" }}
        />

        <label className="text-xs" style={{ color: "#9C8F7C" }}>
          ชื่อผู้เล่น
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder="เช่น น้องพีช"
          className="w-full mt-1 mb-3 px-4 py-3 rounded-xl border-2 text-center"
          style={{ borderColor: "#EFE7DA" }}
        />

        <label className="text-xs" style={{ color: "#9C8F7C" }}>
          เลือกตัวละคร
        </label>
        <div className="grid grid-cols-2 gap-3 mt-1 mb-4">
          <button
            onClick={() => setGender("boy")}
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(160deg, #8AD9FF, #4FC3F7)",
              border: gender === "boy" ? "3px solid #4A3F35" : "3px solid transparent",
            }}
          >
            <div className="text-4xl">🧒</div>
            <div className="text-white text-sm mt-1">นักเรียนชาย</div>
          </button>
          <button
            onClick={() => setGender("girl")}
            className="rounded-2xl p-4 text-center"
            style={{
              background: "linear-gradient(160deg, #FFB3C1, #FF8FA3)",
              border: gender === "girl" ? "3px solid #4A3F35" : "3px solid transparent",
            }}
          >
            <div className="text-4xl">👧</div>
            <div className="text-white text-sm mt-1">นักเรียนหญิง</div>
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <button
          onClick={enter}
          className="w-full py-3 rounded-full font-display text-white shadow-md"
          style={{ backgroundColor: "#4FC3F7" }}
        >
          เริ่มติวเลย!
        </button>

        <p className="text-xs text-center mt-4" style={{ color: "#B0A392" }}>
          ไม่ต้องใช้เบอร์โทรหรืออีเมล ข้อมูลนี้เก็บไว้ในเครื่องนี้เท่านั้น
        </p>
      </div>
    </div>
  );
}
