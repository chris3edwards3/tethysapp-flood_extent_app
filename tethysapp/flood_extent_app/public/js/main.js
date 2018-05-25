var map = L.map('map', {
    zoom: 8,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    center: [27.952,84.479],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var Legend = L.control({
    position: 'topright'
});

Legend.onAdd = function(map) {
    var src= "http://localhost:8080/thredds/wms/testAll/forscale.nc?REQUEST=GetLegendGraphic&LAYER=timeseries&PALETTE=rainbow";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};
Legend.addTo(map);

netcdf = L.layerGroup()

function removelayers() {
    netcdf.clearLayers()
}

$('#dateinput').change(removelayers)


function addnetcdflayer (grid) {

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
    netcdf.addLayer(testTimeLayer).addTo(map)
}

function waiting_output() {
    var wait_text = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/static/flood_extent_app/images/giphy.gif'>";
    document.getElementsByClassName('loading').innerHTML = wait_text;
}

function whenClicked(e) {
    var gridid = e.target.feature.properties.GridID;
    var date = $("#dateinput").val();
    console.log(date)
    var loading = L.control({
        position: 'topright'
    });

    loading.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info loading');
        div.innerHTML += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/static/flood_extent_app/images/loading.gif'>";
        return div;
    };
    loading.addTo(map);

    $.ajax({
        type: 'GET',
        url: '/apps/flood-extent-app/createnetcdf',
        data: {'gridid':gridid, 'date':date},
        success: function (data) {
            if (!data.error) {
                addnetcdflayer (data['gridid'])
                $(".loading").remove()
            }
        }
    })
}

function onEachFeature(feature,layer) {
    layer.on({click:whenClicked
    });
}

function displaygeojson() {
    var geolayer = 'nepaldrainage.json'
    $.ajax({
        url: '/apps/flood-extent-app/displaygeojson/',
        type: 'GET',
        data: {'geolayer':geolayer},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {
            L.geoJSON(response, {
            onEachFeature: onEachFeature}).addTo(map)
        }
    })
}


$(function() {
    displaygeojson()
    $("#app-content-wrapper").removeClass('show-nav')
    $(".toggle-nav").removeClass('toggle-nav')
})