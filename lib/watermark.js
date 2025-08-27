import { Canvas, loadImage, createCanvas } from "canvas";

export async function createWatermark(screenshotURL, logoURL, handle) {

    logoURL = logoURL || './assets/logo/cappers.png';

    const screenshot = await loadImage(screenshotURL);
    const logo = await loadImage(logoURL);
    const handleText = handle && typeof handle === 'string' ?
        (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`) :
        '';

    const canvas = createCanvas(screenshot.width, screenshot.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(screenshot, 0, 0, screenshot.width, screenshot.height);
    ctx.globalAlpha = 0.15;
    const logoWidth = canvas.width * 0.4;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    // const verticalSpacing = (canvas.height - (logoHeight * 3)) / 4;
    const verticalSpacing = 5;

    for(let y = 0; y < screenshot.height; y += logoHeight + verticalSpacing) {
        ctx.drawImage(logo, (canvas.width - logoWidth) / 2, y, logoWidth, logoHeight);
        ctx.fillStyle = 'black';
        ctx.font = `${logoHeight / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(handleText, (canvas.width - logoWidth) / 2 + logoWidth / 2, y + logoHeight);
    }

    return canvas.toBuffer();
}