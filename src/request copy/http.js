/**
 * axios封装
 * 请求拦截、响应拦截、错误统一处理
 */
import axios from 'axios'
import { Message } from 'element-ui';
// import { clearAllCookie, getToken } from "platuser/src/public/cookieTool.js";
// import store from '../store/index';
// import HistoryManagerEventBus from "../events/HistoryManagerEventBus";
// import backendOperation from "../HAHistoryManager/backendOperation";


/**
 * 提示函数
 * 禁止点击蒙层、显示一秒后关闭
 */
/*const tip = msg => {
  Notification({
    title: '成功',
    message: msg,
    position: 'bottom-right',
    duration: 2000,
    type: 'success'
  })
}*/

const errorTip = msg => {
    Message.closeAll()
    Message({
        message: msg,
        type: 'error'
    })
}

/**
 * 请求失败的统一处理
 * @param res 服务器响应
 */
const errorHandle = (response) => {
    switch (response.data.code) {
        case "20001":
            //errorTip('未登陆或登录过期，请重新登录!');
            //清除cookie
            clearAllCookie();
            store.dispatch('setUser', null);
            store.dispatch('setProject', null);
            //跳回登录页
            //toLogin()
            break;
        default:
            errorTip(response.data.message)
            break;
    }
    return Promise.reject(response)
}


// 创建axios实例
const http = axios.create({ timeout: 0 })
// 设置post请求头
http.defaults.headers.post['Content-Type'] = 'application/json'
/**
 * 请求拦截器
 * 每次请求前，如果存在token则在请求头中携带token
 */
http.interceptors.request.use(
    config => {
        // 登录流程控制中，根据本地是否存在token判断用户的登录情况
        // 但是即使token存在，也有可能token是过期的，所以在每次的请求头中携带token
        // 后台根据携带的token判断用户的登录情况，并返回给我们对应的状态码
        // 而后我们可以在响应拦截器中，根据状态码进行一些统一的操作。
        const token = getToken()
        //config.headers.common['Token'] = token
        config.headers.common['user-token'] = token

        return config
    },
    error => Promise.error(error))

/**
 * 响应拦截器
 */
http.interceptors.response.use(res => {
    // 请求成功
    if (res.data.code === '0') {
        if (res.config.method !== 'get' && !!res.data.operationInfo) {
            if (res.data.operationInfo === "移除项目数据") {
                for (let i = 0; i < res.data.operationProjectDataIdList.length; i++) {
                    HistoryManagerEventBus.notifyRemoveBackOperations(res.data.operationProjectDataIdList[i])
                }
            }
            let operationBack = new backendOperation(res.data.operationInfo, res.data.operationProjectDataIdList)
            HistoryManagerEventBus.notifyAddOperation(operationBack)
        }
        return Promise.resolve(res)
    } else {
        return errorHandle(res)
    }

},
    // 请求失败
    error => {
        const { response } = error
        if (response) {
            // 请求已发出，但是不在2xx的范围
            return errorHandle(response)
        } else {
            // 处理断网的情况
            // eg:请求超时或断网时，更新state的network状态
            // network状态在app.vue中控制着一个全局的断网提示组件的显示隐藏
            // 关于断网组件中的刷新重新获取数据，会在断网组件中说明
            if (!window.navigator.onLine) {
                store.commit('changeNetwork', false)
            } else {
                return Promise.reject(error)
            }
        }
    })

export default http

