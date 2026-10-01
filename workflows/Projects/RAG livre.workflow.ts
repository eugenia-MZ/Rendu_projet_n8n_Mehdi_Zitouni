const gemini_augmentation = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.2, config: { name: 'Gemini (augmentation)', parameters: { modelName: 'models/gemini-flash-lite-latest', options: { maxOutputTokens: 2048, temperature: 0 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [1072, 512] } });
const embeddings_Google_Gemini_ingestion = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Embeddings Google Gemini (ingestion)', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [1824, 512] } });
const pas_de_re_d_coupage = textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { name: 'Pas de re-découpage', parameters: { chunkSize: 8000, options: {} }, position: [2080, 688], notes: 'Le chunking est fait en amont : taille > plus gros chunk augmenté pour ne pas re-couper' } });
const chargeur_de_documents = documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1.1, config: { name: 'Chargeur de documents', parameters: { jsonMode: 'expressionData', jsonData: expr('{{ $json.texte_vectorise }}'), textSplittingMode: 'custom', options: { metadata: { metadataValues: [{ name: 'chunk_id', value: expr('{{ $json.chunk_id }}') }, { name: 'chapitre', value: expr('{{ String($json.chapitre) }}') }, { name: 'partie', value: expr('{{ String($json.partie) }}') }, { name: 'chunk_index', value: expr('{{ String($json.chunk_index) }}') }, { name: 'texte_original', value: expr('{{ $json.chunk_text }}') }, { name: 'contexte', value: expr('{{ $json.contexte }}') }, { name: 'mots_cles', value: expr('{{ $json.mots_cles.join(\', \') }}') }] } } }, position: [2000, 512], subnodes: { textSplitter: pas_de_re_d_coupage } } });
const gemini_routing = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.2, config: { name: 'Gemini (routing)', parameters: { modelName: 'models/gemini-flash-lite-latest', options: { maxOutputTokens: 2048, temperature: 0 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [272, 1232] } });
const embeddings_Google_Gemini_requ_te = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Embeddings Google Gemini (requête)', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [1008, 1520] } });
const gemini_reranking = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.2, config: { name: 'Gemini (reranking)', parameters: { modelName: 'models/gemini-flash-lite-latest', options: { maxOutputTokens: 2048, temperature: 0 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [1440, 1504] } });
const gemini_r_ponse = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.2, config: { name: 'Gemini (réponse)', parameters: { modelName: 'models/gemini-flash-lite-latest', options: { maxOutputTokens: 2048, temperature: 0 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [1920, 1344] } });

const formulaire_envoyer_le_livre_PDF = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.2,
  config: { name: 'Formulaire : envoyer le livre (PDF)', parameters: { formTitle: 'Indexer un livre', formDescription: 'Envoie le PDF du livre. L\'indexation tourne en arrière-plan (quelques minutes) : suis-la dans Executions.', formFields: { values: [{ fieldLabel: 'livre', fieldType: 'file', multipleFiles: false, acceptFileTypes: '.pdf', requiredField: true }] }, options: { appendAttribution: false, buttonLabel: '', respondWithOptions: { values: { formSubmittedText: 'Indexation lancée. Le chatbot sera à jour d\'ici quelques minutes.' } } } }, position: [64, 304], webhookId: '58ac874e-6581-4a9e-a0ea-0aa6e84d3cb3' }
});

const extraction_pdf = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1,
  config: { name: 'Extraction pdf', parameters: { operation: 'pdf', binaryPropertyName: 'livre', options: {} }, position: [272, 304] }
});

