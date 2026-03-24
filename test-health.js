async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/health');
    console.log('Status:', res.status);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
