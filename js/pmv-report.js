const PmvReport = (() => {
  const escapeHtml = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\'/g,"&#39;");
  let office = null;
  let initialized = false;
  let receiptLines = [];

  const fields = [
    ["invalid-mobile-kits","invalidMobileKits"],
    ["invalid-mobile-articles","invalidMobileArticles"],
    ["deliverable-kits","deliverableKits"],
    ["deliverable-articles","deliverableArticles"],
    ["incomplete-kits","incompleteKits"],
    ["incomplete-articles","incompleteArticles"],
    ["improper-details-kits","improperDetailsKits"],
    ["improper-details-articles","improperDetailsArticles"]
  ];

  const n = id => {
    const v = Number(document.getElementById(id)?.value || 0);
    return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  };

  function totals() {
    return {
      kits: n("invalid-mobile-kits") + n("deliverable-kits") +
            n("incomplete-kits") + n("improper-details-kits"),
      articles: n("invalid-mobile-articles") + n("deliverable-articles") +
                n("incomplete-articles") + n("improper-details-articles")
    };
  }

  function setText(id, value) {
    const e = document.getElementById(id);
    if (e) e.textContent = String(value);
  }

  function recalculate() {
    const t = totals();
    const k = document.getElementById("total-pending-kits");
    const a = document.getElementById("total-pending-articles");
    if (k) k.value = t.kits;
    if (a) a.value = t.articles;
    setText("spm-total-kits", t.kits);
    setText("spm-total-articles", t.articles);
    setText("spm-summary-kits", t.kits);
    setText("spm-summary-articles", t.articles);
    return t;
  }

  function data() {
    const s = Auth.getSession();
    const t = totals();
    const rt = receiptTotals();
    return {
      id: `${UI.todayISO()}_${office?.officeId || s?.officeId || ""}_${crypto.randomUUID?.() || Date.now()}`,
      date: document.getElementById("spm-date")?.value || UI.todayISO(),
      officeId: office?.officeId || s?.officeId || "",
      officeName: office?.officeName || s?.officeName || "",
      spmId: s?.userId || "",
      spmName: s?.name || "",
      // These four values are calculated here for the UI and are recalculated
      // again by Code.gs from receiptLines before saving.
      kitsCameToday: rt.kitsCameToday,
      articlesCameToday: rt.articlesCameToday,
      redirectedKits: rt.redirectedKits,
      redirectedArticles: rt.redirectedArticles,
      totalPendingKits: t.kits,
      totalPendingArticles: t.articles,
      receiptLines: receiptLines.map(x => ({type:x.type,movement:x.movement,quantity:x.quantity})),
      invalidMobileKits: n("invalid-mobile-kits"),
      invalidMobileArticles: n("invalid-mobile-articles"),
      deliverableKits: n("deliverable-kits"),
      deliverableArticles: n("deliverable-articles"),
      incompleteKits: n("incomplete-kits"),
      incompleteArticles: n("incomplete-articles"),
      improperDetailsKits: n("improper-details-kits"),
      improperDetailsArticles: n("improper-details-articles"),
      submittedAt: new Date().toISOString()
    };
  }

  function receiptTotals() {
    return receiptLines.reduce((a,x) => {
      if (x.movement === "RECEIVED" && x.type === "KIT") a.kitsCameToday += x.quantity;
      if (x.movement === "RECEIVED" && x.type === "ARTICLE") a.articlesCameToday += x.quantity;
      if (x.movement === "REDIRECTED" && x.type === "KIT") a.redirectedKits += x.quantity;
      if (x.movement === "REDIRECTED" && x.type === "ARTICLE") a.redirectedArticles += x.quantity;
      return a;
    }, {kitsCameToday:0,articlesCameToday:0,redirectedKits:0,redirectedArticles:0});
  }

  function renderReceiptLines() {
    const tbody = document.getElementById("receipt-entry-rows");
    if (!tbody) return;
    tbody.innerHTML = "";
    receiptLines.forEach((x,i) => {
      const tr = document.createElement("tr");
      [x.type === "KIT" ? "Kit" : "Article", x.movement === "RECEIVED" ? "Received Today" : "Redirected", x.quantity].forEach(v => {
        const td=document.createElement("td"); td.textContent=String(v); tr.appendChild(td);
      });
      const td=document.createElement("td");
      const b=document.createElement("button"); b.type="button"; b.className="btn btn-danger"; b.textContent="REMOVE";
      b.onclick=()=>{ receiptLines.splice(i,1); renderReceiptLines(); };
      td.appendChild(b); tr.appendChild(td); tbody.appendChild(tr);
    });
    if (!receiptLines.length) tbody.innerHTML='<tr><td colspan="4">No receipt/redirection entries added yet.</td></tr>';
    const t=receiptTotals();
    setText("kits-came-today",t.kitsCameToday);
    setText("articles-came-today",t.articlesCameToday);
    setText("redirected-kits",t.redirectedKits);
    setText("redirected-articles",t.redirectedArticles);
  }

  function addReceiptLine() {
    const type=document.getElementById("receipt-type")?.value || "KIT";
    const movement=document.getElementById("receipt-movement")?.value || "RECEIVED";
    const quantity=Math.floor(Number(document.getElementById("receipt-quantity")?.value || 0));
    if (!quantity || quantity < 1) { UI.toast("Enter a quantity of at least 1.","warning"); return; }
    receiptLines.push({type,movement,quantity});
    document.getElementById("receipt-quantity").value="1";
    renderReceiptLines();
  }

  function setOffice(d) {
    if (!d?.officeId) return;
    office = {
      officeId: String(d.officeId).trim(),
      officeName: String(d.officeName || "").trim()
    };
    const el = document.getElementById("spm-office");
    if (el) {
      el.innerHTML = "";
      const opt = document.createElement("option");
      opt.value = office.officeId;
      opt.textContent = office.officeName || office.officeId;
      opt.selected = true;
      el.appendChild(opt);
      el.value = office.officeId;
      el.disabled = true;
    }
  }

  async function loadOffice() {
    const s = Auth.getSession();
    if (s?.officeId) {
      setOffice({officeId:s.officeId, officeName:s.officeName});
    }
    try {
      const r = await Api.getUser(s.userId);
      if (r.success && r.data) {
        setOffice({officeId:r.data.officeId, officeName:r.data.officeName});
      }
    } catch (e) {
      if (!office) throw e;
    }
  }

  function clearForm() {
    receiptLines = [];
    renderReceiptLines();
    fields.forEach(([id]) => {
      const e = document.getElementById(id);
      if (e) e.value = "0";
    });
    recalculate();
  }

  function renderStatus(record) {
    const box = document.getElementById("spm-report-status");
    if (!box) return;

    if (!record) {
      box.className = "report-notice report-notice-pending";
      box.innerHTML = "<strong>Today's report is pending.</strong><span>Enter and submit the office report below.</span>";
      return;
    }

    box.className = "report-notice report-notice-success";
    box.innerHTML =
      `<strong>Today's report is already submitted.</strong>` +
      `<span>Today's receipts: ${Number(record.kitsCameToday || 0)} kits / ${Number(record.articlesCameToday || 0)} articles. Redirected: ${Number(record.redirectedKits || 0)} kits / ${Number(record.redirectedArticles || 0)} articles.</span>` +
      `<button type="button" id="delete-pmv-report" class="btn btn-danger">Delete Today's Report</button>`;

    document.getElementById("delete-pmv-report").onclick = deleteToday;
  }

  async function refreshStatus() {
    const d = document.getElementById("spm-date")?.value || UI.todayISO();
    try {
      const r = await Api.getOwnPmvDashboard(d);
      if (!r.success) throw new Error(r.message || "Could not load report.");
      renderStatus(r.data?.report || null);
    } catch (e) {
      const box = document.getElementById("spm-report-status");
      if (box) {
        box.className = "report-notice report-notice-error";
        box.textContent = e.message || "Could not verify report status.";
      }
    }
  }

  async function deleteToday() {
    const date = document.getElementById("spm-date")?.value || UI.todayISO();
    if (date !== UI.todayISO()) {
      UI.toast("Only today's report can be deleted.", "warning");
      return;
    }

    if (!await UI.confirmModal(
      "Delete Today's Report",
      "This will remove the PMV report for today. You can submit a corrected report afterwards.",
      "DELETE REPORT"
    )) return;

    try {
      const r = await Api.deleteOwnPmvReport(date);
      if (!r.success) throw new Error(r.message || "Delete failed.");
      clearForm();
      renderStatus(null);
      UI.toast("Today's PMV report deleted.", "success");
    } catch (e) {
      UI.toast(e.message || "Delete failed.", "error");
    }
  }

  async function saveDraft() {
    const d = data();
    await Storage.saveDraft(`pmv:${d.date}`, d.officeId, d);
    UI.toast("PMV report draft saved on this device.", "success");
  }

  async function submit() {
    const d = data();

    if (!d.date || !d.officeId) {
      UI.toast("Date and office are required.", "error");
      return;
    }

    const t = recalculate();
    if (!await UI.confirmModal(
      "Confirm PMV Report",
      `Office: <b>${escapeHtml(d.officeName)}</b><br>` +
      `Total pending: <b>${t.kits} kits</b> / <b>${t.articles} articles</b>`,
      "SUBMIT REPORT"
    )) return;

    try {
      const r = await Api.submitPmvReport(d, Auth.getSession());
      if (!r.success) throw new Error(r.message || "Submission failed.");
      await Storage.clearDraft(`pmv:${d.date}`, d.officeId);
      renderStatus(d);
      UI.toast("PMV report submitted successfully.", "success");
      clearForm();
      await refreshStatus();
    } catch (e) {
      UI.toast(e.message || "Submission failed.", "error");
    }
  }

  function bind() {
    document.getElementById("spm-form")?.addEventListener("input", recalculate);
    document.getElementById("receipt-add")?.addEventListener("click", addReceiptLine);
    document.getElementById("spm-date")?.addEventListener("change", refreshStatus);
    document.getElementById("btn-save-draft")?.addEventListener("click", saveDraft);
    document.getElementById("btn-submit")?.addEventListener("click", submit);
  }

  async function init() {
    if (initialized) {
      await refreshStatus();
      return;
    }
    initialized = true;
    const d = document.getElementById("spm-date");
    if (d) {
      d.value = UI.todayISO();
      d.max = UI.todayISO();
    }
    await loadOffice();
    bind();
    renderReceiptLines();
    recalculate();
    await refreshStatus();
  }

  return {init, recalculate, data};
})();
