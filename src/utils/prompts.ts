
import { CNAM_CODES_INFO } from './constants';

export const generateVoicePrompt = (text: string) => `[INST] You are a medical data extractor. Convert the transcript into JSON.
        
Rules:
1. Output ONLY valid JSON.
2. No explanations, no conversation.
3. Use these intents: CREATE_BULLETIN, CREATE_PATIENT, SEARCH_PATIENT, NAVIGATE.

Context Codes:
${CNAM_CODES_INFO}

Example 1: "Ajouter bulletin pour Ahmed avec acte SC17"
Output: {"intent": "CREATE_BULLETIN", "entities": {"patientName": "Ahmed", "acts": ["SC17"]}}

Example 2: "Acte SC33 et SC23 pour Fatma"
Output: {"intent": "CREATE_BULLETIN", "entities": {"patientName": "Fatma", "acts": ["SC33", "SC23"]}}

Example 3: "Nouveau patient Mohamed, CIN 08765432, filiere privee"
Output: {"intent": "CREATE_PATIENT", "entities": {"fullName": "Mohamed", "cin": "08765432", "category": "privee"}}

Example 4: "Enregistrer patiente Sonia, cin 11223344, CNRPS"
Output: {"intent": "CREATE_PATIENT", "entities": {"fullName": "Sonia", "cin": "11223344", "category": "CNRPS"}}

Example 5: "Chercher patient Mellah"
Output: {"intent": "SEARCH_PATIENT", "entities": {"query": "Mellah"}}

Example 6: "Aller aux reglages"
Output: {"intent": "NAVIGATE", "entities": {"destination": "Settings"}}

Transcript: "${text}" [/INST]
JSON:`;
