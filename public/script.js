
document.getElementById('signup-form').addEventListener('submit', function (e) {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    
    if (!username || !email || !password) {
      e.preventDefault();  
      alert('Please fill out all required fields.');
    }
  
    
    if (password.length < 6) {
      e.preventDefault();
      alert('Password must be at least 6 characters long.');
    }
  });
  