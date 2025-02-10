
const THREE = window.THREE;

// 計算由原點經緯度, 到另外一個點的經緯度，之間Position 的差值
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
    return [distanceLat * 1000,distanceLon * 1000];
  }
  

//该函数接收经纬度和旋转角度作为参数，并使用这些数据计算出一个用于描述模型在地图上的位置和旋转角度的转换（transform）对象。
function GenModelTransform(longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
  
    let modelOrigin = [longitude, latitude];
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

function GencustomLayer(map, custom_id, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let modelTransform = GenModelTransform(longitude, latitude, rotateX, rotateY, rotateZ)
    let customLayer ={
      id: custom_id,
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
        let material = [
            new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
        ];
        let cube = new THREE.Mesh( geometry, material );

        cube.scale.x = scaleSize
        cube.scale.y = scaleSize
        cube.scale.z = scaleSize

        this.scene.add( cube );
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
            this.map.triggerRepaint();
        }
    }
    return customLayer
}



function GenAllCustomLayer(map, route_elements, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let busInfoList = route_elements.busInfoList
    let bus_name = route_elements.bus_name + "_" + route_elements.dir

    let modelTransformLists = []
    modelTransform = GenModelTransform(113.5423229419, 22.189168817131, rotateX,rotateY ,rotateZ)

    let customLayer ={
      id: `bus_${bus_name}`,
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
        let material = [
            new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
        ];
        this.cube_list = []

        for (let bus_idx = 0; bus_idx < busInfoList.length; bus_idx++) {
            let cube = new THREE.Mesh( geometry, material );
            cube.scale.x = scaleSize
            cube.scale.y = scaleSize
            cube.scale.z = scaleSize
            let move_position = calculateDistanceInDirection( parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude), longitude, latitude )
            cube.position.set(-move_position[1], move_position[0], 0);
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
                cube_ele.rotation.x += 0.01;
                cube_ele.rotation.y += 0.01;
                // cube_ele.position.x += 0.01;
                // cube_ele.position.y += 0.01;
            });


            this.map.triggerRepaint();
        }
    }
    return customLayer
}


async function AddBusInMap(map, filter_bus_lists=[]) {

    // let station_features_lists = []
    let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
    let customLayer = ''
    //filter the bus data lists

    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
    console.log("filteredBusListsData:",filteredBusListsData)

    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        customLayer = GenAllCustomLayer(map,route_elements, 3, 2, 2, [0xFFFFFF,route_elements.color[0],route_elements.color[0]], 6)
        map.addLayer(customLayer, 'waterway-label');
        map.moveLayer(customLayer.id); // make layer to the top side




        
        
        // 用在marked 位置對比
        // for (let index = 0; index < route_elements.busInfoList.length; index++) {
        //     let element = route_elements.busInfoList[index];
        //     let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude} `).addTo(map);
        //     let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        // }

        // 一台台車render
        // for (let bus_idx = 0; bus_idx < route_elements.busInfoList.length; bus_idx++) {
        //     let bus_element = route_elements.busInfoList[bus_idx];
        //     customLayer = GencustomLayer(map, bus_element.busPlate, 3, 2, 2, [0xFFFFFF,route_elements.color[0],route_elements.color[0]], 6, bus_element.longitude, bus_element.latitude)
        //     map.addLayer(customLayer, 'waterway-label');
        //     map.moveLayer(customLayer.id); // make layer to the top side
        // }
    }

}