const nettoyage = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Nettoyage', parameters: { jsCode: '// NETTOYAGE du texte extrait du PDF\n// Entrée : 1 item { text, numpages } (sortie de "Extraire le texte du PDF")\n// Sortie : 1 item { texte } avec un chapitre par ligne ("1. ...", "2. ...")\nconst { text = \'\', numpages = 1 } = $input.first().json;\nif (!text.trim()) {\n  throw new Error("Aucun texte extrait du PDF (PDF vide ou scanné) : rien n\'a été indexé.");\n}\n\nlet lignes = text.replace(/\\r/g, \'\').split(\'\\n\').map(l => l.replace(/\\s+/g, \' \').trim());\n\n// 1. En-têtes / pieds de page du navigateur : lignes qui reviennent sur plusieurs pages\n//    (les chiffres sont ignorés pour attraper "1/10", "2/10", la date, etc.)\nconst cle = l => l.replace(/\\d+/g, \'#\');\nconst freq = {};\nfor (const l of lignes) if (l) freq[cle(l)] = (freq[cle(l)] ?? 0) + 1;\nconst estRepetee = l => numpages >= 3 && freq[cle(l)] >= 3 && l.length < 200;\nconst estParasite = l =>\n  /^(https?|file):\\/\\//i.test(l) ||                  // URL\n  /^(page\\s*)?\\d+\\s*(\\/|of|sur)\\s*\\d+$/i.test(l) ||  // "3/10", "Page 3 of 10"\n  /^\\d+$/.test(l);                                   // numéro de page seul\nlignes = lignes.filter(l => l && !estRepetee(l) && !estParasite(l));\n\n// 2. Garder uniquement le livre : du chapitre 1 jusqu\'à "THE END" (menu du site, ©, etc. supprimés)\nconst debut = lignes.findIndex(l => /^1\\. /.test(l));\nif (debut === -1) {\n  throw new Error("Chapitre 1 introuvable : ce PDF n\'est pas le Manuel d\'Épictète (rien n\'a été indexé).");\n}\nconst fin = lignes.findIndex((l, i) => i > debut && /^THE END$/i.test(l));\nlignes = lignes.slice(debut, fin === -1 ? undefined : fin);\n\n// 3. Recoller les lignes coupées : mots coupés par un tiret, puis une ligne par chapitre\nconst texte = lignes.join(\'\\n\')\n  .replace(/([a-z])-\\n([a-z])/g, \'$1$2\')   // "philo-\\nsophy" -> "philosophy"\n  .replace(/\\n(?!\\d+\\. )/g, \' \')           // retour à la ligne hors début de chapitre -> espace\n  .replace(/ {2,}/g, \' \')\n  .trim();\n\nreturn [{ json: { texte, nb_caracteres: texte.length, nb_pages: numpages } }];\n' }, position: [464, 304] }
});

