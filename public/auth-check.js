// auth-check.js
const firebaseConfig = {
  // FIX: Using the corrected API Key (Removed one 'G')
  apiKey: "AIzaSyA6HMF12xiFiCR05dGAKXcnpNUW2DvMkWg",
  authDomain: "metronavigator-38a8e.firebaseapp.com",
  projectId: "metronavigator-38a8e",
  storageBucket: "metronavigator-38a8e.appspot.com",
  messagingSenderId: "57035451467",
  appId: "1:57035451467:web:4d5fb037d4475c311d631ce"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
// Global handler for logout, used by map, stats, and history pages
window.handleLogout = () => {
    auth.signOut().then(() => {
        alertManager.toastSuccess('Logged out successfully');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }).catch(error => {
        alertManager.error('Logout failed: ' + error.message);
    });
};
/**
 * Extracts the email prefix as a username, capitalizing the first letter.
 * @param {string} email 
 * @returns {string} 
 */
function getUsernameFromEmail(email) {
    if (!email) return 'Guest';
    const username = email.split('@')[0];
    
    return username.charAt(0).toUpperCase() + username.slice(1);
}

// Global function to load history on the dedicated history.html page
window.loadHistory = (currentUser) => {
    const historyListBody = document.getElementById('historyList');
    if (!historyListBody) return; // Only run on history.html

    if (!currentUser || !currentUser.uid) {
        // This is handled by the initial DOM load check below, but a fallback display is good.
        historyListBody.innerHTML = '<tr><td colspan="5">Please log in to view your travel history.</td></tr>';
        alertManager.error('User not authenticated. Please log out and back in.');
        return;
    }

    const loadingAlert = alertManager.loading('Loading travel history...');
    const journeysRef = firebase.firestore().collection('journeys');

    // Use get() instead of onSnapshot() for a single-page view
    journeysRef
      .where('userId', '==', currentUser.uid)
      .orderBy('startTime', 'desc')
      .get() 
      .then(snapshot => {
        loadingAlert.close();
        historyListBody.innerHTML = ''; // Clear "Loading history..."
        if (snapshot.empty) {
          historyListBody.innerHTML = '<tr><td colspan="5">No travel history found.</td></tr>';
          alertManager.info('No travel history found.');
        } else {
          snapshot.forEach(doc => {
            const j = doc.data();
            
            // Format Start Time for the "Date" column
            const startedDate = j.startTime && j.startTime.seconds
                ? new Date(j.startTime.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                : 'N/A';
            
            // Create a table row
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td>${startedDate}</td>
              <td>${j.fromStation || "N/A"}</td>
              <td>${j.toStation || "N/A"}</td>
              <td>${j.totalTime || "--"} min</td>
              <td><strong>₹${j.fare || "--"}</strong></td>
            `;
            historyListBody.appendChild(tr);
          });
          alertManager.toastSuccess(`Loaded ${snapshot.docs.length} journeys`);
        }
      })
      .catch(error => {
        loadingAlert.close();
        console.error('Error fetching journeys: ', error);
        historyListBody.innerHTML = '<tr><td colspan="5">Error loading history.</td></tr>';
        alertManager.error('Error fetching travel history. Check console.');
      });
}


document.addEventListener('DOMContentLoaded', () => {
  const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn'); 
  const logoutBtnStats = document.querySelector('.stats-header-bar #logoutBtn'); 
  
  const userDisplay = document.getElementById('userDisplay');
  const welcomeMessage = document.getElementById('welcomeMessage');
  
  const endJourneyBtn = document.getElementById('endJourney');
  
  let currentUser = null;
  
  // FIX: REMOVED all conditional redirect logic. User data is loaded *if* authenticated.
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // User not logged in, but we DON'T redirect, just show guest info/defaults
      if (welcomeMessage) welcomeMessage.textContent = 'Welcome, Guest!';
      if (userDisplay) userDisplay.textContent = 'Guest';
      
      // If we are on the history page and not logged in, show an error state
      if (document.getElementById('historyList')) {
          document.getElementById('historyList').innerHTML = '<tr><td colspan="5">Please log in to view your travel history.</td></tr>';
      }

    } else {
      // User IS logged in, load profile data
      currentUser = user;
      window.currentUser = user;
      
      const username = getUsernameFromEmail(user.email);
      
      // Update sidebar/header displays
      if (userDisplay) userDisplay.textContent = username;
      if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${username}! 👋`;
      
      // If we are on the history page and logged in, load the history data
      if (document.getElementById('historyList')) {
          window.loadHistory(currentUser);
      }
    }
  });
  
  // --- Attach logout handlers ---
  if (sidebarLogoutBtn) sidebarLogoutBtn.addEventListener('click', window.handleLogout);
  if (logoutBtnStats) logoutBtnStats.addEventListener('click', window.handleLogout);
  
  // --- Journey Ending Logic (Only present on map.html) ---
  if (endJourneyBtn) {
    endJourneyBtn.addEventListener('click', () => {
      const journeyToSave = window.currentJourney;
      if (!journeyToSave) {
        alertManager.error('No journey in progress. Please click "Find Route" first.');
        return;
      }
      if (journeyToSave.fare === null || journeyToSave.totalTime === null) {
        alertManager.error('Journey data is incomplete. Please try finding the route again.');
        return;
      }
      
      if (!currentUser) {
          alertManager.error('User not authenticated. Please log out and back in.');
          return;
      }
      
      journeyToSave.userId = currentUser.uid;
      journeyToSave.endTime = new Date();
      const loadingAlert = alertManager.loading('Saving your journey...');
      db.collection('journeys').add(journeyToSave)
        .then(() => {
          loadingAlert.close();
          alertManager.success(`Journey saved: ${journeyToSave.fromStation} → ${journeyToSave.toStation}`);
          window.currentJourney = null;
        })
        .catch(error => {
          loadingAlert.close();
          console.error('Error saving journey: ', error);
          alertManager.error('Error saving journey. Please try again.');
        });
    });
  }
  
  // REMOVED: All old History Modal Logic from map.html
});