import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialUtilizadoService } from './material_utilizado.service';
import { MaterialUtilizadoController } from './material_utilizado.controller';
import { MaterialUtilizado } from './entities/material_utilizado.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MaterialUtilizado])],
    controllers: [MaterialUtilizadoController],
    providers: [MaterialUtilizadoService],
    exports: [MaterialUtilizadoService]
})
export class MaterialUtilizadoModule { }
