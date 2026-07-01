import { firebaseConfig, visitCounterEnabled } from "./visit-config.js";
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  onValue,
  ref
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const root = document.getElementById("footer-visit-stats");

if (root) {
  if (visitCounterEnabled) {
    showFooterVisitStats().catch(() => {
      root.textContent = "Visit stats unavailable";
    });
  } else {
    root.textContent = "Visit counter disabled";
  }
}

async function showFooterVisitStats() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getDatabase(app);

  const totalEl = document.getElementById("footer-total-visits");
  const onlineEl = document.getElementById("footer-online-count");
  const pagesEl = document.getElementById("footer-page-rank");

  onValue(ref(db, "stats/total/pageviews"), (snapshot) => {
    totalEl.textContent = formatNumber(snapshot.val() || 0);
  });

  onValue(ref(db, "presence"), (snapshot) => {
    onlineEl.textContent = formatNumber(Object.keys(snapshot.val() || {}).length);
  });

  onValue(ref(db, "stats/pages"), (snapshot) => {
    const pages = Object.values(snapshot.val() || {})
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 8);

    pagesEl.innerHTML = pages.length
      ? pages.map((page, index) => {
        return `<div>${index + 1}. ${escapeHtml(page.path || "")}: ${formatNumber(page.views || 0)}</div>`;
      }).join("")
      : "<div>No page visits recorded</div>";
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
