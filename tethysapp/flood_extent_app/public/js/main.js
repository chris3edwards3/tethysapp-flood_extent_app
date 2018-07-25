$("#app-content-wrapper").removeClass('show-nav')
$(".toggle-nav").removeClass('toggle-nav')

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

displaygeojson()

var Legend = L.control({
    position: 'bottomright'
});

Legend.onAdd = function(map) {
    var src= "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=rainbow";
    var div = L.DomUtil.create('div', 'info legend');
    div.innerHTML +=
        '<img src="' + src + '" alt="legend">';
    return div;
};

Legend.addTo(map);

netcdf = L.layerGroup()

function plotlegend(stat) {
    var checkprob = document.getElementById("checkprob");
    var checkmax = document.getElementById("checkmax");
    var checkmean = document.getElementById("checkmean");
     $(".legend").remove()
     var Legend = L.control({
            position: 'bottomright'
        });
    removelayers();

    if (stat == 'prob') {

        var src = "https://tethys.byu.edu/thredds/wms/testAll/floodextent/probscale.nc?REQUEST=GetLegendGraphic&LAYER=Flood_Probability&PALETTE=prob&COLORSCALERANGE=0,100"

        checkmax.checked = false
        checkmean.checked = false

    } else if (stat == 'max') {

        var src = "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=rainbow"

        checkprob.checked = false
        checkmean.checked = false
    } else if (stat == 'mean') {

        var src = "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=rainbow"

        checkmax.checked = false
        checkprob.checked = false
    }

    Legend.onAdd = function(map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.innerHTML +=
                '<img src="' + src + '" alt="legend">';
            return div;
    };

    Legend.addTo(map);
}

function removelayers() {
    netcdf.clearLayers()
}

$('#dateinput').change(removelayers)


function addnetcdflayer (wms, scale) {

    console.log(scale)

    if (scale == 'prob') {
        var range = '1.5,100'
        var layer = 'Flood_Probability'
    } else {
        var range = '0,40'
        var layer = 'Height'
    }

    var testLayer = L.tileLayer.wms(wms, {
        layers: layer,
        format: 'image/png',
        transparent: true,
        opacity:0.8,
        colorscalerange: range,
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
    var checkprob = document.getElementById("checkprob");
    var checkmax = document.getElementById("checkmax");
    var checkmean = document.getElementById("checkmean");
    var forecast = $("#regioninput").val()
    console.log(forecast)
    var loading = L.control({
        position: 'topright'
    });

    loading.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info loading');
        div.innerHTML += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/static/flood_extent_app/images/loading.gif'>";
        return div;
    };
    loading.addTo(map);

    if (checkprob.checked == true) {
        console.log("check")
        $.ajax({
            type: 'GET',
            url: '/apps/flood-extent-app/createprobnetcdf',
            data: {'gridid':gridid, 'date':date, 'forecast':forecast},
            success: function (data) {
                if (!data.error) {
                    var testWMS="https://tethys.byu.edu/thredds/wms/testAll/floodextent/prob" + data['gridid'] + ".nc"
                    var scale = 'prob'
                    addnetcdflayer (testWMS, scale)
                    $(".loading").remove()
                }
            }
        })
    } else {
        if (checkmax.checked == true) {
            var forecasttype = 'max'
        } else {
            var forecasttype = 'mean'
        }
        $.ajax({
            type: 'GET',
            url: '/apps/flood-extent-app/createnetcdf',
            data: {'gridid':gridid, 'date':date, 'forecasttype':forecasttype, 'forecast':forecast},
            success: function (data) {
                if (!data.error) {
                    var testWMS="https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedgrid" + data['gridid'] + ".nc"
                    var scale = 'flooded'
                    addnetcdflayer (testWMS, scale)
                    $(".loading").remove()
                }
            }
        })
    }
}

function onEachFeature(feature,layer) {
    layer.on({click:whenClicked
    });
}

function displaygeojson() {
    var geolayer = 'nepaldrainage.json'
    $.ajax({
        url: '/apps/flood-extent-app/displaydrainagelines/',
        type: 'GET',
        data: {'geolayer':geolayer},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {
            L.geoJSON(response, {
            onEachFeature: onEachFeature}).addTo(map)
        }
    })
//    var date = $("#dateinput").val();
//    $.ajax({
//        url: '/apps/flood-extent-app/displaywarningpts/',
//        type: 'GET',
//        data: {'date':date},
//        contentType: 'application/json',
//        error: function (status) {
//
//        }, success: function (response) {
//            console.log(response)
//            L.geoJSON(response).addTo(map)
//        }
//    })
}


get_dates = function(){
    var region = $("#regioninput").val();
    $("#dateinput").empty()

    $.ajax({
        url: '/apps/flood-extent-app/getdates',
        type: 'GET',
        data: {'region' : region},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {

                var datelist = response['datelist'];
                var i;
                var date;


                for (i = 0; i < datelist.length; i++) {
                    date = datelist[i];
                    $("#dateinput").append('<option value="' + date[1] + '">' + date[0] + '</option>');
                }


        }
    });


};

$("#regioninput").on('change',get_dates);

$(function() {
//    $("#app-content-wrapper").removeClass('show-nav')
//    $(".toggle-nav").removeClass('toggle-nav')
})
