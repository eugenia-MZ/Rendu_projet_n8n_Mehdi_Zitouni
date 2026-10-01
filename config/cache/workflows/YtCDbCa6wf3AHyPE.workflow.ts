const gemini_embeddings_for_Indexing = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Gemini embeddings for Indexing', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [400, 200] } });
const split_Book_into_Chunks = textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { name: 'Split Book into Chunks', parameters: { chunkSize: 2000, chunkOverlap: 200, options: {} }, position: [600, 400] } });
const book_Document_Loader = documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1.1, config: { name: 'Book Document Loader', parameters: { dataType: 'json', jsonMode: 'expressionData', jsonData: expr('{{ $json.text }}'), textSplittingMode: 'custom', options: {} }, position: [600, 200], subnodes: { textSplitter: split_Book_into_Chunks } } });
const gemini_Chat_Model = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.1, config: { name: 'Gemini Chat Model', parameters: { modelName: 'models/gemini-flash-lite-latest', options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [180, 980] } });
const gemini_embeddings_for_Retrieval = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Gemini embeddings for Retrieval', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [400, 1180] } });
const book_Knowledge_Base = tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory', version: 1.3, config: { name: 'Book Knowledge Base', parameters: { mode: 'retrieve-as-tool', toolDescription: 'Recherche dans le texte integral du livre uploade par l\'utilisateur. A appeler avant de repondre a toute question sur le livre, avec plusieurs requetes distinctes et ciblees.', topK: 20, memoryKey: { __rl: true, mode: 'list', value: 'vector_store_key' } }, position: [400, 980], subnodes: { embedding: gemini_embeddings_for_Retrieval } } });

const on_Book_Upload = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: { name: 'On Book Upload', parameters: { formTitle: 'livre_pdf', formDescription: 'Déposez le PDF du livre à résumer.', formFields: { values: [{ fieldLabel: 'Livre', fieldType: 'file', requiredField: true }] }, options: {} }, webhookId: '2c579e3c-afdf-4a24-ba98-6b8ba39bdf83' }
});

const extract_Book_Text = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.1,
  config: { name: 'Extract Book Text', parameters: { operation: 'pdf', binaryPropertyName: 'Livre', options: {} }, position: [220, 0], notes: 'Extrait le texte brut du livre uploadé dans le champ text.', notesInFlow: true }
});

const index_Book_into_Vector_Store = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
  version: 1.3,
  config: { name: 'Index Book into Vector Store', parameters: { mode: 'insert', clearStore: true, memoryKey: { __rl: true, mode: 'list', value: 'vector_store_key' } }, position: [460, 0], notes: 'Remplace le livre precedemment indexe a chaque upload.', notesInFlow: true, subnodes: { embedding: gemini_embeddings_for_Indexing, documentLoader: book_Document_Loader } }
});

const confirm_Book_Indexed = node({
  type: 'n8n-nodes-base.form',
  version: 2.5,
  config: { name: 'Confirm Book Indexed', parameters: { operation: 'completion', respondWith: 'text', completionTitle: 'Livre indexé', completionMessage: 'Le livre est prêt. Ouvrez le chat pour demander votre résumé.', options: {} }, position: [800, 0] }
});

const when_Chat_Message_Received = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.5,
  config: { name: 'When Chat Message Received', parameters: { public: true, options: {} }, position: [0, 780], webhookId: '3c214ea3-8eef-4e9f-a953-3869f92df211' }
});

