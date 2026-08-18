// PMV Toolkit Tracker - PMV corrected backend
// Compatible with current index.html + js/spm-dashboard.js + admin dashboard.

const SPREADSHEET_ID = "1vEjY1z-147b38XTWV7vRm_9pjXVMfJmjdQtrKRkkLy8";
const SHEETS = {
  DAILY_DATA: "DAILY_DATA",
  OFFICE_MASTER: "OFFICE_MASTER",
  USER_MASTER: "USER_MASTER",
  SET_TRACKER: "SET_TRACKER",
  AUDIT_LOG: "AUDIT_LOG",
  SESSIONS: "SESSIONS",
  PMV_REPORTS: "PMV_REPORTS",
  PMV_RECEIPTS: "PMV_RECEIPTS"
};
const ROLES = { SPM: "SPM", DPS: "DPS", ADMIN: "ADMIN" };
const SESSION_DAYS = 7;

const PMV_HEADERS = [
  "REPORT_ID","DATE","OFFICE_ID","OFFICE_NAME","SPM_ID","SPM_NAME",
  "KITS_CAME_TODAY","ARTICLES_CAME_TODAY","REDIRECTED_KITS","REDIRECTED_ARTICLES",
  "KITS_DELIVERED","ARTICLES_DELIVERED",
  "INVALID_MOBILE_KITS","INVALID_MOBILE_ARTICLES",
  "DELIVERABLE_KITS","DELIVERABLE_ARTICLES",
  "INCOMPLETE_KITS","INCOMPLETE_ARTICLES",
  "IMPROPER_DETAILS_KITS","IMPROPER_DETAILS_ARTICLES",
  "NET_KITS","NET_ARTICLES",
  "TOTAL_PENDING_KITS","TOTAL_PENDING_ARTICLES",
  "PREVIOUS_PENDING_KITS","PREVIOUS_PENDING_ARTICLES",
  "SUBMITTED_AT","UPDATED_AT","STATUS"
];

const RECEIPT_HEADERS = [
  "ENTRY_ID","REPORT_ID","DATE","OFFICE_ID","SPM_ID",
  "TYPE","MOVEMENT","QUANTITY","CREATED_AT"
];

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = String(p.action || "");
    const session = needsSession(p.session);
    switch (action) {
      case "getOfficeList": return out(getOfficeList(session));
      case "getUser": return out(getUser(p.userId, session));
      case "getPreviousDay": return out(getPreviousDay(p.officeId, p.date, session));
      case "getOwnTodayRecord": return out(getOwnTodayRecord(session));
      case "getAdminTodayUpdateStatus": return out(getAdminTodayUpdateStatus(session, p.date || todayISO()));
      case "getOwnPmvDashboard": return out(getOwnPmvDashboard(session, p.date || todayISO()));
      case "getAdminPmvDashboard": return out(getAdminPmvDashboard(session, p.date || todayISO()));
      default: return out(err("Unknown GET action."));
    }
  } catch (x) {
    return out(err(x.message || String(x)));
  }
}

function doPost(e) {
  try {
    const b = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    switch (b.action) {
      case "login": return out(login(b.userId, b.mobile));
      case "logout": return out(logout(b.session));
      case "submitDailyRecord": return out(submitDailyRecord(b.record, b.session));
      case "syncOfflineRecord": return out(submitDailyRecord(b.record, b.session));
      case "updateDailyRecord": return out(updateDailyRecord(b.record, b.session));
      case "deleteOwnTodayRecord": return out(deleteOwnTodayRecord(b.session, b.recordId));
      case "submitPmvReport": return out(submitPmvReport(b.record, b.session));
      case "deleteOwnPmvReport": return out(deleteOwnPmvReport(b.session, b.date || todayISO()));
      default: return out(err("Unknown POST action."));
    }
  } catch (x) {
    return out(err(x.message || String(x)));
  }
}

function login(userId, mobile) {
  const u = findUser(userId);
  if (!u) return err("User not found.");
  if (String(u.MOBILE || "").trim() !== String(mobile || "").trim()) return err("Mobile number does not match our records.");
  if (!active(u.ACTIVE)) return err("This account is inactive.");
  const role = normRole(u.ROLE);
  if (!role) return err("Invalid role.");

  ensureSheet(SHEETS.SESSIONS, ["TOKEN","USER_ID","CREATED_AT","EXPIRES_AT","ACTIVE"]);
  const token = Utilities.getUuid() + "-" + Utilities.getUuid();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  getSheet(SHEETS.SESSIONS).appendRow([token, u.USER_ID, now, expires, true]);

  return ok({
    userId: String(u.USER_ID),
    name: String(u.NAME || ""),
    role: role,
    officeId: String(u.OFFICE_ID || ""),
    officeName: officeName(u.OFFICE_ID, u.OFFICE_NAME),
    token: token,
    expiresAt: expires.toISOString()
  }, "Login successful.");
}

