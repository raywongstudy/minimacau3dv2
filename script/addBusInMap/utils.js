// 工具函式檔案

// 將經緯度差轉換為平面距離 (米)
export function calculateDistanceInDirection(lon1, lat1, lon2, lat2) {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const distanceLat = dLat * 111194; // 約略每度緯度的長度(米)
    const avgLat = (lat1 + lat2) / 2;
    const distanceLon = dLon * 111194 * Math.cos(avgLat * Math.PI / 180); // 經度方向距離考量cos(lat)
    return [distanceLat, distanceLon];
}

// 計算各段位置的增量（暫不用）
export function calculateDeltaPositions(pointsRange, animation_number, longitude, latitude) {
    const deltaPositions = [];
    if (pointsRange.length > 0) {
        for (let i = 0; i < pointsRange.length - 1; i++) {
            const start = calculateDistanceInDirection(
                parseFloat(pointsRange[i][0]), parseFloat(pointsRange[i][1]),
                longitude, latitude
            );
            const end = calculateDistanceInDirection(
                parseFloat(pointsRange[i+1][0]), parseFloat(pointsRange[i+1][1]),
                longitude, latitude
            );
            const delta = [
                (end[0] - start[0]) / animation_number,
                (end[1] - start[1]) / animation_number
            ];
            deltaPositions.push(delta);
        }
    }
    return deltaPositions;
}

// 獲取範圍內的點（暫不用）
export function getPointsBetweenRange(pointA, pointB, route_traffic_data_use) {
    pointA = [parseFloat(pointA[0]).toFixed(8), parseFloat(pointA[1]).toFixed(8)];
    pointB = [parseFloat(pointB[0]).toFixed(8), parseFloat(pointB[1]).toFixed(8)];

    const coordinateTuples = route_traffic_data_use.coordinate.map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
    const indexA = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) === pointA[0] && parseFloat(coord[1]).toFixed(8) === pointA[1]);
    const indexB = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) === pointB[0] && parseFloat(coord[1]).toFixed(8) === pointB[1]);

    if (indexA === -1 || indexB === -1 || isNaN(indexA) || isNaN(indexB)) {
        console.error("Error: Points not found in route data. Using direct points.");
        return [pointA, pointB];
    }

    if (indexA === indexB) {
        return [];
    } else {
        return route_traffic_data_use.coordinate.slice(
            Math.min(indexA, indexB),
            Math.max(indexA, indexB) + 1
        );
    }
}

// 過濾出對應路線與方向的巴士資料
export function filterCurrentBusData(response_bus_data, routeNum, dir) {
    return response_bus_data.filter(item => item.bus_name === routeNum && item.dir.toString() === dir);
}
