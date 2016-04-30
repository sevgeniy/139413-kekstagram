'use strict';

(function() {
  var IMAGE_LOAD_TIMEOUT = 10000;
  var DOWNLOAD_PICTURES_URL = 'https://o0.github.io/assets/json/pictures.json';

  var filters = document.querySelector('.filters');
  var template = document.getElementById('picture-template');
  var pictureTemplate;

  if ('content' in template) {
    pictureTemplate = template.content.querySelector('.picture');
  } else {
    pictureTemplate = template.querySelector('.picture');
  }

  var pictures;

  filters.addEventListener('change', onPictureFilterChanged);

  // получаем блок pictures, в который будем добавлять картинки.
  var picturesContainer = document.querySelector('.pictures');

  hideFilter();
  // загрузить картинки
  loadPictures();
  showFilter();

  function loadPictures() {
    showLoader();

    var xhr = createXmlHttpRequest();
    xhr.send();
  }

  function createXmlHttpRequest() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', DOWNLOAD_PICTURES_URL, true);
    xhr.timeout = IMAGE_LOAD_TIMEOUT;

    xhr.addEventListener('load', onXhrLoad);
    xhr.addEventListener('error', onXhrError);
    xhr.addEventListener('timeout', onXhrTimeout);

    return xhr;

    function onXhrLoad() {
      // проинициализировать переменную картинками.
      pictures = JSON.parse(xhr.responseText);
      pictures.forEach(function(picture) {
        picture.date = new Date(picture.date);
      });
      initPictures(pictures);
      hideLoader();
    }

    function onXhrError() {
      picturesContainer.classList.add('pictures-failure');
      hideLoader();
    }

    function onXhrTimeout() {
      picturesContainer.classList.add('pictures-failure');
      hideLoader();
    }
  }

  /**
  * Очищает контейнер от картинок, чтобы загрузить отрисовать новые картинки.
  */
  function clearPictures() {
    var picturesToRemove = picturesContainer.querySelectorAll('.picture');
    [].forEach.call(picturesToRemove, function(pictureToRemove) {
      picturesContainer.removeChild(pictureToRemove);
    });
  }

  /**
  * Заполняет контейнер картинками.
  * @param {object} data
  */
  function initPictures(data) {
    data.forEach(function(picture) {
      // для каждого элемента массива создаём блок
      // фотографии на основе шаблона.
      addPicture(picture, picturesContainer);
    });
  }

  function onPictureFilterChanged() {
    clearPictures();

    var selectedFilter = [].filter.call(filters['filter'], function(filter) {
      return filter.checked;
    })[0].value;

    switch(selectedFilter) {
      case 'popular':
        initPictures(getPopularPictures());
        break;
      case 'new':
        initPictures(getNewPictures());
        break;
      case 'discussed':
        initPictures(getDiscussedPictures());
        break;
    }
  }

  /**
  * Возвращает картинки, в том виде, в котором они были загружены.
  */
  function getPopularPictures() {
    return pictures;
  }

  /**
  * Возвращает картинки, сделанные за последние две недели, отсортированные по убыванию даты.
  */
  function getNewPictures() {

    var newPicturesDate = getNewPicturesDate();

    // фильтруем картинки по дате
    var newPictures = pictures.filter(function(picture) {
      // новыми считаются картинки с датой больше чем дата указанная выше.
      return picture.date >= newPicturesDate;
    });

	// сортируем картинки по убыванию даты.
    newPictures.sort(function(p1, p2) {
      return p2.date - p1.date;
    });

    return newPictures;
  }

  /**
  * Возвращает дату, начиная с которой картинка считается новой.
  */
  function getNewPicturesDate() {
    // это текущая дата минус 2 недели.
    var date = new Date();
    date.setDate(date.getDate() - 14);

    return date;
  }

  /**
  * Возвращает картинки, отсортированные по убыванию количества комментариев.
  */
  function getDiscussedPictures() {
    var discussedPictures = pictures.slice();

    // сортируем список картинок по убыванию кол-ва комментариев.
    discussedPictures.sort(function(p1, p2) {
      return p2.comments - p1.comments;
    });

    return discussedPictures;
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

  // показать loader.
  function showLoader() {
    picturesContainer.classList.add('pictures-loading');
  }

  // спрятать loader.
  function hideLoader() {
    picturesContainer.classList.remove('pictures-loading');
  }
})();

