const container = document.createElement('div');
container.innerHTML = `
  <style>
    .drawer-section {
      font-family: sans-serif;
      padding-top: 10px;
    }
    .drawer-table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
    }
    .drawer-table th, .drawer-table td {
      border: 1px solid #ccc;
      padding: 8px;
      text-align: left;
    }
    .drawer-table th {
      background-color: #f0f0f0;
    }
    .collapsible {
      cursor: pointer;
      background-color: #f9f9f9;
      border: none;
      padding: 10px;
      width: 100%;
      text-align: left;
      outline: none;
      font-size: 16px;
    }
    .collapsible-content {
      display: none;
      padding: 10px;
      background: #fefefe;
      border: 1px solid #ddd;
    }
  </style>

  <div class="drawer-section">
    <h3>System Status Overview</h3>
    <p>The table below shows the current system metrics.</p>

    <table class="drawer-table">
      <thead>
        <tr>
          <th>Service</th>
          <th>Status</th>
          <th>Uptime</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>API Gateway</td>
          <td style="color: green;">Online</td>
          <td>48 days</td>
        </tr>
        <tr>
          <td>Database</td>
          <td style="color: green;">Online</td>
          <td>48 days</td>
        </tr>
        <tr>
          <td>Worker</td>
          <td style="color: orange;">Degraded</td>
          <td>2 days</td>
        </tr>
      </tbody>
    </table>

    <button class="collapsible">Show Advanced Info</button>
    <div class="collapsible-content">
      <p><strong>Environment:</strong> Production</p>
      <p><strong>Last Deployment:</strong> 2025-04-30</p>
      <p><strong>Version:</strong> 1.4.2</p>
    </div>

    <h4>Quick Feedback</h4>
    <form onsubmit="alert('Submitted!'); return false;">
      <label>
        Your message:<br />
        <textarea rows="3" style="width: 100%;"></textarea>
      </label><br />
      <button type="submit" style="margin-top: 5px;">Send</button>
    </form>
  </div>
`;

// Attach toggle logic for collapsible
const tmp = document.createElement('div');
tmp.appendChild(container);

const collapsibleBtn = tmp.querySelector('.collapsible');
const collapsibleContent = tmp.querySelector('.collapsible-content');

if (collapsibleBtn && collapsibleContent) {
  collapsibleBtn.addEventListener('click', () => {
    const isVisible = collapsibleContent.style.display === 'block';
    collapsibleContent.style.display = isVisible ? 'none' : 'block';
    collapsibleBtn.textContent = isVisible ? 'Show Advanced Info' : 'Hide Advanced Info';
  });
}

window.setDrawerContent(tmp.firstChild);
