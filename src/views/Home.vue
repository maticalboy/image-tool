<template>
    <div style="height: 100%">
        <el-container>
            <el-header>Header</el-header>
            <el-main>
                <image-tool></image-tool>
            </el-main>
        </el-container>
    </div>
</template>
<script>
import ImageTool from '@/components/ImageTool.vue'
export default {
    components: {
        // ImageTool: () => import("@/components/ImageTool.vue"),
        ImageTool
    },
    data() {
        return {};
    },
};
</script>
