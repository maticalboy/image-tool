// 图片无损放大工具类
class ImageUpscaler {
    constructor() {
        // 初始化图片和画布相关属性
        this.originalImage = null;      // 原始图片对象
        this.processedImage = null;     // 处理后的图片对象
        this.originalCanvas = document.getElementById('originalCanvas');     // 原始图片画布
        this.processedCanvas = document.getElementById('processedCanvas');   // 处理后图片画布
        this.originalCtx = this.originalCanvas.getContext('2d');             // 原始画布上下文
        this.processedCtx = this.processedCanvas.getContext('2d');           // 处理后画布上下文
    }

    /**
     * 处理图片上传
     * @param {File} file - 用户上传的图片文件
     * @param {Number} scaleFactor - 放大倍数
     */
    async handleImageUpload(file, scaleFactor) {

        try {

            // 使用Promise封装FileReader
            const imageDataUrl = await this.readFileAsDataURL(file.raw);

            // 使用Promise封装图片加载
            this.originalImage = await this.loadImage(imageDataUrl);

            // 显示原始图片
            this.displayOriginalImage();

            // 获取图片信息返回
            const { width, height, scaleWidth, scaleHeight } = this.updateImageInfo(scaleFactor)
            let beforeResolution = width + 'x' + height
            let afterResolution = scaleWidth + 'x' + scaleHeight
            return {
                name: file.name,
                size: file.size / 1000 + "KB",
                status: file.status == "ready" ? "上传成功" : "上传失败",
                beforeResolution: beforeResolution,
                afterResolution: afterResolution
            }
            console.log('图片上传成功:', file.name);

        } catch (error) {
            console.error('图片上传失败:', error.message);
        }
    }

    /**
     * 将FileReader读取文件封装为Promise
     * @param {File} file - 要读取的文件
     * @returns {Promise<string>} 包含DataURL的Promise
     */
    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            // 读取成功回调
            reader.onload = (e) => {
                resolve(e.target.result);
            };

