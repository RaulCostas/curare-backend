import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Doctor } from './entities/doctor.entity';
import { HistoriaClinica } from '../historia_clinica/entities/historia_clinica.entity';

@Injectable()
export class DoctorsService {
    constructor(
        @InjectRepository(Doctor)
        private doctorsRepository: Repository<Doctor>,
        @InjectRepository(HistoriaClinica)
        private historiaClinicaRepository: Repository<HistoriaClinica>,
    ) { }

    async create(createDoctorDto: CreateDoctorDto): Promise<Doctor> {
        const doctor = this.doctorsRepository.create(createDoctorDto);
        return this.doctorsRepository.save(doctor);
    }

    async getStatistics(year: number, month: number, status: string): Promise<any[]> {
        const query = this.doctorsRepository.createQueryBuilder('doctor')
            .leftJoin(
                'historia_clinica',
                'hc',
                'hc.doctorId = doctor.id AND hc.estadoTratamiento = :estadoTrat',
                { estadoTrat: 'terminado' }
            )
            .select([
                'doctor.id AS "id"',
                'doctor.nombre AS "nombre"',
                'doctor.paterno AS "paterno"',
                'doctor.materno AS "materno"',
                'COALESCE(SUM(hc.precio), 0) AS "totalGenerado"'
            ])
            .groupBy('doctor.id')
            .addGroupBy('doctor.nombre')
            .addGroupBy('doctor.paterno')
            .addGroupBy('doctor.materno')
            .orderBy('"totalGenerado"', 'DESC');

        // Apply Month/Year filter to the JOIN condition or WHERE
        // Since we want ALL doctors even if 0, we put filter in ON clause of Left Join, 
        // BUT TypeORM query builder leftJoin syntax with complex conditions including parameters is tricky.
        // Easier: Use a subquery or join with specific conditions in the ON clause.
        // Let's refine the leftJoin above. The condition is strict on the join.
        // We need to filter by date.
        // Postgres: EXTRACT(YEAR FROM hc.fecha) = :year

        let dateCondition = 'hc.estadoTratamiento = :estadoTrat';
        const params: any = { estadoTrat: 'terminado' };

        if (year) {
            dateCondition += ' AND EXTRACT(YEAR FROM hc.fecha) = :year';
            params.year = year;
        }
        if (month) {
            dateCondition += ' AND EXTRACT(MONTH FROM hc.fecha) = :month';
            params.month = month;
        }

        // Re-construct query with dynamic date condition in join
        const qb = this.doctorsRepository.createQueryBuilder('doctor')
            .leftJoin(
                'historia_clinica',
                'hc',
                `hc.doctorId = doctor.id AND ${dateCondition}`,
                params
            )
            .select([
                'doctor.id AS "id"',
                'doctor.nombre AS "nombre"',
                'doctor.paterno AS "paterno"',
                'doctor.materno AS "materno"',
                'COALESCE(SUM(hc.precio), 0) AS "totalGenerado"'
            ])
            .groupBy('doctor.id')
            .addGroupBy('doctor.nombre')
            .addGroupBy('doctor.paterno')
            .addGroupBy('doctor.materno')
            .orderBy('"totalGenerado"', 'DESC');

        if (status && status !== 'ambos') {
            qb.where('doctor.estado = :status', { status: status.toLowerCase() });
        }

        const rawResults = await qb.getRawMany();

        // Format results
        return rawResults.map(r => ({
            id: r.id,
            nombreCompleto: `${r.nombre} ${r.paterno} ${r.materno || ''}`.trim(),
            totalGenerado: parseFloat(r.totalGenerado)
        }));
    }

    async findAll(search?: string, page: number = 1, limit: number = 5): Promise<{
        data: Doctor[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const skip = (page - 1) * limit;

        const queryBuilder = this.doctorsRepository.createQueryBuilder('doctor');

        if (search) {
            queryBuilder.where(
                'doctor.nombre ILIKE :search OR doctor.paterno ILIKE :search OR doctor.materno ILIKE :search',
                { search: `%${search}%` }
            );
        }

        const [data, total] = await queryBuilder
            .leftJoinAndSelect('doctor.especialidad', 'especialidad')
            .orderBy('doctor.nombre', 'ASC')
            .addOrderBy('doctor.paterno', 'ASC')
            .addOrderBy('doctor.materno', 'ASC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<Doctor> {
        const doctor = await this.doctorsRepository.findOne({
            where: { id },
            relations: ['especialidad'],
        });
        if (!doctor) {
            throw new NotFoundException(`Doctor with ID ${id} not found`);
        }
        return doctor;
    }

    async findByCelular(celular: string): Promise<Doctor | null> {
        return this.doctorsRepository.findOne({
            where: { celular },
            relations: ['especialidad']
        });
    }

    async update(id: number, updateDoctorDto: UpdateDoctorDto): Promise<Doctor> {
        const doctor = await this.findOne(id);
        Object.assign(doctor, updateDoctorDto);
        return this.doctorsRepository.save(doctor);
    }

    async remove(id: number): Promise<void> {
        const doctor = await this.findOne(id);
        await this.doctorsRepository.remove(doctor);
    }
}
