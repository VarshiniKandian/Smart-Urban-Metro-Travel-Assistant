const firebaseConfig = {
  apiKey: "AIzaSyA6HMF12xiFiCR05dGAKXcnpNUW2DvMkWg",
  authDomain: "metronavigator-38a8e.firebaseapp.com",
  projectId: "metronavigator-38a8e",
  storageBucket: "metronavigator-38a8e.appspot.app",
  messagingSenderId: "57035451467",
  appId: "1:57035451467:web:4d5fb037d475c311d631ce"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupBtn = document.getElementById('signupBtn');
  const errorMessage = document.getElementById('errorMessage');
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        window.location.href = 'map.html';
      })
      .catch((error) => {
        errorMessage.textContent = error.message;
      });
  });
  
  signupBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
      errorMessage.textContent = 'Please enter both email and password';
      return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        window.location.href = 'map.html';
      })
      .catch((error) => {
        errorMessage.textContent = error.message;
      });
  });
  
  auth.onAuthStateChanged((user) => {
    if (user) {
      window.location.href = 'map.html';
    }
  });
});