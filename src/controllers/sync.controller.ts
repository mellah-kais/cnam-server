
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const syncPatients = async (req: Request, res: Response) => {
    const { patients } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const patient of patients) {
            await prisma.patient.upsert({
                where: { nationalId: patient.nationalId },
                update: {
                    fullName: patient.fullName,
                    birthDate: new Date(patient.birthDate),
                    cnamCategory: patient.cnamCategory,
                    currentPlafondUsage: patient.currentPlafondUsage,
                    dentistId: dentistId
                },
                create: {
                    id: patient.id,
                    nationalId: patient.nationalId,
                    fullName: patient.fullName,
                    birthDate: new Date(patient.birthDate),
                    cnamCategory: patient.cnamCategory,
                    currentPlafondUsage: patient.currentPlafondUsage,
                    dentistId: dentistId
                }
            });
        }
        res.json({ success: true, message: 'Patients synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
};

export const syncBulletins = async (req: Request, res: Response) => {
    const { bulletins } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const bulletin of bulletins) {
            await prisma.bulletin.upsert({
                where: { id: bulletin.id },
                update: {
                    status: bulletin.status,
                    bordereauRef: bulletin.bordereauRef,
                    totalAmount: bulletin.totalAmount,
                    actCodes: Array.isArray(bulletin.actCodes) ? bulletin.actCodes.join(',') : bulletin.actCodes,
                    dentistId: dentistId
                },
                create: {
                    id: bulletin.id,
                    patientId: bulletin.patientId,
                    dentistId: dentistId,
                    visitDate: new Date(bulletin.visitDate),
                    actCodes: Array.isArray(bulletin.actCodes) ? bulletin.actCodes.join(',') : bulletin.actCodes,
                    totalAmount: bulletin.totalAmount,
                    status: bulletin.status,
                    bordereauRef: bulletin.bordereauRef
                }
            });
        }
        res.json({ success: true, message: 'Bulletins synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
};

export const syncBordereaux = async (req: Request, res: Response) => {
    const { bordereaux } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const bordereau of bordereaux) {
            await prisma.bordereau.upsert({
                where: { id: bordereau.id },
                update: {
                    status: bordereau.status,
                    totalAmount: bordereau.totalAmount,
                    expectedPaymentDate: bordereau.expectedPaymentDate ? new Date(bordereau.expectedPaymentDate) : null,
                    dentistId: dentistId
                },
                create: {
                    id: bordereau.id,
                    ref: bordereau.ref,
                    dentistId: dentistId,
                    creationDate: new Date(bordereau.creationDate),
                    totalAmount: bordereau.totalAmount,
                    status: bordereau.status,
                    expectedPaymentDate: bordereau.expectedPaymentDate ? new Date(bordereau.expectedPaymentDate) : null
                }
            });
        }
        res.json({ success: true, message: 'Bordereaux synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
};
