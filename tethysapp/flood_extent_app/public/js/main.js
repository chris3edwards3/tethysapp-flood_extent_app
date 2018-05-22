var map = L.map('map', {
    zoom: 11,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    center: [-9.5938,-64.9586],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);



function addnetcdflayer (grid) {

    let i = 0;
    map.eachLayer(function(){ i += 1; });

    if (i == 1) {
        var testLegend = L.control({
            position: 'topright'
        });
        testLegend.onAdd = function(map) {
            var src= "http://localhost:8080/thredds/wms/testAll/floodedtstest.nc?REQUEST=GetLegendGraphic&LAYER=timeseries&PALETTE=rainbow";
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML +=
                '<img src="' + src + '" alt="legend">';
            return div;
        };
        testLegend.addTo(map);
    }

    var layer = 'timeseries'

    var testWMS="http://localhost:8080/thredds/wms/testAll/floodedgrid" + grid + ".nc"
    var testLayer = L.tileLayer.wms(testWMS, {
        layers: layer,
        format: 'image/png',
        transparent: true,
        opacity:0.8,
        colorscalerange: '0,30',
        attribution: '<a href="https://www.pik-potsdam.de/">PIK</a>'
    });
    var testTimeLayer = L.timeDimension.layer.wms(testLayer, {
        updateTimeDimension: true,
    });
    testTimeLayer.addTo(map);
}

function createlayer() {
    waiting_output()
    var gridid = $("#grididinput").val();
    $.ajax({
        type: 'GET',
        url: '/apps/flood-extent-app/createnetcdf',
        data: {'gridid':gridid},
        success: function (data) {
            if (!data.error) {
                addnetcdflayer (data['gridid'])
                document.getElementById("waitingoutput").innerHTML = '';
            }
        }
    })

}

function waiting_output() {
    var wait_text = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/static/flood_extent_app/images/giphy.gif'>";
    document.getElementById('waitingoutput').innerHTML = wait_text;
}