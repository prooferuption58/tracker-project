// ── FIREBASE SETUP ────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC_Niy6WGDptax5GtXUGVB3IptOv7VW2O0",
  authDomain: "tracker-7f675.firebaseapp.com",
  projectId: "tracker-7f675",
//   storageBucket: "tracker-7f675.firebasestorage.app",
     storageBucket: "tracker-7f675.appspot.com",
  messagingSenderId: "300099586592",
  appId: "1:300099586592:web:0c029949ead878d1620a45",
  measurementId: "G-7Y8KGTTNB2"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

const CURRENCY_SYMBOLS = {
  NGN:'₦',USD:'$',EUR:'€',GBP:'£',JPY:'¥',CNY:'¥',CAD:'C$',AUD:'A$',CHF:'Fr',INR:'₹',
  ZAR:'R',GHS:'₵',KES:'KSh',EGP:'E£',MAD:'MAD',TZS:'TSh',UGX:'USh',ETB:'Br',XOF:'CFA',XAF:'CFA',
  DZD:'DA',LYD:'LD',SDG:'SDG',SLL:'Le',LRD:'L$',MWK:'MK',ZMW:'ZK',ZWL:'Z$',RWF:'RF',BWP:'P',
  BRL:'R$',MXN:'MX$',SGD:'S$',HKD:'HK$',TRY:'₺',SAR:'﷼',AED:'د.إ',KRW:'₩',RUB:'₽',IDR:'Rp'
};

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAYS_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MON  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let DB          = {};
let currentKey  = '';
let slideIdx    = 0;
let saveTimer   = null;
let currentUser = null;
let currencyCode = 'NGN';
let currencySymbol = '₦';
let dChart = null, bChart = null;

