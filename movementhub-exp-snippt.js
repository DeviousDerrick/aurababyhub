// --- EXP integration (paste inside MovementHub) ---
const EXP_API_BASE = 'https://aurababylvlsystem-ponv.onrender.com';

// Map: lowercase username -> { level, exp, required } (fields optional)
const [playerStats, setPlayerStats] = useState({});

// Normalize possible API shapes to our fields
const normalizeExpResponse = (data) => {
  if (!data) return null;
  // try common fields — adjust if your API uses different keys
  const level = data.level ?? data.lv ?? data.lvl ?? data.Level ?? null;
  const exp = data.exp ?? data.xp ?? data.currentExp ?? data.current_xp ?? data.current_xp_amount ?? null;
  const required = data.nextExp ?? data.next_exp ?? data.required ?? data.toNext ?? null;
  return { level, exp, required };
};

// Fetch stats for a single username
const fetchStatsFor = async (username) => {
  try {
    // Try a flexible endpoint shape: ?username=...
    const url = `${EXP_API_BASE}?username=${encodeURIComponent(username)}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      // optionally try another common path (uncomment if your API uses /user/:name)
      // const res2 = await fetch(`${EXP_API_BASE}/user/${encodeURIComponent(username)}`);
      // if (res2.ok) return normalizeExpResponse(await res2.json());
      return null;
    }
    const json = await res.json();
    // If API returns an object keyed by username, try to pick the entry
    // e.g. { "username": {...} } or { "data": {...} }
    let payload = json;
    if (json.data) payload = json.data;
    if (payload[username]) payload = payload[username];
    return normalizeExpResponse(payload);
  } catch (err) {
    // network / parsing error
    return null;
  }
};

// Poll stats for all active usernames (throttled)
useEffect(() => {
  if (!players) return;
  // gather unique usernames from players (non-empty)
  const usernames = [...new Set(Object.values(players || {}).map(p => (p.username || '').trim()).filter(Boolean))];
  if (usernames.length === 0) return;

  let cancelled = false;

  const updateAll = async () => {
    const next = { ...playerStats }; // keep previous where unchanged
    await Promise.all(usernames.map(async (u) => {
      const key = u.toLowerCase();
      try {
        const stats = await fetchStatsFor(u);
        if (cancelled) return;
        if (stats) next[key] = stats;
      } catch (e) {
        // ignore individual failures
      }
    }));
    if (!cancelled) setPlayerStats(next);
  };

  // initial fetch immediately, then every 8 seconds
  updateAll();
  const id = setInterval(updateAll, 8000);
  return () => { cancelled = true; clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [players]);