function logout(s) {
  const a = auth(s);
  const sh = getSheet(SHEETS.SESSIONS);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(a.token)) {
      sh.getRange(i + 1, 5).setValue(false);
      break;
    }
  }
  return ok(null, "Logged out.");
}

function needsSession(raw) {
  if (!raw) throw new Error("Not authenticated.");
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; }
  catch (_) { throw new Error("Invalid session."); }
}

function auth(s) {
  if (!s || !s.userId || !s.token) throw new Error("Not authenticated.");
  const rows = read(SHEETS.SESSIONS);
  const r = rows.find(x => String(x.TOKEN).trim() === String(s.token).trim() && String(x.USER_ID).trim() === String(s.userId).trim());
  if (!r || !active(r.ACTIVE)) throw new Error("Session expired or invalid.");
  if (new Date(r.EXPIRES_AT).getTime() <= Date.now()) {
    invalidate(s.token);
    throw new Error("Session expired. Please log in again.");
  }
  const u = findUser(s.userId);
  if (!u || !active(u.ACTIVE)) throw new Error("Account is inactive.");
  const role = normRole(u.ROLE);
  if (!role) throw new Error("Invalid role.");
  return { user: u, role: role, token: s.token };
}

function findUser(id) {
  return read(SHEETS.USER_MASTER).find(r => String(r.USER_ID || "").trim() === String(id || "").trim()) || null;
}

function getOfficeList(s) {
  auth(s);
  return ok(read(SHEETS.OFFICE_MASTER).filter(r => active(r.ACTIVE)).map(r => ({
    officeId: String(r.OFFICE_ID || ""), officeName: String(r.OFFICE_NAME || ""), division: String(r.DIVISION || "")
  })));
}

function getUser(id, s) {
  const a = auth(s);
  if (a.role === ROLES.SPM && String(id) !== String(a.user.USER_ID)) throw new Error("Not authorized.");
  const u = findUser(id);
  if (!u) return err("User not found.");
  return ok({
    userId: String(u.USER_ID || ""), name: String(u.NAME || ""), role: normRole(u.ROLE),
    officeId: String(u.OFFICE_ID || ""), officeName: officeName(u.OFFICE_ID, u.OFFICE_NAME)
  });
}

function getPreviousDay(officeId, date, s) {
  const a = auth(s); assertOffice(a, officeId);
  const d = validateDate(date), prev = shift(d, -1);
  const r = dedupeDaily().find(x => String(x.OFFICE_ID) === String(officeId) && dateOf(x.DATE) === prev);
  return ok(r ? {
    date: prev,
    kitsCameToday: num(r.KITS_CAME_TODAY), kitsDelivered: num(r.KITS_DELIVERED),
    redirected: num(r.REDIRECTED), currentPending: num(r.CURRENT_PENDING)
  } : null);
}

function getOwnTodayRecord(s) {
  const a = auth(s);
  if (a.role !== ROLES.SPM) throw new Error("Only SPM users can access this function.");
  const rs = dedupeDaily().filter(r => String(r.SPM_ID).trim() === String(a.user.USER_ID).trim() && dateOf(r.DATE) === todayISO());
  return ok(rs.length ? mapRecord(rs[0]) : null);
}

// ---------------- PMV REPORT BACKEND ----------------

function submitPmvReport(record, s) {
  const a = auth(s);
  if (a.role !== ROLES.SPM) return err("Only SPM users can submit PMV reports.", "FORBIDDEN");

  ensurePmvSheets();
  const r = normalizePmv(record);
  r.spmId = String(a.user.USER_ID);
  r.spmName = String(a.user.NAME || "");

  if (String(a.user.OFFICE_ID) !== String(r.officeId)) return err("You are not authorized to submit data for this office.", "FORBIDDEN");
  const office = getOffice(r.officeId);
  r.officeName = String(office.OFFICE_NAME || "");

  const v = validatePmvReport(r);
  if (!v.valid) return { success:false, code:"VALIDATION", message:v.errors[0], errors:v.errors };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const existing = findPmvBySpmDate(r.spmId, r.date);
    if (existing) return { success:false, code:"DUPLICATE", message:"You have already submitted a PMV report for this date.", errors:[] };

    r.reportId = r.reportId || Utilities.getUuid();
    const previous = previousPmvPending(r.officeId, r.date);
    const calc = calculatePmv(r, previous);

    // Status rows must reconcile exactly with current pending.
    if (calc.statusPendingKits !== calc.totalPendingKits) {
      throw new Error("Kits status total must equal Total Pending Kits.");
    }
    if (calc.statusPendingArticles !== calc.totalPendingArticles) {
      throw new Error("Article status total must equal Total Pending Articles.");
    }

    const sh = getSheet(SHEETS.PMV_REPORTS);
    sh.appendRow(pmvRow(r, calc));
    saveReceiptEntries(r, r.receiptEntries);
    return ok({ reportId:r.reportId, report:pmvObject(r, calc) }, "PMV report saved successfully.");
  } finally {
    lock.releaseLock();
  }
}

