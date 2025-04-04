# Используемые технологии

## Фронтенд
- Next.js 14 - Фреймворк для React приложений
- React - Библиотека для разработки пользовательских интерфейсов
- TypeScript - Типизированный JavaScript
- Tailwind CSS 4.0 - Утилитарный CSS-фреймворк
- shadcn/ui - Компонентная библиотека на основе Radix UI
- lucide-react - Библиотека иконок
- framer-motion - Библиотека для анимаций
- zustand - Библиотека для управления состоянием
- sonner - Библиотека для уведомлений (тостов)
- date-fns - Библиотека для работы с датами
- TanStack Query (React Query) - Библиотека для управления и кэширования асинхронных запросов
- usehooks-ts - Коллекция полезных React-хуков, включая useDebounceValue для отложенного поиска
- React Hook Form - Библиотека для работы с формами
- Zod - Библиотека для валидации схем данных
- Tailwind Merge - Утилита для объединения классов Tailwind CSS
- clsx - Утилита для условного формирования имен классов
- @hookform/resolvers - Интеграция валидаторов с React Hook Form

## Бэкенд
- tRPC - Типобезопасный API
- Prisma - ORM для работы с базой данных
- PostgreSQL - Реляционная база данных
- JSON Web Tokens (JWT) - Для аутентификации пользователей
- cookie-parser - Для работы с cookies
- @trpc/server - Для создания типизированного API сервера
- @trpc/client - Для интеграции с API сервера
- Prisma Middleware - Для логирования операций с базой данных
- AuditLog модель - Для хранения истории изменений объектов (entity, changes, user, timestamp)

## Структура данных
- Модели Prisma с использованием различных типов отношений:
  - One-to-Many: User-WorkSession, Card-CardBalance, и др.
  - Many-to-Many: WorkSession-IdexCabinet (через промежуточную таблицу WorkSessionIdexCabinet)
- Аудит изменений с использованием AuditLog модели
- Связи для каскадного удаления (onDelete: Cascade)

## Функции
- Аутентификация по passCode
- Защищенные маршруты
- Отслеживание рабочих сессий
- Управление кабинетами Idex в любых сессиях (включая завершенные)
- Редактирование состава кабинетов в завершенных сессиях
- Статистика транзакций
- Управление балансами и операциями пролива карт

## Инструменты разработки
- ESLint - Линтер для JavaScript/TypeScript
- Prettier - Форматирование кода
- TypeScript - Статическая типизация
- pnpm - Package manager
- TypeScript ESLint - TypeScript плагин для ESLint
