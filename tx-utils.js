const TRANSACTION_EDIT_KEY = 'transactionEdits';

function simpleHash(value) {
  let hash = 0;
  const str = String(value || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function getTxSignature(tx) {
  const amount = Number(tx.amount ?? tx.Amount ?? 0);
  const normalizedAmount = Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
  return [
    String(tx.type || '').trim().toLowerCase(),
    normalizedAmount,
    String(tx.category || '').trim().toLowerCase(),
    String(tx.date || '').trim().toLowerCase(),
    String(tx.note || '').trim().toLowerCase()
  ].join('|');
}

function normalizeTx(raw) {
  return {
    type: String(raw.type || raw.Type || 'Expense').trim() || 'Expense',
    amount: Number(raw.amount ?? raw.Amount ?? 0),
    category: String(raw.category || raw.Category || '').trim(),
    date: String(raw.date || raw.Date || '').trim(),
    note: String(raw.note || raw.Note || '').trim()
  };
}

function assignTransactionIds(list) {
  const seen = new Map();
  return list.map((raw) => {
    const tx = normalizeTx(raw);
    const signature = getTxSignature(tx);
    const occurrence = (seen.get(signature) || 0) + 1;
    seen.set(signature, occurrence);
    return {
      ...tx,
      id: `tx-${simpleHash(signature)}-${occurrence}`
    };
  });
}

function loadTransactionState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRANSACTION_EDIT_KEY) || '{"edits":{}}');
    return {
      edits: parsed && typeof parsed === 'object' && parsed.edits && typeof parsed.edits === 'object' ? parsed.edits : {}
    };
  } catch {
    return { edits: {} };
  }
}

function saveTransactionState(state) {
  localStorage.setItem(TRANSACTION_EDIT_KEY, JSON.stringify(state));
}

function applyTransactionEdits(list) {
  const { edits } = loadTransactionState();
  return list.map(tx => (edits[tx.id] ? { ...tx, ...edits[tx.id] } : tx));
}