function getOwnPmvDashboard(s, date) {
  const a = auth(s);
  if (a.role !== ROLES.SPM) throw new Error("Only SPM users can access this dashboard.");
  ensurePmvSheets();
  const d = validateDate(date);
  const r = findPmvBySpmDate(a.user.USER_ID, d);
  return ok({
    date:d,
    officeId:String(a.user.OFFICE_ID || ""),
    officeName:officeName(a.user.OFFICE_ID, a.user.OFFICE_NAME),
    report:r ? pmvObjectFromRow(r) : null
  });
}

function getAdminPmvDashboard(s, date) {
  const a = auth(s);
  if (a.role !== ROLES.DPS && a.role !== ROLES.ADMIN) throw new Error("Only DPS/Admin users can access this dashboard.");
  ensurePmvSheets();
  const d = validateDate(date);
  const reports = dedupePmv().filter(r => dateOf(r.DATE) === d);
  const spms = read(SHEETS.USER_MASTER).filter(u => active(u.ACTIVE) && normRole(u.ROLE) === ROLES.SPM);
  const offices = read(SHEETS.OFFICE_MASTER).filter(o => active(o.ACTIVE));
  const reportBySpm = {};
  reports.forEach(r => reportBySpm[String(r.SPM_ID).trim()] = r);

  let kitsCameToday=0, articlesCameToday=0, redirectedKits=0, redirectedArticles=0;
  let pendingKits=0, pendingArticles=0, deliverableKits=0, deliverableArticles=0;
  let invalidMobileKits=0, invalidMobileArticles=0, incompleteKits=0, incompleteArticles=0;
  let improperKits=0, improperArticles=0, kitsDelivered=0, articlesDelivered=0;

  const rows = spms.map(u => {
    const r = reportBySpm[String(u.USER_ID).trim()];
    if (!r) return {
      officeName:officeName(u.OFFICE_ID,u.OFFICE_NAME), spmName:String(u.NAME||""), spmId:String(u.USER_ID||""),
      status:"Not updated", kitsCameToday:0, articlesCameToday:0, redirectedKits:0, redirectedArticles:0,
      kitsDelivered:0, articlesDelivered:0, totalPendingKits:0, totalPendingArticles:0,
      invalidMobileKits:0, invalidMobileArticles:0, deliverableKits:0, deliverableArticles:0,
      incompleteKits:0, incompleteArticles:0, improperDetailsKits:0, improperDetailsArticles:0,
      netKits:0, netArticles:0
    };
    const x = pmvObjectFromRow(r);
    kitsCameToday += x.kitsCameToday; articlesCameToday += x.articlesCameToday;
    redirectedKits += x.redirectedKits; redirectedArticles += x.redirectedArticles;
    kitsDelivered += x.kitsDelivered; articlesDelivered += x.articlesDelivered;
    pendingKits += x.totalPendingKits; pendingArticles += x.totalPendingArticles;
    deliverableKits += x.deliverableKits; deliverableArticles += x.deliverableArticles;
    invalidMobileKits += x.invalidMobileKits; invalidMobileArticles += x.invalidMobileArticles;
    incompleteKits += x.incompleteKits; incompleteArticles += x.incompleteArticles;
    improperKits += x.improperDetailsKits; improperArticles += x.improperDetailsArticles;
    return Object.assign(x,{status:"Updated"});
  });

  const updated = rows.filter(x => x.status === "Updated").length;
  const pendingSpms = rows.filter(x => x.status !== "Updated").map(x => ({
    spmName:x.spmName, spmId:x.spmId, officeName:x.officeName, officeId:x.officeId || ""
  }));

  const officeWise = offices.map(o => {
    const oid = String(o.OFFICE_ID);
    const rr = rows.filter(x => String(x.officeId || "") === oid && x.status === "Updated");
    return {
      officeId:oid, officeName:String(o.OFFICE_NAME||""),
      totalSpms:spms.filter(u => String(u.OFFICE_ID)===oid).length,
      updatedSpms:rr.length,
      pendingSpms:spms.filter(u => String(u.OFFICE_ID)===oid && !reportBySpm[String(u.USER_ID).trim()]).length,
      kitsCameToday:sum(rr,"kitsCameToday"), articlesCameToday:sum(rr,"articlesCameToday"),
      redirectedKits:sum(rr,"redirectedKits"), redirectedArticles:sum(rr,"redirectedArticles"),
      kitsDelivered:sum(rr,"kitsDelivered"), articlesDelivered:sum(rr,"articlesDelivered"),
      totalPendingKits:sum(rr,"totalPendingKits"), totalPendingArticles:sum(rr,"totalPendingArticles"),
      deliverableKits:sum(rr,"deliverableKits"), deliverableArticles:sum(rr,"deliverableArticles"),
      invalidMobileKits:sum(rr,"invalidMobileKits"), invalidMobileArticles:sum(rr,"invalidMobileArticles"),
      incompleteKits:sum(rr,"incompleteKits"), incompleteArticles:sum(rr,"incompleteArticles"),
      improperDetailsKits:sum(rr,"improperDetailsKits"), improperDetailsArticles:sum(rr,"improperDetailsArticles")
    };
  });

  return ok({
    date:d,
    totals:{
      kitsCameToday,articlesCameToday,redirectedKits,redirectedArticles,
      kitsDelivered,articlesDelivered,totalPendingKits:pendingKits,totalPendingArticles:pendingArticles,
      deliverableKits,deliverableArticles,invalidMobileKits,invalidMobileArticles,
      incompleteKits,incompleteArticles,improperDetailsKits:improperKits,improperDetailsArticles:improperArticles
    },
    spmsUpdatedToday:updated, activeSpms:spms.length, spmsPendingUpdate:spms.length-updated,
    completionPercentage:spms.length ? round(updated/spms.length*100) : 0,
    officeWise, detailedSpmData:rows, pendingSpms
  });
}

