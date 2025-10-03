# Task 11: Fix ES Module Resolution Errors - Detailed Guide

## 🎯 Цель задачи

Исправить критическую проблему, которая **блокирует запуск backend сервера**. Backend не может стартовать из-за ошибки разрешения ES модулей.

## 🔴 Текущая проблема

### Симптомы
```
Error: Cannot find module '/home/alapygin/projects/misc/packages/domain/dist/tag-normalizer'
imported from /home/alapygin/projects/misc/packages/domain/dist/index.js
```

### Причина
**Несоответствие между TypeScript и Node.js ESM:**

1. **package.json** имеет `"type": "module"` → Node.js работает в ESM режиме
2. **TypeScript** компилирует импорты БЕЗ расширений `.js`:
   ```javascript
   export { TagNormalizer } from './tag-normalizer';  // ❌ Без .js
   ```
3. **Node.js ESM** требует ЯВНЫЕ расширения:
   ```javascript
   export { TagNormalizer } from './tag-normalizer.js';  // ✅ С .js
   ```

### Затронутые пакеты
- `packages/domain` - основной источник проблемы
- `packages/backend` - не может запуститься
- `packages/infrastructure/postgresql` - может иметь ту же проблему
- `packages/shared` - используется везде

## 📋 Два возможных решения

### Решение 1: Переход на CommonJS (Быстрое, но устаревшее)

**Плюсы:**
- ✅ Быстро реализуется (10-15 минут)
- ✅ Просто тестировать
- ✅ Гарантированно работает

**Минусы:**
- ❌ Устаревшая технология
- ❌ Нет tree-shaking
- ❌ Хуже производительность бандлера

**Шаги:**
1. Удалить `"type": "module"` из всех `package.json`
2. Обновить tsconfig.json: `"module": "commonjs"`
3. Пересобрать: `yarn build:packages`
4. Проверить: `yarn workspace @misc-poc/backend start`

### Решение 2: Правильная настройка ESM (Правильное, современное)

**Плюсы:**
- ✅ Современный подход
- ✅ Лучшая производительность
- ✅ Tree-shaking
- ✅ Соответствует будущим стандартам

**Минусы:**
- ❌ Сложнее настроить (30-60 минут)
- ❌ Требует изменений в исходниках
- ❌ Больше тестирования

**Шаги:**

#### Вариант 2A: TypeScript 5.0+ with `moduleResolution: "bundler"`
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ES2020",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true
  }
}
```

**Проблема:** TypeScript всё равно не добавит `.js` в emit!

#### Вариант 2B: Добавить `.js` в исходниках TypeScript (ПРАВИЛЬНЫЙ)

**В исходных .ts файлах писать:**
```typescript
// packages/domain/src/index.ts
export { TagNormalizer } from './tag-normalizer.js';  // ← .js в .ts файле!
export { TagValidator } from './tag-validator.js';
export { TagParser } from './tag-parser.js';
// ... и т.д.
```

**TypeScript будет жаловаться, но скомпилирует правильно!**

Настроить tsconfig:
```json
{
  "compilerOptions": {
    "module": "ES2020",
    "moduleResolution": "node",
    "allowImportingTsExtensions": false
  }
}
```

#### Вариант 2C: Использовать TypeScript плагин/трансформер

Использовать пакет `typescript-transform-paths` или `@zerollup/ts-transform-paths`

## 🎯 Рекомендуемый подход

### Фаза 1: Быстрый фикс (для разблокировки разработки)

**Используй Решение 1 (CommonJS)** чтобы быстро разблокировать backend:

```bash
# 1. Удалить "type": "module" из package.json
find packages -name package.json -type f -exec sed -i '/"type": "module",/d' {} \;

# 2. Обновить tsconfig в корне
# Изменить "module": "ES2020" → "module": "commonjs"

# 3. Пересобрать всё
yarn build:packages

# 4. Проверить backend
yarn workspace @misc-poc/backend start

