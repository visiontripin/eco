/* =========================================================================
 * TWS-HUB  --  config.h
 * Контроллер Bluetooth-хаба для нескольких BT-колонок.
 * Плата: Arduino Nano Every (рекомендуется) / Nano / Uno / Mega 2560.
 *
 * ВНИМАНИЕ: Arduino НЕ обрабатывает аудио. Она только управляет
 * Bluetooth-модулями по UART (AT-команды), рисует меню и опрашивает кнопки.
 * Аудио идёт между BT-модулями по I2S/аналогу, минуя MCU.
 * ========================================================================= */
#pragma once

#include <Arduino.h>
#include <stdint.h>

#define TWS_HUB_VERSION "0.4.0"

/* --------------------------- 1. Выбор платы ---------------------------- */
#define BOARD_NANO_CLASSIC 1   /* ATmega328P 16MHz, 2KB RAM: SoftSerial D7/D8, USB свободен */
#define BOARD_NANO_EVERY   2   /* ATmega4809 20MHz, 6KB RAM, Serial1 */
#define BOARD_UNO          3   /* ATmega328P 16MHz, 2KB RAM: то же, что Nano Classic */
#define BOARD_MEGA2560     4   /* ATmega2560, 8KB RAM, Serial1 */
#define BOARD_NANO_HWUART  5   /* ATmega328P: аппаратный UART D0/D1 на 115200, отладки НЕТ */

/* >>> ВАША КОНФИГУРАЦИЯ: Arduino Nano (ATmega328P) <<< */
#ifndef TWSHUB_BOARD
  #define TWSHUB_BOARD BOARD_NANO_CLASSIC
#endif

/* --------------------------- 2. UART к BT-модулям ---------------------- */
/*
 * Модули Feasycom по умолчанию работают на 115200.
 * У ATmega328P один аппаратный UART и он занят USB-отладкой, поэтому
 * по умолчанию используем SoftwareSerial на D7/D8 и скорость 9600.
 *
 * Если нужен полный 115200 и отладка не важна -- поставьте
 * BOARD_NANO_HWUART: тогда BT-шина уедет на D0/D1, а Serial-монитор
 * придётся отключить (при заливке прошивки отключать не нужно).
 *
 * При первом запуске прошивка сама находит скорость модуля и переводит
 * его на BT_TARGET_BAUD (см. bt_slot.cpp: slotEnsureBaud()).
 */
#if (TWSHUB_BOARD == BOARD_NANO_EVERY) || (TWSHUB_BOARD == BOARD_MEGA2560)
  #define BT_UART_HARDWARE 1
  #define BT_PORT          Serial1
  #define BT_BAUD          115200
#elif (TWSHUB_BOARD == BOARD_NANO_HWUART)
  #define BT_UART_HARDWARE 1
  #define BT_PORT          Serial
  #define BT_BAUD          115200
#else
  #define BT_UART_HARDWARE 0
  #define BT_RX_PIN        7
  #define BT_TX_PIN        8
  #define BT_BAUD          9600
#endif

/* Скорость, на которую переключаем модули при инициализации.
 * Для SoftwareSerial НЕ ставьте выше 19200. */
#ifndef BT_TARGET_BAUD
  #if BT_UART_HARDWARE
    #define BT_TARGET_BAUD 115200
  #else
    #define BT_TARGET_BAUD 9600
  #endif
#endif

/* --------------------------- 3. Раскладка пинов ------------------------ */
#define PIN_MUX_S0    9     /* 74HC4051 A */
#define PIN_MUX_S1    10    /* 74HC4051 B */
#define PIN_MUX_S2    11    /* 74HC4051 C */

#define PIN_BTN_UP    2
#define PIN_BTN_DOWN  3
#define PIN_BTN_OK    4
#define PIN_BTN_BACK  5
#define PIN_BTN_FN    6

#define PIN_BUZZER    12    /* опционально: пищалка со своим генератором */
#define PIN_LED       LED_BUILTIN

/* I2C (A4=SDA, A5=SCL на Nano/Uno): OLED SSD1306 + PCF8574 */

#define BTN_ACTIVE     LOW  /* кнопки подтянуты к GND */

/* --------------------------- 4. Дисплей -------------------------------- */
#define DISP_NONE      0
#define DISP_U8X8      1    /* U8g2 в текстовом режиме, без framebuffer */

