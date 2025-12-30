
const fs = require('fs');
const path = 'd:/SOFT-MEDIC/Antigravity/CURARE/frontend/src/components/Layout.tsx';

try {
    const data = fs.readFileSync(path, 'utf8');
    // split by carriage return+newline or just newline to handle CRLF/LF
    const lines = data.split(/\r?\n/);

    console.log(`Total original lines: ${lines.length}`);

    // Ranges derived from original file analysis (0-indexed)
    // [start, end)
    const header = lines.slice(0, 109);
    const inicio = lines.slice(109, 124);
    const correos = lines.slice(124, 137);
    const agenda = lines.slice(137, 154);
    const usuarios = lines.slice(154, 171);
    const doctores = lines.slice(171, 234);
    const pacientes = lines.slice(234, 332);
    const personal = lines.slice(332, 400);
    const proveedores = lines.slice(400, 482);
    const arancel = lines.slice(482, 497);
    const egresos = lines.slice(497, 511);
    const laboratorios = lines.slice(511, 623);
    const gastos = lines.slice(623, 638);
    const inventario = lines.slice(638, 654);
    const hoja_diaria = lines.slice(654, 670);
    const utilidades = lines.slice(670, 684);
    const estadisticas = lines.slice(684, 787);
    const configuracion = lines.slice(787, 918);
    const footer = lines.slice(918);

    // New Order
    const newOrder = [
        ...header,
        ...inicio,
        ...agenda,
        ...pacientes,
        ...doctores,
        ...laboratorios,
        ...proveedores,
        ...arancel,
        ...personal,
        ...inventario,
        ...egresos,
        ...gastos,
        ...hoja_diaria,
        ...utilidades,
        ...estadisticas,
        ...correos,
        ...usuarios,
        ...configuracion,
        ...footer
    ];

    console.log(`Total new lines: ${newOrder.length}`);

    // Verify length hasn't changed (sanity check)
    if (lines.length !== newOrder.length) {
        console.warn(`Warning: Line count mismatch! Original: ${lines.length}, New: ${newOrder.length}`);
    }

    fs.writeFileSync(path, newOrder.join('\n'));
    console.log('Successfully reordered Layout.tsx');

} catch (err) {
    console.error(err);
}
