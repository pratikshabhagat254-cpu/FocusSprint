// ui.js
// all the UI glue — modal open/close, view switching, toasts, smart popups

// --- VIEW ROUTER ---

const PAGE_META = {
  dashboard:   { title: 'Dashboard',   sub: 'Good to see you. Here\'s where you stand today.' },
  tasks:       { title: 'All Tasks',   sub: 'Manage, filter, and track all your study tasks.' },
  analytics:   { title: 'Analytics',   sub: 'Your productivity at a glance.' },
  leaderboard: { title: 'Leaderboard', sub: 'How do you stack up against your study network?' },
  groups:      { title: 'Groups',      sub: 'Study together, grow together.' },
  profile:     { title: 'Profile',     sub: 'Personalize your dashboard and track your journey.' }
};

let currentView = 'dashboard';

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));

  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active-view');

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  const meta = PAGE_META[viewName] || { title: viewName, sub: '' };
  document.getElementById('pageTitle').textContent    = meta.title;
  document.getElementById('pageSubtitle').textContent = meta.sub;

  currentView = viewName;

  // trigger the right render for each view
  if (viewName === 'analytics')   renderAnalytics();
  if (viewName === 'profile')     renderProfileUI();
  if (viewName === 'dashboard')   renderDashboardPanels();
  if (viewName === 'leaderboard') renderLeaderboard();
  if (viewName === 'groups')      renderGroups();
}


// --- TASK MODAL ---

const modalBackdrop   = document.getElementById('modalBackdrop');
const taskForm        = document.getElementById('taskForm');
const editTaskIdInput = document.getElementById('editTaskId');

function openAddModal() {
  taskForm.reset();
  editTaskIdInput.value = '';
  document.getElementById('modalTitle').textContent    = 'New Task';
  document.getElementById('btnSave').textContent       = 'Save Task';
  document.getElementById('taskNameError').textContent = '';
  modalBackdrop.hidden = false;
  setTimeout(() => document.getElementById('taskName').focus(), 100);
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('taskName').value     = task.name;
  document.getElementById('taskSubject').value  = task.subject;
  document.getElementById('taskPriority').value = task.priority;
  document.getElementById('taskDueDate').value  = task.dueDate;
  document.getElementById('taskEstTime').value  = task.estTime || '';
  document.getElementById('taskNotes').value    = task.notes;
  document.getElementById('taskNameError').textContent = '';
  editTaskIdInput.value = task.id;

  document.getElementById('modalTitle').textContent = 'Edit Task';
  document.getElementById('btnSave').textContent    = 'Update Task';
  modalBackdrop.hidden = false;
  setTimeout(() => document.getElementById('taskName').focus(), 100);
}

function closeModal() {
  modalBackdrop.hidden = true;
  taskForm.reset();
  editTaskIdInput.value = '';
}

function validateForm() {
  const name  = document.getElementById('taskName').value.trim();
  const errEl = document.getElementById('taskNameError');
  if (!name) {
    errEl.textContent = 'Task name is required.';
    document.getElementById('taskName').focus();
    return false;
  }
  errEl.textContent = '';
  return true;
}


// --- DELETE CONFIRM ---

const confirmBackdrop = document.getElementById('confirmBackdrop');
let pendingDeleteId   = null;

function openConfirmDelete(id) {
  pendingDeleteId = id;
  confirmBackdrop.hidden = false;
}

function closeConfirmDelete() {
  confirmBackdrop.hidden = true;
  pendingDeleteId = null;
}


// --- GROUP MODALS ---

const createGroupBackdrop = document.getElementById('createGroupBackdrop');
const joinGroupBackdrop   = document.getElementById('joinGroupBackdrop');

function openCreateGroupModal() {
  document.getElementById('createGroupForm').reset();
  createGroupBackdrop.hidden = false;
  setTimeout(() => document.getElementById('newGroupName').focus(), 100);
}

function closeCreateGroupModal() {
  createGroupBackdrop.hidden = true;
}

function openJoinGroupModal() {
  document.getElementById('joinGroupForm').reset();
  joinGroupBackdrop.hidden = false;
  setTimeout(() => document.getElementById('joinGroupId').focus(), 100);
}

function closeJoinGroupModal() {
  joinGroupBackdrop.hidden = true;
}


// --- TOAST ---

let toastTimer = null;

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className   = 'toast show' + (type ? ` ${type}` : '');
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}


// --- MOBILE SIDEBAR ---

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}


// --- INSIGHT BANNER ---

