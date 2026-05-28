// profile.js
// handles the profile section — levels, achievements, streak, and saving profile data

// avatar color options — user can cycle through these
const AVATAR_COLORS = [
  { bg: 'rgba(59,130,246,0.15)',   border: 'rgba(59,130,246,0.4)',   color: '#3b82f6' },
  { bg: 'rgba(61,214,140,0.15)',   border: 'rgba(61,214,140,0.4)',   color: '#3dd68c' },
  { bg: 'rgba(240,165,0,0.15)',    border: 'rgba(240,165,0,0.4)',    color: '#f0a500' },
  { bg: 'rgba(188,140,255,0.15)',  border: 'rgba(188,140,255,0.4)',  color: '#bc8cff' },
  { bg: 'rgba(232,108,58,0.15)',   border: 'rgba(232,108,58,0.4)',   color: '#e86c3a' },
];

// points thresholds for each level
const LEVELS = [
  { min: 0,   max: 50,  name: 'Beginner',          icon: '🌱' },
  { min: 50,  max: 150, name: 'Focused Learner',    icon: '📚' },
  { min: 150, max: 300, name: 'Productivity Pro',   icon: '🎯' },
  { min: 300, max: 500, name: 'Sprint Master',       icon: '⚡' },
  { min: 500, max: 999, name: 'Legend',              icon: '🏆' },
];

function getLevelInfo(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return { ...LEVELS[i], index: i };
  }
  return { ...LEVELS[0], index: 0 };
}

function getLevelProgress(points) {
  const level = getLevelInfo(points);
  const range = level.max - level.min;
  const progress = points - level.min;
  return Math.min(100, Math.round((progress / range) * 100));
}

function getAvatarInitial() {
  return profile.name ? profile.name.trim()[0].toUpperCase() : '?';
}

function applyAvatarStyle(el) {
  const scheme = AVATAR_COLORS[profile.avatarColor % AVATAR_COLORS.length];
  el.style.background  = scheme.bg;
  el.style.borderColor = scheme.border;
  el.style.color       = scheme.color;
}

