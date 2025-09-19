# Development Roadmap

План разработки MISC системы с использованием TDD и Clean Architecture.

## Принципы разработки

1. **TDD First**: Сначала тесты, потом реализация
2. **Inside-Out**: От домена к внешним слоям
3. **Incremental**: Маленькие итерации с работающим кодом
4. **No Mocks in Domain**: Доменный слой тестируется без моков
5. **CI from Day One**: Непрерывная интеграция с первого коммита

## Фазы разработки

### Фаза 0: Инициализация проекта (1-2 дня)

#### Задачи:

```yaml
- [ ] Создать репозиторий и базовую структуру
- [ ] Настроить yarn workspaces
- [ ] Настроить TypeScript конфигурацию
- [ ] Настроить Jest для всех пакетов
- [ ] Настроить ESLint и Prettier
- [ ] Настроить pre-commit hooks (Husky)
- [ ] Настроить GitHub Actions для CI
- [ ] Создать базовые package.json для всех пакетов
```

#### Критерии готовности:
- Можно запустить `yarn test` в любом пакете
- CI запускается при push и проверяет линтинг и тесты
- Структура папок соответствует project-structure.md

### Фаза 1: Domain Layer (3-5 дней)

#### Порядок реализации:

##### День 1: Value Objects
```yaml
Morning:
- [ ] RecordId с тестами (TDD)
- [ ] TagId с тестами (TDD)
- [ ] RecordContent с тестами (TDD)

Afternoon:
- [ ] SearchQuery с тестами (TDD)
- [ ] Фабрики для Value Objects
- [ ] Интеграция и рефакторинг
```

##### День 2: Entities
```yaml
Morning:
- [ ] Tag entity с тестами (TDD)
- [ ] TagFactory с тестами

Afternoon:
- [ ] Record entity с тестами (TDD)
- [ ] RecordFactory с тестами
- [ ] Проверка инвариантов
```

##### День 3: Domain Services
```yaml
Morning:
- [ ] TagNormalizer с тестами (TDD)
- [ ] TagValidator с тестами (TDD)
- [ ] TagParser с тестами (TDD)

Afternoon:
- [ ] RecordMatcher с тестами (TDD)
- [ ] RecordDuplicateChecker с тестами (TDD)
```

##### День 4: Domain Errors и интеграция
```yaml
Morning:
- [ ] Все Domain Errors с тестами
- [ ] Result тип и утилиты

Afternoon:
- [ ] Интеграционные тесты домена
- [ ] Рефакторинг и оптимизация
- [ ] Документация публичного API
```

#### Метрики успеха:
- Покрытие тестами > 95%
- Все тесты проходят < 1 сек
- Нет зависимостей кроме shared пакета

### Фаза 2: Application Layer (4-5 дней)

#### Порядок реализации:

##### День 1: Базовая инфраструктура
```yaml
Morning:
- [ ] Порты (Repository интерфейсы)
- [ ] Базовые DTO
- [ ] ApplicationError иерархия

Afternoon:
- [ ] ApplicationConfig
- [ ] Моки репозиториев для тестов
```

##### День 2-3: Core Use Cases
```yaml
CreateRecord:
- [ ] Тесты для CreateRecord (TDD)
- [ ] Реализация CreateRecord
- [ ] Интеграционные тесты

SearchRecords:
- [ ] Тесты для SearchRecords (TDD)
- [ ] Реализация SearchRecords
- [ ] SearchModeDetector сервис

UpdateRecord & DeleteRecord:
- [ ] Тесты для UpdateRecord (TDD)
- [ ] Реализация UpdateRecord
- [ ] Тесты для DeleteRecord (TDD)
- [ ] Реализация DeleteRecord
```

##### День 4: Import/Export
```yaml
Morning:
- [ ] ImportValidator с тестами
- [ ] ExportFormatter с тестами

Afternoon:
- [ ] ImportData use case (TDD)
- [ ] ExportData use case (TDD)
```

##### День 5: Дополнительные сервисы
```yaml
Morning:
- [ ] GetTagSuggestions use case (TDD)
- [ ] TagCloudBuilder сервис

Afternoon:
- [ ] ApplicationContainer
- [ ] Интеграционные тесты
- [ ] Документация
```

