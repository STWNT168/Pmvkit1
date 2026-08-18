const CONFIG = Object.freeze({
  API_URL: "https://script.google.com/macros/s/AKfycbz99tuShcZP2e4cPYKObZU0SGbckHL6uw68wRfZCwmRO9xAQuPNpinC0LisHvEDWxxC/exec",
  APP_NAME: "PMV Toolkit Management System",
  SHORT_NAME: "PMV Tracker",
  VERSION: "5.1.0",
  DIVISION_NAME: "Udhampur Division",
  ROLES: Object.freeze({SPM:"SPM",DPS:"DPS",ADMIN:"ADMIN"}),
  DB_NAME: "pmv_toolkit_db",
  DB_VERSION: 5,
  STORE_DRAFTS: "drafts",
  STORE_PENDING_SYNC: "pending_sync",
  STORE_HISTORY_CACHE: "history_cache",
  STORE_SESSION: "session",
  SYNC_RETRY_INTERVAL_MS: 30000,
  SW_CACHE: "pmv-toolkit-v5.1.0"
});