function deleteOwnPmvReport(s, date) {
  const a = auth(s);
  if (a.role !== ROLES.SPM) return err("Only SPM users can delete their own PMV report.", "FORBIDDEN");
  ensurePmvSheets();
  const d = validateDate(date);
  const r = findPmvBySpmDate(a.user.USER_ID,d);
  if (!r) return err("No PMV report found for this date.","NOT_FOUND");
  getSheet(SHEETS.PMV_REPORTS).deleteRow(Number(r.__row));
  deleteReceiptsByReportId(r.REPORT_ID);
  return ok({deleted:true},"PMV report deleted.");
}

function normalizePmv(r) {
  r = JSON.parse(JSON.stringify(r || {}));
  r.reportId=String(r.reportId||r.id||"").trim();
  r.date=String(r.date||"").trim();
  r.officeId=String(r.officeId||"").trim();
  const keys=[
    "kitsCameToday","articlesCameToday","redirectedKits","redirectedArticles",
    "kitsDelivered","articlesDelivered","invalidMobileKits","invalidMobileArticles",
    "deliverableKits","deliverableArticles","incompleteKits","incompleteArticles",
    "improperDetailsKits","improperDetailsArticles"
  ];
  keys.forEach(k => r[k]=r[k]==null||r[k]===""?0:Number(r[k]));
  r.receiptEntries=Array.isArray(r.receiptEntries)?r.receiptEntries:[];
  return r;
}

function validatePmvReport(r) {
  const e=[];
  if (!r.date) e.push("Date is required.");
  else { try { if(validateDate(r.date)>todayISO()) e.push("Future dates are not allowed."); } catch(x){e.push(x.message);} }
  if (!r.officeId) e.push("Office is required.");
  else { try { getOffice(r.officeId); } catch(x){ e.push(x.message); } }
  const keys=[
    "kitsCameToday","articlesCameToday","redirectedKits","redirectedArticles",
    "kitsDelivered","articlesDelivered","invalidMobileKits","invalidMobileArticles",
    "deliverableKits","deliverableArticles","incompleteKits","incompleteArticles",
    "improperDetailsKits","improperDetailsArticles"
  ];
  keys.forEach(k=>{ if(!isInt(r[k])) e.push(k+" must be a non-negative integer."); });
  if (r.redirectedKits>r.kitsCameToday) e.push("Redirected kits cannot exceed kits received today.");
  if (r.redirectedArticles>r.articlesCameToday) e.push("Redirected articles cannot exceed articles received today.");
  if (r.kitsDelivered>r.kitsCameToday-r.redirectedKits) e.push("Kits delivered cannot exceed net kits after redirection.");
  if (r.articlesDelivered>r.articlesCameToday-r.redirectedArticles) e.push("Articles delivered cannot exceed net articles after redirection.");
  return {valid:e.length===0,errors:e};
}

