<template>
    <div style="height: 100%">
        <el-container>
            <el-header>Header</el-header>
            <el-main style="background-color: #f8f8f8;">
                <!-- <batch-image-upscaler></batch-image-upscaler> -->
                 <image-color-picker></image-color-picker>
            </el-main>
        </el-container>
    </div>
</template>
<script>
import BatchImageUpscaler from '@/components/BatchImageUpscaler.vue'
import ImageColorPicker from '@/components/ImageColorPicker.vue';
export default {
    components: {
        BatchImageUpscaler,
        ImageColorPicker,
    },
    data() {
        return {};
    },
};
</script>
