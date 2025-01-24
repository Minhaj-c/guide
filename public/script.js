// Basic client-side validation for the signup form
document.getElementById('signup-form').addEventListener('submit', function (e) {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
  
    // Check if any field is empty
    if (!username || !email || !password) {
      e.preventDefault();  // Prevent form submission if fields are empty
      alert('Please fill out all required fields.');
    }
  
    // Optional: Check if password is long enough
    if (password.length < 6) {
      e.preventDefault();
      alert('Password must be at least 6 characters long.');
    }
  });
  