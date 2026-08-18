/* =========================================================
   PMV TOOLKIT TRACKER
   SPM DASHBOARD - REFINED VERSION
   ========================================================= */

const SpmDashboard = (() => {
  "use strict";

  let initialized = false;

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const firstNum = (obj, keys) => {
    if (!obj) return 0;

    for (const key of keys) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== ""
      ) {
        return num(obj[key]);
      }
    }

    return 0;
  };

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function setStatus(message, type) {
    const el = document.getElementById("spm-dashboard-status");
    if (!el) return;

    el.textContent = message;

    if (type === "success") {
      el.className = "admin-status admin-status-success";
    } else if (type === "error") {
      el.className = "admin-status admin-status-error";
    } else {
      el.className = "admin-status";
    }
  }

  /* ---------------------------------------------------------
     Normalise backend response
     --------------------------------------------------------- */

  function normaliseReport(raw) {
    raw = raw || {};

    return {
      kitsCameToday: firstNum(raw, [
        "kitsCameToday",
        "KITS_CAME_TODAY",
        "totalKitsCameToday",
        "totalReceivedKits",
        "receivedKits"
      ]),

      articlesCameToday: firstNum(raw, [
        "articlesCameToday",
        "ARTICLES_CAME_TODAY",
        "totalArticlesCameToday",
        "totalReceivedArticles",
        "receivedArticles"
      ]),

      redirectedKits: firstNum(raw, [
        "redirectedKits",
        "REDIRECTED_KITS",
        "redirected",
        "redirectedKit"
      ]),

      redirectedArticles: firstNum(raw, [
        "redirectedArticles",
        "REDIRECTED_ARTICLES",
        "redirectedArticle"
      ]),

      kitsDelivered: firstNum(raw, [
        "kitsDelivered",
        "KITS_DELIVERED",
        "deliveredKits",
        "totalKitsDelivered"
      ]),

      articlesDelivered: firstNum(raw, [
        "articlesDelivered",
        "ARTICLES_DELIVERED",
        "deliveredArticles",
        "totalArticlesDelivered"
      ]),

      totalPendingKits: firstNum(raw, [
        "totalPendingKits",
        "TOTAL_PENDING_KITS",
        "currentPendingKits",
        "pendingKits"
      ]),

      totalPendingArticles: firstNum(raw, [
        "totalPendingArticles",
        "TOTAL_PENDING_ARTICLES",
        "currentPendingArticles",
        "pendingArticles",
        "toolKitArticles"
      ]),

      invalidMobileKits: firstNum(raw, [
        "invalidMobileKits",
        "MOBILE_INVALID_KITS",
        "mobileInvalidKits",
        "invalidMobile"
      ]),

      invalidMobileArticles: firstNum(raw, [
        "invalidMobileArticles",
        "MOBILE_INVALID_ARTICLES",
        "mobileInvalidArticles"
      ]),

      deliverableKits: firstNum(raw, [
        "deliverableKits",
        "DELIVERABLE_KITS",
        "kitsDeliverable"
      ]),

      deliverableArticles: firstNum(raw, [
        "deliverableArticles",
        "DELIVERABLE_ARTICLES",
        "articlesDeliverable"
      ]),

      incompleteKits: firstNum(raw, [
        "incompleteKits",
        "KITS_INCOMPLETE",
        "kitsIncomplete"
      ]),

      incompleteArticles: firstNum(raw, [
        "incompleteArticles",
        "ARTICLES_INCOMPLETE",
        "articlesIncomplete"
      ]),

      improperDetailsKits: firstNum(raw, [
        "improperDetailsKits",
        "addressNotFoundKits",
        "ADDRESS_NOT_FOUND_KITS",
        "withoutAddressKits"
      ]),

      improperDetailsArticles: firstNum(raw, [
        "improperDetailsArticles",
        "addressNotFoundArticles",
        "ADDRESS_NOT_FOUND_ARTICLES",
        "withoutAddressArticles"
      ])
    };
  }

  /* ---------------------------------------------------------
     Render KPI cards
     --------------------------------------------------------- */

  function renderKpis(t) {

    setText(
      "spm-kpi-kits-came-today",
      t.kitsCameToday
    );

    setText(
      "spm-kpi-articles-came-today",
      t.articlesCameToday
    );

    setText(
      "spm-kpi-redirected-kits",
      t.redirectedKits
    );

    setText(
      "spm-kpi-redirected-articles",
      t.redirectedArticles
    );

    setText(
      "spm-kpi-pending-kits",
      t.totalPendingKits
    );

    setText(
      "spm-kpi-pending-articles",
      t.totalPendingArticles
    );

    setText(
      "spm-kpi-deliverable-kits",
      t.deliverableKits
    );

    setText(
      "spm-kpi-deliverable-articles",
      t.deliverableArticles
    );
  }

  /* ---------------------------------------------------------
     Add delivered KPI cards if HTML does not already contain
     them.
     --------------------------------------------------------- */

  function ensureDeliveredKpis() {

    const grid = document.querySelector(
      "#spm-dashboard-view .report-kpis"
    );

    if (!grid) return;

    if (!document.getElementById("spm-kpi-kits-delivered")) {

      const card = document.createElement("article");

      card.innerHTML =
        "<span>Kits Delivered</span>" +
        '<strong id="spm-kpi-kits-delivered">0</strong>';

      grid.appendChild(card);
    }

    if (!document.getElementById("spm-kpi-articles-delivered")) {

      const card = document.createElement("article");

      card.innerHTML =
        "<span>Articles Delivered</span>" +
        '<strong id="spm-kpi-articles-delivered">0</strong>';

      grid.appendChild(card);
    }

    if (!document.getElementById("spm-kpi-invalid-mobile-kits")) {

      const card = document.createElement("article");

      card.innerHTML =
        "<span>Invalid Mobile Kits</span>" +
        '<strong id="spm-kpi-invalid-mobile-kits">0</strong>';

      grid.appendChild(card);
    }

    if (!document.getElementById("spm-kpi-incomplete-kits")) {

      const card = document.createElement("article");

      card.innerHTML =
        "<span>Incomplete Kits</span>" +
        '<strong id="spm-kpi-incomplete-kits">0</strong>';

      grid.appendChild(card);
    }

    if (!document.getElementById("spm-kpi-improper-kits")) {

      const card = document.createElement("article");

      card.innerHTML =
        "<span>Improper Details / Address Kits</span>" +
        '<strong id="spm-kpi-improper-kits">0</strong>';

      grid.appendChild(card);
    }
  }

  /* ---------------------------------------------------------
     Render complete office report table
     --------------------------------------------------------- */

  function renderTable(t) {

    const tbody = document.getElementById(
      "spm-dashboard-rows"
    );

    if (!tbody) return;

    tbody.innerHTML = "";

    const rows = [

      [
        "Total Kits / Articles Came Today",
        t.kitsCameToday,
        t.articlesCameToday
      ],

      [
        "Redirected",
        t.redirectedKits,
        t.redirectedArticles
      ],

      [
        "Kits / Articles Delivered",
        t.kitsDelivered,
        t.articlesDelivered
      ],

      [
        "Total Pending at SO",
        t.totalPendingKits,
        t.totalPendingArticles
      ],

      [
        "Invalid Mobile Number",
        t.invalidMobileKits,
        t.invalidMobileArticles
      ],

      [
        "Deliverable",
        t.deliverableKits,
        t.deliverableArticles
      ],

      [
        "Incomplete",
        t.incompleteKits,
        t.incompleteArticles
      ],

      [
        "Without Proper Details / Address",
        t.improperDetailsKits,
        t.improperDetailsArticles
      ]
    ];

    rows.forEach((row, index) => {

      const tr = document.createElement("tr");

      if (index === 0) {
        tr.className = "report-total-row";
      }

      const name = document.createElement("td");
      name.textContent = row[0];

      const kits = document.createElement("td");
      kits.textContent = String(num(row[1]));

      const articles = document.createElement("td");
      articles.textContent = String(num(row[2]));

      tr.appendChild(name);
      tr.appendChild(kits);
      tr.appendChild(articles);

      tbody.appendChild(tr);
    });
  }

  /* ---------------------------------------------------------
     Render dashboard
     --------------------------------------------------------- */

  function render(data) {

    data = data || {};

    const session =
      typeof Auth !== "undefined" &&
      Auth.getSession
        ? Auth.getSession()
        : null;

    setText(
      "spm-dash-name",
      session?.name ||
      session?.userId ||
      "—"
    );

    setText(
      "spm-dash-office",
      session?.officeName ||
      "—"
    );

    /*
     Backend normally returns:

       {
         success:true,
         data:{
           report:{...}
         }
       }

     Support direct report response as well.
    */

    const rawReport =
      data.report ||
      data.data?.report ||
      data;

    const hasReport =
      !!(
        data.report ||
        data.data?.report ||
        data.kitsCameToday !== undefined ||
        data.totalPendingKits !== undefined
      );

    const totals = normaliseReport(
      hasReport ? rawReport : {}
    );

    /* KPI values */

    renderKpis(totals);

    /* Additional automatically created KPI cards */

    ensureDeliveredKpis();

    setText(
      "spm-kpi-kits-delivered",
      totals.kitsDelivered
    );

    setText(
      "spm-kpi-articles-delivered",
      totals.articlesDelivered
    );

    setText(
      "spm-kpi-invalid-mobile-kits",
      totals.invalidMobileKits
    );

    setText(
      "spm-kpi-incomplete-kits",
      totals.incompleteKits
    );

    setText(
      "spm-kpi-improper-kits",
      totals.improperDetailsKits
    );

    /* Full report table */

    renderTable(totals);

    return totals;
  }

  /* ---------------------------------------------------------
     Load dashboard from Apps Script backend
     --------------------------------------------------------- */

  async function load() {

    const dateElement =
      document.getElementById(
        "spm-dashboard-date"
      );

    const date =
      dateElement?.value ||
      (
        typeof UI !== "undefined" &&
        UI.todayISO
          ? UI.todayISO()
          : new Date().toISOString().slice(0, 10)
      );

    setStatus("Loading…", "loading");

    try {

      if (
        typeof Api === "undefined" ||
        typeof Api.getOwnPmvDashboard !== "function"
      ) {
        throw new Error(
          "Api.getOwnPmvDashboard() is not available."
        );
      }

      const response =
        await Api.getOwnPmvDashboard(date);

      if (!response || response.success !== true) {
        throw new Error(
          response?.message ||
          "Could not load SPM dashboard."
        );
      }

      const data =
        response.data || {};

      const report =
        data.report || null;

      render(data);

      if (report) {

        setStatus(
          "Report loaded for " + date + ".",
          "success"
        );

      } else {

        setStatus(
          "No PMV report found for " + date + ".",
          "loading"
        );
      }

    } catch (error) {

      console.error(
        "SPM Dashboard Error:",
        error
      );

      setStatus(
        error?.message ||
        "Dashboard unavailable.",
        "error"
      );

      /*
       Keep dashboard numbers at zero instead
       of leaving old values visible.
      */

      render({
        report: {}
      });
    }
  }

  /* ---------------------------------------------------------
     Initialise dashboard
     --------------------------------------------------------- */

  function init() {

    const date =
      document.getElementById(
        "spm-dashboard-date"
      );

    const today =
      (
        typeof UI !== "undefined" &&
        UI.todayISO
      )
        ? UI.todayISO()
        : new Date().toISOString().slice(0, 10);

    if (date) {

      date.value =
        date.value || today;

      date.max = today;

      date.removeEventListener(
        "change",
        load
      );

      date.addEventListener(
        "change",
        load
      );
    }

    const refresh =
      document.getElementById(
        "spm-dashboard-refresh"
      );

    if (refresh) {

      refresh.removeEventListener(
        "click",
        load
      );

      refresh.addEventListener(
        "click",
        load
      );
    }

    ensureDeliveredKpis();

    initialized = true;

    load();
  }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */

  return {
    init,
    load,
    render
  };

})();
