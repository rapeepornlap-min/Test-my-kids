// Vercel serverless function — deployed automatically at /api/leaderboard
// This uses the GitHub Contents API to read/write a JSON file living in this
// same repo (data/leaderboard.json) as a tiny shared "database" for 2-3 friends.
// No Supabase / external database account needed.
//
// Required environment variables (set in Vercel → Project Settings → Environment Variables):
//   GITHUB_TOKEN      — a fine-grained Personal Access Token with
//                        "Contents: Read and write" permission on this one repo
//   GITHUB_REPO       — "your-username/exam-prep-app"
//   GITHUB_BRANCH     — usually "main" (optional, defaults to main)
//   GITHUB_FILE_PATH  — usually "data/leaderboard.json" (optional, has a default)
//
// These are server-only (no VITE_ prefix), so they're never exposed to the browser.

const FILE_PATH_DEFAULT = "data/leaderboard.json";

export default async function handler(req, res) {
  const {
    GITHUB_TOKEN,
    GITHUB_REPO,
    GITHUB_BRANCH = "main",
    GITHUB_FILE_PATH = FILE_PATH_DEFAULT,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.status(500).json({ error: "Server not configured: missing GITHUB_TOKEN or GITHUB_REPO env vars" });
    return;
  }

  const contentsUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    // Always read the current file first (need its sha for any update, and its
    // content to answer GET requests).
    const getResp = await fetch(`${contentsUrl}?ref=${GITHUB_BRANCH}`, { headers });

    let sha = null;
    let board = [];
    if (getResp.status === 200) {
      const fileData = await getResp.json();
      sha = fileData.sha;
      const decoded = Buffer.from(fileData.content, "base64").toString("utf-8");
      board = decoded.trim() ? JSON.parse(decoded) : [];
    } else if (getResp.status !== 404) {
      const detail = await getResp.text();
      res.status(502).json({ error: "GitHub read failed", detail });
      return;
    }
    // status 404 just means the file doesn't exist yet — board stays [] and
    // the first POST will create it.

    if (req.method === "GET") {
      res.status(200).json(board);
      return;
    }

    if (req.method === "POST") {
      const { nickname, xp, gender, level } = req.body || {};
      if (!nickname) {
        res.status(400).json({ error: "Missing nickname" });
        return;
      }

      const idx = board.findIndex((p) => p.nickname === nickname);
      const entry = { nickname, xp: xp || 0, gender: gender || "boy", level: level || 1 };
      if (idx >= 0) board[idx] = entry;
      else board.push(entry);
      board.sort((a, b) => b.xp - a.xp);
      board = board.slice(0, 100);

      const newContent = Buffer.from(JSON.stringify(board, null, 2)).toString("base64");
      const putResp = await fetch(contentsUrl, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Update leaderboard: ${nickname} (${entry.xp} XP)`,
          content: newContent,
          branch: GITHUB_BRANCH,
          ...(sha ? { sha } : {}),
        }),
      });

      if (!putResp.ok) {
        const detail = await putResp.text();
        res.status(502).json({ error: "GitHub write failed", detail });
        return;
      }

      res.status(200).json(board);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
