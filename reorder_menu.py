
file_path = 'd:/SOFT-MEDIC/Antigravity/CURARE/frontend/src/components/Layout.tsx'

def reorder_lines():
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    print(f"Total original lines: {len(lines)}")

    # Define blocks by 0-indexed line ranges
    # ranges are [start_inclusive, end_exclusive]
    
    header = lines[0:109]
    inicio = lines[109:124]
    correos = lines[124:137]
    agenda = lines[137:154]
    usuarios = lines[154:171]
    doctores = lines[171:234]
    pacientes = lines[234:332]
    personal = lines[332:400]
    proveedores = lines[400:482]
    arancel = lines[482:497]
    egresos = lines[497:511]
    laboratorios = lines[511:623]
    gastos = lines[623:638]
    inventario = lines[638:654]
    hoja_diaria = lines[654:670]
    utilidades = lines[670:684]
    estadisticas = lines[684:787]
    configuracion = lines[787:918]
    footer = lines[918:]

    # Requested Order:
    # 1. Inicio
    # 2. Agenda
    # 3. Pacientes
    # 4. Doctores
    # 5. Laboratorios
    # 6. Proveedores
    # 7. Aranceles (Arancel)
    # 8. Personal
    # 9. Inventario
    # 10. Egresos Diarios
    # 11. Gastos Fijos
    # 12. Hoja Diaria
    # 13. Utilidades
    # 14. Estadisticas
    # 15. Correos
    # 16. Usuarios
    # 17. Configuración

    new_order = [
        *header,
        *inicio,
        *agenda,
        *pacientes,
        *doctores,
        *laboratorios,
        *proveedores,
        *arancel,
        *personal,
        *inventario,
        *egresos,
        *gastos,
        *hoja_diaria,
        *utilidades,
        *estadisticas,
        *correos,
        *usuarios,
        *configuracion,
        *footer
    ]

    print(f"Total new lines: {len(new_order)}")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_order)

if __name__ == '__main__':
    reorder_lines()
