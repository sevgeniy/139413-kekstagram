'use strict';

(function() {
  var IMAGE_LOAD_TIMEOUT = 10000;

  var filters = document.querySelector('.filters');
  var template = document.getElementById('picture-template');
  var pictureTemplate;

  if ('content' in template) {
    pictureTemplate = template.content.querySelector('.picture');
  } else {
    pictureTemplate = template.querySelector('.picture');
  }

  hideFilter();
  initPictures();
  showFilter();

  function initPictures() {
    // получаем блок pictures, в который будем добавлять картинки.
    var picturesContainer = document.querySelector('.pictures');

    window.pictures.forEach(function(picture) {
      // для каждого элемента массива создаём блок
      // фотографии на основе шаблона.
      addPicture(picture, picturesContainer);
    });
  }

  /**
  * Создает на основе данных data блок с картинкой и добавляет её в разметку.
  * @param {object} data
  * @param {HTMLElement} container
  */
  function addPicture(data, container) {
    var picture = pictureTemplate.cloneNode(true);

    var img = picture.querySelector('img');
    var imgLoadTimeout;

    // поиск старой картинки
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);

    picture.querySelector('.picture-comments').textContent = data.comments;
    picture.querySelector('.picture-likes').textContent = data.likes;

    // загружаем картинку
    img.src = data.url;

    imgLoadTimeout = setTimeout(function() {
      img.src = '';
      picture.classList.add('picture-load-failure');
    }, IMAGE_LOAD_TIMEOUT);

    container.appendChild(picture);

    // обработчик успешной загрузки картинки.
    function onLoad() {
      clearTimeout(imgLoadTimeout);
    }

    // обработчик ошибки при загрузке изображения.
    function onError() {
      picture.classList.add('picture-load-failure');

      clearTimeout(imgLoadTimeout);
    }
  }

  // прячет фильтр.
  function hideFilter() {
    filters.classList.add('hidden');
  }

  // показывает фильтр.
  function showFilter() {
    filters.classList.remove('hidden');
  }
})();