            // 读取失败回调
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };

            // 开始读取文件
            reader.readAsDataURL(file);
        });
    }

    /**
     * 将图片加载封装为Promise
     * @param {string} src - 图片源（DataURL或URL）
     * @returns {Promise<Image>} 包含加载完成图片的Promise
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();

            // 图片加载成功回调
            img.onload = () => {
                resolve(img);
            };

            // 图片加载失败回调
            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };

            // 设置图片源
            img.src = src;
        });
    }

    /**
     * 显示原始图片到画布
     */
    displayOriginalImage() {
        // 定义最大显示尺寸
        const maxWidth = 400;
        const maxHeight = 400;

        // 计算保持宽高比的尺寸
        let { width, height } = this.calculateAspectRatio(
            this.originalImage.width,
            this.originalImage.height,
            maxWidth,
            maxHeight
        );

        // 设置画布尺寸
        this.originalCanvas.width = width;
        this.originalCanvas.height = height;

        // 清除画布并绘制图片
        this.originalCtx.clearRect(0, 0, width, height);
        this.originalCtx.drawImage(this.originalImage, 0, 0, width, height);
    }

    /**
     * 处理图片 - 应用放大和锐化效果
     * @param 放大倍数 选择的算法 锐化程度
     */
    processImage({ scaleFactor, algorithm, sharpness }) {
        // 如果没有原始图片，直接返回
        if (!this.originalImage) return;

        // 记录开始时间用于计算处理时长
        const startTime = performance.now();

        // 计算放大后的尺寸
        const newWidth = this.originalImage.width * scaleFactor;
        const newHeight = this.originalImage.height * scaleFactor;

        // 创建临时画布用于处理
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        const tempCtx = tempCanvas.getContext('2d');

        // 将原始图片绘制到临时画布
        tempCtx.drawImage(this.originalImage, 0, 0);

        // 根据选择的算法处理图片
        let imageData;
        switch (algorithm) {
            case 'nearest':
                imageData = this.nearestNeighbor(tempCanvas, newWidth, newHeight);
                break;
            case 'bilinear':
                imageData = this.bilinearInterpolation(tempCanvas, newWidth, newHeight);
                break;
            case 'bicubic':
                imageData = this.bicubicInterpolation(tempCanvas, newWidth, newHeight);
                break;
            default:
                // 默认使用双线性插值
                imageData = this.bilinearInterpolation(tempCanvas, newWidth, newHeight);
        }

        // 如果设置了锐化，应用锐化滤镜
        // if (sharpness > 0) {
        //     imageData = this.applySharpness(imageData, sharpness / 100);
        // }

        // 计算显示尺寸（保持与原始图片相同的宽高比）
        const displayWidth = this.originalImage.width * scaleFactor;
        const displayHeight = this.originalImage.height * scaleFactor;

        // 设置处理后画布的尺寸
        this.processedCanvas.width = displayWidth;
        this.processedCanvas.height = displayHeight;

        // 将处理后的图像数据绘制到画布
        this.processedCtx.putImageData(imageData, 0, 0);

        // 启用下载按钮
        // document.getElementById('downloadBtn').disabled = false;

        // 计算并显示处理时间
        const endTime = performance.now();
        // document.getElementById('processingTime').textContent =
        //     `${(endTime - startTime).toFixed(2)}ms`;
    }

    /**
 * 最近邻插值算法 - 修正版
 * @param {HTMLCanvasElement} canvas - 原始图片画布
 * @param {number} newWidth - 目标宽度
 * @param {number} newHeight - 目标高度
 * @returns {ImageData} 放大后的图像数据
 */
    nearestNeighbor(canvas, newWidth, newHeight) {
        const ctx = canvas.getContext('2d');
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = ctx.createImageData(newWidth, newHeight);

        // 计算宽高比例
        const widthRatio = canvas.width / newWidth;
        const heightRatio = canvas.height / newHeight;

        // 遍历新图像的每个像素
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // 计算对应的原始图像坐标（四舍五入）
                const origX = Math.min(Math.floor(x * widthRatio), canvas.width - 1);
                const origY = Math.min(Math.floor(y * heightRatio), canvas.height - 1);

                // 计算原始图像和新图像的像素索引
                const origIndex = (origY * canvas.width + origX) * 4;
                const newIndex = (y * newWidth + x) * 4;

                // 复制RGBA四个通道的值
                newData.data[newIndex] = originalData.data[origIndex];         // R
                newData.data[newIndex + 1] = originalData.data[origIndex + 1]; // G
                newData.data[newIndex + 2] = originalData.data[origIndex + 2]; // B
                newData.data[newIndex + 3] = originalData.data[origIndex + 3]; // A
            }
        }

        return newData;
    }

    /**
     * 双线性插值算法 - 修正版
     * @param {HTMLCanvasElement} canvas - 原始图片画布
     * @param {number} newWidth - 目标宽度
     * @param {number} newHeight - 目标高度
     * @returns {ImageData} 放大后的图像数据
     */
    bilinearInterpolation(canvas, newWidth, newHeight) {
        const ctx = canvas.getContext('2d');
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = ctx.createImageData(newWidth, newHeight);

        // 计算宽高比例
        const widthRatio = canvas.width / newWidth;
        const heightRatio = canvas.height / newHeight;

        // 遍历新图像的每个像素
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // 计算对应的原始图像坐标（浮点数）
                const origX = x * widthRatio;
                const origY = y * heightRatio;

                // 取整数部分和小数部分
                const x1 = Math.floor(origX);
                const y1 = Math.floor(origY);
                const x2 = Math.min(x1 + 1, canvas.width - 1);
                const y2 = Math.min(y1 + 1, canvas.height - 1);

                const xFrac = origX - x1;
                const yFrac = origY - y1;
                const xFracInv = 1 - xFrac;
                const yFracInv = 1 - yFrac;

                // 计算四个相邻像素的索引
                const idx1 = (y1 * canvas.width + x1) * 4;  // 左上
                const idx2 = (y1 * canvas.width + x2) * 4;  // 右上
                const idx3 = (y2 * canvas.width + x1) * 4;  // 左下
                const idx4 = (y2 * canvas.width + x2) * 4;  // 右下

                // 新图像当前像素的索引
                const newIndex = (y * newWidth + x) * 4;

                // 对每个颜色通道进行双线性插值
                for (let channel = 0; channel < 4; channel++) {
                    const top = originalData.data[idx1 + channel] * xFracInv +
                        originalData.data[idx2 + channel] * xFrac;
                    const bottom = originalData.data[idx3 + channel] * xFracInv +
                        originalData.data[idx4 + channel] * xFrac;

                    newData.data[newIndex + channel] = Math.round(top * yFracInv + bottom * yFrac);
                }
            }
        }

        return newData;
    }

    /**
     * 双三次插值算法 - 完整实现
     * @param {HTMLCanvasElement} canvas - 原始图片画布
     * @param {number} newWidth - 目标宽度
     * @param {number} newHeight - 目标高度
     * @returns {ImageData} 放大后的图像数据
     */
    bicubicInterpolation(canvas, newWidth, newHeight) {
        const ctx = canvas.getContext('2d');
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = ctx.createImageData(newWidth, newHeight);

        // 计算宽高比例
        const widthRatio = canvas.width / newWidth;
        const heightRatio = canvas.height / newHeight;

        // 双三次插值核函数
        const cubicInterpolate = (p0, p1, p2, p3, t) => {
            const t2 = t * t;
            const t3 = t2 * t;

            // 使用Catmull-Rom样条插值
            return 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            );
        };

        // 获取像素值，处理边界情况
        const getPixel = (x, y, channel) => {
            x = Math.max(0, Math.min(canvas.width - 1, x));
            y = Math.max(0, Math.min(canvas.height - 1, y));
            const index = (y * canvas.width + x) * 4;
            return originalData.data[index + channel];
        };

        // 遍历新图像的每个像素
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // 计算对应的原始图像坐标（浮点数）
                const origX = x * widthRatio;
                const origY = y * heightRatio;

                // 取整数部分和小数部分
                const xInt = Math.floor(origX);
                const yInt = Math.floor(origY);
                const xFrac = origX - xInt;
                const yFrac = origY - yInt;

                // 新图像当前像素的索引
                const newIndex = (y * newWidth + x) * 4;

                // 对每个颜色通道进行双三次插值
                for (let channel = 0; channel < 4; channel++) {
                    // 在x方向上进行四次插值
                    const xValues = [];
                    for (let i = -1; i <= 2; i++) {
                        const yValues = [];
                        for (let j = -1; j <= 2; j++) {
                            yValues.push(getPixel(xInt + i, yInt + j, channel));
                        }
                        // 在y方向上进行插值
                        xValues.push(cubicInterpolate(
                            yValues[0], yValues[1], yValues[2], yValues[3], yFrac
                        ));
                    }

                    // 在x方向上进行插值
                    const result = cubicInterpolate(
                        xValues[0], xValues[1], xValues[2], xValues[3], xFrac
                    );

                    // 限制结果在0-255范围内
                    newData.data[newIndex + channel] = Math.max(0, Math.min(255, Math.round(result)));
                }
            }
        }

        return newData;
    }

    /**
     * Lanczos插值算法 - 高质量放大算法
     * @param {HTMLCanvasElement} canvas - 原始图片画布
     * @param {number} newWidth - 目标宽度
     * @param {number} newHeight - 目标高度
     * @param {number} lobes - 核函数瓣数（通常为2或3）
     * @returns {ImageData} 放大后的图像数据
     */
    lanczosInterpolation(canvas, newWidth, newHeight, lobes = 3) {
        const ctx = canvas.getContext('2d');
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = ctx.createImageData(newWidth, newHeight);

        // 计算宽高比例
        const widthRatio = canvas.width / newWidth;
        const heightRatio = canvas.height / newHeight;

        // Lanczos核函数
        const lanczosKernel = (x, a = lobes) => {
            if (x === 0) return 1;
            if (Math.abs(x) > a) return 0;

            const pix = Math.PI * x;
            const pia = Math.PI * x / a;
            return (a * Math.sin(pix) * Math.sin(pia)) / (pix * pia);
        };

        // 获取像素值，处理边界情况
        const getPixel = (x, y, channel) => {
            x = Math.max(0, Math.min(canvas.width - 1, x));
            y = Math.max(0, Math.min(canvas.height - 1, y));
            const index = (y * canvas.width + x) * 4;
            return originalData.data[index + channel];
        };

        // 遍历新图像的每个像素
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                // 计算对应的原始图像坐标（浮点数）
                const origX = x * widthRatio;
                const origY = y * heightRatio;

                // 取整数部分
                const xInt = Math.floor(origX);
                const yInt = Math.floor(origY);

                // 新图像当前像素的索引
                const newIndex = (y * newWidth + x) * 4;

                // 对每个颜色通道进行Lanczos插值
                for (let channel = 0; channel < 4; channel++) {
                    let sum = 0;
                    let weightSum = 0;

                    // 计算窗口内的像素
                    for (let j = -lobes + 1; j <= lobes; j++) {
                        for (let i = -lobes + 1; i <= lobes; i++) {
                            const pixelX = xInt + i;
                            const pixelY = yInt + j;

                            // 计算权重
                            const dx = origX - pixelX;
                            const dy = origY - pixelY;
                            const weight = lanczosKernel(dx) * lanczosKernel(dy);

                            // 累加加权像素值
                            sum += getPixel(pixelX, pixelY, channel) * weight;
                            weightSum += weight;
                        }
                    }

                    // 归一化并限制结果在0-255范围内
                    const result = weightSum !== 0 ? sum / weightSum : 0;
                    newData.data[newIndex + channel] = Math.max(0, Math.min(255, Math.round(result)));
                }
            }
        }

        return newData;
    }

    /**
     * 应用锐化滤镜
     * @param {ImageData} imageData - 原始图像数据
     * @param {number} strength - 锐化强度 (0-1)
     * @returns {ImageData} 锐化后的图像数据
     */
    applySharpness(imageData, strength) {
        // 锐化卷积核 - 用于增强图像边缘
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];

        // 获取图像尺寸和数据
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // 创建输出数据副本
        const output = new Uint8ClampedArray(data);

        // 根据强度调整卷积核
        const adjustedKernel = kernel.map(row =>
            row.map(val => val * strength)
        );

        // 遍历图像每个像素（排除边缘）
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0; // 初始化RGB累加值

                // 应用卷积核
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        // 计算当前核位置对应的像素索引
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        // 获取卷积核对应位置的值
                        const kernelVal = adjustedKernel[ky + 1][kx + 1];

                        // 累加RGB各通道的值
                        r += data[pixelIndex] * kernelVal;
                        g += data[pixelIndex + 1] * kernelVal;
                        b += data[pixelIndex + 2] * kernelVal;
                    }
                }

                // 计算输出像素索引
                const outputIndex = (y * width + x) * 4;

                // 限制RGB值在0-255范围内并赋值
                output[outputIndex] = Math.min(255, Math.max(0, r));       // R
                output[outputIndex + 1] = Math.min(255, Math.max(0, g));   // G
                output[outputIndex + 2] = Math.min(255, Math.max(0, b));   // B
                // Alpha通道保持不变
                output[outputIndex + 3] = data[outputIndex + 3];           // A
            }
        }

        // 返回新的图像数据
        return new ImageData(output, width, height);
    }

    /**
     * 计算保持宽高比的尺寸
     * @param {number} srcWidth - 原始宽度
     * @param {number} srcHeight - 原始高度
     * @param {number} maxWidth - 最大宽度
     * @param {number} maxHeight - 最大高度
     * @returns {Object} 包含计算后宽度和高度的对象
     */
    calculateAspectRatio(srcWidth, srcHeight, maxWidth, maxHeight) {
        // 计算缩放比例
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

        // 返回缩放后的尺寸
        return {
            width: srcWidth * ratio,
            height: srcHeight * ratio
        };
    }

    /**
     * 更新图片信息显示
     */
    updateImageInfo(scaleFactor) {
        // 如果有原始图片，更新信息显示
        if (this.originalImage) {
            return {
                width: this.originalImage.width,
                height: this.originalImage.height,
                scaleWidth: this.originalImage.width * scaleFactor,
                scaleHeight: this.originalImage.height * scaleFactor
            }
        } else {
            return null
        }
    }

    /**
     * 下载处理后的图片
     */
    downloadImage() {
        // 如果没有处理后的画布，直接返回
        if (!this.processedCanvas) return;

        // 创建下载链接
        const link = document.createElement('a');
        // 设置下载文件名（包含时间戳避免重复）
        link.download = `upscaled-image-${new Date().getTime()}.png`;
        // 设置图片数据URL
        link.href = this.processedCanvas.toDataURL('image/png');
        // 触发下载
        link.click();
    }
}
export default ImageUpscaler
// 当DOM加载完成后初始化图片放大工具
// document.addEventListener('DOMContentLoaded', () => {
//     new ImageUpscaler();
// });