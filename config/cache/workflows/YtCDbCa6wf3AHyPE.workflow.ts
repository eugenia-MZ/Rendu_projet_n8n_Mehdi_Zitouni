const google_Gemini_Chat_Model1 = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.1, config: { name: 'Google Gemini Chat Model1', parameters: { modelName: 'models/gemini-flash-lite-latest', options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [224, 672] } });
const embeddings_Google_Gemini = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'EZ4cTLaSrn7ILwAP') }, position: [480, 576] } });
const simple_Vector_Store = tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreInMemory', version: 1.3, config: { name: 'Simple Vector Store', parameters: { mode: 'retrieve-as-tool', memoryKey: { __rl: true, mode: 'list', value: 'vector_store_key' } }, position: [400, 368], subnodes: { embedding: embeddings_Google_Gemini } } });

const on_form_submission = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: { name: 'On form submission', parameters: { formTitle: 'livre_pdf', formFields: { values: [{ fieldLabel: 'Livre', fieldType: 'file' }] }, options: {} }, webhookId: '2c579e3c-afdf-4a24-ba98-6b8ba39bdf83' }
});

const extract_from_File = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.1,
  config: { name: 'Extract from File', parameters: { operation: 'pdf', binaryPropertyName: 'Livre', options: {} }, position: [224, 0] }
});

const when_chat_message_received = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.5,
  config: { name: 'When chat message received', parameters: { public: true, options: {} }, position: [0, 192], webhookId: '3c214ea3-8eef-4e9f-a953-3869f92df211' }
});

const aI_Agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: { name: 'AI Agent', parameters: { options: {} }, position: [224, 192], subnodes: { model: google_Gemini_Chat_Model1, tools: [simple_Vector_Store] } }
});

const wf = workflow('YtCDbCa6wf3AHyPE', 'Book Summary Interview Agent', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(on_form_submission)
  .to(extract_from_File)
  .add(when_chat_message_received)
  .to(aI_Agent)