#### Метрики успеха:
- Покрытие тестами > 90%
- Use cases не зависят от деталей реализации
- Все операции возвращают Result тип

### Фаза 3: Infrastructure Layer - localStorage (3-4 дня)

#### Порядок реализации:

##### День 1: Storage Manager
```yaml
Morning:
- [ ] StorageSchema определение
- [ ] StorageManager с тестами (TDD)
- [ ] Сериализация/десериализация

Afternoon:
- [ ] IndexManager с тестами (TDD)
- [ ] Оптимизация индексов
```

##### День 2: Repositories
```yaml
Morning:
- [ ] LocalStorageRecordRepository (TDD)
- [ ] CRUD операции с тестами

Afternoon:
- [ ] LocalStorageTagRepository (TDD)
- [ ] Поиск и автодополнение
```

##### День 3: Unit of Work и миграции
```yaml
Morning:
- [ ] LocalStorageUnitOfWork
- [ ] Транзакционность операций

Afternoon:
- [ ] MigrationManager
- [ ] Версионирование схемы
```

##### День 4: Интеграция и оптимизация
```yaml
- [ ] Интеграционные тесты с реальным localStorage
- [ ] Тесты производительности
- [ ] Обработка edge cases (quota exceeded)
- [ ] Документация
```

#### Метрики успеха:
- Поиск 10,000 записей < 100ms
- Сохранение < 50ms
- Корректная обработка localStorage limits

### Фаза 4: Presentation Layer - Web (5-6 дней)

#### Порядок реализации:

##### День 1: Базовая инфраструктура React
```yaml
Morning:
- [ ] Настройка Vite
- [ ] Базовые компоненты и стили
- [ ] Контексты и провайдеры

Afternoon:
- [ ] ApplicationContext setup
- [ ] Интеграция с Application layer
```

##### День 2: Основной UI
```yaml
Morning:
- [ ] SearchInput компонент (TDD)
- [ ] Debounce и keyboard handling

Afternoon:
- [ ] RecordList компонент (TDD)
- [ ] RecordItem с действиями
```

##### День 3: Tag Cloud и автодополнение
```yaml
Morning:
- [ ] TagCloud компонент (TDD)
- [ ] Интерактивность и анимации

Afternoon:
- [ ] AutoComplete компонент (TDD)
- [ ] Интеграция с SearchInput
```

##### День 4: Import/Export UI
```yaml
Morning:
- [ ] ImportExport компоненты
- [ ] Диалоги и прогресс

Afternoon:
- [ ] Обработка ошибок
- [ ] Валидация на клиенте
```

##### День 5: Интеграция и полировка
```yaml
Morning:
- [ ] Keyboard shortcuts
- [ ] Адаптивный дизайн
- [ ] Темная тема (опционально)

Afternoon:
- [ ] E2E тесты основных сценариев
- [ ] Оптимизация производительности
```

##### День 6: Финализация
```yaml
- [ ] Accessibility (a11y) проверки
- [ ] Performance аудит
- [ ] Bundle size оптимизация
- [ ] Документация компонентов
```

#### Метрики успеха:
- Lighthouse score > 90
- Bundle size < 500KB (gzipped)
- FCP < 1.5s, TTI < 3s
- 100% keyboard navigable

### Фаза 5: CLI версия (3-4 дня) [Опционально]

#### Порядок реализации:

##### День 1: Базовая структура
```yaml
- [ ] Настройка Ink
- [ ] Базовые компоненты CLI
- [ ] Интеграция с Application layer
```

##### День 2: Команды
```yaml
- [ ] add команда
- [ ] search команда
- [ ] update/delete команды
```

##### День 3: Import/Export и финализация
```yaml
- [ ] import/export команды
- [ ] Автодополнение для shell
- [ ] Man pages
```

#### Метрики успеха:
- Все основные операции доступны
- Время отклика < 100ms
- Работает в pipe chains

## Контрольные точки

### После каждой фазы:

1. **Code Review Checklist**:
   - [ ] Покрытие тестами соответствует целям
   - [ ] Нет нарушений Clean Architecture
   - [ ] Код соответствует линтеру
   - [ ] Документация обновлена

