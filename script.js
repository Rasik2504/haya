/**
 * Haya Portal Configuration
 * REPLACE 'PASTE_YOUR_TOKEN_HERE' with your real token if you are using this locally.
 * DO NOT commit your real token to GitHub!
 */
const CONFIG = {
    ADMIN_PASSWORD: "Haya@2025",
    GITHUB_TOKEN: "PASTE_YOUR_TOKEN_HERE",
    REPO_OWNER: "Rasik2504",
    REPO_NAME: "haya",
    DATA_PATH: "data"
};

// State
let state = {
    isLoggedIn: false,
    files: [],
    loading: true
};

// DOM Elements
const views = {
    landing: document.getElementById('landingView'),
    login: document.getElementById('loginView'),
    admin: document.getElementById('adminView')
};

const fileGrid = document.getElementById('fileGrid');
const adminFileList = document.getElementById('adminFileList');
const authLinks = document.getElementById('authLinks');
const loginForm = document.getElementById('loginForm');
const fileInput = document.getElementById('fileInput');

// Initialize
async function init() {
    lucide.createIcons();
    setupNavigation();
    setupAuth();
    await fetchFiles();
}

function setupNavigation() {
    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        showView('landing');
    });
}

function setupAuth() {
    // Check local storage for token (optional but useful)
    const savedToken = localStorage.getItem('haya_admin_token');
    if (savedToken) {
        state.isLoggedIn = true;
        renderAuthUI();
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        const errorEl = document.getElementById('loginError');

        if (password === CONFIG.ADMIN_PASSWORD) {
            state.isLoggedIn = true;
            localStorage.setItem('haya_admin_token', 'logged_in'); // Simple flag
            errorEl.classList.add('hidden');
            renderAuthUI();
            showView('admin');
            renderAdminFiles();
        } else {
            errorEl.textContent = "Incorrect Password!";
            errorEl.classList.remove('hidden');
        }
    });

    // Logout handled in renderAuthUI via event delegation
}

function renderAuthUI() {
    if (state.isLoggedIn) {
        authLinks.innerHTML = `
            <a href="#" id="dashboardLink">Dashboard</a>
            <button id="logoutBtn" class="btn-primary" style="padding: 0.4rem 1rem">Logout</button>
        `;
        document.getElementById('dashboardLink').onclick = (e) => {
            e.preventDefault();
            showView('admin');
            renderAdminFiles();
        };
        document.getElementById('logoutBtn').onclick = () => {
            state.isLoggedIn = false;
            localStorage.removeItem('haya_admin_token');
            renderAuthUI();
            showView('landing');
        };
    } else {
        authLinks.innerHTML = `<a href="#" id="loginLink" class="btn-primary" style="padding: 0.4rem 1rem">Admin Login</a>`;
        document.getElementById('loginLink').onclick = (e) => {
            e.preventDefault();
            showView('login');
        };
    }
}

function showView(viewName) {
    Object.keys(views).forEach(key => {
        views[key].classList.add('hidden');
    });
    views[viewName].classList.remove('hidden');
}

// GitHub API Integration
async function fetchFiles() {
    state.loading = true;
    renderLandingFiles();

    try {
        const url = `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${CONFIG.DATA_PATH}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch files');

        const data = await response.json();
        state.files = data.filter(item => item.type === 'file');
    } catch (err) {
        console.error(err);
    } finally {
        state.loading = false;
        renderLandingFiles();
    }
}

function renderLandingFiles() {
    if (state.loading) {
        fileGrid.innerHTML = '<p class="status-msg">Loading files...</p>';
        return;
    }

    if (state.files.length === 0) {
        fileGrid.innerHTML = '<p class="status-msg">No files found.</p>';
        return;
    }

    fileGrid.innerHTML = state.files.map(file => `
        <div class="glass-card file-card">
            <div class="file-icon"><i data-lucide="file-text" size="32"></i></div>
            <h3 class="file-name">${file.name}</h3>
            <p class="file-info">Size: ${(file.size / 1024).toFixed(2)} KB</p>
            <a href="${file.download_url}" target="_blank" class="btn-primary" style="text-decoration: none">
                <i data-lucide="download"></i> View / Download
            </a>
        </div>
    `).join('');
    lucide.createIcons();
}

function renderAdminFiles() {
    adminFileList.innerHTML = state.files.map(file => `
        <tr>
            <td style="word-break: break-all">${file.name}</td>
            <td>${(file.size / 1024).toFixed(2)} KB</td>
            <td>
                <div style="display: flex; gap: 0.5rem">
                    <a href="${file.download_url}" target="_blank" class="btn-icon"><i data-lucide="external-link"></i></a>
                    <button onclick="handleDelete('${file.path}', '${file.sha}')" class="btn-icon"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

// Admin Actions
fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const errorEl = document.getElementById('adminError');
    errorEl.classList.add('hidden');

    // Check if token is present
    if (CONFIG.GITHUB_TOKEN === "PASTE_YOUR_TOKEN_HERE") {
        alert("GitHub Token is missing! Please configure it in script.js to upload files.");
        return;
    }

    // Password Verification Prompt
    const password = window.prompt("Enter Admin Password to confirm upload:");
    if (password !== CONFIG.ADMIN_PASSWORD) {
        alert("Incorrect password! Upload cancelled.");
        return;
    }

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target.result.split(',')[1];
            await uploadToGitHub(file.name, content);
            await fetchFiles();
            renderAdminFiles();
        };
        reader.readAsDataURL(file);
    } catch (err) {
        errorEl.textContent = "Failed to upload file.";
        errorEl.classList.remove('hidden');
    }
};

async function uploadToGitHub(fileName, base64Content) {
    const url = `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${CONFIG.DATA_PATH}/${fileName}`;
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Upload ${fileName} via Haya Portal`,
            content: base64Content
        })
    });
    if (!response.ok) throw new Error('Upload failed');
}

window.handleDelete = async (path, sha) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    if (CONFIG.GITHUB_TOKEN === "PASTE_YOUR_TOKEN_HERE") {
        alert("GitHub Token is missing!");
        return;
    }

    try {
        const url = `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/contents/${path}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Delete ${path} via Haya Portal`,
                sha: sha
            })
        });
        if (!response.ok) throw new Error('Delete failed');
        await fetchFiles();
        renderAdminFiles();
    } catch (err) {
        alert("Failed to delete file.");
    }
};

// Start
init();
