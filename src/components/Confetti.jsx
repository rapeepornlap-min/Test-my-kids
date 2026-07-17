import { useMemo } from "react";

const CONFETTI_COLORS = ["#FF6B81", "#4FC3F7", "#6BCB77", "#FFB84C", "#B18CFE", "#FFD93D"];

export default function Confetti({ active }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 1,
        rotate: Math.random() * 360,
        round: i % 2 === 0,
      })),
    [active]
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50">
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-20px",
            width: 10,
            height: 10,
            backgroundColor: p.color,
            borderRadius: p.round ? "50%" : "3px",
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
