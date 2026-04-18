const QUOTES = [
  {q:"The secret of getting ahead is getting started.",a:"Mark Twain"},
  {q:"Write hard and clear about what hurts.",a:"Ernest Hemingway"},
  {q:"One day or day one. You decide.",a:"Unknown"},
  {q:"Small steps every day lead to big changes.",a:"Unknown"},
  {q:"Your journal is a garden for your thoughts.",a:"Unknown"}
];

let selectedMood = null;
let storedPass = localStorage.getItem('blogPass') || 'personalme';

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function doLogin() {
  const val = document.getElementById('pinInput').value;
  if (val === storedPass) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    loadAll();
  } else {
    document.getElementById('errMsg').textContent = 'Incorrect password. Try again.';
    document.getElementById('pinInput').value = '';
  }
}

function doLogout() {
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pinInput').value = '';
  document.getElementById('errMsg').textContent = '';
}

function nav(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  btn.classList.add('active');
}

function loadAll() {
  loadGallery(); loadBirthdays(); loadMoodHistory();
  const ab = localStorage.getItem('about');
  if (ab) { document.getElementById('homeAbout').textContent = ab; document.getElementById('aboutInput').value = ab; }
  const q = QUOTES[new Date().getDate() % QUOTES.length];
  document.getElementById('dailyQuote').innerHTML = `"${q.q}"<div class="quote-attr">— ${q.a}</div>`;
  updateStats();
  loadUpcoming();
}

function updateStats() {
  const diary = JSON.parse(localStorage.getItem('diary')||'{}');
  const bdays = JSON.parse(localStorage.getItem('birthdays')||'[]');
  const gallery = JSON.parse(localStorage.getItem('gallery')||'{}');
  let photos = 0;
  Object.values(gallery).forEach(arr => photos += arr.length);
  document.getElementById('statDiary').textContent = Object.keys(diary).length;
  document.getElementById('statBirthdays').textContent = bdays.length;
  document.getElementById('statPhotos').textContent = photos;
}

function loadUpcoming() {
  const bdays = JSON.parse(localStorage.getItem('birthdays')||'[]');
  const today = new Date();
  const upcoming = bdays.map(b => {
    const d = new Date(b.date);
    const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(today.getFullYear()+1);
    const diff = Math.ceil((next - today) / 86400000);
    return {...b, diff};
  }).filter(b => b.diff <= 30).sort((a,b) => a.diff - b.diff);
  const el = document.getElementById('homeUpcoming');
  if (!upcoming.length) { el.textContent = 'No upcoming birthdays in the next 30 days.'; return; }
  el.innerHTML = upcoming.map(b => `<div style="padding:6px 0;border-bottom:0.5px solid #e8e3dc;font-family:Arial,sans-serif;font-size:13px;display:flex;justify-content:space-between;"><span>${b.name}</span><span class="upcoming-badge">in ${b.diff} day${b.diff!==1?'s':''}</span></div>`).join('');
}

function addPhoto() {
  const date = document.getElementById('galleryDate').value;
  const file = document.getElementById('imageUpload').files[0];
  if (!date || !file) { toast('Please select a date and a photo.'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const gallery = JSON.parse(localStorage.getItem('gallery')||'{}');
    if (!gallery[date]) gallery[date] = [];
    gallery[date].push(e.target.result);
    localStorage.setItem('gallery', JSON.stringify(gallery));
    loadGallery(); updateStats(); toast('Photo added!');
  };
  reader.readAsDataURL(file);
}

function loadGallery() {
  const gallery = JSON.parse(localStorage.getItem('gallery')||'{}');
  const el = document.getElementById('galleryContent');
  el.innerHTML = '';
  const dates = Object.keys(gallery).sort().reverse();
  if (!dates.length) { el.innerHTML = '<div class="card" style="color:#aaa;font-size:13px;font-family:Arial,sans-serif;">No photos yet.</div>'; return; }
  dates.forEach(date => {
    const grp = document.createElement('div');
    grp.className = 'card gallery-group';
    grp.innerHTML = `<div class="card-label">${date}</div><div class="gallery-grid" id="gg-${date}"></div>`;
    el.appendChild(grp);
    const grid = grp.querySelector('.gallery-grid');
    gallery[date].forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      grid.appendChild(img);
    });
  });
}

function saveDiary() {
  const date = document.getElementById('diaryDate').value;
  const entry = document.getElementById('diaryEntry').value.trim();
  if (!date || !entry) { toast('Please select a date and write something.'); return; }
  const diary = JSON.parse(localStorage.getItem('diary')||'{}');
  diary[date] = entry;
  localStorage.setItem('diary', JSON.stringify(diary));
  updateStats(); toast('Diary entry saved!');
  document.getElementById('diaryEntry').value = '';
}

function searchDiary() {
  const date = document.getElementById('searchDate').value;
  if (!date) { toast('Please select a date.'); return; }
  const diary = JSON.parse(localStorage.getItem('diary')||'{}');
  const el = document.getElementById('searchResult');
  el.style.display = 'block';
  el.textContent = diary[date] || 'No entry found for this date.';
}

