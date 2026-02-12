const express = require('express');
const html_to_pdf = require('html-pdf-node');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');

const app = express();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // עד 10MB לתמונה
});

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(__dirname));
const PORT = process.env.PORT || 8080;

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// הגדרת אימות (Auth) - גרסה מתוקנת
let auth;
const credentialsVar = process.env.GOOGLE_CREDENTIALS_JSON;

if (credentialsVar) {
    console.log("Railway environment detected. Initializing with GOOGLE_CREDENTIALS_JSON variable.");
    try {
        // ניקוי תווים בלתי נראים שעלולים להיכנס בהעתקה
        const cleanJson = credentialsVar.trim();
        auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(cleanJson),
            scopes: SCOPES,
        });
    } catch (parseError) {
        console.error("FAILED to parse GOOGLE_CREDENTIALS_JSON. Make sure it is a valid JSON string.");
        throw parseError;
    }
} else {
    console.log("Local environment detected. Searching for google-credentials.json file.");
    const localKeyPath = path.join(__dirname, 'google-credentials.json');
    auth = new google.auth.GoogleAuth({
        keyFile: localKeyPath,
        scopes: SCOPES,
    });
}

/**
 * פונקציה להעלאת קובץ ל-Shared Drive
 */
async function uploadToDrive(pdfBuffer, fileName) {
    const driveService = google.drive({ version: 'v3', auth });
    const folderId = '1gBXpsw8v9DdnoozWVhQ0bxSzoNEkcfRh'; 
    const fileMetadata = { name: fileName, parents: [folderId] };
    const media = { mimeType: 'application/pdf', body: Readable.from(pdfBuffer) };

    try {
        const response = await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true,
            keepRevisionForever: true,
        });
        console.log('File successfully uploaded. ID:', response.data.id);
        return response.data.id;
    } catch (error) {
        console.error('Drive Upload Error:', error);
        throw error;
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.post('/send-report', upload.array('images', 5), async (req, res) => {
    try {
        console.log('Received request, compiling report...');
        const formData = req.body;

        // 1. חישובים אוטומטיים
        const L = parseFloat(formData.excavationLength) || 0;
        const W = parseFloat(formData.excavationWidth) || 0;
        const D = parseFloat(formData.excavationDepth) || 0;
        const restoreType = formData.restoreType; // asphalt, stones, or both

        const calculatedWaste = (L * W * D).toFixed(2);
        const calculatedBedding = (L * W * D * 0.4).toFixed(2);
        const calculatedSand = (L * W * D * 0.6).toFixed(2);

        // חישוב מותנה לפי בחירת המשתמש
        let calculatedAsphalt = "0.00";
        let calculatedStones = "0.00";

        if (restoreType === 'asphalt' || restoreType === 'both') {
            calculatedAsphalt = (L * W * 0.11).toFixed(2);
        }
        
        if (restoreType === 'stones' || restoreType === 'both') {
            // אם הוזן ערך ידנית בתיבת "אבנים", נשתמש בו, אחרת נחשב לפי שטח
            calculatedStones = formData.existingStones ? parseFloat(formData.existingStones).toFixed(2) : (L * W).toFixed(2);
        }

        // 2. סינון ציוד ועובדים
        const equipmentLabels = {
            equipment_worker: 'פועלים',
            equipment_foreman: 'פ"מ',
            equipment_excavator: 'מחפרון',
            equipment_vehicle: 'טנדר',
            equipment_truck: 'משאית',
            equipment_compactor: 'מכבש',
            equipment_pump: 'קונגו',
            equipment_cart: 'עגלת חץ',
            equipment_barriers: 'מחסומים'
        };

        const equipmentListHtml = Object.keys(equipmentLabels)
            .filter(key => formData[key] && parseFloat(formData[key]) > 0)
            .map(key => `<li>${equipmentLabels[key]}: ${formData[key]}</li>`)
            .join('');

        // 3. עיבוד תמונות ל-Base64
        let imagesHtml = '';
        if (req.files && req.files.length > 0) {
                    imagesHtml = '<h3 style="background:#f3f4f6; padding:5px;">תמונות מהשטח:</h3><div style="display:flex; flex-wrap:wrap; gap:10px;">';
                    for (const file of req.files) {
                        const base64Image = file.buffer.toString('base64');
                        // הוספנו loading="eager" ו-decoding="sync" כדי להכריח את ה-PDF להמתין לתמונה
                        imagesHtml += `<img src="data:${file.mimetype};base64,${base64Image}" style="width:45%; border:1px solid #ddd; border-radius:5px;" loading="eager" decoding="sync">`;
                    }
            imagesHtml += '</div>';
        }

        // 4. בניית ה-HTML של ה-PDF
        const htmlContent = `
            <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #2563eb; border-radius: 10px;">
                <h1 style="text-align: center; color: #2563eb;">יומן עבודה - פיצוצי מים</h1>
                <hr>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>תאריך:</strong> ${formData.date || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>סוג עבודה:</strong> ${formData.workType || ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>כתובת:</strong> ${formData.address || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;"><strong>מבצע:</strong> ${formData.operator || ''}</td>
                    </tr>
                </table>

                <h3 style="background: #f3f4f6; padding: 5px;">מיקום עבודה:</h3>
                <p>
                    ${formData.workLocation_sidewalk ? '✔️ מדרכה ' : ''}
                    ${formData.workLocation_road ? '✔️ כביש ' : ''}
                    ${formData.workLocation_garden ? '✔️ גינה ' : ''}
                    ${formData.workLocation_other ? '| אחר: ' + formData.workLocation_other : ''}
                </p>

                <h3 style="background: #f3f4f6; padding: 5px;">פרטים טכניים ומדידות:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">סוג צינור: ${formData.pipeType || ''}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">מידות חפירה: ${L}x${W}x${D}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">חלקים שהוחלפו: ${formData.parts || 'אין'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">פסולת: ${calculatedWaste} מ"ק</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">מצעים: ${calculatedBedding} מ"ק</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">חול: ${calculatedSand} מ"ק</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">אספלט: ${calculatedAsphalt} מ"ר</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">אבנים: ${calculatedStones} מ"ר</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">אבן שפה: ${formData.curbstoneRemoval || 0} מ'</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">תא מגוף: ${formData.valveInstallation || 0} יחידות</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">קוטר צינור: ${formData.pipeDiameter || 'אין'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${formData.roadClosure ? '✔️ סגירת כביש/מדרכה/סטרילי' : ''}</td>
                    </tr>
                </table>

                <h3 style="background: #f3f4f6; padding: 5px;">ציוד ועובדים:</h3>
                <ul>${equipmentListHtml || '<li>לא הוזן ציוד/עובדים</li>'}</ul>

                <p><strong>הערות:</strong> ${formData.notes || 'אין'}</p>

                ${imagesHtml}
            </div>
        `;

        // 5. יצירת ה-PDF עם אופטימיזציה לשרת ענן
        let options = { 
            format: 'A4', 
            printBackground: true,
            margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
            // הוספת הפקודה הזו אומרת ל-Puppeteer לחכות שהתמונות יטענו בזיכרון
            waitUntil: 'networkidle0', 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        };
        
        let file = { content: htmlContent };

        // הוספת timeout למקרה שהתמונות כבדות מאוד
        const pdfBuffer = await html_to_pdf.generatePdf(file, options);
        
        // יצירת שם קובץ תקני (ללא רווחים)
        const fileName = `דו"ח_${(formData.address || 'ללא_כתובת').replace(/\s+/g, '_')}_${formData.date || 'ללא_תאריך'}.pdf`;
        
        console.log(`Starting upload for: ${fileName}`);
        await uploadToDrive(pdfBuffer, fileName);

        res.send(`<h1>הדוח נשמר בהצלחה בתיקייה השיתופית!</h1><p>שם הקובץ: ${fileName}</p><a href="/">חזרה לטופס</a>`);

    } catch (error) {
        console.error('Error during processing:', error);
        res.status(500).send('שגיאה בתהליך יצירת הדוח. בדקי את ה-Logs ב-Railway.');
    }
});

app.listen(PORT, () => console.log(`Server is running on port: ${PORT}, http://localhost:${PORT}`));