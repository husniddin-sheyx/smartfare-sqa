# DocConvert & AI — Hujjatlar bo'yicha Sun'iy Intellekt Yordamchisi 📄🤖

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**DocConvert & AI** — Hujjatlar bilan professional darajada ishlash, konvertatsiya qilish va Sun'iy Intellekt (AI) yordamida tahlil qilish uchun mo'ljallangan 100% xavfsiz brauzer platformasi.

Barcha operatsiyalar (PDF ↔ Word, Rasm → PDF, Birlashtirish, Sahifalarga ajratish) to'g'ridan-to'g'ri foydalanuvchi brauzerida bajariladi. Ma'lumotlar hech qanday tashqi serverga yuklanmaydi.

---

## 🌟 Asosiy Imkoniyatlar

1. **🤖 Sun'iy Intellekt (AI) Hujjat Yordamchisi**:
   - PDF, Word yoki matnni yuklash va avtomat tahlil qilish.
   - **Qisqacha mazmun (Summary)**: Hujjatning asosiy mohiyatini bir necha bandda chiqarish.
   - **Savol-Javob (Q&A)**: Hujjat ichidagi ma'lumotlar bo'yicha sun'iy intellektga savol berish.
   - **Tahrir va Sayqallash**: Grammatik, akademik va rasmiy uslubga solish.
   - **Tarjima**: O'zbek, Rus va Ingliz tillariga moslash.
   - *Google Gemini API* integratsiyasi (kalit faqat brauzeringizda xavfsiz saqlanadi).

2. **📄 PDF → Word (.docx)**:
   - PDF matnini strukturasi va sahifalar bo'yicha formatlangan Word fayliga aylantiradi.
   - Bir tugma bilan matndan to'g'ridan-to'g'ri nusxa olish (`Copy to Clipboard`).

3. **📝 Word → PDF**:
   - `.docx` fayllarni sifatli o'qish, ko'rish va chop etish orqali toza PDF qilib saqlash.

4. **🖼️ Rasm → PDF**:
   - JPG, PNG, WebP rasmlarni bitta PDF ga birlashtirish.
   - Sahifa yo'nalishi (Avto, Portret, Albom) va hoshiya o'lchami (0mm, 10mm, 20mm) sozlamalari.
   - Smartfonlarda sensorli tartiblash (◀ ▶) va buferdan `Ctrl+V` orqali tashlash.

5. **📑 PDF Birlashtirish (Merge PDF)**:
   - Bir nechta PDF faylni bitta faylga birlashtirish.
   - Har bir faylning sahifalar sonini real vaqtda ko'rsatish.
   - Sensorli ekranlar uchun qulay ▲ ▼ tugmalari.

6. **✂️ PDF Sahifalarga ajratish (Split PDF)**:
   - Istalgan sahifalar oralig'ini (masalan: `1-3, 5`) yangi PDF fayl qilib ajratib olish.

---

## 🚀 Vercel ga yuklash (Deployment)

Loyihani Vercel ga yuklash juda oddiy:

1. Ushbu loyihani o'zingizning **GitHub** profilingizga push qiling (`git push origin main`).
2. [Vercel.com](https://vercel.com) ga kiring va **"Add New Project"** tugmasini bosing.
3. GitHub reponi tanlang va **"Deploy"** tugmasini bosing.
4. Hech qanday build sozlamasi kerak emas (`Framework Preset: Other` / Static site). Vercel loyihani bir necha soniyada butun dunyo bo'ylab faollashtiradi!

---

## 🛠️ Texnologiyalar
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism, Dark Theme, Modern responsive design), Vanilla JavaScript (ES6+).
- **Kutubxonalar (CDN)**:
  - `pdf.js` (PDF parsing)
  - `pdf-lib` (PDF yaratish, birlashtirish va ajratish)
  - `jspdf` (Rasm → PDF konvertatsiyasi)
  - `mammoth.js` (DOCX → HTML parsing)
  - `docx.js` (Formatlangan .docx fayl generatsiyasi)
  - `FileSaver.js` (Brauzerda fayllarni yuklash)

---

## 🔒 Xavfsizlik va Maxfiylik
Barcha fayllar faqat foydalanuvchining shaxsiy qurilmasida (brauzer xotirasida) qayta ishlanadi. Hech qanday shaxsiy ma'lumot yoki hujjat tashqi serverlarga yuborilmaydi.