const g  = id => document.getElementById(id);
const gv = id => parseFloat(g(id).value) || 0;
const esc = s => (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmt = n => currencySymbol + (parseFloat(n)||0).toLocaleString();

function showToast(msg) {
  const t = g('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function showLoading(show) { g('loading-screen').style.display = show ? 'flex' : 'none'; }
function showError(id, msg) { const el = g(id); if(!el) return; el.textContent = msg; el.classList.remove('hidden'); }
function clearErrors() {
  ['login-error','signup-error','forgot-error','forgot-success'].forEach(id => {
    const el = g(id); if(el) { el.classList.add('hidden'); el.textContent = ''; }
  });
}

// you edited from here 
function setLoading(isLoading) {
  const loadingScreen = document.getElementById("loading-screen");
  if (isLoading) {
    loadingScreen.style.display = "flex";
  } else {
    loadingScreen.style.display = "none";
  }
}


function togglePw(inputId, btn) {
  const inp = g(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.style.color = show ? 'var(--gold)' : 'var(--muted)';
}

function friendlyError(code) {
  const map = {
    'auth/invalid-email':            'That doesn\'t look like a valid email address.',
    'auth/user-not-found':           'No account found with that email. Want to sign up?',
    'auth/wrong-password':           'Incorrect password. Please try again.',
    'auth/invalid-credential':       'Incorrect email or password. Please check and try again.',
    'auth/email-already-in-use':     'An account with this email already exists. Try signing in.',
    'auth/weak-password':            'Your password is too short. Please use at least 6 characters.',
    'auth/too-many-requests':        'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':   'No internet connection. Please check your network.',
    'auth/popup-closed-by-user':     'Google sign-in was cancelled. Please try again.',
    'auth/cancelled-popup-request':  'Sign-in cancelled. Please try again.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function showAuth() {
  showLoading(false);
  g('app-screen').classList.add('hidden');
  g('auth-screen').classList.remove('hidden');
  showForm('login');
}

function showForm(name) {
  clearErrors();
  ['login','signup','forgot'].forEach(f => g('form-'+f).classList.add('hidden'));
  g('form-'+name).classList.remove('hidden');
}

async function handleLogin() {
  clearErrors();
  const email = g('login-email').value.trim();
  const pw    = g('login-password').value;
  if (!email || !pw) { showError('login-error','Please fill in your email and password.'); return; }
  const btn = g('login-btn'); btn.disabled = true; btn.textContent = 'Signing in...';
  showLoading(true);
  try {
    await auth.signInWithEmailAndPassword(email, pw);
  } catch(e) {
    showLoading(false); btn.disabled = false; btn.textContent = 'Sign In';
    showError('login-error', friendlyError(e.code));
  }
}

async function handleSignup() {
  clearErrors();
  const name = g('signup-name').value.trim();
  const email = g('signup-email').value.trim();
  const pw    = g('signup-password').value;
  const conf  = g('signup-confirm').value;

  if (!name || !email || !pw || !conf) { showError('signup-error','Please fill in all fields.'); return; }
  if (pw.length < 6) { showError('signup-error','Password must be at least 6 characters.'); return; }
  if (pw !== conf) { showError('signup-error','Your passwords don\'t match.'); return; }

  const btn = g('signup-btn'); btn.disabled = true; btn.textContent = 'Creating account...';
  showLoading(true);

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pw);
    await cred.user.updateProfile({ displayName: name });

    const emailParams = {
      user_name: name,
      user_email: email,
      welcome_message: "Welcome to the Weekly Spending Tracker! We're excited to help you track your behavior and save more."
    };

    emailjs.send("service_dgdxl7u", "template_4svhiu6", emailParams)
      .then(() => console.log("Welcome email sent!"))
      .catch((err) => console.error("Email failed:", err));

    await cred.user.sendEmailVerification();
    showLoading(false); 
    btn.disabled = false; 
    btn.textContent = 'Create Account';

    const s = document.createElement('div'); s.className = 'auth-success';
    s.textContent = 'Account created! Check your email to verify and then sign in.';
    g('form-signup').appendChild(s);
    
    await auth.signOut();
  } catch(e) {
    showLoading(false); btn.disabled = false; btn.textContent = 'Create Account';
    showError('signup-error', friendlyError(e.code));
  }
}

// async function handleSignup() {
//   clearErrors();
//   const name = g('signup-name').value.trim();
//   const email = g('signup-email').value.trim();
//   const pw    = g('signup-password').value;
//   const conf  = g('signup-confirm').value;
//   if (!name||!email||!pw||!conf) { showError('signup-error','Please fill in all fields.'); return; }
//   if (pw.length < 6) { showError('signup-error','Password must be at least 6 characters.'); return; }
//   if (pw !== conf) { showError('signup-error','Your passwords don\'t match. Please try again.'); return; }
//   const btn = g('signup-btn'); btn.disabled = true; btn.textContent = 'Creating account...';
//   showLoading(true);
//   try {
//     const cred = await auth.createUserWithEmailAndPassword(email, pw);
//     await cred.user.updateProfile({ displayName: name });
//     await cred.user.sendEmailVerification();
//     showLoading(false); btn.disabled = false; btn.textContent = 'Create Account';
//     const old = g('form-signup').querySelector('.auth-success'); if(old) old.remove();
//     const s = document.createElement('div'); s.className = 'auth-success';
//     s.textContent = 'Account created! We\'ve sent a confirmation email. Please verify and then sign in.';
//     g('form-signup').appendChild(s);
//     await auth.signOut();
//   } catch(e) {
//     showLoading(false); btn.disabled = false; btn.textContent = 'Create Account';
//     showError('signup-error', friendlyError(e.code));
//   }
// }

async function handleGoogle() {
  clearErrors();
  showLoading(true);
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch(e) {
    showLoading(false);
    showError('login-error', friendlyError(e.code));
    showError('signup-error', friendlyError(e.code));
  }
}

async function handleForgot() {
  clearErrors();
  const email = g('forgot-email').value.trim();
  if (!email) { showError('forgot-error','Please enter your email address.'); return; }
  showLoading(true);
  try {
    await auth.sendPasswordResetEmail(email);
    showLoading(false);
    const s = g('forgot-success');
    s.textContent = 'Password reset link sent! Check your inbox (and spam folder just in case).';
    s.classList.remove('hidden');
  } catch(e) {
    showLoading(false);
    showError('forgot-error', friendlyError(e.code));
  }
}

async function handleLogout() {
  g('user-dropdown').classList.add('hidden');
  showLoading(true);
  try { await auth.signOut(); } catch(e) {}
  currentUser = null; DB = {};
  showAuth();
}

function toggleDropdown() {
  g('user-dropdown').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const av = g('user-avatar'), dd = g('user-dropdown');
  if (!av||!dd) return;
  if (!av.contains(e.target) && !dd.contains(e.target)) dd.classList.add('hidden');
});

// ── CURRENCY ──────────────────────────────────────────────────────────────────
function changeCurrency() {
  const sel = g('currency-select');
  currencyCode   = sel.value;
  currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  updateAllSymbols();
  updatePlan();
  updateLogTotal();
  saveUserPrefs();
}

function updateAllSymbols() {
  ['pfx-total','pfx-needs','pfx-data','pfx-sav','pfx-flex'].forEach(id => {
    const el = g(id); if(el) el.textContent = currencySymbol;
  });
  document.querySelectorAll('.log-total-bar span:last-child').forEach(el => {
    el.textContent = fmt(parseLogTotal());
  });
}

async function saveUserPrefs() {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).set({ currency: currencyCode }, { merge: true });
  } catch(e) {}
}

