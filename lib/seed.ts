//lib/seed.ts
import { query } from './db';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

/**
 * دالة لتحويل التاريخ من تنسيق dd/mm/yyyy إلى yyyy-mm-dd
 * بحيث يتوافق مع تنسيق Oracle DATE.
 */
function parseDate(dateString: string): string {
  const parts = dateString.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  console.warn(`Could not parse date: ${dateString}`);
  throw new Error('Invalid date format');
}

export async function seed() {
  // إنشاء الـ sequence الخاص بالـ ID إن لم يكن موجوداً
  await query(`
    DECLARE
      v_seq_exists NUMBER;
    BEGIN
      SELECT COUNT(*) INTO v_seq_exists
      FROM user_sequences
      WHERE sequence_name = 'UNICORNS_SEQ';
      
      IF v_seq_exists = 0 THEN
        EXECUTE IMMEDIATE 'CREATE SEQUENCE unicorns_seq START WITH 1 INCREMENT BY 1';
      END IF;
    END;
  `);

  // إنشاء الجدول unicorns في حال عدم وجوده مسبقاً
  await query(`
    DECLARE
      v_table_exists NUMBER;
    BEGIN
      SELECT COUNT(*) INTO v_table_exists
      FROM user_tables
      WHERE table_name = 'UNICORNS';
      
      IF v_table_exists = 0 THEN
        EXECUTE IMMEDIATE '
          CREATE TABLE unicorns (
            id NUMBER PRIMARY KEY,
            company VARCHAR2(255) NOT NULL UNIQUE,
            valuation NUMBER(10,2) NOT NULL,
            date_joined DATE,
            country VARCHAR2(255) NOT NULL,
            city VARCHAR2(255) NOT NULL,
            industry VARCHAR2(255) NOT NULL,
            select_investors CLOB NOT NULL
          )
        ';
      END IF;
    END;
  `);

  console.log(`Created "unicorns" table`);

  // قراءة ملف CSV لتحميل بيانات الـ unicorns
  const results: any[] = [];
  const csvFilePath = path.join(process.cwd(), 'unicorns.csv');

  // إدراج كل صف من ملف CSV إلى الجدول مع التحقق من عدم تكرار الشركة
  for (const row of results) {
    const formattedDate = parseDate(row['Date Joined']);

    await query(
      `
      INSERT INTO unicorns (id, company, valuation, date_joined, country, city, industry, select_investors)
      SELECT unicorns_seq.NEXTVAL, :1, :2, :3, :4, :5, :6, :7
      FROM dual
      WHERE NOT EXISTS (
        SELECT 1 FROM unicorns WHERE company = :1
      )
    `,
      [
        row.Company,
        parseFloat(row['Valuation ($B)'].replace('$', '').replace(',', '')),
        formattedDate,
        row.Country,
        row.City,
        row.Industry,
        row['Select Investors'],
      ]
    );
  }

  console.log(`Seeded ${results.length} unicorns`);
}

seed().catch(console.error);
