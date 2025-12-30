import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';
import { Proforma } from '../proformas/entities/proforma.entity';
import { Pago } from '../pagos/entities/pago.entity';

@Injectable()
export class PacientesDeudoresService {
    constructor(
        @InjectRepository(HistoriaClinica)
        private readonly historiaClinicaRepository: Repository<HistoriaClinica>,
        @InjectRepository(Proforma)
        private readonly proformaRepository: Repository<Proforma>,
        private dataSource: DataSource,
    ) { }

    async findAll(estado: 'terminado' | 'no terminado') {
        // Step 1: Get ALL Proforma IDs that have any history
        // We cannot filter by state in SQL because we need the LATEST history to determine the true state.
        const idsResult = await this.proformaRepository.manager.query(`
            SELECT DISTINCT p.id 
            FROM proformas p
            INNER JOIN historia_clinica hc ON hc."proformaId" = p.id
        `);

        if (idsResult.length === 0) return [];

        const proformaIds = idsResult.map(r => r.id);

        // Step 2: Fetch Proformas
        const proformas = await this.proformaRepository.query(
            `SELECT * FROM proformas WHERE id IN (${proformaIds.join(',')})`
        );

        // Step 3: Fetch Payments
        const pagos = await this.dataSource.query(
            `SELECT * FROM pagos WHERE "proformaId" IN (${proformaIds.join(',')})`
        );

        // Step 4: Fetch History
        const history = await this.dataSource.query(
            `SELECT * FROM historia_clinica WHERE "proformaId" IN (${proformaIds.join(',')})`
        );

        // Step 5: Fetch Patients
        const sampleProforma = proformas[0];
        const patientIdKey = Object.keys(sampleProforma).find(k => k.toLowerCase().includes('pacienteid') || k.toLowerCase().includes('paciente_id')) || 'pacienteId';

        const patientIds = [...new Set(proformas.map(p => p[patientIdKey]))].filter(id => id);

        let patients: any[] = [];
        if (patientIds.length > 0) {
            patients = await this.dataSource.query(
                `SELECT * FROM pacientes WHERE id IN (${patientIds.join(',')})`
            );
        }

        // Step 6: Fetch Specialties
        const espIds = [...new Set(history.map(h => h.especialidadId))].filter(id => id);
        let specialties: any[] = [];
        if (espIds.length > 0) {
            specialties = await this.dataSource.query(
                `SELECT * FROM especialidad WHERE id IN (${espIds.join(',')})`
            );
        }

        // Helper to find key case-insensitively
        const getVal = (obj: any, keySub: string) => {
            if (!obj) return null;
            const k = Object.keys(obj).find(key => key.toLowerCase().includes(keySub.toLowerCase()));
            return k ? obj[k] : null;
        }

        const espMap = new Map(specialties.map(e => [e.id, e.especialidad]));
        const patientMap = new Map(patients.map(p => [p.id, p]));
        const pagosMap = new Map();
        pagos.forEach(pg => {
            const current = pagosMap.get(pg.proformaId) || 0;
            pagosMap.set(pg.proformaId, current + parseFloat(pg.monto));
        });

        // Map and Filter
        const results = proformas.map(p => {
            const pid = p[patientIdKey];
            const pac = patientMap.get(pid);

            const pacName = pac ? getVal(pac, 'nombre') : '';
            const pacPaterno = pac ? getVal(pac, 'paterno') : '';
            const pacMaterno = pac ? getVal(pac, 'materno') : '';

            const totalPresupuesto = parseFloat(p.total);
            const paid = pagosMap.get(p.id) || 0;

            // Calculate Realized Cost (Cost of completed treatments)
            const pHistory = history.filter(h => h.proformaId === p.id);
            const realizedCost = pHistory
                .filter(h => h.estadoTratamiento === 'terminado')
                .reduce((sum, h) => sum + parseFloat(h.precio || 0), 0);
            // Saldo = Realized Cost - Paid
            // If Saldo > 0, they owe money for work done.
            const saldo = realizedCost - paid;

            // Sort History: Fecha DESC, CreatedAt DESC, ID DESC to find true latest
            const sortedHistory = pHistory.sort((a, b) => {
                const dateDiff = new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
                if (dateDiff !== 0) return dateDiff;

                const ca = getVal(a, 'createdAt');
                const cb = getVal(b, 'createdAt');
                if (ca && cb) {
                    const createdDiff = new Date(cb).getTime() - new Date(ca).getTime();
                    if (createdDiff !== 0) return createdDiff;
                }

                return b.id - a.id;
            });

            const latest = sortedHistory[0] || {};

            // Determine Status based on LATEST history entry
            const currentStatus = latest.estadoPresupuesto || 'no terminado';

            return {
                proformaId: p.id,
                numeroPresupuesto: p.numero,
                pacienteId: pid,
                totalPresupuesto: totalPresupuesto,
                totalPagado: paid,
                saldo: saldo,
                ultimaCita: latest.fecha,
                especialidad: latest.especialidadId ? (espMap.get(latest.especialidadId) || '') : '',
                tratamiento: latest.tratamiento,
                paciente: `${pacName} ${pacPaterno || ''} ${pacMaterno || ''}`.trim().replace(/\s+/g, ' '),
                status: currentStatus
            };
        });

        return results.filter(r => r.status === estado && r.saldo > 0);
    }

}