async function loadUserPrefs() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists && doc.data().currency) {
      currencyCode   = doc.data().currency;
      currencySymbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
      g('currency-select').value = currencyCode;
      updateAllSymbols();
    }
  } catch(e) {}
}

// ── LOAD APP ──────────────────────────────────────────────────────────────────
async function loadApp(user) {
  currentUser = user;
  const name = user.displayName || user.email.split('@')[0];
  g('user-avatar').textContent        = name.charAt(0).toUpperCase();
  g('user-name-display').textContent  = name;
  g('user-email-display').textContent = user.email;
  g('auth-screen').classList.add('hidden');
  g('app-screen').classList.remove('hidden');
  console.log("Hiding loading screen now");
  setLoading(false);
  await loadUserPrefs();
  currentKey = weekKey(new Date());
  await fetchWeek(currentKey);
  loadWeek();
  buildDots();
}

// ── FIRESTORE ─────────────────────────────────────────────────────────────────
async function fetchWeek(key) {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).collection('weeks').doc(key).get();
    if (doc.exists) DB[key] = doc.data();
  } catch(e) {}
}

async function saveWeek(key) {
  if (!currentUser || !DB[key]) return;
  try {
    await db.collection('users').doc(currentUser.uid).collection('weeks').doc(key).set(DB[key]);
  } catch(e) {}
}

async function fetchAllWeeksForMonth(year, month) {
  if (!currentUser) return [];
  try {
    const prefix = `w_${year}_${month+1}_`;
    const snap = await db.collection('users').doc(currentUser.uid).collection('weeks').get();
    const results = [];
    snap.forEach(doc => {
      if (doc.id.startsWith('w_' + year + '_' + (month+1) + '_') ||
          doc.id.startsWith('w_' + year + '_' + String(month+1).padStart(2,'0') + '_')) {
        results.push({ key: doc.id, data: doc.data() });
      }
    });
    // Also check if week spans into this month
    snap.forEach(doc => {
      const mon = keyToMonday(doc.id);
      if (mon.getFullYear() === year && mon.getMonth() === month && !results.find(r => r.key === doc.id)) {
        results.push({ key: doc.id, data: doc.data() });
      }
    });
    return results;
  } catch(e) { return []; }
}

async function fetchAllMonths() {
  if (!currentUser) return [];
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('weeks').get();
    const months = new Set();
    snap.forEach(doc => {
      const mon = keyToMonday(doc.id);
      months.add(mon.getFullYear() + '_' + mon.getMonth());
    });
    return [...months].map(s => { const [y,m] = s.split('_'); return { year: +y, month: +m }; })
      .sort((a,b) => b.year - a.year || b.month - a.month);
  } catch(e) { return []; }
}

// ── AUTOSAVE ──────────────────────────────────────────────────────────────────
function autoSave() {
  const dot = g('autosave-dot'), txt = g('autosave-text');
  dot.className = 'autosave-dot saving'; txt.textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    collect();
    await saveWeek(currentKey);
    dot.className = 'autosave-dot'; txt.textContent = 'All changes saved';
    checkBehaviouralAlerts();

  }, 800);
}

