# oui — beyond the ordinary

Браузерная космическая аркада на React, Vite, TypeScript и Three.js. Это WebGL-прототип, а не Unreal Engine-проект или Windows EXE. Иллюстрация на станции — отдельный концепт-арт; игровой полёт использует процедурные 3D-модели.

## Локальный запуск

Установите Node.js 22 LTS. В терминале в корне проекта выполните:

```sh
npm install
npm run dev
```

Откройте адрес из терминала. Остановить сервер: Ctrl+C. Проверка: `npx tsc --noEmit`. Production: `npm run build`, затем `npm run preview`.

## Управление

| Клавиша | Действие |
| --- | --- |
| W / S или ↑ / ↓ | Движение вверх / вниз |
| A / D или ← / → | Движение влево / вправо |
| Q / E | Крен |
| R / F | Вертикальная тяга |
| Shift (удерживать) | Форсаж, расход энергии |
| Space | Рывок в сторону движения, перезарядка 3 секунды |
| X (удерживать) | Торможение |
| C | Камера за кораблём / от первого лица |
| Esc | Пауза / продолжить |

На телефоне есть экранные стрелки и форсаж. При потере фокуса игра автоматически ставится на паузу.

## Игровой цикл

Один коридор длиной 5,5 км с процедурным астероидным полем, планетой, гравитационной зоной (2,2–3,3 км), инерцией, ограниченным форсажем, щитом и рестартом. Малые столкновения снимают 22 щита, крупные — 45. Через 8 секунд без урона щит восстанавливается. Финиш открывает «Спектр» с повышенной базовой скоростью. Результаты, корабль и настройки сохраняются в localStorage этого браузера. Выход до финиша или разрушения не записывается как завершённый полёт.

Полёт аркадный и ограничен коридором; это не полноценная симуляция 6 DOF. Нет мультиплеера, облачных сохранений, полноценного кокпита, 5–8 кораблей, редактора уровней и точных mesh-коллайдеров. Столкновения упрощены до сфер. FPS зависит от устройства; есть режим производительности.

## Деплой на GitHub Pages — пошагово

Репозиторий: https://github.com/alitojcubekov206-svg/oui

Публикацию выполняет владелец репозитория. Здесь нет утверждения, что сайт уже опубликован.

### Вариант 1: GitHub Desktop (проще)

1. Установите GitHub Desktop и войдите в аккаунт, имеющий права записи в репозиторий.
2. `File → Clone repository` (Ctrl+Shift+O) → вкладка URL → вставьте `https://github.com/alitojcubekov206-svg/oui.git` → Clone.
3. `Repository → Show in Explorer` (Ctrl+Shift+F). Скопируйте сюда **содержимое** распакованного проекта, включая `.github`, `src`, `public`, `package.json` и `package-lock.json`. Скрытую `.git` не трогайте. Ctrl+A — выделить всё, Ctrl+C — копировать, Ctrl+V — вставить.
4. В GitHub Desktop выберите ветку `main`. В Summary введите `Launch oui`, затем нажмите `Commit to main` и `Push origin` (Ctrl+P). Если кнопка называется Publish branch, нажмите её.
5. В браузере откройте репозиторий → `Settings → Pages` → `Build and deployment → Source → GitHub Actions`. На бесплатном плане нужен публичный репозиторий.
6. Откройте `Actions → Deploy oui to Pages → Run workflow` → ветка `main` → зелёная кнопка `Run workflow`.
7. Дождитесь зелёных build и deploy (обычно 1–3 минуты). После успеха сайт будет доступен по адресу https://alitojcubekov206-svg.github.io/oui/ .

### Вариант 2: терминал

Установите Git. Откройте терминал в папке для проектов. Вставлять в Windows Terminal можно Ctrl+Shift+V; выполнить команду — Enter.

```sh
git clone https://github.com/alitojcubekov206-svg/oui.git
cd oui
```

Скопируйте в эту папку файлы распакованного проекта, затем:

```sh
git add .
git commit -m "Launch oui"
git branch -M main
git push -u origin main
```

Если Git требует имя и email, настройте `git config --global user.name "Ваше имя"` и `git config --global user.email "Ваш email"`, затем повторите commit. Для push используйте вход через Git Credential Manager. Не используйте пароль GitHub вместо токена.

Теперь выполните шаги 5–7 из варианта GitHub Desktop.

### Если что-то не работает

- Workflow отсутствует: проверьте файл `.github/workflows/deploy.yml` в ветке main.
- Ошибка Pages: сначала включите GitHub Actions в Settings → Pages, затем нажмите Re-run all jobs в Actions.
- Push rejected: не используйте force push. Сначала Fetch/Pull origin и разрешите конфликты.
- 404: убедитесь, что deploy зелёный, откройте ссылку из deployment, проверьте имя репозитория. Workflow сам задаёт Vite base для имени репозитория.
- Старая версия: Ctrl+F5 (полная перезагрузка).
- Нет WebGL: включите аппаратное ускорение браузера или используйте актуальный Chrome, Edge, Firefox.
- На macOS большинство Ctrl-сочетаний заменяются на Command.

После этого каждый push в main обновляет сайт автоматически. Подробная интерактивная инструкция есть в самой игре: «Помощь и деплой».

## Браузерные тесты

При запущенном `npm run dev` выполните `npx playwright install chromium`, затем `node tests/smoke.mjs`. Тест проверяет навигацию, клавиши, форсаж, паузу, настройки и мобильную компоновку. `node tests/progression.mjs` проверяет полный маршрут, награду и сохранение выбранного корабля с ускоренным игровым временем и детерминированным расположением астероидов. На Linux для Chromium могут потребоваться `npx playwright install-deps chromium`.

## Исходники

Архив `public/downloads/oui-source.zip` создаётся при публикации workflow. Для локальной упаковки (если установлен zip):

```sh
mkdir -p public/downloads
zip -qr public/downloads/oui-source.zip src public/images .github README.md .gitignore index.html package.json package-lock.json tsconfig.json vite.config.ts
```
