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
warningpoints = L.layerGroup()
drainageline = L.geoJSON()

initialtable()


function initialtable() {
    var mytable = document.getElementById('regiontable').getElementsByTagName("tbody")[0]
    var rowcount = document.getElementById('regiontable').getElementsByTagName("tbody")[0].getElementsByTagName("tr").length

    for (b = 0; b < rowcount; b++) {
        data = mytable.rows[b].cells[0].innerHTML
        row = mytable.rows[b]
        var button = row.insertCell(5)
        var btn = document.createElement('input')
        btn.type = "button"
        btn.className = "btn btn-danger"
        btn.value = "X"
        btn.onclick = (function(data) {return function () {delete_entry(data)}})(data)
        button.appendChild(btn)
    }
}

function delete_entry(region) {
    $.ajax({
            type: 'GET',
            url: '/apps/flood-extent-app/deleteentry',
            data: {'region':region},
            success: function (data) {

                var mytable = document.getElementById('regiontable').getElementsByTagName("tbody")[0]
                var rowcount = document.getElementById('regiontable').getElementsByTagName("tbody")[0].getElementsByTagName("tr").length

                mytable.innerHTML = ''

                for (var key in data) {
                    if (key != 'success') {
                        var regionname = data[key][0]
                        var row = mytable.insertRow(-1)
                        if (row.rowIndex % 2) {
                            row.className = 'odd'
                        } else {
                            row.className = 'even'
                        }
                        var region = row.insertCell(0)
                        var filename = row.insertCell(1)
                        var watershed = row.insertCell(2)
                        var subbasin = row.insertCell(3)
                        var sptriver = row.insertCell(4)
                        var button = row.insertCell(5)
                        region.innerHTML = data[key][0]
                        filename.innerHTML = data[key][1]
                        watershed.innerHTML = data[key][2]
                        subbasin.innerHTML = data[key][3]
                        sptriver.innerHTML = data[key][4]
                        var btn = document.createElement('input')
                        btn.type = "button"
                        btn.className = "btn btn-danger"
                        btn.value = "X"
                        btn.onclick = (function(regionname) {return function () {delete_entry(regionname)}})(regionname)
                        button.appendChild(btn)
                    }
                }

            }
        })
}



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

$("#dateinput").on('change',get_warning_points);


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
                    
                    if (data['errormessage']) {
                        
                        alert(data['errormessage'])
                        $(".loading").remove()
                        
                    } else {
                        
                        if (data['alertmessage']) {
                            alert(data['alertmessage'])
                        }
                        
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
                    
                    if (data['errormessage']) {
                        
                        alert(data['errormessage'])
                        $(".loading").remove()
                        
                    } else {
                        
                        if (data['alertmessage']) {
                            alert(data['alertmessage'])
                        }
                        
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

    map.removeLayer(drainageline)

    if (warningpoints) {
        warningpoints.clearLayers()
    }

    displaygeojson()
}

function displaygeojson() {

    drainageline = L.geoJSON()

    if (drainageline) {
        drainageline.removeFrom(map)
    }

    var region = $("#regioninput").val();

    var geolayer = region + 'drainage.json'

    $.ajax({
        url: '/apps/flood-extent-app/displaydrainagelines/',
        type: 'GET',
        data: {'geolayer':geolayer},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {

            if (response['errormessage']) {

                alert(response['errormessage'])
                $(".loading").remove()

            } else {

                drainageline = L.geoJSON(response, {
                    onEachFeature: onEachFeature
                    }
                ).addTo(map)

                map.fitBounds(drainageline.getBounds());

                $(".loading").remove()

            }
        }
    })
}

$("#regioninput").on('change',changegeojson);


get_dates = function(){
    var time = $("#timeinput").val();
    var region = $("#regioninput").val();
    $("#dateinput").empty()

    if (warningpoints) {
        warningpoints.clearLayers()
    }

    $.ajax({
        url: '/apps/flood-extent-app/getdates',
        type: 'GET',
        data: {'time' : time, 'region' : region},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {

                var datelist = response['datelist'];
                var i;
                var date;

                if (response['datelist'] == 'No Dates Available') {
                    $("#dateinput").append('<option value=No Dates Available>No Dates Available</option>');
                } else {
                    for (i = 0; i < datelist.length; i++) {
                        date = datelist[i];
                        $("#dateinput").append('<option value="' + date[1] + '">' + date[0] + '</option>');
                    }
                }

        }
    });


};

$("#timeinput").on('change',get_dates);

function get_warning_points() {

    removelayers()
    warningpoints.clearLayers()

    bounds = drainageline.getBounds()

    nelat = parseFloat(bounds['_northEast']['lat'])
    nelon = parseFloat(bounds['_northEast']['lng'])
    swlat = parseFloat(bounds['_southWest']['lat'])
    swlon = parseFloat(bounds['_southWest']['lng'])

    var date = $("#dateinput").val();
    var forecast = $("#timeinput").val()
    var region = $("#regioninput").val()

    $.ajax({
        url: '/apps/flood-extent-app/displaywarningpts',
        type: 'GET',
        data: {'date' : date, 'forecast':forecast, 'region':region, 'nelat':nelat, 'nelon':nelon,'swlat':swlat,'swlon':swlon},
        contentType: 'application/json',
        error: function (status) {

        }, success: function (response) {

            warningpt2 = L.geoJSON(response['2'], {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {color: '#ffff00', radius: 2}); // The basic style
                },
                onEachFeature: function onEachFeature(feature,layer) {
                    warningpoints.addLayer(layer).addTo(map)
                }
            })

            warningpt10 = L.geoJSON(response['10'], {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {color: '#ff3333', radius: 2}); // The basic style
                },
                onEachFeature: function onEachFeature(feature,layer) {
                    warningpoints.addLayer(layer).addTo(map)
                }
            })

            warningpt20 = L.geoJSON(response['20'], {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {color: '#cc00cc', radius: 2}); // The basic style
                },
                onEachFeature: function onEachFeature(feature,layer) {
                    warningpoints.addLayer(layer).addTo(map)
                }
            })

        }
    });
}

function openregionmodal() {
    $("#add-region-modal").modal('show')
}

function openviewmodal() {
    $("#view-region-modal").modal('show')
}



//set_up_region = function () {
//    var files = $("#files")[0].files
//    alert(files)
//}
//
//$("#submit").on('click',set_up_region);


$(function() {
//    $("#app-content-wrapper").removeClass('show-nav')
//    $(".toggle-nav").removeClass('toggle-nav')
})