// ── WEEK HELPERS ──────────────────────────────────────────────────────────────
function toMonday(date) {
  const d = new Date(date); d.setHours(0,0,0,0);
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - day + 1); return d;
}
function weekKey(date) {
  const d = toMonday(date);
  return `w_${d.getFullYear()}_${d.getMonth()+1}_${d.getDate()}`;
}
function keyToMonday(key) {
  const p = key.split('_');
  const d = new Date(+p[1], +p[2]-1, +p[3]); d.setHours(0,0,0,0); return d;
}
function weekLabel(key) {
  const mon = keyToMonday(key), sun = new Date(mon); sun.setDate(sun.getDate()+6);
  if (mon.getMonth() === sun.getMonth())
    return `${mon.getDate()} \u2013 ${sun.getDate()} ${MON_SHORT[mon.getMonth()]} ${mon.getFullYear()}`;
  return `${mon.getDate()} ${MON_SHORT[mon.getMonth()]} \u2013 ${sun.getDate()} ${MON_SHORT[sun.getMonth()]} ${sun.getFullYear()}`;
}

// ── BLANK WEEK ────────────────────────────────────────────────────────────────
function blankWeek() {
  return {
    plan: { total:0, needs:0, data:0, savings:0, flex:0 },
    log:  Object.fromEntries(DAYS.map(d => [d, []])),
    noBuy: [], urges: [],
    ref: { r1:'',r2:'',r3:'',r4:'',r5:'',g1:'',g2:'',g3:'' }
  };
}
function wData() {
  if (!DB[currentKey]) DB[currentKey] = blankWeek();
  // ensure log has all days
  DAYS.forEach(d => { if (!DB[currentKey].log[d]) DB[currentKey].log[d] = []; });
  return DB[currentKey];
}

// ── COLLECT ───────────────────────────────────────────────────────────────────
function collect() {
  const w = wData();
  w.plan.total   = gv('total-budget');
  w.plan.needs   = gv('budget-needs');
  w.plan.data    = gv('budget-data');
  w.plan.savings = gv('budget-savings');
  w.plan.flex    = gv('budget-flex');

  DAYS.forEach(day => {
    const section = document.querySelector(`.log-day-section[data-day="${day}"]`);
    if (!section) return;
    const rows = section.querySelectorAll('.log-item-row');
    w.log[day] = [];
    rows.forEach(row => {
      w.log[day].push({
        item:   row.querySelector('.log-item-name').value,
        amount: parseFloat(row.querySelector('.log-item-amt').value) || 0,
        type:   row.querySelector('.log-item-select').value,
        before: row.querySelector('.log-item-mood.before').value,
        after:  row.querySelector('.log-item-mood.after').value
      });
    });
  });

  w.noBuy = [...document.querySelectorAll('.day-btn.active')].map(b => b.dataset.day);

  w.urges = [...document.querySelectorAll('.urge-entry')].map(u => ({
    what:   u.querySelector('.urge-what').value,
    why:    u.querySelector('.urge-why').value,
    bought: u.querySelector('.urge-bought').value
  }));

  w.ref = {
    r1:g('ref-1').value, r2:g('ref-2').value, r3:g('ref-3').value,
    r4:g('ref-4').value, r5:g('ref-5').value,
    g1:g('grat-1').value, g2:g('grat-2').value, g3:g('grat-3').value
  };
}

// ── LOAD WEEK ─────────────────────────────────────────────────────────────────
function loadWeek() {
  const w = wData();
  g('week-label').textContent   = weekLabel(currentKey);
  g('total-budget').value   = w.plan.total   || '';
  g('budget-needs').value   = w.plan.needs   || '';
  g('budget-data').value    = w.plan.data    || '';
  g('budget-savings').value = w.plan.savings || '';
  g('budget-flex').value    = w.plan.flex    || '';
  buildLogDays(w);
  buildNoBuy(w);
  buildUrges(w);
  loadRef(w);
  updatePlan();
  updateAllSymbols();
  checkBehaviouralAlerts();
}

async function changeWeek(dir) {
  collect(); await saveWeek(currentKey);
  const d = keyToMonday(currentKey); d.setDate(d.getDate() + dir * 7);
  currentKey = weekKey(d);
  if (!DB[currentKey]) await fetchWeek(currentKey);
  loadWeek();
}