2. **Performance Check**:
   - [ ] Тесты выполняются быстро
   - [ ] Нет утечек памяти
   - [ ] Целевые метрики достигнуты

3. **Integration Check**:
   - [ ] CI проходит полностью
   - [ ] Можно собрать production build
   - [ ] E2E тесты проходят

## Инструменты разработки

### Обязательные:
- **IDE**: VS Code с расширениями для TypeScript
- **Node.js**: 22.18.0
- **Yarn**: v3+ (Berry)
- **Git**: Conventional Commits

### Рекомендуемые расширения VS Code:
- ESLint
- Prettier
- Jest Runner
- GitLens
- Better Comments
- TODO Highlight

### Команды для разработки:

```bash
# Инициализация проекта
yarn install
yarn build

# Разработка домена
cd packages/domain
yarn test:watch

# Разработка приложения
cd packages/application
yarn test:watch

# Запуск web версии
yarn dev:web

# Проверка покрытия
yarn test:coverage

# Полная проверка перед коммитом
yarn lint && yarn test && yarn build
```

## Риски и митигация

### Технические риски:

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Сложность Clean Architecture | Средняя | Начать с простейшей реализации, рефакторить по мере роста |
| Производительность localStorage | Низкая | Профилирование с первого дня, индексы |
| Большой bundle size | Средняя | Code splitting, lazy loading, tree shaking |

### Организационные риски:

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Переусложнение на старте | Высокая | Фокус на MVP функциональности |
| Долгий рефакторинг | Средняя | Маленькие итерации, постоянный рефакторинг |
| Потеря фокуса | Средняя | Чёткие критерии готовности для каждой фазы |

## Definition of Done

### Для каждой задачи:
- [ ] Тесты написаны и проходят
- [ ] Код соответствует линтеру
- [ ] Документация написана
- [ ] PR создан и прошёл review
- [ ] CI проходит полностью

### Для каждой фазы:
- [ ] Все задачи выполнены
- [ ] Целевые метрики достигнуты
- [ ] Интеграционные тесты проходят
- [ ] Документация актуальна
- [ ] Нет критических багов

## Первые шаги

1. **Создать репозиторий**
   ```bash
   git init misc
   cd misc
   ```

2. **Инициализировать yarn workspaces**
   ```bash
   yarn init -y
   yarn set version berry
   yarn config set nodeLinker node-modules
   ```

3. **Создать базовую структуру**
   ```bash
   mkdir -p packages/{domain,application,shared}
   mkdir -p packages/infrastructure/localStorage
   mkdir -p packages/presentation/{web,cli}
   ```

4. **Настроить TypeScript и Jest**
   ```bash
   yarn add -D typescript jest @types/jest ts-jest
   yarn add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
   yarn add -D prettier eslint-config-prettier
   ```

5. **Создать первый тест**
   ```typescript
   // packages/domain/tests/value-objects/RecordId.test.ts
   describe('RecordId', () => {
     it('should generate unique UUID when created without value', () => {
       // Red phase - тест должен упасть
       expect(true).toBe(false);
     });
   });
   ```

6. **Запустить TDD цикл**
   ```bash
   cd packages/domain
   yarn test:watch
   ```

И начать реализацию через Red-Green-Refactor!

## Полезные ресурсы

- [Clean Architecture by Robert Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Test-Driven Development by Kent Beck](https://www.kentbeck.com/)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Заметки для разработчиков

### TDD цикл:
1. **Red**: Написать тест, который не проходит
2. **Green**: Написать минимальный код для прохождения теста
3. **Refactor**: Улучшить код, сохраняя зелёные тесты

### Clean Architecture checklist:
- [ ] Домен не знает о других слоях
- [ ] Application оркестрирует, но не содержит бизнес-логику
- [ ] Infrastructure реализует интерфейсы из Application
- [ ] Presentation использует только Application layer
- [ ] Зависимости направлены внутрь

### Приоритеты:
1. **Работающий код** > Идеальная архитектура
2. **Простота** > Гибкость на будущее
3. **Тесты** > Документация
4. **Рефакторинг** > Переписывание с нуля

Удачной разработки! 🚀
