import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { HistoriaClinica } from '../../historia_clinica/entities/historia_clinica.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { User } from '../../users/entities/user.entity';

@Entity('material_utilizado')
export class MaterialUtilizado {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    historiaClinicaId: number;

    @ManyToOne(() => HistoriaClinica)
    @JoinColumn({ name: 'historiaClinicaId' })
    historiaClinica: HistoriaClinica;

    @Column()
    inventarioId: number;

    @ManyToOne(() => Inventario)
    @JoinColumn({ name: 'inventarioId' })
    inventario: Inventario;

    @Column({ type: 'date' })
    fecha: Date;

    @Column()
    cantidad: string; // Allows fractional values like "1/4", "1/2", "1", "2", etc.

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
