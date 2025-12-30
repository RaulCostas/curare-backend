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

        const year = 2025;

        console.log("\n--- PAGOS GASTOS FIJOS ---");
        // Raw query to check table content
        const rows = await AppDataSource.query(`
            SELECT id, fecha, monto, moneda 
            FROM pagos_gastos_fijos 
        `);
        console.log(`Total rows: ${rows.length}`);

        const problemRows = rows.filter(r => !r.fecha || r.fecha === '');
        console.log(`Rows with empty/null fecha: ${problemRows.length}`);
        if (problemRows.length > 0) console.log(problemRows);


    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
