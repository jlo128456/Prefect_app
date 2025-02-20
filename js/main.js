// main.js
import { G } from './globals.js';
import { loadData } from './api.js';
import { showDashboard } from './dashboard.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Load initial data (users, jobs)
  await loadData();

  // Handle login form submission
  G.loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Find matching user
    const user = G.users.find(u => u.username === username && u.password === password);
    if (user) {
      G.currentUserRole = user.role;
      G.loginForm.style.display = "none";
      showDashboard(user.role);
    } else {
      alert("Invalid username or password.");
    }
  });
});
