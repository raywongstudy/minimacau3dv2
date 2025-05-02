/**
 * 巴士事件處理模組
 * 處理巴士相關的滑鼠事件和彈出視窗
 */
import { calculateDistanceInDirection } from './CoordinateUtils.js'; // 計算兩點之間的距離

/**
 * 初始化巴士事件處理
 * @param {Object} map - Mapbox地圖實例
 * @param {Object} layer - 巴士圖層
 * @param {Object} popup - Mapbox彈出視窗實例
 */
export function initializeBusEvents(map, layer, popup) {
    // 滑鼠移動事件處理
    map.on('mousemove', (e) => {
        handleMouseMove(e, map, layer, popup);
    });
}

/**
 * 處理滑鼠移動事件
 * @private 
 */
function handleMouseMove(e, map, layer, popup) {
    const mousePoint = e.lngLat;
    let mousePosition = calculateDistanceInDirection(parseFloat(mousePoint.lng),parseFloat(mousePoint.lat),layer.longitude,layer.latitude)
    
    let hoveredBus = findHoveredBus(mousePosition, layer.cube_list, layer);
    
    updatePopupAndCursor(hoveredBus, map, popup, layer.route_elements);
}

/**
 * 查找滑鼠懸停的巴士
 * @private
 */
function findHoveredBus(mousePosition, cubeList, layer) {

    let cubePosition;
    for (const cube of cubeList) {
        if(cube.userData.previousPosition){
            cubePosition = [cube.userData.previousPosition.y,-cube.userData.previousPosition.x]
        }else{
            cubePosition = calculateDistanceInDirection(
                parseFloat(cube.userData.sourceLngLat[0]),
                parseFloat(cube.userData.sourceLngLat[1]),
                layer.longitude,layer.latitude)
        }        
        const dx = mousePosition[0] - cubePosition[0];
        const dy = mousePosition[1] - cubePosition[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 25) { // 約15米的閾值
            return cube;
        }
    }
    return null;
}

/**
 * 更新彈出視窗和游標
 * @private
 */
function updatePopupAndCursor(hoveredBus, map, popup, routeElements) {
    if (hoveredBus) {
        const direction = hoveredBus.userData.busDir == "0" ? "去程" : "回程";
        popup
            .setLngLat(hoveredBus.userData.currentLngLat)
            .setHTML(`
                <h3>巴士號: ${routeElements.bus_name}</h3>
                <p>車牌: ${hoveredBus.userData.busPlate}</p>
                <p>方向: ${direction}</p>
                <p>速度: ${hoveredBus.userData.busSpeed} km/h</p>
            `)
            .addTo(map);

        map.getCanvas().style.cursor = 'pointer';
    } else {
        popup.remove();
        map.getCanvas().style.cursor = '';
    }
} 