const chunking = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Chunking', parameters: { jsCode: '// CHUNKING RÉCURSIF STRUCTURÉ (chapitre → phrase → virgule → mot) + overlap\n// Entrée : sortie du nœud "Nettoyage" { texte, nb_pages } — un chapitre par ligne ("12. ...")\n// Sortie : N items, 1 par chunk, avec métadonnées de chapitre\nconst { texte = \'\', nb_pages = null } = $(\'Nettoyage\').first().json;\nif (!texte.trim()) throw new Error(\'Aucun texte fourni pour le chunking.\');\n\nconst TAILLE_MAX = 1500; // caractères (~350 tokens) : assez pour une idée complète, assez court pour rester précis\nconst TAILLE_MIN = 350;  // un dernier morceau plus petit est fusionné avec le précédent\nconst OVERLAP = 200;     // chevauchement entre morceaux d\'un MÊME chapitre uniquement\n\n// Niveau 1 : chapitres. Un numéro qui ne suit pas l\'ordre croissant est une liste interne → recollé au chapitre courant\nconst chapitres = [];\nfor (const bloc of texte.split(/\\n(?=\\d+\\. )/).map(s => s.trim()).filter(Boolean)) {\n  const m = bloc.match(/^(\\d+)\\.\\s/);\n  const num = m ? Number(m[1]) : null;\n  const dernier = chapitres[chapitres.length - 1];\n  if (dernier && (num === null || num <= dernier.numero)) dernier.texte += \' \' + bloc;\n  else chapitres.push({ numero: num ?? chapitres.length + 1, texte: bloc });\n}\n\n// Niveaux suivants : séparateurs du plus "sémantique" au plus brutal (le séparateur reste attaché au morceau)\nconst SEPARATEURS = [/(?<=[.?!;:]["\'\u201D\u2019»)]?)\\s+/, /(?<=,)\\s+/, /\\s+/];\nfunction decouper(t, limite, niveau = 0) {\n  if (t.length <= limite) return [t];\n  if (niveau >= SEPARATEURS.length) {\n    const out = [];\n    for (let i = 0; i < t.length; i += limite) out.push(t.slice(i, i + limite));\n    return out;\n  }\n  const morceaux = t.split(SEPARATEURS[niveau]).filter(Boolean);\n  if (morceaux.length === 1) return decouper(t, limite, niveau + 1);\n  const blocs = [];\n  let courant = \'\';\n  for (const m of morceaux) {\n    if (m.length > limite) {\n      if (courant) { blocs.push(courant); courant = \'\'; }\n      blocs.push(...decouper(m, limite, niveau + 1));\n    } else if (courant && courant.length + 1 + m.length > limite) {\n      blocs.push(courant); courant = m;\n    } else {\n      courant = courant ? courant + \' \' + m : m;\n    }\n  }\n  if (courant) blocs.push(courant);\n  return blocs;\n}\n\n// Fin du morceau précédent (phrases entières si possible) pour le chevauchement\nfunction queue(t) {\n  const phrases = t.split(SEPARATEURS[0]);\n  let q = \'\';\n  for (let i = phrases.length - 1; i >= 0; i--) {\n    const cand = phrases[i] + (q ? \' \' + q : \'\');\n    if (cand.length > OVERLAP) break;\n    q = cand;\n  }\n  if (!q) q = t.slice(-OVERLAP).replace(/^\\S*\\s/, \'\');\n  return q;\n}\n\nconst sortie = [];\nfor (const ch of chapitres) {\n  // Chapitre court : 1 chunk. Sinon taille cible équilibrée (place réservée pour l\'overlap)\n  const utile = TAILLE_MAX - OVERLAP;\n  const nb = ch.texte.length <= TAILLE_MAX ? 1 : Math.ceil(ch.texte.length / utile);\n  const cible = nb === 1 ? TAILLE_MAX : Math.min(utile, Math.ceil(ch.texte.length / nb) + 80);\n  let blocs = decouper(ch.texte, cible);\n  if (blocs.length > 1 && blocs[blocs.length - 1].length < TAILLE_MIN) {\n    const fin = blocs.pop();\n    blocs[blocs.length - 1] += \' \' + fin;\n  }\n  const parties = blocs.map((b, i) => (i === 0 ? b : \'… \' + queue(blocs[i - 1]) + \' \' + b));\n  parties.forEach((p, i) => sortie.push({\n    chapitre: ch.numero,\n    partie: i + 1,\n    nb_parties: parties.length,\n    chunk_text: p,\n    contexte_chapitre: parties.length > 1\n      ? `Chapitre complet, pour contexte :\\n${ch.texte}`\n      : "(L\'extrait est le chapitre complet.)",\n  }));\n}\n\nreturn sortie.map((c, i) => ({\n  json: {\n    chunk_id: `c${String(i + 1).padStart(4, \'0\')}-ch${c.chapitre}-p${c.partie}`,\n    chunk_index: i + 1,\n    total_chunks: sortie.length,\n    ...c,\n    chunk_size: c.chunk_text.length,\n    nb_pages,\n  },\n}));\n' }, position: [672, 304] }
});

const limit_test = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limit (test)', parameters: { maxItems: 10 }, position: [864, 304], notes: 'Activer pour tester sur 5 chunks sans consommer de quota' }
});

const augmentation_LLM = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Augmentation (LLM)', parameters: { promptType: 'define', text: expr('Tu enrichis un extrait d\'un livre pour un moteur de recherche sémantique (RAG). Le livre est en anglais, les lecteurs posent leurs questions en français ou en anglais.\n\nChapitre {{ $json.chapitre }} — partie {{ $json.partie }}/{{ $json.nb_parties }}\n\n<contexte>\n{{ $json.contexte_chapitre }}\n</contexte>\n\n<extrait>\n{{ $json.chunk_text }}\n</extrait>\n\nRéponds UNIQUEMENT par un objet JSON valide, sans markdown ni commentaire :\n{\n  "contexte": "1 à 2 phrases EN ANGLAIS qui situent l\'extrait : le thème du chapitre et l\'idée précise apportée par l\'extrait (ne recopie pas l\'extrait)",\n  "mots_cles_en": ["5 à 8 concepts clés en anglais, y compris les termes philosophiques employés"],\n  "mots_cles_fr": ["les mêmes concepts en français"],\n  "questions": ["4 questions concrètes qu\'un lecteur pourrait poser et auxquelles CET extrait répond : 2 en français puis 2 en anglais"]\n}\nN\'invente rien qui ne soit pas dans l\'extrait ou son chapitre.'), batching: { batchSize: 5, delayBetweenBatches: 20000 } }, position: [1072, 304], notes: 'Batch 5 / 20 s = 15 req/min (quota gratuit Gemini). Compte payant : mettre le délai à 0.', onError: 'continueRegularOutput', subnodes: { model: gemini_augmentation } }
});

