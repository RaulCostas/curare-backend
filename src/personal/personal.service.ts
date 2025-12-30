import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { Personal } from './entities/personal.entity';

@Injectable()
export class PersonalService {
    constructor(
        @InjectRepository(Personal)
        private personalRepository: Repository<Personal>,
    ) { }

    create(createPersonalDto: CreatePersonalDto) {
        const personal = this.personalRepository.create(createPersonalDto);
        return this.personalRepository.save(personal);
    }

    async findAll(search?: string, page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;
        const where = search
            ? { nombre: ILike(`%${search}%`) }
            : {};

        const [data, total] = await this.personalRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { nombre: 'ASC', paterno: 'ASC', materno: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getBirthdays() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1-12
        const currentDay = today.getDate(); // 1-31

        const allPersonal = await this.personalRepository.find({
            where: { estado: 'activo' }
        });

        const birthdays = allPersonal.filter(person => {
            // Parse the date string directly to avoid timezone issues
            const dateStr = person.fecha_nacimiento.toString();
            const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);

            // Compare month and day
            return month === currentMonth && day === currentDay;
        });

        return birthdays;
    }

    findOne(id: number) {
        return this.personalRepository.findOneBy({ id });
    }

    update(id: number, updatePersonalDto: UpdatePersonalDto) {
        return this.personalRepository.update(id, updatePersonalDto);
    }

    remove(id: number) {
        return this.personalRepository.delete(id);
    }
}
