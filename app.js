import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, where, getDocs, Timestamp, writeBatch, doc, setDoc, getDoc, updateDoc, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyA6g7ovAKrplYS0x_SNag8SUifclz8J4uI",
    authDomain: "hlp-pm-electric.firebaseapp.com",
    projectId: "hlp-pm-electric",
    storageBucket: "hlp-pm-electric.firebasestorage.app",
    messagingSenderId: "475757068157",
    appId: "1:475757068157:web:3d5dd04d0164d94f6a1614",
    measurementId: "G-2S0LCM62GH"
};
window.saveRescuePin = async () => {
    const newPin = document.getElementById('admin-rescue-pin').value;
    
    if (!newPin || newPin.length < 4 || isNaN(newPin)) {
        showAlert("Rescue PIN must be at least 4 digits.", "Invalid Input");
        return;
    }
    
    // Update local state
    userSettings.masterRescuePin = newPin;
    
    // Explicitly save settings to Firebase
    showLoader();
    const settingsDocRef = doc(db, "app_settings", "global_settings");
    try {
        // Use JSON.parse/stringify to remove any undefined fields
        const settingsToSave = JSON.parse(JSON.stringify(userSettings));
        await setDoc(settingsDocRef, settingsToSave);
        showAlert("Rescue PIN updated successfully!", "Success");
    } catch (e) {
        console.error(e);
        showAlert("Failed to update PIN.", "Error");
    } finally {
        hideLoader();
    }
};

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GLOBAL STATE ---
let currentUser = null;
let currentZone = null;
let selectedEquipment = null;
// *** EDITED: equipmentData is now loaded from Firebase ***
let equipmentData = { HLP: [], SCREEN: [], COMPACTION: [] }; 
let allTasks = [];
let allGreaseTasks = [];
let allDieselTasks = []; // NEW: Diesel Tasks Container
let unsubscribePmTasks = null;
let unsubscribeGreaseTasks = null;
let unsubscribeDieselTasks = null; // NEW: Diesel Listener
let unsubscribeUserSettings = null;
    
// PM Modal State
let pmState = {};
let isOfflineMode = false;
let activeInspectionPoint = null;
let submitContinuation = null;
    
// Grease Modal State
let selectedGreaseEquipment = null;
let greaseState = {};
let activeGreasePoint = null;

// NEW: Diesel Modal State
let selectedDieselGen = null; 
let dieselState = {}; 
let activeDieselPoint = null;

// EDITED: Chart instance
let weeklyChartInstance = null;


