const when_clicking_Execute_workflow = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'When clicking \u2018Execute workflow\u2019' }
});

const rSS_Read = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: { name: 'RSS Read', parameters: { url: 'https://www.reddit.com/r/PokemonTCGdeals/new/.rss', options: {} }, position: [256, 0] }
});

const aggregate = node({
  type: 'n8n-nodes-base.aggregate',
  version: 1,
  config: { name: 'Aggregate', parameters: { aggregate: 'aggregateAllItemData', destinationFieldName: 'articles', options: {} }, position: [480, 0] }
});

const send_a_message = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: { name: 'Send a message', parameters: { sendTo: 'mzitouni@eugeniaschool.com', subject: 'Alertes Coffret Pokémon 30 ans', message: expr('{{ $json.articles.map(a => "[" + a.title + "](" + a.link + ")").join("\\n\\n") }}'), options: {} }, credentials: { gmailOAuth2: newCredential('Gmail account', 'pYTpTmftlAws0qHX') }, position: [752, 0], webhookId: '3b1dc486-7084-4d65-9a14-b8cd63254a9c' }
});

const wf = workflow('NH71fiB1E1KyGCHL', 'Demo Eugenia Premier Workflow', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(when_clicking_Execute_workflow)
  .to(rSS_Read)
  .to(aggregate)
  .to(send_a_message)