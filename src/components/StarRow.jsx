export default function StarRow({ count, size = "text-xl" }) {
  return (
    <div className={`flex justify-center gap-0.5 ${size}`}>
      {[0, 1, 2].map((i) => (
        <span key={i}>{i < count ? "⭐" : "☆"}</span>
      ))}
    </div>
  );
}
