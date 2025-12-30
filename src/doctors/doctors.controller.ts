import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Controller('doctors')
export class DoctorsController {
    constructor(private readonly doctorsService: DoctorsService) { }

    @Post()
    create(@Body() createDoctorDto: CreateDoctorDto) {
        return this.doctorsService.create(createDoctorDto);
    }

    @Get('statistics')
    getStatistics(
        @Query('year') year: string,
        @Query('month') month: string,
        @Query('status') status: string,
    ) {
        return this.doctorsService.getStatistics(
            year ? +year : new Date().getFullYear(),
            month ? +month : new Date().getMonth() + 1,
            status
        );
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.doctorsService.findAll(
            search,
            page ? +page : 1,
            limit ? +limit : 5
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.doctorsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDoctorDto: UpdateDoctorDto) {
        return this.doctorsService.update(+id, updateDoctorDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.doctorsService.remove(+id);
    }
}
