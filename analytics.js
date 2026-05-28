// analytics.js
// builds the analytics dashboard — today, weekly, monthly tabs
// all numbers come from tasks array and pointsLog

const SUBJECT_COLORS = ['#3b82f6','#3dd68c','#f0a500','#bc8cff','#e86c3a','#f85149','#d29922'];

let currentAnalyticsPeriod = 'today';

function renderAnalytics() {
  renderTodayAnalytics();
  if (currentAnalyticsPeriod === 'weekly')  renderWeeklyAnalytics();
  if (currentAnalyticsPeriod === 'monthly') renderMonthlyAnalytics();
}

// --- TODAY ---

function renderTodayAnalytics() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = tasks.filter(t => !t.completed).length;
  const overdue   = tasks.filter(t => isOverdue(t)).length;
  const streak    = calcStreak();

  // productivity score formula
  const completionRatio = total > 0 ? completed / total : 0;
  const overdueRatio    = pending > 0 ? overdue / pending : 0;
  const streakBonus     = Math.min(streak * 2, 20);
  const raw = completionRatio * 70 - overdueRatio * 20 + streakBonus + (completed > 0 ? 10 : 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  document.getElementById('productivityScore').textContent = score;
  document.getElementById('profileScoreVal').textContent   = score;

  // animate the ring
  const ring = document.getElementById('scoreRingCircle');
  if (ring) {
    const offset = 251.2 - (score / 100) * 251.2;
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 150);
  }

  const todayDone = activity[todayStr()] || 0;
  document.getElementById('completedToday').textContent = todayDone;

  // how many are still due today and not done
  const stillTodayPending = tasks.filter(t => isDueToday(t) && !t.completed).length;
  document.getElementById('pendingToday').textContent = stillTodayPending;

  const todayPts = getPointsOnDate(todayStr());
  document.getElementById('pointsToday').textContent = todayPts;

  renderFocusScoreBreakdown(score, todayDone, stillTodayPending, overdue, streak);
}

function renderFocusScoreBreakdown(score, done, pending, overdue, streak) {
  const container = document.getElementById('focusScoreCard');
  if (!container) return;

  const items = [
    { label: 'Tasks completed today',    value: done,    good: done > 0 },
    { label: 'Overdue tasks',            value: overdue, good: overdue === 0, invert: true },
    { label: 'Pending tasks today',      value: pending, good: pending === 0, invert: true },
    { label: 'Current streak (days)',    value: streak,  good: streak >= 3 },
  ];

  container.innerHTML = items.map(item => `
    <div class="focus-score-row">
      <span class="focus-score-label">${item.label}</span>
      <span class="focus-score-value ${item.good ? 'good' : 'warn'}">${item.value}</span>
    </div>
  `).join('');
}

// --- WEEKLY ---

function renderWeeklyAnalytics() {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const weekDone = Object.entries(activity)
    .filter(([date]) => new Date(date) >= weekAgo)
    .reduce((sum, [, count]) => sum + count, 0);

  document.getElementById('completedWeek').textContent = weekDone;

  const weekPts = getPointsInLastDays(7);
  document.getElementById('pointsWeek').textContent = weekPts;

  // consistency = how many of last 7 days had at least 1 task done
  let activeDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (activity[key] && activity[key] > 0) activeDays++;
  }
  document.getElementById('consistencyRate').textContent = Math.round((activeDays / 7) * 100) + '%';

  // most productive subject this week — look at tasks completed in last 7 days
  const subjectCount = {};
  tasks
    .filter(t => t.completed && t.completedAt && (Date.now() - t.completedAt) < 7 * 86400000)
    .forEach(t => {
      const s = t.subject || 'Uncategorized';
      subjectCount[s] = (subjectCount[s] || 0) + 1;
    });

  const topSubject = Object.entries(subjectCount).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('mostProductiveSubject').textContent = topSubject ? topSubject[0] : '—';

  renderActivityChart();
  renderSubjectBreakdown();
}

function renderActivityChart() {
  const chartEl = document.getElementById('activityChart');
  const daysEl  = document.getElementById('activityDays');
  if (!chartEl || !daysEl) return;

  chartEl.innerHTML = '';
  daysEl.innerHTML  = '';

  const today = new Date();
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const counts   = days.map(d => activity[d.toISOString().split('T')[0]] || 0);
  const maxCount = Math.max(...counts, 1);

  days.forEach((d, i) => {
    const count   = counts[i];
    const isToday = i === 6;
    const heightPct = Math.max(5, (count / maxCount) * 100);

    const wrap = document.createElement('div');
    wrap.className = 'activity-bar-wrap';

    const countEl = document.createElement('div');
    countEl.className = 'activity-bar-count';
    countEl.textContent = count > 0 ? count : '';

    const bar = document.createElement('div');
    bar.className = 'activity-bar' + (count > 0 ? ' has-data' : '') + (isToday ? ' today-bar' : '');
    bar.style.height = '4px';

    wrap.appendChild(countEl);
    wrap.appendChild(bar);
    chartEl.appendChild(wrap);

    requestAnimationFrame(() => {
      setTimeout(() => { bar.style.height = heightPct + '%'; }, 100 + i * 40);
    });

    const label = document.createElement('div');
    label.className = 'activity-day-label' + (isToday ? ' today-label' : '');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    label.textContent = isToday ? 'Today' : dayNames[d.getDay()];
    daysEl.appendChild(label);
  });
}

