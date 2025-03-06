// utils.js
export function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    if (typeof dateString !== "string") {
      console.error("Invalid date format received:", dateString);
      return "N/A";
    }
    // If already in DD/MM/YYYY..., just return
    if (dateString.includes("/")) return dateString;
  
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
  
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
  
  export function applyStatusColor(statusElement, status) {
    if (status === "Pending") {
      statusElement.style.backgroundColor = "Green";
      statusElement.style.color = "white";
    } else if (status === "In Progress") {
      statusElement.style.backgroundColor = "yellow";
      statusElement.style.color = "black";
    } else if (status === "Completed") {
      statusElement.style.backgroundColor = "Red";
      statusElement.style.color = "white";
    } else if (status === "Completed - Pending Approval") {
      statusElement.style.backgroundColor = "orange";
      statusElement.style.color = "white";
    }
  }
  