GetUserGpsRemark = 0
function successCallback(position) {
    if(GetUserGpsRemark == 1 && latitude != position.coords.latitude && longitude != position.coords.longitude){
        longitude = position.coords.longitude
        latitude = position.coords.latitude
        user_gps_corrdinates = [ longitude, latitude]

        geojsonSource = map.getSource('user_gps');
        geojsonSource.setData({
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'properties': {
                        'description': '<b>你所在的位置</b>'
                    },
                    'geometry': {
                        'type': 'Point',
                        'coordinates': user_gps_corrdinates
                    }
                },
            ]
        })

            // map.getLayer('user_gps'); // need remove layer first

    }
    if(GetUserGpsRemark == 0){
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        user_gps_corrdinates = [longitude, latitude]
        map.addSource('user_gps', {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'properties': {
                            'description': '<b>你所在的位置</b>'
                        },
                        'geometry': {
                            'type': 'Point',
                            'coordinates': user_gps_corrdinates
                        }
                    },
                ]
            }
        });
        // Add a layer showing the places.
        map.addLayer({
            'id': 'user_gps',
            'type': 'circle',
            'source': 'user_gps',
            'paint': {
                'circle-color': 'red',
                'circle-radius': 10,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-opacity': .7
            }
        });
        
        GetUserGpsRemark = 1

        // Create a popup, but don't add it to the map yet.
        const popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        map.on('mouseenter', `user_gps`, (e) => {
            // Change the cursor style as a UI indicator.
            map.getCanvas().style.cursor = 'pointer';

            // Copy coordinates array.
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

        map.on('mouseleave', 'user_gps', () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
        });

    }
}

function errorCallback(error) {
    console.log(error);
}

function getAndShowUserGps(map) {
    if (navigator.geolocation) {  //if browser support
        navigator.geolocation.watchPosition(successCallback,errorCallback);
    } else {
        console.log("your browser not support ~");
    }
}