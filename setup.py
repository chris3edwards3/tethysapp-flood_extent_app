import os
import sys
from setuptools import setup, find_packages
from tethys_apps.app_installation import find_resource_files

# -- Apps Definition -- #
app_package = 'flood_extent_app'
release_package = 'tethysapp-' + app_package
app_class = 'flood_extent_app.app:FloodExtentApp'
app_package_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tethysapp', app_package)


# -- Get Resource File -- #
resource_files = find_resource_files('tethysapp/' + app_package + '/templates')
resource_files += find_resource_files('tethysapp/' + app_package + '/public')

setup(
    name=release_package,
    version='0.0.1',
    description='',
    long_description='',
    keywords='',
    author='',
    author_email='',
    url='',
    license='',
    packages=find_packages(exclude=['ez_setup', 'examples', 'tests']),
    package_data={'': resource_files},
    namespace_packages=['tethysapp', 'tethysapp.' + app_package],
    include_package_data=True,
    zip_safe=False,
    install_requires=[]
)
