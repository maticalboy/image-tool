<template>
    <div
        style="
            width: 100%;
            height: 100%;
            background-color: #f8f8f8;
            padding: 0 20px;
            box-sizing: border-box;
        "
    >
        <div class="flex-between">
            <el-upload
                style="width: 400px"
                drag
                multiple
                :auto-upload="false"
                action=""
                :show-file-list="false"
                :file-list="fileList"
                accept=".png,.jpg"
                :on-change="imageOnChange"
            >
                <i class="el-icon-upload"></i>
                <div class="el-upload__text">
                    将文件拖到此处，或<em>点击上传</em>
                    <div class="el-upload__tip" slot="tip">
                        最多上传10个图片（最大像素1920x1080），单个不超过5MB
                    </div>
                </div>
            </el-upload>
            <div
                style="
                    flex: 1;
                    padding: 35px 20px;
                    box-sizing: border-box;
                    height: 200px;
                    margin-left: 20px;
                    background-color: #fff;
                    border-radius: 30px;
                "
            >
                <el-form
                    :model="formImage"
                    label-width="65px"
                    @submit.native.prevent
                >
                    <el-form-item label="放大倍数:" prop="scaleFactor">
                        <el-radio v-model="formImage.scaleFactor" :label="2"
                            >2X</el-radio
                        >
                        <el-radio v-model="formImage.scaleFactor" :label="3"
                            >3X</el-radio
                        >
                        <el-radio v-model="formImage.scaleFactor" :label="4"
                            >4X</el-radio
                        >
                    </el-form-item>
                    <el-form-item label="选择算法:" prop="algorithm">
                        <el-select
                            v-model="formImage.algorithm"
                            placeholder="请选择算法"
                        >
                            <el-option
                                v-for="item in algorithmOptions"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                            >
                            </el-option>
                        </el-select>
                    </el-form-item>
                    <el-form-item label="锐化程度:" prop="sharpness">
                        <el-slider
                            v-model="formImage.sharpness"
                            :format-tooltip="formatTooltip"
                            :min="0"
                            :max="200"
                        ></el-slider>
                    </el-form-item>
                </el-form>
            </div>
        </div>
        <div class="list">
            <div class="list-head">
                <el-button-group>
                    <el-button
                        type="danger"
                        icon="el-icon-arrow-left"
                        size="small"
                        @click="clearAll"
                        :disabled="
                            !fileList.length || (percent != 0 && percent != 100)
                        "
                        >清空列表</el-button
                    >
                    <el-button
                        type="primary"
                        icon="el-icon-refresh-left"
                        v-show="percent == 100"
                        size="small"
                        @click="resetAndProcessAllImages"
                        >重新处理</el-button
                    >
                    <el-button
                        type="success"
                        size="small"
                        icon="el-icon-arrow-right"
                        v-show="percent == 0"
                        :disabled="!fileList.length"
                        @click="processAllImages"
                        >开始处理
                    </el-button>
                    <el-button
                        type="success"
                        size="small"
                        v-show="percent == 100"
                        @click="buildDownload"
                        >打包下载
                        <i class="el-icon-download"></i>
                    </el-button>
                </el-button-group>
            </div>
            <ul
                class="list-body"
                v-show="fileList.length"
                v-loading="percent != 0 && percent != 100"
            >
                <li
                    v-for="(item, index) in fileList"
                    :key="index"
                    class="list-item"
                >
                    <span>{{ item.name }}</span>
                    <div>
                        <span>{{ item.beforeResolution }}</span>
                        <span>-></span>
                        <span>{{ item.afterResolution }}</span>
                        <el-tag type="success" style="margin: 0 35px 0 40px">{{
                            item.status
                        }}</el-tag>
                        <div style="width: 85px; display: inline-block">
                            {{ item.size }}
                        </div>
                        <el-button
                            v-show="item.status != '处理中'"
                            type="danger"
                            icon="el-icon-close"
                            circle
                            size="mini"
                            style="margin-left: 30px"
                            :disabled="item.status == '处理中'"
                            @click="deleteFile(item)"
                        ></el-button>
                        <el-button
                            v-show="item.status == '处理完成'"
                            icon="el-icon-download"
                            size="mini"
                            style="margin-left: 30px"
                            @click="downLoad(item)"
                        ></el-button>
                    </div>
                </li>
            </ul>
            <el-empty
                style="height: 300px"
                v-show="!fileList.length"
                description="暂无数据"
            ></el-empty>
        </div>
        <canvas id="originalCanvas" style="display: none"></canvas>
        <canvas id="processedCanvas" style="display: none"></canvas>
    </div>
