// 路线坐标点工具函数
// 根据百分比获取点位置


function getPointAtPercentage(coordinates, percentage) {
    if (!coordinates || !coordinates.length) {
        console.error("获取点位置失败：坐标数组为空");
        return [0, 0];
    }
    
    if (percentage <= 0) return parseCoordinate(coordinates[0]);
    if (percentage >= 100) return parseCoordinate(coordinates[coordinates.length - 1]);
    
    try {
        // 确保所有坐标点都是正确格式
        const parsedCoordinates = coordinates.map(coord => parseCoordinate(coord));
        
        // 計算線段距離和累計距離
        const { segments, totalDistance } = calculateSegmentDistances(parsedCoordinates);
        
        // 計算目標距離
        const targetDistance = totalDistance * (percentage / 100);
        
        // 找到目標距離所在的線段
        const segment = segments.find(seg => seg.accumulatedDistance >= targetDistance);
        
        if (!segment) { 
            return parsedCoordinates[parsedCoordinates.length - 1]; // 如果沒有找到目標距離所在的線段，則返回最後一個點
        }
        
        // 計算在當前線段中的比例
        const prevAccumulatedDistance = segment.startIndex === 0 ? 0 : 
            segments[segment.startIndex - 1].accumulatedDistance;
        
        const segmentProgress = (targetDistance - prevAccumulatedDistance) / segment.distance;
        
        // 在線段上插值計算具體坐標
        return [
            segment.startPoint[0] + (segment.endPoint[0] - segment.startPoint[0]) * segmentProgress,
            segment.startPoint[1] + (segment.endPoint[1] - segment.startPoint[1]) * segmentProgress
        ];
    } catch (error) {
        console.error("计算百分比位置时出错:", error);
        return parseCoordinate(coordinates[0]); // 出错时返回起点
    }
}

// 計算線段距離和累計距離
function calculateSegmentDistances(coordinates) {
    // 存儲所有線段信息的數組
    const segments = [];
    // 記錄累計距離
    let accumulatedDistance = 0;
    
    // 遍歷所有相鄰的點對,計算每個線段
    for (let i = 0; i < coordinates.length - 1; i++) {
        // 計算當前線段的距離
        const distance = calculateDistance(coordinates[i], coordinates[i+1]);
        // 累加總距離
        accumulatedDistance += distance;
        
        // 將當前線段信息保存到數組
        segments.push({
            startIndex: i,
            endIndex: i + 1,
            startPoint: coordinates[i],
            endPoint: coordinates[i+1],
            distance,
            accumulatedDistance
        });
    }
    
    // 返回所有線段信息和總距離
    return { segments, totalDistance: accumulatedDistance };
}

// 辅助函数：解析坐标点
function parseCoordinate(coord) {
    if (!coord) {
        console.error("无法解析空坐标");
        return [0, 0];
    }
    
    // 如果已经是数值数组，直接返回
    if (Array.isArray(coord) && 
        typeof coord[0] === 'number' && 
        typeof coord[1] === 'number' && 
        !isNaN(coord[0]) && 
        !isNaN(coord[1])) {
        return coord;
    }
    
    // 处理字符串或混合格式
    try {
        let lng, lat;
        
        if (Array.isArray(coord)) {
            // 可能是 ["113.55-0.1", "22.20-0.05"] 这样的格式
            lng = parseFloat(String(coord[0]).replace(/([0-9.]+)(.*)/, '$1'));
            lat = parseFloat(String(coord[1]).replace(/([0-9.]+)(.*)/, '$1'));
        } else if (typeof coord === 'string') {
            // 可能是 "113.55,22.20" 这样的格式
            const parts = coord.split(',');
            lng = parseFloat(parts[0].trim());
            lat = parseFloat(parts[1].trim());
        } else {
            console.error("未知坐标格式:", coord);
            return [0, 0];
        }
        
        if (isNaN(lng) || isNaN(lat)) {
            console.error("坐标解析为NaN:", coord);
            return [0, 0];
        }
        
        return [lng, lat];
    } catch (e) {
        console.error("解析坐标时出错:", e, coord);
        return [0, 0];
    }
}

