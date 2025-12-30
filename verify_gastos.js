async function checkBackend() {
    try {
        console.log('Fetching from http://localhost:3000/gastos-fijos...');
        const response = await fetch('http://localhost:3000/gastos-fijos');
        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Data Type:', typeof data);
            console.log('Is Array:', Array.isArray(data));
            console.log('Data:', JSON.stringify(data, null, 2));
        } else {
            console.log('Response not OK');
        }
    } catch (error) {
        console.error('Error fetching data:', error.message);
    }
}

checkBackend();
