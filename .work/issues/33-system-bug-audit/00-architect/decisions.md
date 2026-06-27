# Key Decisions

1. **Безопасность важнее всего** — command injection в crewai/metagpt адаптерах блокирует production-ready
2. **Empty catch blocks** — 4 места, где ошибки файловой системы и JSON парсинга бесшумно теряются
3. **Undeclared dependencies** — express и @octokit/rest используются но не указаны в package.json
4. **Дублирование кода** — 3 случая: validate-output (2 копии), walk-функция (2 копии), sanitize-функции (2 копии)
5. **Типография** — `objectiv` вместо `objective` в agent-runtime.js может вызвать баги в state management
