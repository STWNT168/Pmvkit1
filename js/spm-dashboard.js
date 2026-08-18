const SpmDashboard = (() => {
  let initialized = false;

  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  function set(id, v) {
    const e = document.getElementById(id);
    if (e) e.textContent = String(v);
  }

  function render(d) {
    d = d || {};
    const s = Auth.getSession();
    set("spm-dash-name", s?.name || s?.userId || "—");
    set("spm-dash-office", s?.officeName || "—");

    const r = d.report;
    const empty = !r;

    const totals = r || {
      totalPendingKits:0,totalPendingArticles:0,
      invalidMobileKits:0,invalidMobileArticles:0,
      deliverableKits:0,deliverableArticles:0,
      incompleteKits:0,incompleteArticles:0,
      improperDetailsKits:0,improperDetailsArticles:0
    };

    set("spm-kpi-pending-kits", num(totals.totalPendingKits));
    set("spm-kpi-pending-articles", num(totals.totalPendingArticles));
    set("spm-kpi-deliverable-kits", num(totals.deliverableKits));
    set("spm-kpi-deliverable-articles", num(totals.deliverableArticles));

    const tbody = document.getElementById("spm-dashboard-rows");
    if (!tbody) return;
    tbody.innerHTML = "";

    const rows = [
      ["Total pending kits at SO", totals.totalPendingKits, totals.totalPendingArticles],
      ["Kits bearing invalid mobile number", totals.invalidMobileKits, totals.invalidMobileArticles],
      ["Number of kits Deliverable", totals.deliverableKits, totals.deliverableArticles],
      ["Incomplete Kits", totals.incompleteKits, totals.incompleteArticles],
      ["Kits without proper article details/address", totals.improperDetailsKits, totals.improperDetailsArticles]
    ];

    rows.forEach((x,i) => {
      const tr = document.createElement("tr");
      if (i === 0) tr.className = "report-total-row";
      x.forEach((v, col) => {
        const td = document.createElement("td");
        td.textContent = col === 0 ? String(v) : String(num(v));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    if (empty) {
      const status = document.getElementById("spm-dashboard-status");
      if (status) {
        status.textContent = "No PMV report submitted for the selected date.";
        status.className = "admin-status admin-status-error";
      }
    }
  }

  async function load() {
    const date = document.getElementById("spm-dashboard-date")?.value || UI.todayISO();
    const status = document.getElementById("spm-dashboard-status");
    if (status) {
      status.textContent = "Loading…";
      status.className = "admin-status";
    }

    try {
      const r = await Api.getOwnPmvDashboard(date);
      if (!r.success) throw new Error(r.message || "Could not load dashboard.");
      render(r.data);
      if (status) {
        status.textContent = r.data?.report ? `Report loaded for ${date}.` : `No report found for ${date}.`;
        status.className = r.data?.report ? "admin-status admin-status-success" : "admin-status";
      }
    } catch (e) {
      if (status) {
        status.textContent = e.message || "Dashboard unavailable.";
        status.className = "admin-status admin-status-error";
      }
    }
  }

  function init() {
    if (initialized) {
      load();
      return;
    }
    initialized = true;
    const d = document.getElementById("spm-dashboard-date");
    if (d) {
      d.value = UI.todayISO();
      d.max = UI.todayISO();
    }
    document.getElementById("spm-dashboard-refresh")?.addEventListener("click", load);
    d?.addEventListener("change", load);
    load();
  }

  return {init,load};
})();
