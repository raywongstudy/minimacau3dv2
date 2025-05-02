/**
 * 路線工具類 - 處理巴士GPS路線和百分比位置計算
 * 包含所有處理巴士GPS路線的核心函數
 * 適用於瀏覽器環境
 */

// 計算兩點之間的距離（使用Haversine公式計算球面距離）
function calculateDistance(point1, point2) {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  // 轉換為弧度
  const toRad = (value) => value * Math.PI / 180;
  const R = 6371000; // 地球半徑，單位米
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // 返回距離，單位米
}

// 計算路線總長度
function calculateRouteLength(coordinates) {
  let totalDistance = 0;
  
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistance += calculateDistance(coordinates[i], coordinates[i+1]);
  }
  
  return totalDistance;
}

//計算路線中每個線段的長度和累計距離
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

// 在兩點之間插值計算中間點
function interpolatePoint(point1, point2, ratio) {
  return [
    point1[0] + (point2[0] - point1[0]) * ratio, // 公式: 線段1起點經度 + (線段2終點經度 - 線段1起點經度) * 比例 = 中間點經度
    point1[1] + (point2[1] - point1[1]) * ratio  // 公式: 線段1起點緯度 + (線段2終點緯度 - 線段1起點緯度) * 比例 = 中間點緯度
  ];
}

/**
 * 根據百分比獲取路線上的GPS點
 * @param {Array} coordinates - 路線坐標點數組 [[lon1, lat1], [lon2, lat2], ...]
 * @param {Number} percentage - 百分比值 (0-100)
 * @return {Array} - 對應百分比位置的GPS坐標 [lon, lat]
 */
function getPointAtPercentage(coordinates, percentage) {
  if (percentage < 0 || percentage > 100) {
    throw new Error('百分比必須在0到100之間');
  }
  
  // 特殊情況處理
  if (percentage === 0) return coordinates[0];
  if (percentage === 100) return coordinates[coordinates.length - 1];
  
  // 計算每個線段的長度和累計距離
  const { segments, totalDistance } = calculateSegmentDistances(coordinates);
  
  // 計算目標距離
  const targetDistance = totalDistance * (percentage / 100);
  
  // 找到目標距離所在的線段
  const segment = segments.find(seg => seg.accumulatedDistance >= targetDistance); //用accumulatedDistance >= targetDistance 找到目標距離所在的線段
  
  if (!segment) { 
    return coordinates[coordinates.length - 1]; //如果沒有找到目標距離所在的線段，則返回最後一個點
  }
  
  // 計算在當前線段中的比例
  const prevAccumulatedDistance = segment.startIndex === 0 ? 0 : 
    segments[segment.startIndex - 1].accumulatedDistance;
  
  const segmentProgress = (targetDistance - prevAccumulatedDistance) / segment.distance; //計算在當前線段中的比例 segmentProgress 是從0到1之間的值
  
  // 在線段上插值計算具體坐標
  return interpolatePoint(segment.startPoint, segment.endPoint, segmentProgress); //用interpolatePoint插值計算具體坐標
}

/**
 * 獲取路線上一段百分比範圍內的GPS點
 * @param {Array} coordinates - 路線坐標點數組
 * @param {Number} startPercentage - 起始百分比
 * @param {Number} endPercentage - 結束百分比
 * @param {Number} [density=1] - 採樣密度因子，值越大採樣點越多
 * @return {Array} - 對應百分比範圍內的GPS坐標點數組
 */
// 按照路線的GPS點，計算出在起始百分比和結束百分比之間的GPS點, 使用在移動地圖上
function getPointsInPercentageRange(coordinates, startPercentage, endPercentage, density = 1) {
  if (startPercentage < 0 || endPercentage > 100 || startPercentage >= endPercentage) {
    throw new Error('百分比範圍無效');
  }
  
  // 計算路線數據
  const { segments, totalDistance } = calculateSegmentDistances(coordinates);
  
  // 計算起始和結束的目標距離
  const startDistance = totalDistance * (startPercentage / 100);// 公式: 總距離 * (起始百分比 / 100) = 起始距離
  const endDistance = totalDistance * (endPercentage / 100);// 公式: 總距離 * (結束百分比 / 100) = 結束距離
  
  const result = [];
  
  // 找到起始百分比所在的線段
  let currentDistance = 0;
  let segmentIndex = 0;
  
  // 找到起始線段
  while (segmentIndex < segments.length && segments[segmentIndex].accumulatedDistance < startDistance) {
    currentDistance = segments[segmentIndex].accumulatedDistance;
    segmentIndex++;
  }
  
  if (segmentIndex >= segments.length) {
    return [coordinates[coordinates.length - 1]];
  }
  
  // 計算起始線段中的起始點
  const firstSegment = segments[segmentIndex];
  const firstSegmentStart = firstSegment.accumulatedDistance - firstSegment.distance;
  const firstPointRatio = (startDistance - firstSegmentStart) / firstSegment.distance;
  
  const startPoint = interpolatePoint(
    coordinates[firstSegment.startIndex],
    coordinates[firstSegment.endIndex],
    firstPointRatio
  );
  
  result.push(startPoint);
  
  // 添加起始線段之後的點，直到達到結束百分比
  while (segmentIndex < segments.length && segments[segmentIndex].accumulatedDistance <= endDistance) {
    result.push(coordinates[segments[segmentIndex].endIndex]);
    segmentIndex++;
  }
  
  // 如果結束百分比在最後一個線段中間，添加結束點
  if (segmentIndex < segments.length) {
    const lastSegment = segments[segmentIndex];
    const lastSegmentStart = lastSegment.accumulatedDistance - lastSegment.distance;
    const lastPointRatio = (endDistance - lastSegmentStart) / lastSegment.distance;
    
    const endPoint = interpolatePoint(
      coordinates[lastSegment.startIndex],
      coordinates[lastSegment.endIndex],
      lastPointRatio
    );
    
    result.push(endPoint);
  }
  
  // 處理轉彎等需要更多點的情況
  // 如果是轉彎區域（通過計算連續點的角度變化），可以增加採樣點
  const enhancedResult = enhancePointsAtTurns(result, density);
  
  return enhancedResult;
}

