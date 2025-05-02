import { AddMarker } from './../tools/support.js';

/**
 * 座標計算工具模組
 * 主要功能：
 * - 計算兩點之間的距離
 * - 經緯度轉換為平面坐標
 * - 路線點位計算
 */

/**
 * 計算兩點之間Three坐標系x,y的距離（經緯度轉換為平面坐標）
 * @param {number} lon1 - 起點經度
 * @param {number} lat1 - 起點緯度
 * @param {number} lon2 - 終點經度
 * @param {number} lat2 - 終點緯度
 * @returns {Array} [緯度方向距離, 經度方向距離]
 */
export function calculateDistanceInDirection(lon1, lat1, lon2, lat2) { // 計算兩點之間的距離
    const dLat = lat2 - lat1; // 緯度差
    const dLon = lon2 - lon1; // 經度差
    const distanceLat = dLat * 111194; // 緯度方向上的實際移動距離（米）
    const avgLat = (lat1 + lat2) / 2; // 平均緯度
    const distanceLon = dLon * 111194 * Math.cos(avgLat * Math.PI / 180); // 經度方向上的實際移動距離（米）
    return [distanceLat, distanceLon];
}


/**
 * 根据距离和目标坐标计算起始坐标
 * @param {number} distanceLat - 緯度方向上的實際移動距離（米）
 * @param {number} distanceLon - 經度方向上的實際移動距離（米）
 * @param {number} lon2 - 目標經度
 * @param {number} lat2 - 目標緯度
 * @returns {Array} [起始經度, 起始緯度]
 */

//输入 y , -x , 地圖lon , 地圖lat
export function calculateCoordinateFromDistance(distanceLat, distanceLon, lon2, lat2) { // 根据距离和目标坐标计算起始坐标
    // Step 1: Solve for lat1
    const lat1 = lat2 - distanceLat / 111194;
  
    // Step 2: Calculate average latitude
    const avgLat = (lat1 + lat2) / 2;
    const radAvgLat = avgLat * Math.PI / 180;  // Convert to radians
  
    // Step 3: Solve for lon1
    // distanceLon = (lon2 - lon1) * 111194 * cos(radAvgLat)
    // => (lon2 - lon1) = distanceLon / (111194 * cos(radAvgLat))
    // => lon1 = lon2 - (distanceLon / (111194 * cos(radAvgLat)))
    const dLon = distanceLon / (111194 * Math.cos(radAvgLat));
    const lon1 = lon2 - dLon;
  
    return [lon1, lat1];
  }

// getPointsInTrafficData 用 - 計算兩點之間的距離
function getDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    // 簡單的二維平面距離，未考量地球曲率
    return Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2));
  }
// getPointsInTrafficData 用 - 在所有座標中，找出與指定點距離最近的索引
function findClosestIndex(coordinates, targetPoint) {
    let minDist = Infinity;
    let closestIndex = -1;
  
    coordinates.forEach((coord, index) => {
        const dist = getDistance(coord, targetPoint);
        if (dist < minDist) {
            minDist = dist;
            closestIndex = index;
        }
    });
    return closestIndex;
}

/**
 * 獲取兩點之間的路線點位
 * @param {Array} currentLngLat - 起點坐標 [經度, 緯度]
 * @param {Array} targetLngLat - 終點坐標 [經度, 緯度] 
 * @returns {Array} [路線點位數組, 路線點位數組]
 * 
 * 功能說明:
 * 1. 將輸入的起點和終點座標轉換為8位小數的格式
 * 2. 將路線數據中的座標點轉換為數值格式
 * 3. 在路線數據中查找起點和終點的索引位置
 * 4. 如果找不到起點或終點,返回直線路徑
 * 5. 如果起點和終點相同,返回空數組
 * 6. 返回起點到終點之間的所有路線點位
 */
