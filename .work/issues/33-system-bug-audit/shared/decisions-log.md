# Decisions Log

| # | Decision | Reasoning |
|---|----------|-----------|
| 1 | High priority на empty catch blocks | Молчаливое проглатывание ошибок делает систему ненаблюдаемой |
| 2 | High priority на command injection | Security vulnerability, может быть эксплуатацией |
| 3 | High priority на typo | Влияет на корректность данных в пайплайне |
| 4 | Medium priority на ReDoS | В production LLM output может вызвать зависание |
| 5 | Medium priority на duplicate code | Увеличивает maintenance cost при изменениях |
