
const THREE = window.THREE;
// import "./AddBusFunctions.js"; // 計算中有用functions

// 計算由原點經緯度, 到另外一個點的經緯度，之間Position 的差值 //有- > < 原因是Y，Z軸相反three和MapboxGL
function calculateDistanceInDirection(lon1=113.5423229419, lat1=22.189168817131, lon2, lat2) {

    var dLat = Math.abs(lat2 - lat1); // 緯度差
    var dLon = Math.abs(lon2 - lon1); // 經度差
  
    if((lat2 - lat1) < 0){
      var distanceLat = dLat * 111; // 緯度方向上的實際移動距離（公里）
    }else if((lat2 - lat1) > 0){
      var distanceLat = -1 * dLat * 111; // 緯度方向上的實際移動距離（公里）
    }
  
    var avgLat = (lat1 + lat2) / 2; // 平均緯度
    
    //每一度經度在赤道附近的距離為 40030 / 360 = 111.194公里。 這是一個非常精確的值，但在許多場合為了簡化計算，我們使用了稍大一點的值 111.320公里作為近似值。
     //toRadian(degree) = degree * Math.PI / 180; 
    var distanceLon = dLon * 111.194 * Math.cos(avgLat* Math.PI / 180); // 經度方向上的實際移動距離（公里）
    
    if((lon2 - lon1) < 0){
      distanceLon = -distanceLon
    }

    console.log("calculateDistanceInDirection:")
    console.log([distanceLat, distanceLon])
    
    return [distanceLat * 1000,distanceLon * 1000];// 返回以米为单位的结果

}
  

//该函数接收经纬度和旋转角度作为参数，并使用这些数据计算出一个用于描述模型在地图上的位置和旋转角度的转换（transform）对象。
function GenModelTransform(longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
  
    let modelOrigin = [longitude, latitude]; // 定義地圖中心點
    let modelAltitude = 0;
    let modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
    );
    let modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: rotateX,
        rotateY: rotateY,
        rotateZ: rotateZ,
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };
    return modelTransform
}

// 篩選需要的routeCode
function filterByRouteCode(traffic_data, code, dir) {
    return traffic_data.filter(item => item.routeCode === code && item.direction == dir)[0];
}
// 計算出這兩個point之間的距離在route traffic data use
function getPointsBetweenRange(pointA, pointB , route_traffic_data_use) {
    pointA = [parseFloat(pointA[0]).toFixed(8), parseFloat(pointA[1]).toFixed(8)];
    pointB = [parseFloat(pointB[0]).toFixed(8), parseFloat(pointB[1]).toFixed(8)];
    // console.log("pointA:",pointA)
    // console.log("pointB:",pointB)
    // console.log("route_traffic_data_use:",route_traffic_data_use)
    coordinateTuples = route_traffic_data_use.coordinate.map(coord => [parseFloat(coord[0]), parseFloat(coord[1])]);
    indexA = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) == parseFloat(pointA[0]) && parseFloat(coord[1]).toFixed(8) == parseFloat(pointA[1]));
    indexB = coordinateTuples.findIndex(coord => parseFloat(coord[0]).toFixed(8) == parseFloat(pointB[0]) && parseFloat(coord[1]).toFixed(8) == parseFloat(pointB[1]));
    if(indexA == -1 || indexB == -1 || indexA == NaN || indexB == NaN){
        console.log("getPointsBetweenRange data error")
        pointsBetweenAandB = [pointA,pointB]
    }else{
        if(indexA == indexB){
            pointsBetweenAandB = []
        }else{
            // console.log("success!")
            pointsBetweenAandB = route_traffic_data_use.coordinate.slice(indexA, indexB + 1) //出來的結果是由A->Brange
        }
    }
    // console.log("pointsBetweenAandB:",pointsBetweenAandB)
    return pointsBetweenAandB
    
}


