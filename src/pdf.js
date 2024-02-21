const fs = require('fs').promises;
const {PDFDocument, rgb} = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const {log} = require("util");

async function generatePdf(data) {
    // Create a new PDF document
    let file_name = "SomeOutPut"
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit)
    // Add a new page to the PDF
    const page = pdfDoc.addPage();
    const fontRegularBytes = await fs.readFile('fonts/Montserrat-Regular.ttf',);
    const fontSemiBoldBytes = await fs.readFile('fonts/Montserrat-SemiBold.ttf',);
    const fontBoldBytes = await fs.readFile('fonts/Montserrat-Bold.ttf',);
    const fontRegular = await pdfDoc.embedFont(fontRegularBytes);
    const fontSemiBold = await pdfDoc.embedFont(fontSemiBoldBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    // Add text to the page
    const {width, height} = page.getSize();

    const state = data;

    // Add an image to the page

    const headLineBytes = await fs.readFile('images/Logos.jpg');
    const headLine = await pdfDoc.embedJpg(headLineBytes);
    // const imageWidth = 200;
    // const imageHeight = 100;
    page.drawImage(headLine, {x: 0, y: height - 28, width: 595, height: 28});

    const rectangleColor = rgb(17 / 255, 28 / 255, 68 / 255);
    page.drawRectangle({x: 0, y: 0, width: 200, height: height - 28, color: rectangleColor})

    const rectangleColor2 = rgb(59 / 255, 130 / 255, 246 / 255);
    page.drawRectangle({x: 20, y: height - 28 - 188, width: width - 40, height: 188, color: rectangleColor2})

    const fontSize = 12;
    const textWhite = rgb(250 / 255, 251 / 255, 255 / 255);
    const textBlack = rgb(41 / 255, 51 / 255, 87 / 255);
    const textGray = rgb(88 / 255, 96 / 255, 124 / 255);
    const textBlue = rgb(59 / 255, 130 / 255, 246 / 255);

    const avatarBytes = await fs.readFile('images/Avatar.png');
    const avatarImg = await pdfDoc.embedPng(avatarBytes);
    page.drawImage(avatarImg, {x: 40, y: height - 170, width: 120, height: 120});
    page.drawText(state.fullname, {x: 180, y: height - 84, font: fontSemiBold, size: 22, color: textWhite});
    page.drawText(`${state.position}   •   ${state.salary}   •   ${state.time}`, {
        x: 180,
        y: height - 106,
        font: fontRegular,
        size: 12,
        color: textWhite
    });

    const headerDataTags = [
        'dateOfBirth',
        'email',
        'address',
        'phone',
        'telegram'
    ];
    let headerData = [];
    for (let i in headerDataTags) {
        let key = headerDataTags[i];
        if (key in state && state[key]) {
            headerData.push({"key": key, "value": state[key]});
        }
    }
    let leftHeadData = headerData.slice(0, Math.ceil(headerData.length / 2));
    let rightHeadData = headerData.slice(Math.ceil(headerData.length / 2));

    let spacing_y = 126.5;
    let temp_spacing_y = spacing_y;
    for (const i in leftHeadData) {
        const key = leftHeadData[i].key;
        const value = leftHeadData[i].value;
        const IconBytes = await fs.readFile(`images/${key}.png`);
        const Icon = await pdfDoc.embedPng(IconBytes);
        page.drawImage(Icon, {x: 180, y: height - (spacing_y + 3.5), width: Icon.width / 4, height: Icon.height / 4});
        page.drawText(value, {x: 202, y: height - spacing_y, font: fontRegular, size: 9, color: textWhite});
        spacing_y += 19;
    }
    spacing_y = temp_spacing_y;
    for (const i in rightHeadData) {
        const key = rightHeadData[i].key;
        const value = rightHeadData[i].value;
        const IconBytes = await fs.readFile(`images/${key}.png`);
        const Icon = await pdfDoc.embedPng(IconBytes);
        page.drawImage(Icon, {x: 365, y: height - (spacing_y + 3.5), width: Icon.width / 4, height: Icon.height / 4});
        page.drawText(value, {x: 387, y: height - spacing_y, font: fontRegular, size: 9, color: textWhite});
        spacing_y += 19;
    }

    page.drawRectangle({x: 20, y: height - 254, width: 65, height: 20, color: rectangleColor2})
    page.drawText('Навыки', {x: 28, y: height - 248, font: fontBold, size: fontSize, color: textWhite});

    let skills_offset_y = 277;
    for (const i in state.skills) {
        page.drawText(state.skills[i], {
            x: 20,
            y: height - skills_offset_y,
            font: fontRegular,
            size: 9,
            color: textWhite
        });
        skills_offset_y += 17
    }


    page.drawRectangle({x: 230, y: height - 254, width: 100, height: 20, color: rectangleColor2})
    page.drawText('Образование', {x: 236, y: height - 248, font: fontBold, size: fontSize, color: textWhite});

    page.drawText(state.education.name, {x: 232, y: height - 278, font: fontSemiBold, size: 10, color: textBlack});
    page.drawText(state.education.speciality, {
        x: 232,
        y: height - 292,
        font: fontRegular,
        size: 8,
        color: textGray,
        maxWidth: 343,
        lineHeight: 12
    });

    let dateText = `${state.education.date_from} - ${state.education.date_to}`
    let textWidth = dateText.length * 3.8;
    page.drawText(dateText, {
        x: width - (textWidth + 20),
        y: height - 278,
        font: fontRegular,
        size: 8,
        color: textBlue,
        maxWidth: 343,
        lineHeight: 12
    });

    const text = state.education.speciality;

    const lineHeight = 12; // Set your desired line height

    // Split the multiline text into an array of lines
    const educationLines = Math.ceil(text.length / 82);
    // Calculate the total height of the multiline text
    const totalEducationTextHeight = educationLines * lineHeight;

    let educationOffset = (totalEducationTextHeight + 308)
    page.drawRectangle({x: 230, y: height - (educationOffset + 6), width: 100, height: 20, color: rectangleColor2})
    page.drawText('Опыт работы', {
        x: 236,
        y: height - educationOffset,
        font: fontBold,
        size: fontSize,
        color: textWhite
    });
    page.drawText(state.experience.name, {
        x: 232,
        y: height - (educationOffset + 24),
        font: fontSemiBold,
        size: 10,
        color: textBlack,
        maxWidth: 343,
        lineHeight: 12
    });

    page.drawText(state.experience.job_title, {
        x: 232,
        y: height - (educationOffset + 24 + 14),
        font: fontSemiBold,
        size: 8,
        color: textBlack,
        maxWidth: 343
    });

    page.drawText(state.experience.job_description, {
        x: 232,
        y: height - (educationOffset + 24 + 14 + 14),
        font: fontRegular,
        size: 8,
        color: textGray,
        maxWidth: 343,
        lineHeight: 12
    });

    dateText = `${state.experience.date_from} - ${state.experience.date_to}`
    textWidth = dateText.length * 3.8;
    page.drawText(dateText, {
        x: width - (textWidth + 20),
        y: height - (educationOffset + 24),
        font: fontRegular,
        size: 8,
        color: textBlue,
        maxWidth: 343,
        lineHeight: 12
    });

    const experienceText = state.experience.job_description;
    const experienceLines = Math.ceil(experienceText.length / 82);
    // Calculate the total height of the multiline text
    const totalExperienceTextHeight = experienceLines * lineHeight + educationOffset + 24 + 14;
    console.log(totalExperienceTextHeight)
    let experienceOffset = (totalExperienceTextHeight + 32)
    page.drawRectangle({x: 230, y: height - (experienceOffset + 6), width: 104, height: 20, color: rectangleColor2})
    page.drawText('Сертификаты', {
        x: 237,
        y: height - experienceOffset,
        font: fontBold,
        size: fontSize,
        color: textWhite
    });
    page.drawText(state.certificate.name, {
        x: 232,
        y: height - (experienceOffset + 24),
        font: fontSemiBold,
        size: 10,
        color: textBlack,
    });
    page.drawText(state.certificate.description, {
        x: 232,
        y: height - (experienceOffset + 24 + 14),
        font: fontRegular,
        size: 8,
        color: textGray,
    });

    dateText = `(${state.certificate.dates})`
    textWidth = dateText.length * 4;
    page.drawText(dateText, {
        x: width - (textWidth + 20),
        y: height - (experienceOffset + 24),
        font: fontRegular,
        size: 8,
        color: textBlue,
        maxWidth: 343,
        lineHeight: 12
    });

    // Save the PDF to a file
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(`../uploads/${file_name}.pdf`, pdfBytes);
    return `/uploads/${file_name}.pdf`;
}

module.exports = generatePdf;
