// 主程式入口，負責初始化及更新所有巴士圖層

import { GenAllCustomLayer } from './mapLayers.js';

export async function AddBusInMap(map, filter_bus_lists = [], bus_api_link) {
    // 從 API 抓取巴士資料
    const bus_api_data = await fetch(bus_api_link).then(response => response.json());
    const customLayers = [];

    // 若 filter_bus_lists 不空，則只處理指定路線的巴士
    const filteredBusListsData = filter_bus_lists.length > 0
        ? bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name))
        : bus_api_data;
    console.log("1. filteredBusListsData:", filteredBusListsData);

    // 為每條路線產生對應的自訂圖層
    for (const route_elements of filteredBusListsData) {
        const customLayer = GenAllCustomLayer(map, route_elements, {
            sizeX: 6, sizeY: 4, sizeZ: 4,
            color: [0xFFFFFF, route_elements.color[0], route_elements.color[0]],
            scaleSize: 5 // 車子大小
        });
        // 將自訂圖層加入地圖
        map.addLayer(customLayer, 'waterway-label');
        // 將圖層移至最上層，以免被其他標籤蓋住
        map.moveLayer(customLayer.id);
        customLayers.push(customLayer);
    }
    console.log("1. customLayers all:", customLayers);

    // 第一次更新巴士位置
    const response_bus_data = await fetch(bus_api_link).then(response => response.json());
    customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));

    // 每隔5秒更新一次巴士位置
    setInterval(async () => {
        const response_bus_data = await fetch(bus_api_link).then(response => response.json());
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
    }, 5000);
}
