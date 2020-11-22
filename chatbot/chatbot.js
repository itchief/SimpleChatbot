function getDateTime() {
  const now = new Date();
  const gmt =
    'GMT ' + (-now.getTimezoneOffset() < 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60);
  return now.toLocaleString() + gmt;
}

class ChatBotByItchief {
  #$element;
  #data;
  #url;
  #keyLS;
  #delay = 500;
  #botId = 0;
  #contentIndex = 1;
  #start = true;
  #fields = {};

  // общий шаблон
  #template(type, content, state = '') {
    return `<div class='chatbot__item chatbot__item_${type}'>
      <div class='chatbot__content chatbot__content_${type}${state}'>${content}</div>
    </div>`;
  }

  // шаблон кнопки
  #templateBtn(botId, content) {
    return `<button class="btn" type="button" data-bot-id="${botId}">${content}</button>`;
  }

  // конструктор
  constructor(config) {
    if (config['element']) {
      this.#$element = config['element'];
    } else {
      throw 'ChatBotByItchief: ключ element должен присутствовать в передаваемых данных';
    }
    if (config['data']) {
      this.#data = config['data'];
    } else {
      throw 'ChatBotByItchief: ключ data должен присутствовать в передаваемых данных';
    }
    this.#url = config['url'] ? config['url'] : '/chatbot/chatbot.php';
    this.#keyLS = config['keyLS'] ? config['keyLS'] : 'fingerprint';

    const fromStorage = localStorage.getItem('chatbot');
    if (fromStorage) {
      const dataFromStorage = JSON.parse(fromStorage);
      for (let key in dataFromStorage.fields) {
        this.#fields[key] = dataFromStorage.fields[key];
      }
      let html = [];
      dataFromStorage.data.forEach(value => {
        const state = value.type === 'bot' ? '' : '-disabled';
        const code = this.#template(value.type, value.content, state);
        html.push(code);
      });
      const $container = this.#$element.querySelector('.chatbot__items');
      $container.insertAdjacentHTML('beforeend', html.join(''));
      this.#botId = dataFromStorage.botId;
      this.#outputContent(0);
    } else {
      this.#outputContent(this.#delay);
    }
    this.#addEventListener();
  }

  // получить данные
  #getData(target, id) {
    const chatObj = this.#data[target];
    return chatObj[id];
  }

  // вывод контента
  #outputContent(interval) {
    const botData = this.#getData('bot', this.#botId);
    const humanIds = botData.human;
    const $container = this.#$element.querySelector('.chatbot__items');
    let botContent = botData.content;
    if (botContent.indexOf('{{') !== -1) {
      for (let key in this.#fields) {
        botContent = botContent.replaceAll(`{{${key}}}`, this.#fields[key]);
      }
    }
    const $botContent = this.#template('bot', botContent);
    const fn1 = () => {
      $container.insertAdjacentHTML('beforeend', $botContent);
      $container.scrollTop = $container.scrollHeight;
    };
    const fn2 = () => {
      if (this.#getData('human', humanIds[0]).content === '') {
        this.#$element.querySelector('.chatbot__input').disabled = false;
        this.#$element.querySelector('.chatbot__input').dataset.name = this.#getData(
          'human',
          humanIds[0]
        ).name;
        this.#$element.querySelector('.chatbot__submit').disabled = true;
        this.#$element.querySelector('.chatbot__input').focus();
        this.#$element.querySelector('.chatbot__submit').dataset.botId = this.#getData(
          'human',
          humanIds[0]
        ).bot;
      } else {
        this.#$element.querySelector('.chatbot__input').value = '';
        this.#$element.querySelector('.chatbot__input').disabled = true;
        this.#$element.querySelector('.chatbot__submit').disabled = true;
        const $humanContent = humanIds.map(id => {
          const humanData = this.#getData('human', id);
          return this.#templateBtn(humanData.bot, humanData.content);
        });
        const $humanContentWrapper = this.#template('human', $humanContent.join(''));
        $container.insertAdjacentHTML('beforeend', $humanContentWrapper);
        $container.scrollTop = $container.scrollHeight;
      }
    };
    if (interval) {
      window.setTimeout(() => {
        fn1();
        window.setTimeout(() => {
          fn2();
        }, interval);
      }, interval);
    } else {
      fn1();
      fn2();
    }
  }

  // перевод ответа пользователя в неактивный
  #humanResponseToDisabled($target) {
    const $container = $target.closest('.chatbot__content_human');
    const content = $target.innerHTML;
    $container.innerHTML = content;
    $container.classList.remove('chatbot__content_human');
    $container.classList.add('chatbot__content_human-disabled');
    return content;
  }

  #addToChatHumanResponse(humanContent) {
    const $container = this.#$element.querySelector('.chatbot__items');
    const $humanContent = this.#template('human', humanContent, '-disabled');
    $container.insertAdjacentHTML('beforeend', $humanContent);
    $container.scrollTop = $container.scrollHeight;
  }

  // функция для обработки события click
  #eventHandlerClick(e) {
    const $target = e.target;
    const botId = $target.dataset.botId;
    const url = this.#url;
    let data = {};
    let humanContent = '';
    let humanField = '';
    if ($target.closest('.chatbot__submit')) {
      if ($target.closest('.chatbot__submit').disabled) {
        return;
      }
      if (!this.#$element.querySelector('.chatbot__input').value.length) {
        return;
      }
      this.#botId = +$target.closest('.chatbot__submit').dataset.botId;
      humanContent = this.#$element.querySelector('.chatbot__input').value;
      humanField = this.#$element.querySelector('.chatbot__input').dataset.name;
      if (humanField) {
        this.#fields[humanField] = humanContent;
      }
      this.#addToChatHumanResponse(humanContent);
      this.#outputContent(this.#delay);
    } else if (botId) {
      this.#botId = +botId;
      // переводим ответ пользователя в неактивный
      humanContent = this.#humanResponseToDisabled($target);
      // выводим следующий контент
      this.#outputContent(this.#delay);
    } else if ($target.classList.contains('chatbot__close')) {
      $target.closest('.chatbot').classList.add('chatbot_hidden');
      document.querySelector('.chatbot-btn').classList.remove('chatbot-btn_hidden');
      return;
    } else {
      return;
    }
    e.preventDefault();
    // получаем последние сообщение бота
    const $botWrapper = document.querySelectorAll('.chatbot__item_bot');
    const $botContent = $botWrapper[$botWrapper.length - 1];
    const $botItems = $botContent.querySelectorAll('.chatbot__content');
    $botItems.forEach($element => {
      data[this.#contentIndex] = {
        type: 'bot',
        content: $element.innerHTML,
      };
      this.#contentIndex++;
    });
    data[this.#contentIndex] = {
      type: 'human',
      content: humanContent,
    };
    this.#contentIndex++;

    const fromStorage = localStorage.getItem('chatbot');
    let dataToStorage = [];
    let fieldsToStorage = {};
    if (fromStorage) {
      dataToStorage = JSON.parse(fromStorage).data;
      fieldsToStorage = JSON.parse(fromStorage).fields;
    }
    for (const key in data) {
      dataToStorage.push({
        type: data[key].type,
        content: data[key].content,
      });
    }
    if (humanField) {
      fieldsToStorage[humanField] = humanContent;
    }
    const dataToStorageJSON = JSON.stringify({
      botId: this.#botId,
      data: dataToStorage,
      fields: fieldsToStorage,
    });
    localStorage.setItem('chatbot', dataToStorageJSON);

    // данные для отправки
    const dataSend = JSON.stringify({
      id: localStorage.getItem(this.#keyLS),
      chat: data,
      start: this.#start,
      date: getDateTime(),
    });

    this.#start = false;

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
  }

  // функция для обработки события change
  #eventHandlerKeydown(e) {
    const $target = e.target;
    if (!$target.classList.contains('chatbot__input')) {
      return;
    }
    const btnSubmit = this.#$element.querySelector('.chatbot__submit');
    if ($target.value.length > 0) {
      btnSubmit.disabled = false;
    } else {
      btnSubmit.disabled = true;
    }
  }

  // подключение обработчиков событий
  #addEventListener() {
    this.#$element.addEventListener('click', this.#eventHandlerClick.bind(this));
    this.#$element.addEventListener('input', this.#eventHandlerKeydown.bind(this));
  }
}

