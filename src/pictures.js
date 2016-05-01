'use strict';

(function() {
  var IMAGE_LOAD_TIMEOUT = 10000;
  var DOWNLOAD_PICTURES_URL = 'https://o0.github.io/assets/json/pictures.json';
  var PAGE_SIZE = 12;
  var SCROLL_TIMEOUT = 100;

  var filters = document.querySelector('.filters');
  var template = document.getElementById('picture-template');

  var popularFilter = document.getElementById('filter-popular');
  var newFilter = document.getElementById('filter-new');
  var discussedFilter = document.getElementById('filter-discussed');

  var pictureTemplate;
  if ('content' in template) {
    pictureTemplate = template.content.querySelector('.picture');
  } else {
    pictureTemplate = template.querySelector('.picture');
  }

  // переменная для хранения всех загруженных картинок.
  var pictures = [];
  // переменная для хранения картинок к которым применен текущий фильтр.
  var currentFilterPictures = [];
  // номер текущей показанной страницы.
  var currentPage = 0;

  // получаем блок pictures, в который будем добавлять картинки.
  var picturesContainer = document.querySelector('.pictures');

  setScrollEnabled();
  setFilterEnabled();

  hideFilter();
  // загрузить картинки
  loadPictures();
  showFilter();

  function loadPictures() {
    showLoader();

    sendXmlHttpRequest();
  }

  function setFilterEnabled() {
    filters.addEventListener('click', onPictureFilterClicked);
  }

  function sendXmlHttpRequest() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', DOWNLOAD_PICTURES_URL, true);
    xhr.timeout = IMAGE_LOAD_TIMEOUT;

    xhr.addEventListener('load', onXhrLoad);
    xhr.addEventListener('error', onXhrError);
    xhr.addEventListener('timeout', onXhrTimeout);

    xhr.send();

    function onXhrLoad() {
      // проинициализировать переменную картинками.
      try {
        pictures = JSON.parse(xhr.responseText);
        pictures.forEach(function(picture) {
          picture.date = new Date(picture.date);
        });
        currentFilterPictures = pictures.slice();
        renderPictures(pictures);
      } catch(ex) {
        picturesContainer.classList.add('pictures-failure');
      }

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
  * @param {number} page
  */
  function renderPictures(data, page) {
    // если номер страницы для отрисовки не передан,
    // то очищаем контеёнер с картинками и отрисовываем первую страницу.
    if (typeof page === 'undefined') {
      clearPictures();
      currentPage = 0;
      page = 0;
    }

    var from = page * PAGE_SIZE;
    var to = from + PAGE_SIZE;

    data.slice(from, to).forEach(function(picture) {
      // для каждого элемента массива создаём блок
      // фотографии на основе шаблона.
      addPicture(picture, picturesContainer);
    });

    // если место для картинок ещё естьи есть картинки
    // то показываем след. страницу
    if (hasFreeSpace() && isNextPageAvailable(data, page, PAGE_SIZE)) {
      renderPictures(data, ++currentPage);
    }
  }

  /**
  * Определяет есть ли на экране свободное место для отображения картинок.
  */
  function hasFreeSpace() {
    var screenHeight = window.screen.availHeight;
    var bodyContentHeight = document.body.offsetHeight;

    return screenHeight - bodyContentHeight > 0;
  }

  function onPictureFilterClicked(e) {

    switch(e.target) {
      case popularFilter:
        currentFilterPictures = getPopularPictures();
        break;
      case newFilter:
        currentFilterPictures = getNewPictures();
        break;
      case discussedFilter:
        currentFilterPictures = getDiscussedPictures();
        break;
    }

    renderPictures(currentFilterPictures);
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

    // фильтруем картинки по дате и сортируем их по убыванию даты.
    var newPictures = pictures.filter(function(picture) {
      // новыми считаются картинки с датой больше чем дата указанная выше.
      return picture.date >= newPicturesDate;
    })
    .sort(function(p1, p2) {
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

  function setScrollEnabled() {
    var scrollTimeoutId;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeoutId);
      scrollTimeoutId = setTimeout(function() {
        if (isBottomReached() && isNextPageAvailable(currentFilterPictures, currentPage, PAGE_SIZE)) {
          currentPage++;
          renderPictures(currentFilterPictures, currentPage);
        }
      }, SCROLL_TIMEOUT);
    });
  }

  /** @return {boolean} */
  function isBottomReached() {
    var GAP = 100;
    var footerElement = document.querySelector('footer');
    var footerPosition = footerElement.getBoundingClientRect();
    return footerPosition.top - window.innerHeight - GAP <= 0;
  }

  /**
  * @param {Array} pictures
  * @param {number} page
  * @param {number} pageSize
  * @return {boolean}
  */
  function isNextPageAvailable(pics, page, pageSize) {
    return page < Math.floor(pics.length / pageSize);
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

