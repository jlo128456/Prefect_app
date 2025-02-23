// globals.js
export const G = {
  // Data
  users: [],
  jobs: [],
  pollingInterval: null,
  currentUserRole: null,

  // DOM Elements
  loginForm: document.getElementById("loginForm"),
  adminView: document.getElementById("adminView"),
  contractorView: document.getElementById("contractorView"),
  contractorJobList: document.getElementById("contractorJobList"),
  adminJobList: document.getElementById("adminJobList"),
};
