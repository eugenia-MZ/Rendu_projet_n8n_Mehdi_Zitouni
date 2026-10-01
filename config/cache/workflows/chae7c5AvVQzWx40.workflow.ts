const recursive_Character_Text_Splitter = textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { name: 'Recursive Character Text Splitter', parameters: { chunkSize: 5000, chunkOverlap: 200, options: {} }, position: [-536, 776] } });
const embeddings_Google_Gemini_ingestion = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Embeddings Google Gemini (ingestion)', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [-744, 568] } });
const chargeur_de_documents = documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1.1, config: { name: 'Chargeur de documents', parameters: { jsonMode: 'expressionData', jsonData: expr('{{ $json.texte }}'), textSplittingMode: 'custom', options: { metadata: { metadataValues: [{ name: 'chapitre', value: expr('{{ $json.chapitre }}') }] } } }, position: [-616, 568], subnodes: { textSplitter: recursive_Character_Text_Splitter } } });
const google_Gemini_Chat_Model = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.2, config: { name: 'Google Gemini Chat Model', parameters: { modelName: 'models/gemini-flash-lite-latest', options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [-456, -72] } });

const formulaire_envoyer_le_livre_PDF = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.2,
  config: { name: 'Formulaire : envoyer le livre (PDF)', parameters: { formTitle: 'livre', formDescription: 'livre description', formFields: { values: [{ fieldLabel: 'livre', fieldType: 'file', multipleFiles: false, acceptFileTypes: '.pdf', requiredField: true }] }, responseMode: 'lastNode', options: { appendAttribution: false, buttonLabel: '', respondWithOptions: { values: { formSubmittedText: 'Livre indexé' } } } }, position: [-752, -752], webhookId: '38a5186b-f140-4195-9731-6eadd93a7ece' }
});

const extraction_pdf = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1,
  config: { name: 'Extraction pdf', parameters: { operation: 'pdf', binaryPropertyName: 'livre', options: {} }, position: [-528, -752] }
});

const nettoyage = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Nettoyage', parameters: { jsCode: '// NETTOYAGE du texte extrait du PDF\n// Entrée : 1 item { text, numpages } (sortie de "Extraire le texte du PDF")\n// Sortie : 1 item { texte } avec un chapitre par ligne ("1. ...", "2. ...")\nconst { text = \'\', numpages = 1 } = $input.first().json;\nif (!text.trim()) {\n  throw new Error("Aucun texte extrait du PDF (PDF vide ou scanné) : rien n\'a été indexé.");\n}\n\nlet lignes = text.replace(/\\r/g, \'\').split(\'\\n\').map(l => l.replace(/\\s+/g, \' \').trim());\n\n// 1. En-têtes / pieds de page du navigateur : lignes qui reviennent sur plusieurs pages\n//    (les chiffres sont ignorés pour attraper "1/10", "2/10", la date, etc.)\nconst cle = l => l.replace(/\\d+/g, \'#\');\nconst freq = {};\nfor (const l of lignes) if (l) freq[cle(l)] = (freq[cle(l)] ?? 0) + 1;\nconst estRepetee = l => numpages >= 3 && freq[cle(l)] >= 3 && l.length < 200;\nconst estParasite = l =>\n  /^(https?|file):\\/\\//i.test(l) ||                  // URL\n  /^(page\\s*)?\\d+\\s*(\\/|of|sur)\\s*\\d+$/i.test(l) ||  // "3/10", "Page 3 of 10"\n  /^\\d+$/.test(l);                                   // numéro de page seul\nlignes = lignes.filter(l => l && !estRepetee(l) && !estParasite(l));\n\n// 2. Garder uniquement le livre : du chapitre 1 jusqu\'à "THE END" (menu du site, ©, etc. supprimés)\nconst debut = lignes.findIndex(l => /^1\\. /.test(l));\nif (debut === -1) {\n  throw new Error("Chapitre 1 introuvable : ce PDF n\'est pas le Manuel d\'Épictète (rien n\'a été indexé).");\n}\nconst fin = lignes.findIndex((l, i) => i > debut && /^THE END$/i.test(l));\nlignes = lignes.slice(debut, fin === -1 ? undefined : fin);\n\n// 3. Recoller les lignes coupées : mots coupés par un tiret, puis une ligne par chapitre\nconst texte = lignes.join(\'\\n\')\n  .replace(/([a-z])-\\n([a-z])/g, \'$1$2\')   // "philo-\\nsophy" -> "philosophy"\n  .replace(/\\n(?!\\d+\\. )/g, \' \')           // retour à la ligne hors début de chapitre -> espace\n  .replace(/ {2,}/g, \' \')\n  .trim();\n\nreturn [{ json: { texte, nb_caracteres: texte.length, nb_pages: numpages } }];\n' }, position: [-304, -752] }
});