// 计算两点之间的距离（使用Haversine公式）
function calculateDistance(point1, point2) {
    try {
        // 确保坐标是正确的格式
        const [lng1, lat1] = parseCoordinate(point1);
        const [lng2, lat2] = parseCoordinate(point2);
        
        const toRad = value => value * Math.PI / 180;
        const R = 6371000; // 地球半径（米）
        
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lng2 - lng1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // 返回距离（米）
    } catch (error) {
        console.error("计算距离时出错:", error);
        return 0;
    }
}

// 计算路线总长度
function calculateRouteLength(coordinates) {
    if (!coordinates || coordinates.length < 2) {
        return 0;
    }
    
    try {
        // 确保所有坐标点都是正确格式
        const parsedCoordinates = coordinates.map(coord => parseCoordinate(coord));
        
        let totalLength = 0;
        
        for (let i = 0; i < parsedCoordinates.length - 1; i++) {
            totalLength += calculateDistance(parsedCoordinates[i], parsedCoordinates[i+1]);
        }
        
        return totalLength;
    } catch (error) {
        console.error("计算路线长度时出错:", error);
        return 0;
    }
}

// 检查坐标是否有效
function isValidCoordinate(coord) {
    if (!coord || !Array.isArray(coord) || coord.length < 2) {
        return false;
    }
    
    // 处理可能的字符串格式坐标
    let lng, lat;
    
    // 如果坐标是字符串形式，尝试解析
    if (typeof coord[0] === 'string' && typeof coord[1] === 'string') {
        try {
            // 有时坐标会以 "数字-数字" 的形式出现，需要特殊处理
            lng = parseFloat(coord[0].replace(/([0-9.]+)(.*)/, '$1'));
            lat = parseFloat(coord[1].replace(/([0-9.]+)(.*)/, '$1'));
            
            console.log("解析字符串坐标:", coord, "=>", [lng, lat]);
        } catch (e) {
            console.error("解析坐标时出错:", e, coord);
            return false;
        }
    } else {
        // 数值形式的坐标
        [lng, lat] = coord;
    }
    
    // 检查经纬度值是否为数字且在有效范围内
    if (isNaN(lng) || isNaN(lat)) {
        return false;
    }
    
    // 经度范围: -180 到 180
    if (lng < -180 || lng > 180) {
        return false;
    }
    
    // 纬度范围: -90 到 90
    if (lat < -90 || lat > 90) {
        return false;
    }
    
    return true;
}

// -------------------------------------------CoordinateUtils.js----------------------------------------------------


/**
 * 根據起始點和終點坐標獲取路線上的所有點位
 * @param {Object} route - 路線對象，通常是window.mapPointSelectedRoute
 * @param {Array} currentLngLat - 起始點經緯度坐標 [經度, 緯度]
 * @param {Array} targetLngLat - 終點經緯度坐標 [經度, 緯度]
 * @returns {Array} 路線上從起始點到終點的所有點位坐標數組
 */