const augmentation = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Augmentation', parameters: { jsCode: '// ASSEMBLAGE DE L\'AUGMENTATION\n// Entrée : sortie de "Augmentation (LLM)" (1 item { text } par chunk, même ordre que "Chunking")\n// Sortie : chunk enrichi + "texte_vectorise" (ce qui sera réellement embeddé)\nconst chunks = $(\'Chunking\').all();\nconst arr = v => (Array.isArray(v) ? v.map(x => String(x).replace(/\\s+/g, \' \').trim()).filter(Boolean) : []);\n\nconst sortie = $input.all().map((item, i) => {\n  const c = chunks[i].json;\n  let a = {};\n  try {\n    const t = String(item.json.text ?? \'\');\n    a = JSON.parse(t.slice(t.indexOf(\'{\'), t.lastIndexOf(\'}\') + 1));\n  } catch (e) { a = {}; } // échec LLM → on indexe quand même le chunk brut\n\n  const contexte = typeof a.contexte === \'string\' ? a.contexte.replace(/\\s+/g, \' \').trim() : \'\';\n  const mots_cles = [...new Set([...arr(a.mots_cles_en), ...arr(a.mots_cles_fr)].map(s => s.toLowerCase()))].slice(0, 16);\n  const questions = arr(a.questions).slice(0, 6);\n  const titre = `Chapter ${c.chapitre}` + (c.nb_parties > 1 ? ` (part ${c.partie}/${c.nb_parties})` : \'\');\n\n  const texte_vectorise = [\n    titre,\n    contexte && `Context: ${contexte}`,\n    c.chunk_text,\n    mots_cles.length && `Keywords: ${mots_cles.join(\', \')}`,\n    questions.length && `Questions answered: ${questions.join(\' | \')}`,\n  ].filter(Boolean).join(\'\\n\\n\');\n\n  const { contexte_chapitre, ...reste } = c; // inutile de stocker le chapitre complet\n  return { json: { ...reste, contexte, mots_cles, questions, augmentation_ok: Boolean(contexte), texte_vectorise } };\n});\n\nconst ratés = sortie.filter(s => !s.json.augmentation_ok).length;\nif (ratés > sortie.length / 2) {\n  throw new Error(`Augmentation échouée sur ${ratés}/${sortie.length} chunks (quota Gemini ?). Index non modifié.`);\n}\nreturn sortie;\n' }, position: [1264, 304] }
});

const vider_l_index = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: { name: 'Vider l\'index', parameters: { operation: 'delete', tableId: 'chunks_livre', matchType: 'allFilters', filters: { conditions: [{ keyName: 'id', condition: 'gt', keyValue: '0' }] } }, credentials: { supabaseApi: newCredential('Supabase account', 'G1LJN6p2BlmWrcyx') }, position: [1472, 304], notes: 'Ré-indexation propre : supprime l\'ancien livre seulement si l\'augmentation a réussi', executeOnce: true, alwaysOutputData: true }
});

const r_cup_rer_les_chunks = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Récupérer les chunks', parameters: { jsCode: '// Le delete Supabase renvoie les lignes supprimées : on repart des chunks augmentés\nreturn $(\'Augmentation\').all().map(i => ({ json: i.json }));' }, position: [1664, 304] }
});

const vectorisation_Supabase = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: { name: 'Vectorisation (Supabase)', parameters: { mode: 'insert', tableName: { __rl: true, mode: 'id', value: 'chunks_livre' }, embeddingBatchSize: 100, options: { queryName: 'match_chunks_livre' } }, credentials: { supabaseApi: newCredential('Supabase account', 'G1LJN6p2BlmWrcyx') }, position: [1904, 304], subnodes: { embedding: embeddings_Google_Gemini_ingestion, documentLoader: chargeur_de_documents } }
});

const chat_question_sur_le_livre = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.1,
  config: { name: 'Chat : question sur le livre', parameters: { options: {} }, position: [64, 1024], webhookId: '7d3f3810-9048-492e-aa06-7ab973f64c0c' }
});

