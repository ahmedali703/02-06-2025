// lib/env.ts
import fs from 'fs';

// Save or update OpenAI API Key
export const saveOpenAIKey = async (openAiKey: string) => {
  let envData = '';

  // قراءة الملف الحالي إذا كان موجودًا
  if (fs.existsSync('.env')) {
    envData = fs.readFileSync('.env', 'utf8');
  }

  // تحديث OPENAI_API_KEY
  let newEnvData = envData
    .split('\n')
    .map(line => {
      if (line.startsWith('OPENAI_API_KEY=')) {
        return `OPENAI_API_KEY=${openAiKey}`; // تحديث القيمة
      }
      return line; // الحفاظ على الأسطر الأخرى
    })
    .filter(line => line.trim() !== '') // إزالة الأسطر الفارغة
    .join('\n');

  // إضافة OPENAI_API_KEY إذا لم يكن موجودًا
  if (!newEnvData.includes('OPENAI_API_KEY=')) {
    newEnvData += `\nOPENAI_API_KEY=${openAiKey}`;
  }

  // كتابة الملف بالكامل
  fs.writeFileSync('.env', newEnvData.trim());
};

// Save or update Oracle configurations
export const saveOracleConfig = async (user: string, password: string, connectString: string, libDir: string) => {
  let envData = '';

  // قراءة الملف الحالي إذا كان موجودًا
  if (fs.existsSync('.env')) {
    envData = fs.readFileSync('.env', 'utf8');
  }

  // تعريف بيانات Oracle
  const oracleConfig: Record<string, string> = {
    ORACLE_USER: user,
    ORACLE_PASSWORD: password,
    ORACLE_CONNECT_STRING: connectString,
    ORACLE_LIB_DIR: libDir,
  };

  let newEnvData = envData
    .split('\n')
    .map(line => {
      const key = line.split('=')[0];
      if (oracleConfig[key]) {
        return `${key}=${oracleConfig[key]}`; // تحديث القيمة
      }
      return line; // الحفاظ على الأسطر الأخرى
    })
    .filter(line => line.trim() !== '') // إزالة الأسطر الفارغة
    .join('\n');

  // إضافة بيانات Oracle إذا لم تكن موجودة
  Object.entries(oracleConfig).forEach(([key, value]) => {
    if (!newEnvData.includes(`${key}=`)) {
      newEnvData += `\n${key}=${value}`;
    }
  });

  // كتابة الملف بالكامل
  fs.writeFileSync('.env', newEnvData.trim());
};