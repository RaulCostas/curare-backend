-- Eliminar la tabla si existe (para asegurar una creación limpia)
DROP TABLE IF EXISTS "pagos";

-- Crear la tabla pagos
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "pacienteId" integer NOT NULL,
    "fecha" date NOT NULL,
    "proformaId" integer,
    "monto" numeric(10, 2) NOT NULL,
    "tc" numeric(10, 2) NOT NULL DEFAULT '0',
    "recibo" character varying,
    "factura" character varying,
    "formaPago" character varying NOT NULL,
    "comisionTarjetaId" integer,
    "observaciones" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_pagos_id" PRIMARY KEY ("id")
);

-- Agregar las claves foráneas (Foreign Keys)
ALTER TABLE "pagos" 
    ADD CONSTRAINT "FK_pagos_paciente" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pagos" 
    ADD CONSTRAINT "FK_pagos_proforma" FOREIGN KEY ("proformaId") REFERENCES "proforma"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pagos" 
    ADD CONSTRAINT "FK_pagos_comision_tarjeta" FOREIGN KEY ("comisionTarjetaId") REFERENCES "comision_tarjeta"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
