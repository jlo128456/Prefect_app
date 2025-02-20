let users = [];
let currentUserRole = null;
let loggedInUser = null;

async function loadUsers() {
  try {
    const usersResponse = await fetch('http://localhost:3000/users');
    users = await usersResponse.json();
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function loginUser(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const user = users.find((u) => u.username === username && u.password === password);

  if (user) {
    currentUserRole = user.role;
    loggedInUser = user;
    document.getElementById("loginForm").style.display = "none";
    showDashboard(user.role);
  } else {
    alert("Invalid username or password.");
  }
}

document.getElementById("loginForm").addEventListener("submit", loginUser);
