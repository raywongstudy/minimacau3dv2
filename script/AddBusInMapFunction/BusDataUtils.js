/**
 * 巴士數據處理工具模組
 * 主要功能：
 * - 過濾當前圖層的巴士數據
 */

/**
 * 过滤当前图层的巴士数据
 * @param {Array} response_bus_data - API返回的巴士数据
 * @param {string} routeNum - 路线编号
 * @param {string} dir - 行驶方向
 * @returns {Array} 过滤后的巴士数据
 */
export function filterCurrentBusData(response_bus_data, routeNum, dir) {
    if (!response_bus_data || !Array.isArray(response_bus_data)) {
        console.log("无效的巴士数据:", response_bus_data);
        return [];
    }
    const filteredData = response_bus_data.filter(item => 
        item.bus_name === routeNum && item.dir.toString() === dir
    );
    console.log(`过滤后的巴士数据 (路线: ${routeNum}, 方向: ${dir}):`, filteredData);
    return filteredData;
} 