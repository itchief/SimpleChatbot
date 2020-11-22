// полифилл для closest
if (!Element.prototype.matches) {
  Element.prototype.matches =
    Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}
if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this;
    do {
      if (Element.prototype.matches.call(el, s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

function getDateTime() {
  var now = new Date();
  var gmt =
    'GMT ' + (-now.getTimezoneOffset() < 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60);
  return now.toLocaleString() + gmt;
}

var ChatBotByItchief = function (config) {
  if (config['element']) {
    this._$element = config['element'];
  } else {
    throw 'ChatBotByItchief: ключ element должен присутствовать в передаваемых данных';
  }
  if (config['data']) {
    this._data = config['data'];
  } else {
    throw 'ChatBotByItchief: ключ data должен присутствовать в передаваемых данных';
  }
  this._url = config['url'] ? config['url'] : '/chatbot/chatbot.php';
  this._keyLS = config['keyLS'] ? config['keyLS'] : 'fingerprint';
  this._delay = 500;
  this._botId = 0;
  this._contentIndex = 1;
  this._start = true;
  this._fields = {};

  var fromStorage = localStorage.getItem('chatbot');
  if (fromStorage) {
    var dataFromStorage = JSON.parse(fromStorage);
    for (var key in dataFromStorage.fields) {
      this._fields[key] = dataFromStorage.fields[key];
    }
    var html = [];
    for (var i = 0, length = dataFromStorage.data.length; i < length; i++) {
      var value = dataFromStorage.data[i];
      var state = value.type === 'bot' ? '' : '-disabled';
      var code = this._template(value.type, value.content, state);
      html.push(code);
    }
    var $container = this._$element.querySelector('.chatbot__items');
    $container.insertAdjacentHTML('beforeend', html.join(''));
    this._botId = dataFromStorage.botId;
    this._outputContent(0);
  } else {
    this._outputContent(this._delay);
  }
  this._addEventListener();
};

// общий шаблон
ChatBotByItchief.prototype._template = function (type, content, state) {
  var state = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
  return '<div class="chatbot__item chatbot__item_'
    .concat(type, '"><div class="chatbot__content chatbot__content_')
    .concat(type, state, '">', content, '</div></div>');
};

// шаблон кнопки
ChatBotByItchief.prototype._templateBtn = function (botId, content) {
  return '<button class="btn" type="button" data-bot-id="' + botId + '">' + content + '</button>';
};

// получить данные
ChatBotByItchief.prototype._getData = function (target, id) {
  var chatObj = this._data[target];
  return chatObj[id];
};

// вывод контента
ChatBotByItchief.prototype._outputContent = function (interval) {
  var botData = this._getData('bot', this._botId);
  var humanIds = botData.human;
  var $container = this._$element.querySelector('.chatbot__items');
  var botContent = botData.content;
  if (botContent.indexOf('{{') !== -1) {
    for (var key in this._fields) {
      botContent = botContent.split('{{'.concat(key, '}}')).join(this._fields[key]);
    }
  }
  var $botContent = this._template('bot', botContent);
  var _this = this;
  var fn1 = function () {
    $container.insertAdjacentHTML('beforeend', $botContent);
    $container.scrollTop = $container.scrollHeight;
  };
  var fn2 = function () {
    if (_this._getData('human', humanIds[0]).content === '') {
      _this._$element.querySelector('.chatbot__input').disabled = false;
      _this._$element.querySelector('.chatbot__input').dataset.name = _this._getData(
        'human',
        humanIds[0]
      ).name;
      _this._$element.querySelector('.chatbot__submit').disabled = true;
      _this._$element.querySelector('.chatbot__input').focus();
      _this._$element.querySelector('.chatbot__submit').dataset.botId = _this._getData(
        'human',
        humanIds[0]
      ).bot;
    } else {
      _this._$element.querySelector('.chatbot__input').value = '';
      _this._$element.querySelector('.chatbot__input').disabled = true;
      _this._$element.querySelector('.chatbot__submit').disabled = true;
      var $humanContent = humanIds.map(function (id) {
        var humanData = _this._getData('human', id);
        return _this._templateBtn(humanData.bot, humanData.content);
      });
      var $humanContentWrapper = _this._template('human', $humanContent.join(''));
      $container.insertAdjacentHTML('beforeend', $humanContentWrapper);
      $container.scrollTop = $container.scrollHeight;
    }
  };
  if (interval) {
    window.setTimeout(function () {
      fn1();
      window.setTimeout(function () {
        fn2();
      }, interval);
    }, interval);
  } else {
    fn1();
    fn2();
  }
};

// перевод ответа пользователя в неактивный
ChatBotByItchief.prototype._humanResponseToDisabled = function ($target) {
  var $container = $target.closest('.chatbot__content_human');
  var content = $target.innerHTML;
  $container.innerHTML = content;
  $container.classList.remove('chatbot__content_human');
  $container.classList.add('chatbot__content_human-disabled');
  return content;
};

ChatBotByItchief.prototype._addToChatHumanResponse = function (humanContent) {
  var $container = this._$element.querySelector('.chatbot__items');
  var $humanContent = this._template('human', humanContent, '-disabled');
  $container.insertAdjacentHTML('beforeend', $humanContent);
  $container.scrollTop = $container.scrollHeight;
};

// функция для обработки события click
ChatBotByItchief.prototype._eventHandlerClick = function (e) {
  var $target = e.target;
  var botId = $target.dataset.botId;
  var url = this._url;
  var data = {};
  var humanContent = '';
  var humanField = '';
  if ($target.closest('.chatbot__submit')) {
    if ($target.closest('.chatbot__submit').disabled) {
      return;
    }
    if (!this._$element.querySelector('.chatbot__input').value.length) {
      return;
    }
    this._botId = +$target.closest('.chatbot__submit').dataset.botId;
    humanContent = this._$element.querySelector('.chatbot__input').value;
    humanField = this._$element.querySelector('.chatbot__input').dataset.name;
    if (humanField) {
      this._fields[humanField] = humanContent;
    }
    this._addToChatHumanResponse(humanContent);
    this._outputContent(this._delay);
  } else if (botId) {
    this._botId = +botId;
    // переводим ответ пользователя в неактивный
    humanContent = this._humanResponseToDisabled($target);
    // выводим следующий контент
    this._outputContent(this._delay);
  } else if ($target.classList.contains('chatbot__close')) {
    $target.closest('.chatbot').classList.add('chatbot_hidden');
    document.querySelector('.chatbot-btn').classList.remove('chatbot-btn_hidden');
    return;
  } else {
    return;
  }
  e.preventDefault();
  // получаем последние сообщение бота
  var $botWrapper = document.querySelectorAll('.chatbot__item_bot');
  var $botContent = $botWrapper[$botWrapper.length - 1];
  var $botItems = $botContent.querySelectorAll('.chatbot__content');
  var _this = this;
  for (var i = 0, length = $botItems.length; i < length; i++) {
    data[_this._contentIndex] = {
      type: 'bot',
      content: $botItems[i].innerHTML,
    };
    _this._contentIndex++;
  }
  data[this._contentIndex] = {
    type: 'human',
    content: humanContent,
  };
  this._contentIndex++;

  var fromStorage = localStorage.getItem('chatbot');
  var dataToStorage = [];
  var fieldsToStorage = {};
  if (fromStorage) {
    dataToStorage = JSON.parse(fromStorage).data;
    fieldsToStorage = JSON.parse(fromStorage).fields;
  }
  for (var key in data) {
    dataToStorage.push({
      type: data[key].type,
      content: data[key].content,
    });
  }
  if (humanField) {
    fieldsToStorage[humanField] = humanContent;
  }
  var dataToStorageJSON = JSON.stringify({
    botId: this._botId,
    data: dataToStorage,
    fields: fieldsToStorage,
  });
  localStorage.setItem('chatbot', dataToStorageJSON);

  // данные для отправки
  var dataSend = JSON.stringify({
    id: localStorage.getItem(this._keyLS),
    chat: data,
    start: this._start,
    date: getDateTime(),
  });

  this._start = false;

  // отправляем данные на сервер
  var request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (request.readyState === 0 || request.readyState === 4) {
      if (request.status == 200) {
        //console.log(JSON.parse(request.responseText));
      } else {
        //console.log('error');
      }
    }
  };
  request.open('POST', url);
  request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(dataSend);
};

// функция для обработки события change
ChatBotByItchief.prototype._eventHandlerKeydown = function (e) {
  var $target = e.target;
  if (!$target.classList.contains('chatbot__input')) {
    return;
  }
  var btnSubmit = this._$element.querySelector('.chatbot__submit');
  if ($target.value.length > 0) {
    btnSubmit.disabled = false;
  } else {
    btnSubmit.disabled = true;
  }
};

// подключение обработчиков событий
ChatBotByItchief.prototype._addEventListener = function () {
  this._$element.addEventListener('click', this._eventHandlerClick.bind(this));
  this._$element.addEventListener('input', this._eventHandlerKeydown.bind(this));
};

var chatbotTemplate = function chatbotTemplate() {
  return '<div class="chatbot chatbot_hidden"><div class="chatbot__title">Chatbot<span class="chatbot__close">×</span></div><div class="chatbot__wrapper"><div class="chatbot__items"></div></div><div class="chatbot__footer"><input class="chatbot__input" type="text" disabled><button class="chatbot__submit" type="button" disabled><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16"><path fill="currentColor" d="M476 3.2L12.5 270.6a24 24 0 002.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5a24 24 0 0042.5 15.8L282 426l124.6 52.2a24 24 0 0033-18.2l72-432A24 24 0 00476 3.2z"/></svg></button></div></div>';
};

var chatBotByItchiefInit = function (config) {
  var chatbot;
  var $chatbot = document.querySelector('.chatbot');
  if (!$chatbot) {
    document.body.insertAdjacentHTML('beforeend', chatbotTemplate());
    $chatbot = document.querySelector('.chatbot');
  }
  config['element'] = $chatbot;
  document.querySelector(config.chatbotBtnSel).onclick = function (e) {
    var $chatbotToggle = e.target.closest(config.chatbotBtnSel);
    if ($chatbotToggle) {
      $chatbotToggle.classList.add('chatbot-btn_hidden');
      var $chatbotToggleTooltip = $chatbotToggle.querySelector('.chatbot-toggle-tooltip');
      if ($chatbotToggleTooltip) {
        $chatbotToggleTooltip.classList.remove('chatbot-toggle-tooltip_show');
      }
    }
    $chatbot.classList.toggle('chatbot_hidden');
    if (!chatbot) {
      chatbot = new ChatBotByItchief(config);
      return chatbot;
    }
  };
};