const chunking = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Chunking', parameters: { jsCode: '// CHUNKING SÉMANTIQUE (Par phrases avec chevauchement)\n// Entrée : 1 item { texte, nb_pages } (Sortie du nœud de Nettoyage)\n// Sortie : N items { chunk_text, chunk_index, chunk_size, ... }\n\nconst inputData = $input.first().json;\nconst texte = inputData.texte;\n\nif (!texte) {\n  throw new Error("Aucun texte fourni pour le chunking.");\n}\n\n// Paramètres de découpage\nconst MAX_CHUNK_SIZE = 1200; // Taille maximale d\'un morceau (en caractères)\nconst OVERLAP_SIZE = 200;    // Taille approximative du chevauchement\n\n// 1. Découpage initial par phrases (préserve la logique de lecture)\n// Coupe après un point, un point d\'interrogation ou d\'exclamation suivi d\'un espace.\nconst phrases = texte.split(/(?<=[.?!])\\s+/);\n\nconst chunks = [];\nlet chunkCourant = "";\n\nfor (let i = 0; i < phrases.length; i++) {\n  const phrase = phrases[i];\n\n  // Si l\'ajout de la phrase dépasse la limite ET que le chunk n\'est pas vide\n  if (chunkCourant.length + phrase.length > MAX_CHUNK_SIZE && chunkCourant.length > 0) {\n    \n    // On valide et sauvegarde le chunk courant\n    chunks.push(chunkCourant.trim());\n\n    // Gestion du chevauchement (Overlap) :\n    // On récupère les dernières phrases du chunk précédent pour démarrer le suivant\n    let overlapText = "";\n    let j = i - 1;\n    \n    while (j >= 0 && (overlapText.length + phrases[j].length) < OVERLAP_SIZE) {\n      overlapText = phrases[j] + " " + overlapText;\n      j--;\n    }\n\n    // On initialise le nouveau chunk avec le chevauchement + la nouvelle phrase\n    chunkCourant = overlapText.trim() + " " + phrase;\n    \n  } else {\n    // La phrase rentre, on l\'ajoute au chunk courant\n    chunkCourant += (chunkCourant.length > 0 ? " " : "") + phrase;\n  }\n}\n\n// Ne pas oublier le dernier chunk restant\nif (chunkCourant.trim().length > 0) {\n  chunks.push(chunkCourant.trim());\n}\n\n// 2. Génération de la sortie pour n8n\n// Chaque élément du tableau devient un "Item" distinct dans le flux n8n\nreturn chunks.map((chunk, index) => {\n  return {\n    json: {\n      chunk_text: chunk,\n      chunk_size: chunk.length,\n      chunk_index: index + 1,\n      total_chunks: chunks.length,\n      nb_pages: inputData.nb_pages // On conserve la métadonnée d\'origine\n    }\n  };\n});' }, position: [-80, -752] }
});

const augmentation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Augmentation', parameters: { jsCode: '// AUGMENTATION PAR MOTS-CLÉS (Extraction par fréquence)\n// Entrée : N items { chunk_text, chunk_index, ... }\n// Sortie : N items avec un nouveau champ "keywords" (Array) et "augmented_text"\n\nconst items = $input.all();\n\n// Liste basique de "Stop Words" (mots vides) en ANGLAIS à ignorer\n// (À adapter si tu as des PDF en français)\nconst stopWords = new Set([\n  "the", "and", "to", "of", "a", "in", "is", "that", "it", "for", "you", "on", \n  "with", "as", "are", "be", "this", "or", "your", "not", "can", "but", "what", \n  "if", "they", "we", "about", "how", "all", "will", "do", "when", "an", "from", \n  "by", "at", "so", "have", "has", "more", "must", "people", "which", "their", \n  "there", "some", "them", "then", "than", "out", "into", "just", "like"\n]);\n\nreturn items.map(item => {\n  const text = item.json.chunk_text || "";\n  \n  // 1. Nettoyage : Minuscules, suppression de la ponctuation, découpage en mots\n  const words = text.toLowerCase().replace(/[^a-z0-9\\s]/g, \'\').split(/\\s+/);\n  \n  // 2. Comptage des fréquences\n  const wordCounts = {};\n  for (const word of words) {\n    // On ignore les nombres, les mots courts (< 4 lettres) et les stop words\n    if (word.length > 3 && !stopWords.has(word) && isNaN(word)) {\n      wordCounts[word] = (wordCounts[word] || 0) + 1;\n    }\n  }\n  \n  // 3. Tri pour récupérer les 5 mots les plus fréquents du chunk\n  const topKeywords = Object.entries(wordCounts)\n    .sort((a, b) => b[1] - a[1])\n    .slice(0, 5)\n    .map(entry => entry[0]);\n    \n  // 4. Augmentation de la donnée\n  item.json.keywords = topKeywords; // Array de mots-clés (pour les métadonnées)\n  \n  // Optionnel : On peut créer un texte augmenté spécialement pour la vectorisation\n  // (Cela force le modèle d\'embedding à donner plus de poids à ces mots)\n  item.json.augmented_text = `Keywords: \\({topKeywords.join(", ")}\\n\\n\\){text}`;\n  \n  return item;\n});' }, position: [144, -752] }
});