function getRoutePointsBetweenCoordinates(route, currentLngLat, targetLngLat) {
    if (!route || !route.coordinate || !route.coordinate.length) {
        console.error("路線沒有坐標點數據");
        return [];
    }
    
    try {
        // 解析所有坐標點
        const coordinates = route.coordinate;
        const parsedCoordinates = coordinates.map(coord => parseCoordinate(coord));
        
        // 計算路線總長度
        const totalLength = calculateRouteLength(parsedCoordinates);
        
        // 找到起始點和終點在路線上的最近點
        const currentPoint = parseCoordinate(currentLngLat);
        const targetPoint = parseCoordinate(targetLngLat);
        
        // 計算每個點到起始點和終點的距離
        let minDistToCurrent = Infinity;
        let minDistToTarget = Infinity;
        let currentSegmentIndex = -1;
        let targetSegmentIndex = -1;
        let currentProjection = null;
        let targetProjection = null;
        
        // 計算線段的累計距離
        let segmentDistances = [];
        let accumulatedDistance = 0;
        
        for (let i = 0; i < parsedCoordinates.length - 1; i++) {
            const distance = calculateDistance(parsedCoordinates[i], parsedCoordinates[i+1]);
            accumulatedDistance += distance;
            
            segmentDistances.push({
                startIndex: i,
                endIndex: i + 1,
                startPoint: parsedCoordinates[i],
                endPoint: parsedCoordinates[i+1],
                distance,
                accumulatedDistance
            });
            
            // 計算點到線段的最短距離和投影點
            const currentProj = projectPointToSegment(currentPoint, parsedCoordinates[i], parsedCoordinates[i+1]);
            const targetProj = projectPointToSegment(targetPoint, parsedCoordinates[i], parsedCoordinates[i+1]);
            
            if (currentProj.distance < minDistToCurrent) {
                minDistToCurrent = currentProj.distance;
                currentSegmentIndex = i;
                currentProjection = currentProj.point;
            }
            
            if (targetProj.distance < minDistToTarget) {
                minDistToTarget = targetProj.distance;
                targetSegmentIndex = i;
                targetProjection = targetProj.point;
            }
        }
        
        console.log(`找到最接近的線段：起始點線段=${currentSegmentIndex}，終點線段=${targetSegmentIndex}`);
        
        if (currentSegmentIndex === -1 || targetSegmentIndex === -1) {
            console.error("無法找到最接近的路線線段");
            return [];
        }
        
        // 計算投影點在路線上的距離
        let currentDistance = 0;
        let targetDistance = 0;
        
        // 計算當前點之前的所有完整線段距離
        for (let i = 0; i < currentSegmentIndex; i++) {
            currentDistance += segmentDistances[i].distance;
        }
        
        // 加上當前線段內的部分距離
        const currentSegment = segmentDistances[currentSegmentIndex];
        const currentSegmentLength = calculateDistance(currentSegment.startPoint, currentSegment.endPoint);
        const currentRatio = calculateDistance(currentSegment.startPoint, currentProjection) / currentSegmentLength;
        currentDistance += currentRatio * currentSegment.distance;
        
        // 計算目標點之前的所有完整線段距離
        for (let i = 0; i < targetSegmentIndex; i++) {
            targetDistance += segmentDistances[i].distance;
        }
        
        // 加上目標線段內的部分距離
        const targetSegment = segmentDistances[targetSegmentIndex];
        const targetSegmentLength = calculateDistance(targetSegment.startPoint, targetSegment.endPoint);
        const targetRatio = calculateDistance(targetSegment.startPoint, targetProjection) / targetSegmentLength;
        targetDistance += targetRatio * targetSegment.distance;
        
        // 確保路徑方向正確
        const isForward = currentDistance <= targetDistance;
        const startDistance = isForward ? currentDistance : targetDistance;
        const endDistance = isForward ? targetDistance : currentDistance;
        
        // 生成路線點位
        const routePoints = [];
        
        // 添加起始投影點
        routePoints.push(isForward ? currentLngLat : targetLngLat);
        
        // 定義路線點間的最小距離（米）
        const MIN_POINT_DISTANCE = 10; // 每5米一個點
        
        // 當前已經行進的總距離
        let traveledDistance = startDistance;
        
        // 遍歷所有線段，生成中間點位
        for (let i = 0; i < segmentDistances.length; i++) {
            const segment = segmentDistances[i];
            const segmentStart = segment.accumulatedDistance - segment.distance;
            const segmentEnd = segment.accumulatedDistance;
            
            // 如果線段完全在路徑範圍之外，跳過
            if (segmentEnd <= startDistance || segmentStart >= endDistance) {
                continue;
            }
            
            // 計算線段在路徑範圍內的起點和終點
            const rangeStart = Math.max(startDistance, segmentStart);
            const rangeEnd = Math.min(endDistance, segmentEnd);
            
            // 計算該範圍內需要多少個點
            const rangeDistance = rangeEnd - rangeStart;
            const numPoints = Math.max(1, Math.floor(rangeDistance / MIN_POINT_DISTANCE));
            
            // 生成等間距的點
            for (let j = 0; j <= numPoints; j++) {
                // 跳過起點（已經添加）
                if (i === (isForward ? currentSegmentIndex : targetSegmentIndex) && j === 0 && rangeStart === startDistance) {
                    continue;
                }
                // 跳過終點（稍後添加）
                if (i === (isForward ? targetSegmentIndex : currentSegmentIndex) && j === numPoints && rangeEnd === endDistance) {
                    continue;
                }
                
                const pointDistance = rangeStart + (j * rangeDistance / numPoints);
                const segmentRatio = (pointDistance - segmentStart) / segment.distance;
                
                const point = [
                    segment.startPoint[0] + (segment.endPoint[0] - segment.startPoint[0]) * segmentRatio,
                    segment.startPoint[1] + (segment.endPoint[1] - segment.startPoint[1]) * segmentRatio
                ];
                
                routePoints.push(point);
                traveledDistance = pointDistance;
            }
        }
        
        // 添加終點投影點
        routePoints.push(isForward ? targetLngLat : currentLngLat);
        
        // 如果是反向路徑，反轉點位順序
        const finalRoutePoints = isForward ? routePoints : routePoints.reverse();
        
        console.log(`生成了${finalRoutePoints.length}個路線點位`);
        return finalRoutePoints;
    } catch (error) {
        console.error("獲取路線點位時出錯:", error);
        return [];
    }
}