const routing_LLM = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Routing (LLM)', parameters: { promptType: 'define', text: expr('Tu es le module de routage invisible d\'un chatbot qui répond à des questions sur UN livre (en anglais, découpé en chapitres numérotés).\n\nQuestion de l\'utilisateur : """{{ $json.chatInput }}"""\n\nRéponds UNIQUEMENT par un objet JSON valide, sans markdown :\n{\n  "route": "recherche" | "chapitre" | "hors_sujet",\n  "chapitre": <numéro entier si un chapitre précis est demandé, sinon null>,\n  "requete_en": "<la question reformulée EN ANGLAIS, autonome et précise, avec le vocabulaire que le livre emploierait>",\n  "passage_hypothetique": "<2 à 3 phrases EN ANGLAIS, dans le style du livre, qui répondraient à la question>",\n  "reponse_directe": "<seulement si route = hors_sujet : réponse courte en français, sinon chaîne vide>"\n}\n\nRègles :\n- "chapitre" : la question vise explicitement un numéro de chapitre (« chapitre 5 », « ch. 12 », « chapter 3 »).\n- "hors_sujet" : salutations, remerciements, questions sur toi, ou demandes sans aucun rapport avec le livre. Rappelle alors gentiment que tu réponds sur le livre.\n- Dans tous les autres cas, et dans le doute : "recherche".'), batching: {} }, position: [272, 1024], retryOnFail: true, maxTries: 2, subnodes: { model: gemini_routing } }
});

const routing_parse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Routing (parse)', parameters: { jsCode: '// ROUTING : parse la décision du LLM + garde-fous\nconst question = String($(\'Chat : question sur le livre\').first().json.chatInput ?? \'\').trim();\nconst brut = String($input.first().json.text ?? \'\');\n\nlet r = null;\ntry { r = JSON.parse(brut.slice(brut.indexOf(\'{\'), brut.lastIndexOf(\'}\') + 1)); } catch (e) { r = null; }\n\nif (!question) {\n  return [{ json: { route: \'hors_sujet\', question, reponse_directe: \'Pose-moi une question sur le livre 🙂\' } }];\n}\n\nconst ROUTES = [\'recherche\', \'chapitre\', \'hors_sujet\'];\nlet route = ROUTES.includes(r?.route) ? r.route : \'recherche\';\nconst n = parseInt(r?.chapitre, 10);\nlet chapitre = Number.isInteger(n) && n > 0 ? String(n) : null;\n\n// LLM en échec : détection simple "chapitre 12" / "ch. 12" / "chapter 12"\nif (!r) {\n  const m = question.match(/\\b(?:chapitre|chapter|chap\\.?|ch\\.)\\s*(\\d{1,3})\\b/i);\n  if (m) { chapitre = m[1]; route = \'chapitre\'; }\n}\nif (route === \'chapitre\' && !chapitre) route = \'recherche\';\n\nconst requete_en = typeof r?.requete_en === \'string\' ? r.requete_en.trim() : \'\';\nconst hyde = typeof r?.passage_hypothetique === \'string\' ? r.passage_hypothetique.trim() : \'\';\n\nreturn [{\n  json: {\n    route,\n    question,\n    chapitre,\n    requete_en: requete_en || question,\n    // Texte embeddé pour la recherche : requête reformulée (EN) + passage hypothétique (HyDE)\n    requete_recherche: [requete_en, hyde].filter(Boolean).join(\'\\n\') || question,\n    reponse_directe: String(r?.reponse_directe ?? \'\').trim()\n      || "Je suis spécialisé sur ce livre : pose-moi une question sur son contenu.",\n  },\n}];\n' }, position: [480, 1024] }
});

const route = node({
  type: 'n8n-nodes-base.switch',
  version: 3.2,
  config: { name: 'Route', parameters: { rules: { values: [{ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'ef273aff-0b90-486d-b05b-1124c61af2ae', leftValue: expr('{{ $json.route }}'), rightValue: 'hors_sujet', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'hors_sujet' }, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: '5e6b3e99-9720-44c7-ba94-b8a3260cb5d8', leftValue: expr('{{ $json.route }}'), rightValue: 'chapitre', operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: 'chapitre' }] }, options: { fallbackOutput: 'extra', renameFallbackOutput: 'recherche' } }, position: [688, 1024] }
});

const r_ponse_directe = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Réponse directe', parameters: { assignments: { assignments: [{ id: '3eb10e8f-7370-4483-933b-c5de5a781be8', name: 'output', value: expr('{{ $json.reponse_directe }}'), type: 'string' }] }, options: {} }, position: [944, 848] }
});

