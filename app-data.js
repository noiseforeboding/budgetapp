(function () {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyulEmg-gesuCE_5S4jeeOr0kXk2-YZmrTietxFd0mXyAW-NnAhVmBfoIioyr1Dex7rEg/exec";

  function parseTxDate(value) {
    if (value === null || value === undefined || value === "") return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const text = String(value).trim();
    if (!text) return null;

    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[2]);
      const day = Number(ymd[3]);
      const parsed = new Date(year, month - 1, day);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function normalizeTransaction(raw) {
    const item = raw || {};

    const typeRaw = item.type ?? item.Type ?? "";
    const categoryRaw = item.category ?? item.Category ?? "";
    const amountRaw = item.amount ?? item.Amount ?? 0;
    const dateRaw = item.date ?? item.Date ?? "";
    const noteRaw = item.note ?? item.Note ?? "";

    return {
      type: typeof typeRaw === "string" ? typeRaw.trim() : String(typeRaw || "").trim(),
      category: typeof categoryRaw === "string" ? categoryRaw.trim() : String(categoryRaw || "").trim(),
      amount: Number(amountRaw),
      date: typeof dateRaw === "string" ? dateRaw.trim() : dateRaw,
      note: typeof noteRaw === "string" ? noteRaw.trim() : String(noteRaw || "").trim()
    };
  }

  function loadLocalTransactions(localStorageKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(localStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  async function loadTransactionsAndBudgets(options = {}) {
    const {
      scriptUrl = SCRIPT_URL,
      localStorageKey = "transactions"
    } = options;

    try {
      const response = await fetch(scriptUrl);
      const result = await response.json();

      if (result && result.status === "success") {
        const transactions = Array.isArray(result.transactions)
          ? result.transactions.map(normalizeTransaction)
          : [];
        const budgets = result.budgets && typeof result.budgets === "object"
          ? result.budgets
          : {};

        return { source: "script", transactions, budgets };
      }
    } catch (_) {
      // fall through to local data
    }

    const localTransactions = loadLocalTransactions(localStorageKey).map(normalizeTransaction);
    return {
      source: "local",
      transactions: localTransactions,
      budgets: {}
    };
  }

  function filterMonth(transactions, date = new Date()) {
    const ref = parseTxDate(date) || new Date();
    const month = ref.getMonth();
    const year = ref.getFullYear();

    return (Array.isArray(transactions) ? transactions : []).filter((tx) => {
      const d = parseTxDate(tx && tx.date);
      return d && d.getMonth() === month && d.getFullYear() === year;
    });
  }

  function filterWeek(transactions, date = new Date()) {
    const ref = parseTxDate(date) || new Date();

    const monday = new Date(ref);
    const day = monday.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return (Array.isArray(transactions) ? transactions : []).filter((tx) => {
      const d = parseTxDate(tx && tx.date);
      return d && d >= monday && d <= sunday;
    });
  }

  window.SCRIPT_URL = SCRIPT_URL;
  window.parseTxDate = parseTxDate;
  window.normalizeTransaction = normalizeTransaction;
  window.loadTransactionsAndBudgets = loadTransactionsAndBudgets;
  window.filterMonth = filterMonth;
  window.filterWeek = filterWeek;

  window.AppData = {
    SCRIPT_URL,
    parseTxDate,
    normalizeTransaction,
    loadTransactionsAndBudgets,
    filterMonth,
    filterWeek
  };
})();
