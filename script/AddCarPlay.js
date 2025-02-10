function AddCarPlay(map) {
    console.log('first')

    var origin = [113.5443000000, 22.1346400000];
    var line;
    var truck;

    map.addLayer({
        id: 'custom_layer',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function(map, mbxContext){

            window.tb = new xthree(
                map, 
                mbxContext,
                {defaultLights: true}
            );

            // import truck from an external obj file, scaling up its size 10x
            var options = {
                obj: 'models/Truck.obj',
                mtl: 'models/Truck.mtl',
                scale: 2
            }

            tb.loadObj(options, function(model) {
                truck = model.setCoords(origin);
                tb.add(truck);                          
            })

        },
        render: function(gl, matrix){
            tb.update();
        }
    });

    map.on('click', function(e){
        var pt = [e.lngLat.lng, e.lngLat.lat];
        travelPath(pt);
    });

    // for the xthree js 

    function travelPath(destination){

        let mapAccessToken =
        'pk.eyJ1IjoiZXRlcm5pdHkteHlmIiwiYSI6ImNqaDFsdXIxdTA1ODgycXJ5czdjNmF0ZTkifQ.zN7e588TqZOQMWfws-K0Yw';
        // request directions. See https://docs.mapbox.com/api/navigation/#directions for details

        var url = "https://api.mapbox.com/directions/v5/mapbox/driving/"+[origin, destination].join(';')+"?geometries=geojson&access_token=" + mapAccessToken


        fetchFunction(url, function(data){

            // extract path geometry from callback geojson, and set duration of travel
            var options = {
                path: data.routes[0].geometry.coordinates,
                duration: 10000
            }

            // start the truck animation with above options, and remove the line when animation ends
            truck.followPath(
                options,
                function() {
                    tb.remove(line);
                }
            );

            // set up geometry for a line to be added to map, lofting it up a bit for *style*
            var lineGeometry = options.path
                .map(function(coordinate){
                    return coordinate.concat([15])
                })

            // create and add line object
            line = tb.line({
                geometry: lineGeometry,
                width: 5,
                color: 'steelblue'
            })

            tb.add(line);

            // set destination as the new origin, for the next trip
            origin = destination;

        })
    }

    //convenience function for fetch

    function fetchFunction(url, cb) {
        fetch(url)
            .then(
                function(response){
                    if (response.status === 200) {
                        response.json()
                            .then(function(data){
                                cb(data)
                            })
                    }
                }
            )
    }
}
