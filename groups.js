// leaderboard.js
// builds the leaderboard from local data + simulated other users
// in a real app this would pull from a backend, but for now it's localStorage based

let currentLbPeriod = 'alltime';

// simulated friends/other users — stored in localStorage so it persists
function getSimulatedUsers() {
  try {
    return JSON.parse(localStorage.getItem('fs_sim_users_v4')) || generateSimUsers();
  } catch {
    return generateSimUsers();
  }
}

// first time: create some realistic simulated competitors
function generateSimUsers() {
  const names = [
    { name: 'Priya Sharma',    username: 'priya_cs',   pts: 287, weekPts: 45, streak: 8 },
    { name: 'Arjun Patel',     username: 'arjun_dev',  pts: 412, weekPts: 62, streak: 14 },
    { name: 'Sneha Kulkarni',  username: 'sneha_mech', pts: 156, weekPts: 28, streak: 4 },
    { name: 'Rohan Mishra',    username: 'rohan_it',   pts: 534, weekPts: 78, streak: 21 },
    { name: 'Divya Nair',      username: 'divya_elex', pts: 98,  weekPts: 15, streak: 2 },
    { name: 'Karan Singh',     username: 'karan_gate', pts: 345, weekPts: 55, streak: 10 },
  ];
  localStorage.setItem('fs_sim_users_v4', JSON.stringify(names));
  return names;
}

// build the full leaderboard combining real user + simulated ones
function buildLeaderboardData(period) {
  const simUsers = getSimulatedUsers();
  const myPts    = period === 'weekly' ? getPointsInLastDays(7) : getTotalPoints();
  const myStreak = calcStreak();

  const myEntry = {
    name:     profile.name     || 'You',
    username: profile.username || 'you',
    pts:      period === 'weekly' ? myPts : getTotalPoints(),
    weekPts:  getPointsInLastDays(7),
    streak:   myStreak,
    isMe:     true
  };

  const all = [
    ...simUsers.map(u => ({
      ...u,
      pts:    period === 'weekly' ? u.weekPts : u.pts,
      isMe:   false
    })),
    myEntry
  ];

  // sort by points
  all.sort((a, b) => b.pts - a.pts);
  return all;
}

function renderLeaderboard() {
  const data = buildLeaderboardData(currentLbPeriod);
  const myRank = data.findIndex(u => u.isMe) + 1;
  const myEntry = data.find(u => u.isMe);

  // your rank card
  document.getElementById('yourRankNum').textContent    = `#${myRank}`;
  document.getElementById('yourRankPoints').textContent = `${myEntry?.pts || 0} pts`;

  // top 3 podium
  renderTop3(data.slice(0, 3), myRank);

  // full list (4th onwards)
  renderLeaderboardList(data, myRank);
}

function renderTop3(top3, myRank) {
  const container = document.getElementById('leaderboardTop3');
  if (!container) return;

  // podium order: 2nd, 1st, 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumRanks = top3[1] ? [2, 1, 3] : [1, 3];
  const podiumSizes = ['medium', 'large', 'small'];

  container.innerHTML = '';
  podiumOrder.forEach((user, i) => {
    if (!user) return;
    const rank   = podiumRanks[i];
    const size   = podiumSizes[i];
    const medals = ['🥇', '🥈', '🥉'];
    const isMe   = user.isMe;

    const card = document.createElement('div');
    card.className = `podium-card podium-${size}${isMe ? ' podium-me' : ''}`;
    card.innerHTML = `
      <div class="podium-medal">${medals[rank - 1]}</div>
      <div class="podium-avatar">${(user.name || 'U')[0].toUpperCase()}</div>
      <div class="podium-name">${user.name || user.username}${isMe ? ' (You)' : ''}</div>
      <div class="podium-pts">${user.pts} pts</div>
      <div class="podium-streak">🔥 ${user.streak}d</div>
    `;
    container.appendChild(card);
  });
}

function renderLeaderboardList(data, myRank) {
  const container = document.getElementById('leaderboardList');
  if (!container) return;
  container.innerHTML = '';

  data.forEach((user, i) => {
    const rank  = i + 1;
    const isMe  = user.isMe;

    const row = document.createElement('div');
    row.className = `lb-row${isMe ? ' lb-row-me' : ''}`;
    row.innerHTML = `
      <div class="lb-rank">${rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : '#' + rank}</div>
      <div class="lb-avatar">${(user.name || 'U')[0].toUpperCase()}</div>
      <div class="lb-info">
        <div class="lb-name">${user.name || user.username}${isMe ? ' <span class="lb-you-tag">You</span>' : ''}</div>
        <div class="lb-username">@${user.username || 'unknown'}</div>
      </div>
      <div class="lb-streak">🔥 ${user.streak}d</div>
      <div class="lb-pts">${user.pts} <span class="lb-pts-label">pts</span></div>
    `;
    container.appendChild(row);
  });
}