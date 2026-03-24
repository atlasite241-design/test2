async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'testuser', 
        password: 'testpassword', 
        role: 'Technicien',
        securityQuestion: 'test?',
        securityAnswer: 'test!'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
