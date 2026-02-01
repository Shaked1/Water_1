# משתמשים בגרסה של Node שכוללת את כל מה שצריך עבור Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# מעבר למשתמש root כדי להתקין הרשאות
USER root

# יצירת תיקיית העבודה
WORKDIR /app

# העתקת קבצי הפרויקט
COPY package*.json ./
RUN npm install

COPY . .

# חשיפת הפורט של השרת
EXPOSE 8080

# הרצת השרת
CMD ["node", "server.js"]