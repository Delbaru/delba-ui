# @delba/frontend

Общая React-библиотека UI-примитивов и визуальных механизмов для Delba.
Frontend владеет механикой компонентов, CSS/JS-проекциями и Next integration.
Приложение задаёт тему, D-роли и композицию экранов.

- [Архитектура](docs/architecture.md) описывает композицию, общие механизмы и публичные входы.
- [Конфигурация](docs/configuration.md) описывает один полный FrontendConfig, RPX, responsive и доставку стилей.
- [Разработка](docs/development.md) задаёт структуру, тестовые исходники и приёмку.
- [Компоненты](docs/components.md) перечисляет публичный React API и примеры.

Добавь `delba-frontend` в workspace и `"@delba/frontend": "workspace:*"` в
зависимости приложения. Peer dependencies и package exports перечислены
в [package.json](package.json). Приложение передаёт один полный конфиг адаптеру
`withFrontend` и при использовании Toolkit указывает ту же секцию `delbaFrontend`.
React-входы автоматически подключают стили пакета.
Пример интеграции — [конфигурация](docs/configuration.md).

Для нейтрального контейнера поставь Flex в block flow, для раскрываемых
разделов используй Accordion.Item. Компоненты используют общий договор структуры
и каналы Motion по типу конкретного DOM-хоста. Настройки и примеры —
[компоненты](docs/components.md).

Инструкции для агентов — [AGENTS.md](AGENTS.md). Текущий пакет находится в
SOURCE ONLY. Исполняемая приёмка отложена до отдельного разрешения.
