
// This function mainly for use the bus_corrdinates.js traffic_data to draw the route in the map
function addRouteToMap(map, traffic_data, filter_traffic_lists=[]){

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
                'properties': {},
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
                // 'line-width': traffic_element.line_width,
                'line-width': 8,
                // 'line-opacity': traffic_element.line_opacity
                'line-opacity': .4
            }
        });
    }

    return traffic_element_id_name_all

}