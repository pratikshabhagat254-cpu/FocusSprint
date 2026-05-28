// storage.js
// all the localStorage reading and writing lives here
// keeps everything else cleaner

const KEYS = {
  tasks:       'fs_tasks_v4',
  profile:     'fs_profile_v4',
  activity:    'fs_activity_v4',
  points:      'fs_points_v4',
  pointsLog:   'fs_points_log_v4',
  leaderboard: 'fs_leaderboard_v4',
  groups:      'fs_groups_v4',
  theme:       'fs_theme_v1',
};

// these are the main data stores used everywhere
let tasks = [];
let profile = {
  name: '', username: '', branch: '', year: '',
  goal: '', target: 6, weeklyTarget: 35,
  quote: '', avatarColor: 0, bio: ''
};
let activity = {};     // { "YYYY-MM-DD": count }
let pointsLog = [];    // [ { date, delta, reason } ]
let groups = [];       // array of group objects

function loadAll() {
  try { tasks     = JSON.parse(localStorage.getItem(KEYS.tasks))     || []; } catch { tasks = []; }
  try { profile   = { ...profile, ...JSON.parse(localStorage.getItem(KEYS.profile)) }; } catch {}
  try { activity  = JSON.parse(localStorage.getItem(KEYS.activity))  || {}; } catch { activity = {}; }
  try { pointsLog = JSON.parse(localStorage.getItem(KEYS.pointsLog)) || []; } catch { pointsLog = []; }
  try { groups    = JSON.parse(localStorage.getItem(KEYS.groups))    || []; } catch { groups = []; }
}

function saveTasks()     { localStorage.setItem(KEYS.tasks,     JSON.stringify(tasks)); }
function saveProfile()   { localStorage.setItem(KEYS.profile,   JSON.stringify(profile)); }
function saveActivity()  { localStorage.setItem(KEYS.activity,  JSON.stringify(activity)); }
function savePointsLog() { localStorage.setItem(KEYS.pointsLog, JSON.stringify(pointsLog)); }
function saveGroups()    { localStorage.setItem(KEYS.groups,    JSON.stringify(groups)); }

// returns today as "YYYY-MM-DD"
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// total points = sum of all pointsLog deltas
function getTotalPoints() {
  return pointsLog.reduce((sum, entry) => sum + entry.delta, 0);
}

// points earned on a specific date string
function getPointsOnDate(dateStr) {
  return pointsLog
    .filter(e => e.date === dateStr)
    .reduce((sum, e) => sum + e.delta, 0);
}

// points earned in last N days
function getPointsInLastDays(n) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return pointsLog
    .filter(e => new Date(e.date) >= cutoff)
    .reduce((sum, e) => sum + e.delta, 0);
}

// add a points entry
function addPoints(delta, reason) {
  pointsLog.push({ date: todayStr(), delta, reason });
  savePointsLog();
}