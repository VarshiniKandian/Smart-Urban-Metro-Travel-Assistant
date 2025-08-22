const firebaseConfig = {
  apiKey: "AIzaSyA6HMF12xiFiCR05dGAKXcnpNUW2DvMkWg",
  authDomain: "metronavigator-38a8e.firebaseapp.com",
  projectId: "metronavigator-38a8e",
  storageBucket: "metronavigator-38a8e.appspot.com",
  messagingSenderId: "57035451467",
  appId: "1:57035451467:web:4d5fb037d475c311d631ce"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  const userEmail = document.getElementById('userEmail');
  const startJourneyBtn = document.getElementById('startJourney');
  const endJourneyBtn = document.getElementById('endJourney');
  const historyBtn = document.getElementById('historyBtn');
  const modal = document.getElementById('historyModal');
  const closeModal = document.getElementById('closeHistory');
  const historyList = document.getElementById('historyList');
  const fromSelect = document.getElementById('from');
  const toSelect = document.getElementById('to');

  let currentJourney = null;
  let currentUser = null;

  // ✅ Make currentUser accessible globally for route-logic.js
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      currentUser = user;
      window.currentUser = user;   
      userEmail.textContent = user.email;
    }
  });

  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'login.html';
    });
  });

  // ✅ Start Journey
  startJourneyBtn.addEventListener('click', () => {
    const from = fromSelect.value;
    const to = toSelect.value;

    if (!from || !to) {
      alert('Please select both From and To stations');
      return;
    }

    currentJourney = {
      userId: auth.currentUser.uid,
      fromStation: from,
      toStation: to,
      startTime: new Date(),
      endTime: null,
      route: null,
      totalTime: null,
      fare: null   // ✅ added fare field
    };

    alert(`Journey started from ${from} to ${to}!`);

    // ✅ Make currentJourney accessible to route-logic.js (to update route, time, fare)
    window.currentJourney = currentJourney;
  });

  // ✅ End Journey (save to Firestore)
  endJourneyBtn.addEventListener('click', () => {
    if (!currentJourney) {
      alert('No journey in progress');
      return;
    }

    currentJourney.endTime = new Date();

    db.collection('journeys').add(currentJourney)
      .then(() => {
        alert(`Journey saved: ${currentJourney.fromStation} → ${currentJourney.toStation}`);
        currentJourney = null;
        window.currentJourney = null;
      })
      .catch(error => {
        console.error('Error saving journey: ', error);
        alert('Error saving journey');
      });
  });

  // ✅ Travel History
  historyBtn.addEventListener('click', () => {
    console.log('Travel History button clicked');

    if (!currentUser) {
      console.log('No user is logged in');
      alert('Please log in first.');
      return;
    }

    console.log('Current user UID:', currentUser.uid);

    const journeysRef = firebase.firestore().collection('journeys');

    journeysRef
      .where('userId', '==', currentUser.uid)
      .orderBy('startTime', 'desc')
      // .limit(5)   // ❌ remove if you want full history
      .onSnapshot(snapshot => {
        console.log('Snapshot received:', snapshot.docs.length);

        historyList.innerHTML = ''; // clear previous list

        if (snapshot.empty) {
          console.log('No travel history found');
          historyList.innerHTML = '<p>No travel history found.</p>';
        } else {
          snapshot.forEach(doc => {
            const j = doc.data();
            console.log('Journey doc:', j);

            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
              <strong>${j.fromStation} → ${j.toStation}</strong>
              <small>Time: ${j.totalTime || "N/A"} mins</small>
              <small>Fare: ₹${j.fare || "N/A"}</small>
              <small>Started: ${j.startTime && j.startTime.seconds 
                ? new Date(j.startTime.seconds*1000).toLocaleString() 
                : 'N/A'}</small>
            `;
            historyList.appendChild(div);
          });
        }

        // Show the modal safely
        if (modal) {
          modal.style.display = 'flex';
        } else {
          console.log('Modal element not found');
        }
      }, error => {
        console.error('Error fetching journeys:', error);
        alert('Error fetching travel history. Check console.');
      });
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  window.onclick = function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  };
});
