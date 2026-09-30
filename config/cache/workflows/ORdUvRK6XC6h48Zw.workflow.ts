const r_ception_Formulaire_Web = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 1,
  config: { name: 'Réception Formulaire Web', parameters: { httpMethod: 'POST', path: 'nouveau-prospect-btp', options: {} }, position: [400, -112], webhookId: '5e6eb533-8048-4796-bbe3-63b96ca3ed77', notes: 'Déclencheur : Le site web envoie les données du formulaire ici.', notesInFlow: true }
});

const sauvegarde_Tableur = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4,
  config: { name: 'Sauvegarde Tableur', parameters: { operation: 'append', documentId: { __rl: true, value: '1A-FEBQc2FAanVzlPTjvQDUqM1c1P4JO0JPf0EFRkDmY', mode: 'id' }, sheetName: { __rl: true, value: 'Prospects', mode: 'list' }, columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: [], schema: [], attemptToConvertTypes: false, convertFieldsToString: false }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account', 'w9pnw2PVHDCi2q6z') }, position: [608, -112], notes: 'Stockage dans la base de données', notesInFlow: true }
});

const email_de_Bienvenue = node({
  type: 'n8n-nodes-base.gmail',
  version: 2,
  config: { name: 'Email de Bienvenue', parameters: { sendTo: expr('{{ $(\'Réception Formulaire Web\').item.json.body.email }}'), subject: 'Votre demande de devis - Préparation de votre dossier', message: expr('Bonjour {{ $(\'Réception Formulaire Web\').item.json.body.nom }},\n\nNous avons bien reçu votre demande concernant votre projet et nous vous en remercions.\n\nAfin de préparer au mieux notre échange et notre pré-chiffrage, pourriez-vous nous répondre à cet e-mail en joignant quelques photos de l\'état actuel de votre chantier ?\n\nÀ très vite,\n\nL\'équipe.'), options: {} }, credentials: { gmailOAuth2: newCredential('Gmail account', 'pYTpTmftlAws0qHX') }, position: [800, -112], webhookId: '4c0f4490-4375-46f6-818c-18d3f9173c4b', notes: 'Envoi de l\'e-mail avec relance automatique en cas d\'échec.', notesInFlow: true }
});

const wf = workflow('ORdUvRK6XC6h48Zw', 'BTP CRM : Nouveau Prospect', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(r_ception_Formulaire_Web)
  .to(sauvegarde_Tableur)
  .to(email_de_Bienvenue)