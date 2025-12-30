const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'curare',
});

async function migrate() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Check if old table 'provider' exists
        const resOld = await client.query(`SELECT to_regclass('public.provider') as exists;`);
        const oldExists = resOld.rows[0].exists;

        // Check if new table 'proveedores' exists
        const resNew = await client.query(`SELECT to_regclass('public.proveedores') as exists;`);
        const newExists = resNew.rows[0].exists;

        console.log(`Old table 'provider' exists: ${!!oldExists}`);
        console.log(`New table 'proveedores' exists: ${!!newExists}`);

        if (oldExists) {
            if (newExists) {
                // Check if new table is empty
                const countRes = await client.query('SELECT COUNT(*) FROM proveedores');
                const count = parseInt(countRes.rows[0].count);

                if (count === 0) {
                    console.log("New table 'proveedores' is empty. Dropping it...");
                    await client.query('DROP TABLE proveedores CASCADE'); // Cascade to remove constraints created partially
                } else {
                    console.log("New table 'proveedores' has data. Cannot safely migrate automatically.");
                    console.log("Manual intervention required or data merge.");
                    return;
                }
            }

            console.log("Renaming 'provider' to 'proveedores'...");
            await client.query('ALTER TABLE provider RENAME TO proveedores');
            console.log("Migration successful!");
        } else {
            console.log("Old table 'provider' does not exist. Nothing to migrate.");
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
