# HDrezka-Grabber


<p align="center">
    <img src="assets\HD_logo.png" width="300px" alt="BHEH">
</p>
<p align="center">
    <img src="https://img.shields.io/github/v/release/kristal374/HDrezka-Grabber">
    <img alt="Static Badge" src="https://shields-io.translate.goog/badge/CC_BY--NC--SA_4.0-red?label=license">
</p>

# Описание

Простое браузерное расширение позволяющее загружать любые видео с **[rezka.ag](https://rezka.ag)** и любых его зеркал. Расширение поддерживает:

- [x] Выбор желаемого качества видео
- [x] Выбор из доступных озвучек фильма/сериала
- [x] Возможность загрузки всего сериала целиком
- [x] Возможность начать загрузку сериала с любой серии и сезона.
- [ ] Возможности загрузить только один сезон
- [ ] Загрузку субтитров
- [ ] Выбор языка субтитров
### Установка
---

![chrome_ico](https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_16x16.png) [Chrome Web Store](https://chrome.google.com/webstore/detail/hdrezka-grabber/aamnmboocelpaiagegjicbefiinkcoal?hl=ru)

или
1. Загрузите архив из [последнего релиза](https://github.com/kristal374/HDrezka-Grabber/releases/latest) и распакуйте его в удобное для вас место.
2. Перейдите во вкладку "[расширения](chrome://extensions/)" вашего браузера и активируйте там "Режим разработчика" (Обычно переключатель находится в правом верхнем углу)
3. Нажмите кнопку "Загрузить распакованное расширение" и выберите распакованный файл из пункта 1
   
### Использование
---

1. Что бы использовать расширение нажмите на его иконку, после чего вы увидите меню с настройками. Иконка расширения выглядит как две буквы "HD"
    <img src="assets\demo-3-ru.png">
2. Выберите интересующие вас настройки и нажмите на большую кнопку загрузки. Цифры, которые будут отображаться внутри кнопки отражают степень загрузки фильма или отдельной серии.
    <img src="assets\demo-2-ru.png">
3. Просто ждите. По завершению загрузки файл автоматически сохраниться на вашем компьютере, а если вы загружаете сериал целиком — начнётся загрузка следующей серии.

Важно отметить несколько недостаточно интуитивных деталей:

* Прервать загрузку можно повторно нажав на кнопку "Загрузки". Прерывание это **НЕ** пауза, прогресс будет утерян.
* **НЕ ЗАКРЫВАЙТЕ** сайт во время загрузки. Сайт является инициатором загрузки, и если он будет закрыт/перезагружен загрузка прервётся.
* Если вы выбрали "Загрузить весь сериал", будет загружен **АБСОЛЮТНО** весь сериал, начиная с того эпизода и сезона которые вы укажите ниже ***ВКЛЮЧИТЕЛЬНО***.
* У фильма не отображается меню выбора озвучки, вы можете выбрать озвучку на самом сайте после чего расширение само подтянет выбранную вами озвучку. 
* Сначала фильм загружается в оперативную память, после чего выгружается уже на сам диск. Это происходит из-за ограничений браузерного API, поэтому если вы решите загрузить большой фильм в качестве 4К будьте готовы, что вам потребуется большой объём оперативной памяти.
* При медленном интернете возможны сбои загрузки.



Так же после установки расширения вы можете закрепить его на панели быстрого доступа, для этого: 
1. Нажмите на иконку расширения(Для хрома это иконка пазла), чтобы получить доступ к своим расширениям.
2. Найдите расширение, которое вы хотите закрепить на панели инструментов и нажмите на иконку булавки рядом. 
    <details><summary></summary>
        <p align="center">
            <img src="assets\pin_extension.png">
        </p>
    </details>



