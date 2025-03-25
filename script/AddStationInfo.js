async function AddStationInfo(map, bus_info_url, station_data,filter_bus_lists = []) {
    // 显示站点按钮
    window.showMapButton('toggle-station-button');
    const response_station_data = await fetch(bus_info_url).then(response => response.json()); // API獲取巴士數據
    console.log("response_station_data:",response_station_data)

    if(filter_bus_lists.length != 0){
        let filterValues = filter_bus_lists; // This is the array of values you want to filter by //e.g ["1", "1A"]

        filteredStationData = station_data.filter(item => 
            filterValues.some(value => item.bus_lists.includes(value))
        ).map(item => ({
            ...item,
            bus_lists: item.bus_lists.filter(bus => filterValues.includes(bus))
        }));
        // console.log("filteredStationData:",filteredStationData);
    }else{
        filteredStationData = station_data
    }
    // 生成巴士站點的特徵列表
    let station_features_lists = []
    // 遍历过滤后的站点数据
    // console.log("filteredStationData:",filteredStationData)
    
    for (let index = 0; index < filteredStationData.length; index++) {
        const location_element = filteredStationData[index]; // 巴士站點資訊即 filter 完的 station data
        // 初始化巴士列表字符串
        let bus_lists_element_result = ""
        // 遍历站点中的巴士列表並加入巴士資訊
        for (let index_bus_lists = 0; index_bus_lists < location_element.bus_lists.length; index_bus_lists++) {
            let bus_lists_element = location_element.bus_lists[index_bus_lists]; // for loop 所有巴士號
            // 巴士報站功能 根據站點代碼過濾巴士資訊 API
            bus_station_code = location_element.stationCode
            
            let routeInfo = route_info_data.filter(e => e.bus_name == bus_lists_element)[0];
            let lineColor = routeInfo.line_color;

            // 获取巴士站点信息
            const busStationInfo = getBusStationInfo(response_station_data, bus_station_code, bus_lists_element);
            // console.log(`站点 ${bus_station_code} 的 ${bus_lists_element} 路线信息:`, busStationInfo);
            
            // 添加巴士实时信息到显示结果
            let busStatusHtml = '';
            if (busStationInfo.status === "success" && busStationInfo.buses && busStationInfo.buses.length > 0) {
                busStatusHtml = `<div class="real-time-info"><b>實時巴士信息-剩餘站數:</b><ul style="padding-left: 20px; margin: 5px; border-left: 3px solid ${lineColor};">`;
                busStationInfo.buses.forEach(bus => {
                    // busStatusHtml += `<li>車牌: ${bus.bus_plate}<br>最近一班距離: ${bus.stations_remaining}站</li>`;
                    busStatusHtml += `<li>車牌: ${bus.bus_plate}<br>距離站點: ${bus.stations_remaining}站</li>`;
                });
                busStatusHtml += `</ul></div>`;
            }
            
            // console.log(bus_lists_element) //show the bus for get witch bus I need to add
            // special handle
            // if(bus_lists_element == '701X'){
            //     bus_lists_element = '701x'
            // }
            // 获取巴士信息

            //bus_lists_element_result += `<div style="font-size:14px;margin:5px;border-left: 4px solid ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].line_color};padding:5px;"><b>${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].bus_name}號路線 :</b> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_start} -> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_end}</div>`
            bus_lists_element_result += `<div style="font-size:14px;margin:5px;border-left: 4px solid ${lineColor};padding:5px;"><b>${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].bus_name}號路線 :</b> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_start} -> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_end}${busStatusHtml}</div>`

        }

        station_image_code = location_element.stationCode.split('/')
        if(station_image_code[1] == undefined){
            station_image_code[1] = 1
        }
        // onMouseEnter="clearPopupTestCloseTimeout()" onMouseLeave="closePopupTestWithTimeout"
        station_features_lists.push({
            'type': 'Feature',
            'properties': {
                'description':
                    `<strong style="font-size:14px" >
                        ${location_element.description}
                        <div style="overflow:hidden; border-radius: 5px;">
                            <img src="https://www.dsat.gov.mo/bres/BUS_STOP_IMG/${station_image_code[0]}_${station_image_code[1]}.JPG" style="width:100%;height:100%;" alt="${station_image_code[0]}_${station_image_code[1]}.JPG">
                        </div>
                    </strong>
                    <div class="mobile_station_scroll">
                    ${bus_lists_element_result}
                    </div>
                    `,
                'stationCode': location_element.stationCode
            },
            'geometry': {
                'type': 'Point',
                'coordinates': location_element.coordinate
            }
        })
    }

    map.addSource( 'bus_station' , {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': station_features_lists
        }
    });
    // Add a layer showing the places.
    map.addLayer({
        'id': `bus_station`,
        'type': 'circle',
        'source': `bus_station`,
        'paint': {
            'circle-color': 'black',
            'circle-radius': 5,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#4264fb',
            'circle-opacity': .4
        }
    });

    // 创建弹窗但不立即添加到地图
    const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true
    });

    map.on('click', 'bus_station', (e) => {
        map.flyTo({
        center: e.features[0].geometry.coordinates
        });
    });
 
    // 當滑鼠進入巴士站點時，顯示巴士站點的資訊
    map.on('mouseenter', `bus_station`, (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.description;
        
        // 如果經度超過180度，則將經度減去360度
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        popup.setLngLat(coordinates).setHTML(description).addTo(map);
    });

    // 當滑鼠離開巴士站點時，隱藏巴士站點的資訊
    map.on('mouseleave', 'bus_station', () => {
        map.getCanvas().style.cursor = '';
        
        // 延迟检查鼠标是否在弹窗上，如果不在则关闭弹窗
        setTimeout(() => {
            const popupElement = document.getElementsByClassName('mapboxgl-popup')[0];
            if (popupElement && !popupElement.matches(':hover')) {
                //console.log('站点鼠标离开事件触发，弹窗关闭');
                popup.remove();
            } else if (popupElement) {
            }
        }, 100);
    });

    // 添加点击地图关闭弹窗的事件监听器
    map.on('click', function(e) {
        // 检查点击是否在弹窗外
        const popupElement = document.querySelector('.mapboxgl-popup');
        if (popupElement) {
            // 获取点击事件的目标元素
            const clickTarget = e.originalEvent.target;
            // 检查点击目标是否在弹窗内
            if (!popupElement.contains(clickTarget) && !clickTarget.closest('.mapboxgl-popup')) {
                // 如果点击在弹窗外，关闭弹窗
                popup.remove();
            }
        }
    });
}