/**
 * 計算點到線段的投影點和距離
 * @param {Array} point - 點坐標 [經度, 緯度]
 * @param {Array} segmentStart - 線段起點坐標 [經度, 緯度]
 * @param {Array} segmentEnd - 線段終點坐標 [經度, 緯度]
 * @returns {Object} {point: [經度, 緯度], distance: 距離}
 */
function projectPointToSegment(point, segmentStart, segmentEnd) {
    const [px, py] = point;
    const [x1, y1] = segmentStart;
    const [x2, y2] = segmentEnd;
    
    // 計算線段的方向向量
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // 計算線段長度的平方
    const segLenSq = dx * dx + dy * dy;
    
    if (segLenSq === 0) {
        // 如果線段長度為0，則返回線段起點
        return {
            point: segmentStart,
            distance: calculateDistance(point, segmentStart)
        };
    }
    
    // 計算投影點的位置參數t
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / segLenSq));
    
    // 計算投影點坐標
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    const projPoint = [projX, projY];
    
    // 計算點到投影點的距離
    const distance = calculateDistance(point, projPoint);
    
    return {
        point: projPoint,
        distance: distance
    };
}

// 顯示百分比範圍內的點
function showPercentageRangePoints(map, startPercentage, endPercentage) {
    // 嘗試獲取mapPointSelectedRoute，優先從window獲取
    const selectedRoute = window.mapPointSelectedRoute;
    
    if (!selectedRoute) {
        console.error("顯示百分比範圍內的點失敗：未選擇路線");
        return;
    }
    
    try {
        // 只清除標記，不清除路線圖層
        if (typeof window.clearAllMarkers === 'function') {
            window.clearAllMarkers(map);
        } else {
            console.warn("clearAllMarkers函数未定义，可能无法清除旧标记");
        }
        
        // 路線坐標
        const coordinates = selectedRoute.coordinate;
        
        if (!coordinates || !coordinates.length) {
            console.error("路線沒有坐標點數據");
            return;
        }
        
        console.log(`顯示 ${startPercentage}% 到 ${endPercentage}% 範圍內的點`);
        
        // 解析所有坐標點
        const parsedCoordinates = coordinates.map(coord => parseCoordinate(coord));
        
        // 計算路線數據
        const totalLength = calculateRouteLength(parsedCoordinates);
        const startDistance = totalLength * (startPercentage / 100);
        const endDistance = totalLength * (endPercentage / 100);
        
        // 計算線段的累計距離
        let segmentDistances = [];
        let accumulatedDistance = 0;
        
        for (let i = 0; i < parsedCoordinates.length - 1; i++) {
            const distance = calculateDistance(parsedCoordinates[i], parsedCoordinates[i+1]);
            accumulatedDistance += distance;
            
            segmentDistances.push({
                startIndex: i,
                endIndex: i + 1,
                startPoint: parsedCoordinates[i],
                endPoint: parsedCoordinates[i+1],
                distance,
                accumulatedDistance
            });
        }
        
        // 找到起始線段
        let currentDistance = 0;
        let startSegmentIndex = 0;
        
        while (startSegmentIndex < segmentDistances.length && 
               segmentDistances[startSegmentIndex].accumulatedDistance < startDistance) {
            currentDistance = segmentDistances[startSegmentIndex].accumulatedDistance;
            startSegmentIndex++;
        }
        
        // 計算起始點
        const rangePoints = [];
        
        if (startSegmentIndex < segmentDistances.length) {
            const startSegment = segmentDistances[startSegmentIndex];
            const startSegmentStart = startSegment.accumulatedDistance - startSegment.distance;
            const startRatio = (startDistance - startSegmentStart) / startSegment.distance;
            
            // 線性插值計算起始點
            const startPoint = [
                startSegment.startPoint[0] + (startSegment.endPoint[0] - startSegment.startPoint[0]) * startRatio,
                startSegment.startPoint[1] + (startSegment.endPoint[1] - startSegment.startPoint[1]) * startRatio
            ];
            
            rangePoints.push(startPoint);
            
            // 添加起始線段之後的點，直到達到結束百分比
            let currentSegmentIndex = startSegmentIndex;
            
            while (currentSegmentIndex < segmentDistances.length && 
                   segmentDistances[currentSegmentIndex].accumulatedDistance <= endDistance) {
                rangePoints.push(parsedCoordinates[segmentDistances[currentSegmentIndex].endIndex]);
                currentSegmentIndex++;
            }
            
            // 如果結束百分比在最後一個線段中間，添加結束點
            if (currentSegmentIndex < segmentDistances.length) {
                const endSegment = segmentDistances[currentSegmentIndex];
                const endSegmentStart = endSegment.accumulatedDistance - endSegment.distance;
                const endRatio = (endDistance - endSegmentStart) / endSegment.distance;
                
                // 線性插值計算結束點
                const endPoint = [
                    endSegment.startPoint[0] + (endSegment.endPoint[0] - endSegment.startPoint[0]) * endRatio,
                    endSegment.startPoint[1] + (endSegment.endPoint[1] - endSegment.startPoint[1]) * endRatio
                ];
                
                rangePoints.push(endPoint);
            }
        } else {
            // 如果沒有找到起始線段，可能是因為百分比太大，使用終點
            rangePoints.push(parsedCoordinates[parsedCoordinates.length - 1]);
        }
        
        console.log(`計算出範圍內 ${rangePoints.length} 個點`);
        
        // 添加範圍內的每個點的標記
        const bounds = new mapboxgl.LngLatBounds();
        
        // 確保window.mapPointMarkersArray存在
        if (!Array.isArray(window.mapPointMarkersArray)) {
            window.mapPointMarkersArray = [];
            console.warn("創建了新的window.mapPointMarkersArray數組");
        }
        
        rangePoints.forEach((point, index) => {
            // 創建標記元素
            const markerEl = document.createElement('div');
            markerEl.className = 'custom-marker range-marker';
            markerEl.style.width = '8px';
            markerEl.style.height = '8px';
            markerEl.style.borderRadius = '50%';
            markerEl.style.backgroundColor = '#0088ff';
            markerEl.style.border = '2px solid white';
            
            // 計算當前點大約在路線的哪個百分比位置
            const pointPercentage = startPercentage + (endPercentage - startPercentage) * (index / Math.max(1, rangePoints.length - 1));
            
            // 創建Mapbox標記
            const marker = new mapboxgl.Marker(markerEl)
                .setLngLat(point)
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <strong>範圍點 #${index + 1}</strong><br>
                    大約位置: ${pointPercentage.toFixed(1)}%<br>
                    坐標: [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]
                `))
                .addTo(map);
            
            // 將標記添加到數組中
            window.mapPointMarkersArray.push(marker);
            
            // 擴展地圖邊界以包含所有點
            if (isValidCoordinate(point)) {
                bounds.extend(point);
            }
        });
        
        // 調整地圖視圖以顯示所有點
        map.fitBounds(bounds, {
            padding: 50
        });
        
        console.log(`已顯示 ${rangePoints.length} 個範圍點`);
    } catch (error) {
        console.error("顯示百分比範圍內的點時出錯:", error);
    }
}

// 顯示按百分比增量的點
function showIncrementPoints(map, incrementValue) {
    // 嘗試獲取mapPointSelectedRoute，優先從window獲取
    const selectedRoute = window.mapPointSelectedRoute;
    
    if (!selectedRoute) {
        console.error("顯示增量點失敗：未選擇路線");
        return;
    }
    
    try {
        // 只清除標記，不清除路線圖層
        if (typeof window.clearAllMarkers === 'function') {
            window.clearAllMarkers(map);
        } else {
            console.warn("clearAllMarkers函数未定义，可能无法清除旧标记");
        }
        
        // 路線坐標
        const coordinates = selectedRoute.coordinate;
        
        if (!coordinates || !coordinates.length) {
            console.error("路線沒有坐標點數據");
            return;
        }
        
        console.log(`顯示增量為 ${incrementValue}% 的點`);
        
        // 解析所有坐標點
        const parsedCoordinates = coordinates.map(coord => parseCoordinate(coord));
        
        // 計算路線總長度
        const totalLength = calculateRouteLength(parsedCoordinates);
        
        // 保存生成的點
        const incrementPoints = [];
        const bounds = new mapboxgl.LngLatBounds();
        
        // 計算每個線段的累計距離
        let segmentDistances = [];
        let accumulatedDistance = 0;
        
        for (let i = 0; i < parsedCoordinates.length - 1; i++) {
            const distance = calculateDistance(parsedCoordinates[i], parsedCoordinates[i+1]);
            accumulatedDistance += distance;
            
            segmentDistances.push({
                startIndex: i,
                endIndex: i + 1,
                startPoint: parsedCoordinates[i],
                endPoint: parsedCoordinates[i+1],
                distance,
                accumulatedDistance
            });
        }
        
        // 計算每個增量的距離
        for (let percentage = 0; percentage <= 100; percentage += incrementValue) {
            // 計算目標距離
            const targetDistance = totalLength * (percentage / 100);
            
            // 找到對應的線段
            const segment = segmentDistances.find(seg => seg.accumulatedDistance >= targetDistance);
            
            if (segment) {
                // 計算在當前線段中的比例
                const prevAccumulatedDistance = segment.startIndex === 0 ? 0 : 
                    segmentDistances[segment.startIndex - 1].accumulatedDistance;
                
                const segmentProgress = (targetDistance - prevAccumulatedDistance) / segment.distance;
                
                // 線性插值計算點坐標
                const point = [
                    segment.startPoint[0] + (segment.endPoint[0] - segment.startPoint[0]) * segmentProgress,
                    segment.startPoint[1] + (segment.endPoint[1] - segment.startPoint[1]) * segmentProgress
                ];
                
                incrementPoints.push({
                    percentage,
                    point
                });
                
                // 擴展地圖邊界以包含所有點
                if (isValidCoordinate(point)) {
                    bounds.extend(point);
                }
            } else if (percentage === 100) {
                // 如果是100%，使用終點
                const lastPoint = parsedCoordinates[parsedCoordinates.length - 1];
                incrementPoints.push({
                    percentage: 100,
                    point: lastPoint
                });
                
                if (isValidCoordinate(lastPoint)) {
                    bounds.extend(lastPoint);
                }
            }
        }
        
        // 確保window.mapPointMarkersArray存在
        if (!Array.isArray(window.mapPointMarkersArray)) {
            window.mapPointMarkersArray = [];
            console.warn("創建了新的window.mapPointMarkersArray數組");
        }
        
        // 創建標記
        incrementPoints.forEach(item => {
            const { percentage, point } = item;
            
            // 創建標記元素
            const markerEl = document.createElement('div');
            markerEl.className = 'custom-marker increment-marker';
            markerEl.style.width = '10px';
            markerEl.style.height = '10px';
            markerEl.style.borderRadius = '50%';
            markerEl.style.backgroundColor = '#ff4500';
            markerEl.style.border = '2px solid white';
            
            // 創建Mapbox標記
            const marker = new mapboxgl.Marker(markerEl)
                .setLngLat(point)
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <strong>${percentage}% 位置</strong><br>
                    增量: ${incrementValue}%<br>
                    坐標: [${point[0].toFixed(6)}, ${point[1].toFixed(6)}]
                `))
                .addTo(map);
            
            // 將標記添加到數組中
            window.mapPointMarkersArray.push(marker);
        });
        
        // 調整地圖視圖以顯示所有點
        map.fitBounds(bounds, {
            padding: 50
        });
        
        console.log(`已顯示 ${incrementPoints.length} 個增量點`);
    } catch (error) {
        console.error("顯示增量點時出錯:", error);
    }
}

// 导出函数以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPointAtPercentage,
        calculateSegmentDistances,
        parseCoordinate,
        calculateDistance,
        calculateRouteLength,
        isValidCoordinate,
        showPercentageRangePoints,
        showIncrementPoints,
        getRoutePointsBetweenCoordinates
    };
} else if (typeof window !== 'undefined') {
    // 在浏览器环境中，将函数添加到全局对象
    window.routeUtils = {
        getPointAtPercentage,
        calculateSegmentDistances,
        parseCoordinate,
        calculateDistance,
        calculateRouteLength,
        isValidCoordinate,
        showPercentageRangePoints,
        showIncrementPoints,
        getRoutePointsBetweenCoordinates
    };
} 