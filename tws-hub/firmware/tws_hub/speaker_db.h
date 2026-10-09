/* =========================================================================
 * TWS-HUB -- speaker_db.h
 * Список колонок в EEPROM: MAC, имя, включена, роль канала, подстройка
 * громкости, предполагаемый слот. Переживает выключение питания.
 * ========================================================================= */
#pragma once
#include "config.h"

enum SpeakerRole : uint8_t {
  SPK_MONO = 0,
  SPK_LEFT = 1,
  SPK_RIGHT = 2
};

#define SPK_FLAG_ENABLED 0x01
#define SPK_FLAG_SEEN    0x02   /* колонка хотя бы раз соединялась */

struct SpeakerRec {
  uint8_t mac[6];
  char    name[SPEAKER_NAME_LEN];
  uint8_t flags;        /* SPK_FLAG_* */
  uint8_t role;         /* SpeakerRole */
  int8_t  trimDb;       /* -12..+12 дБ, подстройка чувствительности */
  uint8_t slotHint;     /* 0 = любой свободный */
  uint8_t reserved[2];
};   /* 28 байт */

void     dbInit();
uint8_t  dbCount();
SpeakerRec* dbGet(uint8_t idx);          /* 0 если idx вне диапазона */
int8_t   dbAdd(const uint8_t mac[6], const char* name);  /* -1 если нет места/дубль */
void     dbRemove(uint8_t idx);
void     dbSetFlag(uint8_t idx, uint8_t flag, bool on);
void     dbCommit();                     /* пересчитать CRC и записать */
bool     dbLoad();                       /* прочитать и проверить CRC */
void     dbFactoryReset();

uint8_t  dbEnabledCount();
bool     dbIsEnabled(uint8_t idx);
