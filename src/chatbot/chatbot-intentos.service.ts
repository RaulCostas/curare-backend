import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotIntento } from './entities/chatbot-intento.entity';

@Injectable()
export class ChatbotIntentosService implements OnModuleInit {
    constructor(
        @InjectRepository(ChatbotIntento)
        private readonly intentoRepository: Repository<ChatbotIntento>,
    ) { }

    async onModuleInit() {
        await this.seedDefaults();
    }

    async seedDefaults() {
        // 1. Cleanup Duplicates
        await this.removeDuplicates();

        // 2. Seed Defaults
        console.log('Checking default chatbot intents...');
        const defaults = [
            {
                keywords: 'saldo, deuda, cuenta, cuanto debo, estado de cuenta',
                action: 'CONSULTAR_SALDO',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'cita, cuando, turno, hora, agendar',
                action: 'CONSULTAR_CITA',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'presupuesto, proforma, cotizacion, plan, precio',
                action: 'CONSULTAR_PRESUPUESTO',
                active: true,
                target: 'PACIENTE'
            },
            {
                keywords: 'hola, buenos dias, buenas tardes, buenas noches, info',
                action: 'TEXTO_LIBRE',
                active: true,
                target: 'PACIENTE',
                replyTemplate: '¡Hola! Soy el asistente virtual de Curare Centro Dental. Puedo ayudarte con: \n- Consultar tu saldo\n- Ver tus próximas citas\n- Solicitar tu presupuesto\n\n¿Qué necesitas hoy?'
            },
            {
                keywords: 'citas, pacientes agendados, mi agenda',
                action: 'CONSULTAR_CITA',
                active: true,
                target: 'USUARIO'
            }
        ];

        for (const d of defaults) {
            // Check by Action AND Target to identify the "Logical Intent"
            // We use 'target' explicitly now in defaults array to match DB
            const exists = await this.intentoRepository.findOne({
                where: {
                    action: d.action as any,
                    target: d.target as any
                }
            });

            if (!exists) {
                console.log(`Seeding missing intent: ${d.action} (${d.target})`);
                await this.intentoRepository.save(this.intentoRepository.create(d as any));
            }
        }
    }

    async removeDuplicates() {
        console.log('Running duplicate cleanup...');
        const allIntents = await this.intentoRepository.find({ order: { id: 'ASC' } });
        const uniqueMap = new Map<string, number>();
        const duplicates: number[] = [];

        for (const intent of allIntents) {
            // Create a unique key based on Action + Target + Keywords
            const key = `${intent.action}-${intent.target}-${intent.keywords}`;
            if (uniqueMap.has(key)) {
                duplicates.push(intent.id);
            } else {
                uniqueMap.set(key, intent.id);
            }
        }

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} duplicate intents. Removing...`);
            await this.intentoRepository.delete(duplicates);
            console.log('Duplicates removed.');
        } else {
            console.log('No duplicates found.');
        }
    }

    async create(createDto: Partial<ChatbotIntento>) {
        const intento = this.intentoRepository.create(createDto);
        return await this.intentoRepository.save(intento);
    }

    async findAll() {
        return await this.intentoRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findAllActive() {
        return await this.intentoRepository.find({
            where: { active: true }
        });
    }

    async update(id: number, updateDto: Partial<ChatbotIntento>) {
        await this.intentoRepository.update(id, updateDto);
        return this.intentoRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        return await this.intentoRepository.delete(id);
    }
}
