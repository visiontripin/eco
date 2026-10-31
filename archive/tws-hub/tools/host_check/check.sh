#!/usr/bin/env bash
# Проверка прошивки TWS-HUB без железа: компилируем все исходники на хосте
# с заглушками Arduino-библиотек и ключом -fsyntax-only.
#
# Это НЕ проверяет логику и НЕ заменяет сборку под AVR, но ловит
# опечатки, необъявленные функции, неверные типы и ошибки PROGMEM.
#
# Переменные окружения:
#   BOARDS="1 2 5"   какие варианты плат проверить
#                    1 = Nano/Uno (SoftwareSerial)
#                    2 = Nano Every (Serial1)
#                    5 = Nano/Uno с аппаратным UART (отладка выключена)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
FW="$HERE/../../firmware/tws_hub"

CXX="${CXX:-g++}"
BASE="-std=c++17 -fsyntax-only -Wall -Wextra -Wno-unused-parameter -Wno-unused-function"
BOARDS="${BOARDS:-1 2 5}"

echo "== TWS-HUB host syntax check =="
fail=0

for board in $BOARDS; do
  echo "--- TWSHUB_BOARD=$board ---"
  # -D__AVR__ включает AVR-специфичные ветки (PROGMEM-идиомы, freeRam),
  # чтобы они тоже проверялись, а не только хост-путь.
  if ! $CXX $BASE -D__AVR__ -DTWSHUB_BOARD="$board" -I"$HERE/stubs" -I"$FW" \
        -x c++ "$FW/tws_hub.ino"; then
    echo "!! tws_hub.ino (board $board) failed"
    fail=1
  fi
  for f in "$FW"/*.cpp; do
    if ! $CXX $BASE -D__AVR__ -DTWSHUB_BOARD="$board" -I"$HERE/stubs" -I"$FW" "$f"; then
      echo "!! $(basename "$f") (board $board) failed"
      fail=1
    fi
  done
done

# Реальная сборка и линковка: ловит отсутствующие определения.
# Здесь __AVR__ НЕ определяем: freeRam() ссылается на символы линковщика
# __brkval / __heap_start, которых на хосте нет. Под AVR они есть.
if [ "${DEEP:-0}" = "1" ]; then
  TMP="$(mktemp -d)"
  echo "--- deep link (board 1, без __AVR__) ---"
  $CXX -std=c++17 -DTWSHUB_BOARD=1 -c -I"$HERE/stubs" -I"$FW" \
       -x c++ "$FW/tws_hub.ino" -o "$TMP/ino.o" || fail=1
  for f in "$FW"/*.cpp; do
    $CXX -std=c++17 -DTWSHUB_BOARD=1 -c -I"$HERE/stubs" -I"$FW" \
         "$f" -o "$TMP/$(basename "$f").o" || fail=1
  done
  printf 'int main(){return 0;}\n' > "$TMP/main.cpp"
  $CXX -std=c++17 -c "$TMP/main.cpp" -o "$TMP/main.o"
  $CXX "$TMP"/*.o -o "$TMP/twshub.elf" && echo "link OK" || fail=1
  rm -rf "$TMP"
fi

if [ "$fail" -eq 0 ]; then
  echo "== OK: синтаксис и типы в порядке =="
else
  echo "== ЕСТЬ ОШИБКИ =="
fi
exit $fail