const recherche_chapitre = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: { name: 'Recherche chapitre', parameters: { mode: 'load', tableName: { __rl: true, mode: 'id', value: 'chunks_livre' }, prompt: expr('{{ $json.requete_recherche }}'), topK: 20, options: { queryName: 'match_chunks_livre', metadata: { metadataValues: [{ name: 'chapitre', value: expr('{{ String($json.chapitre) }}') }] } } }, credentials: { supabaseApi: newCredential('Supabase account', 'G1LJN6p2BlmWrcyx') }, position: [944, 1024], alwaysOutputData: true, subnodes: { embedding: embeddings_Google_Gemini_requ_te } }
});

const contexte_chapitre = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Contexte chapitre', parameters: { jsCode: '// CONTEXTE "CHAPITRE" : tous les morceaux du chapitre demandé, dans l\'ordre (pas de reranking)\nconst r = $(\'Routing (parse)\').first().json;\nconst docs = $input.all().map(i => i.json.document).filter(Boolean);\ndocs.sort((a, b) => Number(a.metadata?.chunk_index ?? 0) - Number(b.metadata?.chunk_index ?? 0));\nreturn [{\n  json: {\n    route: \'chapitre\',\n    question: r.question,\n    contexte: docs.map(d => `[Chapitre ${d.metadata?.chapitre}]\\n${d.metadata?.texte_original || d.pageContent}`).join(\'\\n\\n---\\n\\n\'),\n    nb_extraits: docs.length,\n    sources: docs.map(d => ({ chunk_id: d.metadata?.chunk_id, chapitre: d.metadata?.chapitre })),\n  },\n}];\n' }, position: [1232, 1024] }
});

const r_ponse_LLM = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Réponse (LLM)', parameters: { promptType: 'define', text: expr('Tu es un assistant expert de ce livre. Tu réponds UNIQUEMENT à partir des extraits ci-dessous (en anglais).\n\nQuestion : {{ $json.question }}\n\nExtraits du livre :\n{{ $json.contexte || \'(aucun passage pertinent trouvé)\' }}\n\nConsignes :\n- Réponds dans la langue de la question, de façon précise et structurée, sans remplissage.\n- Appuie chaque affirmation sur les extraits et indique la source entre parenthèses, ex : (ch. 5).\n- Tu peux citer de courts passages en anglais, suivis de leur traduction.\n- Si les extraits ne permettent pas de répondre, dis-le clairement (le livre n\'aborde pas ce point dans les passages retrouvés) et propose une reformulation. N\'utilise aucune connaissance extérieure et n\'invente rien.\n- Ne parle pas « d\'extraits » ni de « contexte » : parle du livre.'), batching: {} }, position: [1920, 1088], retryOnFail: true, maxTries: 2, subnodes: { model: gemini_r_ponse } }
});

const r_ponse_chat = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Réponse chat', parameters: { assignments: { assignments: [{ id: 'cfbdc495-61e9-4355-a907-8a9c4ca839cd', name: 'output', value: expr('{{ $json.text }}'), type: 'string' }] }, options: {} }, position: [2160, 1088] }
});

const recherche_vectorielle = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: { name: 'Recherche vectorielle', parameters: { mode: 'load', tableName: { __rl: true, mode: 'id', value: 'chunks_livre' }, prompt: expr('{{ $json.requete_recherche }}'), topK: 20, options: { queryName: 'match_chunks_livre' } }, credentials: { supabaseApi: newCredential('Supabase account', 'G1LJN6p2BlmWrcyx') }, position: [944, 1312], alwaysOutputData: true, subnodes: { embedding: embeddings_Google_Gemini_requ_te } }
});

const pr_parer_candidats = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer candidats', parameters: { jsCode: '// PRÉPARATION DES CANDIDATS POUR LE RERANKING (dédoublonnage + numérotation)\nconst r = $(\'Routing (parse)\').first().json;\nconst vus = new Set();\nconst candidats = [];\nfor (const it of $input.all()) {\n  const d = it.json.document;\n  if (!d) continue; // 0 résultat → item vide\n  const m = d.metadata ?? {};\n  const cle = m.chunk_id ?? d.pageContent;\n  if (vus.has(cle)) continue;\n  vus.add(cle);\n  candidats.push({\n    n: candidats.length + 1,\n    chunk_id: m.chunk_id ?? null,\n    chapitre: m.chapitre ?? \'?\',\n    chunk_index: Number(m.chunk_index ?? 0),\n    texte: m.texte_original || d.pageContent,\n    score_vectoriel: it.json.score ?? null,\n  });\n}\nconst bloc = candidats.length\n  ? candidats.map(c => `[${c.n}] (Chapitre ${c.chapitre})\\n${c.texte}`).join(\'\\n\\n\')\n  : \'(aucun extrait)\';\nreturn [{ json: { question: r.question, requete_en: r.requete_en, candidats, bloc } }];\n' }, position: [1232, 1312] }
});