function calculatePmv(r, previous) {
  const netKits=Math.max(0,r.kitsCameToday-r.redirectedKits);
  const netArticles=Math.max(0,r.articlesCameToday-r.redirectedArticles);
  const currentPendingKits=Math.max(0,previous.kits+netKits-r.kitsDelivered);
  const currentPendingArticles=Math.max(0,previous.articles+netArticles-r.articlesDelivered);
  const statusPendingKits=r.invalidMobileKits+r.deliverableKits+r.incompleteKits+r.improperDetailsKits;
  const statusPendingArticles=r.invalidMobileArticles+r.deliverableArticles+r.incompleteArticles+r.improperDetailsArticles;
  return {
    netKits,netArticles,currentPendingKits,currentPendingArticles,
    totalPendingKits:currentPendingKits,totalPendingArticles:currentPendingArticles,
    previousPendingKits:previous.kits,previousPendingArticles:previous.articles,
    statusPendingKits,statusPendingArticles
  };
}

function pmvRow(r,c) {
  return [r.reportId,r.date,r.officeId,r.officeName,r.spmId,r.spmName,
    r.kitsCameToday,r.articlesCameToday,r.redirectedKits,r.redirectedArticles,
    r.kitsDelivered,r.articlesDelivered,r.invalidMobileKits,r.invalidMobileArticles,
    r.deliverableKits,r.deliverableArticles,r.incompleteKits,r.incompleteArticles,
    r.improperDetailsKits,r.improperDetailsArticles,c.netKits,c.netArticles,
    c.totalPendingKits,c.totalPendingArticles,c.previousPendingKits||0,c.previousPendingArticles||0,
    new Date(),new Date(),"FINAL"];
}

function pmvObject(r,c) {
  return {
    reportId:r.reportId,date:r.date,officeId:r.officeId,officeName:r.officeName,spmId:r.spmId,spmName:r.spmName,
    kitsCameToday:r.kitsCameToday,articlesCameToday:r.articlesCameToday,
    redirectedKits:r.redirectedKits,redirectedArticles:r.redirectedArticles,
    kitsDelivered:r.kitsDelivered,articlesDelivered:r.articlesDelivered,
    invalidMobileKits:r.invalidMobileKits,invalidMobileArticles:r.invalidMobileArticles,
    deliverableKits:r.deliverableKits,deliverableArticles:r.deliverableArticles,
    incompleteKits:r.incompleteKits,incompleteArticles:r.incompleteArticles,
    improperDetailsKits:r.improperDetailsKits,improperDetailsArticles:r.improperDetailsArticles,
    netKits:c.netKits,netArticles:c.netArticles,totalPendingKits:c.totalPendingKits,totalPendingArticles:c.totalPendingArticles
  };
}

function pmvObjectFromRow(r) {
  return {
    reportId:String(r.REPORT_ID||""),date:dateOf(r.DATE),officeId:String(r.OFFICE_ID||""),officeName:String(r.OFFICE_NAME||""),
    spmId:String(r.SPM_ID||""),spmName:String(r.SPM_NAME||""),
    kitsCameToday:num(r.KITS_CAME_TODAY),articlesCameToday:num(r.ARTICLES_CAME_TODAY),
    redirectedKits:num(r.REDIRECTED_KITS),redirectedArticles:num(r.REDIRECTED_ARTICLES),
    kitsDelivered:num(r.KITS_DELIVERED),articlesDelivered:num(r.ARTICLES_DELIVERED),
    invalidMobileKits:num(r.INVALID_MOBILE_KITS),invalidMobileArticles:num(r.INVALID_MOBILE_ARTICLES),
    deliverableKits:num(r.DELIVERABLE_KITS),deliverableArticles:num(r.DELIVERABLE_ARTICLES),
    incompleteKits:num(r.INCOMPLETE_KITS),incompleteArticles:num(r.INCOMPLETE_ARTICLES),
    improperDetailsKits:num(r.IMPROPER_DETAILS_KITS),improperDetailsArticles:num(r.IMPROPER_DETAILS_ARTICLES),
    netKits:num(r.NET_KITS),netArticles:num(r.NET_ARTICLES),
    totalPendingKits:num(r.TOTAL_PENDING_KITS),totalPendingArticles:num(r.TOTAL_PENDING_ARTICLES),
    previousPendingKits:num(r.PREVIOUS_PENDING_KITS),previousPendingArticles:num(r.PREVIOUS_PENDING_ARTICLES)
  };
}

function findPmvBySpmDate(spm,date) {
  return dedupePmv().find(r=>String(r.SPM_ID).trim()===String(spm).trim() && dateOf(r.DATE)===String(date))||null;
}

function dedupePmv() {
  const m={};
  read(SHEETS.PMV_REPORTS).forEach(r=>{
    const k=String(r.SPM_ID).trim()+"|"+dateOf(r.DATE);
    if(!m[k] || Number(r.__row)>Number(m[k].__row)) m[k]=r;
  });
  return Object.keys(m).map(k=>m[k]);
}

function previousPmvPending(officeId,date) {
  const prev=shift(date,-1);
  const rows=dedupePmv().filter(r=>String(r.OFFICE_ID)===String(officeId) && dateOf(r.DATE)===prev);
  return {kits:sum(rows,"TOTAL_PENDING_KITS"),articles:sum(rows,"TOTAL_PENDING_ARTICLES")};
}

