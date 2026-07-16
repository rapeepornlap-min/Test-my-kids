// No backend account needed for "your own" data — it just lives in this browser.
// Only the shared leaderboard talks to the server (see api/leaderboard.js).

const KEY = "examprep-profile";

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("บันทึกโปรไฟล์ไม่สำเร็จ", e);
  }
}

export function clearProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    // ignore
  }
}
