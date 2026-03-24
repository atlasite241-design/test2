async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'testpassword' })
    });
    console.log('Status:', res.status);
    const data = await res.status === 200 ? await res.json() : await res.text();
    console.log('Data:', data);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
