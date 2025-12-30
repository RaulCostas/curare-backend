import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agenda } from './entities/agenda.entity';
import { CreateAgendaDto } from './dto/create-agenda.dto';
import { UpdateAgendaDto } from './dto/update-agenda.dto';

@Injectable()
export class AgendaService {
    constructor(
        @InjectRepository(Agenda)
        private readonly agendaRepository: Repository<Agenda>,
    ) { }

    async create(createDto: CreateAgendaDto): Promise<Agenda> {
        try {
            const cita = this.agendaRepository.create(createDto);
            return await this.agendaRepository.save(cita);
        } catch (error) {
            console.error('Error creating agenda:', error);
            const detail = `DB Error: ${error.message} | Code: ${error.code} | Detail: ${error.detail || 'None'}`;
            throw new BadRequestException(detail);
        }
    }

    async findAll(date?: string): Promise<Agenda[]> {
        const query = this.agendaRepository.createQueryBuilder('agenda')
            .leftJoinAndSelect('agenda.paciente', 'paciente')
            .leftJoinAndSelect('paciente.categoria', 'categoria')
            .leftJoinAndSelect('agenda.doctor', 'doctor')
            .leftJoinAndSelect('agenda.proforma', 'proforma')
            .leftJoinAndSelect('agenda.usuario', 'usuario')
            .where("agenda.estado != 'eliminado'"); // Filter out deleted

        if (date) {
            query.andWhere('agenda.fecha = :date', { date });
        }

        query.orderBy('agenda.hora', 'ASC');

        return await query.getMany();
    }

    async findAllByPaciente(pacienteId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { pacienteId }, // Return all history for this patient
            relations: ['paciente', 'doctor', 'proforma', 'usuario'],
            order: { fecha: 'DESC', hora: 'ASC' }
        });
    }

    async findOne(id: number): Promise<Agenda> {
        const cita = await this.agendaRepository.findOne({
            where: { id },
            relations: ['paciente', 'doctor', 'proforma', 'usuario']
        });
        if (!cita) {
            throw new NotFoundException(`Cita #${id} not found`);
        }
        return cita;
    }

    async update(id: number, updateDto: UpdateAgendaDto): Promise<Agenda> {
        const cita = await this.findOne(id);
        this.agendaRepository.merge(cita, updateDto);
        return await this.agendaRepository.save(cita);
    }

    async remove(id: number, userId: number): Promise<void> {
        console.log(`Soft deleting agenda #${id} by user ${userId}`);
        // Use update() to explicitly set the columns, avoiding potential relation conflicts
        await this.agendaRepository.update(id, {
            estado: 'eliminado',
            usuarioId: userId
        });
        console.log(`Updated agenda #${id} via direct update query`);
    }

    async findAllByDoctor(doctorId: number): Promise<Agenda[]> {
        return await this.agendaRepository.find({
            where: { doctorId, estado: 'agendado' } as any, // Using 'as any' to bypass potential type strictness if doctorId field name varies, but typically it matches entity column
            relations: ['paciente', 'doctor', 'proforma', 'usuario'],
            order: { fecha: 'ASC', hora: 'ASC' }
        });
    }
}