/**
 * 在轉彎處增加更多的GPS點
 * @param {Array} points - 原始GPS點數組
 * @param {Number} density - 密度因子
 * @return {Array} - 增強後的GPS點數組
 */
function enhancePointsAtTurns(points, density) {
  if (points.length < 3) return points;
  
  const result = [points[0]];
  
  for (let i = 1; i < points.length - 1; i++) {
    const prevPoint = points[i-1];
    const currentPoint = points[i];
    const nextPoint = points[i+1];
    
    // 計算前後兩段的方向向量
    const vector1 = [currentPoint[0] - prevPoint[0], currentPoint[1] - prevPoint[1]];
    const vector2 = [nextPoint[0] - currentPoint[0], nextPoint[1] - currentPoint[1]];
    
    // 計算向量的夾角（弧度）
    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
    const mag1 = Math.sqrt(vector1[0] * vector1[0] + vector1[1] * vector1[1]);
    const mag2 = Math.sqrt(vector2[0] * vector2[0] + vector2[1] * vector2[1]);
    
    let angle = Math.acos(dotProduct / (mag1 * mag2));
    if (isNaN(angle)) angle = 0;
    
    // 如果角度較大，表示轉彎較急，增加更多的點
    const turnSharpness = angle / Math.PI; // 0到1之間的值，1表示180度轉彎
    const extraPoints = Math.max(0, Math.floor(turnSharpness * 10 * density));
    
    if (extraPoints > 0) {
      for (let j = 1; j <= extraPoints; j++) {
        const ratio = j / (extraPoints + 1);
        const extraPoint = interpolatePoint(prevPoint, currentPoint, ratio);
        result.push(extraPoint);
      }
    }
    
    result.push(currentPoint);
  }
  
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * 計算指定百分比增量的路線上所有點
 * @param {Array} coordinates - 路線坐標點數組
 * @param {Number} increment - 百分比增量，如2表示每2%取一個點
 * @return {Array} - 按指定百分比間隔的GPS點數組
 */
function getRoutePointsByPercentageIncrement(coordinates, increment) {
  if (increment <= 0 || increment > 100) {
    throw new Error('百分比增量必須大於0且不大於100');
  }
  
  const result = [];
  
  for (let percentage = 0; percentage < 100; percentage += increment) {
    const startPercentage = percentage;
    const endPercentage = Math.min(100, percentage + increment);
    
    // 獲取當前百分比區間的點
    const segmentPoints = getPointsInPercentageRange(coordinates, startPercentage, endPercentage);
    
    // 避免重複添加點
    if (result.length > 0 && segmentPoints.length > 0) {
      result.push(...segmentPoints.slice(1));
    } else {
      result.push(...segmentPoints);
    }
  }
  
  return result;
}

/**
 * 從GeoJSON數據中處理路線
 * @param {Object} geojsonData - GeoJSON格式的數據
 * @param {String|Number} routeId - 路線ID
 * @param {Number} increment - 百分比增量
 * @return {Array} - 處理後的GPS點數組
 */
function processGeoJsonRoute(geojsonData, routeId, increment) {
  // 從GeoJSON中找到指定路線
  const route = geojsonData.features.find(feature => feature.properties.id === parseInt(routeId));
  
  if (!route) {
    throw new Error(`未找到ID為${routeId}的路線`);
  }
  
  const coordinates = route.geometry.coordinates;
  
  // 計算指定百分比增量的所有點
  return getRoutePointsByPercentageIncrement(coordinates, increment);
}

// 為瀏覽器環境導出函數
// 如果在瀏覽器中，將函數掛載到全局window對象
if (typeof window !== 'undefined') {
  window.RouteUtils = {
    calculateDistance,
    calculateRouteLength,
    getPointAtPercentage,
    getPointsInPercentageRange,
    getRoutePointsByPercentageIncrement,
    processGeoJsonRoute
  };
} 