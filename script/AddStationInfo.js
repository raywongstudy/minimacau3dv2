function AddStationInfo(map, station_data,filter_bus_lists = []) {

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

    let station_features_lists = []
    for (let index = 0; index < filteredStationData.length; index++) {
        const location_element = filteredStationData[index];
        let bus_lists_element_result = ""
        for (let index_bus_lists = 0; index_bus_lists < location_element.bus_lists.length; index_bus_lists++) {
            let bus_lists_element = location_element.bus_lists[index_bus_lists];

            // console.log(bus_lists_element) //show the bus for get witch bus I need to add
            // special handle
            // if(bus_lists_element == '701X'){
            //     bus_lists_element = '701x'
            // }
            bus_lists_element_result += `<div style="font-size:14px;margin:5px;border-left: 4px solid ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].line_color};padding:5px;"><b>${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].bus_name}號路線 :</b> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_start} -> ${route_info_data.filter(e=> { return e.bus_name == bus_lists_element })[0].route_end}</div>`
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
                    `
                    
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

    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('click', 'bus_station', (e) => {
        map.flyTo({
        center: e.features[0].geometry.coordinates
        });

    });
 

    this.closePopupTESTWithTimeout = () => {
        popupTESTCloseTimeout = setTimeout(() => popup.remove(), 2000);
    }
    
    clearPopupTESTCloseTimeout = () => {
        console.log('run this.clearPopupTESTCloseTimeout ------')
        console.log(popupTESTCloseTimeout)

        if (popupTESTCloseTimeout) {
          clearTimeout(popupTESTCloseTimeout);
          popupTESTCloseTimeout = null;
        }
    }

    popupTESTCloseTimeout = null 
    map.on('mouseenter', `bus_station`, (e) => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';
        // Copy coordinates array.
        // this.clearPopupTESTCloseTimeout();
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates).setHTML(description).addTo(map);
    });

    map.on('mouseleave', 'bus_station', () => {
        map.getCanvas().style.cursor = '';

        console.log('Mouseleave ~~~~~')
        this.closePopupTESTWithTimeout();
    });

    

}
