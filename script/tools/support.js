
// 99. Marker 功能 ============================================================
async function AddMarker(map, MarkerLists = [113.54884000, 22.16185000]){
    let popup = new mapboxgl.Popup().setText(`${MarkerLists[1]}, ${MarkerLists[0]} `).addTo(map);
    new mapboxgl.Marker({ color: 'blue'}).setLngLat([MarkerLists[0], MarkerLists[1]]).addTo(map).setPopup(popup);
}

function generateRandomNumber(minSize, maxSize) {
    // 確保 minSize 和 maxSize 之間的整數範圍正確
    return Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
}

// Marker 功能，提供api link 獲取巴士data 再用filter bus lists 去得出巴士的位置生成marker
async function AddMarkerData(map, bus_api_data){
    
    filteredBusListsData = bus_api_data
    // console.log("Marker Bus Lists Data:",filteredBusListsData)

    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        for (let index = 0; index < route_elements.busInfoList.length; index++) {
            let element = route_elements.busInfoList[index];
            let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude}, ${element.busPlate} `).addTo(map);
            let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        }
    }
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