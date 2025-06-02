#!/bin/bash

# تأمين الملفات اللي مينفعش تتضاف للـ git
echo ".env" >> .gitignore
echo ".next" >> .gitignore
echo "node_modules" >> .gitignore
echo "*.zip" >> .gitignore
echo ".DS_Store" >> .gitignore

# حذف تتبع git الحالي بالكامل علشان نمسح أي تاريخ قديم
rm -rf .git

# تهيئة Git جديدة
git init
git config user.name "Ahmed Alsaied"
git config user.email "ahmed.cns2022@gmail.com"

# إضافة الملفات الجاهزة فقط (اللي مش متجاهلة)
git add .
git commit -m "Clean upload without secrets and heavy files"
git branch -M main
git remote add origin https://github.com/ahmedali703/sqlaiquery.git
git push -u origin main
