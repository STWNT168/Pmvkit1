const SpmDashboard = (() => {
  let initialized = false;

  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  function set(id, v) {
    const e = document.getElementById(id);
    if (e) e.textContent = String(v);
  }

  function render(d) {
    d = d || {};
    const s = typeof Auth !== "undefined" && Auth.getSession ? Auth.getSession() : null;
    set("spm-dash-name", s?.name || s?.userId || "—");
    set("spm-dash-office", s?.officeName || "—");

    const r = d.report || {};
    const totals = {
      kitsCameToday: num(r.kitsCameToday),
      articlesCameToday: num(r.articlesCameToday),
      redirectedKits: num(r.redirectedKits),
      redirectedArticles: num(r.redirectedArticles),
      kitsDelivered: num(r.kitsDelivered),
      articlesDelivered: num(r.articlesDelivered),
      totalPendingKits: num(r.totalPendingKits),
      totalPendingArticles: num(r.totalPendingArticles),
      invalidMobileKits: num(r.invalidMobileKits),
      invalidMobileArticles: num(r.invalidMobileArticles),
      deliverableKits: num(r.deliverableKits),
      deliverableArticles: num(r.deliverableArticles),
      incompleteKits: num(r.incompleteKits),
      incompleteArticles: num(r.incompleteArticles),
      improperDetailsKits: num(r.improperDetailsKits),
      improperDetailsArticles: num(r.improperDetailsArticles)
    };

    set("spm-kpi-kits-came-today", totals.kitsCameToday);
    set("spm-kpi-articles-came-today", totals.articlesCameToday);
    set("spm-kpi-redirected-kits", totals.redirectedKits);
    set("spm-kpi-redirected-articles", totals.redirectedArticles);
    set("spm-kpi-kits-delivered-today", totals.kitsDelivered);
    set("spm-kpi-articles-delivered-today", totals.articlesDelivered);
    set("spm-kpi-pending-kits", totals.totalPendingKits);
    set("spm-kpi-pending-articles", totals.totalPendingArticles);
    set("spm-kpi-deliverable-kits", totals.deliverableKits);
    set("spm-kpi-deliverable-articles", totals.deliverableArticles);

    const tbody = document.getElementById("spm-dashboard-rows");
    if (!tbody) return;
    tbody.innerHTML = "";

    const rows = [
      ["Total Kits/Articles Came Today", totals.kitsCameToday, totals.articlesCameToday],
      ["Redirected", totals.redirectedKits, totals.redirectedArticles],
      ["Delivered Today", totals.kitsDelivered, totals.articlesDelivered],
      ["Total Pending Kits at SO", totals.totalPendingKits, totals.totalPendingArticles],
      ["Invalid Mobile Number", totals.invalidMobileKits, totals.invalidMobileArticles],
      ["Deliverable", totals.deliverableKits, totals.deliverableArticles],
      ["Incomplete", totals.incompleteKits, totals.incompleteArticles],
      ["Without Proper Article Details/Address", totals.improperDetailsKits, totals.improperDetailsArticles]
    ];

    rows.forEach((x, i) => {
      const tr = document.createElement("tr");
      if (i === 0) tr.className = "report-total-row";
      x.forEach((v, col) => {
        const td = document.createElement("td");
        td.textContent = col === 0 ? String(v) : String(num(v));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    const status = document.getElementById("spm-dashboard-status");
    if (status) {
      if (d.report) {
        status.textContent = "Report loaded successfully.";
        status.className = "admin-status admin-status-success";
      } else {
        status.textContent = "No PMV report submitted for the selected date.";
        status.className = "admin-status";
      }
    }
  }

  async function load() {
    const date = document.getElementById("spm-dashboard-date")?.value ||
      (typeof UI !== "undefined" && UI.todayISO ? UI.todayISO() : new Date().toISOString().slice(0,10));
    const status = document.getElementById("spm-dashboard-status");

    if (status) {
      status.textContent = "Loading…";
      status.className = "admin-status";
    }

    try {
      const r = await Api.getOwnPmvDashboard(date);
      if (!r || !r.success) throw new Error(r?.message || "Could not load dashboard.");
      render(r.data || {});
    } catch (e) {
      if (status) {
        status.textContent = e.message || "Dashboard unavailable.";
        status.className = "admin-status admin-status-error";
      }
    }
  }

  function init() {
    const d = document.getElementById("spm-dashboard-date");
    const today = typeof UI !== "undefined" && UI.todayISO ? UI.todayISO() : new Date().toISOString().slice(0,10);

    if (initialized) {
      load();
      return;
    }
    initialized = true;

    if (d) {
      d.value = d.value || today;
      d.max = today;
    }

    document.getElementById("spm-dashboard-refresh")?.addEventListener("click", load);
    d?.addEventListener("change", load);
    load();
  }

  return { init, load, render };
})();