// sizeX , Y , Z => 車大小
function GenAllCustomLayer(map, route_elements, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let busInfoList = route_elements.busInfoList
    let bus_name = route_elements.bus_name + "_" + route_elements.dir

    modelTransform = GenModelTransform(113.5423229419, 22.189168817131, rotateX,rotateY ,rotateZ) //生成一個（transform）对象 會影響車大細

    let customLayer ={
        id: `bus_${bus_name}`,
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
            this.camera = new THREE.Camera();
            this.scene = new THREE.Scene();

            let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y

            //----------------test------
            const testGeometry = new THREE.BoxGeometry(100, 100, 100);
            const testMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const testCube = new THREE.Mesh(testGeometry, testMaterial);
            this.scene.add(testCube);
            //---------------test----------

            let material = []
            if(route_elements.dir == 0){
                material = [
                    new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
                ];    
            }else{
                material = [
                    new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]})
                ];
            }
            
            this.cube_list = []

            for (let bus_idx = 0; bus_idx < busInfoList.length; bus_idx++) {
                let cube = new THREE.Mesh( geometry, material );
                cube.scale.x = scaleSize
                cube.scale.y = scaleSize
                cube.scale.z = scaleSize

                // Store initial and target positions for each bus
                cube.userData.source_position = [parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude)]
                cube.userData.initialPosition = calculateDistanceInDirection(parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude), longitude, latitude);
                cube.userData.targetPosition = cube.userData.initialPosition;
                cube.userData.busPlate = busInfoList[bus_idx].busPlate
                cube.userData.busDir = route_elements.dir
                cube.userData.busSpeed = busInfoList[bus_idx].speed
                cube.userData.deltaPosition = [0,0]
                cube.userData.animation_number = 0
                
                // console.log("cube.userData:", cube.userData)
                
                console.log(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0)
                cube.position.set(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0);

                this.cube_list.push(cube)
            }
            this.cube_list.forEach(cube_ele => {
                this.scene.add(cube_ele);
            });
            this.map = map;

            // use the Mapbox GL JS map canvas for three.js
            this.renderer = new THREE.WebGLRenderer({
                canvas: map.getCanvas(),
                context: gl,
                antialias: true
            });

            this.renderer.autoClear = false;
        },
        render: function (gl, matrix) {
            let rotationX = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(1, 0, 0),
                modelTransform.rotateX
            );
            let rotationY = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 1, 0),
                modelTransform.rotateY
            );
            let rotationZ = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 0, 1),
                modelTransform.rotateZ
            );
  
            let m = new THREE.Matrix4().fromArray(matrix);
            let l = new THREE.Matrix4()
                .makeTranslation(
                    modelTransform.translateX,
                    modelTransform.translateY,
                    modelTransform.translateZ
                )
                .scale(
                    new THREE.Vector3(
                        modelTransform.scale,
                        -modelTransform.scale,
                        modelTransform.scale
                    )
                )
                .multiply(rotationX)
                .multiply(rotationY)
                .multiply(rotationZ);

            this.camera.projectionMatrix = m.multiply(l);

            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            // cube animate
            this.cube_list.forEach(cube_ele => {
                render_delta_position = cube_ele.userData.deltaPosition
                for (let render_index = 0; render_index < render_delta_position.length; render_index++) {
                    cube_delta_position_data = render_delta_position[render_index];
                    if( (cube_delta_position_data > 0 && cube_ele.userData.animation_number[render_index] > 0 )  ||  (cube_delta_position_data[1] > 0  && cube_ele.userData.animation_number[render_index] > 0) ){
                        cube_ele.position.y +=  cube_delta_position_data[0];
                        cube_ele.position.x -=  cube_delta_position_data[1];
                        cube_ele.userData.animation_number[render_index] -= 1; //每個動作 - 1 個animation number
                    }else if(cube_ele.userData.animation_number[render_index] <= 0){
                        cube_ele.position.y = cube_ele.userData.targetPosition[0];
                        cube_ele.position.x = - cube_ele.userData.targetPosition[1];
                    }
                }
            });
            
            this.map.triggerRepaint();
        },

        updateBusPositions: async function(response_bus_data ) {
            // filter 出單條的巴士路線
            customLayerIdData = customLayer.id.split("_")
            customLayerDir = customLayerIdData[customLayerIdData.length - 1]
            customLayerNum = customLayerIdData[customLayerIdData.length - 2]
            console.log("\n======== run updateBusPositions "+ customLayerNum +"號車 ＝ 方向：" +customLayerDir+"=======")
            
            if(customLayerNum == "701X"){
                route_traffic_data = filterByRouteCode(traffic_data, "701x".padStart(5, '0'), customLayerDir);//路線每個點data
            }else{
                route_traffic_data = filterByRouteCode(traffic_data, customLayerNum.padStart(5, '0'), customLayerDir);//路線每個點data
            }
            // error 檢測用
            if(route_traffic_data == undefined){
                console.log("route_traffic_data error !!!!")
            }

            response_bus_data = response_bus_data.filter(item => customLayerNum.toString() == item.bus_name);
            response_bus_data = response_bus_data.filter(item => item.dir.toString() == customLayerDir);
            
            // console.log(customLayerNum +"號車API巴士數量:",response_bus_data[0]["busInfoList"].length )

            custom_cube_list = customLayer.cube_list.slice()
            // console.log("現時已存在的bus lists:")
            // this.cube_list.forEach(cube => console.log(cube.userData) );
            for (let response_bus_index = 0; response_bus_index < response_bus_data.length; response_bus_index++) {              
                //此層是最新API的單條路線
                cube_item_dir = response_bus_data[response_bus_index].dir
                newBusInfoList = response_bus_data[response_bus_index].busInfoList;
                custom_cube_check_list = custom_cube_list //已有的巴士
                // console.log("最新的bus Data:",newBusInfoList)
                // get the new bus data and save the userData to the cube for the cube to move
                for (let bus_idx = 0; bus_idx < newBusInfoList.length; bus_idx++) {
                    // 檢查出現的新增巴士是否存在原來的列表中：
                    custom_cube = []
                    custom_cube_list.filter((cube_item) => {
                        if(cube_item.userData.busPlate == newBusInfoList[bus_idx].busPlate && cube_item.userData.busDir == cube_item_dir){
                            custom_cube_check_list = custom_cube_check_list.filter(item => item.userData.busPlate !== cube_item.userData.busPlate);
                            custom_cube.push(cube_item)
                        }
                    } )

                    if(custom_cube.length == 1){
                        // console.log("需要進行移動的巴士:",custom_cube)
                        
                        animation_number = 180 // 取決於API的Speed不能大於API Speed |  animation_number = to the time , about 60 = around 1s , 1800 = around 30s, 900 = around 15s, 1500 = around 25s
                        source_point_location = custom_cube[0].userData.source_position
                        // console.log("===========", newBusInfoList[bus_idx].busPlate, "===========")
                        custom_cube[0].userData.source_position = [parseFloat(newBusInfoList[bus_idx].longitude), parseFloat(newBusInfoList[bus_idx].latitude)]
                        custom_cube[0].userData.initialPosition = [custom_cube[0].position.y, -custom_cube[0].position.x];
                        custom_cube[0].userData.targetPosition = calculateDistanceInDirection(parseFloat(newBusInfoList[bus_idx].longitude), parseFloat(newBusInfoList[bus_idx].latitude), longitude, latitude);
                        destination_point_location = custom_cube[0].userData.source_position
                        custom_cube[0].userData.animation_number = []
                        console.log("s, i, t:",custom_cube[0].userData.source_position, custom_cube[0].userData.initialPosition, custom_cube[0].userData.targetPosition )
                        
                        custom_cube[0].userData.pointsRange = getPointsBetweenRange(source_point_location, destination_point_location , route_traffic_data) 
                        pointsRange_calc = custom_cube[0].userData.pointsRange
                        console.log("pointsRange_calc:",pointsRange_calc)
                        // custom_cube[0].userData.deltaPosition = [ (custom_cube[0].userData.targetPosition[0] - custom_cube[0].userData.initialPosition[0]) / animation_number, (custom_cube[0].userData.targetPosition[1] - custom_cube[0].userData.initialPosition[1]) / animation_number]
                        
                        if(pointsRange_calc.length > 0){
                            pointsRange_calc.forEach(element => { custom_cube[0].userData.animation_number.push(animation_number)  });
                            for (let points_index = 0; points_index < (pointsRange_calc.length - 1); points_index++) {
                                points_element = pointsRange_calc[points_index];
                                console.log("points_element:",points_element)
                                calc_initial_position = calculateDistanceInDirection(parseFloat(points_element[0]), parseFloat(points_element[1]), longitude, latitude);
                                calc_target_position = calculateDistanceInDirection(parseFloat(pointsRange_calc[points_index + 1][0]), parseFloat(pointsRange_calc[points_index+ 1][1]), longitude, latitude)
                                console.log("calc_initial_position:",calc_initial_position)
                                console.log("calc_target_position:",calc_target_position)
                                calc_delta_points_element = [ (calc_target_position[0] - calc_initial_position[0]) / animation_number, (calc_target_position[1] - calc_initial_position[1]) / animation_number]
                                console.log("calc_delta_points_element:",calc_delta_points_element)
                                custom_cube[0].userData.deltaPosition.push(calc_delta_points_element)
                            }
                            console.log("custom_cube[0].userData.deltaPosition:",custom_cube[0].userData.deltaPosition)
                            
                        }
                        // custom_cube[0].userData.busPlate =  newBusInfoList[bus_idx].busPlate
                        custom_cube[0].userData.speed =  newBusInfoList[bus_idx].speed
                        custom_cube[0].userData.calcPointsRangeNum = 0
                        // console.log("custom_cube[0].userData.deltaPosition:", custom_cube[0].userData.deltaPosition)
                        // console.log("======================");
                    }
                    else{
                        // 這是需要根據API最新的data 去新增相應的巴士
                        if( custom_cube_list[0] === undefined || (custom_cube_list[0].userData.busDir == cube_item_dir) ){
                            console.log("需要新增的巴士：",newBusInfoList[bus_idx])
                            let newBusDataAdd = newBusInfoList[bus_idx]; //需新增的巴士
                            let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
                            
                            // 生成巴士顏色
                            if(cube_item_dir == 1){
                                color = [0xFFFFFF,response_bus_data[0].color[0],response_bus_data[0].color[1]]
                            }else{
                                color = [0xFFFFFF,response_bus_data[0].color[0],response_bus_data[0].color[1]]
                            }
                            
                            material = [
                                new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]})
                            ];
                            let newCube = new THREE.Mesh( geometry, material );

                            // 设置新巴士的属性
                            newCube.scale.set(scaleSize, scaleSize , scaleSize );
                            newCube.userData.source_position = [parseFloat(newBusDataAdd.longitude), parseFloat(newBusDataAdd.latitude)];
                            newCube.userData.initialPosition = calculateDistanceInDirection(parseFloat(newBusDataAdd.longitude), parseFloat(newBusDataAdd.latitude), longitude, latitude);
                            newCube.position.set(-newCube.userData.initialPosition[1], newCube.userData.initialPosition[0], 0);
                            newCube.userData.targetPosition = newCube.userData.initialPosition;
                            newCube.userData.deltaPosition = [0,0];
                            newCube.userData.animation_number = 90;
                            newCube.userData.busPlate = newBusDataAdd.busPlate;
                            newCube.userData.busDir = cube_item_dir;
                            newCube.userData.busSpeed = newBusDataAdd.speed;
                        
                            // 将新的巴士添加到cube_list和场景中
                            customLayer.scene.add(newCube)
                            customLayer.cube_list.push(newCube)
                            this.renderer.render(this.scene, this.camera);
                            customLayer.map.triggerRepaint();
                        }

                    }
                }

                // 這是需要根據API最新的data filter 出要刪除的巴士

                if(custom_cube_check_list.length > 0 && custom_cube_list[0].userData.busDir == cube_item_dir){
                    for(let new_bus_idx = 0; new_bus_idx < custom_cube_check_list.length; new_bus_idx++){
                        console.log("需要刪除的巴士：",custom_cube_check_list[new_bus_idx].userData)
                        // console.log(customLayer.scene.children); // 在删除之前
                        customLayer.scene.children = customLayer.scene.children.filter(item => item.userData.busPlate != custom_cube_check_list[new_bus_idx].userData.busPlate)
                        customLayer.cube_list = customLayer.cube_list.filter(item => item.userData.busPlate != custom_cube_check_list[new_bus_idx].userData.busPlate);
                        // console.log(customLayer.scene.children); // 在删除之后
                    }
                }

                console.log(customLayerNum +"號車Scene巴士數量:",customLayer.scene.children.length )
                this.renderer.render(this.scene, this.camera);
                customLayer.map.triggerRepaint();

            }
        }
        // addBusToMap: function(response_bus_data){
        //     // console.log("======== run addBusToMap! =======")
        // },
        // removeBusFromMap: function(response_bus_data){
        //     // console.log("======== run addBusToMap! =======")
        // }
    }
    // console.log("final customLayer:",customLayer)

    return customLayer
}