function renderSubjectBreakdown() {
  const container = document.getElementById('subjectBreakdown');
  if (!container) return;

  const subjectMap = {};
  tasks.forEach(t => {
    const key = t.subject || 'Uncategorized';
    if (!subjectMap[key]) subjectMap[key] = { total: 0, done: 0 };
    subjectMap[key].total++;
    if (t.completed) subjectMap[key].done++;
  });

  const entries = Object.entries(subjectMap).sort((a, b) => b[1].total - a[1].total);

  if (entries.length === 0) {
    container.innerHTML = '<div class="panel-empty">Add tasks with subjects to see breakdown.</div>';
    return;
  }

  container.innerHTML = '';
  const maxTotal = Math.max(...entries.map(([, v]) => v.total));

  entries.forEach(([name, stats], i) => {
    const pct     = maxTotal > 0 ? (stats.total / maxTotal) * 100 : 0;
    const donePct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const color   = SUBJECT_COLORS[i % SUBJECT_COLORS.length];

    const row = document.createElement('div');
    row.className = 'subject-row';
    row.innerHTML = `
      <div class="subject-row-header">
        <span class="subject-row-name">${name}</span>
        <span class="subject-row-meta">${stats.done}/${stats.total} &nbsp;·&nbsp; ${donePct}%</span>
      </div>
      <div class="subject-bar-track">
        <div class="subject-bar-fill" style="width:0%; background:${color}"></div>
      </div>
    `;
    container.appendChild(row);

    requestAnimationFrame(() => {
      setTimeout(() => {
        row.querySelector('.subject-bar-fill').style.width = pct + '%';
      }, 100 + i * 50);
    });
  });
}

// --- MONTHLY ---

function renderMonthlyAnalytics() {
  const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate() - 30);

  const monthDone = Object.entries(activity)
    .filter(([date]) => new Date(date) >= monthAgo)
    .reduce((sum, [, count]) => sum + count, 0);

  document.getElementById('completedMonth').textContent = monthDone;

  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  document.getElementById('completionRate').textContent = rate + '%';

  // tasks that went overdue (have penalty applied)
  const overdued = tasks.filter(t => t.overduePenaltyApplied).length;
  const overdueR = total > 0 ? Math.round((overdued / total) * 100) : 0;
  document.getElementById('overdueRate').textContent = overdueR + '%';

  document.getElementById('totalPointsMonth').textContent = getTotalPoints();

  renderPriorityDistribution();
  renderInsightsList();
}

function renderPriorityDistribution() {
  const container = document.getElementById('priorityDistribution');
  if (!container) return;
  container.innerHTML = '';

  const counts = {
    High:   tasks.filter(t => t.priority === 'high').length,
    Medium: tasks.filter(t => t.priority === 'medium').length,
    Low:    tasks.filter(t => t.priority === 'low').length
  };

  const maxCount = Math.max(...Object.values(counts), 1);
  const colors   = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--green)' };

  Object.entries(counts).forEach(([label, count]) => {
    const pct = (count / maxCount) * 100;
    const row = document.createElement('div');
    row.className = 'priority-row';
    row.innerHTML = `
      <div class="priority-row-label">${label}</div>
      <div class="priority-row-bar-track">
        <div class="priority-row-bar-fill" style="width:0%;background:${colors[label]}"></div>
      </div>
      <div class="priority-row-count">${count}</div>
    `;
    container.appendChild(row);

    requestAnimationFrame(() => {
      setTimeout(() => { row.querySelector('.priority-row-bar-fill').style.width = pct + '%'; }, 100);
    });
  });
}

function renderInsightsList() {
  const container = document.getElementById('insightsList');
  if (!container) return;

  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const overdue   = tasks.filter(t => isOverdue(t)).length;
  const streak    = calcStreak();
  const rate      = total > 0 ? Math.round((completed / total) * 100) : 0;

  const insights = [];

  if (rate >= 80)       insights.push({ icon: '🏆', text: `Excellent! You've completed ${rate}% of all your tasks.` });
  else if (rate >= 50)  insights.push({ icon: '📈', text: `Good progress — ${rate}% completion rate. Keep pushing!` });
  else if (total > 0)   insights.push({ icon: '⚡', text: `Completion rate is ${rate}%. Focus on clearing pending tasks first.` });

  if (overdue > 0)      insights.push({ icon: '⚠️', text: `${overdue} task${overdue>1?'s are':' is'} currently overdue. Each one costs -5 pts.` });
  if (streak >= 7)      insights.push({ icon: '🔥', text: `Legendary! ${streak}-day streak. Don't break it now.` });
  else if (streak >= 3) insights.push({ icon: '🔥', text: `${streak}-day streak going strong. Consistency is key!` });

  const totalPts = getTotalPoints();
  if (totalPts >= 300)  insights.push({ icon: '⭐', text: `Sprint Master territory! You've earned ${totalPts} total points.` });
  else if (totalPts >= 150) insights.push({ icon: '🎯', text: `Productivity Pro! ${totalPts} points earned so far.` });

  if (insights.length === 0) {
    insights.push({ icon: '💡', text: 'Add and complete tasks to generate personalized insights.' });
  }

  container.innerHTML = insights.map(ins => `
    <div class="insight-item">
      <span class="insight-item-icon">${ins.icon}</span>
      <span class="insight-item-text">${ins.text}</span>
    </div>
  `).join('');
}