const reranking_LLM = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Reranking (LLM)', parameters: { promptType: 'define', text: expr('Tu évalues la pertinence d\'extraits d\'un livre pour répondre à une question.\n\nQuestion : {{ $json.question }}\nReformulation anglaise : {{ $json.requete_en }}\n\nExtraits :\n{{ $json.bloc }}\n\nNote CHAQUE extrait de 0 à 10 :\n10 = répond directement et complètement à la question\n7 = contient une partie importante de la réponse\n4 = lien indirect, contexte utile\n0 = sans rapport\n\nRéponds UNIQUEMENT par un tableau JSON, sans markdown : [{"n": 1, "score": 7}, {"n": 2, "score": 0}, ...]\nS\'il n\'y a aucun extrait, réponds [].'), batching: {} }, position: [1440, 1312], retryOnFail: true, maxTries: 2, subnodes: { model: gemini_reranking } }
});

const s_lection_top_K = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Sélection top-K', parameters: { jsCode: '// SÉLECTION APRÈS RERANKING : seuil de pertinence + top-K\nconst TOP_K = 6;  // extraits envoyés au LLM de réponse\nconst SEUIL = 4;  // note minimale /10 (en dessous : bruit)\nconst prep = $(\'Préparer candidats\').first().json;\nconst brut = String($input.first().json.text ?? \'\');\n\nlet notes = [];\ntry { notes = JSON.parse(brut.slice(brut.indexOf(\'[\'), brut.lastIndexOf(\']\') + 1)); } catch (e) { notes = []; }\nconst parN = new Map((Array.isArray(notes) ? notes : [])\n  .map(x => [Number(x?.n), Number(x?.score)])\n  .filter(([n, s]) => Number.isFinite(n) && Number.isFinite(s)));\n\nlet retenus;\nif (parN.size === 0) {\n  retenus = prep.candidats.slice(0, TOP_K); // reranker en échec → ordre vectoriel\n} else {\n  retenus = prep.candidats\n    .map(c => ({ ...c, score_rerank: parN.get(c.n) ?? 0 }))\n    .filter(c => c.score_rerank >= SEUIL)\n    .sort((a, b) => b.score_rerank - a.score_rerank || a.n - b.n)\n    .slice(0, TOP_K);\n}\n// Ordre de lecture du livre pour un contexte cohérent\nretenus.sort((a, b) => a.chunk_index - b.chunk_index);\n\nreturn [{\n  json: {\n    route: \'recherche\',\n    question: prep.question,\n    contexte: retenus.map(c => `[Chapitre ${c.chapitre}]\\n${c.texte}`).join(\'\\n\\n---\\n\\n\'),\n    nb_extraits: retenus.length,\n    sources: retenus.map(c => ({ chunk_id: c.chunk_id, chapitre: c.chapitre, score_rerank: c.score_rerank ?? null })),\n  },\n}];\n' }, position: [1680, 1312] }
});

const wf = workflow('zzdixk38ZELQDWsh', 'RAG livre', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(formulaire_envoyer_le_livre_PDF)
  .to(extraction_pdf)
  .to(nettoyage)
  .to(chunking)
  .to(limit_test)
  .to(augmentation_LLM)
  .to(augmentation)
  .to(vider_l_index)
  .to(r_cup_rer_les_chunks)
  .to(vectorisation_Supabase)
  .add(chat_question_sur_le_livre)
  .to(routing_LLM)
  .to(routing_parse)
  .to(route.onCase(0, r_ponse_directe).onCase(1, recherche_chapitre
    .to(contexte_chapitre)
    .to(r_ponse_LLM)
    .to(r_ponse_chat)).onCase(2, recherche_vectorielle
    .to(pr_parer_candidats)
    .to(reranking_LLM)
    .to(s_lection_top_K)
    .to(r_ponse_LLM)))