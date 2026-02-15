const firebaseConfig = {
  apiKey: "AIzaSyA6HMF12xiFiCR05dGAKXcnpNUW2DvMkWg", 
  authDomain: "metronavigator-38a8e.firebaseapp.com",
  projectId: "metronavigator-38a8e",
  storageBucket: "metronavigator-38a8e.appspot.com",
  messagingSenderId: "57035451467",
  appId: "1:57035451467:web:4d5fb037d4475c311d631ce"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupBtn = document.getElementById('signupBtn');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink'); 
  
  // Login Function
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
      alertManager.error('Please enter both email and password');
      return;
    }
    
    const loadingAlert = alertManager.loading('Signing in...');
    
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        loadingAlert.close();
        alertManager.success('Welcome back!');
        setTimeout(() => {
          window.location.href = 'map.html';
        }, 500); 
      })
      .catch((error) => {
        loadingAlert.close();
        alertManager.error(error.message);
      });
  });
  
  // Signup Function
  signupBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
      alertManager.error('Please enter both email and password');
      return;
    }
    
    const loadingAlert = alertManager.loading('Creating account...');
    
    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        loadingAlert.close();
        alertManager.success('Account created successfully!');
        setTimeout(() => {
          window.location.href = 'map.html';
        }, 500);
      })
      .catch((error) => {
        loadingAlert.close();
        alertManager.error(error.message);
      });
  });

  // Forgot Password Functionality
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    if (!email) {
      alertManager.error('Please enter your email address into the Email field to reset your password.');
      return;
    }

    const loadingAlert = alertManager.loading('Sending reset email...');

    auth.sendPasswordResetEmail(email)
      .then(() => {
        loadingAlert.close();
        alertManager.success(`Password reset link sent to ${email}. Check your inbox (and spam folder).`);
      })
      .catch((error) => {
        loadingAlert.close();
        
        let errorMessage = error.message;
        if (error.code === 'auth/user-not-found') {
          errorMessage = `No user found with the email: ${email}. Please check the address or create an account.`;
        }
        alertManager.error(errorMessage);
      });
  });
});