function updateInsight() {
  const total      = tasks.length;
  const completed  = tasks.filter(t => t.completed).length;
  const pending    = tasks.filter(t => !t.completed).length;
  const overdue    = tasks.filter(t => isOverdue(t)).length;
  const todayDue   = tasks.filter(t => isDueToday(t) && !t.completed).length;
  const streak     = calcStreak();
  const todayDone  = activity[todayStr()] || 0;
  const highPending= tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const totalPts   = getTotalPoints();
  const level      = getLevelInfo(totalPts);

  const messages = [];

  if (overdue > 0)  messages.push(`⚠️ ${overdue} overdue task${overdue>1?'s':''}. Each is costing you -5 pts!`);
  if (todayDue > 0) messages.push(`📅 ${todayDue} task${todayDue>1?'s are':' is'} due today. Stay focused!`);
  if (todayDone > 0) messages.push(`🎯 You've completed ${todayDone} task${todayDone>1?'s':''} today. Keep it up!`);
  if (streak >= 7)   messages.push(`🔥 ${streak}-day streak! You're absolutely unstoppable.`);
  else if (streak >= 3) messages.push(`🔥 ${streak}-day streak active. Consistency is your superpower!`);
  if (highPending > 0) messages.push(`🔴 ${highPending} high-priority task${highPending>1?'s':''} waiting. Focus on those first (+15 pts each!)`);
  if (total > 0 && completed === total) messages.push(`🏆 All tasks complete! Add new ones to keep earning points.`);
  if (total === 0)   messages.push(`✨ Start by adding your first task. Small steps lead to big results!`);
  if (totalPts > 0)  messages.push(`⚡ You're a ${level.name} with ${totalPts} total points!`);
  if (messages.length === 0 && pending > 0) messages.push(`💪 ${pending} task${pending>1?'s':''} remaining. You've got this!`);

  const text = messages.length > 0
    ? messages[Math.floor(Math.random() * Math.min(messages.length, 3))]
    : '💡 All caught up! Great work.';

  document.getElementById('insightText').textContent = text;
}


// --- MOTIVATIONAL POPUP ---
// shows user's custom quote at smart moments (not too often)

let lastPopupTime = 0;

function maybeShowMotivationPopup() {
  const now   = Date.now();
  const quote = profile.quote;
  if (!quote) return;

  // only show once every 10 minutes max
  if (now - lastPopupTime < 10 * 60 * 1000) return;

  const overdue    = tasks.filter(t => isOverdue(t)).length;
  const highPend   = tasks.filter(t => t.priority === 'high' && !t.completed).length;
  const todayDone  = activity[todayStr()] || 0;
  const streak     = calcStreak();

  // trigger conditions
  const shouldShow =
    overdue > 0 ||
    highPend > 2 ||
    todayDone === 0 ||
    (streak >= 6); // about to hit a milestone

  if (!shouldShow) return;

  lastPopupTime = now;

  const emojis  = ['💪', '🔥', '⚡', '🎯', '🚀'];
  const randEmoji = emojis[Math.floor(Math.random() * emojis.length)];

  document.getElementById('motivationEmoji').textContent = randEmoji;
  document.getElementById('motivationQuote').textContent = `"${quote}"`;

  const popup = document.getElementById('motivationPopup');
  popup.hidden = false;
  setTimeout(() => popup.classList.add('visible'), 50);
}

function closeMotivationPopup() {
  const popup = document.getElementById('motivationPopup');
  popup.classList.remove('visible');
  setTimeout(() => { popup.hidden = true; }, 350);
}


// --- EVENT LISTENERS ---

// nav view switching
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    switchView(item.dataset.view);
    closeSidebar();
  });
});

// sidebar user → profile
document.getElementById('sidebarUser').addEventListener('click', () => {
  switchView('profile');
  closeSidebar();
});

// sidebar filter shortcuts
document.querySelectorAll('.nav-item[data-filter]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    currentFilter = link.dataset.filter;
    document.querySelectorAll('.filter-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === currentFilter);
    });
    switchView('tasks');
    closeSidebar();
    const labels = {
      high:    { title: 'High Priority', sub: 'Tasks marked as critical.' },
      overdue: { title: 'Overdue',       sub: 'These need your immediate attention.' }
    };
    if (labels[currentFilter]) {
      document.getElementById('pageTitle').textContent    = labels[currentFilter].title;
      document.getElementById('pageSubtitle').textContent = labels[currentFilter].sub;
    }
  });
});

// add task
document.getElementById('btnOpenModal').addEventListener('click', openAddModal);
document.getElementById('btnEmptyAdd').addEventListener('click', openAddModal);

// close task modal
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });

// escape key closes any open modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!modalBackdrop.hidden)          closeModal();
    if (!confirmBackdrop.hidden)        closeConfirmDelete();
    if (!createGroupBackdrop.hidden)    closeCreateGroupModal();
    if (!joinGroupBackdrop.hidden)      closeJoinGroupModal();
  }
});

