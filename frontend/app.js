const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

let currentGroupId = null;
let data = { groups: [], teams: [] };

async function init() {
    try {
        const [groupsRes, teamsRes] = await Promise.all([
            fetch(`${API_URL}/groups`),
            fetch(`${API_URL}/teams`)
        ]);
        
        if (!groupsRes.ok || !teamsRes.ok) {
            throw new Error(`Server returned error: ${groupsRes.status} / ${teamsRes.status}`);
        }

        data.groups = await groupsRes.json();
        data.teams = await teamsRes.json();

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

function renderPage() {
    if (!currentGroupId) {
        document.getElementById('current-group-name').textContent = 'NO GROUP SELECTED';
        document.getElementById('table-body').innerHTML = '';
        document.getElementById('total-teams').textContent = '0 CLUBS';
        return;
    }
    
    const currentGroup = data.groups.find(g => g.id === currentGroupId);
    if (!currentGroup) return;

    document.getElementById('current-group-name').textContent = currentGroup.name;

    let groupTeams = data.teams.filter(t => t.groupId === currentGroupId);
    
    // Calculate P and PTS
    groupTeams = groupTeams.map(team => {
        const p = parseInt(team.win) + parseInt(team.draw) + parseInt(team.lose);
        const pts = (parseInt(team.win) * 3) + (parseInt(team.draw) * 1) + (parseInt(team.lose) * 0);
        const gd = parseInt(team.gf) - parseInt(team.ga);
        return { ...team, p, pts, gd };
    });

    // Sort: Points DESC, GD DESC, GF DESC
    groupTeams.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    document.getElementById('total-teams').textContent = `${groupTeams.length} CLUBS`;

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    groupTeams.forEach((team, index) => {
        const pos = index + 1;
        const rowClass = pos === 1 ? 'bg-surface-container border-l-4 border-primary group hover:bg-surface-container-high transition-colors' : 'bg-surface-container-low hover:bg-surface-container-high transition-colors';
        const posClass = pos === 1 ? 'text-primary' : 'text-on-surface-variant';
        const ptsClass = pos === 1 ? 'text-primary bg-primary/5' : 'text-primary';

        const tr = document.createElement('tr');
        tr.className = rowClass;
        tr.innerHTML = `
            <td class="p-4 text-center font-data-numeric ${posClass}">${pos}</td>
            <td class="p-4 flex items-center gap-4">
                <div class="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center p-1 overflow-hidden">
                    ${team.logo ? `<img class="w-full h-full object-contain" src="${team.logo}" alt="logo">` : `<span class="material-symbols-outlined text-on-surface-variant">sports_soccer</span>`}
                </div>
                <span class="font-headline-md text-on-surface tracking-wide">${team.name}</span>
            </td>
            <td class="p-4 text-center font-data-numeric">${team.p}</td>
            <td class="p-4 text-center font-data-numeric">${team.win}</td>
            <td class="p-4 text-center font-data-numeric">${team.draw}</td>
            <td class="p-4 text-center font-data-numeric">${team.lose}</td>
            <td class="p-4 text-center font-data-numeric text-on-surface-variant">${team.gf}</td>
            <td class="p-4 text-center font-data-numeric text-on-surface-variant">${team.ga}</td>
            <td class="p-4 text-center font-data-numeric ${ptsClass}">${team.pts}</td>
            <td class="p-4 text-center">
                <button onclick="openEditTeamModal('${team.id}')" class="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">edit</button>
                <button onclick="deleteTeam('${team.id}')" class="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors ml-2">delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modals Logic
function populateTeamGroupSelector(selectedGroupId) {
    const select = document.getElementById('team-group-id');
    if (!select) return;
    select.innerHTML = '';
    data.groups.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.textContent = g.name;
        if (g.id === selectedGroupId) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

window.openAddTeamModal = function() {
    if(!currentGroupId) {
        alert('Please create or select a group first.');
        return;
    }
    document.getElementById('team-modal').classList.remove('hidden');
    document.getElementById('team-form').reset();
    document.getElementById('team-id').value = '';
    document.getElementById('team-modal-title').textContent = 'Add New Team';
    populateTeamGroupSelector(currentGroupId);
}

window.openEditTeamModal = function(teamId) {
    const team = data.teams.find(t => t.id === teamId);
    if (!team) return;

    document.getElementById('team-modal').classList.remove('hidden');
    document.getElementById('team-modal-title').textContent = 'Edit Team';
    document.getElementById('team-id').value = team.id;
    populateTeamGroupSelector(team.groupId || currentGroupId);
    document.getElementById('team-name').value = team.name;
    document.getElementById('team-logo').value = team.logo || '';
    document.getElementById('team-win').value = team.win;
    document.getElementById('team-draw').value = team.draw;
    document.getElementById('team-lose').value = team.lose;
    document.getElementById('team-gf').value = team.gf;
    document.getElementById('team-ga').value = team.ga;
}

window.closeTeamModal = function() {
    document.getElementById('team-modal').classList.add('hidden');
}

document.getElementById('team-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Show a basic loading indicator on the button
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const id = document.getElementById('team-id').value;
    const teamData = {
        name: document.getElementById('team-name').value,
        logo: document.getElementById('team-logo').value,
        win: parseInt(document.getElementById('team-win').value) || 0,
        draw: parseInt(document.getElementById('team-draw').value) || 0,
        lose: parseInt(document.getElementById('team-lose').value) || 0,
        gf: parseInt(document.getElementById('team-gf').value) || 0,
        ga: parseInt(document.getElementById('team-ga').value) || 0,
        groupId: document.getElementById('team-group-id')?.value || currentGroupId
    };

    try {
        if (id) {
            // Edit
            const res = await fetch(`${API_URL}/teams/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamData)
            });
            if(res.ok) {
                const idx = data.teams.findIndex(t => t.id === id);
                if (idx !== -1) data.teams[idx] = { ...data.teams[idx], ...teamData };
            }
        } else {
            // Add
            teamData.id = 'team_' + Date.now();
            const res = await fetch(`${API_URL}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamData)
            });
            if(res.ok) {
                data.teams.push(teamData);
            }
        }
        
        closeTeamModal();
        renderPage();
    } catch (error) {
        console.error('Error saving team:', error);
        alert('Gagal menyimpan tim ke server. Error: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

window.deleteTeam = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus tim ini?')) {
        try {
            await fetch(`${API_URL}/teams/${id}`, { method: 'DELETE' });
            data.teams = data.teams.filter(t => t.id !== id);
            renderPage();
        } catch (error) {
            console.error('Error deleting team:', error);
            alert('Gagal menghapus tim dari server.');
        }
    }
}

// Group Modal Logic
window.openAddGroupModal = function() {
    document.getElementById('group-modal').classList.remove('hidden');
    document.getElementById('group-form').reset();
}

window.closeGroupModal = function() {
    document.getElementById('group-modal').classList.add('hidden');
}

document.getElementById('group-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;

    const groupName = document.getElementById('group-name').value;
    const newGroup = {
        id: 'group_' + Date.now(),
        name: groupName
    };

    try {
        const res = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGroup)
        });
        
        if (res.ok) {
            data.groups.push(newGroup);
            currentGroupId = newGroup.id;
            renderGroupSelector();
            renderPage();
            closeGroupModal();
        }
    } catch (error) {
        console.error('Error adding group:', error);
        alert('Gagal menambah grup ke server.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

window.deleteCurrentGroup = async function() {
    if (!currentGroupId) return;
    if (confirm('Apakah Anda yakin ingin menghapus grup ini beserta seluruh tim di dalamnya?')) {
        try {
            await fetch(`${API_URL}/groups/${currentGroupId}`, { method: 'DELETE' });
            
            data.groups = data.groups.filter(g => g.id !== currentGroupId);
            data.teams = data.teams.filter(t => t.groupId !== currentGroupId);
            
            if (data.groups.length > 0) {
                currentGroupId = data.groups[0].id;
            } else {
                currentGroupId = null;
            }
            renderGroupSelector();
            renderPage();
        } catch (error) {
            console.error('Error deleting group:', error);
            alert('Gagal menghapus grup dari server.');
        }
    }
}

// Event Listeners
document.getElementById('group-selector')?.addEventListener('change', function(e) {
    changeGroup(e.target.value);
});

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// Export to Image Logic
window.exportToImage = function() {
    if (!currentGroupId) {
        alert('Tidak ada grup yang dipilih.');
        return;
    }
    
    // Open the new export.html page in a new tab
    window.open(`export.html?groupId=${currentGroupId}`, '_blank');
}

window.exportAllImages = function() {
    window.open(`export.html?exportAll=true`, '_blank');
}