export function getPointsInTrafficData(layer, newBusInfo, bus_name, bus_dir, currentLngLat, targetLngLat) {
    bus_name = bus_name.toString().padStart(5, '0');    
    // 根據距離動態計算幀數，並加入速度因子 // ！！真實行駛時間 ≈ 距離 ÷ 速率
    const distance = turf.distance(currentLngLat, targetLngLat); // 計算兩點之間的距離 输出單位：米
    // console.log("currentLngLat:", currentLngLat);
    // console.log("targetLngLat:", targetLngLat);
    // console.log("distance:", distasnce);
    
    let animation_number = Math.max(200, Math.min(500, Math.floor(distance * 1000))); //200 - 500 之間 //每公里加1000
    // 根據巴士速度調整動畫幀數，速度越快幀數越少
    if (newBusInfo.speed > 50) {
        // 根據巴士超速情況(>40km/h)減少動畫幀數，最多減少150幀，確保動畫流暢度
        animation_number = animation_number - Math.min(100, Math.floor((newBusInfo.speed - 40) / 60 * 1000)); 
    } else if (newBusInfo.speed <= 50) {
        // 根據巴士低速情況(<40km/h)增加動畫幀數，最多增加150幀，確保動畫流暢度
        animation_number = animation_number + Math.min(200, Math.floor((40 - newBusInfo.speed) / 60 * 1000)); 
    }
    const speedFactor = 0.3; // 速度倍率 - 越大動畫速度越慢，巴士移動越慢；越小動畫時間越小，巴士移動越快
    animation_number = Math.floor(animation_number * speedFactor);

    // 1. 獲取路線資料
    let route_traffic_data_use = window.traffic_data;
    let routeCoordinates = route_traffic_data_use.find(e => e.routeCode == bus_name && e.direction == bus_dir);

    // 添加錯誤處理 -------------- 如果找不到路線數據，才會運行!! 返回一個簡單的直線路徑
    if (!routeCoordinates || !routeCoordinates.coordinate) {
        console.warn(`找不到路線數據: 巴士號=${bus_name}, 方向=${bus_dir}`);
        // 返回一個簡單的直線路徑
        const currentPosition = calculateDistanceInDirection(
            parseFloat(currentLngLat[0]),
            parseFloat(currentLngLat[1]),
            parseFloat(layer.longitude),
            parseFloat(layer.latitude)
        );
        const targetPosition = calculateDistanceInDirection(
            parseFloat(targetLngLat[0]),
            parseFloat(targetLngLat[1]),
            layer.longitude,
            layer.latitude
        );
        
        // 計算單一段的deltaPosition
        const deltaY = (targetPosition[0] - currentPosition[0]) / animation_number;
        const deltaX = (targetPosition[1] - currentPosition[1]) / animation_number;
        
        return [[deltaY, deltaX], [animation_number]]; // 返回deltaPosition, animation_number 直接輸出用
    }


    // 使用routeUtils中的getRoutePointsBetweenCoordinates函數獲取路線點位
    let routePoints = window.routeUtils.getRoutePointsBetweenCoordinates(routeCoordinates, currentLngLat, targetLngLat);
    let fullRoadLngLat = routePoints;
    
    console.log("3. fullRoadLngLat:", fullRoadLngLat);

    // 4. 計算所有LngLat的Position
    const currentPosition = calculateDistanceInDirection(parseFloat(currentLngLat[0]),parseFloat(currentLngLat[1]),parseFloat(layer.longitude),parseFloat(layer.latitude));
    const targetPosition = calculateDistanceInDirection(parseFloat(targetLngLat[0]),parseFloat(targetLngLat[1]),layer.longitude,layer.latitude);
    // for loop 計算所有fullRoadLngLat的Position, 要输出array
    let fullRoadPosition = [];
    for (let i = 0; i < fullRoadLngLat.length; i++) {
        const position = calculateDistanceInDirection(parseFloat(fullRoadLngLat[i][0]),parseFloat(fullRoadLngLat[i][1]),layer.longitude,layer.latitude);
        fullRoadPosition.push(position);
    }
    // 去除重複的座標點
    fullRoadPosition = fullRoadPosition.filter((position, index, self) =>
        index === self.findIndex(p => p[0] === position[0] && p[1] === position[1])
    );

    // fullRoadPosition.unshift(currentPosition); // 將currentPosition插入到fullRoadPosition的最前面
    // fullRoadPosition.push(targetPosition); // 將targetPosition插入到fullRoadPosition的後面

    // console.log("4. fullRoadPosition:", fullRoadPosition);
    
    // fullRoadLngLat.forEach(point => {
    //     AddMarker(window.map, point, 'red');
    // });
    // AddMarker(window.map, currentLngLat);
    // AddMarker(window.map, targetLngLat);
    // 5. for loop 計算deltaPosition array
    let deltaPosition = [];
    for (let i = 0; i < fullRoadPosition.length - 1; i++) {
        // 计算每一帧的位置增量
        const deltaY = (fullRoadPosition[i + 1][0] - fullRoadPosition[i][0]) / animation_number; // 緯度方向上的實際移動距離（米）
        const deltaX = (fullRoadPosition[i + 1][1] - fullRoadPosition[i][1]) / animation_number; // 經度方向上的實際移動距離（米）
        deltaPosition.push([deltaY, deltaX]);
    }
    
    console.log("5. deltaPosition:", deltaPosition); // 每一帧的位置增量 根據 fullRoadPosition的距離和animation_number計算

    // 6. animation_number＝for loop fullRoadPosition.length 次數的array
    animation_number = Array(fullRoadPosition.length - 1).fill(animation_number);
    console.log("6. animation_number:", animation_number); // 動畫幀數
    
    // 7. 返回deltaPosition, animation_number //可選fullRoadLngLat
    return [deltaPosition, animation_number];
}