// ── LOG — day sections with + Add Item ───────────────────────────────────────
function buildLogDays(w) {
  const container = g('log-days-container'); container.innerHTML = '';
  DAYS.forEach(day => {
    const items = (w.log && w.log[day]) ? w.log[day] : [];
    const section = document.createElement('div');
    section.className = 'log-day-section';
    section.dataset.day = day;

    const noBuyActive = (w.noBuy || []).includes(DAYS_SHORT[DAYS.indexOf(day)]);
    const hasSpending = items.some(i => i.amount > 0);
    const violated = noBuyActive && hasSpending;

    const label = document.createElement('div');
    label.className = 'log-day-label' + (violated ? ' nobuy-violated' : '');
    label.textContent = day;
    if (violated) {
      const flag = document.createElement('span');
      flag.className = 'nobuy-flag';
      flag.textContent = '— spending on a no-buy day';
      label.appendChild(flag);
    }
    section.appendChild(label);

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'log-items';
    items.forEach((item, idx) => addLogItemToSection(itemsContainer, item, day));
    section.appendChild(itemsContainer);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-item-btn';
    addBtn.textContent = '+ Add item';
    addBtn.onclick = () => {
      addLogItemToSection(itemsContainer, {}, day);
      autoSave();
    };
    section.appendChild(addBtn);
    container.appendChild(section);
  });
  updateLogTotal();
}

function addLogItemToSection(container, item, day) {
  const row = document.createElement('div');
  row.className = 'log-item-row' + (item.type === 'impulse' ? ' impulse-row' : '');

  row.innerHTML = `
    <input class="log-item-name" type="text" placeholder="Item" value="${esc(item.item||'')}">
    <input class="log-item-amt" type="number" placeholder="0" value="${item.amount||''}">
    <select class="log-item-select">
      <option value="needed"${item.type==='needed'?' selected':''}>Need</option>
      <option value="impulse"${item.type==='impulse'?' selected':''}>Impulse</option>
      <option value="nobuy"${item.type==='nobuy'?' selected':''}>No Buy</option>
    </select>
    <input class="log-item-mood before" type="text" placeholder="Mood before" value="${esc(item.before||'')}">
    <input class="log-item-mood after"  type="text" placeholder="Moodafter"  value="${esc(item.after||'')}">
    <button class="log-item-del" onclick="this.closest('.log-item-row').remove();autoSave();updateLogTotal();updatePlan()">&times;</button>
  `;

  row.querySelector('.log-item-name').addEventListener('input', () => autoSave());
  row.querySelector('.log-item-amt').addEventListener('input', () => { autoSave(); updateLogTotal(); updatePlan(); });
  row.querySelector('.log-item-select').addEventListener('change', function() {
    row.classList.toggle('impulse-row', this.value === 'impulse');
    autoSave();
  });
  row.querySelector('.log-item-mood.before').addEventListener('input', () => autoSave());
  row.querySelector('.log-item-mood.after').addEventListener('input', () => autoSave());

  container.appendChild(row);
}

function parseLogTotal() {
  let t = 0;
  document.querySelectorAll('.log-item-amt').forEach(i => t += parseFloat(i.value)||0);
  return t;
}
function updateLogTotal() {
  const el = g('log-total'); if(el) el.textContent = fmt(parseLogTotal());
}

// ── NO-BUY DAYS ───────────────────────────────────────────────────────────────
function buildNoBuy(w) {
  const grid = g('nobuyday-grid'); grid.innerHTML = '';
  DAYS_SHORT.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'day-btn' + ((w.noBuy||[]).includes(day) ? ' active' : '');
    btn.dataset.day = day; btn.textContent = day;
    btn.onclick = () => { btn.classList.toggle('active'); autoSave(); checkNoBuyViolations(); };
    grid.appendChild(btn);
  });
  checkNoBuyViolations();
}

