const when_clicking_Execute_workflow = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'When clicking \u2018Execute workflow\u2019', position: [0, 96] }
});

const hTTP_Request = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'HTTP Request', parameters: { url: 'https://jsonplaceholder.typicode.com/users', options: {} }, position: [224, 0] }
});

const filter = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: { name: 'Filter', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ id: '3f8b63a4-e9bc-4746-ad03-bec1092c4a06', leftValue: expr('{{ $json.email }}'), rightValue: '@', operator: { type: 'string', operation: 'contains' } }, { id: '22d2dfcf-51a1-470f-953c-9763c17e25ef', leftValue: expr('{{ $json.id }}'), rightValue: 5, operator: { type: 'number', operation: 'lte' } }], combinator: 'and' }, options: {} }, position: [448, 0] }
});

const edit_Fields = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Edit Fields', parameters: { assignments: { assignments: [{ id: '5ecfdfe6-b222-458a-a5bd-9dc35e63debb', name: 'name', value: expr('Mehdi Zitouni'), type: 'string' }] }, options: {} }, position: [672, 0] }
});

const merge_node = merge({
  version: 3.2,
  config: { name: 'Merge', parameters: { mode: 'combine', combineBy: 'combineAll', options: {} }, position: [896, 96] }
});

const limit = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limit', position: [672, 192] }
});

const code_in_JavaScript = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Code in JavaScript', parameters: { jsCode: 'return [{\n  json: { date_export: new Date().toISOString(), systeme_source: "JSONPlaceholder" }\n}];' }, position: [448, 192] }
});

const wf = workflow('CQxpHU4odLlCLZPF', 'Workflow avec IA', { executionOrder: 'v1', binaryMode: 'separate', availableInMCP: true });

export default wf
  .add(when_clicking_Execute_workflow
  .to([
    hTTP_Request
    .to(filter)
    .to(edit_Fields),
    code_in_JavaScript
    .to(limit)]))
  .add(edit_Fields.to(merge_node.input(0)))
  .add(limit.to(merge_node.input(1)))