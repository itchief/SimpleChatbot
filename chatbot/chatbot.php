<?php

$path = __DIR__ . '/chats/';

$data['result'] = 'success';

// получаем данные, которые пришли на сервер
$input = file_get_contents('php://input');
// декодируем полученную JSON строку
$data = json_decode($input, true);
// проверяем была ли ошибка при декодировании JSON
if (json_last_error() !== JSON_ERROR_NONE) {
  $data['result'] = 'error';
  $data['error'] = 'Произошла ошибка при декодировании JSON строки';
  echo json_encode($data);
  exit();
}

// получаем id клиента
$idClient = $data['id'];
// получаем сообщения из чата
$chat = $data['chat'];

$start = $data['start'];
//
$date = $data['date'];

// имя файла
$fileName = $path.$idClient;

$output = '';

foreach ($chat as $key => $value) {
  $output .= $key . '[' . $value['type'] . ']:' . PHP_EOL;
  $output .= strip_tags($value['content']) . PHP_EOL;
}

if (!file_exists($fileName)) {
  $text = '// ' . $idClient . ' //' . PHP_EOL . PHP_EOL;
  if ($start) {
    $text .= '/////// start ///////' . PHP_EOL . $date . PHP_EOL . '/////// start ///////' . PHP_EOL;

  }
  $text .= $output;
  file_put_contents($fileName, $text, LOCK_EX);
} else {
  $text = '';
  if ($start) {
    $text .= PHP_EOL. '/////// start ///////' . PHP_EOL . $date . PHP_EOL . '/////// start ///////' . PHP_EOL;
  }
  $text .= $output;
  file_put_contents($fileName, $text, FILE_APPEND | LOCK_EX);
}

echo json_encode($data);
