// 99. Marker 功能 ============================================================
export async function AddMarker(map, MarkerLists = [113.54884000, 22.16185000], color = 'blue'){
    // 确保经纬度有效
    if (isNaN(MarkerLists[0]) || isNaN(MarkerLists[1])) {
        console.warn("尝试添加无效坐标标记：", MarkerLists);
        return null;
    }
    let popup = new mapboxgl.Popup().setText(`${MarkerLists[1]}, ${MarkerLists[0]} `).addTo(map);
    new mapboxgl.Marker({ color: color}).setLngLat([MarkerLists[0], MarkerLists[1]]).addTo(map).setPopup(popup);
}

function generateRandomNumber(minSize, maxSize) {
    // 確保 minSize 和 maxSize 之間的整數範圍正確
    return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}

// Marker 功能，提供api link 獲取巴士data 再用filter bus lists 去得出巴士的位置生成marker
export async function AddMarkerData(map, bus_api_data){
    // 直接使用傳入的 bus_api_data 參數，而不是未定義的 filteredBusListsData
    for (let bus_index = 0; bus_index < bus_api_data.length; bus_index++) {
        let route_elements = bus_api_data[bus_index];
        for (let index = 0; index < route_elements.busInfoList.length; index++) {
            let element = route_elements.busInfoList[index];
            let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude}, ${element.busPlate} `).addTo(map);
            let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        }
    }
}

// 1. Add Bus In Map Button 功能 ============================================================

// 創建更新巴士位置按鈕
export function createUpdateBusButton(customLayers, bus_api_link) {
    const updateButton = document.createElement('button');
    updateButton.className = 'mapboxgl-ctrl-icon update-bus-button';
    updateButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 40px;
        padding: 10px 20px;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 4px;
        cursor: pointer;
        z-index: 1;
    `;
    updateButton.innerHTML = '更新巴士位置';

    // 添加點擊事件
    updateButton.addEventListener('click', async () => {
        try {
            const response_bus_data = await fetch(bus_api_link).then(response => response.json());
            customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
            console.log('已手動更新巴士位置');
        } catch (error) {
            console.error('更新巴士位置時發生錯誤:', error);
        }
    });

    return updateButton;
}

            // ------- 測試代碼部分，添加一個測試用的立方體到場景中 -------
            // const testGeometry = new THREE.BoxGeometry(100, 100, 100);  // 定義一個 100x100x100 的立方體幾何體
            // const testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });  // 使用綠色材質
            // const testCube = new THREE.Mesh(testGeometry, testMaterial);  // 將幾何體與材質結合成一個網格
            // this.scene.add(testCube);  // 將測試用的立方體添加到場景中
            // testCube.position.y = generateRandomNumber(100, 2500);
            // const axesHelper = new THREE.AxesHelper(200);
            // this.scene.add(axesHelper);
        
            // ------- 測試代碼結束 --------