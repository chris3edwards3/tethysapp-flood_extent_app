import json
import requests
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, Float, String
from sqlalchemy.orm import sessionmaker
from django.http import Http404, HttpResponse, JsonResponse

from .app import FloodExtentApp as app

Base = declarative_base()

class Region(Base):

    __tablename__ = 'regions'

    region = Column(String, primary_key=True)
    filename = Column(String)
    watershed = Column(String)
    subbasin = Column(String)
    spt_river = Column(Integer)


def add_new_region(region, filename, watershed, subbasin, spt_river):

    new_region = Region(
        region=region,
        filename =filename,
        watershed = watershed,
        subbasin = subbasin,
        spt_river = spt_river
    )

    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()

    session.add(new_region)

    session.commit()
    session.close()

def get_all_regions():

    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()

    # session.query(Region).filter(Region.region == 'Nepal').\
    #     delete(synchronize_session='fetch')

    regions = session.query(Region).all()

    session.close()

    return regions

def init_primary_db(engine, first_time):

    Base.metadata.create_all(engine)

def deleteentry(request):
    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()

    return_obj = {'success': True}

    data = request.GET.get('region')

    session.query(Region).filter(Region.region == data). \
        delete(synchronize_session=False)

    session.commit()

    regions = session.query(Region).all()

    for region in regions:
        return_obj[region.region]= [region.region, region.filename, region.watershed, region.subbasin, region.spt_river]


    session.close()

    return JsonResponse(return_obj)
