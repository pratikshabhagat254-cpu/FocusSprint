// app.js
// this is where everything starts — loads data, kicks off renders, sets intervals

function render() {
  updateStats();
  renderTasks();
  renderDashboardPanels();
  updateInsight();
  renderProfileUI();
  updateGroupBadge();
}

function init() {
  loadAll();              // pull everything from localStorage
  loadTheme();            // apply saved theme before anything renders
  applyOverduePenalties();// deduct points for any tasks that went overdue
  render();               // draw the whole page
  renderAnalytics();      // need this so score shows in profile right away
  renderProfileUI();      // re-run so score from analytics is picked up

  // check smart popup conditions after a short delay (let user settle in)
  setTimeout(() => {
    maybeShowMotivationPopup();
  }, 8000);

  // rotate insight banner every 10 seconds
  setInterval(updateInsight, 10000);

  // check overdue penalties every 5 minutes (in case they leave tab open)
  setInterval(applyOverduePenalties, 5 * 60 * 1000);

  // occasionally remind about motivation
  setInterval(maybeShowMotivationPopup, 15 * 60 * 1000);
}

init();