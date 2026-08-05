const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

let currentGroupId = null;
let data = { groups: [], teams: [], matches: [] };

async function init() {
    try {
        const [groupsRes, teamsRes, matchesRes] = await Promise.all([
            fetch(`${API_URL}/groups`),
            fetch(`${API_URL}/teams`),
            fetch(`${API_URL}/matches`)
        ]);
        
        if (!groupsRes.ok || !teamsRes.ok || !matchesRes.ok) {
            throw new Error(`Server returned error`);
        }

        data.groups = await groupsRes.json();
        data.teams = await teamsRes.json();
        data.matches = await matchesRes.json();

        if (data.groups.length > 0) {
            currentGroupId = data.groups[0].id;
        }

        renderGroupSelector();
        renderPage();
    } catch (error) {
        console.error('Error fetching data from API:', error);
        alert('Gagal mengambil data dari server. Pastikan backend sudah berjalan.');
    }
}

function changeGroup(groupId) {
    currentGroupId = groupId;
    renderPage();
}

function renderGroupSelector() {
    const selector = document.getElementById('group-selector');
    if (!selector) return;
    
    selector.innerHTML = '';
    data.groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        if (group.id === currentGroupId) option.selected = true;
        selector.appendChild(option);
    });
}

function getTeamName(teamId) {
    const t = data.teams.find(team => team.id === teamId);
    return t ? t.name : 'Unknown Team';
}
function getTeamLogo(teamId) {
    const t = data.teams.find(team => team.id === teamId);
    return t && t.logo ? t.logo : null;
}

