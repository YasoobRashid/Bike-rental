const msg = document.getElementById('msg');
const btn = document.getElementById('loginBtn');

btn.addEventListener('click', async () => {
  msg.innerHTML = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    msg.innerHTML = '<div class="error">Please fill all fields.</div>';
    return;
  }

  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.user?.username || '');
    localStorage.setItem('role', data.user?.role || 'renter'); 

    if (data.user.role === 'owner') {
      window.location.href = 'owner.html';
    } else {
      window.location.href = 'bikes.html';
    }
    
  } catch (err) {
    msg.innerHTML = `<div class="error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
});