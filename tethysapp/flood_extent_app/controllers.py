from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import *
import requests
import ast

@login_required()
def home(request):
    """
    Controller for the app home page.
    """

#    watershed = 'South Asia'
#    subbasin = 'Historical'
#    reach=56412

#    request_params = dict(watershed_name=watershed, subbasin_name=subbasin, reach_id=reach)
#    request_headers = dict(Authorization='Token fa7fa9f7d35eddb64011913ef8a27129c9740f3c')
#    res = requests.get('http://tethys-staging.byu.edu/apps/streamflow-prediction-tool/api/GetAvailableDates/', params=request_params,
#                       headers=request_headers)

#    dates = ast.literal_eval(res.content)
#    fulldate = []

#    for date in dates:
#        fulldate.append((date[:4] + "-" + date[4:6] + "-" + date[6:8],date))

    dateinput = SelectInput(name='dateinput',
                               options=[],
                               initial=[])

    removebutton = Button(display_text='Remove Layers',
                          name='remlayers',
                          attributes={"onclick":"removelayers()"})

    regioninput = SelectInput(name='regioninput',
                               options=[(" ", " "),("Current","Current"),("Historical","Historical")],
                               initial=[" "])

    context = {
        'dateinput':dateinput,
        'removebutton':removebutton,
        'regioninput':regioninput
    }

    return render(request, 'flood_extent_app/home.html', context)