function saveReceiptEntries(r,entries) {
  if(!entries || !entries.length) return;
  const sh=getSheet(SHEETS.PMV_RECEIPTS);
  entries.forEach(x=>{
    const type=String(x.type||x.TYPE||"").toUpperCase();
    const movement=String(x.movement||x.MOVEMENT||"").toUpperCase();
    const qty=num(x.quantity!=null?x.quantity:x.QUANTITY);
    if((type!=="KIT"&&type!=="ARTICLE") || (movement!=="RECEIVED"&&movement!=="REDIRECTED") || qty<1) return;
    sh.appendRow([Utilities.getUuid(),r.reportId,r.date,r.officeId,r.spmId,type,movement,Math.floor(qty),new Date()]);
  });
}

function deleteReceiptsByReportId(id) {
  const sh=getSheet(SHEETS.PMV_RECEIPTS);
  const rows=read(SHEETS.PMV_RECEIPTS).filter(r=>String(r.REPORT_ID)===String(id)).sort((a,b)=>Number(b.__row)-Number(a.__row));
  rows.forEach(r=>sh.deleteRow(Number(r.__row)));
}

// ---------------- EXISTING DAILY DATA BACKEND ----------------

function submitDailyRecord(record,s){
  const a=auth(s), r=normalizeDaily(record);
  if(a.role===ROLES.SPM && String(a.user.OFFICE_ID)!==String(r.officeId)) return err("You are not authorized to submit data for this office.","FORBIDDEN");
  const o=getOffice(r.officeId); r.officeName=String(o.OFFICE_NAME||""); r.spmId=String(a.user.USER_ID); r.spmName=String(a.user.NAME||"");
  const v=validateDailyRecord(r); if(!v.valid) return {success:false,code:"VALIDATION",message:v.errors[0],errors:v.errors};
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try{
    if(findById(r.id)) return ok({recordId:r.id,alreadyProcessed:true},"Record already synchronized.");
    if(findBySpmDate(r.spmId,r.date)) return {success:false,code:"DUPLICATE",message:"You have already submitted data for this date.",errors:[]};
    const totals=totalsFor(r), prev=previousPending(r), currentPending=Math.max(0,prev+totals.totalPending);
    getSheet(SHEETS.DAILY_DATA).appendRow([
      r.id,r.date,r.officeId,r.officeName,r.spmId,r.spmName,r.kitsCameToday,r.kitsDelivered,r.redirected,
      r.mobileInvalid,r.addressNotFound,r.torn,r.incompleteRows.length,totals.kitsIncomplete,r.completeRows.length,
      totals.kitsComplete,totals.totalPending,totals.deliveryPercentage,prev,totals.totalPending,0,currentPending,
      new Date(r.submittedAt||Date.now()),new Date(),"FINAL"
    ]);
  } finally { lock.releaseLock(); }
  return ok({recordId:r.id},"Record saved successfully.");
}

function normalizeDaily(r){
  r=JSON.parse(JSON.stringify(r||{})); r.id=String(r.id||"").trim(); r.date=String(r.date||"").trim(); r.officeId=String(r.officeId||"").trim();
  ["kitsCameToday","kitsDelivered","redirected","mobileInvalid","addressNotFound","torn"].forEach(k=>r[k]=r[k]==null||r[k]===""?0:Number(r[k]));
  r.incompleteRows=Array.isArray(r.incompleteRows)?r.incompleteRows.map(x=>({setNumber:x.setNumber==null||x.setNumber===""?"":Number(x.setNumber),kitsIncomplete:x.kitsIncomplete==null||x.kitsIncomplete===""?0:Number(x.kitsIncomplete)})):[];
  r.completeRows=Array.isArray(r.completeRows)?r.completeRows.map(x=>({setNumber:x.setNumber==null||x.setNumber===""?"":Number(x.setNumber),kitsComplete:x.kitsComplete==null||x.kitsComplete===""?0:Number(x.kitsComplete)})):[];
  return r;
}

function validateDailyRecord(r){
  const e=[]; if(!r.id)e.push("Record ID is required."); if(!r.date)e.push("Date is required."); else{try{if(validateDate(r.date)>todayISO())e.push("Future dates are not allowed.");}catch(x){e.push(x.message);}}
  try{getOffice(r.officeId);}catch(x){e.push(x.message);}
  ["kitsCameToday","kitsDelivered","redirected","mobileInvalid","addressNotFound","torn"].forEach(k=>{if(!isInt(r[k]))e.push(k+" must be a non-negative integer.");});
  if(r.kitsDelivered+r.redirected>r.kitsCameToday)e.push("Delivered + Redirected cannot exceed Kits Came Today.");
  r.incompleteRows.concat(r.completeRows).forEach(x=>{if(x.setNumber!==""&&!isInt(x.setNumber))e.push("Set number must be a non-negative integer.");});
  return {valid:e.length===0,errors:e};
}