// task form submit
taskForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    name:     document.getElementById('taskName').value,
    subject:  document.getElementById('taskSubject').value,
    priority: document.getElementById('taskPriority').value,
    dueDate:  document.getElementById('taskDueDate').value,
    estTime:  document.getElementById('taskEstTime').value,
    notes:    document.getElementById('taskNotes').value
  };

  const editId = editTaskIdInput.value;
  if (editId) editTask(editId, data);
  else        addTask(data);

  closeModal();
  render();
});

// confirm delete
document.getElementById('confirmCancel').addEventListener('click', closeConfirmDelete);
document.getElementById('confirmDelete').addEventListener('click', () => {
  if (pendingDeleteId) { deleteTask(pendingDeleteId); closeConfirmDelete(); render(); }
});
confirmBackdrop.addEventListener('click', e => {
  if (e.target === confirmBackdrop) closeConfirmDelete();
});

// filter tabs
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    renderTasks();
  });
});

// search and sort
document.getElementById('searchInput').addEventListener('input', e => {
  currentSearch = e.target.value;
  renderTasks();
});
document.getElementById('sortSelect').addEventListener('change', e => {
  currentSort = e.target.value;
  renderTasks();
});

// mobile sidebar
document.getElementById('hamburger').addEventListener('click', openSidebar);
document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

// avatar color cycle
document.getElementById('btnChangeAvatar').addEventListener('click', () => {
  profile.avatarColor = (profile.avatarColor + 1) % AVATAR_COLORS.length;
  saveProfile();
  renderProfileUI();
  showToast('Avatar color updated!', 'success');
});

// profile form save
document.getElementById('profileForm').addEventListener('submit', e => {
  e.preventDefault();
  profile.name          = document.getElementById('profileName').value;
  profile.username      = document.getElementById('profileUsername').value;
  profile.branch        = document.getElementById('profileBranch').value;
  profile.year          = document.getElementById('profileYear').value;
  profile.bio           = document.getElementById('profileBio').value;
  profile.goal          = document.getElementById('profileGoal').value;
  profile.target        = parseInt(document.getElementById('profileTarget').value) || 6;
  profile.weeklyTarget  = parseInt(document.getElementById('profileWeeklyTarget').value) || 35;
  profile.quote         = document.getElementById('profileQuote').value;
  saveProfile();
  renderProfileUI();
  updateInsight();
  showToast('✅ Profile saved!', 'success');
});

// analytics period tabs
document.querySelectorAll('.analytics-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.analytics-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentAnalyticsPeriod = tab.dataset.period;

    document.querySelectorAll('.analytics-period').forEach(p => p.classList.remove('active-period'));
    const panel = document.getElementById(`analytics-${currentAnalyticsPeriod}`);
    if (panel) panel.classList.add('active-period');

    if (currentAnalyticsPeriod === 'today')   renderTodayAnalytics();
    if (currentAnalyticsPeriod === 'weekly')  renderWeeklyAnalytics();
    if (currentAnalyticsPeriod === 'monthly') renderMonthlyAnalytics();
  });
});

// leaderboard tabs
document.querySelectorAll('.lb-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentLbPeriod = tab.dataset.lb;
    renderLeaderboard();
  });
});

// group action buttons
document.getElementById('btnCreateGroup').addEventListener('click', openCreateGroupModal);
document.getElementById('btnJoinGroup').addEventListener('click', openJoinGroupModal);

document.getElementById('createGroupClose').addEventListener('click', closeCreateGroupModal);
document.getElementById('createGroupCancel').addEventListener('click', closeCreateGroupModal);
createGroupBackdrop.addEventListener('click', e => {
  if (e.target === createGroupBackdrop) closeCreateGroupModal();
});

document.getElementById('joinGroupClose').addEventListener('click', closeJoinGroupModal);
document.getElementById('joinGroupCancel').addEventListener('click', closeJoinGroupModal);
joinGroupBackdrop.addEventListener('click', e => {
  if (e.target === joinGroupBackdrop) closeJoinGroupModal();
});

document.getElementById('createGroupForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('newGroupName').value;
  const desc = document.getElementById('newGroupDesc').value;
  if (!name.trim()) { showToast('Group name is required.', 'error'); return; }
  createGroup(name, desc);
  closeCreateGroupModal();
});

document.getElementById('joinGroupForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('joinGroupId').value;
  if (!id.trim()) { showToast('Please enter a Group ID.', 'error'); return; }
  joinGroup(id);
  closeJoinGroupModal();
});

// motivation popup close
document.getElementById('motivationClose').addEventListener('click', closeMotivationPopup);