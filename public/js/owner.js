document.addEventListener('DOMContentLoaded', () => {
  const msg = document.getElementById('msg');
  const addBikeBtn = document.getElementById('addBikeBtn');
  const ownerBikeList = document.getElementById('ownerBikeList');
  const logoutBtn = document.getElementById('logoutBtn');

  const getToken = () => localStorage.getItem('token');

  const setMessage = (kind, text) => {
    if (!text) {
      msg.innerHTML = '';
      return;
    }
    const cls = kind === 'error' ? 'error' : 'success';
    msg.innerHTML = `<div class="${cls}">${text}</div>`;
  };

  const fetchOwnerBikes = async () => {
    ownerBikeList.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/bikes', {
        headers: { Authorization: 'Bearer ' + getToken() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch bikes');
      renderOwnerBikes(data.bikes);
    } catch (err) {
      setMessage('error', err.message);
    }
  };

  const renderOwnerBikes = (bikes) => {
    ownerBikeList.innerHTML = '';
    if (!bikes || !bikes.length) {
      ownerBikeList.innerHTML = '<div class="notice">You have not added any bikes yet.</div>';
      return;
    }
    bikes.forEach(bike => {
      const bikeCard = document.createElement('div');
      bikeCard.className = 'card';
      const canDelete = bike.available;
      bikeCard.innerHTML = `
        <div>
          <strong>${bike.name}</strong><br/>
          <span class="status">₹${bike.pricePerHour}/hour | ${bike.available ? 'Available' : 'Rented'}</span>
        </div>
        <button class="deleteBtn" data-id="${bike._id}" ${!canDelete ? 'disabled' : ''}>Delete</button>
      `;
      ownerBikeList.appendChild(bikeCard);
    });
  };

  addBikeBtn.addEventListener('click', async () => {
    const name = document.getElementById('bikeName').value.trim();
    const pricePerHour = document.getElementById('pricePerHour').value;

    if (!name || !pricePerHour) {
      setMessage('error', 'Please provide both a name and a price.');
      return;
    }

    try {
      const res = await fetch('/api/bikes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken(),
        },
        body: JSON.stringify({ name, pricePerHour }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add bike');
      setMessage('success', 'Bike added successfully!');
      document.getElementById('bikeName').value = '';
      document.getElementById('pricePerHour').value = '';
      fetchOwnerBikes(); 
    } catch (err) {
      setMessage('error', err.message);
    }
  });

  ownerBikeList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('deleteBtn')) {
      const bikeId = e.target.dataset.id;
      if (!confirm('Are you sure you want to delete this bike?')) return;

      try {
        const res = await fetch(`/api/bikes/${bikeId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete bike');
        setMessage('success', 'Bike deleted successfully!');
        fetchOwnerBikes(); 
      } catch (err) {
        setMessage('error', err.message);
      }
    }
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    window.location.href = 'login.html';
  });

  fetchOwnerBikes();
});