function totalsFor(r){
  const incomplete=r.incompleteRows.reduce((s,x)=>s+(Number(x.kitsIncomplete)||0),0);
  const complete=r.completeRows.reduce((s,x)=>s+(Number(x.kitsComplete)||0),0);
  const pending=r.mobileInvalid+r.addressNotFound+r.torn+incomplete+complete;
  return {kitsIncomplete:incomplete,kitsComplete:complete,totalPending:pending,deliveryPercentage:r.kitsCameToday?round(r.kitsDelivered/r.kitsCameToday*100):0};
}

function previousPending(r){const x=dedupeDaily().find(z=>String(z.OFFICE_ID)===String(r.officeId)&&dateOf(z.DATE)===shift(r.date,-1));return x?num(x.CURRENT_PENDING):0;}
function dedupeDaily(){const m={};read(SHEETS.DAILY_DATA).forEach(r=>{const k=String(r.SPM_ID).trim()+"|"+dateOf(r.DATE);if(!m[k]||Number(r.__row)>Number(m[k].__row))m[k]=r;});return Object.keys(m).map(k=>m[k]);}
function findById(id){return read(SHEETS.DAILY_DATA).find(r=>String(r.ID).trim()===String(id||"").trim())||null;}
function findBySpmDate(spm,date){return read(SHEETS.DAILY_DATA).find(r=>String(r.SPM_ID).trim()===String(spm).trim()&&dateOf(r.DATE)===String(date))||null;}
function mapRecord(r){return {id:String(r.ID||""),date:dateOf(r.DATE),officeId:String(r.OFFICE_ID||""),officeName:String(r.OFFICE_NAME||""),spmId:String(r.SPM_ID||""),spmName:String(r.SPM_NAME||""),kitsCameToday:num(r.KITS_CAME_TODAY),kitsDelivered:num(r.KITS_DELIVERED),redirected:num(r.REDIRECTED),totalPending:num(r.TOTAL_PENDING),deliveryPercentage:num(r.DELIVERY_PERCENTAGE),status:String(r.STATUS||"")};}

function updateDailyRecord(record,s){
  const a=auth(s); if(a.role!==ROLES.DPS&&a.role!==ROLES.ADMIN)return err("Only DPS/Admin can edit finalized records.","FORBIDDEN");
  const ex=findById(record&&record.id); if(!ex)return err("Record not found.","NOT_FOUND");
  const r=normalizeDaily(record); r.officeId=String(ex.OFFICE_ID); r.officeName=String(ex.OFFICE_NAME); r.spmId=String(ex.SPM_ID); r.spmName=String(ex.SPM_NAME);
  const v=validateDailyRecord(r); if(!v.valid)return {success:false,code:"VALIDATION",message:v.errors[0],errors:v.errors};
  const t=totalsFor(r),p=previousPending(r),cp=Math.max(0,p+t.totalPending);
  getSheet(SHEETS.DAILY_DATA).getRange(Number(ex.__row),1,1,25).setValues([[r.id,r.date,r.officeId,r.officeName,r.spmId,r.spmName,r.kitsCameToday,r.kitsDelivered,r.redirected,r.mobileInvalid,r.addressNotFound,r.torn,r.incompleteRows.length,t.kitsIncomplete,r.completeRows.length,t.kitsComplete,t.totalPending,t.deliveryPercentage,p,t.totalPending,0,cp,ex.SUBMITTED_AT,new Date(),"FINAL"]]);
  return ok({recordId:r.id},"Record updated successfully.");
}

function deleteOwnTodayRecord(s,recordId){const a=auth(s);if(a.role!==ROLES.SPM)return err("Only SPM users can delete their own today's entry.","FORBIDDEN");const rows=read(SHEETS.DAILY_DATA).filter(r=>String(r.SPM_ID).trim()===String(a.user.USER_ID)&&dateOf(r.DATE)===todayISO());if(!rows.length)return err("No entry for today was found.","NOT_FOUND");const sh=getSheet(SHEETS.DAILY_DATA);rows.sort((x,y)=>Number(y.__row)-Number(x.__row)).forEach(r=>sh.deleteRow(Number(r.__row)));return ok({deleted:true,rowsDeleted:rows.length},"Today's entry deleted.");}

