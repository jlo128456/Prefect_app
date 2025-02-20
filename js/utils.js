function applyStatusColor(statusElement, status) {
    const statusColors = {
      "Pending": ["#FF4D4D", "white"],
      "In Progress": ["#FFD700", "black"],
      "Completed": ["#32CD32", "white"],
      "Completed - Pending Approval": ["#FFA500", "white"],
      "Approved": ["#4682B4", "white"]
    };
    const [bgColor, textColor] = statusColors[status] || ["white", "black"];
    statusElement.style.backgroundColor = bgColor;
    statusElement.style.color = textColor;
  }
  
  function formatDateTime(dateString) {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} 
            ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }
  