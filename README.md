# LAKE VILLAGE BELARUS — интерактивный 3D-сайт

Визуальный прототип будущего resort & event-комплекса в Беларуси, разработанный на основе инвестиционной презентации Lake Village. Главный элемент сайта — интерактивная 3D-модель комплекса, созданная процедурно с Three.js.

## Что реализовано

- Премиальный одностраничный дизайн в палитре лесного зелёного, шампанского и дерева.
- 3D-генплан с озером, **14 домиками** двух типов, оранжереей, рестораном, пирсом, пляжем, детской площадкой, парковкой, администрацией, въездом и вертолётной площадкой.
- Интерактивные точки объектов с описаниями и плавным перемещением камеры.
- **Автотур** — последовательный облёт по основным объектам.
- **Прогулка** — клавиши WASD на компьютере или стрелки на мобильном устройстве; поворот камеры мышью/свайпом.
- **Зайти внутрь** для демонстрационных моделей A-Frame и Barnhouse. Интерьер схематичный.
- **День / вечер**, общий обзор, отдельный режим просмотра генерального плана.
- Адаптивная версия для телефона, блоки о концепции и инвестировании, скачивание исходной PDF-презентации.

## Запуск локально

Не открывайте `index.html` через `file://`: браузеры ограничивают загрузку JavaScript-модулей из локальных файлов.

Из терминала в папке проекта:

```bash
python3 -m http.server 8000
```

Откройте `http://localhost:8000/` в браузере. Для 3D-модели требуется подключение к интернету: Three.js подгружается через jsDelivr. В браузере должна быть включена аппаратная поддержка WebGL.

## Публикация на GitHub Pages

1. Создайте репозиторий, например `lake-village`, и загрузите **всё содержимое** папки проекта в корень репозитория (`index.html`, `styles.css`, `ui.js`, `scene.js`, `assets/`).
2. Откройте `Settings → Pages`.
3. Выберите `Deploy from a branch`, ветку `main`, каталог `/ (root)`.
4. GitHub Pages опубликует сайт по адресу вида `https://<username>.github.io/lake-village/`.

Ссылки в проекте относительные, поэтому подходят для GitHub Pages.

## Структура

- `index.html` — разделы, управление, SEO и контент.
- `styles.css` — весь адаптивный визуальный дизайн.
- `ui.js` — меню, увеличение плана, навигация и резервное сообщение.
- `scene.js` — процедурная 3D-территория и взаимодействия.
- `assets/hero.webp` — иллюстрация для первого экрана, кадр из презентации.
- `assets/slide-*.webp` — изображения страниц презентации для оформления.
- `assets/Lake-Village-Investment.pdf` — исходная инвестиционная презентация.

## Что ещё понадобится для архитектурной точности

Это **интерактивная концептуальная визуализация**, а не строительная документация. В презентации есть иллюстративная схема, но нет CAD/BIM-плана с размерами, рельефом и точными координатами. Домики имеют схематичную геометрию, вдохновлённую указанными моделями. Для реалистичного финального цифрового двойника нужны:

- Привязанный генеральный план в DWG/DXF/IFC, реальные размеры и топография участка.
- Архитектурные планы и 3D-модели домов A-Frame 56 / Barn 56, точные фасады и планировки.
- Модель оранжереи и ресторанного корпуса, материалы, планировка интерьеров.
- Подтверждённые трассировки дорог, расстояния, посадка деревьев и инженерные зоны.

Упомянутые внешние сайты использовались как архитектурные референсы, но их фотографии и 3D-модели не скопированы в проект. Использованы материалы из предоставленной инвестиционной презентации. Контактный телефон, Instagram, стоимость и сроки взяты из презентации — **проверьте актуальность перед публичной публикацией**.

## Архитектурные референсы

- https://unit-home.ru/barn/barn56
- https://unit-home.ru/aframe56
- https://forestdew.ru/
- https://yaroslavkiri4ykknifhit-max.github.io/hausbild/

## Cinematic rendering pass (November 2026)

- Added `realism.js` with procedural conifer foliage, understory vegetation and shoreline reeds (GPU-instanced), animated water with Fresnel-like reflections, a sky dome and soft reflection environment.
- Added 7 self-contained seamless PBR-style textures in `assets/textures/` for forest floor, forest normal, gravel, sand, wood, slate roof and stones. These maps were generated specifically for this demo and do not require a third-party service.
- Added roof-seam, trim, deck and exterior furnishing details to the cabins. Preserved the resort masterplan layout and all tour modes.
- New `Кино / Быстро` switch trades rendering quality for frame rate, especially on mobile devices.
- The geometry is still a **conceptual model**, not surveyed terrain or the exact manufacturer's CAD models. Photoreal architectural-grade deliverables would need licensed or supplied high-detail house models, botanical assets, surveyed terrain, verified measurements and a tested production render pipeline.