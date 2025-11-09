#!/bin/bash

# Diagnostický script pre kalendár (bez dependencies)

echo "🔍 DIAGNOSTIKA KALENDÁRA"
echo "============================================================"
echo ""

SUPABASE_URL="https://rmvflqzxxbzhilobyitw.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZscXp4eGJ6aGlsb2J5aXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTU4MDEsImV4cCI6MjA2NDI5MTgwMX0.3WWno9IcYz_0o2QyhkzlYTRuyyggNBx86J0eCr5tlds"

# Test 1: Skontroluj tabuľku office_hours
echo "📋 TEST 1: Kontrola tabuľky office_hours"
echo "------------------------------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/office_hours?select=*&limit=1" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Tabuľka office_hours EXISTUJE"
    echo ""
elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "❌ CHYBA: Tabuľka office_hours NEEXISTUJE!"
    echo ""
    echo "⚠️  PROBLÉM: Migrácie neboli spustené"
    echo ""
    echo "📝 RIEŠENIE:"
    echo "1. Prejdite na: https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new"
    echo "2. Otvorte súbor: apply-migrations.sql"
    echo "3. Skopírujte CELÝ obsah (všetkých 291 riadkov)"
    echo "4. Vložte do SQL Editora"
    echo "5. Kliknite RUN alebo stlačte Ctrl+Enter"
    echo ""
    exit 1
else
    echo "❌ NEOČAKÁVANÁ CHYBA (HTTP $HTTP_CODE)"
    echo "Response: $BODY"
    exit 1
fi

# Test 2: Počet aktívnych ordinačných hodín
echo "📊 TEST 2: Kontrola záznamov v office_hours"
echo "------------------------------------------------------------"

RESPONSE=$(curl -s \
  "${SUPABASE_URL}/rest/v1/office_hours?select=*&is_active=eq.true" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}")

COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')

echo "📈 Počet aktívnych ordinačných hodín: $COUNT"
echo ""

if [ "$COUNT" = "0" ]; then
    echo "⚠️  PROBLÉM: Žiadne ordinačné hodiny nie sú nastavené!"
    echo ""
    echo "📝 RIEŠENIE:"
    echo "1. Prihláste sa ako PRIJÍMAJÚCI LEKÁR"
    echo "2. Prejdite na Dashboard → sekcia 'Ordinačné hodiny'"
    echo "3. Pridajte ordinačné hodiny pre pracovné dni"
    echo ""
    echo "Príklad nastavenia:"
    echo "  Pondelok:  08:00 - 16:00 (prestávka 12:00-13:00)"
    echo "  Utorok:    08:00 - 16:00 (prestávka 12:00-13:00)"
    echo "  Streda:    08:00 - 14:00"
    echo "  Štvrtok:   08:00 - 16:00 (prestávka 12:00-13:00)"
    echo "  Piatok:    08:00 - 14:00"
    echo ""
    exit 1
else
    echo "✅ Ordinačné hodiny SÚ nastavené"
    echo ""
    echo "📋 Záznam ordinačných hodín:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi

# Test 3: Prijímajúci lekári
echo ""
echo "👨‍⚕️ TEST 3: Kontrola prijímajúcich lekárov"
echo "------------------------------------------------------------"

RESPONSE=$(curl -s \
  "${SUPABASE_URL}/rest/v1/profiles?select=id,full_name,email,user_type&user_type=eq.receiving" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}")

RECEIVING_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')

echo "📈 Počet prijímajúcich lekárov: $RECEIVING_COUNT"

if [ "$RECEIVING_COUNT" = "0" ]; then
    echo ""
    echo "⚠️  UPOZORNENIE: Žiadni prijímajúci lekári nie sú zaregistrovaní!"
    echo ""
    echo "📝 RIEŠENIE:"
    echo "1. Zaregistrujte sa na: /auth"
    echo "2. Vyberte typ: 'Prijímajúci lekár'"
    echo "3. Vyplňte údaje a dokončite registráciu"
else
    echo ""
    echo "✅ Prijímajúci lekári SÚ zaregistrovaní"
fi

echo ""
echo "============================================================"
echo "✅ DIAGNOSTIKA DOKONČENÁ"
echo "============================================================"
echo ""

if [ "$COUNT" != "0" ] && [ "$RECEIVING_COUNT" != "0" ]; then
    echo "✅ KALENDÁR BY MAL FUNGOVAŤ!"
    echo ""
    echo "Ak stále nefunguje:"
    echo "1. Vyčistite cache prehliadača (Cmd+Shift+R alebo Ctrl+Shift+F5)"
    echo "2. Overte že ste prihlásený ako ODOSIELAJÚCI lekár"
    echo "3. Skontrolujte konzolu prehliadača (F12) pre chyby"
else
    echo "⚠️  Kalendár nefunguje kvôli vyššie uvedeným problémom"
    echo "Postupujte podľa RIEŠENÍ"
fi

echo ""