const chatbotTemplate = () => {
  return `<div class="chatbot chatbot_hidden">
    <div class="chatbot__title">
      Chatbot
      <span class="chatbot__close">×</span>
    </div>
    <div class="chatbot__wrapper">
      <div class="chatbot__items"></div>
    </div>
    <div class="chatbot__footer">
      <input class="chatbot__input" type="text" disabled>
      <button class="chatbot__submit" type="button" disabled>
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16"><path fill="currentColor" d="M476 3.2L12.5 270.6a24 24 0 002.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5a24 24 0 0042.5 15.8L282 426l124.6 52.2a24 24 0 0033-18.2l72-432A24 24 0 00476 3.2z"/></svg>
      </button>
    </div>
  </div>`;
};

const chatBotByItchiefInit = config => {
  let chatbot;
  let $chatbot = document.querySelector('.chatbot');
  if (!$chatbot) {
    document.body.insertAdjacentHTML('beforeend', chatbotTemplate());
    $chatbot = document.querySelector('.chatbot');
  }
  config['element'] = $chatbot;
  document.querySelector(config.chatbotBtnSel).onclick = e => {
    const $chatbotToggle = e.target.closest(config.chatbotBtnSel);
    if ($chatbotToggle) {
      $chatbotToggle.classList.add('chatbot-btn_hidden');
      const $chatbotToggleTooltip = $chatbotToggle.querySelector('.chatbot-toggle-tooltip');
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
