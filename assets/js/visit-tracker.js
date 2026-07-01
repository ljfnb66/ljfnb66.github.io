import { firebaseConfig, visitCounterEnabled, visitCounterOptions } from "./visit-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  increment,
  onDisconnect,
  ref,
  remove,
  serverTimestamp,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

if (visitCounterEnabled) {
  startVisitTracker().catch(() => {
    // Visit tracking is intentionally silent for public visitors.
  });
}

async function startVisitTracker() {
  const path = normalizePath(window.location.pathname);

  if (path === visitCounterOptions.adminPath || path === visitCounterOptions.adminPath.replace(".html", "")) {
    return;
  }

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  const sessionId = getSessionId();
  const pageKey = encodePageKey(path);
  const today = new Date().toISOString().slice(0, 10);
  const now = serverTimestamp();

  await update(ref(db), {
    "stats/total/pageviews": increment(1),
    [`stats/daily/${today}/pageviews`]: increment(1),
    [`stats/pages/${pageKey}/views`]: increment(1),
    [`stats/pages/${pageKey}/path`]: path,
    [`stats/pages/${pageKey}/lastVisitedAt`]: now
  });

  const presenceRef = ref(db, `presence/${sessionId}`);
  await set(presenceRef, {
    path,
    startedAt: now,
    lastSeenAt: now
  });
  onDisconnect(presenceRef).remove();

  window.addEventListener("beforeunload", () => {
    remove(presenceRef);
  });

  const intervalMs = Math.max(10, visitCounterOptions.heartbeatSeconds || 30) * 1000;
  window.setInterval(() => {
    update(presenceRef, {
      path: normalizePath(window.location.pathname),
      lastSeenAt: serverTimestamp()
    });
  }, intervalMs);
}

function normalizePath(path) {
  if (!path || path === "/") {
    return "/index.html";
  }

  return path;
}

function encodePageKey(path) {
  return path.replace(/[^a-zA-Z0-9]/g, "_").replace(/^_+|_+$/g, "") || "home";
}

function getSessionId() {
  const storageKey = "ires_visit_session_id";
  const existing = window.sessionStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(storageKey, id);
  return id;
}
