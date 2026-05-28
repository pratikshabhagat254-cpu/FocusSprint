// tasks.js
// adding, editing, deleting, and drawing task cards
// also has the deadline calculator so we know if something is overdue

// --- POINTS SYSTEM ---
// completing a task on time  → +10 pts
// completing HIGH priority   → +15 pts (instead of 10)
// task going overdue         → -5 pts (logged once)

function addTask(data) {
  tasks.push({
    id:              'task_' + Date.now(),
    name:            data.name.trim(),
    subject:         data.subject.trim(),
    priority:        data.priority,
    dueDate:         data.dueDate,
    estTime:         data.estTime ? parseInt(data.estTime) : null,
    notes:           data.notes.trim(),
    completed:       false,
    createdAt:       Date.now(),
    completedAt:     null,
    overduePenaltyApplied: false  // so we only deduct -5 once per task
  });
  saveTasks();
  showToast('✅ Task added!', 'success');
}

function editTask(id, data) {
  const i = tasks.findIndex(t => t.id === id);
  if (i === -1) return;
  tasks[i] = {
    ...tasks[i],
    name:     data.name.trim(),
    subject:  data.subject.trim(),
    priority: data.priority,
    dueDate:  data.dueDate,
    estTime:  data.estTime ? parseInt(data.estTime) : null,
    notes:    data.notes.trim()
  };
  saveTasks();
  showToast('✏️ Task updated!', 'success');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  showToast('🗑️ Task deleted.', '');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;

  if (task.completed) {
    // update activity log
    const today = todayStr();
    activity[today] = (activity[today] || 0) + 1;
    saveActivity();

    // figure out how many points to give
    const pts = task.priority === 'high' ? 15 : 10;
    addPoints(pts, `Completed: ${task.name}`);
    showToast(`+${pts} pts — task complete! 🎯`, 'success');
    triggerPointsPopup(pts);
  } else {
    // they uncompleted a task — take the points back
    const pts = task.priority === 'high' ? 15 : 10;
    addPoints(-pts, `Uncompleted: ${task.name}`);
    // also undo activity log
    const today = todayStr();
    if (activity[today] > 0) activity[today]--;
    saveActivity();
  }

  saveTasks();
}

// check all pending tasks for overdue penalty — called on init and periodically
function applyOverduePenalties() {
  let anyChange = false;
  tasks.forEach(task => {
    if (!task.completed && !task.overduePenaltyApplied && isOverdue(task)) {
      task.overduePenaltyApplied = true;
      addPoints(-5, `Overdue penalty: ${task.name}`);
      anyChange = true;
    }
  });
  if (anyChange) saveTasks();
}

// show a little floating +pts notification near the toast area
function triggerPointsPopup(pts) {
  const el = document.createElement('div');
  el.className = 'points-popup';
  el.textContent = `+${pts} pts`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('visible'), 50);
  setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 400); }, 1800);
}


// --- DEADLINE ENGINE ---

function getDeadlineInfo(dueDate) {
  if (!dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate + 'T00:00:00');
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return { label: n === 1 ? '1 Day Overdue' : `${n} Days Overdue`, className: 'overdue' };
  }
  if (diffDays === 0) return { label: 'Due Today',   className: 'today' };
  if (diffDays === 1) return { label: '1 Day Left',  className: 'soon' };
  if (diffDays <= 3)  return { label: `${diffDays} Days Left`, className: 'soon' };

  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label: formatted, className: 'normal' };
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  const info = getDeadlineInfo(task.dueDate);
  return info && info.className === 'overdue';
}

function isDueToday(task) {
  if (!task.dueDate || task.completed) return false;
  const info = getDeadlineInfo(task.dueDate);
  return info && info.className === 'today';
}


// --- RENDER TASKS ---

let currentFilter = 'all';
let currentSearch = '';
let currentSort   = 'created';

function getFilteredTasks() {
  let result = [...tasks];

  if      (currentFilter === 'completed') result = result.filter(t => t.completed);
  else if (currentFilter === 'pending')   result = result.filter(t => !t.completed);
  else if (currentFilter === 'high')      result = result.filter(t => t.priority === 'high');
  else if (currentFilter === 'overdue')   result = result.filter(t => isOverdue(t));

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    result = result.filter(t =>
      t.name.toLowerCase().includes(q)    ||
      t.subject.toLowerCase().includes(q) ||
      t.notes.toLowerCase().includes(q)
    );
  }

  result.sort((a, b) => {
    if (currentSort === 'deadline') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (currentSort === 'priority') {
      return { high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority];
    }
    if (currentSort === 'az') return a.name.localeCompare(b.name);
    return b.createdAt - a.createdAt;
  });

  return result;
}

