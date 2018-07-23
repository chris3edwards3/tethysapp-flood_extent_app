from django.http import Http404, HttpResponse, JsonResponse
import xarray
import numpy as np
import pandas as pd
import os
import requests
import json
import ast
from .app import FloodExtentApp as app



def createnetcdf(request):

    tethys_token = app.get_custom_setting('tethys_token')
    tethys_staging_token = app.get_custom_setting('tethys_staging_token')
    thredds = app.get_custom_setting('thredds_folder')

    region = 'nepal'
    catchfile = region + 'catchproj.nc'
    handfile = region + 'handproj.nc'
    ratfile = region + 'ratingcurve.csv'

    forecast = request.GET.get('forecast')

    if forecast == 'Current':
        watershed = 'South Asia'
        subbasin = 'Mainland'
        token = 'Token ' + tethys_token
        host = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/'
    elif forecast == 'Historical':
        watershed = 'South Asia'
        subbasin = 'Historical'
        token = 'Token ' + tethys_staging_token
        host = 'https://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/'


    gridid = int(request.GET.get('gridid'))
    date = request.GET.get('date')
    forecasttype = request.GET.get('type')

    # app_workspace = app.get_app_workspace()
    # catchfloodnetcdf = os.path.join(app_workspace.path, catchfile)
    # handnetcdf = os.path.join(app_workspace.path, handfile)
    # ratingcurve = os.path.join(app_workspace.path, ratfile)

    catchfloodnetcdf = thredds + catchfile
    handnetcdf = thredds + handfile
    ratingcurve = thredds + ratfile


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
                          forecast_folder=date, stat_type=forecasttype, return_format='csv')
    request_headers = dict(Authorization= token)
    res = requests.get(host, params=request_params,
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
    oldheight = ''

    for index in range(1, len(heights)):
        if heights[index] == oldheight:
            floodlen = len(floodedarray[0][0])
            floodedarray = np.insert(floodedarray, floodlen, floodedvalues, axis=2)
        else:
            height = heights[index]
            floodlen = len(floodedarray[0][0])
            flooded_areas = gridonly.copy()
            flooded['step'] = flooded_areas
            flooded.step.values = gridonly.where(gridonly != gridid, height).values
            floodedvalues = xarray.where(flooded.step >= flooded.nepalhandproj, flooded.nepalhandproj, np.nan).values
            floodedarray = np.insert(floodedarray, floodlen, floodedvalues, axis=2)
            flooded.__delitem__('step')
            oldheight = height

    times = pd.to_datetime(times)
    ds = xarray.Dataset({'Height': (['lat', 'lon', 'time'], floodedarray)},
                        coords={'lon': lons,
                                'lat': lats,
                                'time': times})


    ds.to_netcdf(thredds + "floodedgrid" + str(gridid) + ".nc")

    return_obj = {'success':True,'gridid':gridid}

    return JsonResponse(return_obj)


def displaydrainagelines(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':

        return_obj['success'] = True
        geolayer = request.GET.get('geolayer')
        thredds = app.get_custom_setting('thredds_folder')
        geofile = thredds + geolayer

        with open(geofile, 'r') as f:
            fullstream = ''
            streams = f.readlines()
            for i in range(0, len(streams)):
                fullstream += streams[i]
        return_obj = json.loads(fullstream)
    return JsonResponse(return_obj)

def displaywarningpts(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':
        watershed = 'South Asia'
        subbasin = 'Historical'
        date = request.GET.get('date')

        request_params = dict(watershed_name=watershed, subbasin_name=subbasin, return_period=2, forecast_folder=date)
        request_headers = dict(Authorization='Token ')
        res = requests.get('http://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetWarningPoints/',
                           params=request_params, headers=request_headers)

        points = json.loads(res.content)

        return_obj = {'crs': points['crs'], 'type': points['type']}

        return_points = []

        for point in points['features']:
            if float(point['geometry']['coordinates'][0]) < 88.0 and float(point['geometry']['coordinates'][0]) > 79.0:
                if float(point['geometry']['coordinates'][1]) < 31.0 and float(point['geometry']['coordinates'][1]) > 26.0:
                    return_points.append(point)

        return_obj['features'] = return_points
    return JsonResponse(return_obj)


def createprobnetcdf(request):

    tethys_token = app.get_custom_setting('tethys_token')
    tethys_staging_token = app.get_custom_setting('tethys_staging_token')
    thredds = app.get_custom_setting('thredds_folder')

    gridid = int(request.GET.get('gridid'))
    date = request.GET.get('date')

    region = 'nepal'
    catchfile = region + 'catchproj.nc'
    handfile = region + 'handproj.nc'
    ratfile = region + 'ratingcurve.csv'

    forecast = request.GET.get('forecast')

    if forecast == 'Current':
        watershed = 'South Asia'
        subbasin = 'Mainland'
        token = 'Token ' + tethys_token
        host = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetEnsemble/'
    elif forecast == 'Historical':
        watershed = 'South Asia'
        subbasin = 'Historical'
        token = 'Token ' + tethys_staging_token
        host = 'https://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetEnsemble/'

    # app_workspace = app.get_app_workspace()
    # catchfloodnetcdf = os.path.join(app_workspace.path, catchfile)
    # handnetcdf = os.path.join(app_workspace.path, handfile)
    # ratingcurve = os.path.join(app_workspace.path, ratfile)

    catchfloodnetcdf = thredds + catchfile
    handnetcdf = thredds + handfile
    ratingcurve = thredds + ratfile

    ratcurve = pd.read_csv(ratingcurve)
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    comid = int(gridcurve.loc[gridcurve['H'] == 1, 'COMID'].iloc[0])
    gridcurve = ratcurve[ratcurve.GridID == gridid]
    minQ = float(gridcurve.loc[gridcurve['H'] == 1, 'Q'].iloc[0])

    request_params = dict(watershed_name=watershed, subbasin_name=subbasin, reach_id=comid,
                          forecast_folder=date, ensemble='1-51')
    request_headers = dict(Authorization=token)
    res = requests.get(host,
                       params=request_params,
                       headers=request_headers)

    flows = res.content.splitlines()

    flowlist = []
    times = []

    for flow in flows:
        flowlist.append(flow.split(","))

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

    del flowlist[0]

    for vals in flowlist:
        times.append(vals[0])

    for timestep in range(0, len(flowlist)):

        print(str(timestep + 1) + " out of " + str(len(flowlist)))

        heights = []

        for b in range(1, len(flowlist[timestep])):
            flow = (float(flowlist[timestep][b]))
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
        flooded['timeseries'] = gridonly
        flooded.timeseries.values = gridonly.where(gridonly != gridid, height).values
        flooded.timeseries.values = xarray.where(flooded.timeseries >= flooded.nepalhandproj, flooded.nepalhandproj, np.nan).values
        floodedarray = flooded.timeseries.expand_dims('time', axis=2).to_masked_array()
        oldheight = ''

        for index in range(1, len(heights)):
            if heights[index] == oldheight:
                floodlen = len(floodedarray[0][0])
                floodedarray = np.insert(floodedarray, floodlen, floodedvalues, axis=2)
            else:
                height = heights[index]
                floodlen = len(floodedarray[0][0])
                flooded['step'] = gridonly
                flooded.step.values = gridonly.where(gridonly != gridid, height).values
                floodedvalues = xarray.where(flooded.step >= flooded.nepalhandproj, flooded.nepalhandproj, np.nan).values
                floodedarray = np.insert(floodedarray, floodlen, floodedvalues, axis=2)
                flooded.__delitem__('step')
                oldheight = height

        non_nans = (~np.isnan(floodedarray)).sum(2)
        floodedprob = np.where(non_nans == 0, np.nan, non_nans) / 51 * 100

        if timestep == 0:
            totfloodedprob = np.expand_dims(floodedprob, axis=2)
        else:
            floodproblen = len(totfloodedprob[0][0])
            totfloodedprob = np.insert(totfloodedprob, floodproblen, floodedprob, axis=2)

    times = pd.to_datetime(times)

    ds = xarray.Dataset({'Flood Probability': (['lat', 'lon', 'times'], totfloodedprob)},
                        coords={'lon': lons,
                                'lat': lats,
                                'times': times})

    ds.to_netcdf(thredds + 'prob' + str(gridid) + '.nc')

    return_obj = {'success':True,'gridid':gridid}

    return JsonResponse(return_obj)

def getdates(request):
    return_obj = {
        'success': False
    }

    # Check if its an ajax post request
    if request.is_ajax() and request.method == 'GET':

        tethys_token = app.get_custom_setting('tethys_token')
        tethys_staging_token = app.get_custom_setting('tethys_staging_token')

        region = request.GET.get('region')

        watershed = 'South Asia'
        reach = 56412

        if region == 'Historical':
            subbasin = 'Historical'
            request_headers = dict(Authorization='Token ' + tethys_staging_token)
            request_params = dict(watershed_name=watershed, subbasin_name=subbasin, reach_id=reach)
            res = requests.get('https://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetAvailableDates/',
                               params=request_params,
                               headers=request_headers)
        elif region == 'Current':
            subbasin = 'Mainland'
            request_headers = dict(Authorization='Token ' + tethys_token)
            request_params = dict(watershed_name=watershed, subbasin_name=subbasin, reach_id=reach)
            res = requests.get('https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetAvailableDates/',
                               params=request_params,
                               headers=request_headers)

        dates = ast.literal_eval(res.content)
        fulldate = []

        for date in dates:
            fulldate.append((date[:4] + "-" + date[4:6] + "-" + date[6:8], date))

        return_obj = {'success':True, 'datelist':fulldate}

    return JsonResponse(return_obj)