const interview_Agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: { name: 'Interview Agent', parameters: { options: { systemMessage: '# Role : Product Manager & Analyste Stratégique Socratique (Intervieweur)\n\nTu es un Product Manager expert, spécialisé dans la définition de projets de développement web et d\'automatisation (n8n). \nTon objectif est de comprendre le projet de l\'utilisateur, mais surtout de le forcer à définir ses besoins de manière irréprochable via un questionnement continu et multidimensionnel.\n\n## Tes Objectifs\n1. **Comprendre le "Pourquoi" :** Ne te contente pas de la solution proposée. Cherche le problème fondamental.\n2. **Challenger les hypothèses :** Pousse l\'utilisateur dans ses retranchements s\'il propose des idées floues.\n3. **Récolter de la donnée qualitative :** Identifie la cible, le marché, les cas d\'usage réels et les contraintes métier.\n\n## Tes Règles de Comportement (STRICTES)\n- **Le Questionnement Multiple et Permanent :** Tu ne dois JAMAIS donner de solution toute faite ou clore un sujet sans poser de questions. **Chacune de tes réponses DOIT se terminer par une liste de 3 à 5 questions pertinentes et complémentaires.**\n- **Couverture à 360 degrés :** Tes questions doivent attaquer le sujet sous différents angles en même temps (ex: 1 question sur la cible, 1 question sur la faisabilité, 1 question sur le ROI).\n- **La méthode des 5 Pourquoi :** Si une réponse manque de profondeur, intègre des questions qui creusent la cause racine.\n- **Validation active :** Synthétise ce que tu as compris, puis pose immédiatement ta série de questions pour challenger l\'étape suivante.\n\n## Ta Structure d\'Interview\n1. **La Vision :** Quel est le but ultime du projet ? \n2. **L\'Utilisateur :** À qui s\'adresse ce produit / cette automatisation ?\n3. **Le Processus Actuel :** Comment le problème est-il géré aujourd\'hui ?\n4. **La Définition de Terminé (DoD) :** À quoi verra-t-on que le MVP est un succès ?\n\n**Démarre la conversation en demandant un résumé du projet, et pose immédiatement tes 3 premières questions pour challenger son utilité réelle, sa cible et ses contraintes.**\n\n## Contexte de cette conversation (PRIORITAIRE)\nUn livre a été importé dans ta base de connaissances via le formulaire d\'upload. Tu y accèdes uniquement par l\'outil « Book Knowledge Base ».\n\nRègles d\'usage de l\'outil :\n- Appelle-le AVANT chaque réponse, avec plusieurs requêtes ciblées et distinctes (thèse centrale, structure, chapitres, exemples, recommandations pratiques).\n- Ne t\'appuie que sur les extraits retournés. N\'invente jamais un contenu, un chiffre ou un nom absent des extraits.\n- Si l\'outil ne retourne rien d\'exploitable, dis-le clairement et demande à l\'utilisateur d\'uploader le livre via le formulaire avant de continuer.\n\nTa mission : produire un résumé structuré du livre (thèse centrale, idées clés, structure par chapitre, exemples marquants, conseils actionnables) tout en appliquant ta méthode d\'interview.\n\nFormat imposé de chaque réponse :\n1. Le contenu demandé (résumé, synthèse ou analyse), appuyé sur les extraits du livre.\n2. Une courte synthèse de ce que tu as compris du besoin de l\'utilisateur.\n3. Une liste de 3 à 5 questions pour cerner son objectif réel, sa cible, le niveau de détail attendu et l\'usage concret qu\'il veut en faire.\n\nException à ta règle « jamais de solution toute faite » : tu livres bien le résumé demandé. Mais tu ne termines JAMAIS une réponse sans tes 3 à 5 questions.' } }, position: [260, 780], subnodes: { model: gemini_Chat_Model, tools: [book_Knowledge_Base] } }
});

const wf = workflow('YtCDbCa6wf3AHyPE', 'Book Summary Interview Agent', { binaryMode: 'separate', description: 'Upload a book PDF through the form trigger, index its full text into an in-memory vector store, then interview the user about that book through a Socratic product manager chat agent that grounds every answer in the indexed content.', availableInMCP: true, executionOrder: 'v1' });

export default wf
  .add(on_Book_Upload)
  .to(extract_Book_Text)
  .to(index_Book_into_Vector_Store)
  .to(confirm_Book_Indexed)
  .add(when_Chat_Message_Received)
  .to(interview_Agent)
  .add(sticky('## Étape 1 : indexer le livre\n\n**À lancer en premier.**\n\n1. Ouvre l\'URL du formulaire et dépose le PDF du livre.\n2. `Extract Book Text` en extrait le texte brut.\n3. `Index Book into Vector Store` le découpe en chunks de 2000 caractères (chevauchement 200), les vectorise avec Gemini et les stocke sous la clé `vector_store_key`.\n\n⚠️ Le store est **en mémoire** : il se vide à chaque redémarrage de n8n. Il faut alors ré-uploader le PDF.\n\n⚠️ `clearStore` est à `true` : chaque upload **remplace** le livre précédent.', [], { name: 'Book Indexing Flow', color: 2, width: 1060, height: 200, position: [-60, -260] }))
  .add(sticky('## Étape 2 : interview et résumé\n\n**À utiliser une fois le livre indexé.**\n\nL\'agent suit le prompt de `skills/interview.md` : il livre le résumé demandé, puis termine toujours par 3 à 5 questions.\n\nIl lit le livre via `Book Knowledge Base`, qui retourne les 20 chunks les plus proches pour couvrir large sur un livre entier.\n\n💬 Ouvre le chat et demande par exemple : « Résume-moi ce livre chapitre par chapitre ».', [], { name: 'Chat Interview Flow', color: 2, width: 700, height: 180, position: [-60, 560] }))