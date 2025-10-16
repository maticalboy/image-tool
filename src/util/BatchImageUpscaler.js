// 多图片批量处理系统
class BatchImageUpscaler extends EventTarget {
    constructor() {
        super();  // 调用父类的构造函数
        // 初始化属性
        this.imageQueue = [];                    // 图片处理队列
        this.processingIndex = -1;               // 当前处理中的图片索引
        this.isProcessing = false;               // 是否正在处理中
        this.results = [];                       // 处理结果数组
        this.scaleFactor = 2;
        // 获取DOM元素
        this.originalCanvas = document.getElementById('originalCanvas');
        this.processedCanvas = document.getElementById('processedCanvas');
    }

    /**
     * 处理多图片上传 实际上还是一个一个上传
     * @param {File[]} files - 图片文件数组
     */
    handleImageUpload(file, scaleFactor) {
        this.scaleFactor = scaleFactor
        this.addImageToQueue(file);
        // 更新队列显示
        this.updateQueueDisplay();
    }

    /**
     * 添加图片到处理队列
     * @param {File} file - 图片文件
     */
    addImageToQueue(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // 创建图片任务对象
                const task = {
                    id: Date.now() + Math.random(), // 唯一标识
                    file: file,
                    image: img,
                    name: file.name,
                    size: file.size,
                    width: img.width,
                    height: img.height,
                    status: 'pending', // pending, processing, completed, error
                    result: null,
                    processedData: null
                };

                // 添加到队列
                this.imageQueue.push(task);

                // 更新队列显示
                this.updateQueueDisplay();
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(file.raw);
    }

    /**
     * 更新队列显示
     */
    updateQueueDisplay() {
        let queueList = []
        // 添加每个队列项
        this.imageQueue.forEach((task, index) => {
            let beforeResolution = task.width + 'x' + task.height
            let afterResolution = task.width * this.scaleFactor + 'x' + task.height * this.scaleFactor
            let item = {
                id: task.id,
                name: task.name,
                size: task.size / 1000 + "KB",
                status: this.getStatusText(task.status),
                beforeResolution: beforeResolution,
                afterResolution: afterResolution
            }
            queueList.push(item);
        });
        // 执行某些操作
        const event = new CustomEvent('updateQueueDisplay', {
            detail: {
                message: '操作已完成',
                timestamp: Date.now(),
                data: { queueList }
            }
        });
        this.dispatchEvent(event)
    }


    /**
     * 获取状态文本
     * @param {string} status - 状态代码
     * @returns {string} 状态文本
     */
    getStatusText(status) {
        const statusMap = {
            'pending': '等待处理',
            'processing': '处理中',
            'completed': '处理完成',
            'error': '处理失败',
        };
        return statusMap[status] || '未知状态';
    }

    /**
     * 从队列中移除图片
     * @param {number} index - 图片索引
     */
    removeImageFromQueue(index) {
        // 如果正在处理中，不能移除
        if (this.isProcessing && this.processingIndex === index) {
            alert('当前图片正在处理中，无法移除！');
            return;
        }
        let index1 = this.imageQueue.findIndex(item => item.id == index)

        // 从队列中移除
        this.imageQueue.splice(index1, 1);

        // 更新显示
        this.updateQueueDisplay();
    }


    /**
     * 批量处理所有图片
     */
    async processAllImages({ scaleFactor, algorithm, sharpness }) {
        // 如果没有图片，直接返回
        if (this.imageQueue.length === 0) return;

        // 设置处理状态
        this.isProcessing = true;
        this.processingIndex = 0;

        // 处理每张图片
        for (let i = 0; i < this.imageQueue.length; i++) {
            // 检查是否已取消
            if (!this.isProcessing) break;


            const task = this.imageQueue[i];
            // 更新当前处理索引
            this.processingIndex = task.id;

            // 更新状态
            task.status = 'processing';
            this.updateQueueDisplay();
            this.updateProgress(i, this.imageQueue.length);

            try {
                // 处理图片
                const result = await this.processImage(
                    task.image,
                    scaleFactor,
                    algorithm,
                    sharpness
                );

                // 更新任务状态和结果
                task.status = 'completed';
                task.result = result;
                task.processedData = result.dataURL;

            } catch (error) {
                // 处理失败
                task.status = 'error';
                task.result = { error: error.message };
                console.error(`图片 ${task.name} 处理失败:`, error);
            }

            // 更新进度
            this.updateProgress(i + 1, this.imageQueue.length);
        }

        // 处理完成
        this.isProcessing = false;
        this.processingIndex = -1;

        // 更新队列显示
        setTimeout(()=>{
            this.updateQueueDisplay();
        },1000)
        

        // // 显示完成消息
        // alert(`批量处理完成！成功处理 ${this.getCompletedCount()} 张图片`);
    }

