'use strict';

(function() {
  var IMAGE_WIDTH = 182;
  var IMAGE_HEIGHT = 182;
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

    var img = new Image();
    var imgLoadTimeout;

    img.addEventListener('load', function(e) {
      onLoad(e, picture);
      clearTimeout(imgLoadTimeout);
    });

    img.addEventListener('error', function(e) {
      onError(e, picture);
    });

    picture.querySelector('.picture-comments').textContent = data.comments;
    picture.querySelector('.picture-likes').textContent = data.likes;

    img.src = data.url;

    imgLoadTimeout = setTimeout(function() {
      img.src = '';
      picture.classList.add('picture-load-failure');
    }, IMAGE_LOAD_TIMEOUT);

    container.appendChild(picture);
  }

  // обработчик успешной загрузки картинки.
  function onLoad(e, picture) {
    // устанавливаем значение src для тега <img />
    picture.style.backgroundImage = 'url(\'' + e.target.src + '\')';

    // устанавливаем ширину и высоту изображения.
    e.target.width = IMAGE_WIDTH;
    e.target.height = IMAGE_HEIGHT;
  }

  // обработчик ошибки при загрузке изображения.
  function onError(e, picture) {
    picture.classList.add('picture-load-failure');
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