function showAllDiary() {
  const diary = JSON.parse(localStorage.getItem('diary')||'{}');
  const el = document.getElementById('searchResult');
  el.style.display = 'block';
  const dates = Object.keys(diary).sort().reverse();
  if (!dates.length) { el.textContent = 'No diary entries yet.'; return; }
  el.innerHTML = dates.map(d => `<div style="margin-bottom:12px;"><div style="font-size:11px;color:#aaa;margin-bottom:4px;letter-spacing:0.4px;">${d}</div><div style="color:#1a1a1a;">${diary[d]}</div></div>`).join('');
}

function addBirthday() {
  const name = document.getElementById('bdName').value.trim();
  const date = document.getElementById('bdDate').value;
  if (!name || !date) { toast('Please enter a name and date.'); return; }
  const bdays = JSON.parse(localStorage.getItem('birthdays')||'[]');
  bdays.push({name, date});
  localStorage.setItem('birthdays', JSON.stringify(bdays));
  loadBirthdays(); updateStats(); loadUpcoming(); toast('Birthday added!');
  document.getElementById('bdName').value = ''; document.getElementById('bdDate').value = '';
}

function loadBirthdays() {
  const bdays = JSON.parse(localStorage.getItem('birthdays')||'[]');
  const el = document.getElementById('birthdayList');
  if (!bdays.length) { el.innerHTML = '<div class="card" style="color:#aaa;font-size:13px;font-family:Arial,sans-serif;">No birthdays added yet.</div>'; return; }
  const today = new Date();
  el.innerHTML = '<div class="card">' + bdays.map((b,i) => {
    const d = new Date(b.date);
    const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(today.getFullYear()+1);
    const diff = Math.ceil((next - today) / 86400000);
    const soon = diff <= 7 ? `<span class="upcoming-badge">Soon!</span>` : '';
    return `<div class="birthday-item"><div><div class="birthday-name">${b.name} ${soon}</div><div class="birthday-date">${b.date}</div></div><button onclick="removeBirthday(${i})" style="background:none;border:none;color:#ccc;cursor:pointer;font-size:16px;" title="Remove">×</button></div>`;
  }).join('') + '</div>';
}

function removeBirthday(i) {
  const bdays = JSON.parse(localStorage.getItem('birthdays')||'[]');
  bdays.splice(i,1);
  localStorage.setItem('birthdays', JSON.stringify(bdays));
  loadBirthdays(); updateStats(); loadUpcoming(); toast('Removed.');
}

function selectMood(btn, mood) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedMood = mood;
}

function saveMood() {
  if (!selectedMood) { toast('Please select a mood.'); return; }
  const note = document.getElementById('moodNote').value.trim();
  const moods = JSON.parse(localStorage.getItem('moods')||'[]');
  const today = new Date().toISOString().split('T')[0];
  moods.unshift({date: today, mood: selectedMood, note});
  localStorage.setItem('moods', JSON.stringify(moods.slice(0,30)));
  loadMoodHistory(); toast('Mood logged!');
  document.getElementById('moodNote').value = '';
  selectedMood = null;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
}

function loadMoodHistory() {
  const moods = JSON.parse(localStorage.getItem('moods')||'[]');
  const el = document.getElementById('moodHistory');
  if (!moods.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="card"><div class="card-label">Recent moods</div>' + moods.slice(0,10).map(m =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid #e8e3dc;font-family:Arial,sans-serif;font-size:13px;"><div><span style="font-weight:500;">${m.mood}</span>${m.note ? ' — '+m.note : ''}</div><span style="color:#aaa;font-size:11px;">${m.date}</span></div>`
  ).join('') + '</div>';
}

function saveAbout() {
  const v = document.getElementById('aboutInput').value.trim();
  localStorage.setItem('about', v);
  document.getElementById('homeAbout').textContent = v || 'No information added yet.';
  toast('About saved!');
}

function applyFont() {
  const f = document.getElementById('fontSel').value;
  document.querySelector('.blog-root').style.fontFamily = f;
  toast('Font applied!');
}

function applyTheme(t) {
  const root = document.querySelector('.blog-root');
  const sidebar = document.querySelector('.sidebar');
  if (t === 'dark') {
    root.style.background = '#18181b'; root.style.color = '#e8e3dc';
    sidebar.style.background = '#111'; sidebar.style.borderColor = '#333';
    document.querySelectorAll('.card').forEach(c => { c.style.background='#222'; c.style.borderColor='#333'; });
  } else if (t === 'white') {
    root.style.background = '#fff'; root.style.color = '#1a1a1a';
    sidebar.style.background = '#fafafa'; sidebar.style.borderColor = '#eee';
    document.querySelectorAll('.card').forEach(c => { c.style.background='#fff'; c.style.borderColor='#eee'; });
  } else {
    root.style.background = '#faf8f5'; root.style.color = '#1a1a1a';
    sidebar.style.background = '#fff'; sidebar.style.borderColor = '#d6cfc4';
    document.querySelectorAll('.card').forEach(c => { c.style.background='#fff'; c.style.borderColor='#d6cfc4'; });
  }
  toast('Theme applied!');
}

function changePass() {
  const np = document.getElementById('newPass').value;
  if (!np || np.length < 4) { toast('Password must be at least 4 characters.'); return; }
  localStorage.setItem('blogPass', np);
  storedPass = np;
  document.getElementById('newPass').value = '';
  toast('Password updated!');
}

function clearAll() {
  if (!confirm('Clear ALL data? This cannot be undone.')) return;
  ['diary','gallery','birthdays','about','moods'].forEach(k => localStorage.removeItem(k));
  loadAll(); toast('All data cleared.');
}