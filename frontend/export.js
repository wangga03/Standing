const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';
const MAX_ROWS_PER_PAGE = 14;

async function getBase64Image(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Failed to fetch image for base64', e);
        return url;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    const exportAll = urlParams.get('exportAll');

    if (!groupId && !exportAll) {
        alert('Grup ID tidak ditemukan di URL.');
        window.close();
        return;
    }

    try {
        // Load background image as Base64 to prevent tainted canvas error
        const bgBase64 = await getBase64Image('bg.png');

        // Fetch groups and teams
        const [groupsRes, teamsRes] = await Promise.all([
            fetch(`${API_URL}/groups`),
            fetch(`${API_URL}/teams`)
        ]);

        if (!groupsRes.ok || !teamsRes.ok) {
            throw new Error(`Server returned error: ${groupsRes.status} / ${teamsRes.status}`);
        }

        let groups = await groupsRes.json();
        const teams = await teamsRes.json();

        if (!exportAll) {
            groups = groups.filter(g => g.id === groupId);
            if (groups.length === 0) {
                alert('Grup tidak ditemukan.');
                window.close();
                return;
            }
        }

        const pagesContainer = document.getElementById('pages-container');
        const pageTemplate = document.getElementById('page-template').content;
        const groupTemplate = document.getElementById('group-template').content;

        let currentPageElement = null;
        let currentRowsUsed = 0;
        let pageCount = 0;

        function createNewPage() {
            pageCount++;
            const pageClone = document.importNode(pageTemplate, true);
            const captureArea = pageClone.querySelector('.capture-area');
            // Set base64 background
            captureArea.style.backgroundImage = `url('${bgBase64}')`;
            captureArea.dataset.pageIndex = pageCount;
            pagesContainer.appendChild(pageClone);
            currentPageElement = pagesContainer.lastElementChild.querySelector('.flex-1.z-10');
            currentRowsUsed = 0;
        }

        // Initialize first page
        createNewPage();

        for (const group of groups) {
            let groupTeams = teams.filter(t => t.groupId === group.id);
            
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

            // Calculate space needed (header is ~2 rows, each team is 1 row)
            const rowsNeededForGroup = groupTeams.length + 2;

            if (currentRowsUsed > 0 && (currentRowsUsed + rowsNeededForGroup > MAX_ROWS_PER_PAGE)) {
                createNewPage();
            }

            const groupClone = document.importNode(groupTemplate, true);
            groupClone.querySelector('.group-title').textContent = group.name;
            const tableRows = groupClone.querySelector('.table-rows');
            
            let rowsHTML = '';
            groupTeams.forEach((team, index) => {
                const pos = index + 1;
                const logoHTML = team.logo 
                    ? `<img src="${team.logo}" alt="logo" class="w-10 h-10 object-cover rounded-full drop-shadow-md" crossorigin="anonymous">`
                    : `<div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/30"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" class="text-white"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q29 0 57-6t54-18l-80-109-173 54q34 40 81.5 59.5T480-160Zm-179-45 131-41-45-139-166-51q-5 30-5 56q0 50 17 96.5T264-192l37-13Zm299-270 125 39q11-40 11-82q0-46-13-89t-37-80l-86 112v100Zm-200 48 94 29v-98l-94-30-59 78 59 21Zm183 173q28-25 47-58t28-70l-149-47 50 155 24 20Zm-257-531q-32 23-56 52.5T226-658l105 32 60-78-68-94q-19 12-36.5 27.5T253-739Zm156-55q-53 0-101 19t-85 53l108 150 144-46-66-176ZM683-706q-37-33-82.5-53.5T507-797l90 236 142 43q-7-48-26-91t-30-97Z"/></svg></div>`;
                const bgClass = (index % 2 === 0) 
                    ? "bg-gradient-to-b from-[#610b0b] to-[#380202] border-[#240000]"
                    : "bg-gradient-to-b from-[#b31212] to-[#8a0a0a] border-[#3d0000]";

                rowsHTML += `
                <div class="flex items-stretch h-12" style="font-family: 'Space Grotesk', sans-serif;">
                    <div class="w-[60px] ${bgClass} text-white text-2xl font-bold flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${pos}</div>
                    <div class="w-[432px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center gap-4 px-4 rounded-lg shadow-md border-2 border-b-[5px]">
                        ${logoHTML}
                        <span class="uppercase tracking-wide whitespace-nowrap" style="text-shadow: 2px 2px 4px black;">${team.name}</span>
                    </div>
                    <div class="w-[60px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.p}</div>
                    <div class="w-[60px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.win}</div>
                    <div class="w-[60px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.draw}</div>
                    <div class="w-[60px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.lose}</div>
                    <div class="w-[68px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.gf}</div>
                    <div class="w-[68px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.ga}</div>
                    <div class="w-[84px] ml-2 ${bgClass} text-white font-bold text-2xl flex items-center justify-center rounded-lg shadow-md border-2 border-b-[5px]" style="text-shadow: 2px 2px 4px black;">${team.pts}</div>
                </div>
                `;
            });
            tableRows.innerHTML = rowsHTML;
            currentPageElement.appendChild(groupClone);
            currentRowsUsed += rowsNeededForGroup;
        }

        // Store groups globally for download naming
        window.currentExportGroups = groups;

        // Hide loader after a short delay
        setTimeout(() => {
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 300);
        }, 800);

    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Gagal mengambil data dari server. Error: ' + error.message);
    }
});

document.getElementById('download-btn').addEventListener('click', async function() {
    const btn = this;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">refresh</span> Generating...`;
    btn.disabled = true;

    const pagesContainer = document.getElementById('pages-container');
    const originalTransform = pagesContainer.style.transform;
    const originalMarginBottom = pagesContainer.style.marginBottom;

    try {
        // Fix for html2canvas offset bug: remove parent transform temporarily
        pagesContainer.style.transform = 'none';
        pagesContainer.style.marginBottom = '0';
        
        // Wait a moment for the DOM to update layout
        await new Promise(r => setTimeout(r, 100));

        const captureAreas = document.querySelectorAll('.capture-area');
        
        for (let i = 0; i < captureAreas.length; i++) {
            const area = captureAreas[i];
            const pageIndex = area.dataset.pageIndex;
            
            // Using html-to-image instead of html2canvas for flawless modern CSS rendering
            const dataUrl = await htmlToImage.toPng(area, {
                quality: 1.0,
                pixelRatio: 2,
                style: {
                    transform: 'none', // Ensure element itself isn't transformed during capture
                }
            });
            
            let titleText = 'Standings';
            if (window.currentExportGroups && window.currentExportGroups.length === 1) {
                titleText = window.currentExportGroups[0].name;
            } else {
                titleText = `All_Groups_Part_${pageIndex}`;
            }

            const link = document.createElement('a');
            link.download = `Klasemen_${titleText.replace(/\s+/g, '_')}.png`;
            link.href = dataUrl;
            link.click();
            
            // Wait briefly between downloads to ensure browser processes them
            if (i < captureAreas.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }
    } catch (err) {
        console.error('Failed to capture image:', err);
        alert('Gagal membuat gambar klasemen. Error: ' + err.message);
    } finally {
        // Restore scale
        pagesContainer.style.transform = originalTransform;
        pagesContainer.style.marginBottom = originalMarginBottom;
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});
