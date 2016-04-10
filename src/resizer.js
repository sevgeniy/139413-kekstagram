'use strict';

(function() {
  /**
   * @constructor
   * @param {string} image
   */
  var Resizer = function(image) {
    // Изображение, с которым будет вестись работа.
    this._image = new Image();
    this._image.src = image;

    // Холст.
    this._container = document.createElement('canvas');
    this._ctx = this._container.getContext('2d');

    // Создаем холст только после загрузки изображения.
    this._image.onload = function() {
      // Размер холста равен размеру загруженного изображения. Это нужно
      // для удобства работы с координатами.
      this._container.width = this._image.naturalWidth;
      this._container.height = this._image.naturalHeight;

      /**
       * Предлагаемый размер кадра в виде коэффициента относительно меньшей
       * стороны изображения.
       * @const
       * @type {number}
       */
      var INITIAL_SIDE_RATIO = 0.75;

      // Размер меньшей стороны изображения.
      var side = Math.min(
          this._container.width * INITIAL_SIDE_RATIO,
          this._container.height * INITIAL_SIDE_RATIO);

      // Изначально предлагаемое кадрирование — часть по центру с размером в 3/4
      // от размера меньшей стороны.
      this._resizeConstraint = new Square(
          this._container.width / 2 - side / 2,
          this._container.height / 2 - side / 2,
          side);

      // Отрисовка изначального состояния канваса.
      this.setConstraint();
    }.bind(this);

    // Фиксирование контекста обработчиков.
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);
    this._onDrag = this._onDrag.bind(this);
  };

  Resizer.prototype = {
    /**
     * Родительский элемент канваса.
     * @type {Element}
     * @private
     */
    _element: null,

    /**
     * Положение курсора в момент перетаскивания. От положения курсора
     * рассчитывается смещение на которое нужно переместить изображение
     * за каждую итерацию перетаскивания.
     * @type {Coordinate}
     * @private
     */
    _cursorPosition: null,

    /**
     * Объект, хранящий итоговое кадрирование: сторона квадрата и смещение
     * от верхнего левого угла исходного изображения.
     * @type {Square}
     * @private
     */
    _resizeConstraint: null,

    /**
     * Отрисовка канваса.
     */
    redraw: function() {
      // Очистка изображения.
      this._ctx.clearRect(0, 0, this._container.width, this._container.height);

      // Параметры линии.
      // NB! Такие параметры сохраняются на время всего процесса отрисовки
      // canvas'a поэтому важно вовремя поменять их, если нужно начать отрисовку
      // чего-либо с другой обводкой.

      // Толщина линии.
      this._ctx.lineWidth = 6;
      // Цвет обводки.
      this._ctx.strokeStyle = '#ffe753';
      // Размер штрихов. Первый элемент массива задает длину штриха, второй
      // расстояние между соседними штрихами.
      this._ctx.setLineDash([15, 10]);
      // Смещение первого штриха от начала линии.
      this._ctx.lineDashOffset = 7;

      // Сохранение состояния канваса.
      // Подробней см. строку 132.
      this._ctx.save();

      // Установка начальной точки системы координат в центр холста.
      this._ctx.translate(this._container.width / 2, this._container.height / 2);

      var displX = -(this._resizeConstraint.x + this._resizeConstraint.side / 2);
      var displY = -(this._resizeConstraint.y + this._resizeConstraint.side / 2);
      // Отрисовка изображения на холсте. Параметры задают изображение, которое
      // нужно отрисовать и координаты его верхнего левого угла.
      // Координаты задаются от центра холста.
      this._ctx.drawImage(this._image, displX, displY);

      // Отрисовка прямоугольника, обозначающего область изображения после
      // кадрирования. Координаты задаются от центра.
      // this._ctx.strokeRect(
      //     (-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
      //     (-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
      //     this._resizeConstraint.side + this._ctx.lineWidth,
      //     this._resizeConstraint.side + this._ctx.lineWidth);

      // рисуем рамку из точек.
      // this._drawCircleRect((-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
      //                      (-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
      //                      this._resizeConstraint.side + this._ctx.lineWidth,
      //                      this._resizeConstraint.side + this._ctx.lineWidth);
      this._drawZigZagRect((-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
                           (-this._resizeConstraint.side / 2) - this._ctx.lineWidth / 2,
                           this._resizeConstraint.side + this._ctx.lineWidth,
                           this._resizeConstraint.side + this._ctx.lineWidth);

      // вокруг ограничительной рамки рисует полупрозрачный черный слой.
      this._drawBlackLayer();

      // выводим размеры изображения
      this._drawImageSize();

      // Восстановление состояния канваса, которое было до вызова ctx.save
      // и последующего изменения системы координат. Нужно для того, чтобы
      // следующий кадр рисовался с привычной системой координат, где точка
      // 0 0 находится в левом верхнем углу холста, в противном случае
      // некорректно сработает даже очистка холста или нужно будет использовать
      // сложные рассчеты для координат прямоугольника, который нужно очистить.
      this._ctx.restore();
    },

    /**
     * Рисует прямоуголник, состоящий из кружков.
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @private
    **/
    _drawCircleRect: function(x, y, width, height) {
      this._drawCircledLine(new Coordinate(x, y), new Coordinate(x + width, y));
      this._drawCircledLine(new Coordinate(x + width, y), new Coordinate(x + width, y + height));
      this._drawCircledLine(new Coordinate(x + width, y + height), new Coordinate(x, y + height));
      this._drawCircledLine(new Coordinate(x, y + height), new Coordinate(x, y));
    },

    _drawZigZagRect: function(x, y, width, height) {
      this._ctx.setLineDash([]);
      this._ctx.beginPath();

      this._drawZigZagLine(new Coordinate(x, y), new Coordinate(x + width, y));
      this._drawZigZagLine(new Coordinate(x + width, y), new Coordinate(x + width, y + height));
      this._drawZigZagLine(new Coordinate(x + width, y + height), new Coordinate(x, y + height));
      this._drawZigZagLine(new Coordinate(x, y + height), new Coordinate(x, y));

      this._ctx.stroke();
    },

    /**
     * Соединяет две точки линией состоящей из кружков.
     * @param {Coordinate} a
     * @param {Coordinate} b
     * @private
    **/
    _drawCircledLine: function(a, b) {
      var radius = this._ctx.lineWidth / 2;
      var interval = 4;

      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

      var sin = Math.abs((a.y - b.y) / distance);
      var cos = Math.abs((a.x - b.x) / distance);

      var step = 2 * radius + interval;

      var directionX = a.x < b.x ? 1 : -1;
      var directionY = a.y < b.y ? 1 : -1;

      var deltaX = step * cos * directionX;
      var deltaY = step * sin * directionY;

      var curr = new Coordinate(a.x, a.y);
      var i = 0;
      while(distance > 0) {
        if (i !== 0) {
          curr.x += deltaX;
          curr.y += deltaY;
        }
        this._drawCircle(curr, radius);
        distance -= step;
        i++;
      }
    },

    /**
     * Рисует отрезок зигзагом.
     * @private
    **/
    _drawZigZagLine: function(a, b) {
      var distance = Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));

      var sin = Math.abs((a.y - b.y) / distance);
      var cos = Math.abs((a.x - b.x) / distance);

      var step = 10;

      var directionX = a.x < b.x ? 1 : -1;
      var directionY = a.y < b.y ? 1 : -1;

      var deltaX = step * cos * directionX;
      var deltaY = step * sin * directionY;

      var curr = new Coordinate(a.x, a.y);

      while (distance > step) {
        var next = new Coordinate(curr.x + deltaX, curr.y + deltaY);

        this._drawZigZag(curr, next);
        distance -= step;
        curr = next;
      }
    },

    /**
     * Рисует зигзаг между двумя точками.
     * @private
    **/
    _drawZigZag: function(a, b) {
      var deviation = 5;

      if (a.x > b.x || a.y < b.y) {
        deviation = -deviation;
      }

      this._ctx.lineTo(a.x, a.y);
      if (a.y === b.y) {
        this._ctx.lineTo((a.x + b.x) / 2, a.y + deviation);
      }
      if (a.x === b.x) {
        this._ctx.lineTo(a.x + deviation, (a.y + b.y) / 2);
      }
      this._ctx.lineTo(b.x, b.y);
    },

    /**
     * Рисует кружок.
     * @param {Coordinate} point
     * @param {number} radius
     * @private
    **/
    _drawCircle: function(point, radius) {
      this._ctx.beginPath();
      this._ctx.fillStyle = 'yellow';
      this._ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      this._ctx.fill();
    },

    /**
     * Вокруг ограничительного жёлтого прямоугольника прямоугольника
     * рисуем два прямоугольника с общим цетром в центре холста
     * и закрашиваем пространство между ними полупрозрачным фоном.
     * @private
    **/
    _drawBlackLayer: function() {

      this._ctx.beginPath();

      // перемещаем перо в левый верхний угол ограничительного прямоугольника,
      // с учетом толщины его границы
      this._ctx.moveTo(
          (-this._resizeConstraint.side / 2) - this._ctx.lineWidth,
          (-this._resizeConstraint.side / 2) - this._ctx.lineWidth);

      var innerRectWidth = this._resizeConstraint.side + 2 * this._ctx.lineWidth;
      var innerRectHeight = this._resizeConstraint.side + 2 * this._ctx.lineWidth;

      // рисуем контур внутреннего прямоугольника.
      this._passRoundRect(innerRectWidth, innerRectHeight, true);

      // соединяем контур внутреннего прямоугольника с контуром внешнего прямоугольника.
      this._ctx.lineTo(-this._container.width / 2, -this._container.height / 2);

      // рисуем контур внешнего прямоугольника.
      this._passRoundRect(this._container.width, this._container.height, false);

      // закрашиваем получившуюся фигуру полупрозрачным черным фоном.
      this._ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this._ctx.fill();
    },

    /**
     * Выводим текст с размерами изображения над ограничительным прямоугольником
     * @private
    **/
    _drawImageSize: function() {
      this._ctx.fillStyle = 'white';
      this._ctx.textAlign = 'center';
      this._ctx.fillText(this._image.naturalWidth + ' X ' + this._image.naturalHeight,
        0, -this._resizeConstraint.side / 2 - 2 * this._ctx.lineWidth);
    },

    /**
     * Обводит контур прямоугольника по или против часовой стрелки
     * @param {number} width
     * @param {number} height
     * @param {boolean} leftToRight
     * @private
    **/
    _passRoundRect: function(width, height, leftToRight) {
      // рисуем контур прямоугольника
      if (leftToRight) {
        // из левого верхнего угла в правый верхний угол
        this._ctx.lineTo(width / 2, -height / 2);
        // из правого верхнего угла в правый нижний угол
        this._ctx.lineTo(width / 2, height / 2);
        // из правого нижнего угла в левый нижний угол
        this._ctx.lineTo(-width / 2, height / 2);
        // из левого нижнего в левый верхний угол
        this._ctx.lineTo(-width / 2, -height / 2);
      } else {
        // из левого верхнего угла в левый нижний угол
        this._ctx.lineTo(-width / 2, height / 2);
        // из левого нижнего угла в правый нижний угол
        this._ctx.lineTo(width / 2, height / 2);
        // из правого нижнего угла в правый верхний угол
        this._ctx.lineTo(width / 2, -height / 2);
        // из правого верхнего угла в левый верхний угол
        this._ctx.lineTo(-width / 2, -height / 2);
      }
    },

    /**
     * Включение режима перемещения. Запоминается текущее положение курсора,
     * устанавливается флаг, разрешающий перемещение и добавляются обработчики,
     * позволяющие перерисовывать изображение по мере перетаскивания.
     * @param {number} x
     * @param {number} y
     * @private
     */
    _enterDragMode: function(x, y) {
      this._cursorPosition = new Coordinate(x, y);
      document.body.addEventListener('mousemove', this._onDrag);
      document.body.addEventListener('mouseup', this._onDragEnd);
    },

    /**
     * Выключение режима перемещения.
     * @private
     */
    _exitDragMode: function() {
      this._cursorPosition = null;
      document.body.removeEventListener('mousemove', this._onDrag);
      document.body.removeEventListener('mouseup', this._onDragEnd);
    },

    /**
     * Перемещение изображения относительно кадра.
     * @param {number} x
     * @param {number} y
     * @private
     */
    updatePosition: function(x, y) {
      this.moveConstraint(
          this._cursorPosition.x - x,
          this._cursorPosition.y - y);
      this._cursorPosition = new Coordinate(x, y);
    },

    /**
     * @param {MouseEvent} evt
     * @private
     */
    _onDragStart: function(evt) {
      this._enterDragMode(evt.clientX, evt.clientY);
    },

    /**
     * Обработчик окончания перетаскивания.
     * @private
     */
    _onDragEnd: function() {
      this._exitDragMode();
    },

    /**
     * Обработчик события перетаскивания.
     * @param {MouseEvent} evt
     * @private
     */
    _onDrag: function(evt) {
      this.updatePosition(evt.clientX, evt.clientY);
    },

    /**
     * Добавление элемента в DOM.
     * @param {Element} element
     */
    setElement: function(element) {
      if (this._element === element) {
        return;
      }

      this._element = element;
      this._element.insertBefore(this._container, this._element.firstChild);
      // Обработчики начала и конца перетаскивания.
      this._container.addEventListener('mousedown', this._onDragStart);
    },

    /**
     * Возвращает кадрирование элемента.
     * @return {Square}
     */
    getConstraint: function() {
      return this._resizeConstraint;
    },

    /**
     * Смещает кадрирование на значение указанное в параметрах.
     * @param {number} deltaX
     * @param {number} deltaY
     * @param {number} deltaSide
     */
    moveConstraint: function(deltaX, deltaY, deltaSide) {
      this.setConstraint(
          this._resizeConstraint.x + (deltaX || 0),
          this._resizeConstraint.y + (deltaY || 0),
          this._resizeConstraint.side + (deltaSide || 0));
    },

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} side
     */
    setConstraint: function(x, y, side) {
      if (typeof x !== 'undefined') {
        this._resizeConstraint.x = x;
      }

      if (typeof y !== 'undefined') {
        this._resizeConstraint.y = y;
      }

      if (typeof side !== 'undefined') {
        this._resizeConstraint.side = side;
      }

      requestAnimationFrame(function() {
        this.redraw();
        window.dispatchEvent(new CustomEvent('resizerchange'));
      }.bind(this));
    },

    /**
     * Удаление. Убирает контейнер из родительского элемента, убирает
     * все обработчики событий и убирает ссылки.
     */
    remove: function() {
      this._element.removeChild(this._container);

      this._container.removeEventListener('mousedown', this._onDragStart);
      this._container = null;
    },

    /**
     * Экспорт обрезанного изображения как HTMLImageElement и исходником
     * картинки в src в формате dataURL.
     * @return {Image}
     */
    exportImage: function() {
      // Создаем Image, с размерами, указанными при кадрировании.
      var imageToExport = new Image();

      // Создается новый canvas, по размерам совпадающий с кадрированным
      // изображением, в него добавляется изображение взятое из канваса
      // с измененными координатами и сохраняется в dataURL, с помощью метода
      // toDataURL. Полученный исходный код, записывается в src у ранее
      // созданного изображения.
      var temporaryCanvas = document.createElement('canvas');
      var temporaryCtx = temporaryCanvas.getContext('2d');
      temporaryCanvas.width = this._resizeConstraint.side;
      temporaryCanvas.height = this._resizeConstraint.side;
      temporaryCtx.drawImage(this._image,
          -this._resizeConstraint.x,
          -this._resizeConstraint.y);
      imageToExport.src = temporaryCanvas.toDataURL('image/png');

      return imageToExport;
    },

    /**
     * Возвращает загруженную картинку.
     * @return {Image}
     */
    getImage: function() {
      return this._image;
    }
  };

  /**
   * Вспомогательный тип, описывающий квадрат.
   * @constructor
   * @param {number} x
   * @param {number} y
   * @param {number} side
   * @private
   */
  var Square = function(x, y, side) {
    this.x = x;
    this.y = y;
    this.side = side;
  };

  /**
   * Вспомогательный тип, описывающий координату.
   * @constructor
   * @param {number} x
   * @param {number} y
   * @private
   */
  var Coordinate = function(x, y) {
    this.x = x;
    this.y = y;
  };

  window.Resizer = Resizer;
})();


