import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FormaPago } from '../../forma_pago/entities/forma_pago.entity';

@Entity('egresos')
export class Egreso {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: Date;

    @Column()
    destino: string; // 'Consultorio' | 'Casa'

    @Column()
    detalle: string;

    @Column('decimal', { precision: 12, scale: 2 })
    monto: number;

    @Column()
    moneda: string; // 'Bolivianos' | 'Dólares'

    @ManyToOne(() => FormaPago, { eager: true })
    @JoinColumn({ name: 'forma_pago_id' })
    formaPago: FormaPago;
}