function getAdminTodayUpdateStatus(s,date){
  const a=auth(s);if(a.role!==ROLES.DPS&&a.role!==ROLES.ADMIN)throw new Error("Only DPS/Admin users can access update status.");
  const d=validateDate(date),users=read(SHEETS.USER_MASTER).filter(u=>active(u.ACTIVE)&&normRole(u.ROLE)===ROLES.SPM),recs=dedupeDaily().filter(r=>dateOf(r.DATE)===d);
  const updated={};recs.forEach(r=>updated[String(r.SPM_ID).trim()]=true);const pending=users.filter(u=>!updated[String(u.USER_ID).trim()]).map(u=>({spmId:String(u.USER_ID),spmName:String(u.NAME||""),officeId:String(u.OFFICE_ID||""),officeName:officeName(u.OFFICE_ID,u.OFFICE_NAME)}));
  const done=users.filter(u=>updated[String(u.USER_ID).trim()]).map(u=>({spmId:String(u.USER_ID),spmName:String(u.NAME||""),officeId:String(u.OFFICE_ID||""),officeName:officeName(u.OFFICE_ID,u.OFFICE_NAME)}));
  return ok({date:d,spmsUpdatedToday:done.length,activeSpms:users.length,spmsPendingUpdate:pending.length,completionPercentage:users.length?round(done.length/users.length*100):0,updatedSpms:done,pendingSpms:pending});
}

// ---------------- HELPERS ----------------

function ensurePmvSheets(){ensureSheet(SHEETS.PMV_REPORTS,PMV_HEADERS);ensureSheet(SHEETS.PMV_RECEIPTS,RECEIPT_HEADERS);}
function ensureSheet(name,headers){const ss=SpreadsheetApp.openById(SPREADSHEET_ID);let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]);else{const existing=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getValues()[0].map(String);headers.forEach(h=>{if(existing.indexOf(h)<0){sh.getRange(1,sh.getLastColumn()+1).setValue(h);existing.push(h);}});}return sh;}
function getSheet(name){const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);if(!sh)throw new Error("Sheet not found: "+name);return sh;}
function read(name){const sh=getSheet(name),v=sh.getDataRange().getValues();if(!v.length)return[];const h=v[0].map(x=>String(x).trim());return v.slice(1).map((row,i)=>{const o={__row:i+2};h.forEach((k,j)=>o[k]=row[j]);return o;}).filter(o=>Object.keys(o).some(k=>k!=="__row"&&o[k]!==""&&o[k]!==null));}
function active(v){return v===true||String(v).trim().toUpperCase()!=="FALSE"&&String(v).trim()!=="0"&&String(v).trim()!=="INACTIVE";}
function normRole(v){const x=String(v||"").trim().toUpperCase();return x===ROLES.SPM?ROLES.SPM:x===ROLES.DPS?ROLES.DPS:x===ROLES.ADMIN?ROLES.ADMIN:"";}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function isInt(v){return Number.isInteger(Number(v))&&Number(v)>=0;}
function round(v){return Math.round(Number(v)||0);}
function sum(arr,key){return arr.reduce((s,x)=>s+num(x[key]),0);}
function todayISO(){return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||"Asia/Kolkata","yyyy-MM-dd");}
function validateDate(s){const x=String(s||"").trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(x))throw new Error("Invalid date format. Use YYYY-MM-DD.");const d=new Date(x+"T00:00:00");if(isNaN(d.getTime()))throw new Error("Invalid date.");return x;}
function shift(iso,days){const d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+days);return Utilities.formatDate(d,Session.getScriptTimeZone()||"Asia/Kolkata","yyyy-MM-dd");}
function dateOf(v){if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone()||"Asia/Kolkata","yyyy-MM-dd");const s=String(v||"");if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.substring(0,10);const d=new Date(v);return isNaN(d.getTime())?s:Utilities.formatDate(d,Session.getScriptTimeZone()||"Asia/Kolkata","yyyy-MM-dd");}
function officeName(id,fallback){const o=read(SHEETS.OFFICE_MASTER).find(x=>String(x.OFFICE_ID).trim()===String(id).trim());return o?String(o.OFFICE_NAME||""):String(fallback||"");}
function getOffice(id){const o=read(SHEETS.OFFICE_MASTER).find(x=>String(x.OFFICE_ID).trim()===String(id).trim());if(!o)throw new Error("Office not found in OFFICE_MASTER.");if(!active(o.ACTIVE))throw new Error("Office is inactive.");return o;}
function assertOffice(a,id){const o=getOffice(id);if(a.role===ROLES.SPM&&String(a.user.OFFICE_ID)!==String(o.OFFICE_ID))throw new Error("Not authorized for this office.");}
function invalidate(token){const sh=getSheet(SHEETS.SESSIONS),v=sh.getDataRange().getValues();for(let i=1;i<v.length;i++)if(String(v[i][0])===String(token)){sh.getRange(i+1,5).setValue(false);break;}}
function ok(data,message){return {success:true,data:data==null?null:data,message:message||"OK"};}
function err(message,code){return {success:false,code:code||"ERROR",message:String(message||"Error")};}
function out(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}
