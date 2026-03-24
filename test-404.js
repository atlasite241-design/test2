async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/non-existent');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body starts with:', text.substring(0, 50));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
