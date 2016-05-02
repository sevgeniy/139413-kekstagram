/* global Resizer: true */

/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

(function() {

  var BIRTH_MONTH = 8;
  var BIRTH_DAY = 10;
  var browserCookies = require('browser-cookies');

  /** @enum {string} */
  var FileType = {
    'GIF': '',
    'JPEG': '',
    'PNG': '',
    'SVG+XML': ''
  };

  /** @enum {number} */
  var Action = {
    ERROR: 0,
    UPLOADING: 1,
    CUSTOM: 2
  };

  /**
   * Регулярное выражение, проверяющее тип загружаемого файла. Составляется
   * из ключей FileType.
   * @type {RegExp}
   */
  var fileRegExp = new RegExp('^image/(' + Object.keys(FileType).join('|').replace('\+', '\\+') + ')$', 'i');

  /**
   * @type {Object.<string, string>}
   */
  var filterMap;

  /**
   * Объект, который занимается кадрированием изображения.
   * @type {Resizer}
   */
  var currentResizer;

  /**
   * Удаляет текущий объект {@link Resizer}, чтобы создать новый с другим
   * изображением.
   */
  function cleanupResizer() {
    if (currentResizer) {
      currentResizer.remove();
      currentResizer = null;
    }
  }

  /**
   * Ставит одну из трех случайных картинок на фон формы загрузки.
   */
  function updateBackground() {
    var images = [
      'img/logo-background-1.jpg',
      'img/logo-background-2.jpg',
      'img/logo-background-3.jpg'
    ];

    var backgroundElement = document.querySelector('.upload');
    var randomImageNumber = Math.round(Math.random() * (images.length - 1));
    backgroundElement.style.backgroundImage = 'url(' + images[randomImageNumber] + ')';
  }

  /**
   * Проверяет, валидны ли данные, в форме кадрирования.
   * @return {boolean}
   */
  function resizeFormIsValid() {
    return inputX.value >= 0 &&
           inputY.value >= 0 &&
           inputSize.value >= 0 &&
           (+inputX.value) + (+inputSize.value) <= currentResizer._image.naturalWidth &&
           (+inputY.value) + (+inputSize.value) <= currentResizer._image.naturalHeight;
  }

  /**
   * Форма загрузки изображения.
   * @type {HTMLFormElement}
   */
  var uploadForm = document.forms['upload-select-image'];

  /**
   * Форма кадрирования изображения.
   * @type {HTMLFormElement}
   */
  var resizeForm = document.forms['upload-resize'];

  /**
   * Форма добавления фильтра.
   * @type {HTMLFormElement}
   */
  var filterForm = document.forms['upload-filter'];

  /**
   * @type {HTMLImageElement}
   */
  var filterImage = filterForm.querySelector('.filter-image-preview');

  /**
   * @type {HTMLElement}
   */
  var uploadMessage = document.querySelector('.upload-message');

  /**
   * Поле слева.
   * @type {HTMLElement}
   */
  var inputX = resizeForm['resize-x'];

  /**
   * Поле сверху.
   * @type {HTMLElement}
   */
  var inputY = resizeForm['resize-y'];

  /**
   * Поле сторона.
   * @type {HTMLElement}
   */
  var inputSize = resizeForm['resize-size'];

  /**
   * Кнопка отправки формы ресайзинга.
   * @type {HTMLElement}
   */
  var resizeFwd = resizeForm['resize-fwd'];

  // Инициализируем поля ввода обработчиками событий.
  function initResizeInputs() {
    // чтобы валидация пропускала не только целые числа, но и дробные.
    inputX.step = 'any';
    inputY.step = 'any';
    inputSize.step = 'any';

    var constraint = currentResizer.getConstraint();

    inputX.value = constraint.x;
    inputY.value = constraint.y;
    inputSize.value = constraint.side;

    inputX.min = 0;
    inputX.max = currentResizer._image.naturalWidth - inputSize.value;

    inputY.min = 0;
    inputY.max = currentResizer._image.naturalHeight - inputSize.value;

    inputSize.min = 0;
    inputSize.max = Math.min(currentResizer._image.naturalWidth - inputX.value,
                             currentResizer._image.naturalHeight - inputY.value);

    inputX.addEventListener('input', onInput);
    inputY.addEventListener('input', onInput);
    inputSize.addEventListener('input', onInput);

    // Если значение поля выходит за пределы допустимых значений,
    // то присваиваем валидное значение.
    inputX.addEventListener('blur', onInputBlur);
    inputY.addEventListener('blur', onInputBlur);
    inputSize.addEventListener('blur', onInputBlur);
  }

  function onInput(e) {
    calcMax(e);
    updateResizeSubmitBtn();
  }

  function calcMax(e) {
    var input = e.target;

    switch(input) {
      case inputX:
        inputX.max = currentResizer._image.naturalWidth - inputSize.value;
        break;
      case inputY:
        inputY.max = currentResizer._image.naturalHeight - inputSize.value;
        break;
      case inputSize:
        inputSize.max = Math.min(currentResizer._image.naturalWidth - inputX.value,
         currentResizer._image.naturalHeight - inputY.value);
        break;
    }
  }

  function onInputBlur(e) {
    var input = e.target;

    if (!input.value) {
      input.value = 0;
    }

    if (+input.value > input.max) {
      input.value = input.max;
    } else if (+input.value < input.min) {
      input.value = input.min;
    }

    updateResizeSubmitBtn();
  }

  // Если все значения формы валидны, то кнопка отправки формы активна
  // если нет, то кнопка не активна.
  function updateResizeSubmitBtn() {
    if (inputX.checkValidity() && inputY.checkValidity() && inputSize.checkValidity()) {
      resizeFwd.removeAttribute('disabled');
      resizeFwd.style.opacity = 1;
    } else {
      resizeFwd.setAttribute('disabled', 'disabled');
      resizeFwd.style.opacity = 0.2;
    }
  }

  /**
   * @param {Action} action
   * @param {string} message
   * @return {Element}
   */
  function showMessage(action, message) {
    var isError = false;

    switch (action) {
      case Action.UPLOADING:
        message = message || 'Кексограмим&hellip;';
        break;

      case Action.ERROR:
        isError = true;
        message = message || 'Неподдерживаемый формат файла<br> <a href="' + document.location + '">Попробовать еще раз</a>.';
        break;
    }

    uploadMessage.querySelector('.upload-message-container').innerHTML = message;
    uploadMessage.classList.remove('invisible');
    uploadMessage.classList.toggle('upload-message-error', isError);
    return uploadMessage;
  }

  function hideMessage() {
    uploadMessage.classList.add('invisible');
  }

  uploadForm.addEventListener('change', onUploadFormChange);

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  function onUploadFormChange(evt) {
    var element = evt.target;
    if (element.id === 'upload-file') {
      // Проверка типа загружаемого файла, тип должен быть изображением
      // одного из форматов: JPEG, PNG, GIF или SVG.
      if (fileRegExp.test(element.files[0].type)) {
        var fileReader = new FileReader();

        showMessage(Action.UPLOADING);

        fileReader.onload = function() {
          cleanupResizer();

          currentResizer = new Resizer(fileReader.result);

          // после окончания загрузки картинки
          // инициализируем значения полей с параметрами кадрирования
          var resizerImage = currentResizer.getImage();
          resizerImage.addEventListener('load', initResizeInputs);

          currentResizer.setElement(resizeForm);
          uploadMessage.classList.add('invisible');

          uploadForm.classList.add('invisible');
          resizeForm.classList.remove('invisible');

          hideMessage();
        };

        fileReader.readAsDataURL(element.files[0]);
      } else {
        // Показ сообщения об ошибке, если загружаемый файл, не является
        // поддерживаемым изображением.
        showMessage(Action.ERROR);
      }
    }
  }

  resizeForm.addEventListener('reset', onResizeFormReset);

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  function onResizeFormReset(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  }

  resizeForm.addEventListener('submit', onResizeFormSubmit);

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  function onResizeFormSubmit(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');
    }

    // достаём значение посл использованного cookie или берём значение по умолчанию.
    var selectedFilterValue = browserCookies.get('filter') || 'none';
    // находим input относящийся к выбранному фильтру.
    var selectedFilter = document.getElementById('upload-filter-' + selectedFilterValue);
    selectedFilter.checked = true;

    // вызываем обработчик изменения фильтра, чтобы выбранный фильтр был применен к кратинке.
    onFilterFormChange();
  }

  filterForm.addEventListener('reset', onFilterFormReset);

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  function onFilterFormReset(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  }

  filterForm.addEventListener('submit', onFilterFormSubmit);
  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  function onFilterFormSubmit(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  }

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.addEventListener('change', onFilterFormChange);

  function onFilterFormChange(e) {
    if (!filterMap) {
      // Ленивая инициализация. Объект не создается до тех пор, пока
      // не понадобится прочитать его в первый раз, а после этого запоминается
      // навсегда.
      filterMap = {
        'none': 'filter-none',
        'chrome': 'filter-chrome',
        'sepia': 'filter-sepia'
      };
    }

    if (e) {
      setFilterCookie(e.target.value);
    }

    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[selectedFilter];
  }

  /**
   * Сохраняет применённый фильтр в cookie.
   * @param {String} cookieValue
   */
  function setFilterCookie(cookieValue) {
    var currentDate = new Date();

    // определяем дату последнего прошедшего дня рождения.
    // инициализируем текущей датой сохранённой в переменной currentDate
    var birthDate = new Date(currentDate.valueOf());
    birthDate.setMonth(BIRTH_MONTH);
    birthDate.setDate(BIRTH_DAY);

    // если в этом году День Рождения ещё не наступил - уменьшаем год на 1.
    if (birthDate > new Date()) {
      birthDate.setFullYear(birthDate.getFullYear() - 1);
    }

    // определяем время жизни cookie в милисекундах.
    var cookieLifeTime = currentDate.valueOf() - birthDate.valueOf();
    // определяем дату когда cookies устареют
    var cookieExpiresDate = new Date(+currentDate + cookieLifeTime);

    browserCookies.set('filter', cookieValue, {
      expires: cookieExpiresDate
    });
  }

  cleanupResizer();
  updateBackground();
})();
