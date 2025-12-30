import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { Egreso } from './entities/egreso.entity';

@Injectable()
export class EgresosService {
    constructor(
        @InjectRepository(Egreso)
        private egresosRepository: Repository<Egreso>,
    ) { }

    async onModuleInit() {
        // Fix for existing records with null forma_pago_id
        await this.egresosRepository.query(`UPDATE egresos SET forma_pago_id = 1 WHERE forma_pago_id IS NULL`);
    }

    create(createEgresoDto: CreateEgresoDto) {
        const egreso = this.egresosRepository.create({
            ...createEgresoDto,
            formaPago: { id: createEgresoDto.formaPagoId }
        });
        return this.egresosRepository.save(egreso);
    }

    async findAll(page: number = 1, limit: number = 10, startDate?: string, endDate?: string, search?: string) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.egresosRepository.createQueryBuilder('egreso')
            .leftJoinAndSelect('egreso.formaPago', 'formaPago')
            .orderBy('egreso.fecha', 'DESC')
            .addOrderBy('egreso.detalle', 'ASC')
            .skip(skip)
            .take(limit);

        const whereCondition: any = {};
        if (search) {
            whereCondition.detalle = ILike(`%${search}%`);
            queryBuilder.andWhere('egreso.detalle ILIKE :search', { search: `%${search}%` });
        }
        if (startDate && endDate) {
            whereCondition.fecha = Between(startDate, endDate);
            queryBuilder.andWhere('egreso.fecha BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        const [data, total] = await queryBuilder.getManyAndCount();

        // Calculate totals
        // Use a separate query for totals that doesn't rely on complex grouping if it's failing
        // We use the same 'where' condition if possible, but finding by relations needs explicit where object

        let allEgresosForTotals;
        // Construct standard find options
        const findOptions: any = { relations: ['formaPago'], where: {} };

        if (search) {
            findOptions.where.detalle = ILike(`%${search}%`);
        }
        if (startDate && endDate) {
            findOptions.where.fecha = Between(startDate, endDate);
        }

        allEgresosForTotals = await this.egresosRepository.find(findOptions);

        // Initialize totals structure with requested keys
        const totals: Record<string, { bolivianos: number; dolares: number }> = {
            'Efectivo': { bolivianos: 0, dolares: 0 },
            'Transferencia': { bolivianos: 0, dolares: 0 },
            'QR': { bolivianos: 0, dolares: 0 },
            'Debito': { bolivianos: 0, dolares: 0 }
        };

        allEgresosForTotals.forEach(egreso => {
            const monto = Number(egreso.monto);
            const monedaKey = egreso.moneda === 'Bolivianos' ? 'bolivianos' : 'dolares';
            const formaPagoName = egreso.formaPago?.forma_pago || 'Sin Asignar';

            let key = formaPagoName;

            // Normalize keys to match initialized structure
            if (key.toUpperCase() === 'EFECTIVO') key = 'Efectivo';
            else if (key.toUpperCase() === 'QR') key = 'QR';
            else if (key.toUpperCase() === 'DEPOSITO' || key.toUpperCase() === 'DEPÓSITO' || key.toUpperCase() === 'TRANSFERENCIA') key = 'Transferencia';
            else if (key.toUpperCase() === 'DEBITO' || key.toUpperCase() === 'DÉBITO') key = 'Debito';

            if (!totals[key]) {
                totals[key] = { bolivianos: 0, dolares: 0 };
            }
            totals[key][monedaKey] += monto;
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totals
        };
    }

    findOne(id: number) {
        return this.egresosRepository.findOne({
            where: { id },
            relations: ['formaPago']
        });
    }

    update(id: number, updateEgresoDto: UpdateEgresoDto) {
        return this.egresosRepository.save({
            id,
            ...updateEgresoDto,
            formaPago: updateEgresoDto.formaPagoId ? { id: updateEgresoDto.formaPagoId } : undefined
        });
    }

    remove(id: number) {
        return this.egresosRepository.delete(id);
    }
}
