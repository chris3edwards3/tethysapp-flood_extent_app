$("#app-content-wrapper").removeClass('show-nav')
$(".toggle-nav").removeClass('toggle-nav')

var map = L.map('map', {
    zoom: 7,
    fullscreenControl: true,
    timeDimension: true,
    timeDimensionControl: true,
    center: [28.18,84.2],
});

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

displaygeojson()

var Legend = L.control({
    position: 'bottomright'
});

Legend.onAdd = function(map) {
    var src= "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=whiteblue&COLORSCALERANGE=0,40";
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

        var src = "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=whiteblue&COLORSCALERANGE=0,40"

        checkprob.checked = false
        checkmean.checked = false
    } else if (stat == 'mean') {

        var src = "https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedscale.nc?REQUEST=GetLegendGraphic&LAYER=Height&PALETTE=whiteblue&COLORSCALERANGE=0,40"

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

    if (scale == 'prob') {
        var range = '1.5,100'
        var layer = 'Flood_Probability'
        var style = 'boxfill/prob'
    } else {
        var range = '0,40'
        var layer = 'Height'
        var style = 'boxfill/whiteblue'
    }

    var testLayer = L.tileLayer.wms(wms, {
        layers: layer,
        format: 'image/png',
        transparent: true,
        opacity:0.8,
        styles: style,
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
    var forecast = $("#timeinput").val()
    var region = $("#regioninput").val()
    
    if (forecast == ' ') {
        alert('no forecast time is selected')
        return;
    }
    
    if (date == '') {
        alert('no date is selected')
        return;
    }
    
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
        $.ajax({
            type: 'GET',
            url: '/apps/flood-extent-app/createprobnetcdf',
            data: {'gridid':gridid, 'date':date, 'forecast':forecast, 'region':region},
            success: function (data) {
                if (!data.error) {
                    
                    if (data['message']) {
                        
                        alert(data['message'])
                        $(".loading").remove()
                        
                    } else {
                    
                        var testWMS="https://tethys.byu.edu/thredds/wms/testAll/floodextent/prob" + data['gridid'] + ".nc"
                        var scale = 'prob'
                        addnetcdflayer (testWMS, scale)
                        $(".loading").remove()
                        
                    }
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
            data: {'gridid':gridid, 'date':date, 'forecasttype':forecasttype, 'forecast':forecast, 'region':region},
            success: function (data) {
                if (!data.error) {
                    
                    if (data['message']) {
                        
                        alert(data['message'])
                        $(".loading").remove()
                        
                    } else {
                        
                        var testWMS="https://tethys.byu.edu/thredds/wms/testAll/floodextent/floodedgrid" + data['gridid'] + ".nc"
                        var scale = 'flooded'
                        addnetcdflayer (testWMS, scale)
                        $(".loading").remove()
                    
                    }
                }
            }
        })
    }
}

function onEachFeature(feature,layer) {
    layer.on({click:whenClicked
    });
}

function changegeojson() {
    var loading = L.control({
        position: 'topright'
    });

    loading.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'info loading');
        div.innerHTML += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<img src='/static/flood_extent_app/images/loading.gif'>";
        return div;
    };
    loading.addTo(map);
    map.removeLayer(drainageline);
    displaygeojson()
}

function displaygeojson() {

    var region = $("#regioninput").val();

    var geolayer = region + 'drainage.json'

    $.ajax({
        url: '/apps/flood-extent-app/displaydrainagelines/',
        type: 'GET',
        data: {'geolayer':geolayer},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {

            drainageline = L.geoJSON(response, {
            onEachFeature: onEachFeature}).addTo(map)

            map.fitBounds(drainageline.getBounds());

            $(".loading").remove()

        }
    })
}

$("#regioninput").on('change',changegeojson);


get_dates = function(){
    var time = $("#timeinput").val();
    $("#dateinput").empty()

    $.ajax({
        url: '/apps/flood-extent-app/getdates',
        type: 'GET',
        data: {'time' : time},
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

$("#timeinput").on('change',get_dates);

$(function() {
//    $("#app-content-wrapper").removeClass('show-nav')
//    $(".toggle-nav").removeClass('toggle-nav')
})
