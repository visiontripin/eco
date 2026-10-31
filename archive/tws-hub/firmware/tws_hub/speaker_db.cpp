#include "speaker_db.h"
#include "log.h"
#include <EEPROM.h>
#include <string.h>

#define REC_SIZE 28
static_assert(sizeof(SpeakerRec) == REC_SIZE, "SpeakerRec must be 28 bytes");

static SpeakerRec g_db[MAX_SPEAKERS];
static uint8_t    g_count = 0;
static bool       g_dirty = false;

/* ------------------------------ CRC-8 ----------------------------------- */
static uint8_t crc8(const uint8_t* p, uint16_t n) {
  uint8_t c = 0xFF;
  for (uint16_t i = 0; i < n; i++) {
    c ^= p[i];
    for (uint8_t b = 0; b < 8; b++)
      c = (uint8_t)((c & 0x80) ? (uint8_t)((c << 1) ^ 0x31) : (uint8_t)(c << 1));
  }
  return c;
}

/* ------------------------------ EEPROM ---------------------------------- */
void dbInit() {
  if (!dbLoad()) {
    LOGI(PSTR("EEPROM empty or corrupt -> default db"));
    dbFactoryReset();
  }
}

bool dbLoad() {
  if (EEPROM.read(0) != EEPROM_MAGIC0) return false;
  if (EEPROM.read(1) != EEPROM_MAGIC1) return false;
  if (EEPROM.read(2) != EEPROM_DB_VERSION) return false;
  uint8_t n = EEPROM.read(3);
  if (n > MAX_SPEAKERS) return false;

  g_count = 0;
  uint8_t crc = 0xFF;
  for (uint8_t i = 0; i < n; i++) {
    uint16_t base = EEPROM_DB_BASE + (uint16_t)i * REC_SIZE;
    uint8_t* dst = (uint8_t*)&g_db[i];
    for (uint8_t b = 0; b < REC_SIZE; b++) {
      uint8_t v = EEPROM.read(base + b);
      dst[b] = v;
      crc = (uint8_t)(crc ^ v);
      for (uint8_t k = 0; k < 8; k++)
        crc = (uint8_t)((crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1));
    }
    g_count++;
  }
  uint8_t stored = EEPROM.read(4);
  if (crc != stored) {
    LOGW(PSTR("EEPROM CRC mismatch: %02X vs %02X"), (unsigned)crc, (unsigned)stored);
    g_count = 0;
    return false;
  }
  LOGI(PSTR("db loaded: %d speaker(s)"), (int)g_count);
  return true;
}

void dbCommit() {
  uint8_t crc = 0xFF;
  for (uint8_t i = 0; i < g_count; i++) {
    uint16_t base = EEPROM_DB_BASE + (uint16_t)i * REC_SIZE;
    const uint8_t* src = (const uint8_t*)&g_db[i];
    for (uint8_t b = 0; b < REC_SIZE; b++) {
      EEPROM.update(base + b, src[b]);
      crc = (uint8_t)(crc ^ src[b]);
      for (uint8_t k = 0; k < 8; k++)
        crc = (uint8_t)((crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x31) : (uint8_t)(crc << 1));
    }
  }
  EEPROM.update(0, EEPROM_MAGIC0);
  EEPROM.update(1, EEPROM_MAGIC1);
  EEPROM.update(2, EEPROM_DB_VERSION);
  EEPROM.update(3, g_count);
  EEPROM.update(4, crc);
  g_dirty = false;
  LOGI(PSTR("db saved: %d speaker(s)"), (int)g_count);
}

void dbFactoryReset() {
  g_count = 0;
  memset(g_db, 0, sizeof(g_db));
  dbCommit();
}

uint8_t dbCount() { return g_count; }

SpeakerRec* dbGet(uint8_t idx) {
  return (idx < g_count) ? &g_db[idx] : 0;
}

int8_t dbAdd(const uint8_t mac[6], const char* name) {
  /* проверка на дубль */
  for (uint8_t i = 0; i < g_count; i++) {
    if (memcmp(g_db[i].mac, mac, 6) == 0) return -2;
  }
  if (g_count >= MAX_SPEAKERS) return -1;

  SpeakerRec& r = g_db[g_count];
  memset(&r, 0, sizeof(r));
  memcpy(r.mac, mac, 6);
  strncpy(r.name, name ? name : "SPK", SPEAKER_NAME_LEN - 1);
  r.name[SPEAKER_NAME_LEN - 1] = '\0';
  r.flags    = SPK_FLAG_ENABLED;
  r.role     = SPK_MONO;
  r.trimDb   = 0;
  r.slotHint = 0;
  g_count++;
  g_dirty = true;
  dbCommit();
  return (int8_t)(g_count - 1);
}

void dbRemove(uint8_t idx) {
  if (idx >= g_count) return;
  for (uint8_t i = idx; i + 1 < g_count; i++) g_db[i] = g_db[i + 1];
  g_count--;
  g_dirty = true;
  dbCommit();
}

void dbSetFlag(uint8_t idx, uint8_t flag, bool on) {
  if (idx >= g_count) return;
  if (on) g_db[idx].flags |= flag;
  else    g_db[idx].flags &= (uint8_t)~flag;
  g_dirty = true;
}

bool dbIsEnabled(uint8_t idx) {
  return idx < g_count && (g_db[idx].flags & SPK_FLAG_ENABLED);
}

uint8_t dbEnabledCount() {
  uint8_t n = 0;
  for (uint8_t i = 0; i < g_count; i++) if (g_db[i].flags & SPK_FLAG_ENABLED) n++;
  return n;
}