    /**
     * 处理单张图片（核心处理逻辑）
     * @param {Image} image - 图片对象
     * @param {number} scaleFactor - 放大倍数
     * @param {string} algorithm - 算法类型
     * @param {number} sharpness - 锐化程度
     * @returns {Promise<Object>} 处理结果
     */
    async processImage(image, scaleFactor, algorithm, sharpness) {
        return new Promise((resolve, reject) => {
            try {
                // 记录开始时间
                const startTime = performance.now();

                // 计算放大后的尺寸
                const newWidth = image.width * scaleFactor;
                const newHeight = image.height * scaleFactor;

                // 创建临时画布
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = image.width;
                tempCanvas.height = image.height;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(image, 0, 0);

                // 应用选择的放大算法
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
                        imageData = this.bilinearInterpolation(tempCanvas, newWidth, newHeight);
                }

                // 应用锐化
                if (sharpness > 0) {
                    imageData = this.applySharpness(imageData, sharpness / 100);
                }

                // 创建结果画布
                const resultCanvas = document.createElement('canvas');
                resultCanvas.width = newWidth;
                resultCanvas.height = newHeight;
                const resultCtx = resultCanvas.getContext('2d');
                resultCtx.putImageData(imageData, 0, 0);

                // 获取数据URL
                const dataURL = resultCanvas.toDataURL('image/png');

                // 计算处理时间
                const endTime = performance.now();
                const processingTime = endTime - startTime;

                // 返回结果
                resolve({
                    dataURL: dataURL,
                    width: newWidth,
                    height: newHeight,
                    processingTime: processingTime,
                    originalWidth: image.width,
                    originalHeight: image.height,
                    scaleFactor: scaleFactor,
                    algorithm: algorithm
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 显示处理后的图片
     * @param {string} dataURL - 图片数据URL
     */
    displayProcessedImage(dataURL) {
        const img = new Image();
        img.onload = () => {
            // 计算显示尺寸
            const maxWidth = 400;
            const maxHeight = 400;
            const { width, height } = this.calculateAspectRatio(
                img.width,
                img.height,
                maxWidth,
                maxHeight
            );

            // 设置画布尺寸并绘制图片
            this.processedCanvas.width = width;
            this.processedCanvas.height = height;
            const ctx = this.processedCanvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
        };
        img.src = dataURL;
    }

    /**
     * 更新处理进度
     * @param {number} current - 当前处理数量
     * @param {number} total - 总数量
     */
    updateProgress(current, total) {
        const percent = Math.round((current / total) * 100);
        // 执行某些操作
        const event = new CustomEvent('updateProgress', {
            detail: {
                message: '操作已完成',
                timestamp: Date.now(),
                data: { current, total, percent }
            }
        });
        this.dispatchEvent(event)
    }

    /**
     * @description: 重置状态
     * @return {*}
     */    
    resetStatus() {
        for (let i = 0; i < this.imageQueue.length; i++) {
            const task = this.imageQueue[i];
            // 更新状态
            task.status = 'processing';
        }
        this.updateQueueDisplay();
        this.updateProgress(0, this.imageQueue.length);
    }

    /**
     * 获取已完成图片数量
     * @returns {number} 已完成数量
     */
    getCompletedCount() {
        return this.imageQueue.filter(task => task.status === 'completed').length;
    }

    /**
     * 批量下载所有处理完成的图片
     */
    downloadAllImages() {
        // 获取所有处理完成的图片
        const completedTasks = this.imageQueue.filter(task => task.status === 'completed');

        if (completedTasks.length === 0) {
            alert('没有可下载的图片！请先处理图片。');
            return;
        }

        // 如果只有一张图片，直接下载
        if (completedTasks.length === 1) {
            this.downloadImage(completedTasks[0]);
            return;
        }

        // 多张图片逐个下载
        completedTasks.forEach((task, index) => {
            // 添加延迟，避免浏览器阻止多个下载
            setTimeout(() => {
                this.downloadImage(task.id);
            }, index * 300);
        });
    }

    /**
     * 下载单张图片
     * @param {Object} taskId - 图片任务Id
     */
    downloadImage(taskId) {
        let task = this.imageQueue.find(item => item.id == taskId)
        const link = document.createElement('a');
        // 生成文件名：原文件名-放大倍数x.png
        const fileName = task.name.replace(/\.[^/.]+$/, "") + `-${task.result.scaleFactor}x-${new Date().getTime()}.png`;
        link.download = fileName;
        link.href = task.processedData;
        link.click();
    }

    /**
     * 取消处理
     */
    cancelProcessing() {
        this.isProcessing = false;

        // 更新UI状态
        this.processAllBtn.disabled = false;
        this.cancelBtn.disabled = true;

        // 重置进度
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '等待处理';

        alert('处理已取消');
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
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return {
            width: srcWidth * ratio,
            height: srcHeight * ratio
        };
    }

    // 以下是图片处理算法（与单图片版本相同）

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
     */
    applySharpness(imageData, strength) {
        const kernel = [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ];

        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const output = new Uint8ClampedArray(data);

        const adjustedKernel = kernel.map(row =>
            row.map(val => val * strength)
        );

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        const kernelVal = adjustedKernel[ky + 1][kx + 1];

                        r += data[pixelIndex] * kernelVal;
                        g += data[pixelIndex + 1] * kernelVal;
                        b += data[pixelIndex + 2] * kernelVal;
                    }
                }

                const outputIndex = (y * width + x) * 4;
                output[outputIndex] = Math.min(255, Math.max(0, r));
                output[outputIndex + 1] = Math.min(255, Math.max(0, g));
                output[outputIndex + 2] = Math.min(255, Math.max(0, b));
            }
        }

        return new ImageData(output, width, height);
    }
}
export default BatchImageUpscaler