# 5. Запустить тесты
yarn validate
```

### Фаза 2: Правильное решение (после разблокировки)

Создать отдельную ветку и реализовать **Решение 2B** (ESM с .js расширениями в исходниках).

## ⚠️ КРИТИЧЕСКИ ВАЖНО

### Перед началом работы:

1. **Создай отдельную ветку:**
   ```bash
   git checkout -b fix/es-modules-task-11
   ```

2. **Сделай бэкап текущего состояния:**
   ```bash
   git stash save "backup before ES modules fix"
   ```

3. **Проверь текущие зависимости:**
   ```bash
   tm show 11  # Задачи 1, 3, 5 должны быть done
   ```

### После изменений:

1. **ОБЯЗАТЕЛЬНО запусти полную валидацию:**
   ```bash
   yarn validate  # НЕ validate:fast!
   ```

2. **Проверь запуск backend:**
   ```bash
   # Запусти PostgreSQL
   docker compose up -d postgres

   # Собери backend
   yarn workspace @misc-poc/backend build

   # Запусти backend
   yarn workspace @misc-poc/backend start

   # В другом терминале протестируй API
   curl http://localhost:3001/api/tags
   ```

3. **Проверь все пакеты:**
   ```bash
   yarn build:packages
   yarn tsc
   yarn test
   ```

## 📚 Полезные ресурсы для Context7

Перед началом работы получи документацию:

```bash
# TypeScript ESM configuration
mcp__context7__get-library-docs('/microsoft/TypeScript', {
  topic: 'ES modules configuration',
  tokens: 8000
})

# Node.js ESM
mcp__context7__get-library-docs('/nodejs/node', {
  topic: 'ECMAScript modules',
  tokens: 8000
})
```

## 🧪 План тестирования

### Минимальные проверки:
- [ ] `yarn build:packages` - без ошибок
- [ ] `yarn tsc` - без ошибок
- [ ] `yarn workspace @misc-poc/backend start` - сервер запускается
- [ ] `curl http://localhost:3001/api/tags` - API отвечает

### Полная валидация:
- [ ] `yarn validate` - все тесты проходят (100%)
- [ ] Backend стартует и обрабатывает запросы
- [ ] Frontend собирается и работает
- [ ] Все интеграционные тесты проходят

## 💡 Подсказки из прошлого опыта

1. **НЕ торопись** - эта задача влияет на всю инфраструктуру
2. **Тестируй каждый шаг** - одно изменение → проверка
3. **Используй git stash** - чтобы быстро откатываться
4. **Проверяй Docker** - если интеграционные тесты падают, проверь `docker ps`
5. **Читай ошибки внимательно** - TypeScript даёт очень подробные сообщения

## 🎯 Критерии успеха

Задача считается выполненной, когда:

1. ✅ Backend сервер запускается без ошибок
2. ✅ Все пакеты успешно собираются
3. ✅ Все тесты проходят (100%, не менее 46 в PostgreSQL)
4. ✅ API эндпоинты отвечают корректно
5. ✅ Нет ошибок импорта модулей в консоли
6. ✅ `yarn validate` проходит полностью

## 🔗 Связанные файлы

### Конфигурация TypeScript:
- `/home/alapygin/projects/misc/tsconfig.json` - корневой конфиг
- `/home/alapygin/projects/misc/packages/domain/tsconfig.json`
- `/home/alapygin/projects/misc/packages/backend/tsconfig.json`
- `/home/alapygin/projects/misc/packages/infrastructure/postgresql/tsconfig.json`

### Package.json файлы:
- `/home/alapygin/projects/misc/packages/domain/package.json` - содержит `"type": "module"`
- `/home/alapygin/projects/misc/packages/backend/package.json`

### Проблемные импорты:
- `/home/alapygin/projects/misc/packages/domain/src/index.ts` - главный файл экспорта
- `/home/alapygin/projects/misc/packages/domain/dist/index.js` - скомпилированный (с ошибкой)

## 🚀 Быстрый старт в новой сессии

```bash
# 1. Проверь статус задачи
tm show 11

# 2. Отметь как in-progress
tm set-status --id=11 --status=in-progress

# 3. Создай ветку
git checkout -b fix/es-modules-task-11

# 4. Получи документацию через Context7
# (см. раздел "Полезные ресурсы")

# 5. Начни с быстрого фикса (CommonJS)
# или сразу с правильного решения (ESM)

# 6. После каждого изменения тестируй!
```

---

**Удачи! Это важная задача, которая разблокирует ручное тестирование backend API.**
