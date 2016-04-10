/* global Resizer: true */

/**
 * @fileoverview
 * @author Igor Alexeenko (o0)
 */

'use strict';

(function() {
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
  var inputX = document.getElementById('resize-x');

  /**
   * Поле сверху.
   * @type {HTMLElement}
   */
  var inputY = document.getElementById('resize-y');

  /**
   * Поле сторона.
   * @type {HTMLElement}
   */
  var inputSize = document.getElementById('resize-size');

  /**
   * Кнопка отправки формы ресайзинга.
   * @type {HTMLElement}
   */
  var resizeFwd = document.getElementById('resize-fwd');

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

    inputX.addEventListener('input', function() {
      inputX.max = currentResizer._image.naturalWidth - inputSize.value;

      updateResizeSubmitBtn();
    });

    inputY.addEventListener('input', function() {
      inputY.max = currentResizer._image.naturalHeight - inputSize.value;

      updateResizeSubmitBtn();
    });

    inputSize.addEventListener('input', function() {
      inputSize.max = Math.min(currentResizer._image.naturalWidth - inputX.value,
                                currentResizer._image.naturalHeight - inputY.value);

      updateResizeSubmitBtn();
    });

    // Если значение поля выходит за пределы допустимых значений,
    // то присваиваем валидное значение.
    inputX.addEventListener('blur', function() {
      if (!inputX.value) {
        inputX.value = 0;
      }

      if (+inputX.value > inputX.max) {
        inputX.value = inputX.max;
      } else if (+inputX.value < inputX.min) {
        inputX.value = inputX.min;
      }

      updateResizeSubmitBtn();
    });

    inputY.addEventListener('blur', function() {
      if (!inputY.value) {
        inputY.value = 0;
      }

      if (+inputY.value > inputY.max) {
        inputY.value = inputY.max;
      } else if (+inputY.value < inputY.min) {
        inputY.value = inputY.min;
      }

      updateResizeSubmitBtn();
    });

    inputSize.addEventListener('blur', function() {
      if (!inputSize.value) {
        inputSize.value = 0;
      }

      if (+inputSize.value > inputSize.max) {
        inputSize.value = inputSize.max;
      } else if (+inputSize.value < inputSize.min) {
        inputSize.value = inputSize.min;
      }

      updateResizeSubmitBtn();
    });
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
   * @param {string=} message
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

  /**
   * Обработчик изменения изображения в форме загрузки. Если загруженный
   * файл является изображением, считывается исходник картинки, создается
   * Resizer с загруженной картинкой, добавляется в форму кадрирования
   * и показывается форма кадрирования.
   * @param {Event} evt
   */
  uploadForm.onchange = function(evt) {
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
          resizerImage.addEventListener('load', function() {
            initResizeInputs();
          });

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
  };

  /**
   * Обработка сброса формы кадрирования. Возвращает в начальное состояние
   * и обновляет фон.
   * @param {Event} evt
   */
  resizeForm.onreset = function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    resizeForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработка отправки формы кадрирования. Если форма валидна, экспортирует
   * кропнутое изображение в форму добавления фильтра и показывает ее.
   * @param {Event} evt
   */
  resizeForm.onsubmit = function(evt) {
    evt.preventDefault();

    if (resizeFormIsValid()) {
      filterImage.src = currentResizer.exportImage().src;

      resizeForm.classList.add('invisible');
      filterForm.classList.remove('invisible');
    }
  };

  /**
   * Сброс формы фильтра. Показывает форму кадрирования.
   * @param {Event} evt
   */
  filterForm.onreset = function(evt) {
    evt.preventDefault();

    filterForm.classList.add('invisible');
    resizeForm.classList.remove('invisible');
  };

  /**
   * Отправка формы фильтра. Возвращает в начальное состояние, предварительно
   * записав сохраненный фильтр в cookie.
   * @param {Event} evt
   */
  filterForm.onsubmit = function(evt) {
    evt.preventDefault();

    cleanupResizer();
    updateBackground();

    filterForm.classList.add('invisible');
    uploadForm.classList.remove('invisible');
  };

  /**
   * Обработчик изменения фильтра. Добавляет класс из filterMap соответствующий
   * выбранному значению в форме.
   */
  filterForm.onchange = function() {
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

    var selectedFilter = [].filter.call(filterForm['upload-filter'], function(item) {
      return item.checked;
    })[0].value;

    // Класс перезаписывается, а не обновляется через classList потому что нужно
    // убрать предыдущий примененный класс. Для этого нужно или запоминать его
    // состояние или просто перезаписывать.
    filterImage.className = 'filter-image-preview ' + filterMap[selectedFilter];
  };

  cleanupResizer();
  updateBackground();
})();
