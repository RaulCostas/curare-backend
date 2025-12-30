import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Paciente } from '../../pacientes/entities/paciente.entity';
import { User } from '../../users/entities/user.entity';
import { RecetaDetalle } from './receta-detalle.entity';

@Entity('receta')
export class Receta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'paciente_id' })
    pacienteId: number;

    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'text' })
    medicamentos: string;

    @Column({ type: 'text' })
    indicaciones: string;

    @ManyToOne(() => Paciente)
    @JoinColumn({ name: 'paciente_id' })
    paciente: Paciente;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => RecetaDetalle, detalle => detalle.receta, {
        cascade: ['insert', 'update'],
        eager: false
    })
    detalles: RecetaDetalle[];
}