// NEW: Default user settings from user list.csv
const defaultUserSettings = {
    users: [
        { id: 'user1', name: 'Eng. Osama Samirat', password: '7454', color: 'bg-blue-600', hover: 'hover:bg-blue-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user2', name: 'Eng. Saliba Madanat', password: '15486', color: 'bg-teal-600', hover: 'hover:bg-teal-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user3', name: 'Abdullah Mansour', password: '6453', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user4', name: 'Khaled Qawabaa', password: '7526', color: 'bg-slate-600', hover: 'hover:bg-slate-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user5', name: 'Muhammad Zanoun', password: '15515', color: 'bg-blue-600', hover: 'hover:bg-blue-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user6', name: "Mutasim Ala'a Al-Din", password: '15529', color: 'bg-teal-600', hover: 'hover:bg-teal-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user7', name: 'Muhammad Qatawneh', password: '6432', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', allowedZones: ['COMPACTION'] },
        { id: 'user8', name: 'Anwar Souqi', password: '6325', color: 'bg-slate-600', hover: 'hover:bg-slate-700', allowedZones: ['Motor Grease'] },
        { id: 'user9', name: 'Ibrahim Sharaida', password: '7647', color: 'bg-blue-600', hover: 'hover:bg-blue-700', allowedZones: ['HLP', 'SCREEN'] },
        { id: 'user10', name: 'Isaac Daqas', password: '4853', color: 'bg-teal-600', hover: 'hover:bg-teal-700', allowedZones: ['SCREEN', 'COMPACTION'] },
        { id: 'user11', name: 'Ali Sharshir', password: '7170', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', allowedZones: ['HLP', 'COMPACTION'] },
        { id: 'user12', name: 'Omar Abu Taqseerah', password: '15534', color: 'bg-slate-600', hover: 'hover:bg-slate-700', allowedZones: ['HLP', 'Motor Grease'] },
        { id: 'user13', name: 'Wajdi Kaakouri', password: '4888', color: 'bg-blue-600', hover: 'hover:bg-blue-700', allowedZones: ['SCREEN', 'Motor Grease'] },
        { id: 'user14', name: 'Khaled Abu Amr', password: '7658', color: 'bg-teal-600', hover: 'hover:bg-teal-700', allowedZones: ['COMPACTION', 'Motor Grease'] },
        { id: 'user15', name: 'Muhammad Adel', password: '7177', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION'] },
        { id: 'user16', name: 'Osama Al-Lemon', password: '7202', color: 'bg-slate-600', hover: 'hover:bg-slate-700', allowedZones: ['HLP', 'SCREEN', 'Motor Grease'] },
        { id: 'user17', name: 'Youssef Abu Odeh', password: '15530', color: 'bg-blue-600', hover: 'hover:bg-blue-700', allowedZones: ['HLP', 'COMPACTION', 'Motor Grease'] },
        { id: 'user18', name: 'Ahmed Daqs', password: '1111', color: 'bg-teal-600', hover: 'hover:bg-teal-700', allowedZones: ['SCREEN', 'COMPACTION', 'Motor Grease'] },
        { id: 'user19', name: 'Abdullah Mashaala', password: '1112', color: 'bg-indigo-600', hover: 'hover:bg-indigo-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'] },
        { id: 'user20', name: 'General user', password: '', color: 'bg-slate-600', hover: 'hover:bg-slate-700', allowedZones: ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease'] }
    ],
    archiveSchedule: {
        start: null,
        interval: 'weekly'
    },
    masterRescuePin: '0000' // <--- ADD THIS LINE
};
let userSettings = { users: [], archiveSchedule: { start: null, interval: 'weekly' } }; // Start with empty users

// --- NEW: BACK BUTTON HANDLING ---
// This listens for browser back button presses
window.onpopstate = function(event) {
    if (event.state) {
        // If we go back to dashboard state, hide all modals
        if (event.state.page === "dashboard") {
            document.getElementById('pm-modal').classList.add('hidden');
            document.getElementById('grease-task-modal').classList.add('hidden');
            document.getElementById('equipment-modal').classList.add('hidden');
            document.getElementById('grease-search-modal').classList.add('hidden');
            // NEW: Hide Diesel Modals
            document.getElementById('diesel-selection-modal').classList.add('hidden');
            document.getElementById('diesel-task-modal').classList.add('hidden');
            // Hide Popups
            document.getElementById('pm-popup').classList.add('hidden');
            document.getElementById('grease-popup').classList.add('hidden');
            document.getElementById('diesel-popup').classList.add('hidden');
        } else if (event.state.page === "login") {
            logout();
        }
    }
};

// Helper to push history state
function pushState(pageName) {
    history.pushState({ page: pageName }, "", `#${pageName}`);
}

// --- UI HELPER FUNCTIONS ---
const showLoader = () => document.getElementById('loader-overlay').classList.remove('hidden');
const hideLoader = () => document.getElementById('loader-overlay').classList.add('hidden');
    
// --- LOCAL STORAGE HELPERS FOR "REMEMBER ME" ---
function saveUserCredentials(userId, password) {
    const credentials = { password: password };
    localStorage.setItem(`pm-user-${userId}`, JSON.stringify(credentials));
}

function getSavedUserCredentials(userId) {
    const saved = localStorage.getItem(`pm-user-${userId}`);
    return saved ? JSON.parse(saved) : null;
}

function clearUserCredentials(userId) {
    localStorage.removeItem(`pm-user-${userId}`);
}

// --- DATA LOADING ---

// Helper function to parse the old hardcoded CSV data
function parseCsvData(csvText) {
    try {
        const lines = csvText.split('\n').slice(1);
        return lines.map(line => {
            const [tag, ...descriptionParts] = line.split(',');
            const description = descriptionParts.join(',').trim();
            return { tag: tag?.trim(), description: description.replace(/"/g, '') };
        }).filter(e => e.tag && e.description);
    } catch (error) {
        console.error("Error parsing CSV data: ", error);
        return [];
    }
}

// This function now loads from Firebase, and uses old strings as a one-time fallback
// --- OPTIMIZED EQUIPMENT LOAD (CACHE-FIRST) ---
async function loadEquipmentData() {
    // 1. FAST LOAD: Check Local Cache
    const cachedEquip = localStorage.getItem('pm_equipment_data_cache');
    
    if (cachedEquip) {
        console.log("Loaded equipment from cache (Instant)");
        equipmentData = JSON.parse(cachedEquip);
    } 
    // Note: We don't showLoader here because loadSettings handles the main loader logic

    // 2. BACKGROUND UPDATE: Fetch fresh data
    const equipDocRef = doc(db, "app_settings", "equipment_lists");
    
    getDoc(equipDocRef).then((docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            equipmentData = data;
            // Update Cache
            localStorage.setItem('pm_equipment_data_cache', JSON.stringify(data));
            console.log("Equipment data updated from Firebase (Background)");
        }
    }).catch((error) => {
        console.warn("Using cached equipment data.");
    });
}

// --- Function to save equipment data back to Firebase ---
async function saveEquipmentDataToFirebase() {
    showLoader();
    const equipDocRef = doc(db, "app_settings", "equipment_lists");
    try {
        // Create a clean copy to save
        const dataToSave = {
            HLP: equipmentData.HLP,
            SCREEN: equipmentData.SCREEN,
            COMPACTION: equipmentData.COMPACTION
        };
        await setDoc(equipDocRef, dataToSave);
        // --- ADD THIS LINE ---
        localStorage.setItem('pm_equipment_data_cache', JSON.stringify(dataToSave));
        // --------------------
        console.log("Equipment data saved to Firebase.");
        // Re-populate user-facing tables
        populateEquipmentTable(currentZone || 'HLP');
        populateGreaseSearchTable([...equipmentData.HLP, ...equipmentData.SCREEN, ...equipmentData.COMPACTION]);
        // Re-render admin preview table
        renderEquipmentList(document.getElementById('preview-zone').value);
    } catch (error) {
        console.error("Error saving equipment data to Firebase:", error);
        showAlert('Failed to save equipment data.', 'Error');
    } finally {
        hideLoader();
    }
}

// --- USER AND SCHEDULE SETTINGS (FIREBASE-BACKED) ---
// --- OPTIMIZED SETTINGS LOAD (CACHE-FIRST) ---
async function loadSettings() {
    // 1. FAST LOAD: Check Local Cache first
    const cachedSettings = localStorage.getItem('pm_app_settings_cache');
    
    if (cachedSettings) {
        // If we have data, use it immediately
        console.log("Loaded settings from cache (Instant)");
        const data = JSON.parse(cachedSettings);
        
        // Merge with defaults (Preserve your existing merge logic)
        let firebaseUsers = data.users || [];
        const defaultUserMap = new Map(defaultUserSettings.users.map(u => [u.id, u]));
        
        let mergedUsers = firebaseUsers.map(fbUser => {
            const defaultUser = defaultUserMap.get(fbUser.id);
            return defaultUser ? { ...defaultUser, ...fbUser } : fbUser;
        });
        
        defaultUserSettings.users.forEach(defaultUser => {
            if (!mergedUsers.some(mu => mu.id === defaultUser.id)) {
                mergedUsers.push(defaultUser);
            }
        });

        userSettings = { 
            users: mergedUsers, 
            archiveSchedule: data.archiveSchedule || defaultUserSettings.archiveSchedule,
            masterRescuePin: data.masterRescuePin || defaultUserSettings.masterRescuePin
        };
    } else {
        // Only show loader if we have NO cache (First time ever)
        showLoader();
    }

    // 2. BACKGROUND UPDATE: Fetch fresh data from Firebase
    const settingsDocRef = doc(db, "app_settings", "global_settings");
    
    // We do NOT await this. We let it run in the background.
    getDoc(settingsDocRef).then((docSnap) => {
        if (docSnap.exists() && docSnap.data().users) {
            const firebaseData = docSnap.data();
            
            // Repeat merge logic for the fresh data
            let firebaseUsers = firebaseData.users;
            const defaultUserMap = new Map(defaultUserSettings.users.map(u => [u.id, u]));
            let mergedUsers = firebaseUsers.map(fbUser => {
                const defaultUser = defaultUserMap.get(fbUser.id);
                return defaultUser ? { ...defaultUser, ...fbUser } : fbUser;
            });
            defaultUserSettings.users.forEach(defaultUser => {
                if (!mergedUsers.some(mu => mu.id === defaultUser.id)) mergedUsers.push(defaultUser);
            });

            // Update the global variable
            userSettings = {
                users: mergedUsers,
                archiveSchedule: firebaseData.archiveSchedule || defaultUserSettings.archiveSchedule,
                masterRescuePin: firebaseData.masterRescuePin || defaultUserSettings.masterRescuePin
            };

            // SAVE TO CACHE for next time
            localStorage.setItem('pm_app_settings_cache', JSON.stringify(firebaseData));
            console.log("Settings updated from Firebase (Background)");
        }
    }).catch((error) => {
        console.warn("Network unreachable, using cached settings.");
    }).finally(() => {
        hideLoader(); // Hide loader if it was showing
    });
}

async function saveSettings() {
    // Ensure schedule is captured from DOM if admin is logged in
    const startDateInput = document.getElementById('start-date');
    const intervalSelect = document.getElementById('interval-duration');
    if (startDateInput && intervalSelect) {
         userSettings.archiveSchedule.start = startDateInput.value || userSettings.archiveSchedule.start;
         userSettings.archiveSchedule.interval = intervalSelect.value || userSettings.archiveSchedule.interval;
    }

    const settingsDocRef = doc(db, "app_settings", "global_settings");
    try {
        // Create a deep copy to save, removing any runtime properties if needed
        const settingsToSave = JSON.parse(JSON.stringify(userSettings));
        await setDoc(settingsDocRef, settingsToSave);
    } catch (error) {
        console.error("Error saving settings:", error);
        showAlert('Failed to save settings.', 'Error');
    }
}

window.saveUsers = async () => {
    showLoader();
    
    // 1. Read all new values from the DOM
    const newUsers = userSettings.users.map((user) => {
        const nameInput = document.getElementById(`user-name-edit-${user.id}`);
        const passwordInput = document.getElementById(`user-password-edit-${user.id}`);
        const newName = nameInput ? nameInput.value : user.name;
        const newPassword = passwordInput ? passwordInput.value : user.password;
        
        const selectedZones = [];
        document.querySelectorAll(`.zone-checkbox[data-user-id="${user.id}"]:checked`).forEach(checkbox => {
            selectedZones.push(checkbox.value);
        });
        
        // Return a *new* object, preserving color/hover from original defaults
        const defaultUser = defaultUserSettings.users.find(u => u.id === user.id) || {};
        return {
            ...defaultUser, // Gets color, hover
            id: user.id,
            name: newName,
            password: newPassword,
            allowedZones: selectedZones
        };
    });

    // 2. NEW: Validate for duplicate passwords
    const passwordSet = new Set();
    let duplicatePassword = null;
    for (const user of newUsers) {
        // Allow one blank password for "General user"
        if (user.password === "") continue; 
        
        if (passwordSet.has(user.password)) {
            duplicatePassword = user.password;
            break;
        }
        passwordSet.add(user.password);
    }

    // 3. If duplicate found, show interrupt alert and stop
    if (duplicatePassword) {
        hideLoader();
        showAlert(`Duplicate password found: "${duplicatePassword}". Please ensure all passwords are unique.`, "Save Error");
        return; // Stop the function before saving
    }

    // 4. If no duplicates, update global state and save
    userSettings.users = newUsers;
    await saveSettings();
    
    hideLoader();
    showAlert('User settings saved!', 'Success');
    // Re-render editor to reflect saved state
    renderUserEditor();
};

function renderUserEditor() {
    const container = document.getElementById('user-editor-container');
    if(!container) return;
    container.innerHTML = '';
    const allZones = ['HLP', 'SCREEN', 'COMPACTION', 'Motor Grease', 'Weekly Diesel Gen'];
    
    // Ensure users are sorted by id (user1, user2, ...)
    const sortedUsers = [...userSettings.users].sort((a, b) => {
         const aNum = parseInt(a.id.replace('user', ''));
         const bNum = parseInt(b.id.replace('user', ''));
         return aNum - bNum;
    });

    sortedUsers.forEach((user) => {
        const div = document.createElement('div');
        div.className = 'p-3 border rounded-lg bg-gray-50';
        let zoneCheckboxesHTML = allZones.map(zone => `
            <label class="inline-flex items-center mr-4">
                <input type="checkbox" value="${zone}" ${user.allowedZones && user.allowedZones.includes(zone) ? 'checked' : ''} class="form-checkbox h-5 w-5 text-blue-600 zone-checkbox" data-user-id="${user.id}">
                <span class="ml-2">${zone}</span>
            </label>`).join('');
        div.innerHTML = `
            <label for="user-name-edit-${user.id}" class="font-semibold text-sm">${user.id}:</label>
            <input type="text" id="user-name-edit-${user.id}" value="${user.name}" class="w-full p-2 border rounded-lg mt-1 mb-2">
            <label for="user-password-edit-${user.id}" class="font-semibold text-sm">Password:</label>
            <input type="text" id="user-password-edit-${user.id}" value="${user.password}" class="w-full p-2 border rounded-lg mt-1 mb-2">
            <label class="font-semibold text-sm mt-2 block">Allowed Zones:</label>
            <div class="flex flex-wrap gap-2 mt-1">${zoneCheckboxesHTML}</div>
        `;
        container.appendChild(div);
    });
}
    
// This function is no longer used
function renderUserButtons() {
   // No longer needed
}

// --- LOGIN/LOGOUT & UI FLOW ---
    
// This function is no longer used, but we keep the "remember me" logic
window.showUserPasswordPrompt = (user) => {
    const savedCreds = getSavedUserCredentials(user.id);
    const latestUser = userSettings.users.find(u => u.id === user.id);

    if (savedCreds && latestUser && savedCreds.password === latestUser.password) {
        showLoader();
        setTimeout(() => {
            showUserDashboard(latestUser.name);
            hideLoader();
        }, 200);
        return;
    }
    
    if(savedCreds) {
         clearUserCredentials(user.id);
    }
};

// This function is no longer used
window.closeUserPasswordModal = () => {};

// --- LOGIN/LOGOUT & SECURITY CONFIG ---
const MAX_ATTEMPTS = 5;          
const LOCKOUT_TIME = 60 * 1000; 

window.loginUserWithPassword = () => {
    const input = document.getElementById('user-password-input');
    const password = input.value;

    if (!password) { 
        showAlert('Please enter a PIN.'); 
        return; 
    }

    // --- 1. CHECK RESCUE PIN FIRST (Dynamic from Firebase) ---
    if (userSettings.masterRescuePin && password === userSettings.masterRescuePin) {
        localStorage.removeItem('pm_login_lockout');
        localStorage.removeItem('pm_failed_attempts');
        
        input.value = '';
        if (typeof updatePinDots === "function") updatePinDots();
        
        showAlert("System Unlocked by Rescue PIN. Please change this PIN in Admin Dashboard if compromised.", "Success");
        return;
    }

    // --- 2. CHECK LOCKOUT STATUS ---
    const lockoutTimestamp = localStorage.getItem('pm_login_lockout');
    if (lockoutTimestamp) {
        const timeRemaining = parseInt(lockoutTimestamp) - Date.now();
        if (timeRemaining > 0) {
            const secondsLeft = Math.ceil(timeRemaining / 1000);
            const alertModal = document.getElementById('alert-modal');
            document.getElementById('alert-title').innerText = "System Locked";
            document.getElementById('alert-message').innerHTML = `
                Too many failed attempts.<br>
                Please wait <strong class="text-red-600">${secondsLeft} seconds</strong>.<br><br>
                <span class="text-sm text-gray-500">Contact Admin for the current Rescue PIN.</span>
            `;
            alertModal.classList.remove('hidden');
            
            input.value = '';
            if (typeof updatePinDots === "function") updatePinDots();
            return; 
        } else {
            localStorage.removeItem('pm_login_lockout');
            localStorage.removeItem('pm_failed_attempts');
        }
    }

    // --- 3. VALIDATE USER PASSWORD ---
    const foundUser = userSettings.users.find(u => u.password === password);

    if (foundUser) {
        // SUCCESS
        localStorage.removeItem('pm_failed_attempts');
        localStorage.removeItem('pm_login_lockout');
        
        // --- NEW: 24-Hour Session Logic ---
        const rememberMe = document.getElementById('remember-me-user').checked;
        if (rememberMe) {
            const sessionData = {
                user: foundUser.name,
                expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 Hours from now
            };
            localStorage.setItem('pm_user_session', JSON.stringify(sessionData));
        }

        input.value = '';
        if (typeof updatePinDots === "function") updatePinDots();
        showUserDashboard(foundUser.name);
        
    } else {
        // FAILURE
        let failedAttempts = parseInt(localStorage.getItem('pm_failed_attempts') || '0');
        failedAttempts++;
        localStorage.setItem('pm_failed_attempts', failedAttempts);

        input.value = '';
        if (typeof updatePinDots === "function") updatePinDots();
        if (navigator.vibrate) navigator.vibrate(200);

        if (failedAttempts >= MAX_ATTEMPTS) {
            const unlockTime = Date.now() + LOCKOUT_TIME;
            localStorage.setItem('pm_login_lockout', unlockTime);
            showAlert(`System Locked for 1 minute due to too many failed attempts.`);
        } else {
            const attemptsLeft = MAX_ATTEMPTS - failedAttempts;
            showAlert(`Incorrect PIN. ${attemptsLeft} attempts remaining.`);
        }
    }
};

function showUserDashboard(userName) {
    currentUser = userName;
    document.getElementById('current-user').innerText = `User: ${currentUser}`;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('user-interface').classList.remove('hidden');

    const loggedInUser = userSettings.users.find(u => u.name === currentUser);
    const userAllowedZones = (loggedInUser && loggedInUser.allowedZones) ? loggedInUser.allowedZones : [];

    // --- PM Zone Buttons ---
    const hlpButton = document.querySelector('button[onclick="selectZone(\'HLP\')"]');
    const screenButton = document.querySelector('button[onclick="selectZone(\'SCREEN\')"]');
    const compactionButton = document.querySelector('button[onclick="selectZone(\'COMPACTION\')"]');

    if (hlpButton) hlpButton.style.display = userAllowedZones.includes('HLP') ? '' : 'none';
    if (screenButton) screenButton.style.display = userAllowedZones.includes('SCREEN') ? '' : 'none';
    if (compactionButton) compactionButton.style.display = userAllowedZones.includes('COMPACTION') ? '' : 'none';
    
    // --- Motor Grease Card ---
    const greaseTaskCard = document.getElementById('grease-task-card');
    if (greaseTaskCard) {
        greaseTaskCard.style.display = userAllowedZones.includes('Motor Grease') ? 'flex' : 'none';
    }

    // --- Diesel Card (Force Visible for now) ---
    const dieselTaskCard = document.getElementById('diesel-task-card');
    if (dieselTaskCard) {
        if (userAllowedZones.includes('Weekly Diesel Gen')) {
            dieselTaskCard.style.display = 'flex';
        } else {
            dieselTaskCard.style.display = 'none';
        }
    }

    pushState("dashboard");

    listenForTasks();
    listenForGreaseTasks();
    listenForDieselTasks();
}

window.showAdminLogin = () => {
    document.getElementById('user-login').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-password').focus();
};

window.showUserSelection = () => {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('user-login').classList.remove('hidden');
    document.getElementById('user-password-input').focus();
};

window.loginAdmin = async () => {
    showLoader();
    const password = document.getElementById('admin-password').value;
    if (password === 'zaid463') {
        const rememberMe = document.getElementById('admin-remember-me').checked;
        if (rememberMe) {
            localStorage.setItem('admin-remembered', 'true');
        } else {
            localStorage.removeItem('admin-remembered');
        }
        
        currentUser = 'Admin';
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-interface').classList.remove('hidden');
        
        // PUSH STATE for Back Button
        pushState("dashboard");

        // *** NEW: Load equipment data on admin login ***
        await loadEquipmentData(); 
        initializeAdminUI();
        await checkAndRunArchiveCycle();
        listenForTasks();
        listenForUserSettingsChanges();
        listenForGreaseTasks();
        listenForDieselTasks(); // NEW: Diesel listener
    } else {
        showAlert('Incorrect password.');
        document.getElementById('admin-password').value = '';
    }
    hideLoader();
};
    
window.logout = () => {
    currentUser = null;
    if (unsubscribePmTasks) unsubscribePmTasks();
    if (unsubscribeGreaseTasks) unsubscribeGreaseTasks();
    if (unsubscribeDieselTasks) unsubscribeDieselTasks();
    if (unsubscribeUserSettings) unsubscribeUserSettings();
    if (weeklyChartInstance) weeklyChartInstance.destroy();
    
    // NEW: Clear Sessions
    localStorage.removeItem('pm_user_session');
    localStorage.removeItem('admin-remembered');
    
    document.getElementById('user-interface').classList.add('hidden');
    document.getElementById('admin-interface').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    
    // Clear inputs
    document.getElementById('admin-password').value = '';
    document.getElementById('user-password-input').value = '';
    
    // Reset PIN dots if function exists
    if (typeof updatePinDots === "function") updatePinDots();
    
    // Uncheck remember me
    if(document.getElementById('remember-me-user')) 
        document.getElementById('remember-me-user').checked = false;
    
    showUserSelection();
    pushState("login");
};

// --- NEW: DIESEL GENERATOR FUNCTIONS ---

window.showDieselSelection = () => {
    document.getElementById('diesel-selection-modal').classList.remove('hidden');
    pushState("diesel-selection");
};

window.selectDieselGen = (tag, description) => {
    selectedDieselGen = { tag, description };
    document.getElementById('diesel-selection-modal').classList.add('hidden');
    
    // Reset state
    dieselState = {};
    activeDieselPoint = null;
    document.getElementById('diesel-tag-display').innerText = `${tag} - ${description}`;
    document.getElementById('diesel-note').value = '';
    updateDieselIconStates();
    
    document.getElementById('diesel-task-modal').classList.remove('hidden');
    pushState("diesel-task");
};
// --- PIN PAD LOGIC ---
window.enterPin = (num) => {
    const input = document.getElementById('user-password-input');
    // Limit to 5 digits max (security against overflow)
    if (input.value.length < 5) {
        input.value += num;
        updatePinDots();
        
        // Optional: Auto-login if length matches standard (e.g., 4)
        // if (input.value.length === 4) window.loginUserWithPassword();
    }
};

window.clearPin = () => {
    const input = document.getElementById('user-password-input');
    input.value = input.value.slice(0, -1); // Remove last char
    updatePinDots();
};

function updatePinDots() {
    const input = document.getElementById('user-password-input');
    const dots = document.querySelectorAll('.pin-dot');
    const len = input.value.length;
    
    dots.forEach((dot, index) => {
        if (index < len) {
            dot.classList.remove('bg-gray-100');
            dot.classList.add('bg-blue-500'); // Filled
        } else {
            dot.classList.add('bg-gray-100');
            dot.classList.remove('bg-blue-500'); // Empty
        }
    });
}

// Reset PIN on logout
const originalLogout = window.logout;
window.logout = () => {
    originalLogout();
    document.getElementById('user-password-input').value = '';
    updatePinDots();
};

window.closeDieselTaskModal = () => {
    document.getElementById('diesel-task-modal').classList.add('hidden');
    // Back button logic handles pushing state, we just need to go back
    history.back();
};

window.openDieselInput = (pointName, title, unit) => {
    activeDieselPoint = pointName;
    const container = document.getElementById('diesel-popup-content');
    
    let html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">${title}</h3>`;
    // Numeric Input
    html += `<div class="mb-4">
                <input type="number" id="diesel-input-val" class="w-full p-4 text-xl rounded-lg text-center font-bold" placeholder="Enter value in ${unit}" step="0.1">
             </div>
             <div class="grid grid-cols-2 gap-4">
                 <button onclick="document.getElementById('diesel-popup').classList.add('hidden')" class="bg-gray-500 text-white font-bold py-3 rounded-lg hover:bg-gray-600 transition">Cancel</button>
                 <button onclick="handleDieselPopupSubmit()" class="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Save</button>
             </div>`;
             
    container.innerHTML = html;
    document.getElementById('diesel-popup').classList.remove('hidden');
    document.getElementById('diesel-input-val').focus();
};

window.openDieselChoice = (pointName) => {
    activeDieselPoint = pointName;
    const container = document.getElementById('diesel-popup-content');
    
    let html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Cleanliness</h3>
                <div class="grid grid-cols-2 gap-4">
                    <button onclick="handleDieselChoice('Clean')" class="bg-green-100 text-green-800 font-bold py-4 rounded-xl border-2 border-green-400 hover:bg-green-200 transition">Clean</button>
                    <button onclick="handleDieselChoice('Dirty')" class="bg-red-100 text-red-800 font-bold py-4 rounded-xl border-2 border-red-400 hover:bg-red-200 transition">Dirty</button>
                </div>`;
    
    container.innerHTML = html;
    document.getElementById('diesel-popup').classList.remove('hidden');
};

window.handleDieselChoice = (value) => {
    dieselState[activeDieselPoint] = value;
    document.getElementById('diesel-popup').classList.add('hidden');
    updateDieselIconStates();
};

window.handleDieselPopupSubmit = () => {
    const val = document.getElementById('diesel-input-val').value;
    if (!val) {
        alert("Please enter a value");
        return;
    }
    dieselState[activeDieselPoint] = val;
    document.getElementById('diesel-popup').classList.add('hidden');
    updateDieselIconStates();
};

function updateDieselIconStates() {
    const points = ['level', 'clean', 'vdc', 'freq', 'vout'];
    points.forEach(p => {
        const btn = document.getElementById(`diesel-icon-${p}`);
        if(btn) {
            btn.classList.remove('pending', 'ok', 'error');
            if (dieselState[p]) {
                if (p === 'clean' && dieselState[p] === 'Dirty') {
                     btn.classList.add('error');
                } else {
                     btn.classList.add('ok');
                }
            } else {
                btn.classList.add('pending');
            }
        }
    });
}

window.submitDieselTask = async () => {
    const required = ['level', 'clean', 'vdc', 'freq', 'vout'];
    const missing = required.filter(r => !dieselState[r]);
    
    if (missing.length > 0) {
        showAlert("Please complete all 5 inspection points.", "Incomplete Data");
        return;
    }

    showLoader();
    const taskData = {
        user: currentUser,
        tag: selectedDieselGen.tag,
        description: selectedDieselGen.description,
        diesel_level: dieselState.level,
        cleanliness: dieselState.clean,
        vdc: dieselState.vdc,
        frequency: dieselState.freq,
        output_voltage: dieselState.vout,
        note: document.getElementById('diesel-note').value, // <--- ADD THIS LINE
        timestamp: serverTimestamp(),
        status_simple: (dieselState.clean === 'Dirty') ? 'Error' : 'OK'
    };

    try {
        await addDoc(collection(db, "diesel_tasks"), taskData);
        showAlert("Diesel Generator Logged Successfully!", "Success");
        document.getElementById('diesel-task-modal').classList.add('hidden');
        history.back(); // Return to previous state
    } catch (e) {
        console.error(e);
        showAlert("Error saving diesel task.", "Error");
    } finally {
        hideLoader();
    }
};

// --- ADMIN UI & AUTOMATED DATE LOGIC ---
function initializeAdminUI() {
    renderUserEditor();
    setupAdminFilters();
    renderWeeklyChart(); // Render chart on init
    const rescueInput = document.getElementById('admin-rescue-pin');
    if (rescueInput) {
        rescueInput.value = userSettings.masterRescuePin || '0000';
    }

    // *** NEW: Setup Equipment Manager ***
    renderEquipmentList('HLP'); // Render default preview
    document.getElementById('preview-zone').addEventListener('change', (e) => {
        renderEquipmentList(e.target.value);
    });
    // *** END NEW ***

    const startDateInput = document.getElementById('start-date');
    const intervalSelect = document.getElementById('interval-duration');
    const { start, interval } = userSettings.archiveSchedule;

    if (start && interval) {
        startDateInput.value = start;
        intervalSelect.value = interval;
    } else {
        startDateInput.value = new Date().toISOString().split('T')[0];
        intervalSelect.value = 'weekly';
    }
    updateArchiveScheduleDisplay();
    intervalSelect.addEventListener('change', updateArchiveScheduleDisplay);
    startDateInput.addEventListener('change', updateArchiveScheduleDisplay);
}

// --- *** NEW: All functions for Equipment Manager *** ---
function renderEquipmentList(zone) {
    const container = document.getElementById('equipment-list-preview');
    if (!container) return;

    const list = equipmentData[zone] || [];
    if (list.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-center p-4">No equipment found for ${zone}.</p>`;
        return;
    }

    let tableHTML = `<table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50"><tr>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">TAG Number</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Description</th>
        </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
    
    list.forEach(item => {
        tableHTML += `<tr>
            <td class="px-2 py-2 whitespace-nowrap font-medium">${item.tag}</td>
            <td class="px-2 py-2 whitespace-nowrap">${item.description}</td>
        </tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

window.saveManualEquipment = async () => {
    const zone = document.getElementById('manual-zone').value;
    const tag = document.getElementById('manual-tag').value.trim();
    const desc = document.getElementById('manual-desc').value.trim();

    if (!zone || !tag || !desc) {
        showAlert("Please fill in all fields (Zone, TAG, Description).", "Error");
        return;
    }

    // Check for duplicates
    const tagExists = equipmentData[zone].some(item => item.tag === tag);
    if (tagExists) {
        showAlert(`The TAG number "${tag}" already exists in the ${zone} zone.`, "Error");
        return;
    }

    // Add to local object
    equipmentData[zone].push({ tag: tag, description: desc });
    
    // Save to Firebase
    await saveEquipmentDataToFirebase();

    showAlert(`Successfully added "${tag}" to ${zone}.`, "Success");
    
    // Clear inputs
    document.getElementById('manual-tag').value = '';
    document.getElementById('manual-desc').value = '';
};

window.handleCsvUpload = () => {
    const zone = document.getElementById('csv-zone').value;
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];

    if (!file) {
        showAlert("Please select a CSV file to upload.", "Error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target.result;
        try {
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            // Find column indexes
            const tagIndex = headers.indexOf('TAG number');
            const descIndex = headers.indexOf('Equipment Description');

            if (tagIndex === -1 || descIndex === -1) {
                showAlert('Invalid CSV format. Headers must include "TAG number" and "Equipment Description".', 'Error');
                return;
            }

            let addedCount = 0;
            let skippedCount = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line) continue;

                // Basic CSV parsing (doesn't handle commas inside quotes)
                const values = line.split(','); 
                const tag = values[tagIndex]?.trim().replace(/"/g, '');
                const desc = values[descIndex]?.trim().replace(/"/g, '');

                if (!tag || !desc) {
                    skippedCount++;
                    continue;
                }

                // Check for duplicates
                const tagExists = equipmentData[zone].some(item => item.tag === tag);
                if (!tagExists) {
                    equipmentData[zone].push({ tag: tag, description: desc });
                    addedCount++;
                } else {
                    skippedCount++;
                }
            }

            if (addedCount > 0) {
                await saveEquipmentDataToFirebase();
                showAlert(`Upload Complete. Added ${addedCount} new items to ${zone}. Skipped ${skippedCount} duplicates or empty rows.`, "Success");
            } else {
                showAlert(`No new equipment was added. Found ${skippedCount} duplicates or empty rows.`, "Info");
            }

            fileInput.value = ''; // Clear the file input
        } catch (e) {
            console.error("Error parsing CSV:", e);
            showAlert("An error occurred while parsing the CSV file.", "Error");
        }
    };
    reader.readAsText(file);
};
// --- *** END of Equipment Manager Functions *** ---


function updateArchiveScheduleDisplay() {
    const startDateInput = document.getElementById('start-date');
    const intervalSelect = document.getElementById('interval-duration');
    if (!startDateInput || !intervalSelect) return;
    let startDate = new Date(startDateInput.value + "T00:00:00");
    if (isNaN(startDate.getTime())) return;
    let endDate = calculateEndDate(startDate, intervalSelect.value);
    document.getElementById('end-date-display').textContent = endDate.toLocaleDateString();
}

function calculateEndDate(startDate, interval) {
    let endDate = new Date(startDate);
    if (interval === 'daily') {
        endDate.setDate(startDate.getDate());
    } else if (interval === 'weekly') {
        endDate.setDate(startDate.getDate() + 6);
    } else if (interval === 'monthly') {
        endDate.setMonth(startDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
    }
    return endDate;
}

function listenForUserSettingsChanges() {
    const settingsDocRef = doc(db, "app_settings", "global_settings");
    unsubscribeUserSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().users && docSnap.data().users.length > 0) {
            const firebaseSettings = docSnap.data();
            
            // **BUG FIX**: Load directly from Firebase.
            let firebaseUsers = firebaseSettings.users;
            const defaultUserMap = new Map(defaultUserSettings.users.map(u => [u.id, u]));
            
            let mergedUsers = firebaseUsers.map(fbUser => {
                const defaultUser = defaultUserMap.get(fbUser.id);
                if (defaultUser) {
                    return { ...defaultUser, ...fbUser };
                }
                return fbUser; 
            });
            
            defaultUserSettings.users.forEach(defaultUser => {
                if (!mergedUsers.some(mu => mu.id === defaultUser.id)) {
                    mergedUsers.push(defaultUser);
                }
            });

            userSettings.users = mergedUsers;
            userSettings.archiveSchedule = firebaseSettings.archiveSchedule || defaultUserSettings.archiveSchedule;

            if (currentUser === 'Admin') {
                renderUserEditor();
            }
            updateArchiveScheduleDisplay();
            if (currentUser && currentUser !== 'Admin') {
                showUserDashboard(currentUser);
            }
        } else {
            // No settings in FB, or users array is empty, use defaults
            userSettings = { ...defaultUserSettings };
            if (currentUser === 'Admin') {
                renderUserEditor();
            }
        }
    }, (error) => {
        console.error("Firebase settings snapshot error: ", error);
        showAlert("Error syncing settings from database.", "Database Error");
        userSettings = { ...defaultUserSettings }; // Fallback on error
    });
}

// --- MODALS AND ALERTS ---
window.showAlert = (message, title = 'Alert') => {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-message').innerText = message;
    document.getElementById('alert-modal').classList.remove('hidden');
};

window.closeAlertModal = () => document.getElementById('alert-modal').classList.add('hidden');
    
window.closeConfirmNoteModal = () => {
    document.getElementById('confirm-note-modal').classList.add('hidden');
    submitContinuation = null;
}

window.selectZone = (zone) => {
    if (currentUser !== 'Admin') {
        const loggedInUser = userSettings.users.find(u => u.name === currentUser);
        if (!loggedInUser || !loggedInUser.allowedZones || !loggedInUser.allowedZones.includes(zone)) {
            showAlert(`You do not have permission to access the ${zone} zone.`, 'Permission Denied');
            return;
        }
    }
    
    currentZone = zone;
    document.getElementById('equipment-modal-title').innerText = `Select Equipment for ${zone}`;
    populateEquipmentTable(zone);
    document.getElementById('equipment-modal').classList.remove('hidden');
    document.getElementById('tag-search').focus();
    pushState("equipment-modal");
};

window.closeEquipmentModal = () => {
    document.getElementById('equipment-modal').classList.add('hidden');
    document.getElementById('tag-search').value = '';
    history.back(); // Trigger popstate
};

// EDITED: Show non-blocking warning for duplicate PM
window.selectEquipment = async (tag, description) => {
    selectedEquipment = { tag, description };
    const warningDiv = document.getElementById('pm-warning-message');
    warningDiv.classList.add('hidden'); // Clear previous warning
    warningDiv.innerHTML = '';
    
    // --- START OF FIX ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Get time in milliseconds for client-side comparison
    const startOfToday = today.getTime(); 

    // 1. Query by 'tag' only. This doesn't need a special index.
    const q = query(
        collection(db, "pm_tasks"),
        where("tag", "==", tag)
    );

    // Check for duplicates
    try {
        const querySnapshot = await getDocs(q);
        
        // 2. Filter the results for 'today' here, in the browser.
        const tasksToday = querySnapshot.docs.filter(doc => {
            const task = doc.data();
            if (!task.timestamp) return false;
            // Compare timestamps in milliseconds
            return task.timestamp.toDate().getTime() >= startOfToday;
        });

        if (tasksToday.length > 0) {
            // 3. Sort to find the most recent one (optional, but good)
            tasksToday.sort((a, b) => b.data().timestamp.toDate().getTime() - a.data().timestamp.toDate().getTime());
            const lastTask = tasksToday[0].data();
            
            // 4. Show the alert
            showAlert(`Warning: PM for this equipment was already performed by ${lastTask.user} today. You can submit a new one if needed.`, 'Duplicate Task');
        }
    } catch (error) {
        // --- END OF FIX ---
        console.error("Could not check for previous tasks: ", error);
        // Don't show a blocking error, just log it.
    }

    // Always show the modal
    document.getElementById('pm-tag-number').innerText = tag;
    // Don't call history.back here, we are transitioning from modal to modal
    document.getElementById('equipment-modal').classList.add('hidden'); 
    resetPmModalState(); 
    document.getElementById('pm-modal').classList.remove('hidden');
    pushState("pm-modal");
};

window.closePmModal = () => {
    document.getElementById('pm-modal').classList.add('hidden');
    resetPmModalState(); // Use the reset function
    closePopup(); // Ensure popup is also closed
    history.back(); // Trigger popstate
};

function populateEquipmentTable(zone) {
    const tableBody = document.getElementById('equipment-table-body');
    const searchInput = document.getElementById('tag-search');
    const renderTable = (filter = '') => {
        tableBody.innerHTML = '';
        // *** EDITED: Use the global equipmentData object ***
        const filteredData = equipmentData[zone].filter(eq =>
            eq.tag.toLowerCase().includes(filter.toLowerCase()) ||
            eq.description.toLowerCase().includes(filter.toLowerCase())
        );
        filteredData.forEach(({ tag, description }) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <a href="#" onclick="event.preventDefault(); selectEquipment('${tag}', \`${description.replace(/'/g, "\\'")}\`)" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold">${tag}</a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${description}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    searchInput.onkeyup = () => renderTable(searchInput.value);
    renderTable();
}
    
// --- NEW FUNCTIONS FOR MOTOR GREASING TASK ---

function populateGreaseSearchTable(equipmentList) {
    const tableBody = document.getElementById('grease-search-table-body');
    const searchInput = document.getElementById('grease-tag-search');
    
    const renderTable = (filter = '') => {
        tableBody.innerHTML = '';
        const filteredData = equipmentList.filter(eq =>
            eq.tag.toLowerCase().includes(filter.toLowerCase()) ||
            eq.description.toLowerCase().includes(filter.toLowerCase())
        );
        filteredData.forEach(({ tag, description }) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <a href="#" onclick="event.preventDefault(); selectGreaseEquipment('${tag}', \`${description.replace(/'/g, "\\'")}\`)" class="text-blue-600 hover:text-blue-800 hover:underline font-semibold">${tag}</a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">${description}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    searchInput.onkeyup = () => renderTable(searchInput.value);
    renderTable();
}

window.showGreaseSearch = () => {
    // *** EDITED: Use the global equipmentData object ***
    const allEquipment = [...equipmentData.HLP, ...equipmentData.SCREEN, ...equipmentData.COMPACTION];
    populateGreaseSearchTable(allEquipment);
    document.getElementById('grease-search-modal').classList.remove('hidden');
    document.getElementById('grease-tag-search').focus();
    pushState("grease-search");
};

window.selectGreaseEquipment = (tag, description) => {
    selectedGreaseEquipment = { tag, description };
    document.getElementById('grease-tag-number').innerText = tag;
    document.getElementById('grease-search-modal').classList.add('hidden');
    
    resetGreaseModalState(); // Reset state
    
    document.getElementById('grease-task-modal').classList.remove('hidden');
    pushState("grease-task");
};

window.closeGreaseTaskModal = () => {
    document.getElementById('grease-task-modal').classList.add('hidden');
    resetGreaseModalState();
    history.back();
};
    
function resetGreaseModalState() {
    greaseState = {};
    activeGreasePoint = null;
    document.getElementById('grease-amount').value = '';
    document.getElementById('grease-note').value = '';
    updateGreaseIconStates();
}
    
function updateGreaseIconStates() {
    const allIcons = ['front', 'rear'];
    allIcons.forEach(iconName => {
        const iconElement = document.getElementById(`grease-icon-${iconName}`);
        if (!iconElement) return;

        iconElement.classList.remove('pending', 'ok', 'error');

        if (greaseState[iconName]) {
            const isError = (greaseState[iconName] === 'Not Exists');
            if (isError) {
                iconElement.classList.add('error');
            } else {
                iconElement.classList.add('ok');
            }
        } else {
            iconElement.classList.add('pending');
        }
    });
}

window.openGreasePoint = (pointName) => {
    activeGreasePoint = pointName;
    renderGreasePopup(pointName);
    document.getElementById('grease-popup').classList.remove('hidden');
}

window.closeGreasePopup = () => {
    document.getElementById('grease-popup').classList.add('hidden');
    activeGreasePoint = null;
    updateGreaseIconStates();
}

function renderGreasePopup(step) {
    const container = document.getElementById('grease-popup-content');
    let title = (step === 'front') ? 'Front Nibble Bearing' : 'Rear Nibble Bearing';
    let html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">${title}</h3>
            <div class="grid grid-cols-2 gap-4">
                <button onclick="handleGreasePopupChoice('${step}', 'Exists')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Exists</button>
                <button onclick="handleGreasePopupChoice('${step}', 'Not Exists')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Not Exists</button>
            </div>`;
    container.innerHTML = html;
}

window.handleGreasePopupChoice = (step, choice) => {
    greaseState[step] = choice;
    closeGreasePopup();
}

window.submitGreaseTask = async () => {
    // Validation
    if (!greaseState.front || !greaseState.rear) {
        showAlert('Please check both front and rear bearings.', 'Incomplete Data');
        return;
    }
    
    const greaseAmount = document.getElementById('grease-amount').value;
    if (!greaseAmount) {
         showAlert('Please enter the total grease amount.', 'Incomplete Data');
        return;
    }

    const taskData = {
        user: currentUser,
        tag: selectedGreaseEquipment.tag,
        description: selectedGreaseEquipment.description,
        frontBearingStatus: greaseState.front,
        rearBearingStatus: greaseState.rear,
        greaseAmount: greaseAmount,
        note: document.getElementById('grease-note').value,
        timestamp: serverTimestamp(),
        
        // For compatibility with old admin view
        frontBearingAvailable: greaseState.front === 'Exists',
        frontBearingCondition: greaseState.front === 'Exists' ? 'OK' : 'Not Available', // Simplified
        rearBearingAvailable: greaseState.rear === 'Exists',
        rearBearingCondition: greaseState.rear === 'Exists' ? 'OK' : 'Not Available', // Simplified
    };

    showLoader();
    try {
        await addDoc(collection(db, "grease_tasks"), taskData);
        showAlert('Greasing Task Saved Successfully!', 'Success');
        document.getElementById('grease-task-modal').classList.add('hidden');
        resetGreaseModalState();
        history.back(); // Trigger popstate
    } catch (error) {
        console.error("Error adding greasing task: ", error);
        showAlert('Failed to save greasing task.', 'Error');
    } finally {
        hideLoader();
    }
};

// --- NEW PM MODAL LOGIC ---

function resetPmModalState() {
    pmState = {};
    isOfflineMode = false;
    activeInspectionPoint = null;
    document.getElementById('note').value = '';
    document.getElementById('pm-note-container').classList.add('hidden');
    updateIconStates();
    const offModeButton = document.getElementById('pm-off-mode-button');
    // EDITED: Default to RUN MODE (green)
    offModeButton.classList.remove('bg-red-600');
    offModeButton.classList.add('bg-green-600', 'text-white');
    offModeButton.innerText = "RUN MODE";
}

window.togglePmOffMode = () => {
    isOfflineMode = !isOfflineMode;
    const offModeButton = document.getElementById('pm-off-mode-button');
    if (isOfflineMode) {
        // EDITED: Change to OFF MODE (red)
        offModeButton.classList.remove('bg-green-600');
        offModeButton.classList.add('bg-red-600');
        offModeButton.innerText = "OFF MODE";
        // Clear any data that is now disabled
        delete pmState.sound;
        delete pmState.vibration;
        delete pmState.temp;
    } else {
        // EDITED: Change to RUN MODE (green)
        offModeButton.classList.remove('bg-red-600');
        offModeButton.classList.add('bg-green-600');
        offModeButton.innerText = "RUN MODE";
    }
    updateIconStates();
}

function updateIconStates() {
    const iconsToDisable = ['sound', 'vibration', 'temp'];
    const allIcons = ['status', 'sound', 'vibration', 'temp', 'shelter'];

    allIcons.forEach(iconName => {
        const iconElement = document.getElementById(`pm-icon-${iconName}`);
        if (!iconElement) return;

        // Reset styles
        iconElement.classList.remove('pending', 'ok', 'error', 'disabled');

        // 1. Check if it should be disabled by OFFLINE mode
        if (isOfflineMode && iconsToDisable.includes(iconName)) {
            iconElement.classList.add('disabled');
        } 
        // 2. Check its data state
        else if (pmState[iconName]) {
            // It has data, check if it's an "error" state
            const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
            const isError = errorStates.includes(pmState[iconName]) || errorStates.includes(pmState[`${iconName}_action`]) || errorStates.includes(pmState[`${iconName}_source`]) || errorStates.includes(pmState['status_dirty_action']) || errorStates.includes(pmState['sound_abnormal_source']);
            if (isError) {
                iconElement.classList.add('error'); // Completed with error
            } else {
                iconElement.classList.add('ok'); // Completed OK
            }
        } 
        // 3. It's active and not completed
        else {
            iconElement.classList.add('pending'); // Pending
        }
    });
    checkSmartNote();
}

function checkSmartNote() {
    const noteContainer = document.getElementById('pm-note-container');
    const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
    let showError = false;
    for (const key in pmState) {
        if (errorStates.includes(pmState[key])) {
            showError = true;
            break;
        }
    }
    noteContainer.classList.toggle('hidden', !showError);
}

window.openInspectionPoint = (pointName) => {
    activeInspectionPoint = pointName;
    renderPopupContent(pointName);
    document.getElementById('pm-popup').classList.remove('hidden');
}

window.closePopup = () => {
    document.getElementById('pm-popup').classList.add('hidden');
    activeInspectionPoint = null;
    updateIconStates();
}

function renderPopupContent(step) {
    const container = document.getElementById('pm-popup-content');
    let html = '';

    switch (step) {
        case 'status':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Motor Status</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('status', 'Clean')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Clean</button>
                        <button onclick="handlePopupChoice('status', 'Dirty')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Dirty</button>
                    </div>`;
            break;
        case 'status_dirty_action':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Action for "Dirty"</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('status_dirty_action', 'Done')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Done</button>
                        <button onclick="handlePopupChoice('status_dirty_action', 'Not')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Not</button>
                    </div>`;
            break;
        case 'sound':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Sound</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('sound', 'Normal')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Normal</button>
                        <button onclick="handlePopupChoice('sound', 'Abnormal')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Abnormal</button>
                    </div>`;
            break;
        case 'sound_abnormal_source':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">"Abnormal" Sound Source</h3>
                    <div class="grid grid-cols-1 gap-4">
                        <button onclick="handlePopupChoice('sound_abnormal_source', 'Front Bearing')" class="pm-choice-button bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">Front Bearing</button>
                        <button onclick="handlePopupChoice('sound_abnormal_source', 'Rear Bearing')" class="pm-choice-button bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">Rear Bearing</button>
                        <button onclick="handlePopupChoice('sound_abnormal_source', 'Other')" class="pm-choice-button bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200">Other</button>
                    </div>`;
            break;
        case 'vibration':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Vibration</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('vibration', 'Normal')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Normal</button>
                        <button onclick="handlePopupChoice('vibration', 'Abnormal')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Abnormal</button>
                    </div>`;
            break;
        case 'temp':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Temperature</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('temp', 'Normal')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Normal</button>
                        <button onclick="handlePopupChoice('temp', 'Abnormal')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Abnormal</button>
                    </div>`;
            break;
        case 'shelter':
            html = `<h3 class="text-2xl font-bold text-center mb-6 text-white">Shelter</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <button onclick="handlePopupChoice('shelter', 'Exist')" class="pm-choice-button bg-green-100 text-green-800 border-green-300 hover:bg-green-200">Exist</button>
                        <button onclick="handlePopupChoice('shelter', 'Not Exist')" class="pm-choice-button bg-red-100 text-red-800 border-red-300 hover:bg-red-200">Not Exist</button>
                    </div>`;
            break;
    }
    container.innerHTML = html;
}
    
window.handlePopupChoice = (step, choice) => {
    // Save the choice
    if (step === 'status_dirty_action') {
        pmState.status_dirty_action = choice;
    } else if (step === 'sound_abnormal_source') {
        pmState.sound_abnormal_source = choice;
    } else {
        pmState[step] = choice;
    }

    // --- Conditional Logic ---
    // 1. If 'Dirty' -> ask for action
    if (step === 'status' && choice === 'Dirty') {
        renderPopupContent('status_dirty_action');
        return; // Don't close popup
    }
    
    // 2. If 'Abnormal' Sound -> ask for source
    if (step === 'sound' && choice === 'Abnormal') {
        renderPopupContent('sound_abnormal_source');
        return; // Don't close popup
    }

    // --- If no more steps for this point, close popup ---
    closePopup();
}
    
// --- DATA HANDLING AND SUBMISSION ---
window.submitPmTask = async () => {
    // --- VALIDATION ---
    const requiredPoints = isOfflineMode ? ['status', 'shelter'] : ['status', 'sound', 'vibration', 'temp', 'shelter'];
    const missingPoints = requiredPoints.filter(point => !pmState[point]);

    if (missingPoints.length > 0) {
        showAlert(`Please complete all required inspection points: ${missingPoints.join(', ')}`, 'Incomplete Data');
        return;
    }
    
    // Check if note is required but empty
    const noteContainer = document.getElementById('pm-note-container');
    const note = document.getElementById('note').value;
    if (!noteContainer.classList.contains('hidden') && !note.trim()) {
        // Show confirmation modal
        submitContinuation = () => proceedToSubmitPmTask(note); // Save the function call
        document.getElementById('confirm-note-modal').classList.remove('hidden');
    } else {
        // No error, or error with note, submit directly
        proceedToSubmitPmTask(note);
    }
};
    
window.continueSubmitPmTask = () => {
    if (submitContinuation) {
        submitContinuation(); // Call the saved function
    }
    closeConfirmNoteModal(); // Close the modal
}

async function proceedToSubmitPmTask(note) {
    showLoader();
    
    // EDITED: Use "Off-M" for offline mode
    const offlineVal = 'Off-M';
    
    // Build the new task object
    const task = {
        user: currentUser,
        zone: currentZone,
        tag: selectedEquipment.tag,
        description: selectedEquipment.description,
        timestamp: serverTimestamp(),
        resolvedByAdmin: false,
        
        // New detailed data
        inspectionMode: isOfflineMode ? 'Offline' : 'Online',
        status: pmState.status || 'N/A',
        status_dirty_action: pmState.status_dirty_action || 'N/A',
        sound: isOfflineMode ? offlineVal : (pmState.sound || 'N/A'),
        sound_abnormal_source: isOfflineMode ? offlineVal : (pmState.sound_abnormal_source || 'N/A'),
        vibration: isOfflineMode ? offlineVal : (pmState.vibration || 'N/A'),
        temp: isOfflineMode ? offlineVal : (pmState.temp || 'N/A'),
        shelter: pmState.shelter || 'N/A',
        note: note,
        
        // --- Deprecated Simple Fields (for backwards compatibility) ---
        status_simple: (pmState.status === 'Dirty' || pmState.sound === 'Abnormal' || pmState.vibration === 'Abnormal' || pmState.temp === 'Abnormal' || pmState.shelter === 'Not Exist' || pmState.status_dirty_action === 'Not') ? 'Error' : 'OK',
        sound_simple: isOfflineMode ? offlineVal : (pmState.sound || 'N/A'),
        vibration_simple: isOfflineMode ? offlineVal : (pmState.vibration || 'N/A'),
        heat_simple: isOfflineMode ? offlineVal : (pmState.temp || 'N/A'),
        motor_umbrella_simple: pmState.shelter || 'N/A'
    };

    // --- SUBMIT TO FIREBASE ---
    try {
        await addDoc(collection(db, "pm_tasks"), task);
        document.getElementById('pm-modal').classList.add('hidden');
        resetPmModalState();
        closePopup();
        showAlert('PM Task Saved Successfully! Select the next equipment.', 'Success');
        history.back(); // Trigger popstate
    } catch (error) {
        console.error("Error adding document: ", error);
        showAlert('Failed to save PM task.', 'Error');
    } finally {
        hideLoader();
    }
};
    
window.closeConfirmNoteModal = () => {
    document.getElementById('confirm-note-modal').classList.add('hidden');
};

window.markPmTaskAsResolved = async (taskId, currentStatus) => {
    const taskRef = doc(db, "pm_tasks", taskId);
    
    // Check the full task data to determine if it's truly an "Error"
    const docSnap = await getDoc(taskRef);
    if (!docSnap.exists()) {
         showAlert('Task not found.', 'Error');
         return;
    }
    const taskData = docSnap.data();
    
    const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
    let isError = taskData.status_simple === 'Error' || // Use the simple status first
                    errorStates.includes(taskData.status) ||
                    errorStates.includes(taskData.sound) ||
                    errorStates.includes(taskData.vibration) ||
                    errorStates.includes(taskData.temp) ||
                    errorStates.includes(taskData.shelter) ||
                    errorStates.includes(taskData.status_dirty_action) ||
                    errorStates.includes(taskData.sound_abnormal_source);
                    
    if (!isError) {
        showAlert('Only PM tasks with an error can be marked as resolved.', 'Invalid Action');
        return;
    }
    
    document.getElementById('confirm-clear-message').innerHTML = `Are you sure you want to mark this PM task as <strong class="text-green-700">resolved by admin</strong>? This will allow users to perform PM on this equipment again.`;
    const yesButton = document.getElementById('confirm-clear-button-yes');
    yesButton.onclick = async () => {
        closeConfirmClearModal();
        showLoader();
        try {
            await updateDoc(taskRef, { resolvedByAdmin: true });
            showAlert('PM Task marked as resolved successfully!', 'Success');
        } catch (error) {
            console.error("Error marking task as resolved: ", error);
            showAlert('Failed to mark task as resolved.', 'Error');
        } finally {
            hideLoader();
        }
    };
    yesButton.innerText = "Yes, Mark Resolved";
    document.getElementById('confirm-clear-modal').classList.remove('hidden');
};

function listenForTasks() {
    if (unsubscribePmTasks) unsubscribePmTasks();
    const q = query(collection(db, "pm_tasks"), orderBy("timestamp", "desc"));
    unsubscribePmTasks = onSnapshot(q, (snapshot) => {
        allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentUser === 'Admin') {
            updateAdminAnalytics(); // Update with new PM tasks
            const textFilter = document.getElementById('history-search-text')?.value || '';
            const dateFilter = document.getElementById('history-search-date')?.value || '';
            displayAdminHistory(textFilter, dateFilter);
            displayAdminLive(allTasks);
            renderWeeklyChart(); // EDITED: Update chart
        } else if (currentUser) {
            displayRecentActivities(allTasks);
        }
    }, (error) => {
        console.error("Firebase snapshot error for tasks: ", error);
        showAlert("Error connecting to the database for tasks.", "Database Error");
    });
}

// NEW: Listener for Diesel
function listenForDieselTasks() {
    if (unsubscribeDieselTasks) unsubscribeDieselTasks();
    const q = query(collection(db, "diesel_tasks"), orderBy("timestamp", "desc"));
    unsubscribeDieselTasks = onSnapshot(q, (snapshot) => {
        allDieselTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentUser === 'Admin') {
            updateAdminAnalytics();
            if (!document.getElementById('diesel-view').classList.contains('hidden')) {
                displayAdminDieselHistory();
            }
        }
    });
}

// --- DISPLAY FUNCTIONS ---
window.scrollRecentActivities = (amount) => {
    const container = document.getElementById('recent-activities-container');
    container.scrollBy({ top: amount, behavior: 'smooth' });
};

// EDITED: Filter for today's tasks only (and show ALL users)
function displayRecentActivities(tasks) {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    container.innerHTML = '';
    
    // EDITED: Filter for today's tasks only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const userTasksToday = tasks.filter(task => {
        if (!task.timestamp) return false; // Ensure timestamp exists
        // const isUser = task.user === currentUser; // <-- EDIT: Removed this line
        const isToday = task.timestamp.toDate().getTime() >= startOfToday;
        return isToday; // <-- EDIT: Only filter by date
    });
    
    // No slice, show all of today's tasks
    userTasksToday.forEach(task => {
        const card = document.createElement('div');
        
        const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
        let isError = task.status_simple === 'Error' || // Use the simple status
                      errorStates.includes(task.status) ||
                      errorStates.includes(task.sound) ||
                      errorStates.includes(task.vibration) ||
                      errorStates.includes(task.temp) ||
                      errorStates.includes(task.shelter) ||
                      errorStates.includes(task.status_dirty_action) ||
                      errorStates.includes(task.sound_abnormal_source);
                        
        const borderClass = isError && !task.resolvedByAdmin ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500';
        const statusIndicator = isError && !task.resolvedByAdmin ? `<span class="text-red-600 font-bold ml-2">(${task.user} - Error)</span>` : `<span class="text-gray-600 font-medium ml-2">(${task.user})</span>`;
        
        card.className = `bg-white p-4 rounded-lg shadow-md ${borderClass} content-card`;
        card.innerHTML = `
            <h3 class="font-bold text-lg">${task.tag}${statusIndicator}</h3>
            <p class="text-gray-600">${task.description}</p>
            <div class="mt-2 text-sm text-gray-500">
                <span>on </span>
                <span>${task.timestamp ? task.timestamp.toDate().toLocaleString() : 'Just now'}</span>
            </div>`;
        container.appendChild(card);
    });
}


function displayAdminLive(tasks) {
    const container = document.getElementById('admin-live-activities');
    if (!container) return;
    container.innerHTML = '';
    tasks.slice(0, 10).forEach(task => {
        
        const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
        let isError = task.status_simple === 'Error' || // Use simple status
                      errorStates.includes(task.status) ||
                      errorStates.includes(task.sound) ||
                      errorStates.includes(task.vibration) ||
                      errorStates.includes(task.temp) ||
                      errorStates.includes(task.shelter) ||
                      errorStates.includes(task.status_dirty_action) ||
                      errorStates.includes(task.sound_abnormal_source);
        
        const resolutionStatusText = isError && !task.resolvedByAdmin
            ? `<span class="text-red-600 font-bold">Error (Unresolved)</span>`
            : (task.resolvedByAdmin ? `<span class="text-green-600 font-bold">Resolved by Admin</span>` : `<span class="text-green-600 font-bold">OK</span>`);
        
        const resolveButton = isError && !task.resolvedByAdmin
            ? `<button onclick="markPmTaskAsResolved('${task.id}', '${task.status}')" class="ml-4 bg-green-500 text-white text-xs px-3 py-1 rounded hover:bg-green-600 transition">Mark Resolved</button>`
            : '';
            
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow border';
        
        // Build details string
        let details = `<strong>Status:</strong> ${task.status || 'N/A'}`;
        if (task.status_dirty_action && task.status_dirty_action !== 'N/A') details += ` (${task.status_dirty_action})`;
        details += `, <strong>Shelter:</strong> ${task.shelter || 'N/A'}`;
        
        if (task.inspectionMode === 'Offline') {
             details += `, <strong class="text-gray-500">Sound:</strong> (Offline)`;
             details += `, <strong class="text-gray-500">Vibration:</strong> (Offline)`;
             details += `, <strong class="text-gray-500">Temp:</strong> (Offline)`;
        } else {
             details += `, <strong>Sound:</strong> ${task.sound || 'N/A'}`;
             if (task.sound_abnormal_source && task.sound_abnormal_source !== 'N/A') details += ` (${task.sound_abnormal_source})`;
             details += `, <strong>Vibration:</strong> ${task.vibration || 'N/A'}`;
             details += `, <strong>Temp:</strong> ${task.temp || 'N/A'}`;
        }

        card.innerHTML = `
            <h3 class="font-bold text-lg text-blue-700">${task.tag} - ${task.description}</h3>
            <p class="text-gray-700 text-sm">${details}</p>
            <p class="text-gray-700"><strong>Overall Status:</strong> ${resolutionStatusText}</p>
            <p class="text-gray-700 text-sm">Note: ${task.note || 'N/A'}</p>
            <div class="mt-2 text-sm text-gray-500 flex items-center">
                <span>by <strong>${task.user}</strong> at </span>
                <span>${task.timestamp ? task.timestamp.toDate().toLocaleString() : 'Just now'}</span>
                ${resolveButton}
            </div>`;
        container.appendChild(card);
    });
}

function displayAdminHistory(filterText = '', filterDate = '', preFilteredTasks = null) {
    const container = document.getElementById('admin-history');
    if (!container) return;

    let filteredTasks = preFilteredTasks !== null ? preFilteredTasks : allTasks;

    if (preFilteredTasks === null) {
        if (filterText) {
            const lowerFilterText = filterText.toLowerCase();
            filteredTasks = filteredTasks.filter(task =>
                task.user.toLowerCase().includes(lowerFilterText) ||
                task.tag.toLowerCase().includes(lowerFilterText)
            );
        }
        if (filterDate) {
            filteredTasks = filteredTasks.filter(task => {
                if (!task.timestamp) return false;
                return task.timestamp.toDate().toISOString().split('T')[0] === filterDate;
            });
        }
    }

    let tableHTML = `<table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50"><tr>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Done By</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tag</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resolved</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
    filteredTasks.forEach(task => {
        const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
        let isError = task.status_simple === 'Error' || // Use simple status
                      errorStates.includes(task.status) ||
                      errorStates.includes(task.sound) ||
                      errorStates.includes(task.vibration) ||
                      errorStates.includes(task.temp) ||
                      errorStates.includes(task.shelter) ||
                      errorStates.includes(task.status_dirty_action) ||
                      errorStates.includes(task.sound_abnormal_source);
                        
        const isErrorAndUnresolved = isError && !task.resolvedByAdmin;
        const resolveButton = isErrorAndUnresolved
            ? `<button onclick="markPmTaskAsResolved('${task.id}', '${task.status}')" class="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600 transition">Mark Resolved</button>`
            : '';
        
        const statusText = isError ? 'Error' : 'OK';
            
        tableHTML += `<tr>
                                <td class="px-2 py-2 whitespace-nowrap">${task.user}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${task.zone || 'N/A'}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${task.tag}</td>
                                <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate">${task.description}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${statusText}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${task.resolvedByAdmin ? 'Yes' : 'No'}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${task.timestamp ? task.timestamp.toDate().toLocaleString() : ''}</td>
                                <td class="px-2 py-2 whitespace-nowrap">${resolveButton}</td>
                           </tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}
    
// --- ADMIN ANALYTICS, FILTERS, AND REPORTS ---
function updateAdminAnalytics() {
    if (!allTasks || !allGreaseTasks || !document.getElementById('analytics-pm-today')) return;
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);

    // --- PM Tasks ---
    const pmTasksToday = allTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfToday);
    const pmTasksWeek = allTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek);
    
    // --- Grease Tasks ---
    const greaseTasksToday = allGreaseTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfToday);
    const greaseTasksWeek = allGreaseTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek);

    // --- NEW: Diesel Tasks ---
    const dieselWeek = allDieselTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek);

    // --- Combined ---
    const totalTasksWeek = pmTasksWeek.length + greaseTasksWeek.length + dieselWeek.length;
    const allActiveUsersToday = new Set([...pmTasksToday.map(t => t.user), ...greaseTasksToday.map(t => t.user), ...allDieselTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfToday).map(t => t.user)]);

    // --- Error States ---
    const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
    const isPmTaskError = (t) => {
        return t.status_simple === 'Error' || // Use simple status
               errorStates.includes(t.status) ||
               errorStates.includes(t.sound) ||
               errorStates.includes(t.vibration) ||
               errorStates.includes(t.temp) ||
               errorStates.includes(t.shelter) ||
               errorStates.includes(t.status_dirty_action) ||
               errorStates.includes(t.sound_abnormal_source);
    };

    const unresolvedErrors = allTasks.filter(t => isPmTaskError(t) && !t.resolvedByAdmin);
    const totalErrorsWeek = pmTasksWeek.filter(isPmTaskError); // Includes resolved and unresolved

    // --- Update DOM ---
    document.getElementById('analytics-pm-today').textContent = pmTasksToday.length;
    document.getElementById('analytics-grease-today').textContent = greaseTasksToday.length;
    document.getElementById('analytics-unresolved-errors').textContent = unresolvedErrors.length;
    document.getElementById('analytics-users-active').textContent = allActiveUsersToday.size;
    
    document.getElementById('analytics-pm-week').textContent = pmTasksWeek.length;
    document.getElementById('analytics-grease-week').textContent = greaseTasksWeek.length;
    document.getElementById('analytics-diesel-week').textContent = dieselWeek.length; // NEW
    document.getElementById('analytics-total-tasks-week').textContent = totalTasksWeek;
    document.getElementById('analytics-total-errors-week').textContent = totalErrorsWeek.length;
}


function setupAdminFilters() {
    const textFilter = document.getElementById('history-search-text');
    const dateFilter = document.getElementById('history-search-date');
    const applyFilters = () => {
        displayAdminHistory(textFilter.value, dateFilter.value);
    };
    textFilter.addEventListener('keyup', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
}
    
window.filterHistoryByAnalytics = (filterType) => {
    const historyContainer = document.getElementById('admin-history');
    const greaseHistoryContainer = document.getElementById('admin-grease-history');
    const textFilter = document.getElementById('history-search-text');
    const dateFilter = document.getElementById('history-search-date');
    const greaseTextFilter = document.getElementById('grease-search-text');
    const greaseDateFilter = document.getElementById('grease-search-date');

    textFilter.value = '';
    dateFilter.value = '';
    greaseTextFilter.value = '';
    greaseDateFilter.value = '';

    let filteredPmTasks = [];
    let filteredGreaseTasks = [];
    const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const isPmTaskError = (t) => {
        return t.status_simple === 'Error' || errorStates.includes(t.status) || errorStates.includes(t.sound) ||
               errorStates.includes(t.vibration) || errorStates.includes(t.temp) ||
               errorStates.includes(t.shelter) || errorStates.includes(t.status_dirty_action) ||
               errorStates.includes(t.sound_abnormal_source);
    };

    switch (filterType) {
        case 'pm_today':
            switchAdminView('pm');
            filteredPmTasks = allTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfToday);
            displayAdminHistory('', '', filteredPmTasks);
            historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'grease_today':
            switchAdminView('grease');
            filteredGreaseTasks = allGreaseTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfToday);
            displayAdminGreaseHistory(); // This will use the full list
            greaseHistoryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'unresolved':
            switchAdminView('pm');
            filteredPmTasks = allTasks.filter(t => isPmTaskError(t) && !t.resolvedByAdmin);
            displayAdminHistory('', '', filteredPmTasks);
            historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'active_users':
            // This one is just a number, no table filter
            return;
        case 'pm_week':
            switchAdminView('pm');
            filteredPmTasks = allTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek);
            displayAdminHistory('', '', filteredPmTasks);
            historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'grease_week':
            switchAdminView('grease');
            filteredGreaseTasks = allGreaseTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek);
            displayAdminGreaseHistory(); // This will use the full list
            greaseHistoryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'diesel_week': // NEW
            switchAdminView('diesel');
            displayAdminDieselHistory();
            document.getElementById('admin-diesel-history').scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        case 'total_tasks_week':
            // No specific table, just a number
            return;
        case 'total_errors_week':
            switchAdminView('pm');
            filteredPmTasks = allTasks.filter(t => t.timestamp && t.timestamp.toDate() >= startOfWeek && isPmTaskError(t));
            displayAdminHistory('', '', filteredPmTasks);
            historyContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
    }
};


function getTaskColorCode(task) {
    // Simplified logic for export
    const heat = task.temp;
    const motor_umbrella = task.shelter;
    
    const checks = {
        sound: task.sound === 'Normal',
        vibration: task.vibration === 'Normal',
        heat: heat === 'Normal',
        motor_umbrella: motor_umbrella === 'Exist',
        status: task.status === 'Clean'
    };

    if (!checks.sound && !checks.vibration && !checks.heat) {
        return { name: 'Black', text: 'Critical: Sound, Vibration, & Heat issues' };
    }
    if (!checks.heat) {
        return { name: 'Red', text: 'Danger: Heat issue' };
    }
    if (!checks.sound || !checks.vibration) {
        return { name: 'Orange', text: 'Warning: Sound/Vibration issue' };
    }
    if (!checks.status) {
        return { name: 'Yellow', text: `Attention: Status issue (${task.status})` };
    }
    if (!checks.motor_umbrella) {
        return { name: 'Blue', text: 'Notice: Motor Umbrella issue' };
    }
    return { name: 'Green', text: 'OK' };
}

window.exportToExcel = () => {
    const tasksToExport = allTasks;
    if (tasksToExport.length === 0) return showAlert("No data to export.");
    
    const reportHeaders = ["Done by", "Zone", "TAG", "Description", "Mode", "Status", "Status Action", "Sound", "Sound Source", "Vibration", "Temp", "Shelter", "Note", "Timestamp", "Color code"];
    
    let csvContent = reportHeaders.join(",") + "\r\n";
    
    tasksToExport.forEach(task => {
        const colorCode = getTaskColorCode(task);
        const row = [
            task.user,
            task.zone || 'N/A',
            task.tag,
            `"${(task.description || '').replace(/"/g, '""')}"`,
            task.inspectionMode || 'Online',
            task.status || 'N/A',
            task.status_dirty_action || 'N/A',
            task.sound || 'N/A',
            task.sound_abnormal_source || 'N/A',
            task.vibration || 'N/A',
            task.temp || 'N/A',
            task.shelter || 'N/A',
            `"${(task.note || '').replace(/"/g, '""')}"`,
            task.timestamp ? `"${task.timestamp.toDate().toLocaleDateString('en-GB')}"` : '',
            colorCode.name,
        ].join(",");
        csvContent += row + "\r\n";
    });

    csvContent += "\r\n\r\n";
    csvContent += "Color Code Legend\r\n";
    csvContent += "Green,OK (All checks are normal)\r\n";
    csvContent += "Blue,Notice: Motor Umbrella issue\r\n";
    csvContent += "Yellow,Attention: Status issue\r\n";
    csvContent += "Orange,Warning: Sound/Vibration issue\r\n";
    csvContent += "Red,Danger: Heat issue\r\n";
    csvContent += "Black,Critical: Sound, Vibration, & Heat issues\r\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pm_report_all_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- NEW: Helper function to get week number ---
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

// --- EDITED: Updated PDF Export function ---
window.exportToPDF = () => {
    const tasksToExport = allTasks;
    if (tasksToExport.length === 0) return showAlert("No data to export.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Use landscape mode
    const pageWidth = doc.internal.pageSize.getWidth();
    const center = pageWidth / 2;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;

    // --- Calculate Dates ---
    const now = new Date();
    const startOfWeek = new Date(now.getTime());
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to last Sunday
    
    const endOfWeek = new Date(startOfWeek.getTime());
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Add 6 days to get Saturday
    
    const year = now.getFullYear();
    const dateOptions = { day: 'numeric', month: 'short' };
    
    const startStr = startOfWeek.toLocaleDateString('en-GB', dateOptions).toUpperCase().replace(' ', '-');
    const endStr = endOfWeek.toLocaleDateString('en-GB', dateOptions).toUpperCase().replace(' ', '-');
    
    const weekString = `WEEK(${startStr} to ${endStr}) / ${year}`;
    const weekNumber = getWeekNumber(new Date()); 

    // --- Add Header ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 255); // Set text color to blue
    doc.text("ELECTRICAL MAINTENANCE DEPARTMENT", leftMargin, 20, { align: 'left' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Reset text color to black
    doc.text(weekString, leftMargin, 28, { align: 'left' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 255); // Set text color to blue
    doc.text("PREVENTIVE MAINTENANCE WEEKLY REPORT", rightMargin, 20, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Reset text color to black
    doc.text("HOT LEACH PLANT OF APC", rightMargin, 28, { align: 'right' });

    doc.setFontSize(28); // Large font size
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60); // Dark gray color
    doc.text("PM", center, 25, { align: 'center' }); 
    
    doc.setLineWidth(0.5);
    doc.line(10, 30, pageWidth - 10, 30); // line from margin 10 to margin 10

    // --- Add Table ---
    const reportHeaders = ["Done by", "Zone", "TAG", "Description", "Status", "Sound", "Vibration", "Temp", "Shelter", "Timestamp"];

    const body = tasksToExport.map(task => {
        return [
            task.user,
            task.zone || 'N/A',
            task.tag,
            task.description,
            task.status || 'N/A',
            task.sound || 'N/A',
            task.vibration || 'N/A',
            task.temp || 'N/A',
            task.shelter || 'N/A',
            task.timestamp ? task.timestamp.toDate().toLocaleDateString('en-GB') : '',
        ];
    });

    doc.autoTable({
        head: [reportHeaders],
        body: body,
        startY: 35, // Start table below the line
        headStyles: {
            fillColor: [0, 150, 200], // Blue header background
            textColor: [255, 255, 255] // White header text
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 1.5, 
            overflow: 'linebreak' 
        },
        columnStyles: { 3: { cellWidth: 50 }, 9: { cellWidth: 25 } },
    });

    doc.save(`pm_weekly_report_${year}_W${weekNumber}.pdf`);
};


// --- DATA DELETION AND ARCHIVING FUNCTIONS ---
window.closeConfirmClearModal = () => document.getElementById('confirm-clear-modal').classList.add('hidden');

window.confirmClearAllData = () => {
    const pmView = document.getElementById('pm-view');
    const activeView = pmView.classList.contains('hidden') ? 'grease' : 'pm';
    
    let message = '';
    if (activeView === 'pm') {
        message = `Are you sure you want to delete <strong class="text-red-700">ALL PM history data</strong>? This action cannot be undone.`;
    } else {
        message = `Are you sure you want to delete <strong class="text-red-700">ALL Motor Grease history data</strong>? This action cannot be undone.`;
    }

    document.getElementById('confirm-clear-message').innerHTML = message;
    const yesButton = document.getElementById('confirm-clear-button-yes');
    yesButton.onclick = () => clearAllDataConfirmed(activeView); 
    yesButton.innerText = "Yes, Delete All";
    document.getElementById('confirm-clear-modal').classList.remove('hidden');
};


async function clearAllDataConfirmed(dataType) {
    closeConfirmClearModal();
    showLoader();

    let collectionName = '';
    let recordTypeName = '';

    if (dataType === 'pm') {
        collectionName = 'pm_tasks';
        recordTypeName = 'PM';
    } else if (dataType === 'grease') {
        collectionName = 'grease_tasks';
        recordTypeName = 'Motor Grease';
    } else {
        showAlert('Unknown data type to delete.', 'Error');
        hideLoader();
        return;
    }

    try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.empty) {
            showAlert(`No ${recordTypeName} data to delete.`, "Info");
            hideLoader();
            return;
        }
        const batch = writeBatch(db);
        snapshot.forEach(docRef => {
            batch.delete(docRef.ref);
        });
        await batch.commit();
        showAlert(`Successfully deleted ${snapshot.size} ${recordTypeName} records.`, "Success");
    } catch (error) {
        console.error(`Error deleting all ${recordTypeName} documents: `, error);
        showAlert(`Failed to delete all ${recordTypeName} data.`, "Error");
    } finally {
        hideLoader();
    }
};


window.runCycleManually = async () => {
    await checkAndRunArchiveCycle(true);
}

async function checkAndRunArchiveCycle(forceRun = false) {
    userSettings.archiveSchedule.start = document.getElementById('start-date').value;
    userSettings.archiveSchedule.interval = document.getElementById('interval-duration').value;
    await saveSettings();
    const { archiveSchedule } = userSettings;
    if (!archiveSchedule.start || !archiveSchedule.interval) return;
    let startDate = new Date(archiveSchedule.start + "T00:00:00");
    let endDate = calculateEndDate(startDate, archiveSchedule.interval);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (forceRun || today > endDate) {
        const cycleStartDate = new Date(startDate);
        const cycleEndDate = new Date(endDate);
        showAlert('Archive cycle running...', 'Processing');
        showLoader();
        const endTimestamp = Timestamp.fromDate(new Date(cycleEndDate.getTime() + (24 * 60 * 60 * 1000) - 1));
        const q = query(collection(db, "pm_tasks"), where("timestamp", ">=", Timestamp.fromDate(cycleStartDate)), where("timestamp", "<=", endTimestamp));
        try {
            const snapshot = await getDocs(q);
            if (snapshot.size > 0) {
                const batch = writeBatch(db);
                snapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            const newStartDate = new Date(cycleEndDate.getTime() + (24 * 60 * 60 * 1000));
            userSettings.archiveSchedule.start = newStartDate.toISOString().split('T')[0];
            await saveSettings();
            updateArchiveScheduleDisplay();
            showAlert(`Archive cycle complete. ${snapshot.size} records from ${cycleStartDate.toLocaleDateString()} to ${cycleEndDate.toLocaleDateString()} were deleted.`, 'Success');
        } catch (error) {
            console.error("Error during archive cycle: ", error);
            showAlert("Failed to complete archive cycle.", "Error");
        } finally {
            hideLoader();
        }
    } else if (forceRun) {
        showAlert(`The current archive period has not ended yet. The cycle will run after ${endDate.toLocaleDateString()}.`, 'Info');
    }
}
    
// --- NEW FUNCTIONS FOR ADMIN GREASE VIEW ---
function listenForGreaseTasks() {
    if (unsubscribeGreaseTasks) unsubscribeGreaseTasks(); // Unsubscribe from previous listener
    const q = query(collection(db, "grease_tasks"), orderBy("timestamp", "desc"));
    unsubscribeGreaseTasks = onSnapshot(q, (snapshot) => {
        allGreaseTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentUser === 'Admin') {
            updateAdminAnalytics(); // Update with new grease tasks
            renderWeeklyChart(); // EDITED: Update chart
        }
        displayAdminGreaseHistory(); // Call the display function when data changes
    }, (error) => {
        console.error("Firebase snapshot error for grease tasks: ", error);
    });
}

function displayAdminGreaseHistory() {
    const container = document.getElementById('admin-grease-history');
    if (!container) return;

    const textFilter = document.getElementById('grease-search-text').value.toLowerCase();
    const dateFilter = document.getElementById('grease-search-date').value;

    let filteredTasks = allGreaseTasks.filter(task => {
        const matchesText = !textFilter || task.user.toLowerCase().includes(textFilter) || task.tag.toLowerCase().includes(textFilter);
        const matchesDate = !dateFilter || (task.timestamp && task.timestamp.toDate().toISOString().split('T')[0] === dateFilter);
        return matchesText && matchesDate;
    });

    let tableHTML = `<table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50"><tr>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">User</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">TAG</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Front Bearing</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Rear Bearing</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Grease (g)</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Note</th>
            <th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Timestamp</th>
        </tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
    
    filteredTasks.forEach(task => {
        tableHTML += `<tr>
            <td class="px-2 py-2 whitespace-nowrap">${task.user}</td>
            <td class="px-2 py-2 whitespace-nowrap">${task.tag}</td>
            <td class="px-2 py-2 whitespace-nowrap">${task.frontBearingStatus || 'N/A'}</td>
            <td class="px-2 py-2 whitespace-nowrap">${task.rearBearingStatus || 'N/A'}</td>
            <td class="px-2 py-2 whitespace-nowrap">${task.greaseAmount}</td>
            <td class="px-2 py-2 whitespace-nowrap max-w-xs truncate">${task.note || 'N/A'}</td>
            <td class="px-2 py-2 whitespace-nowrap">${task.timestamp ? task.timestamp.toDate().toLocaleString() : ''}</td>
        </tr>`;
    });
    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
}

window.exportGreaseToExcel = () => {
    if (allGreaseTasks.length === 0) return showAlert("No greasing data to export.");

    const headers = ["User", "TAG", "Description", "Front Bearing Status", "Rear Bearing Status", "Grease Amount (g)", "Note", "Timestamp"];
    const customHeader = "Arab Potash Company,,,,Weekly Motor Grease,,,,Hot Leach Plant\r\n\r\n";
    let csvContent = customHeader + headers.join(",") + "\r\n";
    
    allGreaseTasks.forEach(task => {
        const row = [
            task.user,
            task.tag,
            `"${(task.description || '').replace(/"/g, '""')}"`,
            task.frontBearingStatus || 'N/A',
            task.rearBearingStatus || 'N/A',
            task.greaseAmount,
            `"${(task.note || '').replace(/"/g, '""')}"`,
            task.timestamp ? `"${task.timestamp.toDate().toLocaleDateString('en-GB')}"` : ''
        ].join(",");
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `grease_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
    
// EDITED: Add new chart function
function renderWeeklyChart() {
    if (currentUser !== 'Admin' || !document.getElementById('admin-weekly-chart')) return;

    const ctx = document.getElementById('admin-weekly-chart').getContext('2d');
    if (!ctx) return;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Helper to get the start of a week (Sunday)
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
    };

    const weekStarts = [];
    const labels = [];
    // Get start of this week and 3 previous weeks
    for (let i = 3; i >= 0; i--) {
        const date = new Date(startOfToday);
        date.setDate(date.getDate() - (i * 7));
        const weekStart = getStartOfWeek(date);
        weekStarts.push(weekStart);
        
        const labelDate = new Date(weekStart);
        labels.push(`Week of ${labelDate.getMonth() + 1}/${labelDate.getDate()}`);
    }
    weekStarts.push(new Date().getTime() + 86400000); // Add end boundary for this week

    const totalTasksData = [0, 0, 0, 0];
    const abnormalTasksData = [0, 0, 0, 0];
    
    const errorStates = ['Dirty', 'Abnormal', 'Not Exist', 'Not'];
    const isPmTaskError = (t) => {
        return t.status_simple === 'Error' || errorStates.includes(t.status) || errorStates.includes(t.sound) ||
               errorStates.includes(t.vibration) || errorStates.includes(t.temp) ||
               errorStates.includes(t.shelter) || errorStates.includes(t.status_dirty_action) ||
               errorStates.includes(t.sound_abnormal_source);
    };

    // Collate PM tasks
    allTasks.forEach(task => {
        if (!task.timestamp) return;
        const taskTime = task.timestamp.toDate().getTime();
        for (let i = 0; i < 4; i++) {
            if (taskTime >= weekStarts[i] && taskTime < weekStarts[i+1]) {
                totalTasksData[i]++;
                if (isPmTaskError(task)) {
                    abnormalTasksData[i]++;
                }
                break;
            }
        }
    });
    
    // Collate Grease tasks
    allGreaseTasks.forEach(task => {
        if (!task.timestamp) return;
        const taskTime = task.timestamp.toDate().getTime();
        for (let i = 0; i < 4; i++) {
            if (taskTime >= weekStarts[i] && taskTime < weekStarts[i+1]) {
                totalTasksData[i]++;
                // Grease tasks don't have an "abnormal" state, so we don't increment abnormalTasksData
                break;
            }
        }
    });

    // NEW: Collate Diesel tasks
    allDieselTasks.forEach(task => {
        if (!task.timestamp) return;
        const taskTime = task.timestamp.toDate().getTime();
        for (let i = 0; i < 4; i++) {
            if (taskTime >= weekStarts[i] && taskTime < weekStarts[i+1]) {
                totalTasksData[i]++;
                // You can define what makes a diesel task abnormal if needed
                break;
            }
        }
    });

    if (weeklyChartInstance) {
        weeklyChartInstance.destroy(); // Destroy old chart
    }

    weeklyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Tasks (PM + Grease + Diesel)',
                    data: totalTasksData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.1
                },
                {
                    label: 'Abnormal PM Tasks',
                    data: abnormalTasksData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// --- NEW: Display Function for Diesel History (Verbose Style) ---
function displayAdminDieselHistory() {
    const container = document.getElementById('admin-diesel-history');
    if (!container) return;

    let tableHTML = '<table class="min-w-full divide-y divide-gray-200 text-sm">';
    tableHTML += '<thead class="bg-gray-50"><tr>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">User</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">TAG</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Level (%)</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Clean</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Vdc (V)</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Freq (Hz)</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Vout (V)</th>';
    tableHTML += '<th class="px-2 py-2 text-left font-medium text-gray-500 uppercase">Timestamp</th>';
    tableHTML += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';

    allDieselTasks.forEach(task => {
        const cleanClass = task.cleanliness === 'Dirty' ? 'text-red-600 font-bold' : 'text-green-600';
        tableHTML += '<tr>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.user + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.tag + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.diesel_level + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap ' + cleanClass + '">' + task.cleanliness + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.vdc + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.frequency + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + task.output_voltage + '</td>';
        tableHTML += '<td class="px-2 py-2 whitespace-nowrap">' + (task.timestamp ? task.timestamp.toDate().toLocaleString() : '') + '</td>';
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

window.switchAdminView = (view) => {
    const pmView = document.getElementById('pm-view');
    const greaseView = document.getElementById('grease-view');
    const dieselView = document.getElementById('diesel-view'); // NEW
    const equipmentView = document.getElementById('equipment-view');
    
    const tabPm = document.getElementById('tab-pm');
    const tabGrease = document.getElementById('tab-grease');
    const tabDiesel = document.getElementById('tab-diesel'); // NEW
    const tabEquipment = document.getElementById('tab-equipment');

    // Hide all views
    pmView.classList.add('hidden');
    greaseView.classList.add('hidden');
    dieselView.classList.add('hidden'); // NEW
    equipmentView.classList.add('hidden');

    // Deactivate all tabs
    tabPm.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    tabGrease.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    tabDiesel.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'; // NEW
    tabEquipment.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';


    if (view === 'pm') {
        pmView.classList.remove('hidden');
        tabPm.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600';
    } else if (view === 'grease') {
        greaseView.classList.remove('hidden');
        tabGrease.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600';
    } else if (view === 'diesel') { // NEW
        dieselView.classList.remove('hidden');
        tabDiesel.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600';
        displayAdminDieselHistory();
    } else if (view === 'equipment') {
        equipmentView.classList.remove('hidden');
        tabEquipment.className = 'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm border-indigo-500 text-indigo-600';
    }
};
    
// NEW: Export Diesel to Excel
window.exportDieselToExcel = () => {
    if (allDieselTasks.length === 0) return showAlert("No data to export.");

    const headers = ["User", "TAG", "Description", "Level (%)", "Cleanliness", "Vdc (V)", "Freq (Hz)", "Vout (V)", "Timestamp"];
    const customHeader = "Arab Potash Company,,,,Weekly Diesel Generator,,,,Hot Leach Plant\r\n\r\n";
    let csvContent = customHeader + headers.join(",") + "\r\n";
    
    allDieselTasks.forEach(task => {
        const row = [
            task.user,
            task.tag,
            `"${(task.description || '').replace(/"/g, '""')}"`,
            task.diesel_level,
            task.cleanliness,
            task.vdc,
            task.frequency,
            task.output_voltage,
            task.timestamp ? `"${task.timestamp.toDate().toLocaleDateString('en-GB')} ${task.timestamp.toDate().toLocaleTimeString()}"` : ''
        ].join(",");
        csvContent += row + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `diesel_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- INITIALIZATION ---
window.onload = async () => {
    if ('serviceWorker' in navigator) {
        try { navigator.serviceWorker.register('./service-worker.js'); } catch (e) {}
    }
    
    // 1. Load Settings First
    await loadSettings(); 
    
    // 2. Check Admin Session
    if (localStorage.getItem('admin-remembered') === 'true') {
        showLoader();
        currentUser = 'Admin';
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-interface').classList.remove('hidden');
        pushState("dashboard");
        await loadEquipmentData(); 
        initializeAdminUI();
        await checkAndRunArchiveCycle();
        listenForTasks();
        listenForUserSettingsChanges();
        listenForGreaseTasks();
        listenForDieselTasks();
        hideLoader();
        return;
    }

    // 3. NEW: Check User 24h Session
    const userSessionRaw = localStorage.getItem('pm_user_session');
    if (userSessionRaw) {
        try {
            const userSession = JSON.parse(userSessionRaw);
            // Check expiry
            if (Date.now() < userSession.expiry) {
                console.log("Restoring User Session:", userSession.user);
                await loadEquipmentData();
                showUserDashboard(userSession.user);
                return; // Skip login screen
            } else {
                localStorage.removeItem('pm_user_session');
            }
        } catch (e) {
            localStorage.removeItem('pm_user_session');
        }
    }

    // 4. Default Load
    await loadEquipmentData();
    console.log("Application initialized.");
};

document.getElementById('user-password-input').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        window.loginUserWithPassword(); 
    }
});

document.getElementById('admin-password').addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        window.loginAdmin(); 
    }
});

document.getElementById('grease-search-text').addEventListener('keyup', displayAdminGreaseHistory);
document.getElementById('grease-search-date').addEventListener('change', displayAdminGreaseHistory);
