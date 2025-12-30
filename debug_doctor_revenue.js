const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'curare',
});

async function debug() {
    try {
        await client.connect();

        // 1. Find Doctor Artieda
        const docRes = await client.query(`
            SELECT id, nombre, paterno, materno 
            FROM doctor 
            WHERE paterno ILIKE '%Artieda%' OR nombre ILIKE '%Artieda%'
        `);

        if (docRes.rows.length === 0) {
            console.log('Doctor Artieda not found');
            return;
        }

        const doctor = docRes.rows[0];
        console.log('Doctor found:', doctor);
        const doctorId = doctor.id;

        // 2. Get total for 'terminado' (Current Logic)
        // Assuming current year/month or just total for now to see matches
        // The user didn't specify date range in the prompt, but standard is likely all or current.
        // Let's look at ALL records for this doctor to spot the 5110 vs 4885 pattern.

        const totalTerminadoRes = await client.query(`
            SELECT SUM(precio) as total 
            FROM historia_clinica 
            WHERE "doctorId" = $1 AND "estadoTratamiento" = 'terminado'
        `, [doctorId]);

        console.log('Total (estadoTratamiento = terminado):', totalTerminadoRes.rows[0].total);

        // 3. Look for "CONSULTA CLINICA" records
        const consultasRes = await client.query(`
            SELECT id, fecha, tratamiento, precio, "estadoTratamiento", "estadoPresupuesto"
            FROM historia_clinica 
            WHERE "doctorId" = $1 AND tratamiento ILIKE '%CONSULTA%'
        `, [doctorId]);

        console.log('\n--- Consulta Records ---');
        consultasRes.rows.forEach(r => {
            console.log(JSON.stringify(r));
        });

        // 4. Check if there are other statuses contributing
        const byStatusRes = await client.query(`
            SELECT "estadoTratamiento", SUM(precio) as total, COUNT(*) as count
            FROM historia_clinica 
            WHERE "doctorId" = $1
            GROUP BY "estadoTratamiento"
        `, [doctorId]);

        console.log('\n--- Total by Status ---');
        console.table(byStatusRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

debug();
