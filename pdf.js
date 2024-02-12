const fs = require('fs').promises;
const {PDFDocument, rgb} = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

async function generatePdf() {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit)
    // Add a new page to the PDF
    const page = pdfDoc.addPage();
    const fontRegularBytes = await fs.readFile('./fonts/Montserrat-Regular.ttf',);
    const fontSemiBoldBytes = await fs.readFile('./fonts/Montserrat-SemiBold.ttf',);
    const fontBoldBytes = await fs.readFile('./fonts/Montserrat-Bold.ttf',);
    const fontRegular = await pdfDoc.embedFont(fontRegularBytes);
    const fontSemiBold = await pdfDoc.embedFont(fontSemiBoldBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    // Add text to the page
    const {width, height} = page.getSize();


    // Add an image to the page
    const imageBytes = await fs.readFile('Logos.jpg');
    const image = await pdfDoc.embedJpg(imageBytes);
    // const imageWidth = 200;
    // const imageHeight = 100;
    page.drawImage(image, {x: 0, y: height - 28, width: 595, height: 28});
    const rectangleColor = rgb(17 / 255, 28 / 255, 68 / 255);
    page.drawRectangle({x: 0, y: 0, width: 200, height: height - 28, color: rectangleColor})

    const rectangleColor2 = rgb(59 / 255, 130 / 255, 246 / 255);
    page.drawRectangle({x: 20, y: height - 28 - 188, width: width - 40, height: 188, color: rectangleColor2})

    const fontSize = 12;
    const textColor = rgb(250 / 255, 251 / 255, 255 / 255);

    page.drawRectangle({x: 20, y: height - 254, width: 65, height: 20, color: rectangleColor2})
    page.drawText('Навыки', {x: 28, y: height - 248, font: fontBold, size: fontSize, color: textColor});


    page.drawRectangle({x: 230, y: height - 254, width: 100, height: 20, color: rectangleColor2})
    page.drawText('Образование', {x: 236, y: height - 248, font: fontBold, size: fontSize, color: textColor});


    page.drawRectangle({x: 230, y: height - 454, width: 100, height: 20, color: rectangleColor2})
    page.drawText('Опыт работы', {x: 236, y: height - 448, font: fontBold, size: fontSize, color: textColor});


    // Add an SVG to the page
    const svgBytes = await fs.readFile('Logos.svg', 'utf8');
    const svgText = 'SVG Text';
    page.drawSvgPath(svgBytes);

    // Save the PDF to a file
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile('output.pdf', pdfBytes);
}

generatePdf();
