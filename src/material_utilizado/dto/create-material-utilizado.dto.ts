import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMaterialUtilizadoDto {
    @IsNotEmpty()
    @IsNumber()
    historiaClinicaId: number;

    @IsNotEmpty()
    @IsNumber()
    inventarioId: number;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsNotEmpty()
    @IsString()
    cantidad: string;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsNotEmpty()
    @IsNumber()
    userId: number;
}
