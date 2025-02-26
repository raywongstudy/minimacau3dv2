/**
 * 創建路徑線的 GeoJSON 數據
 * @param {Object} map - Mapbox 地圖實例
 * @param {Array} startPosition - 起始位置的經緯度坐標 [lng, lat]
 * @param {Array} endPosition - 終點位置的經緯度坐標 [lng, lat]
 * @returns {Object} GeoJSON Feature 對象
 */
//設置一條線段由起點和終點坐標組成,輸出 由startPosition 和 endPosition 的兩個點
export function createPathLine(map, startPosition, endPosition) {
    return {
        'type': 'Feature',
        'properties': {},
        'geometry': {
            'type': 'LineString',
            'coordinates': [
                [startPosition[0], startPosition[1]],
                [endPosition[0], endPosition[1]]
            ]
        }
    };
}

/**
 * 繪製巴士路徑和終點標記
 * @param {Object} layer - 地圖圖層對象
 * @param {Array} currentLngLat - 當前位置的經緯度坐標 [lng, lat]
 * @param {Array} targetLngLat - 目標位置的經緯度坐標 [lng, lat]
 * @param {string} busColor - 巴士顏色（十六進制格式）
 * @param {string} busPlate - 巴士車牌號
 */
export function drawBusPathAndEndpoint(layer, currentLngLat, targetLngLat, busColor, busPlate) {
    const pathId = `path-${busPlate}`;
    const endPointId = `endpoint-${busPlate}`;

    try {
        // 安全地移除舊的路徑和終點標記
        removeExistingLayers(layer.map, pathId, endPointId);

        // 添加新的路徑
        addPathLayer(layer.map, pathId, currentLngLat, targetLngLat, busColor);

        // 添加終點標記
        addEndpointLayer(layer.map, endPointId, targetLngLat, busColor);
    } catch (error) {
        console.warn('Error updating path visualization:', error);
    }
}

/**
 * 移除現有的圖層和數據源
 * @private
 */
function removeExistingLayers(map, pathId, endPointId) {
    const layersToRemove = [pathId, endPointId];
    layersToRemove.forEach(id => {
        if (map.getLayer(id)) {
            map.removeLayer(id);
        }
        if (map.getSource(id)) {
            map.removeSource(id);
        }
    });
}

/**
 * 添加路徑圖層
 * @private
 */
function addPathLayer(map, pathId, currentLngLat, targetLngLat, busColor) {
    map.addSource(pathId, {
        'type': 'geojson',
        'data': createPathLine(map, currentLngLat, targetLngLat)
    });

    map.addLayer({
        'id': pathId,
        'type': 'line',
        'source': pathId,
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': busColor,
            'line-width': 2,
            'line-dasharray': [2, 2],
            'line-opacity': 0.6
        }
    });
}

/**
 * 添加終點標記圖層
 * @private
 */
function addEndpointLayer(map, endPointId, targetLngLat, busColor) {
    map.addSource(endPointId, {
        'type': 'geojson',
        'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'Point',
                'coordinates': targetLngLat
            }
        }
    });

    map.addLayer({
        'id': endPointId,
        'type': 'circle',
        'source': endPointId,
        'paint': {
            'circle-radius': 4,
            'circle-color': busColor,
            'circle-opacity': 0.8
        }
    });
} 