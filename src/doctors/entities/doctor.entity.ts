import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Especialidad } from '../../especialidad/entities/especialidad.entity';

@Entity()
export class Doctor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paterno: string;

    @Column()
    materno: string;

    @Column()
    nombre: string;

    @Column()
    celular: string;

    @Column()
    direccion: string;

    @Column({ default: 'activo' })
    estado: string;

    @Column({ nullable: true })
    idEspecialidad: number;

    @ManyToOne(() => Especialidad)
    @JoinColumn({ name: 'idEspecialidad' })
    especialidad: Especialidad;
}
