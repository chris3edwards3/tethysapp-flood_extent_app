from django.http import Http404, HttpResponse, JsonResponse
import xarray
import numpy as np
import pandas as pd
import os
import requests
from .app import FloodExtentApp as app



def createnetcdf(request):

    gridid = int(request.GET.get('gridid'))

    app_workspace = app.get_app_workspace()
    catchfloodnetcdf = os.path.join(app_workspace.path, 'catchfloodprojmask.nc')
    handnetcdf = os.path.join(app_workspace.path, 'handproj.nc')
    ratingcurve = os.path.join(app_workspace.path, 'ratingcurve.csv')


    catchfloods = xarray.open_dataset(catchfloodnetcdf, autoclose=True).floodcat
    hand = xarray.open_dataset(handnetcdf, autoclose=True).HAND

    # scaling down grid netcdf to specific gridid
    catlat = catchfloods.where(catchfloods.values == gridid).dropna('lat', how='all')
    gridonly = catlat.where(catlat.values == gridid).dropna('lon', how='all')

    lats = gridonly.lat.values
    lons = gridonly.lon.values

    # scaling down hand netcdf to specific gridid size
    handsmall = hand.sel(lat=slice(lats[0], lats[-1] - 0.000833333323831))
    handsmall = handsmall.sel(lon=slice(lons[0], lons[-1]))

    ratcurve = pd.read_csv(ratingcurve)
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    comid = int(gridcurve.loc[gridcurve['H'] == 1, 'COMID'].iloc[0])
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    minQ = float(gridcurve.loc[gridcurve['H'] == 1, 'Q'].iloc[0])

    request_params = dict(watershed_name='South America', subbasin_name='Continental', reach_id=comid,
                          forecast_folder='20180513.0', stat_type='mean', return_format='csv')
    request_headers = dict(Authorization='Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40')
    res = requests.get('http://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/', params=request_params,
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
    flooded.timeseries.values = xarray.where(flooded.timeseries >= flooded.HAND, flooded.HAND, np.nan).values
    floodedarray = flooded.timeseries.expand_dims('time', axis=2).to_masked_array()

    for index in range(1, len(heights)):
        height = heights[index]
        floodlen = len(floodedarray[0][0])
        flooded_areas = gridonly.copy()
        flooded['step'] = flooded_areas
        flooded.step.values = gridonly.where(gridonly != gridid, height).values
        floodedvalues = xarray.where(flooded.step >= flooded.HAND, flooded.HAND, np.nan).values
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