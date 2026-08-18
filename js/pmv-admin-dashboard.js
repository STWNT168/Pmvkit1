const PmvAdminDashboard = (() => {
  let initialized = false;

  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  function set(id,v) {
    const e = document.getElementById(id);
    if (e) e.textContent = String(v);
  }

  function render(d) {
    d = d || {};
    const k = d.kpis || {};

    set("admin-selected-date", d.date || "—");
    set("admin-kpi-pending-kits", num(k.totalPendingKits));
    set("admin-kpi-pending-articles", num(k.totalPendingArticles));
    set("admin-kpi-deliverable-kits", num(k.deliverableKits));
    set("admin-kpi-deliverable-articles", num(k.deliverableArticles));
    set("admin-kpi-invalid-mobile-kits", num(k.invalidMobileKits));
    set("admin-kpi-incomplete-kits", num(k.incompleteKits));
    set("admin-kpi-improper-kits", num(k.improperDetailsKits));
    set("admin-kpi-completion", `${num(d.completionPercentage).toFixed(1)}%`);

    const bar = document.getElementById("admin-progress-bar");
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, num(d.completionPercentage)))}%`;

    const tbody = document.getElementById("admin-report-rows");
    if (tbody) {
      tbody.innerHTML = "";
      (d.officeWise || []).forEach(o => {
        const tr = document.createElement("tr");
        [
          o.officeName || "—",
          `${num(o.updatedSpms)}/${num(o.totalSpms)} updated`,
          o.totalPendingKits,
          o.totalPendingArticles,
          o.invalidMobileKits,
          o.invalidMobileArticles,
          o.deliverableKits,
          o.deliverableArticles,
          o.incompleteKits,
          o.incompleteArticles,
          o.improperDetailsKits,
          o.improperDetailsArticles
        ].forEach(v => {
          const td = document.createElement("td");
          td.textContent = String(v ?? 0);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      if (!tbody.children.length) {
        tbody.innerHTML = '<tr><td colspan="12">No active offices found.</td></tr>';
      }
    }

    const pending = document.getElementById("admin-report-pending-rows");
    if (pending) {
      pending.innerHTML = "";
      (d.pendingSpms || []).forEach((x,i) => {
        const tr = document.createElement("tr");
        [i+1,x.spmName,x.spmId,x.officeName,"Not updated"].forEach(v => {
          const td = document.createElement("td");
          td.textContent = String(v ?? "—");
          tr.appendChild(td);
        });
        pending.appendChild(tr);
      });
      if (!pending.children.length) {
        pending.innerHTML = '<tr><td colspan="5">All active SPMs have submitted the selected date.</td></tr>';
      }
    }
  }

  async function load() {
    const date = document.getElementById("admin-dashboard-date")?.value || UI.todayISO();
    const status = document.getElementById("admin-dashboard-status");
    if (status) {
      status.textContent = "Loading…";
      status.className = "admin-status";
    }

    try {
      const r = await Api.getAdminPmvDashboard(date);
      if (!r.success) throw new Error(r.message || "Could not load admin dashboard.");
      render(r.data);
      if (status) {
        status.textContent = `Consolidated report loaded for ${date}.`;
        status.className = "admin-status admin-status-success";
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
    const d = document.getElementById("admin-dashboard-date");
    if (d) {
      d.value = UI.todayISO();
      d.max = UI.todayISO();
    }
    document.getElementById("admin-dashboard-refresh")?.addEventListener("click", load);
    d?.addEventListener("change", load);
    load();
  }

  return {init,load};
})();
