// Тесты парсинга ответа LLM (parseLlmResponse) — без сети и БД.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLlmResponse } from '../src/server/llm.js';

test('parse: чистый JSON', () => {
  const r = parseLlmResponse('{"text":"Привет","state":{"name":"Миша"}}');
  assert.equal(r?.text, 'Привет');
  assert.deepEqual(r?.state, { name: 'Миша' });
});

test('parse: JSON в ```json-обёртке', () => {
  const r = parseLlmResponse('```json\n{"text":"Ок"}\n```');
  assert.equal(r?.text, 'Ок');
});

test('parse: текст до JSON (болтовня модели)', () => {
  const r = parseLlmResponse('Конечно! Вот данные:\n{"text":"Записала","state":{"weight":7100}}');
  assert.equal(r?.text, 'Записала');
  assert.deepEqual(r?.state, { weight: 7100 });
});

test('parse: choices массив строк', () => {
  const r = parseLlmResponse('{"text":"Вопрос?","choices":["Да","Нет"],"multi":true}');
  assert.deepEqual(r?.choices, ['Да', 'Нет']);
  assert.equal(r?.multi, true);
});

test('parse: обрезанный JSON восстанавливается закрытием скобок', () => {
  const r = parseLlmResponse('{"text":"Привет","state":{"name":"Миша"}');
  assert.equal(r?.text, 'Привет');
  assert.deepEqual(r?.state, { name: 'Миша' });
});

test('parse: только text (state потерян при обрыве) — парсится text', () => {
  const r = parseLlmResponse('Тут какой-то ответ {"text":"Частичный"}');
  assert.equal(r?.text, 'Частичный');
});

test('parse: ui извлекается из строки между text и ui', () => {
  const r = parseLlmResponse('{"text":"Ответ","ui":"<div>панель</div>"}');
  assert.equal(r?.text, 'Ответ');
  assert.ok(r?.ui && r.ui.includes('панель'));
});

test('parse: не-JSON без text → null', () => {
  const r = parseLlmResponse('просто текст без данных');
  assert.equal(r, null);
});

test('parse: choices сжимаются до 6', () => {
  const r = parseLlmResponse('{"text":"Вопрос?","choices":["1","2","3","4","5","6","7","8"]}');
  assert.equal(r?.choices?.length, 6);
});
