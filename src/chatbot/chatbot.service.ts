import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import { PacientesService } from '../pacientes/pacientes.service';
import { DoctorsService } from '../doctors/doctors.service';
import { AgendaService } from '../agenda/agenda.service';
import { PagosService } from '../pagos/pagos.service';
import { ProformasService } from '../proformas/proformas.service';
import { HistoriaClinicaService } from '../historia_clinica/historia_clinica.service';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntento } from './entities/chatbot-intento.entity';
import { ChatbotPdfService } from './chatbot-pdf.service';
import pino from 'pino';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ChatbotService implements OnModuleInit, OnModuleDestroy {
    private sock: any;
    private qrCode: string | null = null;
    private status: 'disconnected' | 'connecting' | 'connected' | 'qr' = 'disconnected';
    private authState: any;
    private saveCreds: any;

    private intentionalDisconnect = false; // Flag to prevent auto-reconnect

    constructor(
        private readonly pacientesService: PacientesService,
        private readonly agendaService: AgendaService,
        private readonly pagosService: PagosService,
        @Inject(forwardRef(() => ProformasService))
        private readonly proformasService: ProformasService,
        private readonly historiaClinicaService: HistoriaClinicaService,
        private readonly intentosService: ChatbotIntentosService,
        private readonly pdfService: ChatbotPdfService,
        private readonly doctorsService: DoctorsService,
    ) { }

    async onModuleInit() {
        // Initialize connection on startup if session exists
        // or wait for manual trigger via API
        this.initialize();
    }

    async onModuleDestroy() {
        if (this.sock) {
            this.sock.end(undefined);
        }
    }

    async initialize() {
        if (this.status === 'connected' || this.status === 'connecting') return;

        this.intentionalDisconnect = false; // Reset flag
        this.status = 'connecting';

        const { state, saveCreds } = await useMultiFileAuthState('wa_auth_info');
        this.authState = state;
        this.saveCreds = saveCreds;

        console.log('Initializing Chatbot Service...');

        this.sock = makeWASocket({
            logger: pino({ level: 'debug' }) as any,
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            generateHighQualityLinkPreview: true,
            browser: ['Curare Chatbot', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            retryRequestDelayMs: 250,
        });

        console.log('Socket created. Setting up event listeners...');

        this.sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;
            console.log('Connection Update:', { connection, qr: qr ? 'QR RECEIVED' : 'NO QR' });

            if (qr) {
                this.status = 'qr';
                this.qrCode = await QRCode.toDataURL(qr);
                console.log('QR Code generated and converted to DataURL');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed. Reconnecting:', shouldReconnect);
                this.status = 'disconnected';
                this.qrCode = null;

                // Only reconnect if it wasn't an intentional disconnect
                if (shouldReconnect && !this.intentionalDisconnect) {
                    this.initialize();
                } else {
                    console.log('Logged out or Intentional Disconnect.');
                }
            } else if (connection === 'open') {
                console.log('Opened connection');
                this.status = 'connected';
                this.qrCode = null;
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type !== 'notify') return;

            for (const msg of m.messages) {
                if (!msg.key.fromMe && m.type === 'notify') {
                    console.log('New message received:', msg);
                    await this.handleMessage(msg);
                }
            }
        });
    }

    async handleMessage(msg: any) {
        let remoteJid = msg.key.remoteJid;

        if (msg.key.remoteJidAlt) {
            remoteJid = msg.key.remoteJidAlt;
        }

        if (!remoteJid) return;

        // Ignore groups
        if (remoteJid.endsWith('@g.us')) {
            console.log('[Chatbot] Ignoring group message');
            return;
        }

        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const normalizedText = text.toLowerCase();

        console.log(`[Chatbot] New message from ${remoteJid}: ${text}`);

        // 1. Load Intents & Match
        const intents = await this.intentosService.findAllActive();
        let matchedIntent: ChatbotIntento | null = null;

        for (const intent of intents) {
            const keywords = intent.keywords.toLowerCase().split(',').map(k => k.trim());
            // Use regex for word boundary matching to avoid partial matches (e.g. "cita" matching "citas")
            const matchedKeyword = keywords.find(k => {
                // Escape special regex characters if any (though unlikely in simple keywords)
                const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${safeK}\\b`, 'i');
                return regex.test(normalizedText);
            });

            if (matchedKeyword) {
                matchedIntent = intent;
                console.log(`[Chatbot] Intent matched: ${intent.action} (Target: ${intent.target})`);
                break;
            }
        }

        // 2. Identify Actor based on Intent Target
        let actor: any = null;
        let isDoctor = false;

        const phone = remoteJid.split('@')[0];
        const cleanPhone = phone.startsWith('591') ? phone.substring(3) : phone;

        // If intent is strictly for USUARIO (Doctor)
        if (matchedIntent?.target === 'USUARIO') {
            // Try to find Doctor
            actor = await this.doctorsService.findByCelular(cleanPhone);
            if (!actor) actor = await this.doctorsService.findByCelular(phone); // Try with 591 prefix
            if (!actor) actor = await this.doctorsService.findByCelular('+' + phone);

            if (actor) {
                isDoctor = true;
                console.log(`[Chatbot] Doctor identified: ${actor.nombre} ${actor.paterno}`);
            } else {
                console.log('[Chatbot] Intent is for USUARIO but sender is not a Doctor. Ignoring.');
                return;
            }
        } else {
            // Default to Patient (Target PACIENTE or null, or no intent matched yet fallback)
            actor = await this.pacientesService.findByCelular(cleanPhone);
            if (!actor) actor = await this.pacientesService.findByCelular(phone);
            if (!actor) actor = await this.pacientesService.findByCelular('+' + phone);

            if (actor) {
                console.log(`[Chatbot] Patient identified: ${actor.nombre}`);
            } else {
                console.log('[Chatbot] Sender is not a Patient. Ignoring.');
                return;
            }
        }

        // 3. Execute Action
        if (matchedIntent) {
            console.log(`[Chatbot] Executing action: ${matchedIntent.action}`);
            try {
                switch (matchedIntent.action) {
                    case 'CONSULTAR_SALDO':
                        if (!isDoctor) {
                            const detailedReport = await this.calculateDetailedSaldo(actor.id);
                            const replySaldo = `Hola ${actor.nombre}, aquí está su estado de cuenta:\n\n${detailedReport}`;
                            await this.sendMessage(remoteJid, replySaldo);
                        }
                        break;

                    case 'CONSULTAR_CITA':
                        if (isDoctor) {
                            await this.checkDoctorAppointments(actor, remoteJid);
                        } else {
                            await this.checkAppointments(actor, remoteJid);
                        }
                        break;

                    case 'TEXTO_LIBRE':
                        if (matchedIntent.replyTemplate) {
                            await this.sendMessage(remoteJid, matchedIntent.replyTemplate);
                        }
                        break;

                    case 'CONSULTAR_PRESUPUESTO':
                        if (!isDoctor) {
                            const proformas = await this.proformasService.findAllByPaciente(actor.id);
                            if (proformas.length > 0) {
                                try {
                                    const pdfBuffer = await this.pdfService.generateProformasPdf(actor, proformas);
                                    await this.sendMessage(remoteJid, {
                                        document: pdfBuffer,
                                        mimetype: 'application/pdf',
                                        fileName: `Presupuesto_${actor.nombre}_${Date.now()}.pdf`,
                                        caption: `Hola ${actor.nombre}, aquí tiene sus presupuestos en PDF.`
                                    });
                                } catch (error) {
                                    console.error('[Chatbot] Error generating PDF:', error);
                                    await this.sendMessage(remoteJid, 'Hubo un error al generar su archivo de presupuesto.');
                                }
                            } else {
                                await this.sendMessage(remoteJid, `Hola ${actor.nombre}, no encontré presupuestos registrados.`);
                            }
                        }
                        break;
                }
            } catch (error) {
                console.error(`[Chatbot] Error executing action ${matchedIntent.action}:`, error);
                await this.sendMessage(remoteJid, 'Lo siento, ocurrió un error al procesar tu solicitud.');
            }
        } else {
            // Fallback for Patients only (legacy simple queries)
            if (!isDoctor && (normalizedText.includes('cita') || normalizedText.includes('cuando') || normalizedText.includes('agend'))) {
                await this.checkAppointments(actor, remoteJid);
            }
        }
    }

    async calculateDetailedSaldo(pacienteId: number): Promise<string> {
        const proformas = await this.proformasService.findAllByPaciente(pacienteId);
        const historia = await this.historiaClinicaService.findAllByPaciente(pacienteId);
        const pagos = await this.pagosService.findAllByPaciente(pacienteId);

        // Initialize report map
        const report = new Map<number, { ejecutado: number, pagado: number, numero: number }>();

        // Init with existing proformas
        proformas.forEach(p => {
            report.set(p.id, { ejecutado: 0, pagado: 0, numero: p.numero });
        });

        // Sum Executed (Treatments)
        historia.forEach(h => {
            if (h.estadoTratamiento === 'terminado' && h.proformaId) {
                const current = report.get(h.proformaId);
                if (current) {
                    current.ejecutado += Number(h.precio);
                }
            }
        });

        // Sum Payments
        pagos.forEach(p => {
            if (p.proformaId) {
                const current = report.get(p.proformaId);
                if (current) {
                    current.pagado += Number(p.monto);
                }
            }
        });

        let messageParts: string[] = [];

        report.forEach((data, proformaId) => {
            const saldo = data.ejecutado - data.pagado;
            const saldoFavor = saldo < 0 ? Math.abs(saldo) : 0;
            const saldoContra = saldo > 0 ? saldo : 0;

            messageParts.push(`Presupuesto #${data.numero}
- Ejecutado por el Dr.: ${data.ejecutado}
- Pagado por el Paciente: ${data.pagado}
- Saldo a Favor: ${saldoFavor}
- Saldo en contra: ${saldoContra}`);
        });

        if (messageParts.length === 0) {
            return "No tiene presupuestos registrados en el sistema.";
        }

        return messageParts.join('\n\n');
    }

    async checkAppointments(paciente: any, remoteJid: string) {
        const appointments = await this.agendaService.findAllByPaciente(paciente.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureAppointments = appointments.filter(a => {
            const appDate = new Date(a.fecha);
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today;
        });

        if (futureAppointments.length > 0) {
            const replies = futureAppointments.map(app => {
                // Format time to HH:mm (remove seconds)
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                return `- ${app.fecha} a las ${timeFormatted}`;
            });

            const reply = `Hola ${paciente.nombre}, tienes las siguientes citas programadas:\n${replies.join('\n')}`;
            await this.sendMessage(remoteJid, reply);
        } else {
            const reply = `Hola ${paciente.nombre}, no encontré citas futuras agendadas.`;
            await this.sendMessage(remoteJid, reply);
        }
    }

    async checkDoctorAppointments(doctor: any, remoteJid: string) {
        // We reuse agendaService but need a method for Doctor?
        // Actually agendaService usually finds by Patient. We probably need findAllByDoctor in AgendaService.
        // If it doesn't exist, we must add it. For now, assuming I might need to add it or do a raw query.
        // Checking AgendaService... I don't recall seeing findAllByDoctor.
        // Let's assume I need to fetch all and filter, or add the method.
        // Ideally, I should add findAllByDoctor to AgendaService.
        // BUT, to save time/risk, I can check if AgendaService has a generic find.
        // Let's pause and check AgendaService. If I implement it here blindly it might fail.
        // For this step I will implement specific logic if I can, or use a query builder here if possible (but service separation is better).
        // Let's try to trust AgendaService has something or I add it.
        // Re-reading task: "Fetch weekly appointments for that doctor".

        // Let's implement this method assuming I'll add `findAllByDoctor` to AgendaService in next step if generic one fails.
        // Actually, to make this robust, I'll modify AgendaService first to support `findAllByDoctor`.
        // So for now I will leave this placeholder or partial implementation.

        // Wait, I can inject the repository if I really want to bypass, but better practice is to use AgendaService.
        // I'll assume AgendaService needs `findAllByDoctor`.
        // Let's write the call here and then implement it in AgendaService.
        const appointments = await this.agendaService.findAllByDoctor(doctor.id);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        const weeklyAppointments = appointments.filter(a => {
            const [year, month, day] = a.fecha.toString().split('-').map(Number);
            const appDateObj = new Date(year, month - 1, day);
            return appDateObj >= today && appDateObj <= nextWeek;
        });

        if (weeklyAppointments.length > 0) {
            const replies = weeklyAppointments.map(app => {
                const timeParts = app.hora.split(':');
                const timeFormatted = timeParts.length >= 2 ? `${timeParts[0]}:${timeParts[1]}` : app.hora;
                const pacienteName = app.paciente ? `${app.paciente.nombre} ${app.paciente.paterno}` : 'Paciente sin nombre';
                return `📅 ${app.fecha} 🕒 ${timeFormatted}\n👤 ${pacienteName}\n📝 ${app.tratamiento || 'Consulta'}`;
            });
            const reply = `Dr. ${doctor.paterno}, sus citas para esta semana:\n\n${replies.join('\n\n')}`;
            await this.sendMessage(remoteJid, reply);
        } else {
            await this.sendMessage(remoteJid, `Dr. ${doctor.paterno}, no tiene citas programadas para esta semana.`);
        }
    }

    async sendMessage(jid: string, content: string | any) {
        if (this.sock) {
            if (typeof content === 'string') {
                await this.sock.sendMessage(jid, { text: content });
            } else {
                await this.sock.sendMessage(jid, content);
            }
        }
    }

    getStatus() {
        return {
            status: this.status,
            qr: this.qrCode
        };
    }

    async disconnect() {
        if (this.sock) {
            this.intentionalDisconnect = true; // Mark as intentional
            this.sock.end(undefined);
            this.status = 'disconnected';
            this.qrCode = null;
        }
    }

    async resetSession() {
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));

        const authPath = path.resolve('wa_auth_info');
        if (fs.existsSync(authPath)) {
            try {
                fs.rmSync(authPath, { recursive: true, force: true });
                console.log('Deleted wa_auth_info');
            } catch (error) {
                console.error('Error deleting auth folder:', error);
            }
        }

        // Ensure state is clean for next init
        this.status = 'disconnected';
        this.qrCode = null;
    }
}
