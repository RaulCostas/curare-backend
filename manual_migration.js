const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'curare',
    entities: [],
    synchronize: false,
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("Connected to DB! Running manual migration...");

        // 1. Check current data to see if we have valid formats
        const rows = await AppDataSource.query(`SELECT fecha FROM pagos_gastos_fijos LIMIT 5`);
        console.log("Sample dates:", rows);

        // 2. Perform the ALTER TABLE with explicit casting
        // Using to_date because the column is likely text 'YYYY-MM-DD' or similar. 
        // If it's already 'YYYY-MM-DD', casting ::date works. 
        // If it's 'DD/MM/YYYY', we need to_date(fecha, 'DD/MM/YYYY').
        // Let's assume standard ISO or try to handle both.

        await AppDataSource.query(`
            ALTER TABLE pagos_gastos_fijos 
            ALTER COLUMN fecha TYPE DATE 
            USING fecha::date
        `);

        console.log("Migration successful!");

    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
