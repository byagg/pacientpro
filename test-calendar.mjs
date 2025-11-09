#!/usr/bin/env node

/**
 * Diagnostický script pre kalendár
 * Overí stav databázy a dostupné sloty
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmvflqzxxbzhilobyitw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdmZscXp4eGJ6aGlsb2J5aXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MTU4MDEsImV4cCI6MjA2NDI5MTgwMX0.3WWno9IcYz_0o2QyhkzlYTRuyyggNBx86J0eCr5tlds';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 DIAGNOSTIKA KALENDÁRA\n');
console.log('=' .repeat(60));

// Test 1: Skontroluj či existuje tabuľka office_hours
console.log('\n📋 TEST 1: Kontrola tabuľky office_hours');
console.log('-'.repeat(60));

try {
  const { data, error } = await supabase
    .from('office_hours')
    .select('*')
    .limit(1);

  if (error) {
    console.log('❌ CHYBA:', error.message);
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      console.log('\n⚠️  PROBLÉM: Tabuľka office_hours NEEXISTUJE!');
      console.log('\n📝 RIEŠENIE:');
      console.log('1. Prejdite na: https://supabase.com/dashboard/project/rmvflqzxxbzhilobyitw/sql/new');
      console.log('2. Otvorte súbor: apply-migrations.sql');
      console.log('3. Skopírujte CELÝ obsah do SQL Editora');
      console.log('4. Kliknite RUN');
      console.log('\n');
      process.exit(1);
    }
  } else {
    console.log('✅ Tabuľka office_hours EXISTUJE');
  }
} catch (err) {
  console.log('❌ CHYBA pri teste:', err.message);
  process.exit(1);
}

// Test 2: Skontroluj počet záznamov v office_hours
console.log('\n📊 TEST 2: Kontrola záznamov v office_hours');
console.log('-'.repeat(60));

try {
  const { data, error, count } = await supabase
    .from('office_hours')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (error) {
    console.log('❌ CHYBA:', error.message);
    process.exit(1);
  }

  console.log(`📈 Počet aktívnych ordinačných hodín: ${count || 0}`);

  if (!count || count === 0) {
    console.log('\n⚠️  PROBLÉM: Žiadne ordinačné hodiny nie sú nastavené!');
    console.log('\n📝 RIEŠENIE:');
    console.log('1. Prihláste sa ako PRIJÍMAJÚCI LEKÁR');
    console.log('2. Prejdite na Dashboard → sekcia "Ordinačné hodiny"');
    console.log('3. Pridajte ordinačné hodiny pre pracovné dni');
    console.log('\nPríklad:');
    console.log('  Pondelok:  08:00 - 16:00 (prestávka 12:00-13:00)');
    console.log('  Utorok:    08:00 - 16:00 (prestávka 12:00-13:00)');
    console.log('  Streda:    08:00 - 14:00');
    console.log('  atď...');
    console.log('\n');
    process.exit(1);
  }

  console.log('\n📋 Detaily ordinačných hodín:');
  console.log('-'.repeat(60));
  
  data.forEach((oh, index) => {
    const days = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
    console.log(`\n${index + 1}. ${days[oh.day_of_week]}`);
    console.log(`   Čas: ${oh.start_time} - ${oh.end_time}`);
    console.log(`   Slot: ${oh.slot_duration_minutes} minút`);
    if (oh.break_start_time && oh.break_end_time) {
      console.log(`   Prestávka: ${oh.break_start_time} - ${oh.break_end_time}`);
    }
    console.log(`   Lekár ID: ${oh.receiving_doctor_id}`);
  });

} catch (err) {
  console.log('❌ CHYBA pri teste:', err.message);
  process.exit(1);
}

// Test 3: Skontroluj profily prijímajúcich lekárov
console.log('\n\n👨‍⚕️ TEST 3: Kontrola prijímajúcich lekárov');
console.log('-'.repeat(60));

try {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, user_type')
    .eq('user_type', 'receiving');

  if (error) {
    console.log('❌ CHYBA:', error.message);
  } else {
    console.log(`\n📈 Počet prijímajúcich lekárov: ${data.length}`);
    
    if (data.length === 0) {
      console.log('\n⚠️  Žiadni prijímajúci lekári nie sú zaregistrovaní!');
      console.log('\n📝 RIEŠENIE:');
      console.log('1. Zaregistrujte sa na: /auth');
      console.log('2. Vyberte typ: "Prijímajúci lekár"');
      console.log('3. Vyplňte údaje a dokončite registráciu');
    } else {
      console.log('\n📋 Zoznam prijímajúcich lekárov:');
      data.forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc.full_name}`);
        console.log(`   Email: ${doc.email}`);
        console.log(`   ID: ${doc.id}`);
      });
    }
  }
} catch (err) {
  console.log('❌ CHYBA pri teste:', err.message);
}

// Test 4: Vygeneruj dostupné sloty pre budúcich 7 dní
console.log('\n\n🗓️  TEST 4: Generovanie dostupných slotov');
console.log('-'.repeat(60));

try {
  const { data: officeHours, error } = await supabase
    .from('office_hours')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;

  const today = new Date();
  let totalSlots = 0;
  let daysWithSlots = 0;

  console.log('\n📅 Kontrolujem najbližších 7 dní...\n');

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    checkDate.setHours(0, 0, 0, 0);
    
    const dayOfWeek = checkDate.getDay();
    const todayHours = officeHours.filter(oh => oh.day_of_week === dayOfWeek);
    
    let daySlots = 0;
    
    todayHours.forEach(oh => {
      const [startHour, startMinute] = oh.start_time.split(':').map(Number);
      const [endHour, endMinute] = oh.end_time.split(':').map(Number);
      
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      let breakStartMinutes = null;
      let breakEndMinutes = null;
      if (oh.break_start_time && oh.break_end_time) {
        const [breakStartHour, breakStartMin] = oh.break_start_time.split(':').map(Number);
        const [breakEndHour, breakEndMin] = oh.break_end_time.split(':').map(Number);
        breakStartMinutes = breakStartHour * 60 + breakStartMin;
        breakEndMinutes = breakEndHour * 60 + breakEndMin;
      }
      
      for (let currentMinutes = startTimeMinutes; currentMinutes < endTimeMinutes; currentMinutes += oh.slot_duration_minutes) {
        if (breakStartMinutes !== null && breakEndMinutes !== null) {
          const slotEndMinutes = currentMinutes + oh.slot_duration_minutes;
          if (currentMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
            continue;
          }
        }
        
        const slotHour = Math.floor(currentMinutes / 60);
        const slotMinute = currentMinutes % 60;
        const slotTime = new Date(checkDate);
        slotTime.setHours(slotHour, slotMinute, 0, 0);
        
        if (slotTime > new Date()) {
          daySlots++;
        }
      }
    });
    
    if (daySlots > 0) {
      const days = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];
      const dateStr = `${checkDate.getDate()}.${checkDate.getMonth() + 1}.${checkDate.getFullYear()}`;
      console.log(`  ${days[dayOfWeek]} ${dateStr}: ✅ ${daySlots} dostupných slotov`);
      totalSlots += daySlots;
      daysWithSlots++;
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`📊 SÚHRN: ${totalSlots} slotov na ${daysWithSlots} dňoch`);
  
  if (totalSlots === 0) {
    console.log('\n⚠️  PROBLÉM: Žiadne dostupné sloty v najbližších 7 dňoch!');
    console.log('\nMožné príčiny:');
    console.log('1. Ordinačné hodiny sú nastavené len na deň v minulosti');
    console.log('2. Všetky sloty sú už v minulosti (napr. nastavené na dnes ráno, ale je už večer)');
    console.log('3. Prestávky pokrývajú celé ordinačné hodiny');
  } else {
    console.log('\n✅ Kalendár BY MAL FUNGOVAŤ! Zelené dni by mali byť viditeľné.');
  }

} catch (err) {
  console.log('❌ CHYBA pri generovaní slotov:', err.message);
}

// Záverečný súhrn
console.log('\n\n' + '='.repeat(60));
console.log('✅ DIAGNOSTIKA DOKONČENÁ');
console.log('='.repeat(60));
console.log('\nAk všetky testy prešli, kalendár by mal fungovať.');
console.log('Ak nie, postupujte podľa RIEŠENÍ uvedených vyššie.\n');

