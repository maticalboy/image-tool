<template>
    <div
        style="
            width: 100%;
            height: 100%;
            background-color: #f8f8f8;
            padding: 0;
            box-sizing: border-box;
        "
    >
        <div class="image-container">
            <div class="image-input">
                <el-upload
                    style="
                        width: 100%;
                        height: 680px;
                        padding: 20px;
                        box-sizing: border-box;
                    "
                    drag
                    :auto-upload="false"
                    action=""
                    :show-file-list="false"
                    accept=".png,.jpg,.svg,.webp"
                    :on-change="imageOnChange"
                >
                    <i class="el-icon-upload"></i>
                    <div class="el-upload__text">
                        将文件拖到此处，或<em>点击上传</em>
                        <div class="el-upload__tip" slot="tip">
                            支持JPG,PNG,SVG,WEBP
                        </div>
                    </div>
                </el-upload>
            </div>
            <div class="image-layout">
                <div class="canvas-wrapper">
                    <canvas
                        ref="canvas"
                        @click="pickColor"
                        @mousemove="previewColor"
                        @mouseenter="showMagnifier"
                        @mouseleave="hideMagnifier"
                    ></canvas>
                    <div
                        class="magnifier"
                        ref="magnifier"
                        :style="{
                            left: magnifierPosition.x + 'px',
                            top: magnifierPosition.y + 'px',
                            display: magnifierVisible ? 'block' : 'none',
                        }"
                    >
                        <canvas
                            class="magnifier-canvas"
                            ref="magnifierCanvas"
                        ></canvas>
                        <div class="magnifier-center"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="color-container">
            <div class="color-list">
                <div
                    v-for="(color, index) in recentColors"
                    :key="index"
                    class="color-item"
                    :style="{ backgroundColor: color.hex }"
                    @click="selectRecentColor(color)"
                    :title="color.hex"
                >
                    <p>{{ color.hex }} <i class="el-icon-copy-document"></i></p>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    data() {
        return {
            imageSrc: null,
            selectedColor: {
                hex: "#FFFFFF",
                rgb: "rgb(255, 255, 255)",
                x: 0,
                y: 0,
            },
            recentColors: [],
            canvas: null,
            ctx: null,
            previewColorHex: null,

            magnifierCanvas: null,
            magnifierCtx: null,
            magnifierVisible: false,
            magnifierPosition: {
                x: 0,
                y: 0,
            },
            magnifierSize: 150,
            magnifierZoom: 3,
        };
    },
    mounted() {
        // 初始化Canvas上下文
        this.canvas = this.$refs.canvas;
        if (this.canvas) {
            this.ctx = this.canvas.getContext("2d");
        }

        // 初始化放大镜Canvas
        this.magnifierCanvas = this.$refs.magnifierCanvas;
        if (this.magnifierCanvas) {
            this.magnifierCanvas.width = this.magnifierSize;
            this.magnifierCanvas.height = this.magnifierSize;
            this.magnifierCtx = this.magnifierCanvas.getContext("2d");
        }
    },
    methods: {
        /**
         * @description: 每次提交 都需要解析数据
         * @param {*} file
         * @param {*} fileList
         * @return {*}
         */
        async imageOnChange(file, fileList) {
            //判断上传文件格式只能是图片格式
            let fileName = file.name;
            let suffix = "";
            if (fileName.indexOf(".") > -1) {
                suffix = fileName.substring(
                    fileName.lastIndexOf("."),
                    fileName.length
                );
            }
            let imageSuffix = [".jpg", ".png", ".JPG", ".PNG"];
            if (suffix === "" || imageSuffix.indexOf(suffix) < 0) {
                this.$message.error("上传图片格式不正确!");
                return;
            }

            if (file) {
                // await this.BatchImageUpscaler.handleImageUpload(
                //     file,
                //     this.formImage.scaleFactor
                // );
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.imageSrc = e.target.result;
                    this.$nextTick(() => {
                        this.loadImageToCanvas();
                    });
                };
                reader.readAsDataURL(file.raw);
            }
        },

        /**
         * @description: 将图片加载到Canvas
         * @return {*}
         */
        loadImageToCanvas() {
            const img = new Image();
            img.onload = () => {
                // 设置Canvas尺寸为图片尺寸，但限制最大宽度/高度
                const maxWidth = 1246;
                const maxHeight = 600;

                let { width, height } = img;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                this.canvas.width = width;
                this.canvas.height = height;

                // 绘制图片到Canvas
                this.ctx.drawImage(img, 0, 0, width, height);
            };
            img.src = this.imageSrc;
        },

        /**
         * @description: 从Canvas获取颜色
         * @param {*} event
         * @return {*}
         */
        pickColor(event) {
            if (!this.ctx) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const pixel = this.ctx.getImageData(x, y, 1, 1).data;
            const hex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
            const rgb = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;

            this.selectedColor = {
                hex,
                rgb,
                x: Math.round(x),
                y: Math.round(y),
            };

            // 添加到最近颜色列表
            this.addToRecentColors(this.selectedColor);
        },

        /**
         * @description: 预览颜色（鼠标移动时）
         * @param {*} event
         * @return {*}
         */
        previewColor(event) {
            if (!this.ctx) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // 更新放大镜位置
            this.magnifierPosition.x =
                x +
                this.magnifierSize / 6 +
                rect.left -
                document
                    .getElementsByClassName("canvas-wrapper")[0]
                    .getBoundingClientRect().left;
            this.magnifierPosition.y = y + this.magnifierSize / 6;

            // 更新放大镜内容
            this.updateMagnifier(x, y);

            const pixel = this.ctx.getImageData(x, y, 1, 1).data;
            this.previewColorHex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
        },

        // 更新放大镜内容
        updateMagnifier(x, y) {
            if (!this.magnifierCtx || !this.ctx) return;

            // 计算放大区域
            const zoom = this.magnifierZoom;
            const size = this.magnifierSize;
            const sourceSize = size / zoom;

            // 清除放大镜Canvas
            this.magnifierCtx.clearRect(0, 0, size, size);

            // 绘制放大区域
            this.magnifierCtx.drawImage(
                this.canvas,
                x - sourceSize / 2,
                y - sourceSize / 2,
                sourceSize,
                sourceSize,
                0,
                0,
                size,
                size
            );

            // 绘制中心十字线
            this.magnifierCtx.strokeStyle = "white";
            this.magnifierCtx.lineWidth = 1;
            this.magnifierCtx.beginPath();
            this.magnifierCtx.moveTo(size / 2, 0);
            this.magnifierCtx.lineTo(size / 2, size);
            this.magnifierCtx.stroke();

            this.magnifierCtx.beginPath();
            this.magnifierCtx.moveTo(0, size / 2);
            this.magnifierCtx.lineTo(size, size / 2);
            this.magnifierCtx.stroke();
            console.log(
                `x: ${x}, y: ${y}, sx: ${x - sourceSize / 2}, sy: ${
                    y - sourceSize / 2
                }, sw: ${sourceSize}, sh: ${sourceSize}`
            );
        },

        // 显示放大镜
        showMagnifier() {
            this.magnifierVisible = true;
        },

        // 隐藏放大镜
        hideMagnifier() {
            this.magnifierVisible = false;
        },

        /**
         * @description: RGB转十六进制
         * @param {*} r
         * @param {*} g
         * @param {*} b
         * @return {*}
         */
        rgbToHex(r, g, b) {
            return (
                "#" +
                ((1 << 24) + (r << 16) + (g << 8) + b)
                    .toString(16)
                    .slice(1)
                    .toUpperCase()
            );
        },

        /**
         * @description: 添加到最近颜色列表
         * @param {*} color
         * @return {*}
         */
        addToRecentColors(color) {
            // 检查是否已存在相同颜色
            const exists = this.recentColors.some((c) => c.hex === color.hex);
            if (!exists) {
                this.recentColors.unshift(color);
                // 限制最近颜色数量
                if (this.recentColors.length > 8) {
                    this.recentColors.pop();
                }
            }
        },

        /**
         * @description: 选择最近颜色
         * @param {*} color
         * @return {*}
         */
        selectRecentColor(color) {
            this.selectedColor = { ...color };
            this.copyToClipboard(this.selectedColor.hex).then(() => {
                this.$message.success("复制成功");
            });
        },

        // 兼容性更好的复制方法
        async copyToClipboard(text) {
            // 检查浏览器支持情况
            if (navigator.clipboard && window.isSecureContext) {
                // 使用现代 Clipboard API
                await navigator.clipboard.writeText(text);
            } else {
                // 使用传统方法降级处理
                await this.fallbackCopyTextToClipboard(text);
            }
        },

        // 传统复制方法
        fallbackCopyTextToClipboard(text) {
            return new Promise((resolve, reject) => {
                // 创建临时 textarea 元素
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // 避免屏幕闪烁
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.width = "2em";
                textArea.style.height = "2em";
                textArea.style.padding = "0";
                textArea.style.border = "none";
                textArea.style.outline = "none";
                textArea.style.boxShadow = "none";
                textArea.style.background = "transparent";
                textArea.style.opacity = "0";

                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    // 执行复制命令
                    const successful = document.execCommand("copy");
                    document.body.removeChild(textArea);

                    if (successful) {
                        resolve();
                    } else {
                        reject(new Error("复制命令执行失败"));
                    }
                } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                }
            });
        },
    },
};
</script>
<style lang="less" scoped>
:deep(.el-upload) {
    width: 100%;
    height: 100%;
}
:deep(.el-upload-dragger) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 200px 0;
    width: 100%;
    height: 100%;
}
.image-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 20px;
    .image-input {
        flex: 0 0 28%;
        border: 1px dashed #fff;
        border-radius: 20px !important;
        background-color: #fff;
    }
    .image-layout {
        flex: 1 1 auto;
        padding: 16px;
        background-color: #fff;
        border: 1px solid #fff;
        border-radius: 20px !important;
        display: grid;
        place-items: center;
        canvas {
            max-width: 100%;
            height: auto;
            cursor: crosshair;
            border-radius: 4px;
        }
        .canvas-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            .magnifier {
                position: absolute;
                width: 150px;
                height: 150px;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                pointer-events: none;
                z-index: 10;
                overflow: hidden;
                display: none;
            }
            .magnifier::before {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);
                z-index: 2;
            }
            .magnifier-canvas {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
            }
            .magnifier-center {
                position: absolute;
                width: 2px;
                height: 2px;
                background: white;
                border: 1px solid black;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 3;
            }
        }
    }
}
.color-container {
    width: 100%;
    min-height: 200px;
    background-color: #fff;
    border-radius: 20px !important;
    border: 1px solid #fff;
    margin-top: 20px;
    .color-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 50px;
    }
    .color-item {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 80px;
        height: 80px;
        border-radius: 5px;
        cursor: pointer;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
        position: relative;
    }
    .color-item:hover {
        transform: scale(1.1);
    }
    .color-item .color-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
    }
    .color-item:hover .color-tooltip {
        opacity: 1;
    }
}
</style>
