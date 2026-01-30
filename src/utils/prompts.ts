
import { CNAM_CODES_INFO } from './constants';

export const WHISPER_INITIAL_PROMPTS: Record<string, string> = {
    ar: "Tunisian medical context: Patient, bulletin, CNAM, CNRPS, CIN, filière privée, acte médical, médecin, Sbitar, Barcha, Shnowa, Kifech, Labess, SC17, SC23, SC33, Tbib, Dwa, Ordonnance, Kernet, Chifa, Madmoun, Tasrih.",
    fr: "Contexte médical: Patient, bulletin de soins, feuille de soins, pharmacie, médecin, consultation, remboursement, matricule, convention, acte médical, prescription, scanner, analyse, laboratoire, mutuelle, CNAM.",
    en: "Medical context: Patient, medical claim, health form, insurance, doctor, consultation, reimbursement, ID number, agreement, medical act, prescription, scanner, analysis, laboratory, CNAM."
};

export const generateVoicePrompt = (text: string, lang: string = 'ar') => {
    const contextMap: Record<string, string> = {
        ar: "You are a Tunisian medical assistant. Convert the following transcript (in Tunisian Derja/Arabic) into JSON.",
        fr: "Vous êtes un assistant médical. Convertissez la transcription suivante (en Français) en JSON.",
        en: "You are a medical assistant. Convert the following transcript (in English) into JSON."
    };

    const context = contextMap[lang] || contextMap['ar'];

    return `[INST] ${context}

Rules:
1. Output ONLY valid JSON.
2. If the user mentions "filière privée" or "filière publique", map them to the "category" field.
3. If they say "carte chifa" or "cnam", ensure it's captured in bulletin context.
4. Use these intents: CREATE_BULLETIN, CREATE_PATIENT, SEARCH_PATIENT, NAVIGATE.

Context Codes:
${CNAM_CODES_INFO}

Example (Tunisian): "Nheb nzid bulletin l-Ahmed acte SC33"
Output: {"intent": "CREATE_BULLETIN", "entities": {"patientName": "Ahmed", "acts": ["SC33"]}}

Example (French): "Ajouter un bulletin pour Jean avec l'acte SC17"
Output: {"intent": "CREATE_BULLETIN", "entities": {"patientName": "Jean", "acts": ["SC17"]}}

Transcript: "${text}" [/INST]
JSON:`;
};