const limit = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limit', parameters: { maxItems: 10 }, position: [368, -752] }
});

const call_RAG_livre = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: { name: 'Call \'RAG livre\'', parameters: { workflowId: { __rl: true, value: 'chae7c5AvVQzWx40', mode: 'list', cachedResultUrl: '/workflow/chae7c5AvVQzWx40', cachedResultName: 'RAG livre' }, workflowInputs: { mappingMode: 'defineBelow', value: { resultChunking: expr('{{ $json.chunk_text }}') }, matchingColumns: [''], schema: [{ id: 'resultChunking', displayName: 'resultChunking', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false }], attemptToConvertTypes: false, convertFieldsToString: true }, mode: 'each', options: {} }, position: [592, -752] }
});

const chat_question_sur_le_livre = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.1,
  config: { name: 'Chat : question sur le livre', parameters: { options: {} }, position: [-752, -192], webhookId: '7d3f3810-9048-492e-aa06-7ab973f64c0c' }
});

const basic_LLM_Chain = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Basic LLM Chain', parameters: { promptType: 'define', text: expr('Tu es un assistant technique invisible chargé d\'analyser la requête d\'un utilisateur pour interroger une base de données vectorielle.\nVoici la question de l\'utilisateur : "{{ $json.chatInput }}"\n\nTa seule tâche est d\'extraire les mots-clés optimaux pour la recherche sémantique, et de détecter si l\'utilisateur précise un auteur.\nTu ne dois répondre que par un objet JSON valide, rien d\'autre.\n\nExemple de format attendu :\n{\n"search_query": "stratégie de contenu web et architecture",\n"filter": { "author": "Gerry McGovern" }\n}\nSi aucun auteur n\'est mentionné, mets un objet vide pour filter : {}'), batching: {} }, position: [-528, -304], subnodes: { model: google_Gemini_Chat_Model } }
});

const routing = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'routing', parameters: { jsCode: 'const responseText = $input.first().json.text;\n\n// Nettoyage au cas où le LLM ajoute des balises markdown ```json ... ```\nconst cleanText = responseText.replace(/```json/g, \'\').replace(/```/g, \'\').trim();\n\ntry {\n  const routingData = JSON.parse(cleanText);\n  return { json: routingData };\n} catch (error) {\n  // Fallback si le LLM a complètement raté son JSON\n  return { \n    json: { \n      search_query: $input.first().json.chatInput, \n      filter: {} \n    } \n  };\n}' }, position: [-176, -192] }
});

const aI_Agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: { name: 'AI Agent', parameters: { options: {} }, position: [48, -192] }
});

const when_Executed_by_Another_Workflow = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.2,
  config: { name: 'When Executed by Another Workflow', parameters: { workflowInputs: { values: [{ name: 'resultChunking' }] } }, position: [-752, -528] }
});

const create_a_row1 = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: { name: 'Create a row1', parameters: { tableId: 'documents', fieldsUi: { fieldValues: [{ fieldId: 'content', fieldValue: expr('{{ $json.resultChunking }}') }] } }, credentials: { supabaseApi: newCredential('Supabase account', 'G1LJN6p2BlmWrcyx') }, position: [-528, -528] }
});

const vectorisation_Simple_Vector_Store = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
  version: 1.1,
  config: { name: 'Vectorisation (Simple Vector Store)', parameters: { mode: 'insert', memoryKey: 'enchiridion', clearStore: true }, position: [-720, 336], subnodes: { embedding: embeddings_Google_Gemini_ingestion, documentLoader: chargeur_de_documents } }
});

const embeddings_Google_Gemini = node({
  type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
  version: 1,
  config: { name: 'Embeddings Google Gemini', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [160, 48] }
});

const wf = workflow('chae7c5AvVQzWx40', 'RAG livre', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(formulaire_envoyer_le_livre_PDF)
  .to(extraction_pdf)
  .to(nettoyage)
  .to(chunking)
  .to(augmentation)
  .to(limit)
  .to(call_RAG_livre)
  .add(chat_question_sur_le_livre)
  .to(basic_LLM_Chain)
  .to(routing)
  .to(aI_Agent)
  .add(when_Executed_by_Another_Workflow)
  .to(create_a_row1)
  .add(vectorisation_Simple_Vector_Store)
  .add(embeddings_Google_Gemini)