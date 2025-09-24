const msg = document.getElementById('msg');
const btn = document.getElementById('signupBtn');

btn.addEventListener('click', async () => {
  msg.innerHTML = '';
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value; 

  if (!username || !email || !password) {
    msg.innerHTML = '<div class="error">Please fill all fields.</div>';
    return;
  }

  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    msg.innerHTML = '<div class="success">Signup successful. You can login now.</div>';
    window.location.href = 'login.html';
  } catch (err) {
    msg.innerHTML = `<div class="error">${err.message}</div>`;
  } finally {
    btn.disabled = false;
  }
});