</template>
<script>
import BatchImageUpscaler from "@/util/BatchImageUpscaler";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default {
    mounted() {
        this.BatchImageUpscaler = new BatchImageUpscaler();
        this.BatchImageUpscaler.addEventListener(
            "updateQueueDisplay",
            this.updateQueueDisplay.bind(this)
        );
        this.BatchImageUpscaler.addEventListener(
            "updateProgress",
            this.updateProgress.bind(this)
        );
    },
    data() {
        return {
            percent: 0,
            fileList: [],
            formImage: {
                scaleFactor: 2,
                algorithm: "bilinear",
                sharpness: 100,
            },
            algorithmOptions: [
                {
                    label: "最近邻插值",
                    value: "nearest",
                },
                {
                    label: "双线性插值",
                    value: "bilinear",
                },
                {
                    label: "双三次插值",
                    value: "bicubic",
                },
            ],
        };
    },
    methods: {
        formatTooltip(val) {
            return val + "%";
        },

        /**
         * @description: 更新列表数据
         * @param {*} event
         * @return {*}
         */
        updateQueueDisplay(event) {
            this.fileList = event.detail.data.queueList;
        },

        /**
         * @description: 更新进度信息
         * @param {*} event
         * @return {*}
         */
        updateProgress(event) {
            this.percent = event.detail.data.percent;
        },

        /**
         * @description: 全部清除
         * @return {*}
         */
        clearAll() {
            this.fileList.forEach((file) => {
                this.deleteFile(file);
            });
            this.percent = 0;
            this.fileList = [];
        },

        /**
         * @description: 重新处理
         * @return {*}
         */
        resetAndProcessAllImages() {
            this.percent = 1;
            this.BatchImageUpscaler.resetStatus();
            setTimeout(() => {
                this.BatchImageUpscaler.processAllImages(this.formImage);
            }, 1000);
        },

        /**
         * @description: 对列表进行删除
         * @param {*} item
         * @return {*}
         */
        deleteFile(item) {
            this.BatchImageUpscaler.removeImageFromQueue(item.id);
        },

        /**
         * @description: 全部打包下载
         * @return {*}
         */
        async buildDownload(zipName = "zip文件") {
            let fileList = this.BatchImageUpscaler.imageQueue.map((task) => {
                let blob = this.dataURLtoBlob(task.processedData);
                let url = URL.createObjectURL(blob);
                return {
                    name:task.name,
                    url,
                };
            });
            console.log(fileList);
            const zip = new JSZip();
            // 用于存储所有获取文件的Promise
            const promises = [];

            fileList.forEach((file) => {
                // 为每个文件创建一个Promise
                const promise = fetch(file.url)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error(
                                `网络请求失败: ${response.statusText}`
                            );
                        }
                        return response.blob();
                    })
                    .then((blob) => {
                        // 将获取到的Blob数据添加到zip中
                        zip.file(file.name, blob, { binary: true });
                    });
                promises.push(promise);
            });

            try {
                // 等待所有文件获取完成
                await Promise.all(promises);
                // 生成ZIP文件的Blob
                const zipBlob = await zip.generateAsync({
                    type: "blob",
                    compression: "DEFLATE", // 使用压缩以减小文件体积
                });
                // 触发下载
                saveAs(zipBlob, `zip文件.zip`);
            } catch (error) {
                console.error("下载或打包过程中出现错误:", error);
            }
        },

        /**
         * @description: base64转blob
         * @param {*} dataurl
         * @return {*}
         */
        dataURLtoBlob(dataurl) {
            var arr = dataurl.split(",");
            var mime = arr[0].match(/:(.*?);/)[1];
            var bstr = atob(arr[1]);
            var n = bstr.length;
            var u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        },

        /**
         * @description: 下载
         * @return {*}
         */
        downLoad(item) {
            this.BatchImageUpscaler.downloadImage(item.id);
        },

        /**
         * @description: 批量处理
         * @return {*}
         */
        processAllImages() {
            this.BatchImageUpscaler.processAllImages(this.formImage);
        },

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

            const isLt2M = file.size / 1024 / 1024 < 5;
            if (!isLt2M) {
                this.$message.error("上传图片大小不能超过 5MB!");
            } else {
                if (file) {
                    await this.BatchImageUpscaler.handleImageUpload(
                        file,
                        this.formImage.scaleFactor
                    );
                }
            }
            return isLt2M;
        },
    },
};
</script>
<style lang="less" scoped>
.flex-between {
    height: 250px;
    display: flex;
    align-items: center;
    // justify-content: space-between;
}
.list {
    width: 100%;
    max-height: calc(100% - 250px);
    background-color: #fff;
    border-radius: 30px;
    border-bottom: 1px solid transparent;
}
.list-head {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    height: 80px;
    padding: 0 20px;
    box-sizing: border-box;
    border-bottom: 1px solid #ebeef5;
}
.list-body {
    height: calc(100% - 80px);
}
.list-item {
    height: 40px;
    padding: 0 20px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
