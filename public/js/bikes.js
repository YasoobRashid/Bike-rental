document.addEventListener('DOMContentLoaded', () => {

  const bikeContainer = document.getElementById('bikeContainer');
  const availableListEl = document.getElementById('availableList');
  const myRentedListEl = document.getElementById('myRentedList');
  const msg = document.getElementById('msg');
  const statusEl = document.getElementById('status');
  const logoutBtn = document.getElementById('logoutBtn');

  function setMessage(kind, text) {
    if (!msg) return;
    if (!text) { msg.innerHTML = ''; return; }
    const cls = kind === 'error' ? 'error' : (kind === 'success' ? 'success' : 'notice');
    msg.innerHTML = `<div class="${cls}">${text}</div>`;
  }

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function setStatus() {
    const username = localStorage.getItem('username');
    if (statusEl) statusEl.textContent = username ? `Logged in as: ${username}` : 'You are not logged in';
  }

  async function safeJson(res) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { return await res.json(); } catch { /* fallthrough */ }
    }
    const text = await res.text().catch(() => '');
    return { error: text ? text.slice(0, 500) : `HTTP ${res.status}` };
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      window.location.href = 'login.html';
    });
  }

  async function loadBikes() {
    if (availableListEl) availableListEl.textContent = 'Loading...';
    if (myRentedListEl) myRentedListEl.textContent = 'Loading...';
    setMessage('', '');
    try {
      const res = await fetch('/api/bikes', {
        headers: { 'Authorization': 'Bearer ' + getToken() }
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `Failed to load bikes (HTTP ${res.status})`);

      renderBikeList(availableListEl, data.availableBikes, 'rent');
      renderBikeList(myRentedListEl, data.rentedByMe, 'return');
      setStatus();
    } catch (err) {
      if (availableListEl) availableListEl.innerHTML = '';
      if (myRentedListEl) myRentedListEl.innerHTML = '';
      setMessage('error', err.message || 'Failed to load bikes');
    }
  }

  function renderBikeList(element, bikes, actionType) {
    if (!element) return;
    element.innerHTML = '';

    const noBikesMessage = actionType === 'rent'
      ? 'No bikes are currently available for rent.'
      : 'You have not rented any bikes.';
      
    if (!bikes || !bikes.length) {
      element.innerHTML = `<div class="notice">${noBikesMessage}</div>`;
      return;
    }

    for (const bike of bikes) {
      const row = document.createElement('div');
      row.className = 'card';

      const actionHtml = actionType === 'rent'
        ? `<button class="action" data-id="${bike._id}" data-action="rent">Rent</button>`
        : `<button class="action" data-id="${bike._id}" data-action="return">Return</button>`;

      row.innerHTML = `
        <div>
          <strong>${bike.name}</strong><br/>
          <span class="status">₹${bike.pricePerHour}/hour</span>
        </div>
        <div>${actionHtml}</div>
      `;
      element.appendChild(row);
    }
  }
  
  if (bikeContainer) {
    bikeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;
      const bikeId = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if (action === 'rent') rentBike(bikeId);
      if (action === 'return') returnBike(bikeId);
    });
  }

  async function rentBike(bikeId) {
    setMessage('', '');
    const token = getToken();
    if (!token) { setMessage('error', 'Please login first.'); return; }

    try {
      const res = await fetch('/api/bikes/rent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ bikeId })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || `Rent failed (HTTP ${res.status})`);

      setMessage('success', 'Bike rented successfully!');
      await loadBikes();
    } catch (err) {
      setMessage('error', err.message || 'Rent failed');
    }
  }

  async function returnBike(bikeId) {
    setMessage('', '');
    const token = getToken();
    if (!token) { setMessage('error', 'Please login first.'); return; }

    try {
      const res = await fetch('/api/bikes/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ bikeId })
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Return failed');

      setMessage('success', 'Bike returned successfully!');
      await loadBikes();
    } catch (err) {
      setMessage('error', err.message || 'Return failed');
    }
  }

  // Initial load
  setStatus();
  loadBikes();
});