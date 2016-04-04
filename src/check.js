'use strict';

function getMessage(a, b) {
  if (typeof a === 'boolean') {
    return a ? 'Переданное GIF-изображение анимировано и содержит' + b + ' кадров'
         : 'Переданное GIF-изображение не анимировано';
  }

  if (typeof a === 'number') {
    return 'Переданное SVG-изображение содержит' + a + ' объектов и ' + b * 4 + ' атрибутов';
  }

  if (a instanceof Array) {

    return b instanceof Array
       ? 'Общая площадь артефактов сжатия: ' + getSquare(a, b) + ' пикселей'
      : 'Количество красных точек во всех строчках изображения: ' + getSum(a);
  }

  return '';
}

function getSum(arr) {
  return arr.reduce(function(sum, elem) {
    return sum + elem;
  }, 0);
}

function getSquare(arr1, arr2) {
  var result = 0;

  for(var i = 0; i < arr1.length; i++) {
    result += arr1[i] * arr2[i];
  }
  return result;
}