// Marker 功能，提供api link 獲取巴士data 再用filter bus lists 去得出巴士的位置生成marker
async function AddMarker(map, filter_bus_lists=[], bus_api_link){
    
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );

    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
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

// 把巴士生成到地圖上
async function AddBusInMap(map, filter_bus_lists=[], bus_api_link) {
    
    // station_features_lists = []
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} ); //api get bus data
    let customLayer = ''
    let customLayers = []
    //filter the bus data lists
    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
    // loop the filter bus data line for each line create one custom layer
    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        // console.log("1. route_elements:",route_elements)
        customLayer = GenAllCustomLayer(map,route_elements, 6, 4, 4, [0xFFFFFF,route_elements.color[0],route_elements.color[0]], 6)
        map.addLayer(customLayer, 'waterway-label');
        map.moveLayer(customLayer.id); // make layer to the top side
        customLayers.push(customLayer);
    }
    
    // AddMarker(map, filter_bus_lists, bus_api_link) // add marker

    // 按下按鈕時呼叫此歷史函數
    async function RunHistoryData() {
        


        // use for check data for 1 by 1
        // let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
        // console.log("customLayers:",customLayers)
        // customLayers.forEach(function(layer){
        //     layer.updateBusPositions(response_bus_data, filter_bus_lists);
        // });

        // /*

        // clear all bus
        customLayers.forEach(function(layer){
            layer.scene.children = []
            layer.cube_list = []
        });

        // Update bus positions every 1 seconds use the data lists
        let bus_location_coordinates_lists = ["bus_20231018T090002.json"  ,"bus_20231018T092958.json" ,"bus_20231018T090009.json"  ,"bus_20231018T093006.json" ,"bus_20231018T090017.json"  ,"bus_20231018T093013.json" ,"bus_20231018T090023.json"  ,"bus_20231018T093020.json" ,"bus_20231018T090030.json"  ,"bus_20231018T093027.json" ,"bus_20231018T090038.json"  ,"bus_20231018T093035.json" ,"bus_20231018T090045.json"  ,"bus_20231018T093041.json" ,"bus_20231018T090052.json"  ,"bus_20231018T093048.json" ,"bus_20231018T090059.json"  ,"bus_20231018T093055.json" ,"bus_20231018T090107.json"  ,"bus_20231018T093102.json" ,"bus_20231018T090114.json"  ,"bus_20231018T093110.json" ,"bus_20231018T090121.json"  ,"bus_20231018T093117.json" ,"bus_20231018T090129.json"  ,"bus_20231018T093124.json" ,"bus_20231018T090136.json"  ,"bus_20231018T093131.json" ,"bus_20231018T090143.json"  ,"bus_20231018T093138.json" ,"bus_20231018T090149.json"  ,"bus_20231018T093146.json" ,"bus_20231018T090156.json"  ,"bus_20231018T093153.json" ,"bus_20231018T090204.json"  ,"bus_20231018T093201.json" ,"bus_20231018T090211.json"  ,"bus_20231018T093208.json" ,"bus_20231018T090218.json"  ,"bus_20231018T093214.json" ,"bus_20231018T090225.json"  ,"bus_20231018T093222.json" ,"bus_20231018T090232.json"  ,"bus_20231018T093229.json" ,"bus_20231018T090239.json"  ,"bus_20231018T093236.json" ,"bus_20231018T090247.json"  ,"bus_20231018T093244.json" ,"bus_20231018T090254.json"  ,"bus_20231018T093251.json" ,"bus_20231018T090301.json"  ,"bus_20231018T093258.json" ,"bus_20231018T090309.json"  ,"bus_20231018T093307.json" ,"bus_20231018T090316.json"  ,"bus_20231018T093314.json" ,"bus_20231018T090322.json"  ,"bus_20231018T093321.json" ,"bus_20231018T090329.json"  ,"bus_20231018T093328.json" ,"bus_20231018T090337.json"  ,"bus_20231018T093335.json" ,"bus_20231018T090344.json"  ,"bus_20231018T093343.json" ,"bus_20231018T090352.json"  ,"bus_20231018T093350.json" ,"bus_20231018T090359.json"  ,"bus_20231018T093357.json" ,"bus_20231018T090407.json"  ,"bus_20231018T093404.json" ,"bus_20231018T090414.json"  ,"bus_20231018T093412.json" ,"bus_20231018T090422.json"  ,"bus_20231018T093419.json" ,"bus_20231018T090429.json"  ,"bus_20231018T093426.json" ,"bus_20231018T090435.json"  ,"bus_20231018T093433.json" ,"bus_20231018T090443.json"  ,"bus_20231018T093441.json" ,"bus_20231018T090450.json"  ,"bus_20231018T093447.json" ,"bus_20231018T090457.json"  ,"bus_20231018T093455.json" ,"bus_20231018T090504.json"  ,"bus_20231018T093502.json" ,"bus_20231018T090511.json"  ,"bus_20231018T093510.json" ,"bus_20231018T090518.json"  ,"bus_20231018T093516.json" ,"bus_20231018T090525.json"  ,"bus_20231018T093524.json" ,"bus_20231018T090532.json"  ,"bus_20231018T093531.json" ,"bus_20231018T090539.json"  ,"bus_20231018T093538.json" ,"bus_20231018T090546.json"  ,"bus_20231018T093545.json" ,"bus_20231018T090554.json"  ,"bus_20231018T093552.json" ,"bus_20231018T090602.json"  ,"bus_20231018T093559.json" ,"bus_20231018T090609.json"  ,"bus_20231018T093606.json" ,"bus_20231018T090617.json"  ,"bus_20231018T093613.json" ,"bus_20231018T090624.json"  ,"bus_20231018T093620.json" ,"bus_20231018T090631.json"  ,"bus_20231018T093628.json" ,"bus_20231018T090639.json"  ,"bus_20231018T093634.json" ,"bus_20231018T090646.json"  ,"bus_20231018T093641.json" ,"bus_20231018T090654.json"  ,"bus_20231018T093648.json" ,"bus_20231018T090701.json"  ,"bus_20231018T093656.json" ,"bus_20231018T090709.json"  ,"bus_20231018T093703.json" ,"bus_20231018T090716.json"  ,"bus_20231018T093710.json" ,"bus_20231018T090723.json"  ,"bus_20231018T093717.json" ,"bus_20231018T090731.json"  ,"bus_20231018T093724.json" ,"bus_20231018T090738.json"  ,"bus_20231018T093731.json" ,"bus_20231018T090745.json"  ,"bus_20231018T093738.json" ,"bus_20231018T090753.json"  ,"bus_20231018T093746.json" ,"bus_20231018T090800.json"  ,"bus_20231018T093753.json" ,"bus_20231018T090807.json"  ,"bus_20231018T093801.json" ,"bus_20231018T090813.json"  ,"bus_20231018T093808.json" ,"bus_20231018T090820.json"  ,"bus_20231018T093815.json" ,"bus_20231018T090827.json"  ,"bus_20231018T093822.json" ,"bus_20231018T090835.json"  ,"bus_20231018T093830.json" ,"bus_20231018T090842.json"  ,"bus_20231018T093838.json" ,"bus_20231018T090849.json"  ,"bus_20231018T093845.json" ,"bus_20231018T090856.json"  ,"bus_20231018T093853.json" ,"bus_20231018T090904.json"  ,"bus_20231018T093900.json" ,"bus_20231018T090911.json"  ,"bus_20231018T093907.json" ,"bus_20231018T090918.json"  ,"bus_20231018T093914.json" ,"bus_20231018T090925.json"  ,"bus_20231018T093922.json" ,"bus_20231018T090933.json"  ,"bus_20231018T093929.json" ,"bus_20231018T090940.json"  ,"bus_20231018T093936.json" ,"bus_20231018T090947.json"  ,"bus_20231018T093943.json" ,"bus_20231018T090954.json"  ,"bus_20231018T093950.json" ,"bus_20231018T091001.json"  ,"bus_20231018T093957.json" ,"bus_20231018T091008.json"  ,"bus_20231018T094004.json" ,"bus_20231018T091016.json"  ,"bus_20231018T094011.json" ,"bus_20231018T091023.json"  ,"bus_20231018T094018.json" ,"bus_20231018T091031.json"  ,"bus_20231018T094025.json" ,"bus_20231018T091038.json"  ,"bus_20231018T094032.json" ,"bus_20231018T091045.json"  ,"bus_20231018T094039.json" ,"bus_20231018T091052.json"  ,"bus_20231018T094046.json" ,"bus_20231018T091059.json"  ,"bus_20231018T094054.json" ,"bus_20231018T091106.json"  ,"bus_20231018T094101.json" ,"bus_20231018T091114.json"  ,"bus_20231018T094108.json" ,"bus_20231018T091122.json"  ,"bus_20231018T094115.json" ,"bus_20231018T091128.json"  ,"bus_20231018T094123.json" ,"bus_20231018T091136.json"  ,"bus_20231018T094131.json" ,"bus_20231018T091143.json"  ,"bus_20231018T094139.json" ,"bus_20231018T091150.json"  ,"bus_20231018T094146.json" ,"bus_20231018T091157.json"  ,"bus_20231018T094153.json" ,"bus_20231018T091204.json"  ,"bus_20231018T094201.json" ,"bus_20231018T091211.json"  ,"bus_20231018T094209.json" ,"bus_20231018T091219.json"  ,"bus_20231018T094216.json" ,"bus_20231018T091226.json"  ,"bus_20231018T094222.json" ,"bus_20231018T091233.json"  ,"bus_20231018T094230.json" ,"bus_20231018T091241.json"  ,"bus_20231018T094237.json" ,"bus_20231018T091248.json"  ,"bus_20231018T094244.json" ,"bus_20231018T091255.json"  ,"bus_20231018T094251.json" ,"bus_20231018T091303.json"  ,"bus_20231018T094259.json" ,"bus_20231018T091310.json"  ,"bus_20231018T094306.json" ,"bus_20231018T091317.json"  ,"bus_20231018T094313.json" ,"bus_20231018T091324.json"  ,"bus_20231018T094320.json" ,"bus_20231018T091332.json"  ,"bus_20231018T094328.json" ,"bus_20231018T091339.json"  ,"bus_20231018T094335.json" ,"bus_20231018T091346.json"  ,"bus_20231018T094342.json" ,"bus_20231018T091353.json"  ,"bus_20231018T094349.json" ,"bus_20231018T091401.json"  ,"bus_20231018T094356.json" ,"bus_20231018T091408.json"  ,"bus_20231018T094403.json" ,"bus_20231018T091415.json"  ,"bus_20231018T094411.json" ,"bus_20231018T091422.json"  ,"bus_20231018T094418.json" ,"bus_20231018T091429.json"  ,"bus_20231018T094425.json" ,"bus_20231018T091436.json"  ,"bus_20231018T094433.json" ,"bus_20231018T091443.json"  ,"bus_20231018T094441.json" ,"bus_20231018T091451.json"  ,"bus_20231018T094448.json" ,"bus_20231018T091458.json"  ,"bus_20231018T094455.json" ,"bus_20231018T091506.json"  ,"bus_20231018T094502.json" ,"bus_20231018T091513.json"  ,"bus_20231018T094509.json" ,"bus_20231018T091520.json"  ,"bus_20231018T094517.json" ,"bus_20231018T091527.json"  ,"bus_20231018T094524.json" ,"bus_20231018T091535.json"  ,"bus_20231018T094531.json" ,"bus_20231018T091542.json"  ,"bus_20231018T094538.json" ,"bus_20231018T091548.json"  ,"bus_20231018T094545.json" ,"bus_20231018T091555.json"  ,"bus_20231018T094552.json" ,"bus_20231018T091602.json"  ,"bus_20231018T094559.json" ,"bus_20231018T091609.json"  ,"bus_20231018T094607.json" ,"bus_20231018T091616.json"  ,"bus_20231018T094614.json" ,"bus_20231018T091623.json"  ,"bus_20231018T094622.json" ,"bus_20231018T091631.json"  ,"bus_20231018T094629.json" ,"bus_20231018T091638.json"  ,"bus_20231018T094636.json" ,"bus_20231018T091646.json"  ,"bus_20231018T094644.json" ,"bus_20231018T091653.json"  ,"bus_20231018T094651.json" ,"bus_20231018T091700.json"  ,"bus_20231018T094658.json" ,"bus_20231018T091707.json"  ,"bus_20231018T094705.json" ,"bus_20231018T091714.json"  ,"bus_20231018T094712.json" ,"bus_20231018T091721.json"  ,"bus_20231018T094719.json" ,"bus_20231018T091729.json"  ,"bus_20231018T094726.json" ,"bus_20231018T091736.json"  ,"bus_20231018T094733.json" ,"bus_20231018T091743.json"  ,"bus_20231018T094741.json" ,"bus_20231018T091750.json"  ,"bus_20231018T094748.json" ,"bus_20231018T091757.json"  ,"bus_20231018T094756.json" ,"bus_20231018T091805.json"  ,"bus_20231018T094803.json" ,"bus_20231018T091812.json"  ,"bus_20231018T094810.json" ,"bus_20231018T091819.json"  ,"bus_20231018T094817.json" ,"bus_20231018T091827.json"  ,"bus_20231018T094825.json" ,"bus_20231018T091834.json"  ,"bus_20231018T094831.json" ,"bus_20231018T091841.json"  ,"bus_20231018T094838.json" ,"bus_20231018T091848.json"  ,"bus_20231018T094845.json" ,"bus_20231018T091855.json"  ,"bus_20231018T094852.json" ,"bus_20231018T091902.json"  ,"bus_20231018T094900.json" ,"bus_20231018T091909.json"  ,"bus_20231018T094907.json" ,"bus_20231018T091916.json"  ,"bus_20231018T094915.json" ,"bus_20231018T091923.json"  ,"bus_20231018T094922.json" ,"bus_20231018T091931.json"  ,"bus_20231018T094929.json" ,"bus_20231018T091938.json"  ,"bus_20231018T094937.json" ,"bus_20231018T091944.json"  ,"bus_20231018T094944.json" ,"bus_20231018T091952.json"  ,"bus_20231018T094951.json" ,"bus_20231018T091959.json"  ,"bus_20231018T094958.json" ,"bus_20231018T092006.json"  ,"bus_20231018T095005.json" ,"bus_20231018T092014.json"  ,"bus_20231018T095013.json" ,"bus_20231018T092021.json"  ,"bus_20231018T095020.json" ,"bus_20231018T092028.json"  ,"bus_20231018T095027.json" ,"bus_20231018T092035.json"  ,"bus_20231018T095034.json" ,"bus_20231018T092042.json"  ,"bus_20231018T095041.json" ,"bus_20231018T092049.json" , "bus_20231018T095049.json" ,"bus_20231018T092056.json"  ,"bus_20231018T095056.json" ,"bus_20231018T092103.json"  ,"bus_20231018T095103.json" ,"bus_20231018T092110.json"  ,"bus_20231018T095111.json" ,"bus_20231018T092117.json"  ,"bus_20231018T095118.json" ,"bus_20231018T092124.json"  ,"bus_20231018T095125.json" ,"bus_20231018T092131.json"  ,"bus_20231018T095133.json" ,"bus_20231018T092139.json"  ,"bus_20231018T095140.json" ,"bus_20231018T092146.json"  ,"bus_20231018T095147.json" ,"bus_20231018T092153.json"  ,"bus_20231018T095155.json" ,"bus_20231018T092201.json"  ,"bus_20231018T095202.json" ,"bus_20231018T092208.json"  ,"bus_20231018T095209.json" ,"bus_20231018T092216.json"  ,"bus_20231018T095216.json" ,"bus_20231018T092223.json"  ,"bus_20231018T095224.json" ,"bus_20231018T092230.json"  ,"bus_20231018T095231.json" ,"bus_20231018T092237.json"  ,"bus_20231018T095239.json" ,"bus_20231018T092244.json"  ,"bus_20231018T095246.json" ,"bus_20231018T092251.json"  ,"bus_20231018T095254.json" ,"bus_20231018T092258.json"  ,"bus_20231018T095301.json" ,"bus_20231018T092307.json"  ,"bus_20231018T095308.json" ,"bus_20231018T092314.json"  ,"bus_20231018T095316.json" ,"bus_20231018T092321.json"  ,"bus_20231018T095323.json" ,"bus_20231018T092328.json"  ,"bus_20231018T095330.json" ,"bus_20231018T092335.json"  ,"bus_20231018T095337.json" ,"bus_20231018T092342.json"  ,"bus_20231018T095345.json" ,"bus_20231018T092349.json"  ,"bus_20231018T095352.json" ,"bus_20231018T092356.json"  ,"bus_20231018T095359.json" ,"bus_20231018T092403.json"  ,"bus_20231018T095407.json" ,"bus_20231018T092410.json"  ,"bus_20231018T095414.json" ,"bus_20231018T092417.json"  ,"bus_20231018T095421.json" ,"bus_20231018T092425.json"  ,"bus_20231018T095428.json" ,"bus_20231018T092432.json"  ,"bus_20231018T095435.json" ,"bus_20231018T092439.json"  ,"bus_20231018T095442.json" ,"bus_20231018T092446.json"  ,"bus_20231018T095449.json" ,"bus_20231018T092454.json"  ,"bus_20231018T095456.json" ,"bus_20231018T092501.json"  ,"bus_20231018T095504.json" ,"bus_20231018T092508.json"  ,"bus_20231018T095511.json" ,"bus_20231018T092515.json"  ,"bus_20231018T095518.json" ,"bus_20231018T092522.json"  ,"bus_20231018T095525.json" ,"bus_20231018T092529.json"  ,"bus_20231018T095532.json" ,"bus_20231018T092536.json"  ,"bus_20231018T095540.json" ,"bus_20231018T092544.json"  ,"bus_20231018T095547.json" ,"bus_20231018T092551.json"  ,"bus_20231018T095554.json" ,"bus_20231018T092558.json"  ,"bus_20231018T095602.json" ,"bus_20231018T092607.json"  ,"bus_20231018T095609.json" ,"bus_20231018T092614.json"  ,"bus_20231018T095616.json" ,"bus_20231018T092622.json"  ,"bus_20231018T095623.json" ,"bus_20231018T092629.json"  ,"bus_20231018T095630.json" ,"bus_20231018T092637.json"  ,"bus_20231018T095637.json" ,"bus_20231018T092644.json"  ,"bus_20231018T095644.json" ,"bus_20231018T092651.json"  ,"bus_20231018T095651.json" ,"bus_20231018T092658.json"  ,"bus_20231018T095658.json" ,"bus_20231018T092705.json"  ,"bus_20231018T095706.json" ,"bus_20231018T092712.json"  ,"bus_20231018T095713.json" ,"bus_20231018T092719.json"  ,"bus_20231018T095720.json" ,"bus_20231018T092727.json"  ,"bus_20231018T095727.json" ,"bus_20231018T092734.json"  ,"bus_20231018T095734.json" ,"bus_20231018T092741.json"  ,"bus_20231018T095741.json" ,"bus_20231018T092748.json"  ,"bus_20231018T095748.json" ,"bus_20231018T092755.json"  ,"bus_20231018T095755.json" ,"bus_20231018T092803.json"  ,"bus_20231018T095802.json" ,"bus_20231018T092810.json"  ,"bus_20231018T095809.json" ,"bus_20231018T092817.json"  ,"bus_20231018T095817.json" ,"bus_20231018T092824.json"  ,"bus_20231018T095825.json" ,"bus_20231018T092831.json"  ,"bus_20231018T095832.json" ,"bus_20231018T092839.json"  ,"bus_20231018T095839.json" ,"bus_20231018T092846.json"  ,"bus_20231018T095847.json" ,"bus_20231018T092852.json"  ,"bus_20231018T095854.json" ,"bus_20231018T092859.json"  ,"bus_20231018T095902.json" ,"bus_20231018T092908.json"  ,"bus_20231018T095909.json" ,"bus_20231018T092915.json"  ,"bus_20231018T095916.json" ,"bus_20231018T092922.json"  ,"bus_20231018T095923.json" ,"bus_20231018T092930.json"  ,"bus_20231018T095932.json" ,"bus_20231018T092937.json"  ,"bus_20231018T095939.json" ,"bus_20231018T092944.json"  ,"bus_20231018T095946.json" ,"bus_20231018T092951.json"  ,"bus_20231018T095953.json"]
        bus_location_coordinates_lists = bus_location_coordinates_lists.sort()
        // let bus_location_coordinates_lists = ["bus_20230828T100016.json", "bus_20230828T100037.json", "bus_20230828T100056.json", "bus_20230828T100115.json", "bus_20230828T100134.json", "bus_20230828T100153.json", "bus_20230828T100214.json", "bus_20230828T100233.json", "bus_20230828T100254.json", "bus_20230828T100314.json", "bus_20230828T100333.json", "bus_20230828T100352.json", "bus_20230828T100413.json", "bus_20230828T100432.json", "bus_20230828T100451.json", "bus_20230828T100512.json", "bus_20230828T100531.json", "bus_20230828T100550.json", "bus_20230828T100611.json", "bus_20230828T100630.json", "bus_20230828T100649.json", "bus_20230828T100709.json", "bus_20230828T100727.json", "bus_20230828T100746.json", "bus_20230828T100806.json", "bus_20230828T100825.json", "bus_20230828T100846.json", "bus_20230828T100906.json", "bus_20230828T100926.json", "bus_20230828T100945.json", "bus_20230828T101005.json", "bus_20230828T101024.json", "bus_20230828T101044.json", "bus_20230828T101105.json", "bus_20230828T101123.json", "bus_20230828T101142.json", "bus_20230828T101202.json", "bus_20230828T101222.json", "bus_20230828T101241.json", "bus_20230828T101300.json", "bus_20230828T101319.json", "bus_20230828T101338.json", "bus_20230828T101357.json", "bus_20230828T101417.json", "bus_20230828T101437.json", "bus_20230828T101456.json", "bus_20230828T101516.json", "bus_20230828T101536.json", "bus_20230828T101555.json", "bus_20230828T101615.json", "bus_20230828T101634.json", "bus_20230828T101654.json", "bus_20230828T101714.json", "bus_20230828T101735.json", "bus_20230828T101754.json", "bus_20230828T101814.json", "bus_20230828T101834.json", "bus_20230828T101854.json", "bus_20230828T101915.json", "bus_20230828T101935.json", "bus_20230828T101954.json", "bus_20230828T102014.json", "bus_20230828T102034.json", "bus_20230828T102053.json", "bus_20230828T102113.json", "bus_20230828T102132.json", "bus_20230828T102152.json", "bus_20230828T102214.json", "bus_20230828T102233.json", "bus_20230828T102253.json", "bus_20230828T102313.json", "bus_20230828T102332.json", "bus_20230828T102352.json", "bus_20230828T102413.json", "bus_20230828T102432.json", "bus_20230828T102452.json", "bus_20230828T102511.json", "bus_20230828T102530.json", "bus_20230828T102550.json", "bus_20230828T102611.json", "bus_20230828T102630.json", "bus_20230828T102650.json", "bus_20230828T102711.json", "bus_20230828T102731.json", "bus_20230828T102750.json", "bus_20230828T102811.json", "bus_20230828T102830.json", "bus_20230828T102850.json", "bus_20230828T102911.json", "bus_20230828T102931.json", "bus_20230828T102951.json", "bus_20230828T103010.json", "bus_20230828T103031.json", "bus_20230828T103051.json", "bus_20230828T103111.json", "bus_20230828T103131.json", "bus_20230828T103150.json", "bus_20230828T103213.json", "bus_20230828T103233.json", "bus_20230828T103254.json", "bus_20230828T103315.json", "bus_20230828T103334.json", "bus_20230828T103354.json", "bus_20230828T103414.json", "bus_20230828T103434.json", "bus_20230828T103453.json", "bus_20230828T103514.json", "bus_20230828T103536.json", "bus_20230828T103555.json", "bus_20230828T103615.json", "bus_20230828T103635.json", "bus_20230828T103654.json", "bus_20230828T103715.json", "bus_20230828T103734.json", "bus_20230828T103754.json", "bus_20230828T103815.json", "bus_20230828T103834.json", "bus_20230828T103854.json", "bus_20230828T103914.json", "bus_20230828T103934.json", "bus_20230828T103956.json", "bus_20230828T104015.json", "bus_20230828T104035.json", "bus_20230828T104055.json", "bus_20230828T104115.json", "bus_20230828T104135.json", "bus_20230828T104154.json", "bus_20230828T104215.json", "bus_20230828T104235.json", "bus_20230828T104254.json", "bus_20230828T104315.json", "bus_20230828T104334.json", "bus_20230828T104353.json", "bus_20230828T104413.json", "bus_20230828T104433.json", "bus_20230828T104452.json", "bus_20230828T104512.json", "bus_20230828T104533.json", "bus_20230828T104552.json", "bus_20230828T104612.json", "bus_20230828T104631.json", "bus_20230828T104651.json", "bus_20230828T104711.json", "bus_20230828T104730.json", "bus_20230828T104749.json", "bus_20230828T104809.json", "bus_20230828T104828.json", "bus_20230828T104847.json", "bus_20230828T104907.json", "bus_20230828T104927.json", "bus_20230828T104946.json", "bus_20230828T105006.json", "bus_20230828T105025.json", "bus_20230828T105045.json", "bus_20230828T105105.json", "bus_20230828T105124.json", "bus_20230828T105143.json", "bus_20230828T105203.json", "bus_20230828T105222.json", "bus_20230828T105242.json", "bus_20230828T105303.json", "bus_20230828T105322.json", "bus_20230828T105341.json", "bus_20230828T105400.json", "bus_20230828T105419.json", "bus_20230828T105438.json", "bus_20230828T105458.json", "bus_20230828T105518.json", "bus_20230828T105537.json", "bus_20230828T105555.json", "bus_20230828T105614.json", "bus_20230828T105634.json", "bus_20230828T105653.json", "bus_20230828T105712.json", "bus_20230828T105731.json", "bus_20230828T105753.json", "bus_20230828T105812.json", "bus_20230828T105831.json", "bus_20230828T105851.json", "bus_20230828T105911.json", "bus_20230828T105930.json", "bus_20230828T105950.json", "bus_20230828T110010.json", "bus_20230828T110029.json", "bus_20230828T110049.json", "bus_20230828T110108.json", "bus_20230828T110128.json", "bus_20230828T110147.json", "bus_20230828T110206.json", "bus_20230828T110225.json", "bus_20230828T110245.json", "bus_20230828T110304.json", "bus_20230828T110323.json", "bus_20230828T110342.json", "bus_20230828T110402.json", "bus_20230828T110421.json", "bus_20230828T110442.json", "bus_20230828T110502.json", "bus_20230828T110522.json", "bus_20230828T110542.json", "bus_20230828T110602.json", "bus_20230828T110621.json", "bus_20230828T110640.json", "bus_20230828T110700.json", "bus_20230828T110720.json", "bus_20230828T110742.json", "bus_20230828T110803.json", "bus_20230828T110823.json", "bus_20230828T110842.json", "bus_20230828T110902.json", "bus_20230828T110922.json", "bus_20230828T110942.json", "bus_20230828T111002.json", "bus_20230828T111021.json", "bus_20230828T111042.json", "bus_20230828T111103.json", "bus_20230828T111122.json", "bus_20230828T111141.json"]

        alert("現時數據設置為歷史測試數據～\n數據來自澳門2023年8月28日早上10點00分-10點10分巴士數據")
        clearInterval(autoGetBusDataId);
        // console.log("bus_location_coordinates_lists.length",bus_location_coordinates_lists.length)
        simulateTimeFlow("2023-08-28T10:00:00", "2023-08-28T10:10:00", (33 ) ); // 改左上時間加速模擬功能
        document.querySelector("#demo-data-button").style.display = "none"

        for (let list_index = 0; list_index < bus_location_coordinates_lists.length; list_index++) {
            let list_element = bus_location_coordinates_lists[list_index];
            setTimeout(async () => {
                // console.log("Delayed for "+list_index+" second.");
                fetch_list_element_url = "https://api.minimacau3d.com/20231018/" + list_element.split("_")[0] + "_location_coordinates_" + list_element.split("_")[1]
                let response_bus_data = await fetch(fetch_list_element_url).then((response) => { return response.json()} );
                customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
                if(list_index+1 == bus_location_coordinates_lists.length){
                    document.querySelector("#demo-data-button").style.display = "flex"
                    // clear all bus
                    customLayers.forEach(function(layer){
                        layer.scene.children = []
                        layer.cube_list = []
                    });
                    alert("歷史數據展示完成！\n現時數據設置為實時數據～")
                    //歷史數據展示完成！ 先行一次
                    let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
                    customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));

                    autoGetBusDataId = setInterval(async () => {
                        let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
                        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
                    }, 5000);
                }
                }, list_index * 1000);
        }


        // */
    }
    // Update bus positions every 10 seconds在 setInterval | 函數中儲存 ID

    autoGetBusDataId = setInterval(async () => {
        let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
        //因為要按時間變化，不能用現存的customlayers去做，要用新api data去做？？？？要檢查一下，新路線
        console.log("customLayers 總數：",customLayers.length)
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
    }, 30000);

    //加入歷史函數功能到button
    document.querySelector("#demo-data-button").addEventListener("click", RunHistoryData); 


}
