/* Заглушка avr/pgmspace.h для проверки прошивки на хосте (g++).
   Ничего не делает -- PROGMEM на хосте "плоская" память. */
#pragma once
#include <string.h>
#include <stddef.h>
#include <stdio.h>

#define PROGMEM
#define PSTR(s) (s)

#define pgm_read_byte(p)  (*(const unsigned char*)(p))
#define pgm_read_word(p)  (*(const unsigned short*)(p))
#define pgm_read_ptr(p)   (*(void* const*)(p))
#define pgm_read_dword(p) (*(const unsigned long*)(p))

#define strncpy_P(d, s, n) strncpy((d), (const char*)(s), (n))
#define strcpy_P(d, s)     strcpy((d), (const char*)(s))
#define strlen_P(s)        strlen((const char*)(s))
#define strcmp_P(a, b)     strcmp((const char*)(a), (const char*)(b))
#define strncmp_P(a, b, n) strncmp((const char*)(a), (const char*)(b), (n))
#define memcpy_P(d, s, n)  memcpy((d), (const void*)(s), (n))
#define snprintf_P         snprintf
#define vsnprintf_P        vsnprintf
#define sprintf_P          sprintf