// --- STREAK CALCULATION ---
// looks backwards from today counting consecutive days with activity
function calcStreak() {
  let streak = 0;
  const d = new Date(); d.setHours(0, 0, 0, 0);

  // if today has no activity, start checking from yesterday
  if (!activity[d.toISOString().split('T')[0]]) {
    d.setDate(d.getDate() - 1);
  }

  while (true) {
    const key = d.toISOString().split('T')[0];
    if (activity[key] && activity[key] > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderProfileUI() {
  const initial   = getAvatarInitial();
  const streak    = calcStreak();
  const completed = tasks.filter(t => t.completed).length;
  const totalPts  = getTotalPoints();
  const level     = getLevelInfo(totalPts);
  const levelPct  = getLevelProgress(totalPts);
  const score     = parseInt(document.getElementById('productivityScore')?.textContent) || 0;

  // update all avatar spots
  ['welcomeAvatar', 'sidebarAvatar', 'profileAvatarDisplay'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = initial;
    applyAvatarStyle(el);
  });

  // sidebar info
  document.getElementById('sidebarUserName').textContent   = profile.name || 'Set up profile';
  document.getElementById('sidebarUserBranch').textContent = profile.branch
    ? `${profile.branch}${profile.year ? ' · ' + profile.year : ''}`
    : 'Click to edit →';
  document.getElementById('sidebarLevelBadge').textContent = `Lv.${level.index + 1}`;

  // welcome card
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('welcomeGreeting').textContent =
    profile.name ? `${greeting}, ${profile.name.split(' ')[0]} 👋` : 'Hey there 👋';
  document.getElementById('welcomeName').textContent =
    profile.name ? profile.name : 'Set up your profile to get started';
  document.getElementById('welcomeGoal').textContent = profile.goal || '';
  document.getElementById('welcomeQuote').textContent =
    profile.quote || '"The secret of getting ahead is getting started."';

  const now = new Date();
  document.getElementById('welcomeDate').textContent =
    now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  // level row in welcome card
  const welcomeLevelRow = document.getElementById('welcomeLevelRow');
  if (welcomeLevelRow) {
    welcomeLevelRow.innerHTML = `
      <span class="welcome-level-pill">${level.icon} ${level.name}</span>
      <span class="welcome-pts-pill">⚡ ${totalPts} pts</span>
    `;
  }

  // profile card
  document.getElementById('profileAvatarDisplay').textContent = initial;
  document.getElementById('profileNameDisplay').textContent   = profile.name || 'Your Name';
  document.getElementById('profileBranchDisplay').textContent =
    profile.branch ? `${profile.branch}${profile.year ? ' — ' + profile.year : ''}` : '—';

  // level + points badges
  const levelBadge  = document.getElementById('profileLevelBadge');
  const pointsBadge = document.getElementById('profilePointsBadge');
  if (levelBadge)  levelBadge.textContent  = `${level.icon} ${level.name}`;
  if (pointsBadge) pointsBadge.textContent = `⚡ ${totalPts} pts`;

  // stats row
  document.getElementById('profileStreakVal').textContent = streak;
  document.getElementById('profileScoreVal').textContent  = score;
  document.getElementById('profileDoneVal').textContent   = completed;

  // level progress bar
  const progressFill  = document.getElementById('levelProgressFill');
  const progressPct   = document.getElementById('levelProgressPct');
  const progressLabel = document.getElementById('levelProgressLabel');
  if (progressFill)  progressFill.style.width = levelPct + '%';
  if (progressPct)   progressPct.textContent  = levelPct + '%';
  if (progressLabel) {
    const nextLevel = LEVELS[Math.min(level.index + 1, LEVELS.length - 1)];
    progressLabel.textContent = level.index < LEVELS.length - 1
      ? `${totalPts}/${nextLevel.min} pts to ${nextLevel.name}`
      : 'Max Level Reached!';
  }

  // sidebar streak + points
  document.getElementById('streakCount').textContent    = streak;
  document.getElementById('sidebarPointsNum').textContent = totalPts;

  // fill in the form fields with saved data
  document.getElementById('profileName').value         = profile.name          || '';
  document.getElementById('profileUsername').value     = profile.username       || '';
  document.getElementById('profileBranch').value       = profile.branch         || '';
  document.getElementById('profileYear').value         = profile.year           || '';
  document.getElementById('profileBio').value          = profile.bio            || '';
  document.getElementById('profileGoal').value         = profile.goal           || '';
  document.getElementById('profileTarget').value       = profile.target         || '';
  document.getElementById('profileWeeklyTarget').value = profile.weeklyTarget   || '';
  document.getElementById('profileQuote').value        = profile.quote          || '';

  renderAchievements(streak, completed, totalPts, score);
}

function renderAchievements(streak, completed, points, score) {
  const container = document.getElementById('achievementsDisplay');
  if (!container) return;

  const badges = [];
  if (completed >= 1)    badges.push({ icon: '✅', label: 'First Done',     cls: 'badge--green' });
  if (completed >= 10)   badges.push({ icon: '🏅', label: '10 Tasks',       cls: 'badge--blue'  });
  if (completed >= 50)   badges.push({ icon: '🏆', label: '50 Tasks',       cls: 'badge--gold'  });
  if (completed >= 100)  badges.push({ icon: '💎', label: 'Century!',       cls: 'badge--purple'});
  if (streak >= 3)       badges.push({ icon: '🔥', label: '3-Day Streak',   cls: 'badge--red'   });
  if (streak >= 7)       badges.push({ icon: '⚡', label: 'Week Streak',    cls: 'badge--gold'  });
  if (streak >= 30)      badges.push({ icon: '🌟', label: 'Month Streak',   cls: 'badge--gold'  });
  if (points >= 150)     badges.push({ icon: '🎯', label: 'Pro Level',      cls: 'badge--blue'  });
  if (points >= 300)     badges.push({ icon: '🚀', label: 'Sprint Master',  cls: 'badge--purple'});
  if (score >= 70)       badges.push({ icon: '⭐', label: 'High Scorer',    cls: 'badge--purple'});

  if (badges.length === 0) {
    container.innerHTML = '<div class="achievements-title">Complete tasks to earn badges</div>';
    return;
  }

  container.innerHTML = `
    <div class="achievements-title">Achievements</div>
    <div class="badges-grid">
      ${badges.map(b => `<span class="badge ${b.cls}">${b.icon} ${b.label}</span>`).join('')}
    </div>
  `;
}