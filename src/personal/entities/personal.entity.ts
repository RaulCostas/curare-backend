import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('personal')
export class Personal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paterno: string;

    @Column()
    materno: string;

    @Column()
    nombre: string;

    @Column()
    ci: string;

    @Column()
    direccion: string;

    @Column()
    telefono: string;

    @Column()
    celular: string;

    @Column({ type: 'date' })
    fecha_nacimiento: Date;

    @Column({ type: 'date' })
    fecha_ingreso: Date;

    @Column({ default: 'activo' })
    estado: string;

    @Column({ type: 'date', nullable: true })
    fecha_baja: Date;
}
