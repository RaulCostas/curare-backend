import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialUtilizado } from './entities/material_utilizado.entity';
import { CreateMaterialUtilizadoDto } from './dto/create-material-utilizado.dto';
import { UpdateMaterialUtilizadoDto } from './dto/update-material-utilizado.dto';

@Injectable()
export class MaterialUtilizadoService {
    constructor(
        @InjectRepository(MaterialUtilizado)
        private readonly materialUtilizadoRepository: Repository<MaterialUtilizado>,
    ) { }

    async create(createDto: CreateMaterialUtilizadoDto): Promise<MaterialUtilizado> {
        // Check if material already exists for this historia clinica
        const existing = await this.materialUtilizadoRepository.findOne({
            where: { historiaClinicaId: createDto.historiaClinicaId }
        });

        if (existing) {
            throw new ConflictException('Ya existe un registro de Material Utilizado para esta Historia Clínica');
        }

        const material = this.materialUtilizadoRepository.create(createDto);
        return await this.materialUtilizadoRepository.save(material);
    }

    async findAll(page: number = 1, limit: number = 10): Promise<{ data: MaterialUtilizado[], total: number }> {
        const [data, total] = await this.materialUtilizadoRepository.findAndCount({
            relations: ['historiaClinica', 'inventario', 'user'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' }
        });

        return { data, total };
    }

    async findOne(id: number): Promise<MaterialUtilizado> {
        const material = await this.materialUtilizadoRepository.findOne({
            where: { id },
            relations: ['historiaClinica', 'inventario', 'user']
        });

        if (!material) {
            throw new NotFoundException(`Material Utilizado con ID ${id} no encontrado`);
        }

        return material;
    }

    async findByHistoriaClinica(historiaClinicaId: number): Promise<MaterialUtilizado | null> {
        return await this.materialUtilizadoRepository.findOne({
            where: { historiaClinicaId },
            relations: ['historiaClinica', 'inventario', 'user']
        });
    }

    async update(id: number, updateDto: UpdateMaterialUtilizadoDto): Promise<MaterialUtilizado> {
        const material = await this.findOne(id);

        // If updating historiaClinicaId, check for conflicts
        if (updateDto.historiaClinicaId && updateDto.historiaClinicaId !== material.historiaClinicaId) {
            const existing = await this.materialUtilizadoRepository.findOne({
                where: { historiaClinicaId: updateDto.historiaClinicaId }
            });

            if (existing) {
                throw new ConflictException('Ya existe un registro de Material Utilizado para esta Historia Clínica');
            }
        }

        Object.assign(material, updateDto);
        return await this.materialUtilizadoRepository.save(material);
    }

    async remove(id: number): Promise<void> {
        const material = await this.findOne(id);
        await this.materialUtilizadoRepository.remove(material);
    }
}
