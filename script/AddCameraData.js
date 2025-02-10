function AddCameraData(map, real_time_camera_data) {
    //console.log("real_time_camera_data:",real_time_camera_data)
    let camera_feature_data = []
    //real_time_camera_data = [real_time_camera_data[19],real_time_camera_data[20],real_time_camera_data[21],real_time_camera_data[22]]
    for (let index = 0; index < real_time_camera_data.length; index++) {
        camera_element = real_time_camera_data[index];
        // console.log("------------------------------")
        // console.log("index:",index)
        // console.log("camera_element: ",camera_element)
        // console.log("camera_element.Y: ",camera_element.Y)
        // console.log("camera_element.X: ",camera_element.X)
        // console.log("camera_element.video_link: ",camera_element.video_link)
        // console.log("------------------------------")
        camera_feature_data.push({
            'type': 'Feature',
            'properties': {
                'description':
                    `
                    <style>
                    .mapboxgl-popup-content:has(.camerapopup){
                        width:300px;
                    }
                    .close-popup {
                        position: absolute;
                        top: -5px;
                        right: -10px;
                        cursor: pointer;
                        font-size: 15px;
                        background-color: white;
                        border: 1px solid black;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        text-align: center;
                        line-height: 20px;
                    }
                    .error-message {
                        padding: 20px;
                        text-align: center;
                        color: #721c24;
                        background-color: #f8d7da;
                        border: 1px solid #f5c6cb;
                        border-radius: 4px;
                    }
                    </style>
                    <div class="camerapopup">
                        <div class="close-popup">X</div>
                        <div class="camera-content">
                            <iframe 
                                src="${camera_element.video_link}" 
                                width="300px" 
                                height="300px" 
                                style="border:none;" 
                                scrolling="no" 
                                title="Camera Video"
                                onerror="this.parentElement.innerHTML='<div class=\'error-message\'>抱歉，暫時無法載入攝像頭畫面</div>'"
                                onload="this.style.display='block'"
                            ></iframe>
                            <div class="error-message" style="display:none">抱歉，暫時無法載入攝像頭畫面</div>
                        </div>
                    </div>
                    `
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [camera_element.Y, camera_element.X]
            }
        })
    }
    // console.log("camera_feature_data:",camera_feature_data) // 打印出camera_feature_data 所有的Camera 
    map.addSource( 'camera_data_use' , {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': camera_feature_data
        }
    });
    // Add a image layer showing the places.

    map.loadImage('https://minimacau3d.com/images/camera.png', function(error, image) {
        if (error) throw error;
    
        // Step 2: Add the icon to the map
        map.addImage('camera-icon', image);
    
        // Step 3: Update the layer
        map.addLayer({
            'id': 'camera_data_use',
            'type': 'symbol', // Change from 'circle' to 'symbol'
            'source': 'camera_data_use',
            'layout': {
                'icon-image': 'camera-icon', // Use the camera icon
                'icon-size': 0.03 // Adjust the size as needed
            }
        });
    });

    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('click', 'camera_data_use', (e) => {
        map.flyTo({
        center: e.features[0].geometry.coordinates
        });

    });
 
    // if语句的条件检查三个方面：
    // !popup.isOpen(): 检查当前是否没有弹窗打开。如果没有弹窗打开，这个条件为真。
    // popup.getLngLat().lng !== coordinates[0]: 检查当前弹窗的经度坐标是否不等于点击位置的经度坐标。如果不等于，这个条件为真。
    // popup.getLngLat().lat !== coordinates[1]: 检查当前弹窗的纬度坐标是否不等于点击位置的纬度坐标。如果不等于，这个条件为真。
    // 这三个条件用||（逻辑或）连接，只要其中任何一个为真，整个条件就为真。

    map.on('click', 'camera_data_use', (e) => {
        const coordinates = e.features[0].geometry.coordinates;
        const description = e.features[0].properties.description;

        if (!popup.isOpen() || popup.getLngLat().lng !== coordinates[0] || popup.getLngLat().lat !== coordinates[1]) {
            map.flyTo({ center: coordinates });
            popup.setLngLat(coordinates).setHTML(description).addTo(map);
            
            // 使用 try-catch 处理可能的错误
            try {
                const iframe = document.querySelector('.camera-content iframe');
                const errorMessage = document.querySelector('.error-message');
                
                iframe.onerror = function() {
                    iframe.style.display = 'none';
                    errorMessage.style.display = 'block';
                };

                // 添加关闭按钮事件监听器
                const closeButton = document.querySelector('.close-popup');
                if (closeButton) {
                    closeButton.addEventListener('click', function(e) {
                        e.stopPropagation(); // 阻止事件冒泡
                        popup.remove();
                    });
                }
            } catch (error) {
                console.error('Error handling camera popup:', error);
            }
        } else {
            popup.remove();
        }
    });

    map.on('mouseenter', 'camera_data_use', (e) => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'camera_data_use', () => {
        map.getCanvas().style.cursor = '';
    });

    
    
}



