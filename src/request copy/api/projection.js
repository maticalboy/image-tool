import axios from "../http";

const projection = {
    /**
     * 查询坐标系分类
     */
    getCoordinateClassification: function () {
        return axios.get("/projection/crs/")
    },
    /**
     * 添加坐标系分类
     * @param data
     * @returns {Promise<AxiosResponse<any>>}
     */
    addProjectionFolder(data) {
        return axios.post('/projection/crs/', data)
    },
    /**
     * 修改坐标系分类
     */
    updateProjectionFolder(data) {
        return axios.put('/projection/crs/', data)
    },
    /**
     * 删除坐标系分类
     */
    deleteProjectionFolder(id) {
        return axios.delete(`/projection/crs/${id}`)
    },
    /**
     * 根据code和authname查询坐标系分类
     */
    getProjectionFolderByCodeAndAuthname(code, authname) {
        return axios.get(`/projection/crs/${code}/${authname}`)
    },



}

export default projection;
