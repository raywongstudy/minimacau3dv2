// 在文件开头添加一个变量来存储 popup 和当前选中的路线
let popup = null;
let selectedRouteId = null;

// 显示指定ID的地图按钮
window.showMapButton = function(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.display = 'flex';
    }
};

// This function mainly for use the bus_corrdinates.js traffic_data to draw the route in the map
function addRouteToMap(map, traffic_data, filter_traffic_lists=[]){
    // 显示路线按钮
    window.showMapButton('toggle-route-button');

    // 初始化 popup
    if (!popup) {
        popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });
    }

    if(filter_traffic_lists.length != 0){
        filteredTrafficData = traffic_data.filter(item => filter_traffic_lists.includes(item.routeCode));
    }else{
        filteredTrafficData = traffic_data
    }
    var traffic_element_id_name_all = []
    // console.log("filteredTrafficData:",filteredTrafficData)
    for (let index = 0; index < filteredTrafficData.length; index++) {
        const traffic_element = filteredTrafficData[index];
        let traffic_element_id_name = traffic_element.routeCode + traffic_element.direction
        traffic_element_id_name_all.push(traffic_element_id_name)

        map.addSource( traffic_element_id_name, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {
                    'routeCode': traffic_element.routeCode,
                    'direction': traffic_element.direction
                },
                'geometry': {
                    'type': 'LineString',
                    'coordinates': traffic_element.coordinate
                }
            }
        });
        map.addLayer({
            'id': traffic_element_id_name,
            'type': 'line',
            'source': traffic_element_id_name,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': traffic_element.line_color,
                // 'line-color': '#90EE90', // 将所有路线改为相同的绿色
                // 'line-width': traffic_element.line_width,
                'line-width': 8,
                // 'line-opacity': traffic_element.line_opacity
                'line-opacity': .3
            }
        });

        // 添加点击事件--------------------------------
        map.on('click', traffic_element_id_name, (e) => {
            e.preventDefault(); // 防止事件冒泡 意思：防止事件冒泡到其他元素
            // 如果点击的是已选中的路线，则取消选中
            if (selectedRouteId === traffic_element_id_name) {
                // 重置所有路线的透明度
                traffic_element_id_name_all.forEach(id => {
                    map.setPaintProperty(id, 'line-opacity', 0.4);
                });
                selectedRouteId = null;
            } else {
                // 设置新选中的路线
                // 将所有路线透明度设为0.1
                traffic_element_id_name_all.forEach(id => {
                    map.setPaintProperty(id, 'line-opacity', 0);
                });
                // 高亮显示当前选中的路线
                map.setPaintProperty(traffic_element_id_name, 'line-opacity', 1);
                selectedRouteId = traffic_element_id_name;
            }

            // 添加点击地图其他区域重置路线的事件
            map.on('click', (e) => {
                // 检查点击是否发生在路线上
                const features = map.queryRenderedFeatures(e.point);
                const isClickOnRoute = features.some(f => traffic_element_id_name_all.includes(f.layer.id));
                
                if (!isClickOnRoute) {
                    // 重置所有路线的透明度
                    traffic_element_id_name_all.forEach(id => {
                        map.setPaintProperty(id, 'line-opacity', 0.4);
                    });
                    selectedRouteId = null;
                }
            });
        });

        // 鼠标悬停事件--------------------------------
        map.on('mouseenter', traffic_element_id_name, (e) => {
            map.getCanvas().style.cursor = 'pointer';

            const coordinates = e.lngLat;
            const routeCode = traffic_element.routeCode;
            const direction = traffic_element.direction == 0 ? "去程" : "回程"; //如0 是去程 1 是回程
            popup
                .setLngLat(coordinates)
                .setHTML(`<h3>巴士號: ${routeCode.replace(/^0+/, '')}</h3><p>方向: ${direction}</p>`)
                .addTo(map);
        });

        // 鼠标离开事件--------------------------------
        map.on('mouseleave', traffic_element_id_name, () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
        });
    }

    return traffic_element_id_name_all
}