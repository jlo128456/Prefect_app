export async function showUpdateJobForm(id) {
  try {
    // Fetch the job record from the API.
    const jobResponse = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (!jobResponse.ok) {
      console.error('Job not found!');
      return;
    }
    const job = await jobResponse.json();

    // Fetch available machines from the API.
    const machinesResponse = await fetch(`${API_BASE_URL}/machines`);
    let availableMachines = [];
    if (machinesResponse.ok) {
      availableMachines = await machinesResponse.json();
    } else {
      console.error('Error fetching machines:', machinesResponse.statusText);
    }

    // Remove any existing update form or overlay.
    const existingForm = document.getElementById('updateJobContainer');
    const existingOverlay = document.getElementById('modalOverlay');
    if (existingForm) existingForm.remove();
    if (existingOverlay) existingOverlay.remove();

    // Hide main views.
    G.adminView.style.display = 'none';
    G.contractorView.style.display = 'none';
    G.techView.style.display = 'none';

    // Create an overlay to cover the main content.
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalOverlay';
    Object.assign(modalOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: '999',
    });
    document.body.appendChild(modalOverlay);

    // Determine the status field HTML.
    const statusField = G.currentUserRole === 'contractor'
      ? `<input type="hidden" id="jobStatus" value="Completed">`
      : `
        <select id="jobStatus" required>
          <option value="Pending" ${job.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="In Progress" ${job.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed - Pending Approval" ${job.status === 'Completed - Pending Approval' ? 'selected' : ''}>Completed - Pending Approval</option>
        </select>
      `;

    // Build the update form HTML.
    const formHTML = `
      <div id="updateJobContainer">
        <h3>Update Work Order: ${job.work_order}</h3>
        <form id="updateJobForm">
          <div>
            <label>Customer Name</label>
            <input type="text" id="customerName" value="${job.customer_name}" required>
          </div>
          <div>
            <label>Contact Name</label>
            <input type="text" id="contactName" value="${job.contact_name || ''}" required>
          </div>
          <div>
            <label>Travel Time (hours)</label>
            <input type="number" id="travelTime" min="0" step="0.5" value="${job.travel_time || 0}" required>
          </div>
          <div>
            <label>Labour Time (hours)</label>
            <input type="number" id="labourTime" min="0" step="0.5" value="${job.labour_time || 0}" required>
          </div>
          <div>
            <label>Note Count (hours)</label>
            <input type="number" id="note_count" value="${job.note_count || ''}" required>
          </div>
          <div>
            <label>Work Performed</label>
            <select id="workPerformedDropdown">
              <option value="">Select Common Work Performed</option>
              <option value="Routine Maintenance">Routine Maintenance</option>
              <option value="Software Update">Software Update</option>
              <option value="Parts Replacement">Parts Replacement</option>
              <option value="Hardware Repair">Hardware Repair</option>
              <option value="System Calibration">System Calibration</option>
            </select>
            <textarea id="workPerformed" rows="3" required>${job.work_performed || ''}</textarea>
          </div>
          <div>
            <label>Select Machines</label>
            <select id="machineSelect">
              <option value="">Select Machine</option>
              ${availableMachines.map(machine => `<option value="${machine.machineId}">${machine.machineType} - ${machine.model}</option>`).join('')}
            </select>
            <button type="button" id="addMachine">Add Machine</button>
          </div>
          <div id="machineList">
            ${
              Array.isArray(job.machines)
                ? job.machines.map(machineId => {
                    const machine = availableMachines.find(m => m.machineId === machineId);
                    if (!machine) return '';
                    return `
                      <div class="machine-entry" data-id="${machine.machineId}">
                        <strong>${machine.machineType} - ${machine.model}</strong>
                        <label>Notes:</label>
                        <textarea class="machine-notes">${machine.notes || ''}</textarea>
                        <label>Parts Used:</label>
                        <input type="text" class="machine-parts" value="${machine.partsUsed || ''}">
                        <button type="button" class="remove-machine">Remove</button>
                      </div>
                    `;
                  }).join('')
                : ''
            }
          </div>
          <div>
            <label>Job Status</label>
            ${statusField}
          </div>
          <div>
            <label>Completion Date</label>
            <input type="date" id="completionDate" value="${job.completion_date || ''}" required>
          </div>
          <div>
            <label>Checklist</label>
            <div>
              <input type="checkbox" id="checkScrews" ${job.checklist?.noMissingScrews ? 'checked' : ''}> No Missing Screws
              <input type="checkbox" id="checkSoftwareUpdated" ${job.checklist?.softwareUpdated ? 'checked' : ''}> Software Updated
              <input type="checkbox" id="checkTested" ${job.checklist?.tested ? 'checked' : ''}> Tested
              <input type="checkbox" id="checkApproved" ${job.checklist?.approvedByManagement ? 'checked' : ''}> Approved by Management
            </div>
          </div>
          <div>
            <label>Signature</label>
            <canvas id="signatureCanvas" width="400" height="150" style="border: 1px solid black;"></canvas>
            <button type="button" id="clearSignature">Clear Signature</button>
          </div>
          <button type="submit">Save</button>
        </form>
        <button type="button" id="backToDashboard">Back to Dashboard</button>
      </div>
    `;

    // Create a container element and insert the form HTML.
    const updateFormContainer = document.createElement('div');
    updateFormContainer.innerHTML = formHTML;
    document.body.appendChild(updateFormContainer);

    // --- Attach Work Performed Dropdown Logic ---
    const workPerformedDropdown = document.getElementById('workPerformedDropdown');
    if (workPerformedDropdown) {
      workPerformedDropdown.addEventListener('change', function() {
        const selectedPhrase = this.value;
        if (selectedPhrase) {
          const textarea = document.getElementById('workPerformed');
          textarea.value += selectedPhrase + "\n";
          this.value = ""; // Reset dropdown after selection
        }
      });
    } else {
      console.error("workPerformedDropdown element not found");
    }

    // --- Signature Pad Setup ---
    const signatureCanvas = document.getElementById('signatureCanvas');
    const ctx = signatureCanvas.getContext('2d');
    let isDrawing = false;
    if (job.signature) {
      const img = new Image();
      img.src = job.signature;
      img.onload = () => ctx.drawImage(img, 0, 0);
    }
    signatureCanvas.addEventListener('mousedown', e => {
      isDrawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });
    signatureCanvas.addEventListener('mouseup', () => (isDrawing = false));
    signatureCanvas.addEventListener('mousemove', e => {
      if (!isDrawing) return;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'black';
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
    });
    const clearSignatureBtn = document.getElementById('clearSignature');
    if (clearSignatureBtn) {
      clearSignatureBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
      });
    } else {
      console.error("clearSignature element not found");
    }

    // --- Machine Add/Remove Functionality ---
    const addMachineBtn = document.getElementById('addMachine');
    addMachineBtn.addEventListener('click', () => {
      const machineSelect = document.getElementById('machineSelect');
      const selectedMachineId = machineSelect.value;
      const selectedMachineName = machineSelect.options[machineSelect.selectedIndex].text;
      if (!selectedMachineId) {
        alert('Please select a machine!');
        return;
      }
      const machineList = document.getElementById('machineList');
      if (document.querySelector(`[data-id="${selectedMachineId}"]`)) {
        alert('Machine already added!');
        return;
      }
      const machineEntry = document.createElement('div');
      machineEntry.classList.add('machine-entry');
      machineEntry.setAttribute('data-id', selectedMachineId);
      machineEntry.innerHTML = `
        <strong>${selectedMachineName}</strong>
        <label>Notes:</label>
        <textarea class="machine-notes"></textarea>
        <label>Parts Used:</label>
        <input type="text" class="machine-parts">
        <button type="button" class="remove-machine">Remove</button>
      `;
      machineList.appendChild(machineEntry);
    });
    document.getElementById('machineList').addEventListener('click', event => {
      if (event.target.classList.contains('remove-machine')) {
        event.target.parentElement.remove();
      }
    });

    // --- Handle Update Form Submission ---
    document.getElementById('updateJobForm').addEventListener('submit', async e => {
      e.preventDefault();
      let newStatus = document.getElementById('jobStatus').value;
      let newContractorStatus = newStatus;
      if (G.currentUserRole === 'contractor' && newStatus === 'Completed') {
        newStatus = 'Completed - Pending Approval';
        newContractorStatus = 'Completed';
      }
      
      // Collect updated note count along with other values.
      const noteCount = document.getElementById('note_count').value;
      
      // Collect updated machine data.
      const updatedMachines = [...document.querySelectorAll('.machine-entry')].map(machine => ({
        id: machine.getAttribute('data-id'),
        name: machine.querySelector('strong').innerText,
        notes: machine.querySelector('.machine-notes').value,
        partsUsed: machine.querySelector('input.machine-parts').value,
      }));
      
      const signatureData = signatureCanvas.toDataURL('image/png');
    
      // Build updated job data.
      const updatedJobData = {
        customer_name: document.getElementById('customerName').value.trim(),
        contact_name: document.getElementById('contactName').value.trim(),
        work_performed: document.getElementById('workPerformed').value.trim(),
        travel_time: document.getElementById('travelTime').value,
        labour_time: document.getElementById('labourTime').value,
        note_count: noteCount,
        status: newStatus,
        contractor_status: newContractorStatus,
        completion_date: document.getElementById('completionDate').value,
        checklist: {
          noMissingScrews: document.getElementById('checkScrews').checked,
          softwareUpdated: document.getElementById('checkSoftwareUpdated').checked,
          tested: document.getElementById('checkTested').checked,
          approvedByManagement: document.getElementById('checkApproved').checked,
        },
        signature: signatureData,
        machines: updatedMachines,
      };
    
      try {
        // Merge updated data with the existing job object.
        const updatedJob = { ...job, ...updatedJobData };
    
        // Send a PUT request to update the job.
        const putResponse = await fetch(`${API_BASE_URL}/jobs/${job.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJob),
        });
        if (!putResponse.ok) throw new Error('Failed to update job.');
    
        alert('Job updated successfully and submitted for admin approval.');
        updateFormContainer.remove();
        modalOverlay.remove();
        showDashboard(G.currentUserRole);
      } catch (error) {
        console.error('Error updating job:', error);
        alert('Failed to update the job.');
      }
    });
    
    // --- Back to Dashboard Button ---
    const backBtn = document.getElementById('backToDashboard');
    backBtn.addEventListener('click', () => {
      updateFormContainer.remove();
      modalOverlay.remove();
      showDashboard(G.currentUserRole);
    });
    
  } catch (error) {
    console.error('Error showing update form:', error);
    alert('Failed to load job data.');
  }
}
