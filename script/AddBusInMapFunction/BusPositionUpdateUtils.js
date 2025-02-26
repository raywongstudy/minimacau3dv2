/**
 * 巴士位置更新工具模块
 * 主要功能：处理巴士位置的更新、验证和准备工作
 */

import { filterCurrentBusData } from './BusDataUtils.js';

/**
 * 处理图层中所有巴士的位置更新
 * @param {Object} layer - 地图图层对象
 * @param {Array} response_bus_data - API返回的巴士数据
 */
//3.1 巴士位置更新流程-析图层ID获取路线和方向信息 -> 開始更新巴士位置，用updateLayerCubes 更新巴士位置
export async function handleBusPositionUpdates(layer, response_bus_data) {
    const customLayerIdData = layer.id.split("_");
    const customLayerDir = customLayerIdData[customLayerIdData.length - 1];
    const customLayerNum = customLayerIdData[customLayerIdData.length - 2];
    console.log(`\n=============== 更新巴士位置 ${customLayerNum}號車 - 方向：${customLayerDir} ==============`);

    // 过滤出当前图层的巴士数据
    const currentBusData = filterCurrentBusData(response_bus_data, customLayerNum, customLayerDir);

    // 更新巴士的位置和状态
    console.log(`${customLayerNum}号车场景中巴士数量:`, layer.scene.children.length);
    await updateLayerCubes(layer, currentBusData);
}

/**
 * 更新图层中的巴士立方体
 * @param {Object} layer - 地图图层对象
 * @param {Array} currentBusData - 当前巴士数据
 */
// 3.2 update - 巴士 更新图层中的巴士立方体
async function updateLayerCubes(layer, currentBusData) {
    if (!isValidBusData(currentBusData)) {
        return;
    }

    const cubesForUpdate = prepareCubesForUpdate(layer);// 準備需要更新的巴士列表, 用slice 複製一份 分開
    
    // 遍历并更新巴士数据
    await updateBusesInLayer(layer, currentBusData, cubesForUpdate);
}

/**
 * 验证巴士数据的有效性
 * @param {Array} currentBusData - 当前巴士数据
 * @returns {boolean} 数据是否有效
 */
// 3.2.1 update - 巴士 验证巴士数据的有效性-是否有巴士數據，沒有就return
function isValidBusData(currentBusData) {
    if (!currentBusData || currentBusData.length === 0) {
        console.log("没有找到相关巴士数据");
        return false;
    }
    return true;
}

/**
 * 准备需要更新的巴士列表
 * @param {Object} layer - 地图图层对象
 * @returns {Object} 包含所有巴士和待更新巴士的对象
 */
// 3.2.2 update - 巴士 准备需要更新的巴士列表
function prepareCubesForUpdate(layer) {
    const custom_cube_list = layer.cube_list.slice();
    console.log("当前层中的立方体列表:", custom_cube_list);
    return {
        allCubes: custom_cube_list,
        remainingCubes: custom_cube_list.slice()
    };
}

/**
 * 更新图层中的巴士
 * @param {Object} layer - 地图图层对象
 * @param {Array} busDataList - 巴士数据列表
 * @param {Object} cubesForUpdate - 需要更新的巴士对象
 */
// 3.3 update - 更新图层中的巴士
async function updateBusesInLayer(layer, busDataList, cubesForUpdate) {
    for (const busData of busDataList) {
        if (!isValidBusInfo(busData)) { // 如果巴士數據格式不正確，就continue
            continue;
        }

        await updateBusGroup(layer, busData, cubesForUpdate); // 更新巴士組
    }

    // 清理不再存在的巴士
    removeInactiveBuses(layer, cubesForUpdate.remainingCubes);
}

/**
 * 检查单个巴士信息是否有效
 * @param {Object} busData - 巴士数据
 * @returns {boolean} 信息是否有效
 */
function isValidBusInfo(busData) {
    if (!busData || !busData.busInfoList) {
        console.log("巴士数据格式不正确:", busData);
        return false;
    }
    return true;
}

/**
 * 移除不活跃的巴士
 * @param {Object} layer - 地图图层对象
 * @param {Array} remainingCubes - 待清理的巴士列表
 */
// 3.4 update - 正常開始更新单个巴士组 這個方法會解決巴士位置跳變過大
function removeInactiveBuses(layer, remainingCubes) {
    console.log("需要清理的立方体列表:", remainingCubes);
    
    if (remainingCubes.length > 0) {
        for (const cube of remainingCubes) {
            console.log("需要删除的巴士：", cube.userData);
            layer.scene.remove(cube);
            layer.cube_list = layer.cube_list
                .filter(item => item.userData.busPlate !== cube.userData.busPlate);
        }
    }
} 