function checkNoBuyViolations() {
  const w = wData();
  const activeDays = [...document.querySelectorAll('.day-btn.active')].map(b => b.dataset.day);
  let violated = false;

  function checkBehavioralAlerts() {
  const w = wData();
  const total  = gv('total-budget');
  const spent  = parseLogTotal();
  const savings = gv('budget-savings');

  // --- Alert 1: Overspending ---
  const overspendEl = g('alert-overspend');
  if (overspendEl) {
    if (total > 0 && spent > total) {
      overspendEl.textContent = '⚠️ You\'ve gone over your weekly budget. Let\'s pause and reflect before spending more.';
      overspendEl.classList.remove('hidden');
    } else {
      overspendEl.classList.add('hidden');
    }
  }

  // --- Alert 2: No savings goal set ---
  const savingsEl = g('alert-no-savings');
  if (savingsEl) {
    if (total > 0 && savings === 0) {
      savingsEl.textContent = '💡 You haven\'t set a savings goal this week. Even a small amount counts.';
      savingsEl.classList.remove('hidden');
    } else {
      savingsEl.classList.add('hidden');
    }
  }

  // --- Alert 3: Spent every single day ---
  const everyDayEl = g('alert-every-day');
  if (everyDayEl) {
    const daysWithSpending = DAYS.filter(day => {
      const items = w.log[day] || [];
      return items.some(i => (parseFloat(i.amount) || 0) > 0);
    });
    if (daysWithSpending.length === 7) {
      everyDayEl.textContent = '📅 You spent every single day this week. Consider setting a no-buy day next week.';
      everyDayEl.classList.remove('hidden');
    } else {
      everyDayEl.classList.add('hidden');
    }
  }

  // --- Alert 4: High impulse spending (over 50%) ---
  const impulseEl = g('alert-high-impulse');
  if (impulseEl) {
    let impulseTotal = 0;
    DAYS.forEach(day => {
      (w.log[day] || []).forEach(item => {
        if (item.type === 'impulse') impulseTotal += parseFloat(item.amount) || 0;
      });
    });
    const impulsePct = spent > 0 ? (impulseTotal / spent) * 100 : 0;
    if (spent > 0 && impulsePct > 50) {
      impulseEl.textContent = `🛑 ${Math.round(impulsePct)}% of your spending this week was impulse. Worth reflecting on in your journal.`;
      impulseEl.classList.remove('hidden');
    } else {
      impulseEl.classList.add('hidden');
    }
  }
}

  DAYS.forEach((day, idx) => {
    const shortDay = DAYS_SHORT[idx];
    const items = w.log[day] || [];
    const hasSpending = items.some(i => (parseFloat(i.amount)||0) > 0);
    const isNoBuy = activeDays.includes(shortDay);
    const section = document.querySelector(`.log-day-section[data-day="${day}"] .log-day-label`);
    const flag = document.querySelector(`.log-day-section[data-day="${day}"] .nobuy-flag`);

    if (isNoBuy && hasSpending) {
      violated = true;
      if (section) section.className = 'log-day-label nobuy-violated';
      if (!flag) {
        const f = document.createElement('span');
        f.className = 'nobuy-flag';
        f.textContent = '— spending on a no-buy day';
        if(section) section.appendChild(f);
      }
    } else {
      if (section) section.className = 'log-day-label';
      if (flag) flag.remove();
    }
  });

  const msg = g('nobuy-msg');
  if (violated) {
    msg.textContent = 'You spent on a day you marked as a no-buy day. We could try better next week.';
    msg.classList.remove('hidden');
  } else {
    msg.classList.add('hidden');
  }
}

// ── URGE ──────────────────────────────────────────────────────────────────────
function buildUrges(w) {
  g('urge-list').innerHTML = '';
  (w.urges||[]).forEach(u => addUrgeEntry(u));
}
function addUrge() { addUrgeEntry({}); autoSave(); }
function addUrgeEntry(u) {
  const div = document.createElement('div'); div.className = 'urge-entry';
  div.innerHTML = `
    <button class="urge-del" onclick="this.closest('.urge-entry').remove();autoSave()">&times;</button>
    <input class="urge-what" type="text" placeholder="What did I want to buy?" value="${esc(u.what||'')}">
    <input class="urge-why"  type="text" placeholder="Why did I want it?"       value="${esc(u.why||'')}">
    <select class="urge-bought">
      <option value="">Did I buy it after 24 hrs?</option>
      <option value="yes"${u.bought==='yes'?' selected':''}>Yes</option>
      <option value="no"${u.bought==='no'?' selected':''}>No — I resisted 💪</option>
    </select>`;
  div.querySelectorAll('input, select').forEach(el => el.addEventListener('input', autoSave));
  g('urge-list').appendChild(div);
}

// ── REFLECTIONS ───────────────────────────────────────────────────────────────
function loadRef(w) {
  const r = w.ref||{};
  for(let i=1;i<=5;i++) { const el=g('ref-'+i); if(el) el.value=r['r'+i]||''; }
  for(let j=1;j<=3;j++) { const el=g('grat-'+j); if(el) el.value=r['g'+j]||''; }
}

