-- Reset all cubetas to DENTRO status
UPDATE cubetas SET dentro_fuera = 'DENTRO';

-- Reset all trabajos_laboratorios idCubeta to NULL
UPDATE trabajos_laboratorios SET "idCubeta" = NULL;

-- Verify the updates
SELECT id, codigo, descripcion, dentro_fuera FROM cubetas ORDER BY id;
SELECT id, "idLaboratorio", "idPaciente", "idCubeta", estado FROM trabajos_laboratorios ORDER BY id DESC LIMIT 10;
