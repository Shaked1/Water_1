const express = require('express');
const html_to_pdf = require('html-pdf-node');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // שינוי כאן כדי לקרוא מהתיקייה הנוכחית

const PORT = process.env.PORT || 3000;


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

app.post('/send-report', async (req, res) => {
    try {
        const formData = req.body;

        // בניית תוכן ה-PDF עם כל השדות
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
                        <td style="padding: 8px; border: 1px solid #ddd;">מידות חפירה: ${formData.excavationLength || 0}x${formData.excavationWidth || 0}x${formData.excavationDepth || 0}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">פסולת: ${formData.wasteAmount || 0} מ"ק</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">חלקים: ${formData.parts || ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">מצעים: ${formData.temporaryClosureBedding || 0} מ"ק</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">חול: ${formData.temporaryClosureSand || 0} מ"ק</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">אבנים: ${formData.existingStones || 0} מ"ר</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">אספלט: ${formData.asphaltRepair || 0} מ"ר</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">אבן שפה: ${formData.curbstoneRemoval || 0} מטר</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">תא מגוף: ${formData.valveInstallation || 0} יחידות</td>
                    </tr>
                    
                </table>
                <p>
                    ${formData.roadClosure ? '✔️ סגירת כביש/מדרכה' : ''}
                </p>
                


                <h3 style="background: #f3f4f6; padding: 5px;">ציוד ועובדים:</h3>
                <ul>
                    <li>פועלים: ${formData.equipment_worker || 0}</li>
                    <li>פ"מ: ${formData.equipment_foreman || 0}</li>
                    <li>מחפרון: ${formData.equipment_excavator || 0}</li>
                    <li>טנדר: ${formData.equipment_vehicle || 0}</li>
                    <li>משאית: ${formData.equipment_truck || 0}</li>
                    <li>מכבש: ${formData.equipment_compactor || 0}</li>
                    <li>קונקו: ${formData.equipment_pump || 0}</li>

                    
                </ul>

                <h3 style="background: #f3f4f6; padding: 5px;">הערות וסקיצה:</h3>
                <p><strong>הערות:</strong> ${formData.notes || 'אין'}</p>
                <p><strong>תיאור סקיצה:</strong> ${formData.sketch || 'אין'}</p>
            </div>
        `;

        // הגדרות ה-PDF - פשוט וקליל
        let options = { format: 'A4', printBackground: true };
        let file = { content: htmlContent };

        // יצירת ה-PDF בזיכרון
        html_to_pdf.generatePdf(file, options).then(pdfBuffer => {

            // הגדרת המייל
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'shaked14782@gmail.com',
                    pass: 'mouk npsl fybg gktc' 
                },
                tls: { rejectUnauthorized: false }
            });

            let mailOptions = {
                from: 'shaked14782@gmail.com',
                to: 'shaked14782@gmail.com',
                subject: 'יומן עבודה מעודכן - פיצוצי מים',
                text: `מצורף דוח עבודה עבור כתובת: ${formData.address}`,
                attachments: [{ filename: `report_${formData.date}.pdf`, content: pdfBuffer }]
            };

            transporter.sendMail(mailOptions, (err, info) => {
                            if (err) throw err;
                            res.send('<h1>הדוח המלא נשלח בהצלחה!</h1><a href="/">חזרה לטופס</a>');
                        });
                    });

        } catch (error) {
                    console.error(error);
                    res.status(500).send('שגיאה בשליחת הדוח');
                }
    });
app.listen(PORT, () => console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`));