// ── PLAN ──────────────────────────────────────────────────────────────────────
function updatePlan() {
  const total=gv('total-budget'), needs=gv('budget-needs'), data=gv('budget-data'),
        sav=gv('budget-savings'), flex=gv('budget-flex');
  const alloc=needs+data+sav+flex, spent=parseLogTotal(), rem=total-spent;
  g('sum-allocated').textContent = fmt(alloc);
  g('sum-spent').textContent     = fmt(spent);
  g('sum-remaining').textContent = fmt(rem);
  g('remaining-row').className   = 'budget-row total ' + (rem>=0?'g':'r');
  const pct = total>0 ? Math.min((spent/total)*100,100) : 0;
  g('progress-fill').style.width = pct+'%';
  g('progress-fill').className   = 'progress-fill'+(pct>85?' danger':'');
  g('progress-pct').textContent  = Math.round(pct)+'%';
}

// ── SLIDES ────────────────────────────────────────────────────────────────────
function buildDots() {
  const c = g('reflect-dots'); c.innerHTML = '';
  for(let i=0;i<3;i++) {
    const d = document.createElement('div');
    d.className = 'dot'+(i===slideIdx?' active':'');
    d.onclick = () => goSlide(i);
    c.appendChild(d);
  }
}
function goSlide(i) {
  slideIdx = i;
  g('reflect-track').style.transform = `translateX(-${i*100}%)`;
  buildDots();
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function revealStat(card) { card.classList.add('revealed'); }
function revealChart(wrap) { wrap.classList.add('revealed'); }

function updateStats() {
  const w = wData();
  const spent = parseLogTotal(), total = gv('total-budget'), saved = Math.max(0,total-spent);
  let imp=0, ned=0, dayA=DAYS.map(()=>0);

  DAYS.forEach((day,i) => {
    (w.log[day]||[]).forEach(item => {
      const a = parseFloat(item.amount)||0;
      if(item.type==='impulse') imp+=a; else ned+=a;
      dayA[i]+=a;
    });
  });

  g('stat-total').textContent       = fmt(spent);
  g('stat-saved').textContent       = fmt(saved);
  g('stat-impulse-pct').textContent = (spent>0?Math.round((imp/spent)*100):0)+'%';
  g('stat-nobuy').textContent       = document.querySelectorAll('.day-btn.active').length;

  const dCtx = g('doughnut-chart');
  if(dChart) dChart.destroy();
  dChart = new Chart(dCtx, {
    type:'doughnut',
    data:{ labels:['Needs','Impulse'], datasets:[{ data:[ned||1,imp], backgroundColor:['#c9a96e','#c0392b'], borderWidth:0, hoverOffset:4 }] },
    options:{ plugins:{ legend:{ labels:{ color:'#888', font:{size:11} } } }, cutout:'65%' }
  });

  const bCtx = g('bar-chart');
  if(bChart) bChart.destroy();
  bChart = new Chart(bCtx, {
    type:'bar',
    data:{ labels:DAYS_SHORT, datasets:[{ data:dayA, backgroundColor:'rgba(201,169,110,0.7)', borderRadius:6, borderSkipped:false }] },
    options:{ plugins:{ legend:{display:false} }, scales:{
      x:{ ticks:{color:'#888',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'} },
      y:{ ticks:{color:'#888',font:{size:10},callback:v=>currencySymbol+v.toLocaleString()}, grid:{color:'rgba(255,255,255,0.04)'} }
    }}
  });
}

// ── MONTHLY ───────────────────────────────────────────────────────────────────
async function loadMonthly() {
  const picker = g('month-picker'); picker.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0">Loading months...</div>';
  g('month-detail').classList.add('hidden');

  const months = await fetchAllMonths();
  picker.innerHTML = '';

  if (months.length === 0) {
    picker.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0;text-align:center">No data yet. Start tracking your first week!</div>';
    return;
  }

  months.forEach(({ year, month }) => {
    const card = document.createElement('div');
    card.className = 'month-card';
    card.innerHTML = `
      <div>
        <div class="month-card-label">${MON[month]} ${year}</div>
        <div class="month-card-sub">Tap to view full breakdown</div>
      </div>
      <div style="color:var(--gold);font-size:20px">&#8250;</div>`;
    card.onclick = () => openMonthDetail(year, month);
    picker.appendChild(card);
  });
}

async function openMonthDetail(year, month) {
  g('month-detail-title').textContent = `${MON[month]} ${year}`;
  g('month-detail').classList.remove('hidden');
  g('month-picker').classList.add('hidden');
  const content = g('month-detail-content');
  content.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0">Loading...</div>';

  const weeks = await fetchAllWeeksForMonth(year, month);
  content.innerHTML = '';

  if (weeks.length === 0) {
    content.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:20px 0;text-align:center">No entries for this month yet.</div>';
    return;
  }

  weeks.sort((a,b) => keyToMonday(a.key) - keyToMonday(b.key));

  let monthTotal = 0, monthSaved = 0;

  weeks.forEach(({ key, data: w }) => {
    if (!w) return;
    const card = document.createElement('div');
    card.className = 'week-detail-card';

    let weekSpent = 0;
    const dayRows = DAYS.map(day => {
      const items = (w.log && w.log[day]) ? w.log[day] : [];
      const dayTotal = items.reduce((s,i) => s+(parseFloat(i.amount)||0), 0);
      weekSpent += dayTotal;
      if (items.length === 0) return '';
      const itemsList = items.map(i =>
        `<div class="day-entry-item">${esc(i.item||'—')} · ${fmt(i.amount)} · ${i.type}</div>`
      ).join('');
      return `<div class="week-detail-row"><span>${day}</span><span>${fmt(dayTotal)}</span></div>${itemsList}`;
    }).join('');

    const budget = w.plan ? (w.plan.total||0) : 0;
    const saved  = budget > 0 ? Math.max(0, budget - weekSpent) : 0;
    monthTotal += weekSpent; monthSaved += saved;

    card.innerHTML = `
      <div class="week-detail-title">${weekLabel(key)}</div>
      ${dayRows}
      <div class="week-detail-row total"><span>Week total</span><span>${fmt(weekSpent)}</span></div>
      <div class="week-detail-row"><span>Budget</span><span>${fmt(budget)}</span></div>
      <div class="week-detail-row" style="color:var(--green)"><span>Saved</span><span>${fmt(saved)}</span></div>`;
    content.appendChild(card);
  });

  // Month summary
  const summary = document.createElement('div');
  summary.className = 'week-detail-card';
  summary.style.borderColor = 'var(--gold)';
  summary.innerHTML = `
    <div class="week-detail-title" style="color:var(--gold)">Month Summary</div>
    <div class="week-detail-row total"><span>Total spent</span><span>${fmt(monthTotal)}</span></div>
    <div class="week-detail-row" style="color:var(--green)"><span>Total saved</span><span>${fmt(monthSaved)}</span></div>
    <div class="week-detail-row"><span>Avg per week</span><span>${fmt(monthTotal / Math.max(weeks.length,1))}</span></div>`;
  content.appendChild(summary);
}

function closeMonthDetail() {
  g('month-detail').classList.add('hidden');
  g('month-picker').classList.remove('hidden');
}

// ── TABS ──────────────────────────────────────────────────────────────────────
const TAB_NAMES = ['plan','log','urge','reflect','stats','monthly'];
function showTab(name) {
  TAB_NAMES.forEach(t => {
    g('tab-'+t).classList.toggle('hidden', t!==name);
    g('tab-btn-'+t).classList.toggle('active', t===name);
  });
  if (name==='reflect') { buildDots(); goSlide(0); }
  if (name==='stats')   updateStats();
  if (name==='monthly') loadMonthly();
  window.scrollTo({top:0, behavior:'smooth'});
}

// ── WEEKLY RESET CHECK ────────────────────────────────────────────────────────
function checkWeeklyReset() {
  const now = new Date();
  const currentWeek = weekKey(now);
  // If stored key differs from current week key, week has rolled over
  if (currentKey !== currentWeek) {
    currentKey = currentWeek;
    fetchWeek(currentKey).then(() => loadWeek());
  }
}
setInterval(checkWeeklyReset, 60000);

setLoading(true);

auth.onAuthStateChanged(user => {
    // console.log("Auth state checked:", user);
  if (user) {
    loadApp(user);
  } else {
    showAuth();
  }

  setLoading(false);
});
window.addEventListener('load', () => {
    if(window.lucide) {
        lucide.createIcons();
    }
});