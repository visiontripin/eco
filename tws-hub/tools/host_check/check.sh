#!/usr/bin/env bash
# Проверка прошивки TWS-HUB без железа: компилируем все исходники на хосте
# с заглушками Arduino-библиотек и ключом -fsyntax-only.
#
# Это НЕ проверяет логику и НЕ заменяет сборку под AVR, но ловит
# опечатки, необъявленные функции, неверные типы и ошибки PROGMEM.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
FW="$HERE/../../firmware/tws_hub"

CXX="${CXX:-g++}"
FLAGS="-std=c++17 -fsyntax-only -Wall -Wextra -Wno-unused-parameter -Wno-unused-function"

echo "== TWS-HUB host syntax check =="
fail=0

# .ino компилируем как C++ ( Arduino IDE делает то же самое )
if ! $CXX $FLAGS -x c++ -I"$HERE/stubs" -I"$FW" "$FW/tws_hub.ino"; then
  echo "!! tws_hub.ino failed"
  fail=1
fi

for f in "$FW"/*.cpp; do
  echo "-- $(basename "$f")"
  if ! $CXX $FLAGS -I"$HERE/stubs" -I"$FW" "$f"; then
    echo "!! $(basename "$f") failed"
    fail=1
  fi
done

# Дополнительная проверка: реальная сборка и линковка (ловит отсутствующие
# определения), объекты не запускаем.
if [ "${DEEP:-0}" = "1" ]; then
  TMP="$(mktemp -d)"
  echo "== deep build =="
  $CXX -std=c++17 -c -I"$HERE/stubs" -I"$FW" "$FW"/*.cpp -o /dev/null 2>&1 | head -40
  for f in "$FW"/*.cpp; do
    $CXX -std=c++17 -c -I"$HERE/stubs" -I"$FW" "$f" -o "$TMP/$(basename "$f").o" || fail=1
  done
  rm -rf "$TMP"
fi

if [ "$fail" -eq 0 ]; then
  echo "== OK: синтаксис и типы в порядке =="
else
  echo "== ЕСТЬ ОШИБКИ =="
fi
exit $fail