function getBusStationInfo(response_station_data, bus_station_code, bus_lists_element) {
    // 检查站点是否存在
    if (!response_station_data[bus_station_code]) {
        return {
            status: "error",
            message: `未找到站点 ${bus_station_code} 的信息`
        };
    }

    // 获取该站点的所有路线信息
    const station_bus_routes = response_station_data[bus_station_code].bus_routes;
    
    // 如果没有指定巴士路线，返回站点的所有路线信息
    if (!bus_lists_element) {
        return {
            status: "success",
            station_code: bus_station_code,
            all_routes: station_bus_routes
        };
    }

    // 检查该站点是否有指定的巴士路线
    if (!station_bus_routes[bus_lists_element]) {
        return {
            status: "error",
            message: `站点 ${bus_station_code} 没有 ${bus_lists_element} 路线的信息`
        };
    }

    // 获取该巴士路线的信息
    const bus_info = station_bus_routes[bus_lists_element];
    const buses = [];

    // 处理巴士信息
    if (bus_info.buses && bus_info.buses.length > 0) {
        bus_info.buses.forEach(busObj => {
            Object.keys(busObj).forEach(key => {
                busObj[key].forEach(bus => {
                    buses.push({
                        bus_plate: bus.busPlate,
                        current_station_index: bus.current_station_index,
                        stations_remaining: bus.stations_remaining
                    });
                });
            });
        });
    }

    // 返回结构化数据
    return {
        status: "success",
        station_code: bus_station_code,
        route: bus_lists_element,
        buses: buses.sort((a, b) => a.stations_remaining - b.stations_remaining),
        station_indices: bus_info.station_indices
    };
}