#ifndef TWSHUB_DISPLAY
  #define TWSHUB_DISPLAY DISP_U8X8
#endif

#define DISP_COLS      16
#define DISP_ROWS      8

/* --------------------------- 5. Логика --------------------------------- */
#define MAX_SLOTS          8     /* слот 0 = приёмник, слоты 1..7 = передатчики */
#define RX_SLOT            0

/* База колонок -- самый крупный потребитель ОЗУ: запись 28 байт.
   На ATmega328P (2 КБ ОЗУ) 16 записей = 448 байт -- многовато,
   поэтому для него по умолчанию 8 (224 байта). */
#ifndef MAX_SPEAKERS
  #if (TWSHUB_BOARD == BOARD_NANO_EVERY) || (TWSHUB_BOARD == BOARD_MEGA2560)
    #define MAX_SPEAKERS   16
  #else
    #define MAX_SPEAKERS   8
  #endif
#endif

#define SPEAKER_NAME_LEN   16
#define BT_LINE_MAX        64    /* буфер строки ответа модуля */
#define BT_MAC_STR_LEN     13    /* 12 hex + '\0' */

/* Топология по умолчанию при первом включении.
   0 = TOPO_DUAL, 1 = TOPO_MULTI, 2 = TOPO_PARTY, 3 = TOPO_AURACAST
   (перечисление Topology -- в audio_core.h).
   AURACAST -- единственный режим, дающий синхронный звук на 3+ колонок
   разных брендов в одной комнате (см. docs/10-your-config.md). */
#ifndef TWSHUB_DEFAULT_TOPO
  #define TWSHUB_DEFAULT_TOPO 3
#endif

#define DEBOUNCE_MS        25
#define LONG_PRESS_MS      600
#define REPEAT_DELAY_MS    900
#define REPEAT_RATE_MS     180

#define UI_IDLE_MS         30000 /* гасим подсветку дисплея */

#define EEPROM_MAGIC0      'T'
#define EEPROM_MAGIC1      'W'
#define EEPROM_DB_VERSION  3
#define EEPROM_DB_BASE     8     /* заголовок 8 байт, затем записи */

/* --------------------------- 6. Отладка -------------------------------- */
/*
 * Отладка съедает прилично flash (vsnprintf_P + строки) и ~200 байт стека.
 * Если прошивка не влезает в 32 КБ ATmega328P -- поставьте 0.
 * На BOARD_NANO_HWUART отладка выключается принудительно: UART занят
 * BT-шиной, иначе в неё полетят отладочные строки.
 */
#ifndef TWSHUB_DEBUG
  #define TWSHUB_DEBUG 1
#endif

#if (TWSHUB_BOARD == BOARD_NANO_HWUART)
  #undef  TWSHUB_DEBUG
  #define TWSHUB_DEBUG 0
#endif

#define LOG_BAUD 115200

/* --------------------------- 7. Прочие тайминги ------------------------ */
#define BT_CMD_TIMEOUT_MS   1200
#define BT_CONN_TIMEOUT_MS  12000
#define BT_AUDIO_TIMEOUT_MS 8000
#define BT_REBOOT_DELAY_MS  1200

/*=========================================================================*/
/*              Профили Feasycom (битовая маска AT+PROFILE)                */
/*-------------------------------------------------------------------------*/
/*  BIT0  SPP                 BIT1  GATT Server    BIT2  GATT Client        */
/*  BIT3  HFP-HF (sink)       BIT4  HFP-AG (src)   BIT5  A2DP Sink          */
/*  BIT6  A2DP Source         BIT7  AVRCP CT       BIT8  AVRCP TG           */
/*  BIT9  HID                 BIT10 PBAP                                    */
/*=========================================================================*/
#define BT_PROFILE_SINK    1195u  /* SPP+GATTS+HFP-HF+A2DP Sink+AVRCP CT+PBAP */
#define BT_PROFILE_SOURCE  339u   /* SPP+GATTS+HFP-AG+A2DP Source+AVRCP TG    */
#define BT_PROFILE_SRC_MIN 83u    /* SPP+GATTS+HFP-AG+A2DP Source (минимум)   */

/* Состояния A2DP (событие +A2DPSTAT) */
#define A2DP_UNKNOWN    0
#define A2DP_IDLE       1
#define A2DP_CONNECTING 2
#define A2DP_CONNECTED  3
#define A2DP_DISCONNECT 4
#define A2DP_STREAMING  5
