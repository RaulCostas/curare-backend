
const fs = require('fs');
const path = 'd:/SOFT-MEDIC/Antigravity/CURARE/frontend/src/components/Layout.tsx';

try {
    const data = fs.readFileSync(path, 'utf8');
    const lines = data.split(/\r?\n/);

    console.log(`Total original lines: ${lines.length}`);

    // Indices (0-based) based on analysis:
    // Proveedores end: line 496 (index 495). Empty line 496 (index 495) ? No, line 496 is index 495.
    // Aranceles start: line 497 (index 496).
    // Aranceles end: line 510 (index 509).
    // Empty line after Aranceles: line 511 (index 510).
    // Personal start: line 512 (index 511).
    // Personal end: line 578 (index 577).
    // Empty line after Personal: line 579 (index 578).
    // Inventario start: line 580 (index 579).

    // Blocks:
    // 1. Header -> Proveedores (inclusive of empty line after it)
    //    Indices: 0 to 495 (Line 1 to 496)
    const part1 = lines.slice(0, 496);

    // 2. Aranceles (inclusive of empty line after it)
    //    Indices: 496 to 510 (Line 497 to 511)
    const aranceles = lines.slice(496, 511);

    // 3. Personal (block only)
    //    Indices: 511 to 578 (Line 512 to 578) -> Length: 578-511+1 = 68
    //    Slice end is exclusive, so slice(511, 579)
    const personal = lines.slice(511, 579);

    // 4. Inventario -> End (starts with empty line 579)
    //    Indices: 578 to end (Line 579 to end)
    const partRest = lines.slice(579);

    // Reorder:
    // Part1 (Proveedores) -> Personal -> (Add Empty) -> Aranceles -> PartRest (Start with empty)

    // Note: partRest starts with empty line (index 578/Line 579).
    // Aranceles ends with empty line (index 510/Line 511).
    // So 'Aranceles' + 'PartRest' will have 2 empty lines.
    // We can trim the first line of 'PartRest' if it is empty to match style.
    if (partRest.length > 0 && partRest[0].trim() === '') {
        partRest.shift(); // Remove double empty line
    }

    const newOrder = [
        ...part1,
        ...personal,
        '', // Add empty line between Personal and Aranceles
        ...aranceles,
        ...partRest
    ];

    console.log(`New line count: ${newOrder.length}`);

    fs.writeFileSync(path, newOrder.join('\n'));
    console.log('Successfully moved Personal below Proveedores');

} catch (err) {
    console.error(err);
}
