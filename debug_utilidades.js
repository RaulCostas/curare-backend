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
        console.log("Connected to DB!");

        const year = 2025; // Or 2024, ask user or check current year? Defaults to current year in code.
        // Let's check 2024 and 2025

        console.log("\n--- PAGOS (Ingresos) ---");
        const pagos = await AppDataSource.query(`SELECT count(*) as count, extract(year from fecha) as yr FROM pagos GROUP BY yr`);
        console.log("Pagos by Year:", pagos);
        const pagosSample = await AppDataSource.query(`SELECT id, fecha, moneda, monto FROM pagos LIMIT 5`);
        console.log("Pagos Sample:", pagosSample);

        console.log("\n--- EGRESOS ---");
        const egresos = await AppDataSource.query(`SELECT count(*) as count, extract(year from fecha) as yr FROM egresos GROUP BY yr`);
        console.log("Egresos by Year:", egresos);

        console.log("\n--- PAGOS DOCTORES ---");
        const pd = await AppDataSource.query(`SELECT count(*) as count, extract(year from fecha) as yr FROM pagos_doctores GROUP BY yr`);
        console.log("Pagos Doctores by Year:", pd);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
