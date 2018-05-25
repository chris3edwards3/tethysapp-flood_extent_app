from django.http import Http404, HttpResponse, JsonResponse
import xarray
import numpy as np
import pandas as pd
import os
import requests
import json
from .app import FloodExtentApp as app



def createnetcdf(request):

    region = 'nepal'
    catchfile = region + 'catchproj.nc'
    handfile = region + 'handproj.nc'
    ratfile = region + 'ratingcurve.csv'

    if region == 'madeira':
        watershed = 'South America'
        subbasin = 'Continental'
    elif region == 'nepal':
        watershed = 'South Asia'
        subbasin = 'Historical'


    gridid = int(request.GET.get('gridid'))
    date = request.GET.get('date')

    app_workspace = app.get_app_workspace()
    catchfloodnetcdf = os.path.join(app_workspace.path, catchfile)
    handnetcdf = os.path.join(app_workspace.path, handfile)
    ratingcurve = os.path.join(app_workspace.path, ratfile)


    catchfloods = xarray.open_dataset(catchfloodnetcdf, autoclose=True).nepalcatchproj
    hand = xarray.open_dataset(handnetcdf, autoclose=True).nepalhandproj

    # scaling down grid netcdf to specific gridid
    catlat = catchfloods.where(catchfloods.values == gridid).dropna('lat', how='all')
    gridonly = catlat.where(catlat.values == gridid).dropna('lon', how='all')

    lats = gridonly.lat.values
    lons = gridonly.lon.values

    # scaling down hand netcdf to specific gridid size
    handsmall = hand.sel(lat=slice(lats[0], lats[-1] - (lats[0] - lats[1])))
    handsmall = handsmall.sel(lon=slice(lons[0], lons[-1]))

    ratcurve = pd.read_csv(ratingcurve)
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    comid = int(gridcurve.loc[gridcurve['H'] == 1, 'COMID'].iloc[0])
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    minQ = float(gridcurve.loc[gridcurve['H'] == 1, 'Q'].iloc[0])

    request_params = dict(watershed_name=watershed, subbasin_name=subbasin, reach_id=comid,
                          forecast_folder=date, stat_type='max', return_format='csv')
    request_headers = dict(Authorization='Token fa7fa9f7d35eddb64011913ef8a27129c9740f3c')
    res = requests.get('http://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/', params=request_params,
                       headers=request_headers)

    content = res.content.splitlines()

    times = []
    flowlist = []

    for timesteps in content:
        ts = timesteps.split(",")
        times.append(ts[0][:19])
        flowlist.append(ts[1])

    del times[0]
    del flowlist[0]

    heights = []

    for b in range(0, len(times)):
        flow = (float(flowlist[b]))
        if flow == 0:
            H = -1.0
        else:
            H = 0.0
        if flow > minQ:
            H = float(gridcurve.loc[gridcurve['Q'] > flow, 'H'].iloc[0]) - 1
            heights.append(H)
        else:
            heights.append(H)

    flooded = handsmall.to_dataset()

    index = 0
    height = heights[index]
    flooded_areas = gridonly.copy()
    flooded['timeseries'] = flooded_areas
    flooded.timeseries.values = gridonly.where(gridonly != gridid, height).values
    flooded.timeseries.values = xarray.where(flooded.timeseries >= flooded.nepalhandproj, flooded.nepalhandproj, np.nan).values
    floodedarray = flooded.timeseries.expand_dims('time', axis=2).to_masked_array()

    for index in range(1, len(heights)):
        height = heights[index]
        floodlen = len(floodedarray[0][0])
        flooded_areas = gridonly.copy()
        flooded['step'] = flooded_areas
        flooded.step.values = gridonly.where(gridonly != gridid, height).values
        floodedvalues = xarray.where(flooded.step >= flooded.nepalhandproj, flooded.nepalhandproj, np.nan).values
        floodedarray = np.insert(floodedarray, floodlen, floodedvalues, axis=2)
        flooded.__delitem__('step')

    times = pd.to_datetime(times)
    ds = xarray.Dataset({'timeseries': (['lat', 'lon', 'time'], floodedarray)},
                        coords={'lon': lons,
                                'lat': lats,
                                'time': times})

    ds.to_netcdf("/home/ckrewson/tds/apache-tomcat-8.5.31/content/thredds/public/testdata/floodedgrid" + str(gridid) + ".nc")

    return_obj = {'success':True,'gridid':gridid}

    return JsonResponse(return_obj)


def displaygeojson(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        return_obj['success'] = True
        geolayer = request.GET.get('geolayer')
        return_obj['geolayer'] = geolayer
        app_workspace = app.get_app_workspace()
        geofile = os.path.join(app_workspace.path, geolayer)
        with open(geofile, 'r') as f:
            fullstream = ''
            streams = f.readlines()
            for i in range(0, len(streams)):
                fullstream += streams[i]
        return_obj = json.loads(fullstream)
    return JsonResponse(return_obj)