function renderTasks() {
  const list  = document.getElementById('tasksList');
  const empty = document.getElementById('emptyState');
  const items = getFilteredTasks();

  list.innerHTML = '';

  if (items.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  items.forEach(t => list.appendChild(buildTaskCard(t)));
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card' + (task.completed ? ' completed' : '');
  card.dataset.id       = task.id;
  card.dataset.priority = task.priority;

  const cb = document.createElement('button');
  cb.className = 'task-checkbox' + (task.completed ? ' checked' : '');
  cb.setAttribute('aria-label', task.completed ? 'Mark pending' : 'Mark complete');
  cb.addEventListener('click', () => { toggleTask(task.id); render(); });

  const body = document.createElement('div');
  body.className = 'task-body';

  const nameEl = document.createElement('div');
  nameEl.className = 'task-name';
  nameEl.textContent = task.name;

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  if (task.subject) {
    const sub = document.createElement('span');
    sub.className = 'task-subject';
    sub.textContent = task.subject;
    meta.appendChild(sub);
  }

  const pri = document.createElement('span');
  pri.className = `task-priority ${task.priority}`;
  pri.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
  meta.appendChild(pri);

  if (task.dueDate) {
    const info = getDeadlineInfo(task.dueDate);
    if (info) {
      const dl = document.createElement('span');
      dl.className = `task-deadline ${info.className}`;
      dl.textContent = info.label;
      meta.appendChild(dl);
    }
  }

  if (task.estTime) {
    const time = document.createElement('span');
    time.className = 'task-time-badge';
    time.textContent = task.estTime >= 60
      ? `⏱ ${Math.floor(task.estTime/60)}h ${task.estTime%60 ? task.estTime%60+'m' : ''}`
      : `⏱ ${task.estTime}m`;
    meta.appendChild(time);
  }

  body.appendChild(nameEl);
  body.appendChild(meta);

  if (task.notes) {
    const notes = document.createElement('div');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    body.appendChild(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'task-btn edit';
  editBtn.setAttribute('aria-label', 'Edit task');
  editBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  editBtn.addEventListener('click', () => openEditModal(task.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'task-btn delete';
  delBtn.setAttribute('aria-label', 'Delete task');
  delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
  delBtn.addEventListener('click', () => openConfirmDelete(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(cb);
  card.appendChild(body);
  card.appendChild(actions);
  return card;
}


// --- DASHBOARD PANELS ---

function renderDashboardPanels() {
  const todayList  = document.getElementById('todayTasksList');
  const todayBadge = document.getElementById('todayCount');
  const todayTasks = tasks.filter(t => !t.completed && isDueToday(t));

  todayBadge.textContent = `${todayTasks.length} task${todayTasks.length !== 1 ? 's' : ''}`;

  if (todayTasks.length === 0) {
    todayList.innerHTML = '<div class="panel-empty">No tasks due today — enjoy the breathing room.</div>';
  } else {
    todayList.innerHTML = '';
    todayTasks.forEach(t => todayList.appendChild(buildPanelRow(t)));
  }

  const upcomingList = document.getElementById('upcomingList');
  const today = new Date(); today.setHours(0,0,0,0);
  const weekOut = new Date(today); weekOut.setDate(weekOut.getDate() + 7);

  const upcomingTasks = tasks
    .filter(t => {
      if (!t.dueDate || t.completed) return false;
      const due = new Date(t.dueDate + 'T00:00:00'); due.setHours(0,0,0,0);
      return due > today && due <= weekOut;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (upcomingTasks.length === 0) {
    upcomingList.innerHTML = '<div class="panel-empty">No upcoming deadlines this week.</div>';
  } else {
    upcomingList.innerHTML = '';
    upcomingTasks.forEach(t => upcomingList.appendChild(buildPanelRow(t)));
  }
}

function buildPanelRow(task) {
  const row  = document.createElement('div');
  row.className = 'panel-task-row';

  const dot  = document.createElement('div');
  dot.className = `panel-task-dot ${task.priority}`;

  const name = document.createElement('div');
  name.className = 'panel-task-name';
  name.textContent = task.name;

  const dl = document.createElement('div');
  dl.className = 'panel-task-deadline';
  if (task.dueDate) {
    const info = getDeadlineInfo(task.dueDate);
    if (info) { dl.textContent = info.label; dl.classList.add(info.className); }
  }

  row.appendChild(dot); row.appendChild(name); row.appendChild(dl);
  return row;
}


// --- STATS CARDS ---

function updateStats() {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending   = tasks.filter(t => !t.completed).length;
  const overdue   = tasks.filter(t => isOverdue(t)).length;
  const highPri   = tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const totalPts  = getTotalPoints();

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('totalCount').textContent     = total;
  document.getElementById('completedCount').textContent = completed;
  document.getElementById('pendingCount').textContent   = pending;
  document.getElementById('overdueCount').textContent   = overdue;
  document.getElementById('pointsCount').textContent    = totalPts;

  const overdueCard = document.getElementById('overdueCard');
  if (overdueCard) overdueCard.style.borderColor = overdue > 0 ? 'rgba(248,81,73,0.3)' : '';

  document.getElementById('progressBarFill').style.width  = percent + '%';
  document.getElementById('progressPercent').textContent  = percent + '%';
  document.querySelector('.progress-bar-track')?.setAttribute('aria-valuenow', percent);

  document.getElementById('sidebarProgressFill').style.width = percent + '%';
  document.getElementById('sidebarPercent').textContent      = percent + '%';

  document.getElementById('navHighCount').textContent    = highPri;
  document.getElementById('navOverdueCount').textContent = overdue;

  const todayDone = activity[todayStr()] || 0;
  document.getElementById('sidebarTodayDone').textContent = `${todayDone} done today`;

  document.getElementById('sidebarPointsNum').textContent = totalPts;
}