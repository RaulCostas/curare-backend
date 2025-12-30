import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('gastos_fijos')
export class GastosFijos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    destino: string;

    @Column()
    dia: number;

    @Column({ default: false })
    anual: boolean;

    @Column({ nullable: true })
    mes: string;

    @Column()
    gasto_fijo: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column()
    moneda: string;

    @Column({ default: 'activo' })
    estado: string;
}