function renderPage() {
    if (!currentGroupId) {
        document.getElementById('current-group-name').textContent = 'NO GROUP SELECTED';
        document.getElementById('table-body').innerHTML = '';
        document.getElementById('total-matches').textContent = '0';
        return;
    }
    
    const currentGroup = data.groups.find(g => g.id === currentGroupId);
    if (!currentGroup) return;

    document.getElementById('current-group-name').textContent = currentGroup.name;

    const groupMatches = data.matches.filter(m => m.groupId === currentGroupId);
    document.getElementById('total-matches').textContent = `${groupMatches.length}`;

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    groupMatches.forEach((match) => {
        const tr = document.createElement('tr');
        tr.className = 'bg-surface-container-low hover:bg-surface-container-high transition-colors';
        
        const logo1 = getTeamLogo(match.team1Id);
        const logo2 = getTeamLogo(match.team2Id);
        
        tr.innerHTML = `
            <td class="p-4 text-center text-on-surface-variant">${match.matchDate.split('T')[0]}</td>
            <td class="p-4 text-center font-data-numeric text-primary">${match.matchTime}</td>
            <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-3">
                    <span class="font-headline-md tracking-wide">${getTeamName(match.team1Id)}</span>
                    <div class="w-8 h-8 flex items-center justify-center">
                        ${logo1 ? `<img class="max-w-full max-h-full object-contain" src="${logo1}" alt="logo">` : `<span class="material-symbols-outlined text-on-surface-variant text-xl">sports_soccer</span>`}
                    </div>
                </div>
            </td>
            <td class="p-4 text-center font-headline-md text-xl bg-surface-container/50">
                ${match.team1Score} - ${match.team2Score}
            </td>
            <td class="p-4 text-left">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 flex items-center justify-center">
                        ${logo2 ? `<img class="max-w-full max-h-full object-contain" src="${logo2}" alt="logo">` : `<span class="material-symbols-outlined text-on-surface-variant text-xl">sports_soccer</span>`}
                    </div>
                    <span class="font-headline-md tracking-wide">${getTeamName(match.team2Id)}</span>
                </div>
            </td>
            <td class="p-4 text-center">
                <button onclick="openEditMatchModal('${match.id}')" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">edit</button>
                <button onclick="deleteMatch('${match.id}')" class="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors ml-2">delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modals Logic
window.openAddMatchModal = function() {
    if(!currentGroupId) {
        alert('Please create or select a group first.');
        return;
    }
    
    const groupTeams = data.teams.filter(t => t.groupId === currentGroupId);
    if(groupTeams.length < 2) {
        alert('Setidaknya harus ada 2 tim dalam grup ini untuk membuat pertandingan.');
        return;
    }
    
    document.getElementById('match-modal').classList.remove('hidden');
    document.getElementById('match-form').reset();
    document.getElementById('match-id').value = '';
    document.getElementById('match-modal-title').textContent = 'Add Match Result';
    
    // Set default date to today, time to current time
    const now = new Date();
    document.getElementById('match-date').value = now.toISOString().split('T')[0];
    document.getElementById('match-time').value = now.toTimeString().slice(0,5);
    
    populateTeamSelectors(groupTeams);
}

window.openEditMatchModal = function(matchId) {
    const match = data.matches.find(m => m.id === matchId);
    if(!match) return;

    const groupTeams = data.teams.filter(t => t.groupId === currentGroupId);
    
    document.getElementById('match-modal').classList.remove('hidden');
    document.getElementById('match-modal-title').textContent = 'Edit Match Result';
    
    populateTeamSelectors(groupTeams);

    document.getElementById('match-id').value = match.id;
    document.getElementById('match-date').value = match.matchDate.split('T')[0];
    document.getElementById('match-time').value = match.matchTime;
    document.getElementById('match-team1').value = match.team1Id;
    document.getElementById('match-team2').value = match.team2Id;
    document.getElementById('match-score1').value = match.team1Score;
    document.getElementById('match-score2').value = match.team2Score;
}

function populateTeamSelectors(teams) {
    const t1 = document.getElementById('match-team1');
    const t2 = document.getElementById('match-team2');
    
    t1.innerHTML = '';
    t2.innerHTML = '';
    
    teams.forEach(t => {
        const opt1 = document.createElement('option');
        opt1.value = t.id;
        opt1.textContent = t.name;
        t1.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = t.id;
        opt2.textContent = t.name;
        t2.appendChild(opt2);
    });
    
    if(teams.length > 1) {
        t2.selectedIndex = 1;
    }
}

// Prevent selecting same team
document.getElementById('match-team1')?.addEventListener('change', function(e) {
    const t2 = document.getElementById('match-team2');
    if(e.target.value === t2.value) {
        const options = Array.from(t2.options);
        const nextOpt = options.find(o => o.value !== e.target.value);
        if(nextOpt) t2.value = nextOpt.value;
    }
});

document.getElementById('match-team2')?.addEventListener('change', function(e) {
    const t1 = document.getElementById('match-team1');
    if(e.target.value === t1.value) {
        const options = Array.from(t1.options);
        const nextOpt = options.find(o => o.value !== e.target.value);
        if(nextOpt) t1.value = nextOpt.value;
    }
});

window.closeMatchModal = function() {
    document.getElementById('match-modal').classList.add('hidden');
}

document.getElementById('match-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const team1Id = document.getElementById('match-team1').value;
    const team2Id = document.getElementById('match-team2').value;
    
    if(team1Id === team2Id) {
        alert("Tim 1 dan Tim 2 tidak boleh sama.");
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const matchId = document.getElementById('match-id').value;
    const matchData = {
        groupId: currentGroupId,
        team1Id: team1Id,
        team2Id: team2Id,
        team1Score: parseInt(document.getElementById('match-score1').value) || 0,
        team2Score: parseInt(document.getElementById('match-score2').value) || 0,
        matchDate: document.getElementById('match-date').value,
        matchTime: document.getElementById('match-time').value
    };

    try {
        let res;
        if (matchId) {
            // Edit
            matchData.id = matchId;
            res = await fetch(`${API_URL}/matches/${matchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matchData)
            });
            if(res.ok) {
                const idx = data.matches.findIndex(m => m.id === matchId);
                if(idx !== -1) data.matches[idx] = matchData;
            }
        } else {
            // Add
            matchData.id = 'match_' + Date.now();
            res = await fetch(`${API_URL}/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(matchData)
            });
            if(res.ok) {
                data.matches.unshift(matchData); // Add to top
            }
        }
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Unknown error');
        }
        
        // Refresh teams data so we have the updated standings internally if needed
        const teamsRes = await fetch(`${API_URL}/teams`);
        if (teamsRes.ok) {
            data.teams = await teamsRes.json();
        }
        
        closeMatchModal();
        renderPage();
    } catch (error) {
        console.error('Error saving match:', error);
        alert('Gagal menyimpan pertandingan ke server. Error: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

window.deleteMatch = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus pertandingan ini? Statistik tim akan dikalkulasi ulang.')) {
        try {
            await fetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
            data.matches = data.matches.filter(m => m.id !== id);
            renderPage();
        } catch (error) {
            console.error('Error deleting match:', error);
            alert('Gagal menghapus pertandingan dari server.');
        }
    }
}

// Event Listeners
document.getElementById('group-selector')?.addEventListener('change', function(e) {
    changeGroup(e.target.value);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
